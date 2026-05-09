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
 *   "recipe_input_reduce" — Phase 4 (zones rule overhaul): lowers a recipe's
 *                           input requirement for a single resource. Shape:
 *                           `{ type, recipe, input, from, to }`. Each hire
 *                           contributes `(from - to) / maxCount` toward the
 *                           reduction (rounded at use time, floored at 1
 *                           remaining input).
 */
export const TOWNSFOLK = [
  {
    id: "hilda",
    name: "Hilda",
    role: "Farmhand",
    icon: "🧑‍🌾",
    color: "#4f8c3a",
    wage: 15,
    hireCost: { worker: 1, grass_hay: 6, bread: 8 },
    maxCount: 3,
    effect: { type: "threshold_reduce", key: "grass_hay", from: 6, to: 3 },
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
    hireCost: { worker: 1, berry_jam: 3, bread: 8 },
    maxCount: 2,
    effect: { type: "bonus_yield", key: "berry_jam", amount: 2 },
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
    hireCost: { worker: 1, mine_ingot: 4, bread: 8 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "mine_ore", from: 6, to: 4 },
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
    hireCost: { worker: 1, mine_stone: 6, bread: 6 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "mine_stone", from: 8, to: 6 },
    requirement: { level: 2 },
    description: "A seasoned miner who always finds a richer seam. Reduces the chain length needed to upgrade stone tiles.",
  },
  {
    id: "brenna",
    name: "Brenna",
    role: "Vegetable Picker",
    icon: "🧺",
    color: "#7a9a3a",
    wage: 25,
    hireCost: { worker: 1, grass_hay: 10, bread: 20, mine_stone: 10, mine_ingot: 15 },
    maxCount: 4,
    effect: { type: "threshold_reduce_category", category: "vegetables", from: 6, to: 5 },
    requirement: { building: "kitchen", orLevel: 5 },
    description: "A cheerful picker who carries baskets full of vegetables back from the rows, shaving a step off every soup-pot's chain.",
  },

  // ── Phase: wire-all-chains — chain-product workers from REFERENCE_CATALOG §9 ─

  {
    id: "fenna",
    name: "Fenna",
    role: "Fruit Picker",
    icon: "🧺",
    color: "#c84a3a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 6, bread: 10, mine_stone: 12, soup: 2 },
    maxCount: 2,
    // Catalog: 7 fruit = 1 pie at max (base 7 → max 6).
    effect: { type: "threshold_reduce_category", category: "fruits", from: 7, to: 6 },
    requirement: { building: "bakery", orLevel: 5 },
    description: "An orchard climber who knows which limb to coax. Trims a fruit off every pie chain.",
  },
  {
    id: "garrick",
    name: "Garrick",
    role: "Herder",
    icon: "🪈",
    color: "#a86838",
    wage: 35,
    hireCost: { worker: 1, grass_hay: 4, bread: 10, mine_stone: 12, meat: 16 },
    maxCount: 4,
    // Catalog: 5 herd = 1 meat at max (base 5 → max 4).
    effect: { type: "threshold_reduce_category", category: "herd_animals", from: 5, to: 4 },
    requirement: { building: "kitchen", orLevel: 5 },
    description: "Steady on the moors with a long crook. Trims one animal off every meat chain.",
  },
  {
    id: "elsa",
    name: "Elsa",
    role: "Dairywoman",
    icon: "🥛",
    color: "#8aa6c4",
    wage: 40,
    hireCost: { worker: 1, grass_hay: 6, soup: 3, meat: 3, mine_ingot: 15 },
    maxCount: 2,
    // Catalog: 6 cattle = 1 milk at max (base 6 → max 5).
    effect: { type: "threshold_reduce_category", category: "cattle", from: 6, to: 5 },
    requirement: { building: "granary", orLevel: 6 },
    description: "An early riser at the byre — trims one cow off every milk pail.",
  },
  {
    id: "rusk",
    name: "Rusk",
    role: "Rancher",
    icon: "🐎",
    color: "#a85a3a",
    wage: 45,
    // Mounts → Horseshoe is a long chain (10) and a high-value product. Hire
    // cost mirrors catalog tier: heavy on bread/stone with a soup-tier check.
    hireCost: { worker: 1, grass_hay: 9, bread: 9, mine_stone: 12, soup: 9 },
    maxCount: 2,
    // Catalog: 6 cattle = 1 mount at max — but in our chain model mounts are
    // their own category producing horseshoes (chain 10). We use the rancher
    // as the mount-chain reducer: 10 → 9 at max hire.
    effect: { type: "threshold_reduce_category", category: "mounts", from: 10, to: 9 },
    requirement: { building: "granary", orLevel: 6 },
    description: "Knows every mount's gait by ear. Shaves a tile off the horseshoe chain.",
  },
  // ── Cross-chain workers — REFERENCE_CATALOG §9 ─────────────────────────────
  // These redirect the source-category chain to spawn a tile from the target
  // category instead of the source's native `next` product. The catalog's
  // numeric specs are honored where possible; thresholds are calibrated to
  // the catalog "now: N source = 1 target" wording.

  {
    id: "tilda",
    name: "Tilda",
    role: "Grain Trader",
    icon: "🌾",
    color: "#c8923a",
    wage: 25,
    hireCost: { worker: 1, bread: 8, mine_stone: 10, mine_coal: 10 },
    maxCount: 4,
    // Catalog: 4 grain = 1 vegetable at max. Source category `grain`,
    // redirects to first active species in `vegetables`.
    effect: {
      type: "chain_redirect_category",
      fromCategory: "grain",
      toCategory: "vegetables",
      from: 5,  // base ratio
      to: 4,    // catalog max
    },
    requirement: { building: "kitchen", orLevel: 5 },
    description: "A market-savvy trader who barters surplus grain into root crops.",
  },
  {
    id: "marin",
    name: "Marin",
    role: "Gardener",
    icon: "🌱",
    color: "#7eb83a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 8, bread: 16, mine_stone: 12, soup: 4 },
    maxCount: 3,
    // Catalog: 5 vegetable = 1 fruit at max.
    effect: {
      type: "chain_redirect_category",
      fromCategory: "vegetables",
      toCategory: "fruits",
      from: 6,
      to: 5,
    },
    requirement: { building: "kitchen", orLevel: 6 },
    description: "A patient gardener who coaxes fruit trees into bearing from a vegetable patch's runoff.",
  },
  {
    id: "annek",
    name: "Annek",
    role: "Orchardist",
    icon: "✂️",
    color: "#c84a3a",
    wage: 35,
    hireCost: { worker: 1, grass_hay: 9, bread: 16, mine_stone: 10, soup: 9 },
    maxCount: 2,
    // Catalog: 6 fruit = 1 flower at max.
    effect: {
      type: "chain_redirect_category",
      fromCategory: "fruits",
      toCategory: "flowers",
      from: 7,
      to: 6,
    },
    requirement: { building: "larder", orLevel: 6 },
    description: "Trims orchard branches just so — fruit chains coax flowers into bloom.",
  },
  {
    id: "ren",
    name: "Ren",
    role: "Farmer",
    icon: "🪣",
    color: "#5a7a3a",
    wage: 30,
    hireCost: { worker: 1, bread: 12, mine_stone: 10, meat: 8 },
    maxCount: 4,
    // Catalog: 7 bird = 1 herd animal at max.
    effect: {
      type: "chain_redirect_category",
      fromCategory: "bird",
      toCategory: "herd_animals",
      from: 8,
      to: 7,
    },
    requirement: { building: "granary", orLevel: 6 },
    description: "Cultivates yard flocks alongside livestock — long bird chains drive animals from the brake.",
  },

  {
    id: "poultryman",
    name: "Idris",
    role: "Poultryman",
    icon: "🐓",
    color: "#a85a3a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 6, bread: 12, mine_stone: 8 },
    maxCount: 2,
    effect: { type: "threshold_reduce_category", category: "bird", from: 6, to: 4 },
    requirement: { building: "granary", orLevel: 5 },
    description: "Coaxes the flock into laying with a steady hand and an early lamp. Every bird chain comes home a tile shorter.",
  },

  {
    id: "reaper",
    name: "Reaper",
    role: "Reaper",
    icon: "🌾",
    color: "#d8b33e",
    wage: 28,
    hireCost: { worker: 1, grass_hay: 8, bread: 8, mine_stone: 8 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "grain_flour", from: 6, to: 4 },
    requirement: { building: "bakery", orLevel: 4 },
    description: "A scythe-keeper who threshes faster than the wind. Cuts two steps off every flour-to-bread chain.",
  },

  {
    id: "ivar",
    name: "Ivar",
    role: "Beekeeper",
    icon: "🐝",
    color: "#e8a020",
    wage: 35,
    // No catalog worker for flowers → honey, but the chain length (10) is
    // brutal without help. Beekeeper fills the gap with a modest reduction.
    hireCost: { worker: 1, grass_hay: 6, bread: 8, soup: 2, berry_jam: 4 },
    maxCount: 2,
    effect: { type: "threshold_reduce_category", category: "flowers", from: 10, to: 9 },
    requirement: { building: "larder", orLevel: 6 },
    description: "Hums with the hive. Lifts one petal-tile off every honey chain.",
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
    hireCost: { worker: 1, mine_coke: 4, bread: 6 },
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
    hireCost: { worker: 1, mine_ingot: 6, bread: 6 },
    maxCount: 2,
    // At max hire (2): ore +1, gem +1 in pool. 1 hire floors to +0 (0.5 per hire).
    effect: { poolWeight: { mine_ore: 1, mine_gem: 1 } },
    requirement: { biomeUnlocked: "mine" },
    description: "A seasoned surveyor who knows where the richest veins run. Adds bonus ore and gem tiles to the mine spawn pool.",
  },

  // ── Sea workers — REFERENCE_CATALOG §9 (fish biome) ─────────────────────
  {
    id: "fisherman",
    name: "Tova",
    role: "Fisherman",
    icon: "🎣",
    color: "#3a6b8a",
    wage: 30,
    hireCost: { worker: 1, fish_raw: 4, bread: 6, wood_plank: 4 },
    maxCount: 3,
    effect: { type: "threshold_reduce_category", category: "fish", from: 5, to: 2 },
    requirement: { level: 4 },
    description: "An old hand of the surf, knows every reef and tide. Trims a fish off every chain in the harbor.",
  },
  {
    id: "trawlerman",
    name: "Halvor",
    role: "Trawlerman",
    icon: "🛥",
    color: "#5a4a3a",
    wage: 28,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, wood_plank: 6 },
    maxCount: 2,
    effect: { poolWeight: { fish_sardine: 2, fish_mackerel: 2 } },
    requirement: { level: 4 },
    description: "Hauls the long net from dawn to dusk. More sardines and mackerel surface on the harbour board.",
  },
  {
    id: "boatwoman",
    name: "Sigrid",
    role: "Boatwoman",
    icon: "🛶",
    color: "#3a7080",
    wage: 28,
    hireCost: { worker: 1, fish_raw: 4, bread: 8, wood_plank: 6 },
    maxCount: 2,
    effect: { type: "bonus_yield", key: "fish_clam", amount: 2 },
    requirement: { level: 4 },
    description: "Knows every channel and shoal by the way the boat sits. Hauls in extra clams whenever the line draws fish.",
  },
  {
    id: "harpooner",
    name: "Bjarni",
    role: "Harpooner",
    icon: "🔱",
    color: "#5a3a18",
    wage: 35,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, mine_ingot: 4 },
    maxCount: 2,
    effect: { type: "bonus_yield", key: "fish_oyster", amount: 1 },
    requirement: { level: 5 },
    description: "Stands at the prow, eye fixed to the deep. Drops a stray oyster into the catch each haul.",
  },
  {
    id: "oilman",
    name: "Gunnar",
    role: "Oilman",
    icon: "🪔",
    color: "#a86018",
    wage: 32,
    hireCost: { worker: 1, fish_kelp: 6, bread: 8, wood_plank: 8 },
    maxCount: 2,
    effect: { type: "threshold_reduce", key: "fish_kelp", from: 6, to: 4 },
    requirement: { level: 5 },
    description: "Renders kelp into bottled lamp-oil with a slow, patient hand. Trims the chain needed for fish oil.",
  },
  {
    id: "cook",
    name: "Magnus",
    role: "Cook",
    icon: "🍳",
    color: "#a8503a",
    wage: 32,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, mine_stone: 6 },
    maxCount: 2,
    effect: { type: "bonus_yield", key: "fish_fillet", amount: 1 },
    requirement: { level: 5 },
    description: "Knows every plank of the galley. Drops a clean fillet into the catch each haul.",
  },
  {
    id: "chef",
    name: "Halldis",
    role: "Chef",
    icon: "👩‍🍳",
    color: "#d8b878",
    wage: 50,
    hireCost: { worker: 1, fish_fillet: 4, milk: 2, bread: 12 },
    maxCount: 1,
    effect: { type: "season_bonus", key: "coins", amount: 60 },
    requirement: { level: 6 },
    description: "Runs a galley like a ship's captain runs the deck. Brings home extra coin at the end of every season.",
  },
  {
    id: "captain",
    name: "Olaf",
    role: "Captain",
    icon: "🧭",
    color: "#3a4a78",
    wage: 55,
    hireCost: { worker: 1, fish_oil: 3, fish_raw: 8, bread: 12 },
    maxCount: 1,
    effect: { type: "pool_weight", key: "fish_oyster", amount: 2 },
    requirement: { level: 6 },
    description: "Reads sky and sea like a chart. Steers the catch toward oyster beds where pearls hide.",
  },
  {
    id: "explorer",
    name: "Sven",
    role: "Explorer",
    icon: "🗺",
    color: "#7a5a18",
    wage: 38,
    hireCost: { worker: 1, fish_raw: 5, bread: 10, mine_stone: 8 },
    maxCount: 2,
    // Niche: extra clams + kelp tiles in the harbor pool. Object-form
    // poolWeight scales linearly through the per-hire-floor aggregator.
    effect: { poolWeight: { fish_clam: 1, fish_kelp: 1 } },
    requirement: { level: 5 },
    description: "Charts unmapped coves and tide-pools. Brings home extra clams and kelp from the back-shores.",
  },
  {
    id: "navigator",
    name: "Astrid",
    role: "Navigator",
    icon: "🧭",
    color: "#3a4a78",
    wage: 38,
    hireCost: { worker: 1, fish_raw: 6, bread: 10, mine_ingot: 4 },
    maxCount: 1,
    // Catalog: extra coins at season end. Mid-tier bump above Tuck (30)
    // and below Chef (60).
    effect: { type: "season_bonus", key: "coins", amount: 45 },
    requirement: { level: 5 },
    description: "Reads stars and currents alike. Trims the wasted runs and brings extra coin home each season.",
  },
  {
    id: "confectioner",
    name: "Inga",
    role: "Confectioner",
    icon: "🍬",
    color: "#d8786a",
    wage: 30,
    hireCost: { worker: 1, fish_kelp: 8, bread: 10, milk: 1 },
    maxCount: 2,
    // Specialist: extra kelp on chains. Speeds the kelp → fish_oil chain.
    effect: { type: "bonus_yield", key: "fish_kelp", amount: 2 },
    requirement: { level: 5 },
    description: "Boils kelp into salt-sweet candies and lamp oil. Pulls extra kelp from every chain.",
  },
  {
    id: "deckhand",
    name: "Rolf",
    role: "Deckhand",
    icon: "🪢",
    color: "#5a4a3a",
    wage: 18,
    hireCost: { worker: 1, fish_raw: 3, bread: 6, wood_plank: 4 },
    maxCount: 4,
    // Broad, shallow pool boost — sardine + mackerel + kelp each get
    // +1 per max-hire (per-hire fractional, floored to 0 for solo hire).
    effect: { poolWeight: { fish_sardine: 1, fish_mackerel: 1, fish_kelp: 1 } },
    requirement: { level: 4 },
    description: "Hauls lines and scrubs decks from dawn to dark. Keeps the harbour board topped up with the staples.",
  },
];

export const TOWNSFOLK_MAP = Object.fromEntries(TOWNSFOLK.map((w) => [w.id, w]));

// Legacy aliases retained so external modules + tests don't all flip in
// one PR. Phase 5b will introduce a separate `WORKERS` array for the new
// type-tier; `TOWNSFOLK` and `WORKERS` are deliberately kept as distinct
// identifiers.
export const APPRENTICES = TOWNSFOLK;
export const APPRENTICE_MAP = TOWNSFOLK_MAP;
export const WORKERS = TOWNSFOLK;
export const WORKER_MAP = TOWNSFOLK_MAP;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Total townsfolk hired across all types. */
export function totalHired(state) {
  // state.townsfolk.hired is the canonical source; state.townsfolk.hired is
  // accepted for callers that haven't been migrated yet (Phase 5a transition).
  const bag = state?.townsfolk?.hired ?? state?.townsfolk?.hired ?? {};
  return Object.values(bag).reduce((a, n) => a + (n | 0), 0);
}

/** Townsfolk capacity from housing buildings. 1 base + 1 per Housing Block. */
export function housingCapacity(state) {
  const count = ["housing", "housing2", "housing3"]
    .filter(id => !!state?.built?.[id]).length;
  return 1 + count;
}

/** Returns the display label for a townsfolk slot count (plain number string). */
export function workerSlotLabel(worker) {
  return String(worker?.maxCount ?? 0);
}

/** Check if a townsfolk's requirement is met. */
export function checkRequirement(worker, state) {
  const req = worker.requirement;
  if (!req) return true;
  if (req.building && !state?.built?.[req.building]) return false;
  if (req.level && (state?.level ?? 1) < req.level) return false;
  if (req.orLevel && !state?.built?.[req.building] && (state?.level ?? 1) < req.orLevel) return false;
  // biomeUnlocked: gate mine workers until the mine story flag is set
  if (req.biomeUnlocked === "mine" && !state?.story?.flags?.mine_unlocked) return false;
  return true;
}
