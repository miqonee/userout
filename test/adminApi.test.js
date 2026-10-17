import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('admin key operations against an isolated upstream and database', async (t) => {
  const keys = new Map();
  const failDelete = new Set();
  const deleteCalls = [];
  let failUpdate = false;
  let failCreateAt = 0;
  let createCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    assert.ok(url.startsWith('http://upstream.test/'));
    const req = { url: new URL(url).pathname, method: options.method || 'GET' };
    const body = options.body ? JSON.parse(options.body) : {};
    const send = (status, value) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (req.url === '/api/auth/login') {
      return new Response('{}', { headers: { 'Set-Cookie': 'auth_token=test-only' } });
    }
    if (req.url === '/api/keys' && req.method === 'POST') {
      createCalls++;
      if (createCalls === failCreateAt) return send(503, { error: 'test failure' });
      const key = { ...body, id: 'key-' + createCalls, key: 'sk-test-' + createCalls, usedTokens: 0 };
      keys.set(key.id, key);
      return send(201, key);
    }
    const id = req.url.split('/').pop();
    if (req.method === 'DELETE') {
      deleteCalls.push(id);
      if (failDelete.has(id)) return send(503, { error: 'test failure' });
      return send(keys.delete(id) ? 200 : 404, {});
    }
    if (req.method === 'PUT') {
      if (failUpdate) return send(503, { error: 'test failure' });
      Object.assign(keys.get(id), body);
      return send(200, { key: keys.get(id) });
    }
    return send(404, {});
  });
  const dataDir = mkdtempSync(join(tmpdir(), 'route-admin-test-'));
  Object.assign(process.env, {
    DATA_DIR: dataDir, HOST: '127.0.0.1', PORT: '0',
    PUBLIC_URL: 'http://127.0.0.1', ADMIN_PASSWORD: 'admin-test-password',
    ROUTER_PASSWORD: 'upstream-test-password', ROUTER_URL: 'http://upstream.test',
    NODE_ENV: 'test',
  });
  const { fastify } = await import('../src/server.js');
  const { config } = await import('../src/config.js');
  const { getPortalById, updatePortalUsage, db } = await import('../src/db.js');
  t.after(async () => {
    await fastify.close();
    db.close();
    for (const file of readdirSync(dataDir)) unlinkSync(join(dataDir, file));
    rmdirSync(dataDir);
  });
  const api = config.adminPath + '/api/keys';
  const login = await fastify.inject({ method: 'POST', url: config.adminPath + '/login', payload: { password: process.env.ADMIN_PASSWORD } });
  assert.equal(login.statusCode, 302);
  const cookie = login.headers['set-cookie'].split(';')[0];
  const request = (method, path, payload, authenticated = true) => fastify.inject({ method, url: api + path, payload, headers: authenticated ? { cookie } : {} });
  const create = async (count = 1, tokenLimit = 1000) => {
    const res = await request('POST', '/batch-create', { clientName: 'Тест', tokenLimit, batchCount: count });
    assert.equal(res.statusCode, 201);
    return res.json().portals;
  };

  await t.test('mutation endpoints require an administrator session', async () => {
    for (const [method, path, payload] of [
      ['POST', '/batch-delete', { ids: [1] }], ['DELETE', '/1'],
      ['POST', '/1/add-tokens', { addTokens: 100 }], ['POST', '/batch-create', { batchCount: 1 }],
    ]) assert.equal((await request(method, path, payload, false)).statusCode, 401);
  });
  await t.test('invalid batch IDs are rejected before any upstream call', async () => {
    for (const ids of [[], [0], [-1], [1.5], ['1'], null]) {
      assert.equal((await request('POST', '/batch-delete', { ids })).statusCode, 400);
    }
    assert.equal(deleteCalls.length, 0);
  });
  await t.test('new API records return short addresses usable by portal and status routes', async () => {
    const [portal] = await create();
    assert.match(portal.portalToken, /^[A-Za-z0-9_-]{10}$/);
    const page = await fastify.inject('/p/' + portal.portalToken);
    assert.equal(page.statusCode, 200);
    assert.ok(page.body.includes(portal.apiKey));
    assert.equal((await fastify.inject('/api/portal/' + portal.portalToken + '/status')).statusCode, 200);
  });
  await t.test('partial deletion preserves failures and retries do not revoke successful keys again', async () => {
    const [a, b] = await create(2);
    failDelete.add(b.keyId);
    const result = (await request('POST', '/batch-delete', { ids: [a.id, b.id, a.id] })).json();
    assert.deepEqual(result.deletedIds, [a.id]);
    assert.deepEqual(result.failed.map((f) => f.id), [b.id]);
    assert.equal(getPortalById(a.id), null);
    assert.ok(getPortalById(b.id));
    failDelete.clear();
    assert.deepEqual((await request('POST', '/batch-delete', { ids: [b.id] })).json(), { deletedIds: [b.id], failed: [] });
    assert.equal(deleteCalls.filter((id) => id === a.keyId).length, 1);
    assert.equal(getPortalById(b.id), null);
    assert.deepEqual((await request('POST', '/batch-delete', { ids: [a.id] })).json().deletedIds, [a.id]);
  });
  await t.test('single deletion preserves a key on failure and accepts upstream 404', async () => {
    const [portal] = await create();
    failDelete.add(portal.keyId);
    assert.equal((await request('DELETE', '/' + portal.id)).statusCode, 502);
    assert.ok(getPortalById(portal.id));
    failDelete.clear();
    keys.delete(portal.keyId);
    assert.equal((await request('DELETE', '/' + portal.id)).statusCode, 200);
    assert.equal(getPortalById(portal.id), null);
  });
  await t.test('bonuses preserve local state on failure and revive a depleted key on success', async () => {
    const [portal] = await create();
    updatePortalUsage(portal.id, 1000, 'depleted');
    failUpdate = true;
    assert.equal((await request('POST', '/' + portal.id + '/add-tokens', { addTokens: 100 })).statusCode, 502);
    assert.equal(getPortalById(portal.id).tokenLimit, 1000);
    assert.equal(getPortalById(portal.id).status, 'depleted');
    failUpdate = false;
    const res = await request('POST', '/' + portal.id + '/add-tokens', { addTokens: 100 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().newLimit, 1100);
    assert.equal(res.json().usedTokens, 1000);
    assert.equal(res.json().status, 'active');
    assert.equal(keys.get(portal.keyId).tokenLimit, 1100);
    for (const addTokens of [1.5, '10abc', -1, 0, Number.MAX_SAFE_INTEGER]) {
      assert.equal((await request('POST', '/' + portal.id + '/add-tokens', { addTokens })).statusCode, 400);
    }
    const [unlimited] = await create(1, 0);
    assert.equal((await request('POST', '/' + unlimited.id + '/add-tokens', { addTokens: 100 })).statusCode, 400);
    assert.equal(getPortalById(unlimited.id).tokenLimit, 0);
  });
  await t.test('a failed batch retains the created subset for invitation export', async () => {
    failCreateAt = createCalls + 2;
    const result = await request('POST', '/batch-create', { clientName: 'Пачка', tokenLimit: 1000, batchCount: 3 });
    assert.equal(result.statusCode, 500);
    assert.equal(result.json().createdSoFar.length, 1);
    assert.equal(result.json().failedCount, 1);
    assert.ok(getPortalById(result.json().createdSoFar[0].id));
  });
  await t.test('batch creation without clientName generates single random names without separator', async () => {
    const res = await request('POST', '/batch-create', { clientName: '   ', tokenLimit: 1000, batchCount: 2 });
    assert.equal(res.statusCode, 201);
    const portals = res.json().portals;
    assert.equal(portals.length, 2);
    for (const p of portals) {
      assert.ok(!p.clientName.includes(' · '), `Expected single name without separator, got ${p.clientName}`);
      assert.ok(p.clientName.trim().length > 0);
    }
    const singleNamed = await request('POST', '/batch-create', { clientName: 'Тестовый', tokenLimit: 1000, batchCount: 1 });
    assert.equal(singleNamed.json().portals[0].clientName, 'Тестовый');

    const batchNamed = await request('POST', '/batch-create', { clientName: 'Пакет', tokenLimit: 1000, batchCount: 2 });
    for (const p of batchNamed.json().portals) {
      assert.ok(p.clientName.startsWith('Пакет · '), `Expected name with prefix 'Пакет · ', got ${p.clientName}`);
    }
  });
});
