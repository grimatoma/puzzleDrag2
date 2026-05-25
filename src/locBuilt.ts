// Shared helper: get the built-buildings dict for the current location.
// state.built is keyed by location id: { home: { hearth: true }, meadow: {} }.
// Backward-compatible: also merges any flat-format (boolean) keys on the root
// so existing tests that set `built: { bakery: true }` keep working.
export function locBuilt(state) {
  const b = state.built ?? {};
  const loc = state.mapCurrent ?? "home";
  const locLevel =
    b[loc] !== null && typeof b[loc] === "object" ? b[loc] : {};
  const flat = Object.fromEntries(
    Object.entries(b).filter(([, v]) => typeof v !== "object" || v === null),
  );
  return Object.keys(flat).length > 0 ? { ...flat, ...locLevel } : locLevel;
}
