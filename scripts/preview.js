// An isolated, local-only preview. It never connects to a real 9router instance.
import { createServer } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const models = ["ag/gemini-3.8-flash-low", "cl/z-ai/glm-5.2:free", "openai/gpt-4.1"];
const samples = [
  ["Александр · Cursor", 50_000_000, 12_450_000, "active", models],
  ["Студия Форма", 100_000_000, 37_200_000, "active", models.slice(0, 2)],
  ["Мария · Разработка", 10_000_000, 8_720_000, "active", models.slice(1)],
  ["Команда North", 50_000_000, 50_000_000, "depleted", models],
  ["Дмитрий · Python", 10_000_000, 1_830_000, "active", null],
  ["Лаборатория", 0, 4_120_000, "active", null],
];
const keys = new Map();
let failNextCreate = false;
const upstream = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  response.setHeader("Content-Type", "application/json");
  const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
  if (url.pathname === "/api/auth/login") {
    response.setHeader("Set-Cookie", "auth_token=local-preview-only; Path=/; HttpOnly");
    return send(200, { success: true });
  }
  if (url.pathname === "/v1/models") return send(200, { data: models.map((id) => ({ id })) });
  if (url.pathname === "/api/keys" && request.method === "GET") return send(200, { keys: [...keys.values()] });
  if (url.pathname === "/api/keys" && request.method === "POST") {
    let body = "";
    for await (const part of request) body += part;
    const data = JSON.parse(body);
    if (failNextCreate) { failNextCreate = false; return send(503, { error: "Preview upstream is unavailable" }); }
    const id = randomUUID();
    const key = { ...data, id, key: "sk-demo-" + id, isActive: true, usedTokens: 0 };
    keys.set(id, key);
    return send(201, key);
  }
  const id = url.pathname.split("/").pop();
  if (request.method === "PUT" && keys.has(id)) {
    let body = "";
    for await (const part of request) body += part;
    const update = JSON.parse(body);
    if (typeof update.usedTokens === "number") keys.get(id).usedTokens = Math.max(0, update.usedTokens);
    if (typeof update.tokenLimit === "number") keys.get(id).tokenLimit = update.tokenLimit;
    return send(200, { key: keys.get(id) });
  }
  if (request.method === "DELETE" && keys.has(id)) { keys.delete(id); return send(200, { success: true }); }
  if (keys.has(id)) return send(200, { key: keys.get(id) });
  // A local test hook for checking error UI, never part of the application.
  if (url.pathname === "/preview/fail-next-create") { failNextCreate = true; return send(200, { success: true }); }
  return send(404, { error: "Preview endpoint not found" });
});
await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));

process.env.PORT = process.env.PREVIEW_PORT || "3100";
process.env.HOST = "127.0.0.1";
process.env.PUBLIC_URL = `http://127.0.0.1:${process.env.PORT}`;
process.env.ROUTER_URL = `http://127.0.0.1:${upstream.address().port}`;
process.env.ROUTER_PASSWORD = "local-preview-only";
process.env.ADMIN_PASSWORD = "route-preview";
process.env.TRUST_PROXY = "";
process.env.COOKIE_SECRET = randomUUID();
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "route-design-preview-"));
process.env.NODE_ENV = "production";

const { createPortalRecord, updatePortalUsage } = await import("../src/db.js");
const { config } = await import("../src/config.js");
for (const [index, [clientName, tokenLimit, usedTokens, status, allowedModels]] of samples.entries()) {
  const keyId = `demo-${index + 1}`;
  const apiKey = `sk-demo-local-only-${index + 1}`;
  const key = { id: keyId, name: clientName, key: apiKey, tokenLimit, usedTokens, allowedModels, isActive: status === "active" };
  keys.set(keyId, key);
  const portal = createPortalRecord({ clientName, tokenLimit, allowedModels, keyId, apiKey, portalToken: `demo-${index + 1}` });
  updatePortalUsage(portal.id, usedTokens, status);
}
await import("../src/server.js");
console.log(`\nIsolated design preview · sample data only\nAdmin: http://127.0.0.1:${process.env.PORT}${config.adminPath}\nPassword: route-preview\nClient: http://127.0.0.1:${process.env.PORT}/p/demo-1\nDepleted: /p/demo-4 · Unlimited: /p/demo-6`);
