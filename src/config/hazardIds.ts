/**
 * Normalize hazard ids from Dev Panel / tool params (snake_case) to
 * `state.hazards` runtime keys (camelCase where applicable).
 */
const TO_RUNTIME = Object.freeze({
  cave_in: "caveIn",
  caveIn: "caveIn",
  gas_vent: "gasVent",
  gas: "gasVent",
  gasVent: "gasVent",
  rats: "rats",
  fire: "fire",
  wolves: "wolves",
  wolf: "wolves",
  mole: "mole",
  lava: "lava",
});

export function normalizeHazardId(id: string | null | undefined): string | null {
  if (id == null || id === "") return null;
  const key = String(id).trim();
  return (TO_RUNTIME as Record<string, string | undefined>)[key] ?? key;
}
