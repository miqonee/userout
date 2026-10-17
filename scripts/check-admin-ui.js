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
const takeScreenshot = async (page, name) => {
  if (!process.env.UI_SCREENSHOT_DIR) return;
  await mkdir(process.env.UI_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(process.env.UI_SCREENSHOT_DIR, name + '.png'), fullPage: true });
};
async function checkTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  assert.equal(await page.locator('html').evaluate((el) => getComputedStyle(el).colorScheme), theme);
  const lightBackgrounds = { 'state-page': 'rgb(246, 248, 242)', 'login-page': 'rgb(250, 251, 248)' };
  const bodyClass = await page.locator('body').getAttribute('class');
  const expectedBackground = theme === 'dark' ? 'rgb(21, 27, 24)' : lightBackgrounds[bodyClass] || 'rgb(247, 248, 250)';
  assert.equal(await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor), expectedBackground);
  if (theme !== 'dark') return;
  const contrasts = await page.locator('.metric-label,.metric-foot,.code-block pre,.guide-content,.setup-title,.badge,.quota-caption,.notice,.input,.state-card>p,.funpay-area').evaluateAll((elements) => {
    const luminance = (rgb) => rgb.map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const rgb = (value) => value.match(/[\d.]+/g).map(Number);
    return elements.filter((el) => el.checkVisibility()).map((el) => {
      let ancestor = el;
      while (ancestor.parentElement && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement;
      const foreground = luminance(rgb(getComputedStyle(el).color));
      const background = luminance(rgb(getComputedStyle(ancestor).backgroundColor));
      return { selector: el.className, ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
    });
  });
  for (const { selector, ratio } of contrasts) assert.ok(ratio >= 4.5, `Dark theme text contrast for ${selector}: ${ratio}`);
}
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
  for (const theme of ['light', 'dark']) {
    await checkTheme(page, theme);
    await takeScreenshot(page, 'login-' + theme);
  }
  await page.locator('#password').fill('route-preview');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForSelector('.client-row');
  assert.equal(await page.locator('.client-row').count(), 6, 'Start a fresh isolated preview');
  assert.match(await page.locator('.client-key').first().textContent(), /sk-demo-loca/);
  for (const theme of ['light', 'dark']) {
    await checkTheme(page, theme);
    await takeScreenshot(page, 'admin-' + theme);
  }
  // Theme changes apply to the same open document without a reload.
  await checkTheme(page, 'light');
  const portal = await context.newPage();
  for (const [path, name] of [['/p/demo-1', 'portal'], ['/p/demo-4', 'depleted'], ['/p/missing-theme-check', 'missing']]) {
    await portal.goto(new URL(path, address).href);
    for (const theme of ['light', 'dark']) {
      await checkTheme(portal, theme);
      await takeScreenshot(portal, name + '-' + theme);
    }
    await portal.setViewportSize({ width: 390, height: 844 });
    assert.equal(await portal.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await takeScreenshot(portal, name + '-dark-mobile');
    await portal.setViewportSize({ width: 1440, height: 1050 });
  }
  await portal.close();

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
  assert.match(firstInvitation, /^API Key: sk-demo-local-only-1\\nBase URL: http:\/\/127\.0\.0\.1:\d+\/v1\\nЛичный кабинет \(расход и инструкции\): http:\/\/127\.0\.0\.1:\d+\/p\/demo-1$/);
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

  await takeScreenshot(page, 'admin-wide');
  await page.setViewportSize({ width: 390, height: 844 });
  await checkTheme(page, 'dark');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal page overflow');
  await takeScreenshot(page, 'admin-mobile');
  await page.locator('[data-open="newKeyDialog"]').first().click();
  await page.locator('#batchCount').selectOption('3');
  await page.locator('#submitBtn').click();
  await page.locator('#funpayDialog').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#funpayTitle').textContent(), 'Создано 3 ключа');
  const fresh = await page.locator('#funpayTextarea').inputValue();
  assert.equal(await page.locator('#funpayTextarea').evaluate((el) => el.scrollLeft), 0);
  assert.equal(fresh.split('\n').length, 3);
  for (const line of fresh.split('\n')) assert.match(line, /^API Key: sk-demo-.+\\nBase URL: http:\/\/127\.0\.0\.1:\d+\/v1\\nЛичный кабинет \(расход и инструкции\): http:\/\/127\.0\.0\.1:\d+\/p\/[A-Za-z0-9_-]{10}$/);
  await checkTheme(page, 'dark');
  assert.ok(!fresh.includes('/p/demo-'));
  assert.equal(await page.locator('.client-row').count(), 6, 'Do not reload before export closes');
  await takeScreenshot(page, 'admin-created-mobile');
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
  console.log('Browser checks passed: automatic light/dark themes, dark text contrast, portal states, selection, filtering, exact export format, short links, clipboard fallback, bonus, full/partial creation, deletion retry, desktop and mobile.');
} finally {
  await browser.close();
}
