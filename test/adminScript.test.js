import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { renderAdminDashboardHtml } from '../src/views/adminHtml.js';

// Minimal event-driven DOM fixture; execute the actual rendered script, not a
// second implementation of the invitation format or selection state.
function dashboardFixture(portals, publicUrl = 'https://gateway.example') {
  const nodes = new Map();
  const makeNode = () => ({
    listeners: {}, children: new Map(), dataset: {}, style: {}, value: '', hidden: false,
    checked: false, disabled: false, textContent: '', innerHTML: '',
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    async emit(type, event = {}) { for (const handler of this.listeners[type] || []) await handler({ target: this, currentTarget: this, preventDefault() {}, ...event }); },
    querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, makeNode()); return this.children.get(selector); },
    querySelectorAll() { return []; },
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
    showModal() { this.open = true; },
    close() { this.open = false; return this.emit('close'); },
    focus() { this.focused = true; },
    select() { this.selectionStart = 0; this.selectionEnd = this.value.length; },
    matches(selector) { return selector === '.row-select'; },
  });
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, makeNode()); return nodes.get(id); };
  let rowNodes = portals.map((p) => {
    const row = makeNode();
    row.dataset = { id: String(p.id), name: p.clientName.toLocaleLowerCase('ru'), status: p.status };
    row.querySelector('.row-select').closest = () => row;
    row.remove = () => { rowNodes = rowNodes.filter((r) => r !== row); };
    return row;
  });
  const metricNumbers = Array.from({ length: 4 }, makeNode);
  const metricFeet = Array.from({ length: 4 }, makeNode);
  const document = {
    getElementById: get, addEventListener() {},
    querySelector: get,
    querySelectorAll(selector) {
      if (selector === '.client-row') return rowNodes;
      if (selector === '.metric-number') return metricNumbers;
      if (selector === '.metric-foot') return metricFeet;
      return [];
    },
  };
  get('allModelsCheck').checked = true;
  get('batchCount').value = '3';
  get('tokenLimit').value = '10000000';
  const fixture = {
    get, rows: () => rowNodes, copied: [], reloads: 0, clipboardFails: false,
    fetch: async () => { throw new Error('Unexpected request'); },
    async select(id) {
      const input = rowNodes.find((r) => r.dataset.id === String(id)).querySelector('.row-select');
      input.checked = true;
      await get('portalsTableBody').emit('change', { target: input });
    },
    async action(id, action) {
      const row = rowNodes.find((r) => r.dataset.id === String(id));
      const button = { dataset: { action }, closest: () => row };
      await get('portalsTableBody').emit('click', { target: { closest: () => button } });
      // Delegated click handlers intentionally do not await their copy helper.
      await Promise.resolve();
    },
  };
  const html = renderAdminDashboardHtml({ portals, publicUrl });
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    runInNewContext(match[1], {
      document, Intl, setTimeout: () => 0, clearTimeout() {},
      navigator: { clipboard: { writeText: async (text) => {
        if (fixture.clipboardFails) throw new Error('Clipboard unavailable');
        fixture.copied.push(text);
      } } },
      fetch: (...args) => fixture.fetch(...args),
      window: { location: { reload: () => { fixture.reloads++; } } },
    });
  }
  return fixture;
}
const samples = [1, 2, 3].map((id) => ({
  id, clientName: 'Клиент ' + id, portalToken: 'test-' + id, apiKey: 'sk-test-' + id,
  tokenLimit: 10000000, cachedUsedTokens: id === 3 ? 10000000 : 0, status: id === 3 ? 'depleted' : 'active',
}));
const response = (value, ok = true) => ({ ok, json: async () => value });

test('rendered FunPay script produces one physical line per key and reuses the Telegram invitation', async () => {
  const f = dashboardFixture(samples);
  for (const p of samples) await f.select(p.id);
  await f.get('exportSelected').emit('click');
  const lines = f.get('funpayTextarea').value.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'API Key: sk-test-1\\nBase URL: https://gateway.example/v1\\nЛичный кабинет (расход и инструкции): https://gateway.example/p/test-1');
  assert.equal(lines[1], 'API Key: sk-test-2\\nBase URL: https://gateway.example/v1\\nЛичный кабинет (расход и инструкции): https://gateway.example/p/test-2');
  assert.match(f.get('funpayCount').textContent, /Исключено исчерпанных: 1/);
  await f.get('funpayDialog').close();
  assert.equal(f.reloads, 0);
  await f.action(1, 'telegram');
  assert.equal(f.copied[0], lines[0].replaceAll('\\n', '\n'));
});

test('invitations normalize the base URL and copy the complete API key', async () => {
  const f = dashboardFixture(samples, 'https://gateway.example///');
  await f.action(1, 'telegram');
  assert.equal(f.copied[0], 'API Key: sk-test-1\nBase URL: https://gateway.example/v1\nЛичный кабинет (расход и инструкции): https://gateway.example/p/test-1');
});
test('selection is indeterminate, selects only found rows, and resets on a search change', async () => {
  const f = dashboardFixture(samples);
  await f.select(1);
  assert.equal(f.get('selectAllClients').indeterminate, true);
  f.get('clientSearch').value = 'Клиент 2';
  await f.get('clientSearch').emit('input');
  assert.equal(f.get('bulkActions').hidden, true);
  f.get('selectAllClients').checked = true;
  await f.get('selectAllClients').emit('change');
  assert.equal(f.get('selectedCount').textContent, 'Выбрано 1');
  await f.get('exportSelected').emit('click');
  assert.ok(f.get('funpayTextarea').value.includes('/p/test-2'));
  assert.ok(!f.get('funpayTextarea').value.includes('/p/test-1'));
});
test('partial deletion retains failed selections and repeats only failed IDs', async () => {
  const f = dashboardFixture(samples);
  await f.select(1); await f.select(2);
  await f.get('deleteSelected').emit('click');
  assert.equal(f.rows().length, 3); // Opening confirmation performs no deletion.
  await f.get('deleteDialog').close();
  assert.equal(f.rows().length, 3);
  await f.get('deleteSelected').emit('click');
  const requests = [];
  f.fetch = async (url, options) => {
    requests.push(JSON.parse(options.body).ids);
    return response(requests.length === 1 ? { deletedIds: [1], failed: [{ id: 2, error: 'Сбой' }] } : { deletedIds: [2], failed: [] });
  };
  await f.get('confirmDelete').emit('click');
  assert.equal(f.rows().length, 2);
  assert.equal(f.get('selectedCount').textContent, 'Выбрано 1');
  assert.equal(f.get('deleteDialog').open, true);
  await f.get('confirmDelete').emit('click');
  assert.deepEqual(requests, [[1, 2], [2]]);
  assert.equal(f.rows().length, 1);
  assert.equal(f.get('deleteDialog').open, false);
});
test('full and partial batch creation offer only new invitations and reload after closing the result', async () => {
  for (const partial of [false, true]) {
    const f = dashboardFixture(samples);
    const created = samples.slice(0, partial ? 1 : 2).map((c) => ({ ...c, id: c.id + 10, portalToken: 'new-' + c.id }));
    let calls = 0;
    f.fetch = async () => {
      calls++;
      return response(partial ? { createdSoFar: created, failedCount: 1, error: 'Сбой' } : { portals: created }, !partial);
    };
    await f.get('createKeyForm').emit('submit');
    assert.equal(f.get('funpayDialog').open, true);
    assert.equal(f.get('funpayTextarea').value.split('\n').length, created.length);
    assert.ok(f.get('funpayTextarea').value.includes('/p/new-1'));
    assert.equal(f.get('funpayTextarea').value.split('\n')[0], 'API Key: sk-test-1\\nBase URL: https://gateway.example/v1\\nЛичный кабинет (расход и инструкции): https://gateway.example/p/new-1');
    assert.ok(!f.get('funpayTextarea').value.includes('/p/test-1'));
    assert.equal(f.get('batchResult').hidden, !partial);
    assert.equal(calls, 1);
    assert.equal(f.reloads, 0);
    await f.get('funpayDialog').close();
    assert.equal(f.reloads, 1);
  }
});
test('batch creation leaves clientName empty when no name was entered', async () => {
  const f = dashboardFixture(samples);
  let requestBody = null;
  f.fetch = async (url, opts) => {
    requestBody = JSON.parse(opts.body);
    return response({ portals: [{ id: 99, portalToken: 'x', apiKey: 'y', tokenLimit: 100, cachedUsedTokens: 0 }] });
  };
  await f.get('createKeyForm').emit('submit');
  assert.equal(requestBody.clientName, '');
});
test('clipboard failure selects the export and exposes a manual fallback for Telegram', async () => {
  const f = dashboardFixture(samples);
  f.clipboardFails = true;
  await f.select(1);
  await f.get('exportSelected').emit('click');
  await f.get('copyFunpayBtn').emit('click');
  assert.equal(f.get('funpayCopyHint').hidden, false);
  assert.equal(f.get('funpayTextarea').selectionEnd, f.get('funpayTextarea').value.length);
  await f.get('funpayDialog').close();
  await f.action(1, 'telegram');
  assert.equal(f.get('manualCopyDialog').open, true);
  assert.ok(f.get('manualCopyText').value.includes('/p/test-1'));
});

test('bonus errors leave the table unchanged, success updates quota and status, unlimited keys cannot receive bonuses', async () => {
  const f = dashboardFixture(samples);
  await f.action(3, 'bonus');
  f.fetch = async () => response({ error: 'Шлюз недоступен' }, false);
  await f.get('bonusForm').emit('submit');
  assert.equal(f.rows()[2].dataset.status, 'depleted');
  assert.equal(f.get('bonusError').hidden, false);
  assert.equal(f.get('bonusSuccess').hidden, true);
  f.fetch = async () => response({ newLimit: 11000000, addedTokens: 1000000, usedTokens: 10000000, status: 'active', portalUrl: 'https://gateway.example/p/test-3' });
  await f.get('bonusForm').emit('submit');
  assert.equal(f.rows()[2].dataset.status, 'active');
  assert.match(f.rows()[2].querySelector('.usage-value').innerHTML, /11 млн/);
  assert.equal(f.get('bonusSuccess').hidden, false);
  assert.equal(f.get('bonusRemaining').textContent.replace(/\s/g, ''), '1000000');
  f.fetch = async () => { throw new Error('Do not submit an already completed bonus again'); };
  await f.get('bonusForm').emit('submit');
  assert.equal(f.get('bonusError').hidden, true);

  const unlimited = dashboardFixture([{ ...samples[0], tokenLimit: 0 }]);
  await unlimited.action(1, 'bonus');
  assert.ok(!unlimited.get('bonusDialog').open);
});

test('empty and depleted-only exports have useful states and no copy action', async () => {
  const empty = dashboardFixture([]);
  assert.equal(empty.get('selectAllClients').disabled, true);
  await empty.get('openFunpay').emit('click');
  assert.ok(!empty.get('funpayDialog').open);
  const f = dashboardFixture(samples);
  await f.select(3);
  await f.get('exportSelected').emit('click');
  assert.equal(f.get('funpayTextarea').value, '');
  assert.equal(f.get('copyFunpayBtn').disabled, true);
  assert.match(f.get('funpayCount').textContent, /Исключено исчерпанных: 1/);
});
