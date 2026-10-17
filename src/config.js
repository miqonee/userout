import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { resolveAdminPath } from "./adminPath.js";

dotenv.config();

const dataDir = path.resolve(process.env.DATA_DIR || "./data");
fs.mkdirSync(dataDir, { recursive: true });

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, ""),
  routerUrl: (process.env.ROUTER_URL || "https://route.fn.x3dev.ru").replace(/\/+$/, ""),
  routerPassword: process.env.ROUTER_PASSWORD || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminPath: resolveAdminPath(dataDir),
  trustProxy: process.env.TRUST_PROXY ? process.env.TRUST_PROXY.split(",").map((address) => address.trim()).filter(Boolean) : false,
  dataDir,
  cookieSecret: process.env.COOKIE_SECRET || randomBytes(32).toString("hex"),
};
