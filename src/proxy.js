import { config } from "./config.js";
import { getPortalByApiKey, updatePortalUsage } from "./db.js";
import { Readable } from "node:stream";

export function extractClientApiKey(req) {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const xApiKey = req.headers["x-api-key"];
  if (xApiKey) return String(xApiKey).trim();
  const googKey = req.headers["x-goog-api-key"];
  if (googKey) return String(googKey).trim();
  if (req.query && req.query.key) return String(req.query.key).trim();
  return null;
}

export async function handleProxyRequest(req, reply) {
  const apiKey = extractClientApiKey(req);
  if (!apiKey) {
    return reply.status(401).send({
      error: {
        message: "API key is required. Pass Authorization: Bearer <your_key>",
        type: "authentication_error",
        code: "invalid_api_key",
      },
    });
  }

  // Pre-check portal status if managed locally
  const portal = getPortalByApiKey(apiKey);
  if (portal) {
    if (portal.status === "depleted") {
      return reply.status(429).send({
        error: {
          message: `Token quota exhausted (${portal.tokenLimit.toLocaleString()} tokens). Please visit your portal or contact administrator.`,
          type: "insufficient_quota",
          code: "quota_exceeded",
        },
      });
    }
  }

  const upstreamUrl = `${config.routerUrl}${req.url}`;

  // Filter headers for upstream
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders["host"];
  delete forwardHeaders["connection"];
  delete forwardHeaders["content-length"];

  // Ensure authorization header is set
  forwardHeaders["authorization"] = `Bearer ${apiKey}`;

  let body = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const status = upstreamRes.status;

    // Check if 9router returned 429 quota exhaustion
    if (status === 429 && portal) {
      updatePortalUsage(portal.id, portal.tokenLimit, "depleted");
    }

    // Set response headers
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) reply.header("content-type", contentType);

    const cacheControl = upstreamRes.headers.get("cache-control");
    if (cacheControl) reply.header("cache-control", cacheControl);

    // Forward upstream rate limit or custom quota headers if present
    const retryAfter = upstreamRes.headers.get("retry-after");
    if (retryAfter) reply.header("retry-after", retryAfter);

    reply.status(status);

    // If body is empty
    if (!upstreamRes.body) {
      return reply.send();
    }

    // Convert Web ReadableStream to Node.js Readable stream for Fastify
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    return reply.send(nodeStream);
  } catch (err) {
    req.log.error(err, "Proxy request error to upstream");
    return reply.status(502).send({
      error: {
        message: "Failed to connect to AI upstream gateway",
        type: "gateway_error",
        code: "bad_gateway",
      },
    });
  }
}
