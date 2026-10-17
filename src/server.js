import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { formatNum } from "./format.js";
import { handleProxyRequest } from "./proxy.js";
import { routerClient } from "./services/routerClient.js";
import { resolvePortalModels } from "./services/portalModels.js";
import { AdminAuth } from "./services/adminAuth.js";
import {
  getAllPortals,
  getPortalByToken,
  getPortalById,
  createPortalRecord,
  deletePortalRecord,
  updatePortalUsage,
  db,
} from "./db.js";
import { renderPortalHtml, renderMissingPortalHtml } from "./views/portalHtml.js";
import { renderAdminLoginHtml, renderAdminDashboardHtml } from "./views/adminHtml.js";
import { faviconSvg } from "./views/ui.js";

const fastify = Fastify({
  trustProxy: config.trustProxy,
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
  disableRequestLogging: true,
});

// Register plugins
await fastify.register(cors, { origin: true });
await fastify.register(cookie, {
  secret: config.cookieSecret,
  parseOptions: {},
});
await fastify.register(formbody);

// Allow raw body forwarding for proxies
fastify.addContentTypeParser("*", (req, payload, done) => {
  let data = "";
  payload.on("data", (chunk) => { data += chunk; });
  payload.on("end", () => { done(null, data); });
});

// Admin authentication middleware helper
const adminAuth = new AdminAuth({ db, password: config.adminPassword });
const adminPath = config.adminPath;
const adminOptions = { adminPath };
const adminCookie = { path: adminPath, httpOnly: true, sameSite: "strict", secure: config.publicUrl.startsWith("https://") };
function isAdminAuthenticated(req) { return adminAuth.authenticate(req.cookies.admin_session); }

// ----------------------------------------------------
// 1. REVERSE PROXY ROUTE: /v1/*
// ----------------------------------------------------
fastify.all("/v1", handleProxyRequest);
fastify.all("/v1/*", handleProxyRequest);

// ----------------------------------------------------
// 2. CLIENT PERSONAL PORTAL: /p/:token
// ----------------------------------------------------
fastify.addHook("onRequest", async (req, reply) => {
  if (req.url.startsWith("/p/") || req.url.startsWith("/api/portal/") || req.url.split("?")[0] === adminPath || req.url.startsWith(adminPath + "/")) {
    reply.header("X-Robots-Tag", "noindex, nofollow, noarchive");
    reply.header("Cache-Control", "private, no-store, max-age=0");
    reply.header("Pragma", "no-cache");
    reply.header("Referrer-Policy", "no-referrer");
  }
});

fastify.get("/p/:token", async (req, reply) => {
  const { token } = req.params;
  const portal = getPortalByToken(token);

  if (!portal) {
    return reply.status(404).type("text/html").send(renderMissingPortalHtml());
  }

  // Live sync with 9router if active
  let usedTokens = portal.cachedUsedTokens;
  let allowedModels = portal.allowedModels;
  let isDepleted = portal.status === "depleted" || (portal.tokenLimit > 0 && usedTokens >= portal.tokenLimit);

  if (!isDepleted) {
    try {
      const keyInfo = await routerClient.getKey(portal.keyId);
      if (keyInfo) {
        if (keyInfo.allowedModels === null || Array.isArray(keyInfo.allowedModels)) allowedModels = keyInfo.allowedModels;
        usedTokens = Number(keyInfo.usedTokens) || 0;
        if (portal.tokenLimit > 0 && usedTokens >= portal.tokenLimit) {
          isDepleted = true;
          updatePortalUsage(portal.id, usedTokens, "depleted");
        } else {
          updatePortalUsage(portal.id, usedTokens);
        }
      }
    } catch (err) {
      req.log.warn({ err }, "Could not sync key status with 9router");
    }
  }

  let availableModels = [];
  if (!isDepleted) {
    try {
      availableModels = await resolvePortalModels(allowedModels, () => routerClient.getModelsForKey(portal.apiKey));
    } catch (err) {
      req.log.warn({ err }, "Could not load models for client instructions");
    }
  }

  const html = renderPortalHtml({
    clientName: portal.clientName,
    portalToken: portal.portalToken,
    apiKey: portal.apiKey,
    tokenLimit: portal.tokenLimit,
    usedTokens,
    allowedModels,
    availableModels,
    publicUrl: config.publicUrl,
    isDepleted,
  });

  return reply.status(isDepleted ? 410 : 200).type("text/html").send(html);
});

// Portal real-time status check endpoint
fastify.get("/api/portal/:token/status", async (req, reply) => {
  const { token } = req.params;
  const portal = getPortalByToken(token);
  if (!portal) return reply.status(404).send({ error: "Portal not found" });

  let usedTokens = portal.cachedUsedTokens;
  let isDepleted = portal.status === "depleted" || (portal.tokenLimit > 0 && usedTokens >= portal.tokenLimit);

  if (!isDepleted) {
    try {
      const keyInfo = await routerClient.getKey(portal.keyId);
      if (keyInfo) {
        usedTokens = Number(keyInfo.usedTokens) || 0;
        if (portal.tokenLimit > 0 && usedTokens >= portal.tokenLimit) {
          isDepleted = true;
          updatePortalUsage(portal.id, usedTokens, "depleted");
        } else {
          updatePortalUsage(portal.id, usedTokens);
        }
      }
    } catch (err) {
      // Keep cached on error
    }
  }

  const remainingTokens = Math.max(0, portal.tokenLimit - usedTokens);
  const percentUsed = portal.tokenLimit > 0 ? Math.min(100, Math.round((usedTokens / portal.tokenLimit) * 100)) : 0;

  return reply.send({
    isDepleted,
    percentUsed,
    usedTokens,
    tokenLimit: portal.tokenLimit,
    remainingTokens,
    usedFormatted: formatNum(usedTokens),
    limitFormatted: formatNum(portal.tokenLimit),
    remainingFormatted: formatNum(remainingTokens),
  });
});

// ----------------------------------------------------
// 3. ADMIN PANEL: installation-specific path
// ----------------------------------------------------
fastify.get(adminPath, async (req, reply) => {
  if (!isAdminAuthenticated(req)) {
    return reply.type("text/html").send(renderAdminLoginHtml(null, adminOptions));
  }

  // Fetch portals and available models
  const portals = getAllPortals();

  // Try sync with 9router keys for accurate stats
  try {
    const routerKeys = await routerClient.listKeys();
    const routerKeyMap = new Map(routerKeys.map((k) => [k.id, k]));
    for (const p of portals) {
      const rk = routerKeyMap.get(p.keyId);
      if (rk) {
        const u = Number(rk.usedTokens) || 0;
        p.cachedUsedTokens = u;
        if (p.tokenLimit > 0 && u >= p.tokenLimit && p.status !== "depleted") {
          p.status = "depleted";
          updatePortalUsage(p.id, u, "depleted");
        }
      }
    }
  } catch (err) {
    req.log.warn({ err }, "Could not sync all keys with 9router on admin load");
  }

  let availableModels = [];
  try {
    availableModels = await routerClient.getActiveModels();
  } catch (err) {
    req.log.warn({ err }, "Could not fetch models for admin form");
  }

  const stats = {
    totalCount: portals.length,
    activeCount: portals.filter((p) => p.status === "active").length,
    totalLimit: portals.reduce((sum, p) => sum + p.tokenLimit, 0),
    totalUsed: portals.reduce((sum, p) => sum + p.cachedUsedTokens, 0),
  };

  const html = renderAdminDashboardHtml({
    portals,
    availableModels,
    publicUrl: config.publicUrl,
    stats,
    adminPath,
  });

  return reply.type("text/html").send(html);
});

function blockedLogin(reply, retryAfter) {
  return reply.code(429).header("Retry-After", String(retryAfter)).type("text/html")
    .send(renderAdminLoginHtml(`Слишком много попыток. Повторите вход через ${Math.ceil(retryAfter / 60)} мин.`, adminOptions));
}

fastify.post(adminPath + "/login", {
  bodyLimit: 4096,
  onRequest: async (req, reply) => {
    const wait = adminAuth.retryAfter(req.ip);
    if (wait) return blockedLogin(reply, wait);
  },
}, async (req, reply) => {
  const { password } = req.body || {};
  const result = adminAuth.login(req.ip, password);
  if (result.status === "blocked") return blockedLogin(reply, result.retryAfter);
  if (result.status === "unconfigured") {
    return reply.code(503).type("text/html").send(renderAdminLoginHtml("Вход не настроен. Задайте ADMIN_PASSWORD на сервере.", adminOptions));
  }
  if (result.status === "ok") {
    reply.setCookie("admin_session", result.token, { ...adminCookie, maxAge: result.maxAge });
    return reply.redirect(adminPath);
  }

  return reply.code(401).type("text/html").send(renderAdminLoginHtml("Неверный пароль", adminOptions));
});

fastify.get(adminPath + "/logout", async (req, reply) => {
  adminAuth.logout(req.cookies.admin_session);
  reply.clearCookie("admin_session", adminCookie);
  return reply.redirect(adminPath);
});

// Admin API: Batch Create Keys
fastify.post(adminPath + "/api/keys/batch-create", async (req, reply) => {
  if (!isAdminAuthenticated(req)) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  let { clientName, tokenLimit, batchCount = 1, allowedModels = null } = req.body;
  batchCount = Math.max(1, Math.min(20, parseInt(batchCount, 10) || 1));
  tokenLimit = Math.max(0, parseInt(tokenLimit, 10) || 0);

  const createdPortals = [];

  for (let i = 1; i <= batchCount; i++) {
    const name = batchCount > 1 ? `${clientName} #${i}` : clientName;
    try {
      // 1. Create in 9router
      const routerKey = await routerClient.createKey({
        name,
        tokenLimit,
        allowedModels,
      });

      // 2. Create in local portals DB
      const portal = createPortalRecord({
        clientName: name,
        keyId: routerKey.id,
        apiKey: routerKey.key,
        tokenLimit,
        allowedModels,
      });

      createdPortals.push(portal);
    } catch (err) {
      req.log.error(err, `Failed to create key for ${name}`);
      return reply.status(500).send({
        error: `Ошибка при создании ключа в 9router: ${err.message}`,
        createdSoFar: createdPortals,
      });
    }
  }

  return reply.status(201).send({ success: true, count: createdPortals.length, portals: createdPortals });
});

// Admin API: Delete Key
fastify.delete(adminPath + "/api/keys/:id", async (req, reply) => {
  if (!isAdminAuthenticated(req)) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const portal = getPortalById(id);
  if (!portal) return reply.status(404).send({ error: "Key not found" });

  try {
    // Delete in 9router
    await routerClient.deleteKey(portal.keyId);
  } catch (err) {
    req.log.warn({ err }, `Could not delete key ${portal.keyId} in 9router`);
  }

  // Delete in local DB
  deletePortalRecord(id);
  return reply.send({ success: true });
});

// Favicon endpoints
fastify.get("/favicon.ico", async (req, reply) => {
  return reply.type("image/svg+xml").header("Cache-Control", "public, max-age=86400").send(faviconSvg);
});
fastify.get("/favicon.svg", async (req, reply) => {
  return reply.type("image/svg+xml").header("Cache-Control", "public, max-age=86400").send(faviconSvg);
});

// Public health check for Docker; it does not disclose the administration path.
fastify.get("/health", async () => ({ status: "ok" }));

// The public root and old admin URLs must not disclose the administration path.

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info({ adminUrl: `${config.publicUrl}${adminPath}` }, "Administration URL");
    if (!config.adminPassword) fastify.log.warn("Admin login disabled: set ADMIN_PASSWORD");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
