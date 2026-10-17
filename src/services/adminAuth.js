import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest();
const hash = (value) => digest(value).toString("hex");

export class AdminAuth {
  constructor({ db, password, now = Date.now, windowMs = 15 * 60_000, sessionMs = 8 * 60 * 60_000 }) {
    this.db = db;
    this.passwordDigest = password ? digest(password) : null;
    this.now = now;
    this.windowMs = windowMs;
    this.sessionMs = sessionMs;
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_login_limits (
        scope TEXT PRIMARY KEY,
        failures INTEGER NOT NULL,
        window_started_at INTEGER NOT NULL,
        blocked_until INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        password_fingerprint TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
  }

  scopes(ip) {
    return [{ scope: "global", limit: 30 }, { scope: "ip:" + hash(ip), limit: 5 }];
  }

  retryAfter(ip) {
    const now = this.now();
    let until = 0;
    for (const { scope } of this.scopes(ip)) {
      const row = this.db.prepare("SELECT blocked_until FROM admin_login_limits WHERE scope = ?").get(scope);
      until = Math.max(until, row?.blocked_until || 0);
    }
    return Math.max(0, Math.ceil((until - now) / 1000));
  }

  recordFailure(ip) {
    const now = this.now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM admin_login_limits WHERE window_started_at <= ? AND blocked_until <= ?").run(now - this.windowMs, now);
      for (const { scope, limit } of this.scopes(ip)) {
        const row = this.db.prepare("SELECT * FROM admin_login_limits WHERE scope = ?").get(scope);
        const failures = (row?.failures || 0) + 1;
        const blockedUntil = failures >= limit ? now + this.windowMs : 0;
        this.db.prepare(`INSERT INTO admin_login_limits (scope, failures, window_started_at, blocked_until)
          VALUES (?, ?, ?, ?) ON CONFLICT(scope) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until`)
          .run(scope, failures, row?.window_started_at ?? now, blockedUntil);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.retryAfter(ip);
  }

  login(ip, password) {
    const retryAfter = this.retryAfter(ip);
    if (retryAfter) return { status: "blocked", retryAfter };
    if (!this.passwordDigest) return { status: "unconfigured" };
    const valid = typeof password === "string" && password.length <= 1024 && timingSafeEqual(digest(password), this.passwordDigest);
    if (!valid) {
      const wait = this.recordFailure(ip);
      return wait ? { status: "blocked", retryAfter: wait } : { status: "invalid" };
    }

    const now = this.now();
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
    this.db.prepare("DELETE FROM admin_login_limits WHERE scope = ?").run("ip:" + hash(ip));
    this.db.prepare("INSERT INTO admin_sessions (token_hash, password_fingerprint, expires_at) VALUES (?, ?, ?)")
      .run(hash(token), createHmac("sha256", this.passwordDigest).update(token).digest("hex"), now + this.sessionMs);
    return { status: "ok", token, maxAge: Math.floor(this.sessionMs / 1000) };
  }

  authenticate(token) {
    if (!this.passwordDigest || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
    const session = this.db.prepare("SELECT * FROM admin_sessions WHERE token_hash = ?").get(hash(token));
    return !!session && session.expires_at > this.now() && timingSafeEqual(
      Buffer.from(session.password_fingerprint, "hex"), createHmac("sha256", this.passwordDigest).update(token).digest(),
    );
  }

  logout(token) {
    if (typeof token === "string") this.db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hash(token));
  }
}
