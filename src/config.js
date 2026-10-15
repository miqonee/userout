import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, ""),
  routerUrl: (process.env.ROUTER_URL || "https://route.fn.x3dev.ru").replace(/\/+$/, ""),
  routerPassword: process.env.ROUTER_PASSWORD || "",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123456",
  dataDir: path.resolve(process.env.DATA_DIR || "./data"),
  cookieSecret: process.env.COOKIE_SECRET || "route-proxy-secure-session-key-32chars",
};

// Ensure data dir exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
