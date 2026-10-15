import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { config } from "./config.js";
import { handleProxyRequest } from "./proxy.js";
import { routerClient } from "./services/routerClient.js";
import {
  getAllPortals,
  getPortalByToken,
  getPortalById,
  createPortalRecord,
  deletePortalRecord,
  updatePortalUsage,
} from "./db.js";
import { renderPortalHtml } from "./views/portalHtml.js";
import { renderAdminLoginHtml, renderAdminDashboardHtml } from "./views/adminHtml.js";

const fastify = Fastify({
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
function isAdminAuthenticated(req) {
  const session = req.cookies.admin_session;
  return session === config.cookieSecret;
}

// ----------------------------------------------------
// 1. REVERSE PROXY ROUTE: /v1/*
// ----------------------------------------------------
fastify.all("/v1", handleProxyRequest);
fastify.all("/v1/*", handleProxyRequest);

// ----------------------------------------------------
// 2. CLIENT PERSONAL PORTAL: /p/:token
// ----------------------------------------------------
fastify.get("/p/:token", async (req, reply) => {
  const { token } = req.params;
  const portal = getPortalByToken(token);

  if (!portal) {
    return reply.status(404).type("text/html").send(`
      <!DOCTYPE html><html><body style="background:#080c14;color:#94a3b8;font-family:sans-serif;display:flex;height:100vh;align-items:center;justify-content:center">
      <div style="text-align:center"><h2>404 — Ссылка не найдена</h2><p>Персональная страница аннулирована или не существует.</p></div></body></html>
    `);
  }

  // Live sync with 9router if active
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
      req.log.warn({ err }, "Could not sync key status with 9router");
    }
  }

  const html = renderPortalHtml({
    clientName: portal.clientName,
    portalToken: portal.portalToken,
    apiKey: portal.apiKey,
    tokenLimit: portal.tokenLimit,
    usedTokens,
    allowedModels: portal.allowedModels,
    publicUrl: config.publicUrl,
    isDepleted,
  });

  return reply.type("text/html").send(html);
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

  const formatNum = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + " млн";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + " тыс";
    return n.toLocaleString();
  };

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
// 3. ADMIN PANEL: /admin
// ----------------------------------------------------
fastify.get("/admin", async (req, reply) => {
  if (!isAdminAuthenticated(req)) {
    return reply.type("text/html").send(renderAdminLoginHtml());
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
  });

  return reply.type("text/html").send(html);
});

fastify.post("/admin/login", async (req, reply) => {
  const { password } = req.body || {};
  if (password === config.adminPassword) {
    reply.setCookie("admin_session", config.cookieSecret, {
      path: "/",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });
    return reply.redirect("/admin");
  }

  return reply.type("text/html").send(renderAdminLoginHtml("Неверный мастер-пароль"));
});

fastify.get("/admin/logout", async (req, reply) => {
  reply.clearCookie("admin_session", { path: "/" });
  return reply.redirect("/admin");
});

// Admin API: Batch Create Keys
fastify.post("/api/admin/keys/batch-create", async (req, reply) => {
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
fastify.delete("/api/admin/keys/:id", async (req, reply) => {
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

// Root redirect
fastify.get("/", async (req, reply) => {
  return reply.redirect("/admin");
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n=================================================`);
    console.log(`  🚀 Route Proxy & Client Portal Running!`);
    console.log(`  - Local:    http://localhost:${config.port}`);
    console.log(`  - Admin:    http://localhost:${config.port}/admin`);
    console.log(`  - Upstream: ${config.routerUrl}`);
    console.log(`=================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
