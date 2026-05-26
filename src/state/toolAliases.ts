/** Legacy display/dispatch keys → canonical ITEMS tool keys. */
export const TOOL_DISPATCH_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  scythe: "clear",
  seedpack: "basic",
  lockbox: "rare",
  reshuffle: "shuffle",
});

export function resolveToolDispatchKey(rawKey: string | null | undefined): string | null | undefined {
  if (!rawKey) return rawKey;
  return TOOL_DISPATCH_ALIASES[rawKey] ?? rawKey;
}
