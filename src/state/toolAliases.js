/** Legacy display/dispatch keys → canonical ITEMS tool keys. */
export const TOOL_DISPATCH_ALIASES = Object.freeze({
  scythe: "clear",
  seedpack: "basic",
  lockbox: "rare",
  reshuffle: "shuffle",
});

export function resolveToolDispatchKey(rawKey) {
  if (!rawKey) return rawKey;
  return TOOL_DISPATCH_ALIASES[rawKey] ?? rawKey;
}
