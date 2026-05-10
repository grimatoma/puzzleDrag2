/**
 * Townsfolk (named individuals) — id, name, role, icon, color, wage,
 * hireCost, maxCount, abilities, requirement.
 *
 * `abilities` is an array of `{ id, params }` entries drawn from the
 * unified abilities catalog at `src/config/abilities.js`. The aggregator
 * in `src/config/abilitiesAggregate.js` folds each hired worker's
 * abilities into the global channel object, scaled by hiredCount/maxCount.
 *
 * Common ability ids used here: threshold_reduce, threshold_reduce_category,
 * pool_weight, pool_weight_legacy, bonus_yield, season_bonus,
 * recipe_input_reduce, chain_redirect_category, hazard_spawn_reduce,
 * hazard_coin_multiplier.
 */
export const TOWNSFOLK = [
  {
    id: "hilda",
    name: "Hilda",
    role: "Farmhand",
    iconKey: "ui_farmer",
    color: "#4f8c3a",
    wage: 15,
    hireCost: { worker: 1, grass_hay: 6, bread: 8 },
    maxCount: 3,
    abilities: [
      { id: "threshold_reduce", params: { target: "grass_hay", amount: 3 } },
    ],
    requirement: { building: "granary" },
    description: "A tireless farmhand who knows just when to cut the hay. Lowers the chain length needed to upgrade hay tiles.",
  },
  {
    id: "pip",
    name: "Pip",
    role: "Forager",
    iconKey: "grass_meadow",
    color: "#7dc45a",
    wage: 12,
    hireCost: { worker: 1, berry: 4, bread: 6 },
    maxCount: 2,
    abilities: [
      { id: "pool_weight_legacy", params: { target: "berry", amount: 2 } },
    ],
    requirement: { building: "inn" },
    description: "A nimble forager who scouts the hedgerows at dawn. Adds extra berry tiles to the board spawn pool.",
  },
  {
    id: "wila",
    name: "Wila",
    role: "Cellarer",
    iconKey: "honey",
    color: "#c8923a",
    wage: 20,
    hireCost: { worker: 1, berry_jam: 3, bread: 8 },
    maxCount: 2,
    abilities: [
      { id: "bonus_yield", params: { target: "berry_jam", amount: 2 } },
    ],
    requirement: { building: "bakery" },
    description: "A patient cellarer who turns surplus berries into rich preserves. Yields bonus jam whenever you chain berry tiles.",
  },
  {
    id: "tuck",
    name: "Tuck",
    role: "Lookout",
    iconKey: "ui_star",
    color: "#3a6a9a",
    wage: 20,
    hireCost: { worker: 1, bread: 6 },
    maxCount: 1,
    abilities: [
      { id: "season_bonus", params: { resource: "coins", amount: 30 } },
    ],
    requirement: { building: "inn" },
    description: "A sharp-eyed lookout who keeps tabs on trade caravans. Brings in extra coin at the end of each season.",
  },
  {
    id: "osric",
    name: "Osric",
    role: "Smith Apprentice",
    iconKey: "ui_star",
    color: "#3a3a3a",
    wage: 40,
    hireCost: { worker: 1, mine_ingot: 4, bread: 8 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce", params: { target: "mine_ore", amount: 2 } },
    ],
    requirement: { building: "forge", orLevel: 4 },
    description: "A forge apprentice who learned the trade at Bram's knee. Reduces the chain length needed to smelt ore into ingots.",
  },
  {
    id: "dren",
    name: "Dren",
    role: "Miner",
    iconKey: "ui_build",
    color: "#7a8490",
    wage: 25,
    hireCost: { worker: 1, mine_stone: 6, bread: 6 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce", params: { target: "mine_stone", amount: 2 } },
    ],
    requirement: { level: 2 },
    description: "A seasoned miner who always finds a richer seam. Reduces the chain length needed to upgrade stone tiles.",
  },
  {
    id: "brenna",
    name: "Brenna",
    role: "Vegetable Picker",
    iconKey: "ui_star",
    color: "#7a9a3a",
    wage: 25,
    hireCost: { worker: 1, grass_hay: 10, bread: 20, mine_stone: 10, mine_ingot: 15 },
    maxCount: 4,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "vegetables", amount: 1 } },
    ],
    requirement: { building: "kitchen", orLevel: 5 },
    description: "A cheerful picker who carries baskets full of vegetables back from the rows, shaving a step off every soup-pot's chain.",
  },

  // ── Phase: wire-all-chains — chain-product workers from REFERENCE_CATALOG §9 ─

  {
    id: "fenna",
    name: "Fenna",
    role: "Fruit Picker",
    iconKey: "ui_star",
    color: "#c84a3a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 6, bread: 10, mine_stone: 12, soup: 2 },
    maxCount: 2,
    // Catalog: 7 fruit = 1 pie at max (base 7 → max 6).
    abilities: [
      { id: "threshold_reduce_category", params: { category: "fruits", amount: 1 } },
    ],
    requirement: { building: "bakery", orLevel: 5 },
    description: "An orchard climber who knows which limb to coax. Trims a fruit off every pie chain.",
  },
  {
    id: "garrick",
    name: "Garrick",
    role: "Herder",
    iconKey: "ui_star",
    color: "#a86838",
    wage: 35,
    hireCost: { worker: 1, grass_hay: 4, bread: 10, mine_stone: 12, meat: 16 },
    maxCount: 4,
    // Catalog: 5 herd = 1 meat at max (base 5 → max 4).
    abilities: [
      { id: "threshold_reduce_category", params: { category: "herd_animals", amount: 1 } },
    ],
    requirement: { building: "kitchen", orLevel: 5 },
    description: "Steady on the moors with a long crook. Trims one animal off every meat chain.",
  },
  {
    id: "elsa",
    name: "Elsa",
    role: "Dairywoman",
    iconKey: "milk",
    color: "#8aa6c4",
    wage: 40,
    hireCost: { worker: 1, grass_hay: 6, soup: 3, meat: 3, mine_ingot: 15 },
    maxCount: 2,
    // Catalog: 6 cattle = 1 milk at max (base 6 → max 5).
    abilities: [
      { id: "threshold_reduce_category", params: { category: "cattle", amount: 1 } },
    ],
    requirement: { building: "granary", orLevel: 6 },
    description: "An early riser at the byre — trims one cow off every milk pail.",
  },
  {
    id: "rusk",
    name: "Rusk",
    role: "Rancher",
    iconKey: "ui_star",
    color: "#a85a3a",
    wage: 45,
    // Mounts → Horseshoe is a long chain (10) and a high-value product. Hire
    // cost mirrors catalog tier: heavy on bread/stone with a soup-tier check.
    hireCost: { worker: 1, grass_hay: 9, bread: 9, mine_stone: 12, soup: 9 },
    maxCount: 2,
    // Catalog: 6 cattle = 1 mount at max — but in our chain model mounts are
    // their own category producing horseshoes (chain 10). We use the rancher
    // as the mount-chain reducer: 10 → 9 at max hire.
    abilities: [
      { id: "threshold_reduce_category", params: { category: "mounts", amount: 1 } },
    ],
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
    iconKey: "grass_hay",
    color: "#c8923a",
    wage: 25,
    hireCost: { worker: 1, bread: 8, mine_stone: 10, mine_coal: 10 },
    maxCount: 4,
    // Catalog: 4 grain = 1 vegetable at max. Source category `grain`,
    // redirects to first active species in `vegetables`.
    abilities: [
      {
        id: "chain_redirect_category",
        params: {
          fromCategory: "grain",
          toCategory: "vegetables",
          baseThreshold: 5,
          minThreshold: 4,
        },
      },
    ],
    requirement: { building: "kitchen", orLevel: 5 },
    description: "A market-savvy trader who barters surplus grain into root crops.",
  },
  {
    id: "marin",
    name: "Marin",
    role: "Gardener",
    iconKey: "grass_spiky",
    color: "#7eb83a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 8, bread: 16, mine_stone: 12, soup: 4 },
    maxCount: 3,
    // Catalog: 5 vegetable = 1 fruit at max.
    abilities: [
      {
        id: "chain_redirect_category",
        params: {
          fromCategory: "vegetables",
          toCategory: "fruits",
          baseThreshold: 6,
          minThreshold: 5,
        },
      },
    ],
    requirement: { building: "kitchen", orLevel: 6 },
    description: "A patient gardener who coaxes fruit trees into bearing from a vegetable patch's runoff.",
  },
  {
    id: "annek",
    name: "Annek",
    role: "Orchardist",
    iconKey: "ui_star",
    color: "#c84a3a",
    wage: 35,
    hireCost: { worker: 1, grass_hay: 9, bread: 16, mine_stone: 10, soup: 9 },
    maxCount: 2,
    // Catalog: 6 fruit = 1 flower at max.
    abilities: [
      {
        id: "chain_redirect_category",
        params: {
          fromCategory: "fruits",
          toCategory: "flowers",
          baseThreshold: 7,
          minThreshold: 6,
        },
      },
    ],
    requirement: { building: "larder", orLevel: 6 },
    description: "Trims orchard branches just so — fruit chains coax flowers into bloom.",
  },
  {
    id: "ren",
    name: "Ren",
    role: "Farmer",
    iconKey: "ui_star",
    color: "#5a7a3a",
    wage: 30,
    hireCost: { worker: 1, bread: 12, mine_stone: 10, meat: 8 },
    maxCount: 4,
    // Catalog: 7 bird = 1 herd animal at max.
    abilities: [
      {
        id: "chain_redirect_category",
        params: {
          fromCategory: "bird",
          toCategory: "herd_animals",
          baseThreshold: 8,
          minThreshold: 7,
        },
      },
    ],
    requirement: { building: "granary", orLevel: 6 },
    description: "Cultivates yard flocks alongside livestock — long bird chains drive animals from the brake.",
  },

  {
    id: "poultryman",
    name: "Idris",
    role: "Poultryman",
    iconKey: "ui_star",
    color: "#a85a3a",
    wage: 30,
    hireCost: { worker: 1, grass_hay: 6, bread: 12, mine_stone: 8 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "bird", amount: 2 } },
    ],
    requirement: { building: "granary", orLevel: 5 },
    description: "Coaxes the flock into laying with a steady hand and an early lamp. Every bird chain comes home a tile shorter.",
  },

  {
    id: "reaper",
    name: "Reaper",
    role: "Reaper",
    iconKey: "grass_hay",
    color: "#d8b33e",
    wage: 28,
    hireCost: { worker: 1, grass_hay: 8, bread: 8, mine_stone: 8 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce", params: { target: "grain_flour", amount: 2 } },
    ],
    requirement: { building: "bakery", orLevel: 4 },
    description: "A scythe-keeper who threshes faster than the wind. Cuts two steps off every flour-to-bread chain.",
  },

  {
    id: "ivar",
    name: "Ivar",
    role: "Beekeeper",
    iconKey: "ui_star",
    color: "#e8a020",
    wage: 35,
    // No catalog worker for flowers → honey, but the chain length (10) is
    // brutal without help. Beekeeper fills the gap with a modest reduction.
    hireCost: { worker: 1, grass_hay: 6, bread: 8, soup: 2, berry_jam: 4 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "flowers", amount: 1 } },
    ],
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
    iconKey: "ui_star",
    color: "#f5c842",
    wage: 18,
    hireCost: { worker: 1, mine_coke: 4, bread: 6 },
    maxCount: 2,
    // At max hire (2): gas_vent spawn rate −50%. Per hire: −25%.
    abilities: [
      { id: "hazard_spawn_reduce", params: { hazard: "gas_vent", amount: 0.5 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "A trained hazard spotter who senses dangerous gas before it builds up. Reduces the chance of gas vent hazards spawning in the mine.",
  },
  {
    id: "geologist",
    name: "Geologist",
    role: "Surveyor",
    iconKey: "ui_star",
    color: "#8a6a3a",
    wage: 30,
    hireCost: { worker: 1, mine_ingot: 6, bread: 6 },
    maxCount: 2,
    // At max hire (2): ore +1, gem +1 in pool. 1 hire floors to +0 (0.5 per hire).
    abilities: [
      { id: "pool_weight", params: { target: "mine_ore", amount: 1 } },
      { id: "pool_weight", params: { target: "mine_gem", amount: 1 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "A seasoned surveyor who knows where the richest veins run. Adds bonus ore and gem tiles to the mine spawn pool.",
  },

  // ── Sea workers — REFERENCE_CATALOG §9 (fish biome) ─────────────────────
  {
    id: "fisherman",
    name: "Tova",
    role: "Fisherman",
    iconKey: "ui_star",
    color: "#3a6b8a",
    wage: 30,
    hireCost: { worker: 1, fish_raw: 4, bread: 6, wood_plank: 4 },
    maxCount: 3,
    abilities: [
      { id: "threshold_reduce_category", params: { category: "fish", amount: 3 } },
    ],
    requirement: { level: 4 },
    description: "An old hand of the surf, knows every reef and tide. Trims a fish off every chain in the harbor.",
  },
  {
    id: "trawlerman",
    name: "Halvor",
    role: "Trawlerman",
    iconKey: "ui_star",
    color: "#5a4a3a",
    wage: 28,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, wood_plank: 6 },
    maxCount: 2,
    abilities: [
      { id: "pool_weight", params: { target: "fish_sardine", amount: 2 } },
      { id: "pool_weight", params: { target: "fish_mackerel", amount: 2 } },
    ],
    requirement: { level: 4 },
    description: "Hauls the long net from dawn to dusk. More sardines and mackerel surface on the harbour board.",
  },
  {
    id: "boatwoman",
    name: "Sigrid",
    role: "Boatwoman",
    iconKey: "ui_star",
    color: "#3a7080",
    wage: 28,
    hireCost: { worker: 1, fish_raw: 4, bread: 8, wood_plank: 6 },
    maxCount: 2,
    abilities: [
      { id: "bonus_yield", params: { target: "fish_clam", amount: 2 } },
    ],
    requirement: { level: 4 },
    description: "Knows every channel and shoal by the way the boat sits. Hauls in extra clams whenever the line draws fish.",
  },
  {
    id: "harpooner",
    name: "Bjarni",
    role: "Harpooner",
    iconKey: "ui_star",
    color: "#5a3a18",
    wage: 35,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, mine_ingot: 4 },
    maxCount: 2,
    abilities: [
      { id: "bonus_yield", params: { target: "fish_oyster", amount: 1 } },
    ],
    requirement: { level: 5 },
    description: "Stands at the prow, eye fixed to the deep. Drops a stray oyster into the catch each haul.",
  },
  {
    id: "oilman",
    name: "Gunnar",
    role: "Oilman",
    iconKey: "ui_star",
    color: "#a86018",
    wage: 32,
    hireCost: { worker: 1, fish_kelp: 6, bread: 8, wood_plank: 8 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce", params: { target: "fish_kelp", amount: 2 } },
    ],
    requirement: { level: 5 },
    description: "Renders kelp into bottled lamp-oil with a slow, patient hand. Trims the chain needed for fish oil.",
  },
  {
    id: "cook",
    name: "Magnus",
    role: "Cook",
    iconKey: "ui_star",
    color: "#a8503a",
    wage: 32,
    hireCost: { worker: 1, fish_raw: 6, bread: 8, mine_stone: 6 },
    maxCount: 2,
    abilities: [
      { id: "bonus_yield", params: { target: "fish_fillet", amount: 1 } },
    ],
    requirement: { level: 5 },
    description: "Knows every plank of the galley. Drops a clean fillet into the catch each haul.",
  },
  {
    id: "chef",
    name: "Halldis",
    role: "Chef",
    iconKey: "ui_star",
    color: "#d8b878",
    wage: 50,
    hireCost: { worker: 1, fish_fillet: 4, milk: 2, bread: 12 },
    maxCount: 1,
    abilities: [
      { id: "season_bonus", params: { resource: "coins", amount: 60 } },
    ],
    requirement: { level: 6 },
    description: "Runs a galley like a ship's captain runs the deck. Brings home extra coin at the end of every season.",
  },
  {
    id: "captain",
    name: "Olaf",
    role: "Captain",
    iconKey: "ui_star",
    color: "#3a4a78",
    wage: 55,
    hireCost: { worker: 1, fish_oil: 3, fish_raw: 8, bread: 12 },
    maxCount: 1,
    abilities: [
      { id: "pool_weight_legacy", params: { target: "fish_oyster", amount: 2 } },
    ],
    requirement: { level: 6 },
    description: "Reads sky and sea like a chart. Steers the catch toward oyster beds where pearls hide.",
  },
  {
    id: "explorer",
    name: "Sven",
    role: "Explorer",
    iconKey: "ui_star",
    color: "#7a5a18",
    wage: 38,
    hireCost: { worker: 1, fish_raw: 5, bread: 10, mine_stone: 8 },
    maxCount: 2,
    // Niche: extra clams + kelp tiles in the harbor pool. Object-form
    // poolWeight scales linearly through the per-hire-floor aggregator.
    abilities: [
      { id: "pool_weight", params: { target: "fish_clam", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_kelp", amount: 1 } },
    ],
    requirement: { level: 5 },
    description: "Charts unmapped coves and tide-pools. Brings home extra clams and kelp from the back-shores.",
  },
  {
    id: "navigator",
    name: "Astrid",
    role: "Navigator",
    iconKey: "ui_star",
    color: "#3a4a78",
    wage: 38,
    hireCost: { worker: 1, fish_raw: 6, bread: 10, mine_ingot: 4 },
    maxCount: 1,
    // Catalog: extra coins at season end. Mid-tier bump above Tuck (30)
    // and below Chef (60).
    abilities: [
      { id: "season_bonus", params: { resource: "coins", amount: 45 } },
    ],
    requirement: { level: 5 },
    description: "Reads stars and currents alike. Trims the wasted runs and brings extra coin home each season.",
  },
  {
    id: "confectioner",
    name: "Inga",
    role: "Confectioner",
    iconKey: "ui_star",
    color: "#d8786a",
    wage: 30,
    hireCost: { worker: 1, fish_kelp: 8, bread: 10, milk: 1 },
    maxCount: 2,
    // Specialist: extra kelp on chains. Speeds the kelp → fish_oil chain.
    abilities: [
      { id: "bonus_yield", params: { target: "fish_kelp", amount: 2 } },
    ],
    requirement: { level: 5 },
    description: "Boils kelp into salt-sweet candies and lamp oil. Pulls extra kelp from every chain.",
  },
  {
    id: "deckhand",
    name: "Rolf",
    role: "Deckhand",
    iconKey: "ui_star",
    color: "#5a4a3a",
    wage: 18,
    hireCost: { worker: 1, fish_raw: 3, bread: 6, wood_plank: 4 },
    maxCount: 4,
    // Broad, shallow pool boost — sardine + mackerel + kelp each get
    // +1 per max-hire (per-hire fractional, floored to 0 for solo hire).
    abilities: [
      { id: "pool_weight", params: { target: "fish_sardine", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_mackerel", amount: 1 } },
      { id: "pool_weight", params: { target: "fish_kelp", amount: 1 } },
    ],
    requirement: { level: 4 },
    description: "Hauls lines and scrubs decks from dawn to dark. Keeps the harbour board topped up with the staples.",
  },

  // ── Mine workers — catalog §9 (first batch) ─────────────────────────────
  {
    id: "stone_miner",
    name: "Yusuf",
    role: "Stone Miner",
    iconKey: "ui_star",
    color: "#7c8388",
    wage: 24,
    hireCost: { worker: 1, mine_stone: 8, bread: 6, mine_coal: 4 },
    maxCount: 3,
    // Stacks with Dren on mine_stone — multiple thresholds combine.
    // Catalog: more aggressive trim than Dren (max 3 hires × 1 ea).
    abilities: [
      { id: "threshold_reduce", params: { target: "mine_cobble", amount: 3 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Levers cobble out of the rough quarry walls. Trims the cobble chain so paths come together fast.",
  },
  {
    id: "coal_miner",
    name: "Kira",
    role: "Coal Miner",
    iconKey: "ui_star",
    color: "#1a1a1a",
    wage: 28,
    hireCost: { worker: 1, mine_coal: 8, bread: 8, mine_ingot: 2 },
    maxCount: 2,
    abilities: [
      { id: "threshold_reduce", params: { target: "mine_coal", amount: 2 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Hauls coal from cramped seams. Lowers the chain length needed to bring up coal tiles.",
  },
  {
    id: "jeweler",
    name: "Adelmo",
    role: "Jeweler",
    iconKey: "ui_star",
    color: "#65e5ff",
    wage: 50,
    hireCost: { worker: 1, mine_gem: 4, mine_ingot: 4, bread: 12 },
    maxCount: 2,
    // Trims the high-tier gem chain (5 → 3 at max). Pairs naturally with
    // Geologist (poolWeight on mine_gem) for crown plays.
    abilities: [
      { id: "threshold_reduce", params: { target: "mine_gem", amount: 2 } },
    ],
    requirement: { building: "forge", orLevel: 6 },
    description: "Cuts and sets gems with a steady hand. Shortens the chain needed to lift cut-gem grade stones.",
  },
  {
    id: "digger",
    name: "Bertil",
    role: "Digger",
    iconKey: "ui_devtools",
    color: "#7a6850",
    wage: 18,
    hireCost: { worker: 1, mine_dirt: 8, bread: 6 },
    maxCount: 4,
    // Broad pool boost: more dirt + stone tiles in the rotation.
    abilities: [
      { id: "pool_weight", params: { target: "mine_dirt", amount: 1 } },
      { id: "pool_weight", params: { target: "mine_stone", amount: 1 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Hands like shovels. Keeps the rough fill flowing — extra dirt and stone every shift.",
  },
  {
    id: "excavator",
    name: "Mira_E",
    role: "Excavator",
    iconKey: "ui_star",
    color: "#8a6a3a",
    wage: 35,
    hireCost: { worker: 1, mine_stone: 10, bread: 8, mine_coke: 4 },
    maxCount: 2,
    // Bonus yield on cobble: +1 cobble per stone-chain (whose upgrade is cobble).
    abilities: [
      { id: "bonus_yield", params: { target: "mine_cobble", amount: 1 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Drives the great pit-bucket. Lifts an extra cobble out of every stone chain.",
  },

  // ── Mine workers — catalog §9 (second batch) ────────────────────────────
  {
    id: "iron_miner",
    name: "Bask",
    role: "Iron Miner",
    iconKey: "ui_star",
    color: "#a89878",
    wage: 32,
    hireCost: { worker: 1, mine_ore: 6, bread: 8, mine_coal: 4 },
    maxCount: 2,
    // Adds two ore tiles to the spawn pool — pairs with Osric's threshold cut.
    abilities: [
      { id: "pool_weight_legacy", params: { target: "mine_ore", amount: 2 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Knows iron veins by the rust-streak in the dust. Adds extra ore tiles to the mine pool.",
  },
  {
    id: "silver_miner",
    name: "Eira",
    role: "Silver Miner",
    iconKey: "ui_star",
    color: "#d8d8d0",
    wage: 45,
    hireCost: { worker: 1, mine_gold: 2, bread: 12, mine_ingot: 4 },
    maxCount: 1,
    // Catalog notes silver but our base mine carries gold; gold is rare in
    // the pool, so this worker seeds it. Single-hire cap keeps it precious.
    abilities: [
      { id: "pool_weight_legacy", params: { target: "mine_gold", amount: 1 } },
    ],
    requirement: { building: "forge", orLevel: 6 },
    description: "Sifts pale veins for streaks of bright ore. A single gold tile slips into the mine pool while she works.",
  },
  {
    id: "engineer",
    name: "Tarek",
    role: "Engineer",
    iconKey: "ui_devtools",
    color: "#5a6066",
    wage: 38,
    hireCost: { worker: 1, mine_stone: 8, mine_ingot: 4, bread: 10 },
    maxCount: 2,
    // Mid-tier bonus: extra stone per stone chain — pairs with Stone Miner.
    abilities: [
      { id: "bonus_yield", params: { target: "mine_stone", amount: 1 } },
    ],
    requirement: { building: "forge", orLevel: 5 },
    description: "Plans the shaft braces and rail-tracks. Pulls an extra stone from every quarry chain.",
  },
  {
    id: "alchemist",
    name: "Yana",
    role: "Alchemist",
    iconKey: "ui_star",
    color: "#5a8028",
    wage: 42,
    hireCost: { worker: 1, mine_coal: 6, mine_coke: 2, bread: 10 },
    maxCount: 2,
    // Coal yield bonus — gives the coal chain (used by Castle Coal need) a
    // friendlier ramp without competing with Coal Miner's threshold trim.
    abilities: [
      { id: "bonus_yield", params: { target: "mine_coal", amount: 1 } },
    ],
    requirement: { building: "forge", orLevel: 5 },
    description: "Distils coal-tar and refines coke. Lifts a stray lump of coal from every soot chain.",
  },
  {
    id: "sculptor",
    name: "Lior",
    role: "Sculptor",
    iconKey: "ui_star",
    color: "#7c8388",
    wage: 30,
    hireCost: { worker: 1, mine_block: 2, bread: 8, mine_ingot: 2 },
    maxCount: 1,
    // High-tier season bonus: stone-faced patrons pay for finished work.
    abilities: [
      { id: "season_bonus", params: { resource: "coins", amount: 50 } },
    ],
    requirement: { building: "forge", orLevel: 6 },
    description: "Carves dressed-stone facades for the trade hall. Patrons drop extra coin into the season's coffer.",
  },

  // ── Catalog §9 farm leftovers — Peasant + Lumberjack ───────────────────
  {
    id: "peasant",
    name: "Else",
    role: "Peasant",
    iconKey: "grass_hay",
    color: "#7ec63d",
    wage: 12,
    hireCost: { worker: 1, grass_hay: 6, bread: 4 },
    maxCount: 3,
    abilities: [
      { id: "bonus_yield", params: { target: "grass_hay", amount: 1 } },
    ],
    requirement: { building: "granary" },
    description: "Stoops in the meadow at dawn with a small sickle. Pulls an extra bale from every hay chain.",
  },
  {
    id: "lumberjack",
    name: "Stig",
    role: "Lumberjack",
    iconKey: "ui_star",
    color: "#7a4f24",
    wage: 22,
    hireCost: { worker: 1, wood_log: 8, bread: 8 },
    maxCount: 2,
    // Bonus_yield on tree_oak — the catalog's "1 tree = 1 wood" cleanly
    // realised as "extra log per oak chain" in our chain model.
    abilities: [
      { id: "bonus_yield", params: { target: "tree_oak", amount: 1 } },
    ],
    requirement: { building: "inn", orLevel: 4 },
    description: "Splits oaks at the woodline before the sun climbs. Drops an extra log into every tree chain.",
  },

  // ── Hazard-counter workers (catalog §9: Ratcatcher / Sapper) ────────────
  {
    id: "ratcatcher",
    name: "Wenna",
    role: "Ratcatcher",
    iconKey: "ui_star",
    color: "#5a4838",
    wage: 18,
    hireCost: { worker: 1, grass_hay: 6, bread: 6 },
    maxCount: 2,
    // 2× rat-clear coin payout at max hire (per-hire +0.5).
    abilities: [
      { id: "hazard_coin_multiplier", params: { hazard: "rats", multiplier: 2.0 } },
    ],
    requirement: { building: "inn" },
    description: "Pads silent through the granary at dusk. Doubles the bounty on every cleared rat-pack.",
  },
  {
    id: "sapper",
    name: "Yarek",
    role: "Sapper",
    iconKey: "ui_star",
    color: "#5a3a14",
    wage: 22,
    hireCost: { worker: 1, mine_coal: 4, bread: 8, mine_ingot: 2 },
    maxCount: 2,
    // Mirrors Canary's gas_vent reduce, applied to cave_in instead.
    abilities: [
      { id: "hazard_spawn_reduce", params: { hazard: "cave_in", amount: 0.6 } },
    ],
    requirement: { biomeUnlocked: "mine" },
    description: "Reads the timber creak before the roof drops. Cuts cave-in spawn rate in half.",
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
