import { brand, escapeHtml as esc, formatNum, head, icon, scriptJson, sharedScript, toast } from "./ui.js";
import { buildConnectionGuides } from "./connectionGuides.js";
import { toUserFacingModel } from "../models.js";

function statePage({ title, clientName, message, note, label }) {
  return `${head(`${title}${clientName ? ` — ${clientName}` : ""}`, { privatePage: true })}<body class="state-page"><main class="state-card">${brand()}<div class="state-icon">${icon("key")}</div><div class="eyebrow muted" style="margin-bottom:12px">${label}</div><h1>${title}</h1><p>${message}</p><div class="notice">${note}</div><footer class="state-footer">Route AI Gateway &nbsp; / &nbsp; Персональный доступ</footer></main></body></html>`;
}

export function renderMissingPortalHtml() {
  return statePage({ title: "Такой ссылки нет.", label: "404 / ДОСТУП НЕ НАЙДЕН", message: "Персональная страница не существует или доступ к ней был отозван.", note: "Проверьте ссылку из сообщения или обратитесь к администратору за новой." });
}

export function renderPortalHtml({ clientName, portalToken, apiKey, tokenLimit, usedTokens, allowedModels, availableModels, publicUrl, isDepleted = false }) {
  const unlimited = tokenLimit === 0;
  if (isDepleted || (!unlimited && usedTokens >= tokenLimit)) {
    return statePage({ title: "Пакет использован.", clientName, label: "КВОТА ИСЧЕРПАНА", message: `Все ${formatNum(tokenLimit)} токенов для <strong>${esc(clientName)}</strong> использованы. Доступ к ключу и запросам приостановлен.`, note: "Чтобы продолжить работу, обратитесь к администратору и приобретите новый пакет токенов." });
  }

  const percentUsed = unlimited ? 0 : Math.min(100, Math.max(0, Math.round(usedTokens / tokenLimit * 100)));
  const remainingTokens = Math.max(0, tokenLimit - usedTokens);
  const rawModels = (availableModels ?? allowedModels ?? []).filter((id) => typeof id === "string" && id.trim() && !id.includes("*"));
  const models = [...new Set(rawModels.map(toUserFacingModel))];
  const sampleModel = models[0];
  const rootUrl = String(publicUrl || "").replace(/\/+$/, "");
  const guides = sampleModel ? buildConnectionGuides({ publicUrl: rootUrl, apiKey, model: sampleModel, models }) : null;
  const codeBlock = (id, title, text) => `<div class="code-block"><div class="code-header"><span>${title}</span><button class="icon-button" data-copy="code-${id}" aria-label="Скопировать ${title}">${icon("copy")}</button></div><pre><code id="code-${id}">${esc(text)}</code></pre></div>`;
  const codePanel = (id, title, description) => `<div class="guide-content" role="tabpanel" id="tab-${id}" aria-labelledby="btn-${id}" tabindex="0" hidden><p>${description}</p>${codeBlock(id, title, guides[id])}</div>`;

  return `${head(`Персональный доступ — ${clientName}`, { privatePage: true })}<body class="portal-page">
    <main class="portal-main" id="overview">
      <header class="portal-masthead">${brand()}<span>${icon("lock")}Персональный доступ</span></header>
      <section class="page-heading"><h1>${esc(clientName)}</h1><button class="btn" id="refreshBtn">${icon("refresh", "refresh-icon")}Обновить квоту</button></section>
      <div class="access-summary">
        <section class="panel quota-panel metric-accent" aria-labelledby="quotaTitle"><div class="quota-top"><h2 class="eyebrow" id="quotaTitle">${unlimited ? "ИСПОЛЬЗОВАНО ТОКЕНОВ" : "ОСТАТОК ТОКЕНОВ"}</h2><span class="badge ${percentUsed >= 90 ? "is-warning" : ""}" id="quotaStatus"><span class="dot"></span><span id="quotaStatusText">${percentUsed >= 90 ? "Мало токенов" : "Доступ активен"}</span></span></div>
          <div class="quota-content"><div><div class="quota-number" id="remainingDisplay" aria-live="polite">${formatNum(unlimited ? usedTokens : remainingTokens)}</div><p class="quota-caption" id="quotaCaption">${unlimited ? "Без ограничения квоты" : `из ${formatNum(tokenLimit)} в вашем пакете`}</p></div><div class="quota-ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="ring-track" cx="50" cy="50" r="42"/><circle id="quotaRing" class="ring-value" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${unlimited ? 100 : 100 - percentUsed} 100"/></svg><div class="ring-label"><span id="percentDisplay">${unlimited ? "∞" : `${100 - percentUsed}%`}</span><small>${unlimited ? "без лимита" : "доступно"}</small></div></div></div>
          <div class="quota-divider"></div><div class="quota-details"><div>Использовано<strong id="usedDisplay">${formatNum(usedTokens)}</strong></div><div>Лимит пакета<strong id="limitDisplay">${unlimited ? "Без ограничений" : formatNum(tokenLimit)}</strong></div></div>
          <div class="sync-label" id="syncStatus" role="status"><span class="dot"></span>Автообновление каждые 15 секунд</div>
        </section>
        <section class="panel credentials-panel" id="connection" aria-labelledby="credentialsTitle"><div class="panel-header"><h2 id="credentialsTitle">Данные доступа</h2>${icon("key")}</div><div class="credentials-body">
          <label class="credential-label" for="endpointInput">URI / Base URL</label><div class="credential-row"><input class="credential-input" type="text" readonly id="endpointInput" value="${esc(rootUrl)}/v1" spellcheck="false"><button class="icon-button" data-copy="endpointInput" title="Скопировать адрес" aria-label="Скопировать Base URL">${icon("copy")}</button></div>
          <label class="credential-label" for="apiKeyInput">API Key</label><div class="credential-row"><input class="credential-input" type="password" readonly id="apiKeyInput" value="${esc(apiKey)}" autocomplete="off" spellcheck="false"><button class="icon-button" id="toggleKey" title="Показать ключ" aria-label="Показать API-ключ" aria-pressed="false">${icon("eye")}</button><button class="icon-button" data-copy="apiKeyInput" title="Скопировать ключ" aria-label="Скопировать API-ключ">${icon("copy")}</button></div>
          <p class="credential-hint">${icon("lock")}Ссылка на эту страницу даёт доступ к вашему ключу. Сохраните её у себя.</p>
        </div></section>
      </div>
      <section class="portal-models" aria-labelledby="modelsTitle"><h2 id="modelsTitle">${models.length ? `Доступные модели <span class="count">${models.length}</span>` : "Все модели шлюза"}</h2><div class="model-chips">${models.length ? models.map((model) => `<code>${esc(model)}</code>`).join("") : '<span class="muted">Ограничений по моделям нет.</span>'}</div></section>
      <section class="panel guide-panel" id="guide" aria-labelledby="guideTitle">${guides ? `
        <div class="panel-header"><h2 id="guideTitle">Подключение</h2>${icon("terminal")}</div>
        <div class="tabs" role="tablist" aria-label="Способ подключения">${[["opencode", "OpenCode"], ["codex", "Codex"], ["cursor", "Cursor / VS Code"], ["claude", "Claude Code"], ["python", "Python"], ["nodejs", "Node.js"], ["curl", "cURL"]].map(([id, label], index) => `<button class="tab" id="btn-${id}" role="tab" data-tab="${id}" aria-controls="tab-${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${label}</button>`).join("")}</div>

        <div class="guide-content" role="tabpanel" id="tab-opencode" aria-labelledby="btn-opencode" tabindex="0">
          <h3 class="setup-title">Провайдер <span data-provider-name>${esc(guides.providerName)}</span></h3>
          <dl class="setup-parameters"><div><dt>Провайдер</dt><dd><span data-provider-name>${esc(guides.providerName)}</span><span class="muted"> · ID: route</span></dd></div><div><dt>URI</dt><dd><code>${esc(rootUrl)}/v1</code></dd></div><div><dt>API-ключ</dt><dd><span>Ваш персональный ключ</span><button class="icon-button" data-copy="apiKeyInput" aria-label="Скопировать ключ для OpenCode" title="Скопировать ключ">${icon("copy")}</button></dd></div><div><dt>Модель</dt><dd><code data-model-name>${esc(sampleModel)}</code></dd></div></dl>
          <textarea id="opencodePrompt" hidden>${esc(guides.opencodePrompt)}</textarea><button class="btn btn-primary" data-copy="opencodePrompt">${icon("copy")}Скопировать инструкцию</button>
          <div class="setup-footer"><details class="manual-setup"><summary>Настроить вручную через opencode.json</summary><p>Добавьте провайдера <code>route</code> в пользовательский <code>opencode.json</code>. Если файл уже существует, объедините настройки с текущими.</p>${codeBlock("opencode", "opencode.json", guides.opencode)}<p class="setup-caption">Конфиг содержит ваш ключ. Храните его локально. После сохранения откройте <code>/models</code> в OpenCode и выберите модель провайдера.</p></details>
          <a class="guide-source" href="https://docs.opencode.ai/docs/providers/#custom-provider" target="_blank" rel="noopener noreferrer">Документация ${icon("external")}</a></div>
        </div>

        <div class="guide-content" role="tabpanel" id="tab-codex" aria-labelledby="btn-codex" tabindex="0" hidden><h3 class="setup-title">Подключение в Codex CLI</h3><p>Добавьте провайдера и профиль в <code>~/.codex/config.toml</code> (Windows: <code>%USERPROFILE%\\.codex\\config.toml</code>). Если раздел <code>route</code> уже есть, обновите его.</p>
          <div class="notice">Codex использует Responses API. Выбранная модель и шлюз должны поддерживать <code>/v1/responses</code> и вызов инструментов.</div>
          ${codeBlock("codex", "config.toml", guides.codex)}
          <p style="margin-top:20px">Затем задайте ключ в текущем терминале и запустите профиль:</p><div class="shell-tabs" role="group" aria-label="Операционная система"><button class="preset" data-shell="powershell" aria-pressed="true">Windows · PowerShell</button><button class="preset" data-shell="bash" aria-pressed="false">macOS / Linux</button></div>
          ${codeBlock("codexRun", "Запуск Codex", guides.codexPowerShell)}<a class="guide-source" href="https://learn.chatgpt.com/docs/config-file/config-advanced" target="_blank" rel="noopener noreferrer">Официальная документация Codex ${icon("external")}</a>
        </div>
        <div class="guide-content" role="tabpanel" id="tab-cursor" aria-labelledby="btn-cursor" tabindex="0" hidden><ol><li><div>Откройте настройки моделей в <strong>Cursor</strong> или OpenAI-совместимом расширении <strong>VS Code</strong>.</div></li><li><div>Укажите <strong>Base URL</strong> и <strong>API Key</strong> из блока «Данные для подключения».</div></li><li><div>Добавьте модель <code data-model-name>${esc(sampleModel)}</code> и выберите её для работы.</div></li></ol></div>
        ${codePanel("claude", "terminal.sh", "Задайте переменные окружения в терминале и запустите Claude Code.")}
        ${codePanel("python", "example.py", "Установите пакет командой pip install openai, затем запустите пример.")}
        ${codePanel("nodejs", "example.mjs", "Установите пакет командой npm install openai, затем запустите пример.")}
        ${codePanel("curl", "terminal.sh", "Отправьте тестовый запрос из терминала. Он использует токены вашего пакета.")}
      ` : '<div class="panel-header"><h2 id="guideTitle">Подключите свой инструмент</h2></div><div class="guide-content"><p class="notice">Список моделей для этого ключа временно недоступен. Обновите страницу чуть позже — настройки подставятся автоматически.</p></div>'}
      </section>
      <footer class="page-footer"><span class="footer-brand">route.</span></footer>
    </main>${toast()}
    <script>${sharedScript}
      const shellCommands = ${scriptJson(guides ? { powershell: guides.codexPowerShell, bash: guides.codexBash } : {})};
      const statusUrl = ${scriptJson(`/api/portal/${encodeURIComponent(portalToken)}/status`)};
      let refreshing = false;
      document.querySelectorAll('[data-shell]').forEach((button) => button.addEventListener('click', () => {
        document.querySelectorAll('[data-shell]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        document.getElementById('code-codexRun').textContent = shellCommands[button.dataset.shell];
      }));
      document.getElementById('toggleKey').addEventListener('click', (event) => {
        const input = document.getElementById('apiKeyInput');
        const visible = input.type === 'password';
        input.type = visible ? 'text' : 'password';
        event.currentTarget.setAttribute('aria-pressed', String(visible));
        event.currentTarget.setAttribute('aria-label', visible ? 'Скрыть API-ключ' : 'Показать API-ключ');
        event.currentTarget.title = visible ? 'Скрыть ключ' : 'Показать ключ';
      });
      const tabs = Array.from(document.querySelectorAll('[data-tab]'));
      function switchTab(button) {
        tabs.forEach((tab) => {
          const selected = tab === button;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
          document.getElementById('tab-' + tab.dataset.tab).hidden = !selected;
        });
      }
      tabs.forEach((button, index) => {
        button.addEventListener('click', () => switchTab(button));
        button.addEventListener('keydown', (event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;
          if (next !== undefined) { event.preventDefault(); switchTab(tabs[next]); tabs[next].focus(); }
        });
      });
      function deactivatePortal() {
        // Remove credentials and all generated snippets before reloading, even offline.
        const page = document.createElement('main');
        page.className = 'state-card';
        const title = document.createElement('h1');
        title.textContent = 'Доступ завершён.';
        const message = document.createElement('p');
        message.textContent = 'Ключ и инструкции больше недоступны. Обратитесь к администратору за новым пакетом.';
        page.append(title, message);
        document.body.className = 'state-page';
        document.body.replaceChildren(page);
        window.location.reload();
      }
      async function refreshStatus(manual = false) {
        if (refreshing || (!manual && document.hidden)) return;
        refreshing = true;
        const button = document.getElementById('refreshBtn');
        const glyph = button.querySelector('.refresh-icon');
        const sync = document.getElementById('syncStatus');
        button.disabled = true;
        glyph.classList.add('spin');
        try {
          const response = await fetch(statusUrl, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
          if (response.status === 404 || response.status === 410) { deactivatePortal(); return; }
          if (!response.ok) throw new Error('Не удалось обновить квоту.');
          const data = await response.json();
          if (data.isDepleted) { deactivatePortal(); return; }
          const unlimited = data.tokenLimit === 0;
          const percent = Math.min(100, Math.max(0, Number(data.percentUsed) || 0));
          document.getElementById('remainingDisplay').textContent = unlimited ? data.usedFormatted : data.remainingFormatted;
          document.getElementById('usedDisplay').textContent = data.usedFormatted;
          document.getElementById('limitDisplay').textContent = unlimited ? 'Без ограничений' : data.limitFormatted;
          document.getElementById('quotaTitle').textContent = unlimited ? 'ИСПОЛЬЗОВАНО ТОКЕНОВ' : 'ОСТАТОК ТОКЕНОВ';
          document.getElementById('quotaCaption').textContent = unlimited ? 'Без ограничения квоты' : 'из ' + data.limitFormatted + ' в вашем пакете';
          document.getElementById('percentDisplay').textContent = unlimited ? '∞' : (100 - percent) + '%';
          document.querySelector('.ring-label small').textContent = unlimited ? 'без лимита' : 'доступно';
          document.getElementById('quotaRing').setAttribute('stroke-dasharray', (unlimited ? 100 : 100 - percent) + ' 100');
          document.getElementById('quotaStatus').classList.toggle('is-warning', !unlimited && percent >= 90);
          document.getElementById('quotaStatusText').textContent = !unlimited && percent >= 90 ? 'Мало токенов' : 'Доступ активен';
          sync.textContent = 'Обновлено в ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · каждые 15 секунд';
          if (manual) notify('Квота обновлена');
        } catch {
          sync.textContent = 'Нет связи. Показаны последние данные.';
          if (manual) notify('Не удалось обновить квоту. Попробуйте ещё раз.', true);
        } finally { refreshing = false; button.disabled = false; glyph.classList.remove('spin'); }
      }
      document.getElementById('refreshBtn').addEventListener('click', () => refreshStatus(true));
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshStatus(); });
      window.addEventListener('pageshow', (event) => { if (event.persisted) refreshStatus(); });
      setInterval(() => refreshStatus(), 15000);
    </script></body></html>`;
}
