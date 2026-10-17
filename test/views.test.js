import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { renderAdminDashboardHtml, renderAdminLoginHtml } from "../src/views/adminHtml.js";
import { renderPortalHtml, renderMissingPortalHtml } from "../src/views/portalHtml.js";
import { faviconSvg, faviconDataUri } from "../src/views/ui.js";
import { buildConnectionGuides } from "../src/views/connectionGuides.js";
import { resolvePortalModels } from "../src/services/portalModels.js";
import { generateRandomClientName } from "../src/names.js";
import { toUserFacingModel, toUpstreamModel } from "../src/models.js";

const portal = {
  id: 1, clientName: "Клиент", portalToken: "test-token", apiKey: "sk-test-secret-123456",
  tokenLimit: 10_000_000, usedTokens: 2_500_000, cachedUsedTokens: 2_500_000,
  status: "active", allowedModels: ["provider/model"], publicUrl: "https://gateway.example",
};

function checkInlineScripts(html) {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => new Script(match[1]));
  }
}

test("rendered browser scripts compile, including hostile user strings", () => {
  const hostile = { ...portal, clientName: "О'Брайен \"<script>alert(1)</script>", portalToken: "</script><script>alert(2)</script>", apiKey: "sk-'</script><script>alert(3)</script>", allowedModels: ["model/</script>"] };
  checkInlineScripts(renderAdminDashboardHtml({ portals: [hostile], availableModels: [{ id: hostile.allowedModels[0] }], publicUrl: portal.publicUrl }));
  checkInlineScripts(renderPortalHtml(hostile));
});

test("client names, model IDs, credentials and login errors are escaped as text", () => {
  const attack = '<img src=x onerror="alert(1)">';
  const html = renderPortalHtml({ ...portal, clientName: attack, apiKey: attack, allowedModels: [attack] });
  assert.ok(!html.includes(attack));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!renderAdminLoginHtml(attack).includes(attack));
  const admin = renderAdminDashboardHtml({ portals: [{ ...portal, clientName: attack }], availableModels: [{ id: attack }], publicUrl: portal.publicUrl });
  assert.ok(!admin.includes(attack));
});

test("depleted portals contain no key, portal token, endpoint or executable script", () => {
  for (const input of [{ isDepleted: true }, { usedTokens: portal.tokenLimit }, { usedTokens: portal.tokenLimit + 1 }]) {
    const html = renderPortalHtml({ ...portal, ...input });
    for (const secret of [portal.apiKey, portal.portalToken, portal.publicUrl]) assert.ok(!html.includes(secret));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("КВОТА ИСЧЕРПАНА"));
  }
});

test("unlimited quotas never show an empty package or a depleted state", () => {
  const html = renderPortalHtml({ ...portal, tokenLimit: 0, usedTokens: 999_999_999 });
  assert.ok(html.includes("Без ограничения квоты"));
  assert.ok(html.includes("Без ограничений"));
  assert.ok(html.includes("∞"));
  assert.ok(html.includes(portal.apiKey));
  assert.ok(!html.includes("КВОТА ИСЧЕРПАНА"));
});

test("rounding to 100 percent does not deactivate a key below its exact limit", () => {
  const input = { ...portal, usedTokens: 9_999_999, cachedUsedTokens: 9_999_999 };
  assert.ok(renderPortalHtml(input).includes(portal.apiKey));
  assert.ok(renderAdminDashboardHtml({ portals: [input], publicUrl: portal.publicUrl }).includes('data-status="active"'));
});

test("unavailable catalogs never ask the client to enter a model or copy a placeholder", () => {
  for (const allowedModels of [null, [], undefined]) {
    const html = renderPortalHtml({ ...portal, allowedModels });
    assert.ok(html.includes("Все модели шлюза"));
    assert.ok(html.includes("Список моделей для этого ключа временно недоступен"));
    assert.ok(!html.includes("MODEL_ID"));
    assert.ok(!html.includes("guideModel"));
    assert.ok(!html.includes("Модель для настройки"));
    checkInlineScripts(html);
  }
});

test("missing portals and empty dashboards render useful states without external scripts", () => {
  const missing = renderMissingPortalHtml();
  assert.ok(missing.includes("404 / ДОСТУП НЕ НАЙДЕН"));
  const empty = renderAdminDashboardHtml({ publicUrl: portal.publicUrl });
  assert.ok(empty.includes("Создать первый ключ"));
  for (const html of [missing, empty, renderAdminLoginHtml(), renderPortalHtml(portal)]) {
    assert.ok(!html.includes("cdn.tailwindcss.com"));
    assert.ok(!html.includes('<script src="'));
  }
});

test("all personal page states opt out of indexing and the active page has no sidebar", () => {
  const active = renderPortalHtml(portal);
  assert.ok(!active.includes('class="sidebar"'));
  assert.ok(!active.includes("/admin"));
  assert.ok(active.includes('id="btn-opencode"'));
  assert.ok(active.includes('id="btn-codex"'));
  for (const html of [active, renderPortalHtml({ ...portal, isDepleted: true }), renderMissingPortalHtml()]) {
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow, noarchive">'));
  }
});

test("all pages include the brand-mark svg favicon in head", () => {
  assert.ok(faviconSvg.includes('fill="#c1e998"'));
  assert.ok(faviconSvg.includes('stroke="#212622"'));
  const linkTag = `<link rel="icon" type="image/svg+xml" href="${faviconDataUri}">`;
  for (const html of [renderMissingPortalHtml(), renderAdminDashboardHtml({ publicUrl: portal.publicUrl }), renderAdminLoginHtml(), renderPortalHtml(portal)]) {
    assert.ok(html.includes(linkTag));
  }
});

test("OpenCode config and setup instructions use the exact client URI, key and model", () => {
  const input = { publicUrl: "https://gateway.example///", apiKey: "sk-O'Brien-\"<test>", model: "ag/gemini-flash" };
  const guides = buildConnectionGuides(input);
  const config = JSON.parse(guides.opencode);
  assert.equal(config.provider.route.options.baseURL, "https://gateway.example/v1");
  assert.equal(config.provider.route.options.apiKey, input.apiKey);
  assert.ok(Object.hasOwn(config.provider.route.models, input.model));
  assert.equal(config.model, "route/" + input.model);
  for (const value of ["GeminiFlash", input.apiKey, input.model, "https://gateway.example/v1"]) assert.ok(guides.opencodePrompt.includes(value));
});

test("instructions are generated for the model assigned to the key", () => {
  const input = { publicUrl: portal.publicUrl, apiKey: portal.apiKey };
  for (const model of ["ag/gemini-flash", "openai/test-model"]) {
    const guides = buildConnectionGuides({ ...input, model });
    for (const id of ["opencode", "opencodePrompt", "codex", "python", "nodejs", "curl"]) assert.ok(guides[id].includes(model), id);
    assert.equal(guides.providerName, model.includes("gemini") ? "GeminiFlash" : "Route AI");
  }
});

test("the key's explicit model restrictions are used without consulting another catalog", async () => {
  const models = await resolvePortalModels(["ag/gemini-flash", "ag/gemini-flash", "provider/model"], () => { throw new Error("Catalog should not be requested"); });
  assert.deepEqual(models, ["ag/gemini-flash", "provider/model"]);
});

test("unrestricted and wildcard keys resolve only their available catalog", async () => {
  const catalog = async () => [{ id: "ag/gemini-flash" }, { id: "provider/model" }];
  assert.deepEqual(await resolvePortalModels(null, catalog), ["ag/gemini-flash", "provider/model"]);
  assert.deepEqual(await resolvePortalModels([], catalog), ["ag/gemini-flash", "provider/model"]);
  assert.deepEqual(await resolvePortalModels(["ag/*"], catalog), ["ag/gemini-flash"]);
  assert.deepEqual(await resolvePortalModels(null, async () => [{ id: "other-key/model" }]), ["other-key/model"]);
});

test("automatic instructions include all issued models and have no model input", () => {
  const models = ["ag/gemini-flash", "provider/model"];
  const guides = buildConnectionGuides({ publicUrl: portal.publicUrl, apiKey: portal.apiKey, model: models[0], models });
  assert.deepEqual(Object.keys(JSON.parse(guides.opencode).provider.route.models), models);
  const html = renderPortalHtml({ ...portal, allowedModels: null, availableModels: models });
  assert.ok(html.includes('id="btn-opencode"'));
  assert.ok(html.includes('id="btn-codex"'));
  assert.ok(html.includes("GeminiFlash"));
  assert.ok(!html.includes("MODEL_ID"));
  assert.ok(!html.includes("guideModel"));
  assert.ok(!html.includes("Модель для настройки"));
});

test("Codex keeps the key in a session variable and quotes it for each shell", () => {
  const key = "sk-test-O'Brien-$value";
  const guides = buildConnectionGuides({ publicUrl: portal.publicUrl, apiKey: key, model: "provider/model" });
  assert.ok(!guides.codex.includes(key));
  assert.ok(guides.codex.includes('[profiles.route]'));
  assert.ok(guides.codex.includes('wire_api = "responses"'));
  assert.ok(guides.codexPowerShell.includes("'sk-test-O''Brien-$value'"));
  assert.ok(guides.codexBash.includes("'sk-test-O'\\''Brien-$value'"));
  assert.ok(guides.codexPowerShell.endsWith("codex --profile route"));
  assert.ok(guides.codexBash.endsWith("codex --profile route"));
});

test("admin forms, navigation and API calls use only the configured path", () => {
  const adminPath = "/console-test-4a7ce192";
  const login = renderAdminLoginHtml(null, { adminPath });
  const dashboard = renderAdminDashboardHtml({ publicUrl: portal.publicUrl, adminPath });
  assert.ok(login.includes(`action="${adminPath}/login"`));
  assert.ok(dashboard.includes(`href="${adminPath}/logout"`));
  assert.ok(dashboard.includes(JSON.stringify(adminPath + "/api")));
  for (const html of [login, dashboard]) {
    assert.ok(!html.includes('"/admin'));
    assert.ok(!html.includes("/api/admin"));
  }
  checkInlineScripts(dashboard);
});

test("personal pages use only the client name as their heading and no promotional subtitle", () => {
  const html = renderPortalHtml(portal);
  assert.ok(html.includes(`<h1>${portal.clientName}</h1>`));
  assert.ok(!html.includes("Всё для первого запроса"));
  assert.ok(!html.includes("квота, ключ и настройка ваших инструментов"));
  assert.ok(!html.includes("Личная ссылка действует"));
});

test("random client name generator produces purely Russian or purely English names", () => {
  const generated = new Set();
  let hasCyrillic = false;
  let hasLatin = false;

  for (let i = 0; i < 100; i++) {
    const name = generateRandomClientName();
    assert.equal(typeof name, "string");
    assert.ok(name.length >= 4);
    generated.add(name);

    const isCyrillic = /^[а-яёА-ЯЁ\s-]+$/.test(name);
    const isLatin = /^[a-zA-Z\s-]+$/.test(name);
    assert.ok(isCyrillic || isLatin, `Name "${name}" must be strictly in one language (RU or EN)`);

    if (isCyrillic) hasCyrillic = true;
    if (isLatin) hasLatin = true;
  }

  assert.ok(hasCyrillic, "Generator should produce Russian names");
  assert.ok(hasLatin, "Generator should produce English names");
  assert.ok(generated.size > 20, "Generator should have good variety");
});

test("model normalization strips ag/ for user facing displays and restores it for upstream", () => {
  assert.equal(toUserFacingModel("ag/gemini-3.8-flash"), "gemini-3.8-flash");
  assert.equal(toUserFacingModel("ag/gemini-2.0-flash"), "gemini-2.0-flash");
  assert.equal(toUserFacingModel("openai/gpt-4o"), "openai/gpt-4o");

  assert.equal(toUpstreamModel("gemini-3.8-flash"), "ag/gemini-3.8-flash");
  assert.equal(toUpstreamModel("ag/gemini-3.8-flash"), "ag/gemini-3.8-flash");
  assert.equal(toUpstreamModel("openai/gpt-4o"), "openai/gpt-4o");

  // Portal cleans ag/ from displayed chips and guide configs
  const html = renderPortalHtml({ ...portal, allowedModels: ["ag/gemini-3.8-flash"] });
  assert.ok(html.includes("<code>gemini-3.8-flash</code>"));
  assert.ok(!html.includes("<code>ag/gemini-3.8-flash</code>"));

  // Admin dashboard includes random name button and dice icon
  const dashboard = renderAdminDashboardHtml({ publicUrl: portal.publicUrl, availableModels: [{ id: "ag/gemini-3.8-flash" }] });
  assert.ok(dashboard.includes('id="generateNameBtn"'));
  assert.ok(dashboard.includes("Случайное"));
  checkInlineScripts(dashboard);
});

test("admin dashboard includes FunPay auto-delivery export, bonus dialog and clean telegram message", () => {
  const dashboard = renderAdminDashboardHtml({ portals: [portal], publicUrl: portal.publicUrl });
  // Telegram copy does not append client name to Здравствуйте
  assert.ok(dashboard.includes("'Здравствуйте!'"));
  assert.ok(!dashboard.includes("'Здравствуйте, ' + client.clientName"));

  // FunPay dialog
  assert.ok(dashboard.includes('id="funpayDialog"'));
  assert.ok(dashboard.includes('id="funpayTextarea"'));
  assert.ok(dashboard.includes("Автовыдача FunPay"));

  // Bonus tokens dialog and table action button
  assert.ok(dashboard.includes('data-action="bonus"'));
  assert.ok(dashboard.includes('id="bonusDialog"'));
  assert.ok(dashboard.includes('id="bonusAmountInput"'));
  assert.ok(dashboard.includes('id="bonusPercentInput"'));
  assert.ok(dashboard.includes('id="bonusPreview"'));

  checkInlineScripts(dashboard);
});
