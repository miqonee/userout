// Optional browser regression check. Requires Playwright and an isolated
// `npm run preview` instance; never use a real administration URL here.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const address = new URL(process.argv[2]);
assert.ok(['127.0.0.1', 'localhost'].includes(address.hostname), 'Only a local preview is allowed');
const browser = await chromium.launch({ headless: true, ...(process.env.UI_BROWSER_CHANNEL ? { channel: process.env.UI_BROWSER_CHANNEL } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => {
      if (window.failClipboard) throw new Error('Test clipboard failure');
      window.copiedText = text;
    } } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(address.href);
  await page.locator('#password').fill('route-preview');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForSelector('.client-row');
  assert.equal(await page.locator('.client-row').count(), 6, 'Start a fresh isolated preview');
  assert.match(await page.locator('.client-key').first().textContent(), /sk-demo-loca/);

  const row = (id) => page.locator('.client-row[data-id="' + id + '"]');
  assert.equal(await row(6).locator('[data-action="bonus"]').isDisabled(), true);
  await row(1).locator('.row-select').check();
  assert.equal(await page.locator('#selectAllClients').evaluate((el) => el.indeterminate), true);
  await page.locator('[data-filter="active"]').click();
  assert.equal(await page.locator('#bulkActions').isVisible(), false);
  await page.locator('#clientSearch').fill('Александр');
  await page.locator('#selectAllClients').check();
  await page.locator('#exportSelected').click();
  const firstInvitation = await page.locator('#funpayTextarea').inputValue();
  assert.equal(firstInvitation.split('\n').length, 1);
  assert.ok(firstInvitation.includes('\\n') && firstInvitation.includes('/p/demo-1'));
  await page.locator('#funpayDialog [data-close]').last().click();
  await row(1).locator('[data-action="telegram"]').click();
  await page.waitForFunction(() => Boolean(window.copiedText));
  assert.equal(await page.evaluate(() => window.copiedText), firstInvitation.replaceAll('\\n', '\n'));

  await page.locator('#clientSearch').fill('');
  await page.locator('[data-filter="all"]').click();
  await page.locator('#selectAllClients').check();
  await page.locator('#exportSelected').click();
  assert.equal((await page.locator('#funpayTextarea').inputValue()).split('\n').length, 5);
  assert.match(await page.locator('#funpayCount').textContent(), /Исключено исчерпанных: 1/);
  await page.evaluate(() => { window.failClipboard = true; });
  await page.locator('#copyFunpayBtn').click();
  await page.locator('#funpayCopyHint').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#funpayTextarea').evaluate((el) => el.selectionEnd - el.selectionStart === el.value.length), true);
  await page.locator('#funpayDialog [data-close]').last().click();
  await page.evaluate(() => { window.failClipboard = false; });

  await row(4).locator('[data-action="bonus"]').click();
  await page.locator('#submitBonusBtn').click();
  await page.locator('#bonusSuccess').waitFor({ state: 'visible' });
  assert.equal(await row(4).getAttribute('data-status'), 'active');
  assert.match(await row(4).locator('.usage-value').textContent(), /55 млн/);
  assert.match(await page.locator('#bonusRemaining').textContent(), /5/);
  await page.locator('#bonusDialog [data-close]').last().click();

  const takeScreenshot = async (name) => {
    if (!process.env.UI_SCREENSHOT_DIR) return;
    await mkdir(process.env.UI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: join(process.env.UI_SCREENSHOT_DIR, name + '.png'), fullPage: true });
  };
  await takeScreenshot('admin-wide');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
  await takeScreenshot('admin-mobile');
  await page.locator('[data-open="newKeyDialog"]').first().click();
  await page.locator('#batchCount').selectOption('3');
  await page.locator('#submitBtn').click();
  await page.locator('#funpayDialog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#funpayTitle').textContent(), 'Создано 3 ключа');
  const fresh = await page.locator('#funpayTextarea').inputValue();
  assert.equal(await page.locator('#funpayTextarea').evaluate((el) => el.scrollLeft), 0);
  assert.equal(fresh.split('\n').length, 3);
  assert.ok(!fresh.includes('/p/demo-'));
  assert.equal(await page.locator('.client-row').count(), 6, 'Do not reload before export closes');
  await takeScreenshot('admin-created-mobile');
  await page.locator('#funpayDialog [data-close]').last().click();
  await page.waitForFunction(() => document.querySelectorAll('.client-row').length === 9);

  // Inject one upstream failure into the UI response, then let the real API
  // handle retry. Only synthetic preview keys are involved.
  await page.setViewportSize({ width: 1440, height: 1050 });
  const newIds = await page.locator('.client-row').evaluateAll((els) => els.slice(0, 2).map((el) => Number(el.dataset.id)));
  for (const id of newIds) await row(id).locator('.row-select').check();
  await page.locator('#deleteSelected').click();
  await page.locator('#deleteDialog [data-close]').last().click();
  assert.equal(await page.locator('.client-row').count(), 9);
  await page.locator('#deleteSelected').click();
  const requestedIds = [];
  await page.route('**/api/keys/batch-delete', async (route) => {
    const ids = route.request().postDataJSON().ids;
    requestedIds.push(ids);
    if (requestedIds.length === 1) {
      const api = await context.request.post(route.request().url(), { data: { ids: [ids[0]] } });
      assert.equal(api.status(), 200);
      await route.fulfill({ json: { deletedIds: [ids[0]], failed: [{ id: ids[1], error: 'Тестовый сбой' }] } });
    } else await route.continue();
  });
  await page.locator('#confirmDelete').click();
  await page.locator('#deleteError').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.client-row').count(), 8);
  assert.equal(await page.locator('#selectedCount').textContent(), 'Выбрано 1');
  await page.locator('#confirmDelete').click();
  await page.locator('#deleteDialog').waitFor({ state: 'hidden' });
  assert.deepEqual(requestedIds, [newIds, [newIds[1]]]);
  assert.equal(await page.locator('.client-row').count(), 7);

  // The server's partial creation path is covered by adminApi.test.js. Here
  // exercise the actual rendered UI when it receives that partial result.
  await page.route('**/api/keys/batch-create', async (route) => {
    const api = await context.request.post(route.request().url(), { data: { ...route.request().postDataJSON(), batchCount: 1 } });
    const result = await api.json();
    await route.fulfill({ status: 500, json: { createdSoFar: result.portals, failedCount: 1, error: 'Тестовый сбой выпуска' } });
  });
  await page.locator('[data-open="newKeyDialog"]').first().click();
  await page.locator('#batchCount').selectOption('3');
  await page.locator('#submitBtn').click();
  await page.locator('#batchResult').waitFor({ state: 'visible' });
  assert.equal((await page.locator('#funpayTextarea').inputValue()).split('\n').length, 1);
  assert.match(await page.locator('#batchResult').textContent(), /Ошибок: 1/);
  assert.deepEqual(errors, []);
  console.log('Admin browser checks passed: selection, filtering, export, clipboard fallback, bonus, full/partial creation, deletion retry, desktop and mobile.');
} finally {
  await browser.close();
}
