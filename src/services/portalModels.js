// Explicit key restrictions are authoritative. An unrestricted key gets its own catalog.
export async function resolvePortalModels(allowedModels, loadCatalog) {
  const restrictions = Array.isArray(allowedModels)
    ? [...new Set(allowedModels.filter((id) => typeof id === "string" && id.trim()))]
    : [];
  if (restrictions.length && !restrictions.some((id) => id.includes("*"))) return restrictions;

  const catalog = await loadCatalog();
  const models = [...new Set(catalog.map((model) => typeof model === "string" ? model : model.id).filter((id) => typeof id === "string" && id.trim()))];
  if (!restrictions.length || restrictions.includes("*")) return models;
  const patterns = restrictions.map((id) => new RegExp("^" + id.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$"));
  return models.filter((id) => patterns.some((pattern) => pattern.test(id)));
}
