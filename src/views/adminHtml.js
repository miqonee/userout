export function renderAdminLoginHtml(error = null) {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вход в панель управления — Route</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080c14; font-family: system-ui, -apple-system, sans-serif; }
    .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-input { background: rgba(3, 7, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); }
  </style>
</head>
<body class="min-h-screen text-slate-100 flex items-center justify-center p-4">
  <div class="max-w-md w-full glass-card rounded-2xl p-8 shadow-2xl space-y-6">
    <div class="text-center">
      <div class="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Админ-панель Route</h1>
      <p class="text-slate-400 text-xs mt-1">Управление клиентами, ключами и квотами</p>
    </div>

    ${
      error
        ? `<div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3.5 py-2.5 rounded-xl text-center">${error}</div>`
        : ""
    }

    <form method="POST" action="/admin/login" class="space-y-4">
      <div>
        <label class="block text-xs text-slate-400 mb-1.5 font-medium">Мастер-пароль</label>
        <input type="password" name="password" required autofocus class="glass-input text-sm text-slate-200 px-3.5 py-2.5 rounded-xl w-full focus:outline-none focus:border-indigo-500 transition">
      </div>
      <button type="submit" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30">
        Войти
      </button>
    </form>
  </div>
</body>
</html>`;
}

export function renderAdminDashboardHtml({
  portals = [],
  availableModels = [],
  publicUrl,
  stats = { totalLimit: 0, totalUsed: 0, activeCount: 0, totalCount: 0 },
}) {
  const formatNum = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return n.toLocaleString();
  };

  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Управление ключами — Route Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080c14; font-family: system-ui, -apple-system, sans-serif; }
    .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-input { background: rgba(3, 7, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); }
  </style>
</head>
<body class="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col items-center">
  <div class="max-w-6xl w-full space-y-8">

    <!-- Top Bar -->
    <div class="flex items-center justify-between pb-2 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/30 font-bold">
          R
        </div>
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">Route Proxy &bull; Админ-панель</h1>
          <p class="text-xs text-slate-500">Шлюз для продажи токенов 9router</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="/admin/logout" class="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition">
          Выйти
        </a>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 uppercase font-medium mb-1">Всего клиентов</div>
        <div class="text-2xl font-bold text-white">${stats.totalCount}</div>
      </div>
      <div class="glass-card rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 uppercase font-medium mb-1">Активных</div>
        <div class="text-2xl font-bold text-emerald-400">${stats.activeCount}</div>
      </div>
      <div class="glass-card rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 uppercase font-medium mb-1">Выделено токенов</div>
        <div class="text-2xl font-bold text-indigo-300">${formatNum(stats.totalLimit)}</div>
      </div>
      <div class="glass-card rounded-xl p-4 shadow-sm">
        <div class="text-xs text-slate-400 uppercase font-medium mb-1">Израсходовано</div>
        <div class="text-2xl font-bold text-amber-400">${formatNum(stats.totalUsed)}</div>
      </div>
    </div>

    <!-- Create Keys Section (Batch Generator) -->
    <div class="glass-card rounded-2xl p-6 shadow-xl space-y-5">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h2 class="text-base font-semibold text-white">Выпуск новых ключей</h2>
          <p class="text-xs text-slate-400">Создает ключ в 9router и формирует персональную страницу</p>
        </div>
      </div>

      <form id="createKeyForm" onsubmit="handleCreateKey(event)" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Client Name -->
          <div>
            <label class="block text-xs text-slate-400 mb-1 font-medium">Имя покупателя / Заметка</label>
            <input type="text" id="clientName" required placeholder="Например: Ivan (Cursor)" class="glass-input text-xs text-slate-200 px-3.5 py-2.5 rounded-xl w-full focus:outline-none focus:border-indigo-500">
          </div>

          <!-- Token Limit Preset -->
          <div>
            <label class="block text-xs text-slate-400 mb-1 font-medium">Лимит токенов</label>
            <div class="flex gap-1.5 mb-1.5">
              <button type="button" onclick="setPresetLimit(10000000)" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700">10M</button>
              <button type="button" onclick="setPresetLimit(50000000)" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700">50M</button>
              <button type="button" onclick="setPresetLimit(100000000)" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700">100M</button>
            </div>
            <input type="number" id="tokenLimit" required value="10000000" min="1000" step="1000" class="glass-input text-xs font-mono text-slate-200 px-3.5 py-2 rounded-xl w-full focus:outline-none">
          </div>

          <!-- Batch Count -->
          <div>
            <label class="block text-xs text-slate-400 mb-1 font-medium">Количество ключей</label>
            <select id="batchCount" class="glass-input text-xs text-slate-200 px-3.5 py-2.5 rounded-xl w-full focus:outline-none">
              <option value="1">1 ключ</option>
              <option value="3">3 ключа</option>
              <option value="5">5 ключей</option>
              <option value="10">10 ключей</option>
            </select>
          </div>
        </div>

        <!-- Model Restrictions -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-slate-400 font-medium">Разрешенные модели для этого ключа</label>
            <label class="flex items-center gap-1.5 text-xs text-indigo-400 cursor-pointer">
              <input type="checkbox" id="allModelsCheck" checked onchange="toggleAllModels(this.checked)" class="rounded text-indigo-600 bg-slate-900 border-slate-700">
              <span>Все доступные модели (*)</span>
            </label>
          </div>

          <div id="modelsSelectorBox" class="hidden bg-slate-950/60 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
            ${
              availableModels.map((m) => `
                <label class="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                  <input type="checkbox" name="models" value="${m.id}" class="model-checkbox rounded text-indigo-600 bg-slate-900 border-slate-700">
                  <span class="font-mono text-[11px] text-indigo-300">${m.id}</span>
                </label>
              `).join("")
            }
          </div>
        </div>

        <button type="submit" id="submitBtn" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>Сгенерировать ключ(и)</span>
        </button>
      </form>
    </div>

    <!-- Active Portals & Keys Table -->
    <div class="glass-card rounded-2xl p-6 shadow-xl space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-white">Список клиентов и квот</h2>
          <p class="text-xs text-slate-400">Персональные ссылки, остатки токенов и управление</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="text-[11px] text-slate-400 uppercase bg-slate-950/40 border-b border-slate-800">
            <tr>
              <th class="py-3 px-4 font-semibold">Покупатель</th>
              <th class="py-3 px-4 font-semibold">Персональная ссылка</th>
              <th class="py-3 px-4 font-semibold">Расход токенов</th>
              <th class="py-3 px-4 font-semibold">Статус</th>
              <th class="py-3 px-4 font-semibold text-right">Действия</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60" id="portalsTableBody">
            ${
              portals.length === 0
                ? `<tr><td colspan="5" class="py-8 text-center text-slate-500">Ключи еще не созданы. Используйте форму выше.</td></tr>`
                : portals.map((p) => {
                    const percent = p.tokenLimit > 0 ? Math.min(100, Math.round((p.cachedUsedTokens / p.tokenLimit) * 100)) : 0;
                    const portalUrl = `${publicUrl}/p/${p.portalToken}`;
                    return `
                    <tr class="hover:bg-slate-800/20 transition">
                      <td class="py-3.5 px-4 font-medium text-white">
                        <div>${p.clientName}</div>
                        <div class="text-[10px] text-slate-500 font-mono mt-0.5">${p.apiKey.slice(0, 15)}...</div>
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1.5">
                          <a href="${portalUrl}" target="_blank" class="text-indigo-400 hover:underline font-mono text-[11px] truncate max-w-[200px]">/p/${p.portalToken}</a>
                          <button onclick="copyText('${portalUrl}', this)" title="Скопировать ссылку" class="text-slate-400 hover:text-white p-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                          </button>
                        </div>
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-mono text-slate-200">${formatNum(p.cachedUsedTokens)}</span>
                          <span class="text-slate-500">/ ${formatNum(p.tokenLimit)}</span>
                          <span class="text-[10px] text-slate-400 font-mono">(${percent}%)</span>
                        </div>
                        <div class="w-32 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div class="h-full rounded-full ${percent >= 100 ? "bg-red-500" : percent > 80 ? "bg-amber-400" : "bg-emerald-500"}" style="width: ${percent}%"></div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4">
                        ${
                          p.status === "active"
                            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Активен</span>`
                            : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Исчерпан</span>`
                        }
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button onclick="copyTelegramMessage('${p.clientName}', '${portalUrl}', ${p.tokenLimit}, this)" class="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-sm">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            <span>Для Telegram</span>
                          </button>
                          <button onclick="deleteKeyRecord(${p.id}, '${p.clientName}')" class="p-1 text-slate-500 hover:text-red-400 transition" title="Удалить ключ">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    `;
                  }).join("")
            }
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    function setPresetLimit(n) {
      document.getElementById('tokenLimit').value = n;
    }

    function toggleAllModels(checked) {
      const box = document.getElementById('modelsSelectorBox');
      if (checked) {
        box.classList.add('hidden');
      } else {
        box.classList.remove('hidden');
      }
    }

    function copyText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span class="text-emerald-400 font-bold text-xs">OK</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
      });
    }

    function copyTelegramMessage(name, portalUrl, limit, btn) {
      const formatted = limit >= 1000000 ? (limit / 1000000) + ' млн' : limit.toLocaleString();
      const text = 'Здравствуйте, ' + name + '!\\n\\n' +
        'Ваш персональный доступ к AI готов.\\n' +
        'Пакет: ' + formatted + ' токенов\\n\\n' +
        'Ваша персональная страница с ключом и инструкцией по подключению (Cursor, Python, CLI):\\n' +
        portalUrl + '\\n\\n' +
        'Приятной работы!';

      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>Скопировано!</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      });
    }

    async function handleCreateKey(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.classList.add('opacity-50');

      const clientName = document.getElementById('clientName').value.trim();
      const tokenLimit = parseInt(document.getElementById('tokenLimit').value, 10);
      const batchCount = parseInt(document.getElementById('batchCount').value, 10);

      const allModels = document.getElementById('allModelsCheck').checked;
      let allowedModels = null;
      if (!allModels) {
        allowedModels = Array.from(document.querySelectorAll('.model-checkbox:checked')).map(cb => cb.value);
        if (allowedModels.length === 0) allowedModels = null;
      }

      try {
        const res = await fetch('/api/admin/keys/batch-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName,
            tokenLimit,
            batchCount,
            allowedModels,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert('Ошибка создания: ' + (err.error || 'Неизвестная ошибка'));
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert('Сетевая ошибка: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50');
      }
    }

    async function deleteKeyRecord(id, name) {
      if (!confirm('Вы уверены, что хотите удалить ключ для "' + name + '"? Он будет удален и из 9router.')) return;
      try {
        const res = await fetch('/api/admin/keys/' + id, { method: 'DELETE' });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Ошибка при удалении');
        }
      } catch (err) {
        alert('Ошибка: ' + err.message);
      }
    }
  </script>
</body>
</html>`;
}
