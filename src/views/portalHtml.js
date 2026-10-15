export function renderPortalHtml({
  clientName,
  portalToken,
  apiKey,
  tokenLimit,
  usedTokens,
  allowedModels,
  publicUrl,
  isDepleted = false,
}) {
  const percentUsed = tokenLimit > 0 ? Math.min(100, Math.round((usedTokens / tokenLimit) * 100)) : 0;
  const remainingTokens = Math.max(0, tokenLimit - usedTokens);

  const formatNum = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + " млн";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + " тыс";
    return n.toLocaleString();
  };

  const sampleModel = (allowedModels && allowedModels.length > 0) ? allowedModels[0] : "ag/gemini-3.8-flash-low";

  // Depleted View (Zero credentials in DOM)
  if (isDepleted) {
    return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Лимит исчерпан — ${clientName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0b0f19; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen text-slate-100 flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-900/80 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center">
    <div class="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-white mb-2">Квота токенов исчерпана</h1>
    <p class="text-slate-400 text-sm mb-6 leading-relaxed">
      Пакет токенов для <strong>${clientName}</strong> (${formatNum(tokenLimit)} токенов) полностью использован. Персональная страница и ключ деактивированы.
    </p>
    <div class="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 mb-6">
      Для приобретения нового пакета или продления обратитесь к администратору сервиса.
    </div>
    <div class="text-xs text-slate-500">Route Proxy Gateway</div>
  </div>
</body>
</html>`;
  }

  // Active Portal View
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Персональный AI-доступ — ${clientName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080c14; font-family: system-ui, -apple-system, sans-serif; }
    .glass-card { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-input { background: rgba(3, 7, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); }
  </style>
</head>
<body class="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col items-center">
  <div class="max-w-3xl w-full space-y-6">

    <!-- Header & Badge -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Активен
          </span>
          <span class="text-xs text-slate-500">Route AI Gateway</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-bold text-white tracking-tight">${clientName}</h1>
      </div>
      <button onclick="refreshStatus()" id="refreshBtn" class="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition shadow-sm">
        <svg id="refreshIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Обновить квоту
      </button>
    </div>

    <!-- Quota Status Card -->
    <div class="glass-card rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Остаток токенов</span>
        <span class="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/20">
          Осталось: <strong id="remainingDisplay">${formatNum(remainingTokens)}</strong>
        </span>
      </div>

      <div class="flex flex-col md:flex-row md:items-baseline justify-between gap-1 mb-3">
        <div class="text-3xl font-extrabold text-white tracking-tight" id="usedDisplay">
          ${formatNum(usedTokens)} <span class="text-lg text-slate-400 font-normal">/ ${formatNum(tokenLimit)}</span>
        </div>
        <div class="text-sm text-slate-400" id="percentDisplay">${percentUsed}% использовано</div>
      </div>

      <!-- Progress Bar -->
      <div class="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
        <div id="progressBar" class="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-sm" style="width: ${percentUsed}%"></div>
      </div>
    </div>

    <!-- Credentials Card -->
    <div class="glass-card rounded-2xl p-6 shadow-xl space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Данные для подключения</h2>
      
      <!-- Base URL -->
      <div>
        <label class="block text-xs text-slate-400 mb-1.5 font-medium">Base URL (Эндпоинт)</label>
        <div class="flex gap-2">
          <input type="text" readonly value="${publicUrl}/v1" id="endpointInput" class="glass-input text-xs font-mono text-slate-200 px-3.5 py-2.5 rounded-xl w-full focus:outline-none select-all">
          <button onclick="copyToClipboard('${publicUrl}/v1', this)" class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            <span>Копировать</span>
          </button>
        </div>
      </div>

      <!-- API Key -->
      <div>
        <label class="block text-xs text-slate-400 mb-1.5 font-medium">API Key</label>
        <div class="flex gap-2">
          <div class="relative w-full">
            <input type="password" readonly value="${apiKey}" id="apiKeyInput" class="glass-input text-xs font-mono text-slate-200 px-3.5 py-2.5 rounded-xl w-full focus:outline-none select-all pr-10">
            <button onclick="toggleKeyVisibility()" type="button" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200">
              <svg id="eyeIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          </div>
          <button onclick="copyToClipboard('${apiKey}', this)" class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            <span>Копировать</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Models Allowed -->
    <div class="glass-card rounded-2xl p-6 shadow-xl space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Доступные модели</h2>
        <span class="text-xs text-slate-500">${allowedModels ? allowedModels.length : "Все"} модели</span>
      </div>
      <div class="flex flex-wrap gap-2">
        ${
          allowedModels && allowedModels.length > 0
            ? allowedModels.map((m) => `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800/90 text-indigo-300 border border-slate-700/60">${m}</span>`).join("\n")
            : `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800/90 text-emerald-300 border border-slate-700/60">Все модели 9router (*)</span>`
        }
      </div>
    </div>

    <!-- Instructions / Guides Tabs -->
    <div class="glass-card rounded-2xl p-6 shadow-xl space-y-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Инструкция по подключению</h2>
      
      <!-- Tab Buttons -->
      <div class="flex flex-wrap gap-2 border-b border-slate-800 pb-3" id="tabBar">
        <button onclick="switchTab('cursor')" id="btn-cursor" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white transition">Cursor / VS Code</button>
        <button onclick="switchTab('claude')" id="btn-claude" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 transition">Claude Code / CLI</button>
        <button onclick="switchTab('python')" id="btn-python" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 transition">Python</button>
        <button onclick="switchTab('nodejs')" id="btn-nodejs" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 transition">Node.js</button>
        <button onclick="switchTab('curl')" id="btn-curl" class="tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 transition">cURL тест</button>
      </div>

      <!-- Tab 1: Cursor -->
      <div id="tab-cursor" class="tab-content space-y-3">
        <ol class="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
          <li>Откройте <strong>Cursor Settings &rarr; Models</strong>.</li>
          <li>Включите опцию <strong>Override OpenAI Base URL</strong> и вставьте:<br>
            <code class="inline-block mt-1 bg-slate-950 px-2 py-1 rounded text-indigo-300 font-mono text-[11px] select-all">${publicUrl}/v1</code>
          </li>
          <li>В поле <strong>OpenAI API Key</strong> вставьте ваш ключ:<br>
            <code class="inline-block mt-1 bg-slate-950 px-2 py-1 rounded text-indigo-300 font-mono text-[11px] select-all">${apiKey}</code>
          </li>
          <li>Добавьте в список моделей те, которые указаны в блоке «Доступные модели» выше (например: <code>${sampleModel}</code>).</li>
        </ol>
      </div>

      <!-- Tab 2: Claude Code CLI -->
      <div id="tab-claude" class="tab-content hidden space-y-3">
        <p class="text-xs text-slate-300">Выполните экспорт переменных в вашем терминале:</p>
        <pre class="bg-slate-950 p-3 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800"><code>export ANTHROPIC_BASE_URL="${publicUrl}"
export ANTHROPIC_API_KEY="${apiKey}"
claude</code></pre>
      </div>

      <!-- Tab 3: Python -->
      <div id="tab-python" class="tab-content hidden space-y-3">
        <p class="text-xs text-slate-300">Пример с официальной библиотекой <code>openai</code>:</p>
        <pre class="bg-slate-950 p-3 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800"><code>from openai import OpenAI

client = OpenAI(
    base_url="${publicUrl}/v1",
    api_key="${apiKey}"
)

completion = client.chat.completions.create(
    model="${sampleModel}",
    messages=[{"role": "user", "content": "Привет, AI!"}]
)

print(completion.choices[0].message.content)</code></pre>
      </div>

      <!-- Tab 4: Node.js -->
      <div id="tab-nodejs" class="tab-content hidden space-y-3">
        <p class="text-xs text-slate-300">Пример с официальным пакетом <code>openai</code> в Node.js:</p>
        <pre class="bg-slate-950 p-3 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800"><code>import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "${publicUrl}/v1",
  apiKey: "${apiKey}",
});

const completion = await openai.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "Привет!" }],
});

console.log(completion.choices[0].message.content);</code></pre>
      </div>

      <!-- Tab 5: cURL -->
      <div id="tab-curl" class="tab-content hidden space-y-3">
        <p class="text-xs text-slate-300">Проверьте работоспособность прямо в терминале:</p>
        <pre class="bg-slate-950 p-3 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto border border-slate-800"><code>curl "${publicUrl}/v1/chat/completions" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${sampleModel}",
    "messages": [{"role": "user", "content": "Привет!"}],
    "max_tokens": 20
  }'</code></pre>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-xs text-slate-500 pt-2 pb-6">
      Защищенный прокси-шлюз &bull; Route AI
    </div>
  </div>

  <script>
    function copyToClipboard(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Скопировано!</span>';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
      });
    }

    function toggleKeyVisibility() {
      const input = document.getElementById('apiKeyInput');
      if (input.type === 'password') {
        input.type = 'text';
      } else {
        input.type = 'password';
      }
    }

    function switchTab(name) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-800/60', 'text-slate-400');
      });
      document.getElementById('tab-' + name).classList.remove('hidden');
      const activeBtn = document.getElementById('btn-' + name);
      activeBtn.classList.remove('bg-slate-800/60', 'text-slate-400');
      activeBtn.classList.add('bg-indigo-600', 'text-white');
    }

    async function refreshStatus() {
      const icon = document.getElementById('refreshIcon');
      icon.classList.add('animate-spin');
      try {
        const res = await fetch('/api/portal/${portalToken}/status');
        if (res.ok) {
          const data = await res.json();
          if (data.isDepleted) {
            window.location.reload();
            return;
          }
          document.getElementById('remainingDisplay').innerText = data.remainingFormatted;
          document.getElementById('usedDisplay').innerHTML = data.usedFormatted + ' <span class="text-lg text-slate-400 font-normal">/ ' + data.limitFormatted + '</span>';
          document.getElementById('percentDisplay').innerText = data.percentUsed + '% использовано';
          document.getElementById('progressBar').style.width = data.percentUsed + '%';
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => icon.classList.remove('animate-spin'), 600);
      }
    }

    // Auto-refresh quota every 15s
    setInterval(refreshStatus, 15000);
  </script>
</body>
</html>`;
}
