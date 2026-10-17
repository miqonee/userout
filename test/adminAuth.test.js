import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AdminAuth } from "../src/services/adminAuth.js";
import { resolveAdminPath, validateAdminPath } from "../src/adminPath.js";

function fixture(t) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  let clock = 1_000_000;
  const options = { db, password: "test-password", now: () => clock };
  return { db, options, auth: new AdminAuth(options), advance: (ms) => { clock += ms; } };
}

test("five invalid passwords lock the IP, including correct-password attempts, for 15 minutes", (t) => {
  const { auth, advance } = fixture(t);
  for (let attempt = 0; attempt < 4; attempt++) assert.equal(auth.login("192.0.2.1", "wrong").status, "invalid");
  assert.deepEqual(auth.login("192.0.2.1", "wrong"), { status: "blocked", retryAfter: 900 });
  assert.equal(auth.login("192.0.2.1", "test-password").status, "blocked");
  assert.equal(auth.login("192.0.2.2", "test-password").status, "ok");
  advance(900_000);
  assert.equal(auth.login("192.0.2.1", "test-password").status, "ok");
});

test("rotating IPs cannot bypass the global failure budget", (t) => {
  const { auth } = fixture(t);
  for (let i = 0; i < 29; i++) assert.equal(auth.login("192.0.2." + i, "wrong").status, "invalid");
  assert.equal(auth.login("198.51.100.1", "wrong").status, "blocked");
  assert.equal(auth.login("198.51.100.2", "test-password").status, "blocked");
});

test("recreating authentication against the same database preserves lockouts", (t) => {
  const { auth, options } = fixture(t);
  for (let i = 0; i < 5; i++) auth.login("192.0.2.1", "wrong");
  const restarted = new AdminAuth(options);
  assert.equal(restarted.login("192.0.2.1", "test-password").status, "blocked");
});

test("a successful login resets that IP's failure counter", (t) => {
  const { auth } = fixture(t);
  auth.login("192.0.2.1", "wrong");
  auth.login("192.0.2.1", "wrong");
  assert.equal(auth.login("192.0.2.1", "test-password").status, "ok");
  for (let i = 0; i < 4; i++) assert.equal(auth.login("192.0.2.1", "wrong").status, "invalid");
  assert.equal(auth.login("192.0.2.1", "wrong").status, "blocked");
});

test("sessions are random, stored hashed, and cannot be forged with the old cookie secret", (t) => {
  const { auth, db } = fixture(t);
  const first = auth.login("192.0.2.1", "test-password");
  const second = auth.login("192.0.2.1", "test-password");
  assert.notEqual(first.token, second.token);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.ok(auth.authenticate(first.token));
  assert.ok(!auth.authenticate("route-proxy-secure-session-key-32chars"));
  assert.ok(!auth.authenticate("a".repeat(64)));
  const stored = JSON.stringify(db.prepare("SELECT * FROM admin_sessions").all());
  assert.ok(!stored.includes(first.token));
  assert.ok(!stored.includes("test-password"));
});

test("logout, expiry and password changes revoke existing sessions", (t) => {
  const { auth, options, advance } = fixture(t);
  const loggedOut = auth.login("192.0.2.1", "test-password");
  auth.logout(loggedOut.token);
  assert.ok(!auth.authenticate(loggedOut.token));
  const expired = auth.login("192.0.2.1", "test-password");
  advance(8 * 60 * 60_000);
  assert.ok(!auth.authenticate(expired.token));
  const changed = auth.login("192.0.2.1", "test-password");
  assert.ok(!new AdminAuth({ ...options, password: "new-password" }).authenticate(changed.token));
});

test("an unset admin password disables login; non-string passwords never authenticate", (t) => {
  const { auth, options } = fixture(t);
  for (const password of [undefined, null, {}, ["test-password"]]) assert.notEqual(auth.login("192.0.2.1", password).status, "ok");
  assert.equal(new AdminAuth({ ...options, password: "" }).login("192.0.2.2", "").status, "unconfigured");
});

test("the default admin path is random and persists across restarts", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "route-admin-test-"));
  t.after(() => { unlinkSync(join(dir, "admin-path")); rmdirSync(dir); });
  const first = resolveAdminPath(dir);
  assert.match(first, /^\/manage-[a-f0-9]{24}$/);
  assert.equal(resolveAdminPath(dir), first);
  assert.equal(readFileSync(join(dir, "admin-path"), "utf8"), first);
});

test("admin paths cannot replace the root or introduce route wildcards or query strings", () => {
  for (const path of ["/", "/admin", "/p/:token", "/api/*", "/manage-test?x=1", "//example.com"]) assert.throws(() => validateAdminPath(path));
});
