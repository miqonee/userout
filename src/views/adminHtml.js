import { brand, escapeHtml as esc, formatNum, head, icon, scriptJson, sharedScript, sidebar, toast } from "./ui.js";
import { toUserFacingModel } from "../models.js";

function dialogHeading(title, description) {
  return `<div class="dialog-heading"><div><h2>${title}</h2><p>${description}</p></div><button type="button" class="icon-button" data-close aria-label="Закрыть окно">${icon("close")}</button></div>`;
}

function metricNumber(value) {
  return formatNum(value).replace(/ (млн|тыс\.)$/, ' <span class="metric-unit">$1</span>');
}

export function renderAdminLoginHtml(error = null, { adminPath = "/manage-console" } = {}) {
  return `${head("Вход в панель управления", { privatePage: true })}<body class="login-page">
    <section class="login-brand-panel" aria-label="Route — AI Gateway">
      ${brand()}
      <div class="login-editorial"><h1>Управление<br><span>доступом.</span></h1><p>Клиенты, ключи и квоты.</p>
        <div class="route-diagram" aria-hidden="true"><span class="diagram-node">${icon("terminal")}</span><span class="diagram-line"></span><span class="diagram-node hub">${icon("key")}</span><span class="diagram-line"></span><span class="diagram-node">${icon("layers")}</span></div>
      </div><div class="login-footer"><span>Route Proxy Gateway</span><span>Панель управления</span></div>
    </section>
    <main class="login-panel"><div class="login-form-wrap"><h2>Вход</h2>
      ${error ? `<div class="notice notice-error" role="alert">${esc(error)}</div>` : ""}
      <form method="POST" action="${esc(adminPath)}/login"><label class="field-label" for="password">Пароль</label><input class="input" type="password" id="password" name="password" autocomplete="current-password" placeholder="Введите пароль" required maxlength="1024" autofocus><button class="btn btn-dark" type="submit">Войти ${icon("arrow")}</button></form>
      <div class="login-note">${icon("lock")}Доступ только для администратора</div>
    </div></main></body></html>`;
}

export function renderAdminDashboardHtml({ portals = [], availableModels = [], publicUrl, adminPath = "/manage-console", stats = { totalLimit: 0, totalUsed: 0, activeCount: 0, totalCount: 0 } }) {
  const totalRemaining = portals.filter((p) => p.tokenLimit > 0).reduce((sum, p) => sum + Math.max(0, p.tokenLimit - p.cachedUsedTokens), 0);
  const unlimitedCount = portals.filter((p) => p.tokenLimit === 0).length;
  const usedPercent = stats.totalLimit > 0 ? Math.min(100, Math.round(stats.totalUsed / stats.totalLimit * 100)) : 0;
  const rootUrl = String(publicUrl || "").replace(/\/+$/, "");
  const rows = portals.map((p) => {
    const unlimited = p.tokenLimit === 0;
    const percent = unlimited ? 0 : Math.min(100, Math.max(0, Math.round(p.cachedUsedTokens / p.tokenLimit * 100)));
    const depleted = p.status === "depleted" || (!unlimited && p.cachedUsedTokens >= p.tokenLimit);
    const status = depleted ? "depleted" : "active";
    const initials = p.clientName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "К";
    const portalUrl = `${rootUrl}/p/${encodeURIComponent(p.portalToken)}`;
    return `<tr class="client-row" data-status="${status}" data-name="${esc(p.clientName.toLocaleLowerCase("ru"))}" data-id="${esc(p.id)}">
      <td><div class="client-identity"><span class="client-avatar" aria-hidden="true">${esc(initials)}</span><div><div class="client-name" title="${esc(p.clientName)}">${esc(p.clientName)}</div><div class="client-key">${esc(p.apiKey.slice(0, 12))}••••</div></div></div></td>
      <td><span class="usage-value">${formatNum(p.cachedUsedTokens)} <span>/ ${unlimited ? "∞" : formatNum(p.tokenLimit)}</span></span><div class="mini-meter ${depleted ? "is-depleted" : percent >= 80 ? "is-warning" : ""}" role="meter" aria-label="Квота ${esc(p.clientName)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${unlimited ? "Без лимита" : `${percent}% использовано`}"><span style="width:${percent}%"></span></div></td>
      <td><span class="badge ${depleted ? "is-depleted" : ""}"><span class="dot"></span>${depleted ? "Исчерпан" : "Активен"}</span></td>
      <td><a class="table-link" href="${esc(portalUrl)}" target="_blank" rel="noopener noreferrer">Личный кабинет ${icon("external")}</a></td>
      <td><div class="table-actions"><button class="icon-button" data-action="link" title="Скопировать ссылку" aria-label="Скопировать ссылку: ${esc(p.clientName)}">${icon("copy")}</button><button class="icon-button" data-action="telegram" title="Скопировать сообщение для Telegram" aria-label="Сообщение для Telegram: ${esc(p.clientName)}">${icon("send")}</button><button class="icon-button danger" data-action="delete" title="Удалить ключ" aria-label="Удалить ключ: ${esc(p.clientName)}">${icon("trash")}</button></div></td>
    </tr>`;
  }).join("");
  const clientData = portals.map(({ id, clientName, portalToken, tokenLimit }) => ({ id, clientName, portalUrl: `${rootUrl}/p/${encodeURIComponent(portalToken)}`, tokenLimit }));

  return `${head("Обзор рабочего пространства", { privatePage: true })}<body><div class="app-shell">
    ${sidebar({ adminPath })}
    <main class="main" id="overview">
      <header class="topbar"><div class="breadcrumb">Рабочее пространство <span>/</span> <strong>Обзор</strong></div><div class="topbar-meta"><span class="tag">AI GATEWAY</span><span class="user-avatar" style="color:#65715f;border-color:#dce3d5;width:29px;height:29px">A</span><a class="icon-button" href="${esc(adminPath)}/logout" aria-label="Выйти" title="Выйти">${icon("logout")}</a></div></header>
      <section class="page-heading"><div><h1>Обзор пространства</h1><p class="subtitle">Клиенты, ключи и использование токенов.</p></div><div class="heading-actions"><button class="btn" id="refreshDashboard">${icon("refresh")}Обновить</button><button class="btn btn-primary" data-open="newKeyDialog">${icon("plus")}Новый ключ</button></div></section>
      <section class="metrics" aria-label="Сводка по клиентам">
        <article class="metric"><div class="metric-label">Всего клиентов ${icon("grid")}</div><div class="metric-number">${formatNum(stats.totalCount)}</div><div class="metric-foot">В вашем пространстве</div></article>
        <article class="metric"><div class="metric-label">Активные ключи ${icon("key")}</div><div class="metric-number">${formatNum(stats.activeCount)}</div><div class="metric-foot"><span class="dot" style="color:#739b64"></span>Готовы к работе</div></article>
        <article class="metric"><div class="metric-label">Использовано токенов ${icon("layers")}</div><div class="metric-number">${metricNumber(stats.totalUsed)}</div><div class="metric-foot">${unlimitedCount ? `Есть ключи без лимита: ${unlimitedCount}` : `${usedPercent}% от общей квоты`}</div></article>
        <article class="metric metric-accent"><div class="metric-label">Остаток общей квоты ${icon("plug")}</div><div class="metric-number">${metricNumber(totalRemaining)}</div><div class="metric-foot">${unlimitedCount ? "Для ключей с лимитом" : `Из ${formatNum(stats.totalLimit)} выделенных`}</div></article>
      </section>
      <section class="panel" id="clients" aria-labelledby="clientsTitle">
        <div class="panel-header"><div><h2 id="clientsTitle">Клиенты и ключи <span class="count">${portals.length}</span></h2><p class="panel-description">Доступ, персональные ссылки и расход токенов.</p></div><button class="icon-button" data-open="newKeyDialog" aria-label="Добавить клиента" title="Добавить клиента">${icon("plus")}</button></div>
        <div class="client-toolbar"><div class="search-field">${icon("search")}<input id="clientSearch" type="search" placeholder="Найти клиента…" aria-label="Поиск по имени клиента" autocomplete="off"></div><div class="filter-tabs" role="group" aria-label="Фильтр по статусу"><button class="filter-tab" data-filter="all" aria-pressed="true">Все клиенты</button><button class="filter-tab" data-filter="active" aria-pressed="false">Активные</button><button class="filter-tab" data-filter="depleted" aria-pressed="false">Исчерпанные</button></div></div>
        <div class="table-scroll"><table><thead><tr><th scope="col">Клиент</th><th scope="col">Расход / квота</th><th scope="col">Статус</th><th scope="col">Персональный доступ</th><th scope="col" style="text-align:right">Действия</th></tr></thead><tbody id="portalsTableBody">${rows}<tr id="emptyRow" ${portals.length ? "hidden" : ""}><td colspan="5"><div class="empty-state"><div class="empty-icon">${icon("key")}</div><h3 id="emptyTitle">Клиентов пока нет</h3><p id="emptyDescription">Создайте ключ для клиента.</p><button class="btn btn-primary" data-open="newKeyDialog" id="emptyCreate">${icon("plus")}Создать первый ключ</button></div></td></tr></tbody></table></div>
        <div class="table-footer"><span id="resultCount" aria-live="polite">Показано ${portals.length} из ${portals.length}</span><span>Актуальный расход — при обновлении страницы</span></div>
      </section>
      <section class="support-strip"><div>${icon("plug")}<div><h3>Параметры шлюза</h3><p>Адрес шлюза для клиентских приложений и SDK.</p></div></div><button class="btn" data-open="connectionDialog">Параметры подключения ${icon("arrow")}</button></section>
      <footer class="page-footer"><span class="footer-brand">route.</span></footer>
    </main></div>

    <dialog id="newKeyDialog" aria-labelledby="createTitle">
      ${dialogHeading('<span id="createTitle">Новый доступ</span>', "Ключ и личный кабинет клиента за один шаг.")}
      <form id="createKeyForm"><div class="dialog-body">
        <div class="field"><label for="clientName">Клиент или название проекта</label><div class="input-with-action"><input class="input" type="text" id="clientName" maxlength="120" placeholder="Например, Александр или оставьте пустым" autocomplete="off" autofocus><button type="button" class="btn btn-random-name" id="generateNameBtn" title="Сгенерировать случайное имя" aria-label="Сгенерировать случайное имя">${icon("dice")}<span>Случайное</span></button></div></div>
        <div class="form-row"><div class="field"><label for="tokenLimit">Квота токенов</label><input class="input mono" type="number" id="tokenLimit" value="10000000" min="1000" step="1000" required><div class="preset-row"><button type="button" class="preset" data-limit="10000000" aria-pressed="true">10 млн</button><button type="button" class="preset" data-limit="50000000" aria-pressed="false">50 млн</button><button type="button" class="preset" data-limit="100000000" aria-pressed="false">100 млн</button></div></div><div class="field"><label for="batchCount">Количество ключей</label><select class="input" id="batchCount"><option value="1">1 ключ</option><option value="3">3 ключа</option><option value="5">5 ключей</option><option value="10">10 ключей</option><option value="20">20 ключей</option></select><p class="field-help">Отдельная ссылка для каждого.</p></div></div>
        <div class="field"><span class="field-label">Доступ к моделям</span><label class="check-label"><input type="checkbox" id="allModelsCheck" checked>Все доступные модели</label><div id="modelsSelectorBox" class="model-selector" hidden>${availableModels.length ? availableModels.map((m) => `<label class="check-label"><input type="checkbox" name="models" class="model-checkbox" value="${esc(m.id)}"><span>${esc(toUserFacingModel(m.id))}</span>${m.id.startsWith("ag/") ? `<small class="muted" style="margin-left:6px;font-size:11px">(${esc(m.id)})</small>` : ""}</label>`).join("") : '<p class="muted">Список моделей не получен. Обновите страницу или оставьте доступ ко всем моделям.</p>'}</div></div>
        <div id="createError" class="notice notice-error" role="alert" hidden></div>
      </div><div class="dialog-footer"><button type="button" class="btn" data-close>Отмена</button><button type="submit" id="submitBtn" class="btn btn-primary">${icon("plus")}<span>Создать доступ</span></button></div></form>
    </dialog>
    <dialog id="modelsDialog" aria-labelledby="modelsTitle">${dialogHeading('<span id="modelsTitle">Модели шлюза</span>', "Список доступных моделей из 9router.")}<div class="dialog-body model-list">${availableModels.length ? availableModels.map((m) => `<div class="model-item"><span class="model-glyph">${icon("layers")}</span><code>${esc(toUserFacingModel(m.id))}</code>${m.id.startsWith("ag/") ? `<small class="muted" style="margin-left:8px">(${esc(m.id)})</small>` : ""}</div>`).join("") : '<div class="notice">Не удалось получить список моделей. Проверьте подключение к 9router и обновите страницу.</div>'}</div></dialog>
    <dialog id="connectionDialog" aria-labelledby="connectionTitle">${dialogHeading('<span id="connectionTitle">Подключение к шлюзу</span>', "Используйте этот адрес в приложении клиента.")}<div class="dialog-body"><label for="gatewayEndpoint" class="field-label">Base URL</label><div class="credential-row"><input id="gatewayEndpoint" class="input mono" readonly value="${esc(rootUrl)}/v1"><button class="btn" data-copy="gatewayEndpoint" aria-label="Скопировать Base URL">${icon("copy")}</button></div><div class="notice">У каждого клиента свой API-ключ. Передайте клиенту ссылку на его личный кабинет — ключ и инструкции уже внутри.</div></div></dialog>
    <dialog id="deleteDialog" aria-labelledby="deleteTitle">${dialogHeading('<span id="deleteTitle">Удалить доступ?</span>', "Ключ будет удалён из шлюза, а личный кабинет станет недоступен.")}<div class="dialog-body"><p id="deleteName"></p><div id="deleteError" class="notice notice-error" role="alert" hidden></div></div><div class="dialog-footer"><button class="btn" data-close>Отмена</button><button class="btn btn-danger" id="confirmDelete">${icon("trash")}Удалить ключ</button></div></dialog>
    ${toast()}
    <script>${sharedScript}
      const clients = ${scriptJson(clientData)};
      const adminApi = ${scriptJson(adminPath + "/api")};
      let statusFilter = 'all';
      let deletingClient = null;
      function filterClients() {
        const query = document.getElementById('clientSearch').value.trim().toLocaleLowerCase('ru');
        let count = 0;
        document.querySelectorAll('.client-row').forEach((row) => {
          row.hidden = !(row.dataset.name.includes(query) && (statusFilter === 'all' || row.dataset.status === statusFilter));
          if (!row.hidden) count++;
        });
        document.getElementById('resultCount').textContent = 'Показано ' + count + ' из ' + clients.length;
        document.getElementById('emptyRow').hidden = count > 0;
        if (clients.length) {
          document.getElementById('emptyTitle').textContent = 'Клиенты не найдены';
          document.getElementById('emptyDescription').textContent = 'Попробуйте другое имя или измените фильтр статуса.';
          document.getElementById('emptyCreate').hidden = true;
        }
      }
      document.getElementById('clientSearch').addEventListener('input', filterClients);
      document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
        statusFilter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        filterClients();
      }));
      document.getElementById('refreshDashboard').addEventListener('click', () => window.location.reload());
      function updatePresets() {
        const value = document.getElementById('tokenLimit').value;
        document.querySelectorAll('[data-limit]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.limit === value)));
      }
      document.querySelectorAll('[data-limit]').forEach((button) => button.addEventListener('click', () => {
        document.getElementById('tokenLimit').value = button.dataset.limit;
        updatePresets();
      }));
      document.getElementById('tokenLimit').addEventListener('input', updatePresets);
      document.getElementById('allModelsCheck').addEventListener('change', (event) => {
        document.getElementById('modelsSelectorBox').hidden = event.target.checked;
      });
      function generateRandomName() {
        const ruAdj = ["Квантовый","Неоновый","Северный","Янтарный","Лазурный","Быстрый","Звёздный","Астральный","Кибер","Изумрудный","Тихий","Солнечный","Лунный","Серебряный","Золотой","Магнитный","Космический","Атласный","Рассветный","Глубокий","Орбитальный","Цифровой","Кристальный","Пламенный","Векторный","Штормовой","Таинственный","Полярный","Яркий","Гармоничный"];
        const ruNoun = ["Спутник","Вектор","Орион","Пульсар","Феникс","Шторм","Атлас","Сокол","Луч","Горизонт","Импульс","Маяк","Компас","Призма","Зенит","Поток","Ковчег","Вихрь","Спектр","Страж","Рубеж","Радар","Квазар","Сигнал","Пилот","Генезис","Синтез","Контур","Метеор","Фокус"];
        const enAdj = ["Quantum","Neon","Northern","Amber","Azure","Swift","Stellar","Astral","Cyber","Emerald","Silent","Solar","Lunar","Silver","Golden","Magnetic","Cosmic","Velvet","Dawn","Deep","Orbital","Digital","Crystal","Blazing","Vector","Storm","Mystic","Polar","Vibrant","Harmonic"];
        const enNoun = ["Satellite","Vector","Orion","Pulsar","Phoenix","Storm","Atlas","Falcon","Beam","Horizon","Pulse","Beacon","Compass","Prism","Zenith","Stream","Vessel","Vortex","Spectrum","Sentinel","Apex","Radar","Quasar","Signal","Pilot","Genesis","Synergy","Circuit","Meteor","Focus"];
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        return Math.random() < 0.5 ? (pick(enAdj) + " " + pick(enNoun)) : (pick(ruAdj) + " " + pick(ruNoun));
      }
      document.getElementById('generateNameBtn').addEventListener('click', () => {
        document.getElementById('clientName').value = generateRandomName();
      });
      document.getElementById('createKeyForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = document.getElementById('createError');
        error.hidden = true;
        let clientName = document.getElementById('clientName').value.trim();
        if (!clientName) {
          clientName = generateRandomName();
          document.getElementById('clientName').value = clientName;
        }
        const allowedModels = document.getElementById('allModelsCheck').checked ? null : Array.from(document.querySelectorAll('.model-checkbox:checked'), (input) => input.value);
        if (allowedModels && !allowedModels.length) {
          error.textContent = 'Выберите хотя бы одну модель или включите доступ ко всем.';
          error.hidden = false;
          return;
        }
        const button = document.getElementById('submitBtn');
        button.disabled = true;
        button.querySelector('span').textContent = 'Создаём доступ…';
        try {
          const response = await fetch(adminApi + '/keys/batch-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName, tokenLimit: Number(document.getElementById('tokenLimit').value), batchCount: Number(document.getElementById('batchCount').value), allowedModels }) });
          const result = await response.json();
          if (!response.ok) {
            const partial = result.createdSoFar?.length;
            throw new Error((result.error || 'Не удалось создать доступ.') + (partial ? ' Уже создано: ' + partial + '. Обновите страницу перед повторной попыткой.' : ''));
          }
          window.location.reload();
        } catch (err) { error.textContent = err.message || 'Не удалось связаться с сервером.'; error.hidden = false; }
        finally { button.disabled = false; button.querySelector('span').textContent = 'Создать доступ'; }
      });
      document.getElementById('portalsTableBody').addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const client = clients.find((item) => String(item.id) === button.closest('tr').dataset.id);
        if (!client) return;
        if (button.dataset.action === 'link') copyText(client.portalUrl);
        if (button.dataset.action === 'telegram') {
          const limit = client.tokenLimit === 0 ? 'Без лимита' : new Intl.NumberFormat('ru-RU').format(client.tokenLimit) + ' токенов';
          copyText(['Здравствуйте, ' + client.clientName + '!', '', 'Ваш персональный доступ к AI готов.', 'Пакет: ' + limit, '', 'Ключ и инструкция по подключению в личном кабинете:', client.portalUrl, '', 'Приятной работы!'].join('\\n'));
        }
        if (button.dataset.action === 'delete') {
          deletingClient = client;
          document.getElementById('deleteName').textContent = 'Клиент: ' + client.clientName;
          document.getElementById('deleteError').hidden = true;
          document.getElementById('deleteDialog').showModal();
        }
      });
      document.getElementById('confirmDelete').addEventListener('click', async (event) => {
        if (!deletingClient) return;
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const response = await fetch(adminApi + '/keys/' + encodeURIComponent(deletingClient.id), { method: 'DELETE' });
          if (!response.ok) throw new Error('Не удалось удалить ключ. Попробуйте ещё раз.');
          window.location.reload();
        } catch (err) {
          const error = document.getElementById('deleteError');
          error.textContent = err.message;
          error.hidden = false;
        } finally { button.disabled = false; }
      });
    </script></body></html>`;
}
