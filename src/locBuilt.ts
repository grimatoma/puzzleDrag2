// Shared helper: get the built-buildings dict for the current location.
// state.built is keyed by location id: { home: { hearth: true }, meadow: {} }.
// Backward-compatible: also merges any flat-format (boolean) keys on the root
// so existing tests that set `built: { bakery: true }` keep working.
import type { GameState } from "./types/state.js";

export function locBuilt(
  state: Pick<GameState, "built" | "mapCurrent"> | GameState | Record<string, unknown>,
): Record<string, unknown> {
  const b: Record<string, unknown> = (state.built ?? {}) as Record<string, unknown>;
  const loc = (typeof state.mapCurrent === "string" ? state.mapCurrent : null) ?? "home";
  const locValue = b[loc];
  const locLevel: Record<string, unknown> =
    locValue !== null && typeof locValue === "object" ? (locValue as Record<string, unknown>) : {};
  const flat: Record<string, unknown> = Object.fromEntries(
    Object.entries(b).filter(([, v]) => typeof v !== "object" || v === null),
  );
  return Object.keys(flat).length > 0 ? { ...flat, ...locLevel } : locLevel;
}
