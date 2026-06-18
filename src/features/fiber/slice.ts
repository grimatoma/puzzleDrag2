/**
 * Fiber Crush feature slice — owns `state.fiber` (the level-progression + the
 * active-level run). The board verb itself is the pure resolver in
 * `src/game/fiber/`; this slice only lands its results in the *real* economy
 * (coins + zone inventory), exactly like the rest of the game.
 *
 * SLICE FOOTGUN: every `FIBER/*` action below is owned exclusively by this
 * slice (coreReducer does not handle them). They MUST be listed in
 * `SLICE_PRIMARY_ACTIONS` in src/state.ts AND this slice MUST be in the
 * `slices` array there, or the reducer no-ops and these never run. See
 * the `check-slice-action` skill.
 */
import type { Action, GameState, FiberSliceState, FiberActiveLevel } from "../../types/state.js";
import { inventoryZone, zoneInventory } from "../../state/zoneInventory.js";
import { addCappedResourceMut } from "../../state/helpers.js";
import { currentCap } from "../../utils.js";
import {
  FIBER_LEVELS,
  fiberLevelById,
  emptyProgress,
  applyResolveToProgress,
  evaluateLevel,
  computeStars,
} from "../../game/fiber/levels.js";

export function defaultFiberState(): FiberSliceState {
  return { unlockedLevel: 1, stars: {}, active: null };
}

export const initial = { fiber: defaultFiberState() };

/** 1-based ordinal of a level in the authored list (L1 → 1). 0 if unknown. */
function levelOrdinal(levelId: string): number {
  const idx = FIBER_LEVELS.findIndex((l) => l.id === levelId);
  return idx < 0 ? 0 : idx + 1;
}

function fiberState(state: GameState): FiberSliceState {
  return state.fiber ?? defaultFiberState();
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "FIBER/START_LEVEL": {
      const levelId = (action as { levelId?: string }).levelId;
      if (!levelId) return state;
      const level = fiberLevelById(levelId);
      if (!level) return state;
      const fiber = fiberState(state);
      // Gate: can only start a level that's been unlocked.
      if (levelOrdinal(levelId) > fiber.unlockedLevel) return state;
      const active: FiberActiveLevel = {
        levelId,
        movesLeft: level.moves,
        movesUsed: 0,
        progress: emptyProgress(),
        status: "playing",
      };
      return { ...state, fiber: { ...fiber, active } };
    }

    case "FIBER/RESOLVE_MOVE": {
      const fiber = fiberState(state);
      const active = fiber.active;
      if (!active || active.status !== "playing") return state;
      const level = fiberLevelById(active.levelId);
      if (!level) return state;
      const payload = (action as {
        payload?: {
          cleared?: Partial<Record<string, number>>;
          created?: Partial<Record<string, number>>;
          movesSpent?: number;
        };
      }).payload ?? {};
      const cleared = {
        white: payload.cleared?.white ?? 0,
        grey: payload.cleared?.grey ?? 0,
        brown: payload.cleared?.brown ?? 0,
        black: payload.cleared?.black ?? 0,
        cream: payload.cleared?.cream ?? 0,
      };
      const created = {
        spindle: payload.created?.spindle ?? 0,
        loom: payload.created?.loom ?? 0,
        dyevat: payload.created?.dyevat ?? 0,
      };
      const movesSpent = Math.max(1, Math.floor(payload.movesSpent ?? 1));
      const progress = applyResolveToProgress(active.progress, { cleared, created });
      const movesUsed = active.movesUsed + movesSpent;
      const status = evaluateLevel(level, progress, movesUsed);
      return {
        ...state,
        fiber: {
          ...fiber,
          active: {
            ...active,
            progress,
            movesUsed,
            movesLeft: Math.max(0, level.moves - movesUsed),
            status,
          },
        },
      };
    }

    case "FIBER/COMPLETE_LEVEL": {
      const a = action as { levelId?: string; won?: boolean; stars?: number };
      const levelId = a.levelId;
      if (!levelId) return state;
      const level = fiberLevelById(levelId);
      if (!level) return state;
      const fiber = fiberState(state);

      // A loss credits nothing — just clear the active run. No active run to
      // clear → true referential no-op.
      if (!a.won) {
        if (!fiber.active) return state;
        return { ...state, fiber: { ...fiber, active: null } };
      }

      const ordinal = levelOrdinal(levelId);
      // First clear of this level grants coins + resources + unlock. Re-clearing
      // an already-cleared level grants stars only (idempotent — no coin farming).
      const firstClear = fiber.unlockedLevel <= ordinal;

      const stars = Math.max(fiber.stars[levelId] ?? 0, a.stars ?? computeStars(level, level.moves));
      const nextFiber: FiberSliceState = {
        ...fiber,
        stars: { ...fiber.stars, [levelId]: stars },
        active: null,
      };

      if (!firstClear) {
        return { ...state, fiber: nextFiber };
      }

      // Land the reward in the SAME coins + zone inventory the rest of the game
      // reads — Fiber is not a private currency.
      nextFiber.unlockedLevel = Math.max(fiber.unlockedLevel, ordinal + 1);
      const zone = inventoryZone(state);
      const inv = { ...zoneInventory(state, zone) };
      const cap = currentCap(state) ?? 200;
      const capFloaters: Record<string, unknown> = {};
      for (const [key, amount] of Object.entries(level.reward.resources)) {
        addCappedResourceMut(inv, capFloaters, null, key, amount, cap);
      }
      return {
        ...state,
        coins: (state.coins ?? 0) + (level.reward.coins ?? 0),
        inventory: { ...state.inventory, [zone]: inv },
        fiber: nextFiber,
      };
    }

    case "FIBER/EXIT": {
      const fiber = fiberState(state);
      if (!fiber.active && state.view !== "fiber") return state;
      return { ...state, view: "town", fiber: { ...fiber, active: null } };
    }

    default:
      return state;
  }
}
