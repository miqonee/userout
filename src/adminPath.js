import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function validateAdminPath(value) {
  const path = String(value).replace(/\/+$/, "");
  if (!/^\/[a-zA-Z0-9_-]{8,100}$/.test(path) || path === "/admin") {
    throw new Error("Stored administration path is invalid");
  }
  return path;
}

export function resolveAdminPath(dataDir) {
  const file = join(dataDir, "admin-path");
  try {
    return validateAdminPath(readFileSync(file, "utf8").trim());
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const path = "/manage-" + randomBytes(12).toString("hex");
  try {
    writeFileSync(file, path, { mode: 0o600, flag: "wx" });
    return path;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return validateAdminPath(readFileSync(file, "utf8").trim());
  }
}
