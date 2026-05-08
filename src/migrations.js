/**
 * Phase 12.2 — Save schema migrations.
 * SAVE_SCHEMA_VERSION = N means: this build understands save shape vN.
 * Every phase 1..11 that touched the save shape adds exactly one step,
 * plus the Phase 12.5 saved-field slot bump (v11 → v12).
 * Locked rule: migrations are PURE and IDEMPOTENT. No I/O. No mutation.
 */

import { createFreshState } from "./state.js";
import { SAVE_SCHEMA_VERSION as _VERSION } from "./constants.js";

export const SAVE_SCHEMA_VERSION = _VERSION;

function getInitialStoryState() {
  return { act: 1, beat: "act1_arrival", flags: {} };
}

export const MIGRATIONS = [
  // v0 → v1: Phase 1 — chain model swap, gridCols/gridRows persisted
  (s) => ({
    ...s,
    gridCols: s.gridCols ?? 7,
    gridRows: s.gridRows ?? 6,
    chainModel: s.chainModel ?? "threshold",
  }),

  // v1 → v2: Phase 2 — story slice
  (s) => ({
    ...s,
    story: s.story ?? { ...getInitialStoryState() },
  }),

  // v2 → v3: Phase 3 — market, runes, dailyStreak, supplies
  (s) => ({
    ...s,
    market: s.market ?? { drift: {}, lastSeasonRolled: null },
    runes: s.runes ?? 0,
    dailyStreak: s.dailyStreak ?? { day: 0, lastClaim: null },
    supplies: s.supplies ?? 0,
  }),

  // v3 → v4: Phase 4 — workers slice (simple default shape for migrations)
  (s) => ({
    ...s,
    workers: s.workers ?? { hires: {}, debt: 0 },
  }),

  // v4 → v5: Phase 5 — tile collection discovery + active filter (originally "species")
  (s) => ({
    ...s,
    tileCollection: s.tileCollection ?? s.species ?? {
      discovered: [],
      active: {
        grass: "grass_hay", grain: "grain_wheat",
        wood: "wood_log", berry: "berry", bird: "sparrow",
      },
    },
  }),

  // v5 → v6: Phase 6 — npcs.bonds (existing roster, default 5)
  (s) => {
    const roster = s.npcs?.roster ?? ["wren"];
    const bonds = { ...(s.npcs?.bonds ?? {}) };
    for (const id of roster) if (bonds[id] == null) bonds[id] = 5;
    return {
      ...s,
      npcs: {
        ...(s.npcs ?? {}),
        bonds,
        lastGiftSeason: s.npcs?.lastGiftSeason ?? {},
      },
    };
  },

  // v6 → v7: Phase 7 — quests, almanac (level/xp), achievements
  (s) => ({
    ...s,
    quests: s.quests ?? { active: [], claimed: [], rolledFor: null },
    almanac: s.almanac ?? { level: 1, xp: 0 },
    achievements: s.achievements ?? {},
  }),

  // v7 → v8: Phase 8 — boss + weather banner state
  (s) => ({
    ...s,
    boss: s.boss ?? null,
    weather: s.weather ?? { current: "None", rolledForSeason: null },
  }),

  // v8 → v9: Phase 9 — mine biome hazards bag + biome flag
  (s) => ({
    ...s,
    biome: s.biome ?? "farm",
    unlockedBiomes: s.unlockedBiomes ?? { farm: true },
    hazards: {
      caveIn: null,
      gasVent: null,
      ...(s.hazards ?? {}),
      rats: s.hazards?.rats ?? [],
    },
  }),

  // v9 → v10: Phase 10 — farm tools, fertilizer flag, season pool mods
  (s) => ({
    ...s,
    tools: {
      ...(s.tools ?? {}),
      rake: s.tools?.rake ?? 0,
      axe: s.tools?.axe ?? 0,
      fertilizer: s.tools?.fertilizer ?? 0,
    },
    fertilizerActive: s.fertilizerActive ?? false,
  }),

  // v10 → v11: Phase 11 — accessibility / motion / colorblind prefs
  (s) => ({
    ...s,
    prefs: s.prefs ?? {
      colorblind: "off",
      reduceMotion: false,
      keyboardChain: false,
      screenReader: false,
    },
  }),

  // v11 → v12: Phase 12.5 — saved-field slots for Silo/Barn
  (s) => ({
    ...s,
    farm: { ...(s.farm ?? {}), savedField: s.farm?.savedField ?? null },
    mine: { ...(s.mine ?? {}), savedField: s.mine?.savedField ?? null },
  }),

  // v12 → v13: Castle Needs slice — initialize state.castle for older saves
  (s) => ({
    ...s,
    castle: s.castle ?? {
      contributed: { soup: 0, meat: 0, mine_coal: 0, cocoa: 0, ink: 0 },
    },
  }),

  // v13 → v14: Catalog category-prefix rename. The 14 farm-side tile keys
  // get prefixed with their category for clearer namespacing. Old saves
  // need their inventory, tile-collection slice, and pool references
  // remapped — the in-tree code only knows the new names.
  //
  // Mapping:
  //   hay → grass_hay        wheat → grain_wheat       log → wood_log
  //   meadow_grass → grass_meadow                       plank → wood_plank
  //   spiky_grass → grass_spiky    flour → grain_flour  beam → wood_beam
  //   egg → bird_egg         turkey → bird_turkey       clover → bird_clover
  //   melon → bird_melon
  //   (jam stays paired with berry — both keep prefixes via berry_jam)
  //
  // Idempotent: re-running on an already-migrated save is a no-op because
  // none of the old keys remain.
  (s) => {
    const RENAME = {
      hay: "grass_hay", meadow_grass: "grass_meadow", spiky_grass: "grass_spiky",
      wheat: "grain_wheat", flour: "grain_flour",
      log: "wood_log", plank: "wood_plank", beam: "wood_beam",
      jam: "berry_jam",
      egg: "bird_egg", turkey: "bird_turkey", clover: "bird_clover", melon: "bird_melon",
    };
    const remap = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[RENAME[k] ?? k] = v;
      }
      return out;
    };
    const next = { ...s };
    if (s.inventory) next.inventory = remap(s.inventory);
    if (s.tileCollection) {
      next.tileCollection = {
        ...s.tileCollection,
        discovered: remap(s.tileCollection.discovered),
        researchProgress: remap(s.tileCollection.researchProgress),
        activeByCategory: Object.fromEntries(
          Object.entries(s.tileCollection.activeByCategory ?? {})
            .map(([cat, val]) => [cat, RENAME[val] ?? val]),
        ),
      };
    }
    return next;
  },

  // v14 → v15: Mine-side category prefix rename.
  //
  // Mapping:
  //   stone → mine_stone     ore → mine_ore        gem → mine_gem
  //   cobble → mine_cobble   ingot → mine_ingot    cutgem → mine_cutgem
  //   block → mine_block     coal → mine_coal      gold → mine_gold
  //                          coke → mine_coke      dirt → mine_dirt
  //
  // Castle `contributed.coal` need-key stays unchanged; only the inventory
  // resource key gets remapped (CASTLE_NEEDS.coal.resource = "mine_coal").
  //
  // Idempotent: re-running on an already-migrated save is a no-op because
  // none of the old mine keys remain in inventory.
  (s) => {
    const RENAME = {
      stone: "mine_stone", cobble: "mine_cobble", block: "mine_block",
      ore: "mine_ore", ingot: "mine_ingot",
      coal: "mine_coal", coke: "mine_coke",
      gem: "mine_gem", cutgem: "mine_cutgem",
      gold: "mine_gold", dirt: "mine_dirt",
    };
    const remap = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[RENAME[k] ?? k] = v;
      }
      return out;
    };
    const next = { ...s };
    if (s.inventory) next.inventory = remap(s.inventory);
    if (s.tileCollection) {
      next.tileCollection = {
        ...s.tileCollection,
        discovered: remap(s.tileCollection.discovered),
        researchProgress: remap(s.tileCollection.researchProgress),
        activeByCategory: Object.fromEntries(
          Object.entries(s.tileCollection.activeByCategory ?? {})
            .map(([cat, val]) => [cat, RENAME[val] ?? val]),
        ),
      };
    }
    return next;
  },

  // v15 → v16: Bird and vegetable category prefix rename. Brings the
  // remaining unprefixed farm-side species into the same scheme as PR #194
  // (farm) / PR #204 (mine).
  //
  // Mapping:
  //   pheasant → bird_pheasant       chicken → bird_chicken
  //   hen → bird_hen                 rooster → bird_rooster
  //   wild_goose → bird_wild_goose   goose → bird_goose
  //   parrot → bird_parrot           phoenix → bird_phoenix
  //   dodo → bird_dodo               pig_in_disguise → bird_pig_in_disguise
  //   carrot → veg_carrot            eggplant → veg_eggplant
  //   turnip → veg_turnip            beet → veg_beet
  //   cucumber → veg_cucumber        squash → veg_squash
  //   mushroom → veg_mushroom        pepper → veg_pepper
  //   broccoli → veg_broccoli
  //
  // Idempotent: re-running on a migrated save is a no-op (no old keys left).
  (s) => {
    const RENAME = {
      pheasant: "bird_pheasant", chicken: "bird_chicken", hen: "bird_hen",
      rooster: "bird_rooster", wild_goose: "bird_wild_goose", goose: "bird_goose",
      parrot: "bird_parrot", phoenix: "bird_phoenix", dodo: "bird_dodo",
      pig_in_disguise: "bird_pig_in_disguise",
      carrot: "veg_carrot", eggplant: "veg_eggplant", turnip: "veg_turnip",
      beet: "veg_beet", cucumber: "veg_cucumber", squash: "veg_squash",
      mushroom: "veg_mushroom", pepper: "veg_pepper", broccoli: "veg_broccoli",
    };
    const remap = (obj) => {
      if (!obj || typeof obj !== "object") return obj;
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[RENAME[k] ?? k] = v;
      }
      return out;
    };
    const next = { ...s };
    if (s.inventory) next.inventory = remap(s.inventory);
    if (s.tileCollection) {
      next.tileCollection = {
        ...s.tileCollection,
        discovered: remap(s.tileCollection.discovered),
        researchProgress: remap(s.tileCollection.researchProgress),
        activeByCategory: Object.fromEntries(
          Object.entries(s.tileCollection.activeByCategory ?? {})
            .map(([cat, val]) => [cat, RENAME[val] ?? val]),
        ),
      };
    }
    return next;
  },
];

function isCorrupted(raw) {
  if (raw == null || typeof raw !== "object") return "not an object";
  if (typeof raw.inventory !== "object") return "no inventory";
  return null;
}

/**
 * Migrate a raw parsed save to the current schema version.
 * Returns { state, migratedFrom, version }.
 * On corruption, falls back to createFreshState() with a console.warn.
 */
export function migrateSave(raw) {
  const reason = isCorrupted(raw);
  if (reason) {
    console.warn(`[save] corrupted, starting fresh: ${reason}`);
    return {
      state: createFreshState(),
      migratedFrom: -1,
      version: SAVE_SCHEMA_VERSION,
    };
  }
  let state = raw;
  const from = state.version ?? 0;
  for (let v = from; v < SAVE_SCHEMA_VERSION; v++) {
    try {
      state = MIGRATIONS[v]({ ...state });
    } catch (e) {
      console.warn(`[save] migration v${v}→v${v + 1} failed: ${e.message}`);
      return {
        state: createFreshState(),
        migratedFrom: from,
        version: SAVE_SCHEMA_VERSION,
      };
    }
  }
  state = { ...state, version: SAVE_SCHEMA_VERSION };
  if (from !== SAVE_SCHEMA_VERSION) {
    console.log(`[save] migrated v${from} → v${SAVE_SCHEMA_VERSION}`);
  }
  return { state, migratedFrom: from, version: SAVE_SCHEMA_VERSION };
}
