/**
 * Helpers for building full {@link GameState} objects in Vitest / Playwright.
 * Prefer `mergeTestState` over passing bare object literals into `gameReducer`
 * so the compiler checks the shape against production types.
 */

import type { Action, BossState, GameState } from "../types/state.js";
import { createFreshState } from "../state/init.js";

/**
 * Shallow-merge patches onto a fresh `GameState` (same spirit as `{ ...createFreshState(), ...patch }`).
 * Later layers override earlier ones. Nested objects are **replaced wholesale** per key
 * (matching the common test pattern `baseState(over) => ({ ...defaults, ...over })`).
 */
export function mergeTestState(...layers: Array<Partial<GameState>>): GameState {
  return Object.assign({}, createFreshState(), ...layers) as GameState;
}

/** Deliberately unsafe cast for defensive-accessor tests that need malformed saves. */
export function unsafeGameState(state: unknown): GameState {
  return state as GameState;
}

/** Cast a loose action object for slice tests that dispatch non-catalog types. */
export function testAction(action: { type: string; [key: string]: unknown }): Action {
  return action as unknown as Action;
}

/** Read {@link GameState.boss} in tests without extra narrowing. */
export function bossOf(state: GameState): BossState | null {
  return state.boss;
}

/** Narrow {@link GameState.story} for flag / queue assertions in slice tests. */
export function storyOf(state: GameState): Record<string, unknown> {
  return state.story;
}

/** Read tutorial sub-state in tests. */
export function tutorialOf(state: GameState): GameState["tutorial"] {
  return state.tutorial;
}

/** Read castle sub-state in tests. */
export function castleOf(state: GameState): GameState["castle"] {
  return state.castle;
}
