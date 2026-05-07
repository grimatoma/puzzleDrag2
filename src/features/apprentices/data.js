/**
 * Phase 4 — Worker data model.
 * Each worker has: id, name, role, icon, color, wage, hireCost, maxCount,
 * effect (type + params), requirement.
 *
 * effect.type is one of:
 *   "threshold_reduce" — lowers chain upgrade threshold for a resource
 *   "pool_weight"      — adds extra copies of a resource to the spawn pool
 *   "bonus_yield"      — adds bonus resources per chain of a type
 *   "season_bonus"     — pays extra coins at season end
 */
export const WORKERS = [
  {
    id: "hilda",
    name: "Hilda",
    role: "Farmhand",
    icon: "🧑‍🌾",
    color: "#4f8c3a",
    wage: 15,
    hireCost: { worker: 1, hay: 6, bread: 8 },
    maxCount: 3,
    effect: { type: "threshold_reduce", key: "hay", from: 6, to: 3 },
    requirement: { building: "granary" },
    description: "A tireless farmhand who knows just when to cut the hay. Lowers the chain length needed to upgrade hay tiles.",
  },
  {
    id: "pip",
    name: "Pip",
    role: "Forager",
    icon: "🌿",
    color: "#7dc45a",
    wage: 12,
    hireCost: { worker: 1, berry: 4, bread: 6 },
    maxCount: 2,
    effect: { type: "pool_weight", key: "berry", amount: 2 },
    requirement: { building: "inn" },
    description: "A nimble forager who scouts the hedgerows at dawn. Adds extra berry tiles to the board spawn pool.",
  },
  {
    id: "wila",
    name: "Wila",
    role: "Cellarer",
    icon: "🍯",
    color: "#c8923a",
    wage: 20,
    hireCost: { worker: 1, jam: 3, bread: 8 },
    maxCount: 2,
    effect: { type: "bonus_yield", key: "jam", amount: 2 },
    requirement: { building: "bakery" },
    description: "A patient cellarer who turns surplus berries into rich preserves. Yields bonus jam whenever you chain berry tiles.",
  },
  {
    id: "tuck",
    name: "Tuck",
    role: "Lookout",
    icon: "👀",
    color: "#3a6a9a",
    wage: 20,
    hireCost: { worker: 1, bread: 6 },
    maxCount: 1,
    effect: { type: "season_bonus", key: "coins", amount: 30 },
    requirement: { building: "inn" },
    description: "A sharp-eyed lookout who keeps tabs on trade caravans. Brings in extra coin at the end of each season.",
  },
  {
    id: "osric",
    name: "Osric",
    role: "Smith Apprentice",
    icon: "⚒",
    color: "#3a3a3a",
    wage: 40,
    hireCost: { worker: 1, ingot: 4, bread: 8 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "ore", from: 6, to: 4 },
    requirement: { building: "forge", orLevel: 4 },
    description: "A forge apprentice who learned the trade at Bram's knee. Reduces the chain length needed to smelt ore into ingots.",
  },
  {
    id: "dren",
    name: "Dren",
    role: "Miner",
    icon: "⛏",
    color: "#7a8490",
    wage: 25,
    hireCost: { worker: 1, stone: 6, bread: 6 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "stone", from: 8, to: 6 },
    requirement: { level: 2 },
    description: "A seasoned miner who always finds a richer seam. Reduces the chain length needed to upgrade stone tiles.",
  },

  // ── Phase 9 — Mine workers ──────────────────────────────────────────────────
  // Locked rule: max-effect model from Phase 4.
  // Per-hire = effect / maxCount. Pool-weight effects floor to integer.
  {
    id: "canary",
    name: "Canary",
    role: "Hazard Spotter",
    icon: "🐦",
    color: "#f5c842",
    wage: 18,
    hireCost: { worker: 1, coke: 4, bread: 6 },
    maxCount: 2,
    // At max hire (2): gas_vent spawn rate −50%. Per hire: −25%.
    effect: { hazardSpawnReduce: { gas_vent: 0.5 } },
    requirement: { biomeUnlocked: "mine" },
    description: "A trained hazard spotter who senses dangerous gas before it builds up. Reduces the chance of gas vent hazards spawning in the mine.",
  },
  {
    id: "geologist",
    name: "Geologist",
    role: "Surveyor",
    icon: "🔭",
    color: "#8a6a3a",
    wage: 30,
    hireCost: { worker: 1, ingot: 6, bread: 6 },
    maxCount: 2,
    // At max hire (2): ore +1, gem +1 in pool. 1 hire floors to +0 (0.5 per hire).
    effect: { poolWeight: { ore: 1, gem: 1 } },
    requirement: { biomeUnlocked: "mine" },
    description: "A seasoned surveyor who knows where the richest veins run. Adds bonus ore and gem tiles to the mine spawn pool.",
  },
];

export const WORKER_MAP = Object.fromEntries(WORKERS.map((w) => [w.id, w]));

// Legacy aliases kept for backward compatibility
export const APPRENTICES = WORKERS;
export const APPRENTICE_MAP = WORKER_MAP;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Total workers hired across all types. */
export function totalHired(state) {
  return Object.values(state?.workers?.hired ?? {}).reduce((a, n) => a + (n | 0), 0);
}

/** Worker capacity from housing buildings. 1 base + 1 per Housing Block. */
export function housingCapacity(state) {
  const housingBuilt = state?.built?.housing;
  const housingCount = typeof housingBuilt === "object"
    ? (housingBuilt?.count ?? 1)
    : (housingBuilt ? 1 : 0);
  return 1 + housingCount;
}

/** Returns the display label for a worker's slot count (plain number string). */
export function workerSlotLabel(worker) {
  return String(worker?.maxCount ?? 0);
}

/** Check if a worker's requirement is met. */
export function checkRequirement(worker, state) {
  const req = worker.requirement;
  if (!req) return true;
  if (req.building && !state?.built?.[req.building]) return false;
  if (req.level && (state?.level ?? 1) < req.level) return false;
  if (req.orLevel && !state?.built?.[req.building] && (state?.level ?? 1) < req.orLevel) return false;
  return true;
}
