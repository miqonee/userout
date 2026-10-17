export function toUserFacingModel(id) {
  if (typeof id !== "string") return id;
  if (id.startsWith("ag/")) return id.slice(3);
  return id;
}

export function toUpstreamModel(id) {
  if (typeof id !== "string") return id;
  if (id.startsWith("ag/")) return id;
  if (!id.includes("/") || id.startsWith("gemini")) return `ag/${id}`;
  return id;
}
