import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('short portal addresses preserve existing links and survive database reopen', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'route-token-test-'));
  process.env.DATA_DIR = dataDir;
  const legacyToken = '4e556b7b71d349355616ee7905d76f04';
  const depletedToken = '0123456789abcdef0123456789abcdef';
  const legacyDb = new DatabaseSync(join(dataDir, 'route.sqlite'));
  // The pre-update schema deliberately has no short_token column.
  legacyDb.exec(`CREATE TABLE portals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, portal_token TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL, key_id TEXT NOT NULL, api_key TEXT UNIQUE NOT NULL,
    token_limit INTEGER NOT NULL DEFAULT 0, allowed_models TEXT,
    status TEXT NOT NULL DEFAULT 'active', cached_used_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  const insert = legacyDb.prepare(`INSERT INTO portals
    (portal_token, client_name, key_id, api_key, token_limit, status, cached_used_tokens, created_at, updated_at)
    VALUES (?, 'Legacy', ?, ?, 1000, ?, ?, '2026-01-01', '2026-01-01')`);
  insert.run(legacyToken, 'old-key', 'sk-old', 'active', 100);
  insert.run(depletedToken, 'depleted-key', 'sk-depleted', 'depleted', 1000);
  insert.run('AAAAAAAAAA', 'short-key', 'sk-short', 'active', 0);
  legacyDb.close();

  const { db, createPortalRecord, getPortalByToken, getPortalById, getAllPortals, generatePortalToken, deletePortalRecord } = await import('../src/db.js');
  t.after(() => {
    db.close();
    for (const file of readdirSync(dataDir)) unlinkSync(join(dataDir, file));
    rmdirSync(dataDir);
  });
  const active = getPortalByToken(legacyToken);
  const depleted = getPortalByToken(depletedToken);

  await t.test('migration keeps credentials, usage, timestamps and old links intact', () => {
    for (const [portal, status, used] of [[active, 'active', 100], [depleted, 'depleted', 1000]]) {
      assert.match(portal.portalToken, /^[A-Za-z0-9_-]{10}$/);
      assert.deepEqual(getPortalByToken(portal.portalToken), portal);
      assert.deepEqual(getPortalById(portal.id), portal);
      assert.equal(portal.status, status);
      assert.equal(portal.cachedUsedTokens, used);
      assert.equal(portal.createdAt, '2026-01-01');
      assert.equal(portal.updatedAt, '2026-01-01');
    }
    assert.equal(active.apiKey, 'sk-old');
    assert.equal(active.keyId, 'old-key');
    assert.equal(getPortalByToken('AAAAAAAAAA').portalToken, 'AAAAAAAAAA');
    assert.equal(getPortalByToken('missing'), null);
    assert.equal(getAllPortals().length, 3);
  });

  await t.test('new records use distinct ten-character URL-safe tokens', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      const portal = createPortalRecord({ clientName: 'New', keyId: 'new-' + i, apiKey: 'sk-new-' + i });
      assert.match(portal.portalToken, /^[A-Za-z0-9_-]{10}$/);
      assert.deepEqual(getPortalByToken(portal.portalToken), portal);
      tokens.add(portal.portalToken);
    }
    assert.equal(tokens.size, 100);
  });

  await t.test('generation retries collisions with both original and migrated tokens', (t) => {
    // Eight bytes encode to eleven base64url characters; the first ten are used.
    const aliasBytes = crypto.randomBytes(8);
    const alias = aliasBytes.toString('base64url').slice(0, 10);
    db.prepare('UPDATE portals SET short_token = ? WHERE id = ?').run(alias, active.id);
    const freshBytes = crypto.randomBytes(8);
    const candidates = [Buffer.alloc(8), aliasBytes, freshBytes];
    const mock = t.mock.method(crypto, 'randomBytes', () => candidates.shift());
    assert.equal(generatePortalToken(), freshBytes.toString('base64url').slice(0, 10));
    assert.equal(mock.mock.callCount(), 3);
    mock.mock.restore();
    db.prepare('UPDATE portals SET short_token = ? WHERE id = ?').run(active.portalToken, active.id);
    assert.throws(() => createPortalRecord({ portalToken: active.portalToken, clientName: 'Duplicate', keyId: 'dup', apiKey: 'sk-dup' }), /already exists/);
  });

  await t.test('reopening the database retains the same canonical short addresses', async () => {
    const reopened = await import('../src/db.js?reopen');
    try {
      assert.deepEqual(reopened.getPortalByToken(legacyToken), active);
      assert.deepEqual(reopened.getPortalByToken(active.portalToken), active);
      assert.deepEqual(reopened.getPortalByToken(depletedToken), depleted);
    } finally {
      reopened.db.close();
    }
  });

  await t.test('deletion revokes both short and original addresses', () => {
    assert.equal(deletePortalRecord(active.id), true);
    assert.equal(getPortalByToken(legacyToken), null);
    assert.equal(getPortalByToken(active.portalToken), null);
  });
});
