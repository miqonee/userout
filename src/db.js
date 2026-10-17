import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";

const dbPath = path.join(config.dataDir, "route.sqlite");
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS portals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portal_token TEXT UNIQUE NOT NULL,
  short_token TEXT,
  client_name TEXT NOT NULL,
  key_id TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  token_limit INTEGER NOT NULL DEFAULT 0,
  allowed_models TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cached_used_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portals_token ON portals(portal_token);
CREATE INDEX IF NOT EXISTS idx_portals_api_key ON portals(api_key);
CREATE INDEX IF NOT EXISTS idx_portals_status ON portals(status);
`);

export function generatePortalToken() {
  let token;
  do {
    token = crypto.randomBytes(8).toString("base64url").slice(0, 10);
  } while (db.prepare("SELECT 1 FROM portals WHERE portal_token = ? OR short_token = ?").get(token, token));
  return token;
}

// Give existing portals a stable short address while retaining the original
// token as an alias for links already delivered to customers.
db.exec("BEGIN IMMEDIATE");
try {
  if (!db.prepare("PRAGMA table_info(portals)").all().some((column) => column.name === "short_token")) {
    db.exec("ALTER TABLE portals ADD COLUMN short_token TEXT");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_portals_short_token ON portals(short_token)");
  const legacy = db.prepare("SELECT id FROM portals WHERE length(portal_token) > 10 AND short_token IS NULL").all();
  const setShortToken = db.prepare("UPDATE portals SET short_token = ? WHERE id = ?");
  for (const portal of legacy) setShortToken.run(generatePortalToken(), portal.id);
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}

export function createPortalRecord({
  portalToken,
  clientName,
  keyId,
  apiKey,
  tokenLimit = 0,
  allowedModels = null,
}) {
  const token = portalToken || generatePortalToken();
  if (portalToken && getPortalByToken(token)) throw new Error("Portal token already exists");
  const now = new Date().toISOString();
  const modelsJson = Array.isArray(allowedModels) ? JSON.stringify(allowedModels) : null;

  const stmt = db.prepare(`
    INSERT INTO portals (
      portal_token, client_name, key_id, api_key,
      token_limit, allowed_models, status, cached_used_tokens,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)
  `);

  const result = stmt.run(token, clientName, keyId, apiKey, tokenLimit, modelsJson, now, now);
  return getPortalById(result.lastInsertRowid);
}

function parsePortalRow(row) {
  if (!row) return null;
  let allowedModels = null;
  if (row.allowed_models) {
    try {
      allowedModels = JSON.parse(row.allowed_models);
    } catch {
      allowedModels = null;
    }
  }

  return {
    id: row.id,
    portalToken: row.short_token || row.portal_token,
    clientName: row.client_name,
    keyId: row.key_id,
    apiKey: row.api_key,
    tokenLimit: Number(row.token_limit) || 0,
    allowedModels,
    status: row.status,
    cachedUsedTokens: Number(row.cached_used_tokens) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPortalById(id) {
  const row = db.prepare("SELECT * FROM portals WHERE id = ?").get(id);
  return parsePortalRow(row);
}

export function getPortalByToken(token) {
  const row = db.prepare("SELECT * FROM portals WHERE portal_token = ? OR short_token = ?").get(token, token);
  return parsePortalRow(row);
}

export function getPortalByApiKey(apiKey) {
  const row = db.prepare("SELECT * FROM portals WHERE api_key = ?").get(apiKey);
  return parsePortalRow(row);
}

export function getAllPortals() {
  const rows = db.prepare("SELECT * FROM portals ORDER BY id DESC").all();
  return rows.map(parsePortalRow);
}

export function updatePortalUsage(id, usedTokens, status = null) {
  const now = new Date().toISOString();
  if (status) {
    db.prepare(`
      UPDATE portals
      SET cached_used_tokens = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(usedTokens, status, now, id);
  } else {
    db.prepare(`
      UPDATE portals
      SET cached_used_tokens = ?, updated_at = ?
      WHERE id = ?
    `).run(usedTokens, now, id);
  }
  return getPortalById(id);
}

export function deletePortalRecord(id) {
  const stmt = db.prepare("DELETE FROM portals WHERE id = ?");
  return stmt.run(id).changes > 0;
}

export function updatePortalLimit(id, newTokenLimit) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE portals
    SET token_limit = ?,
        status = CASE WHEN ? > 0 AND cached_used_tokens < ? THEN 'active' ELSE status END,
        updated_at = ?
    WHERE id = ?
  `).run(newTokenLimit, newTokenLimit, newTokenLimit, now, id);
  return getPortalById(id);
}

export { db };
