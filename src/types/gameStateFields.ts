/**
 * Slice-owned root fields merged into {@link GameState} via `...slice.initial`
 * in `createFreshState`. Types are defined here (with type-only imports from
 * feature slices) so `state.ts` stays the single `GameState` declaration site.
 */

import type { RunSummary } from "../features/runSummary/slice.js";
import type { BossState } from "../features/boss/slice.js";
import type { Quest } from "../features/quests/data.js";

/** Legacy 3-slot daily quest rows (spread at root from quests slice `initial`). */
export interface QuestDailyLegacy {
  id: string;
  label: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  reward: { coins?: number; almanacXp?: number; [k: string]: unknown };
  key: string;
}

export interface GameSettings {
  sfxOn?: boolean;
  musicOn?: boolean;
  hapticsOn?: boolean;
  bespokeSeasonWidget?: boolean;
  seasonStripPhaser?: boolean;
  [key: string]: boolean | undefined;
}

export interface TutorialState {
  active: boolean;
  step: number;
  seen: boolean;
}

export interface CastleState {
  contributed: Record<string, number>;
}

export interface FishBiomeState {
  savedField?: unknown;
  tide?: string;
  tideTurn?: number;
}

/** Root fields owned by feature slices (see `src/state/init.ts` spreads). */
export interface SliceRootFields {
  boons: Record<string, boolean>;
  runSummary: RunSummary;
  mapCurrent: string;
  mapVisited: string[];
  mapDiscovered: string[];
  activeZone: string;
  craftedTotals: Record<string, number>;
  boss: BossState | null;
  bossPending: boolean;
  bossMinimized: boolean;
  bossesDefeated: number;
  _bossSeasonCount: number;
  _bossResolvedThisSeason: boolean;
  lastAuditBossAt: number;
  auditBossSeq: number;
  dailies: QuestDailyLegacy[];
  dailyDay: number;
  almanacXp: number;
  almanacTier: number;
  almanacClaimed: number[];
  quests: Quest[];
  trophies: Record<string, unknown>;
  collected: Record<string, number>;
  totalHarvested: number;
  totalChains: number;
  longestChain: number;
  chainsThisSeason: number;
  totalOrders: number;
  totalCrafted: number;
  settings: GameSettings;
  settingsTab: string;
  tutorial: TutorialState;
  castle: CastleState;
  /** Calendar year used by boss rewards / spawn (optional on old saves). */
  year?: number;
}

export type { RunSummary, BossState, Quest };
