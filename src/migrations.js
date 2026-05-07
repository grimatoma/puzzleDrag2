/**
 * Phase 12.2 — Save schema migrations.
 * SAVE_SCHEMA_VERSION = N means: this build understands save shape vN.
 * Every phase 1..11 that touched the save shape adds exactly one step,
 * plus the Phase 12.5 saved-field slot bump (v11 → v12).
 * Locked rule: migrations are PURE and IDEMPOTENT. No I/O. No mutation.
 */

import { createInitialState } from "./state.js";
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

  // v4 → v5: Phase 5 — species discovery + active filter
  (s) => ({
    ...s,
    species: s.species ?? {
      discovered: [],
      active: {
        grass: "hay", grain: "wheat",
        wood: "log", berry: "berry", bird: "sparrow",
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
];

function isCorrupted(raw) {
  if (raw == null || typeof raw !== "object") return "not an object";
  if (typeof raw.inventory !== "object") return "no inventory";
  return null;
}

/**
 * Migrate a raw parsed save to the current schema version.
 * Returns { state, migratedFrom, version }.
 * On corruption, falls back to createInitialState() with a console.warn.
 */
export function migrateSave(raw) {
  const reason = isCorrupted(raw);
  if (reason) {
    console.warn(`[save] corrupted, starting fresh: ${reason}`);
    return {
      state: createInitialState(),
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
        state: createInitialState(),
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
