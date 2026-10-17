// Generate ready-to-use instructions from the issued key's models.
export function buildConnectionGuides({ publicUrl, apiKey, model, models = [model] }) {
  const rootUrl = String(publicUrl).replace(/\/+$/, "");
  const baseUrl = rootUrl + "/v1";
  const providerName = /gemini.*flash/i.test(model) ? "GeminiFlash" : "Route AI";
  const shellQuote = (value) => "'" + String(value).replace(/'/g, "'\\''") + "'";
  const powershellQuote = (value) => "'" + String(value).replace(/'/g, "''") + "'";
  const openCodeConfig = {
    $schema: "https://opencode.ai/config.json",
    model: `route/${model}`,
    provider: {
      route: {
        npm: "@ai-sdk/openai-compatible",
        name: providerName,
        options: { baseURL: baseUrl, apiKey },
        models: Object.fromEntries([...new Set([model, ...models])].map((id) => [id, { name: id }])),
      },
    },
  };
  const codexConfig = `[model_providers.route]\nname = "Route AI"\nbase_url = ${JSON.stringify(baseUrl)}\nenv_key = "ROUTE_API_KEY"\nwire_api = "responses"\nrequires_openai_auth = false\n\n[profiles.route]\nmodel_provider = "route"\nmodel = ${JSON.stringify(model)}`;
  const openCodePrompt = [
    `Добавь в OpenCode нового OpenAI-совместимого провайдера ${providerName}.`,
    "ID провайдера: route", `Название: ${providerName}`, `URI: ${baseUrl}`,
    `API-ключ: ${apiKey}`, `Модель по умолчанию: ${model}`,
    `Доступные модели: ${models.join(", ")}`,
    "Используй пакет @ai-sdk/openai-compatible и Chat Completions API.",
    "Добавь провайдера и все доступные модели в пользовательский opencode.json, сохрани остальные настройки. Выбери модель по умолчанию для работы.",
  ].join("\n");
  return {
    providerName,
    opencode: JSON.stringify(openCodeConfig, null, 2),
    opencodePrompt: openCodePrompt,
    codex: codexConfig,
    codexPowerShell: `$env:ROUTE_API_KEY = ${powershellQuote(apiKey)}\ncodex --profile route`,
    codexBash: `export ROUTE_API_KEY=${shellQuote(apiKey)}\ncodex --profile route`,
    claude: `export ANTHROPIC_BASE_URL=${shellQuote(rootUrl)}\nexport ANTHROPIC_API_KEY=${shellQuote(apiKey)}\nclaude`,
    python: `from openai import OpenAI\n\nclient = OpenAI(\n    base_url=${JSON.stringify(baseUrl)},\n    api_key=${JSON.stringify(apiKey)},\n)\n\nresponse = client.chat.completions.create(\n    model=${JSON.stringify(model)},\n    messages=[{"role": "user", "content": "Привет!"}],\n)\n\nprint(response.choices[0].message.content)`,
    nodejs: `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: ${JSON.stringify(baseUrl)},\n  apiKey: ${JSON.stringify(apiKey)},\n});\n\nconst response = await client.chat.completions.create({\n  model: ${JSON.stringify(model)},\n  messages: [{ role: "user", content: "Привет!" }],\n});\n\nconsole.log(response.choices[0].message.content);`,
    curl: `curl ${shellQuote(baseUrl + "/chat/completions")} \\\n  -H ${shellQuote("Authorization: Bearer " + apiKey)} \\\n  -H 'Content-Type: application/json' \\\n  -d ${shellQuote(JSON.stringify({ model, messages: [{ role: "user", content: "Привет!" }], max_tokens: 20 }, null, 2))}`,
  };
}
