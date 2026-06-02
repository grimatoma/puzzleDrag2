// Story Tree Editor — shared type vocabulary.
//
// These types describe the canonical shapes used by the story editor:
// beats, choices, the `draft` doc that flows through localStorage, and
// the derived graph the canvas consumes. The runtime data is dynamic
// (driven by both built-in STORY_BEATS and author-edited overrides) so
// some fields are `unknown` and require narrowing at call sites.

import type { CSSProperties } from "react";
import type { Beat as RuntimeBeat, BeatChoice as RuntimeChoice, ChoiceOutcome as RuntimeOutcome, BeatLine as RuntimeBeatLine, BeatSideEffects as RuntimeOnComplete, BeatTrigger as RuntimeTrigger } from "../story.js";

// ─── NPC identity ────────────────────────────────────────────────────────────

export type NpcKey = "wren" | "mira" | "tomas" | "bram" | "liss";

export interface NpcInfo {
  name: string;
  initial: string;
  look: {
    color: string;
    bg: string;
    iconKey: string;
  };
}

export type NpcRegistry = Record<NpcKey, NpcInfo>;

// ─── Trigger / outcome vocabularies ──────────────────────────────────────────

export type StoryActNumber = 1 | 2 | 3;

export interface BondDelta {
  npc: string;
  amount: number;
}

/**
 * Whitelisted choice outcome. Mirrors the runtime ChoiceOutcome so the
 * editor and the game agree on field names.
 */
export type StoryOutcome = RuntimeOutcome;
export type StoryChoice = RuntimeChoice;
export type StoryTrigger = RuntimeTrigger;
export type StoryLine = RuntimeBeatLine;
export type StoryOnComplete = RuntimeOnComplete;

export interface StoryPrompt {
  kind?: string;
  zoneId?: string;
  placeholder?: string;
  buttonLabel?: string;
}

/**
 * A story beat — the unit of authored dialogue. Built-ins live in
 * src/story.ts; draft beats sit in `draft.story.newBeats`; overrides
 * sit in `draft.story.beats[id]` and get layered onto a built-in by
 * `effectiveBeat`. The editor-side type re-exports the runtime
 * `Beat` interface so beat data flows freely between the two
 * (assignable in both directions because the index signature is
 * `[key: string]: unknown`).
 */
export type StoryBeat = RuntimeBeat & {
  side?: boolean;
  resolution?: boolean;
  draft?: boolean;
  prompt?: StoryPrompt;
};

// ─── Draft document (localStorage shape) ─────────────────────────────────────

/** Patch overlay for a built-in beat. Only fields you want to override. */
export type StoryBeatPatch = Partial<StoryBeat> | { choices?: Record<string, { label?: string }> | StoryChoice[] };

export interface StoryDraftSlice {
  beats?: Record<string, StoryBeatPatch>;
  newBeats?: StoryBeat[];
  suppressedBeats?: string[];
  repeatCooldowns?: Record<string, number>;
}

export interface StoryFlagOverrides {
  new?: { id?: string }[];
  byId?: Record<string, unknown>;
}

/**
 * The shape of the editable draft document (`hearth.balance.draft`).
 * Most fields are typed as Record<string, unknown> because they're
 * pass-through for other editors; the story editor only cares about
 * `story` and `flags`.
 */
export interface StoryDraft {
  version?: number;
  story?: StoryDraftSlice;
  flags?: StoryFlagOverrides;
  [key: string]: unknown;
}

// ─── Validation warnings ─────────────────────────────────────────────────────

export type StoryWarningType =
  | "missingBeat"
  | "unknownFlag"
  | "orphanBeat"
  | "emptyBeat"
  | "duplicateChoice"
  | "emptyChoiceLabel"
  | "triggerLoop";

export interface StoryWarning {
  type: StoryWarningType;
  message: string;
  target?: string;
  choiceId?: string;
  flag?: string;
}

export interface StoryWarningContext {
  ids?: Set<string>;
  knownFlags?: Set<string>;
  beatIndex?: Map<string, StoryBeat>;
  incomingTargets?: Set<string>;
}

export interface GroupedStoryWarningItem {
  beatId: string;
  warning: StoryWarning;
}

export interface GroupedStoryWarningGroup {
  type: StoryWarningType | string;
  label: string;
  hint: string;
  items: GroupedStoryWarningItem[];
}

// ─── Graph / canvas geometry ─────────────────────────────────────────────────

export interface StoryNodePosition {
  x: number;
  y: number;
}

export interface StoryNode extends StoryNodePosition {
  id: string;
  w: number;
  h: number;
  branching: boolean;
  expanded: boolean;
  draft: boolean;
}

export interface StoryEdge {
  from: string;
  to: string;
  kind: "trigger" | "choice";
  side?: boolean;
  choice?: string;
}

export interface StoryGraphBounds {
  w: number;
  h: number;
}

export interface StoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
  bounds: StoryGraphBounds;
}

export interface VisibleStoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
  hiddenCounts: Record<string, number>;
}

// ─── Common results ─────────────────────────────────────────────────────────

export interface DraftBeatIdValidation {
  ok: boolean;
  id: string;
  message?: string;
}

export interface RenameDraftBeatResult {
  draft: StoryDraft;
  ok: boolean;
  id?: string;
  changed?: boolean;
  message?: string;
}

export interface IncomingChoice {
  parentId: string;
  parent: StoryBeat | null;
  choice: StoryChoice;
}

export interface TriggerSummary {
  icon: string;
  label: string;
  kind: "trigger" | "queued-code";
}

// ─── Preview / simulation state ──────────────────────────────────────────────

export interface PreviewState {
  flags: Record<string, boolean>;
  bonds: Record<string, number>;
  resources: Record<string, number>;
  heirlooms: Record<string, number>;
  coins: number;
  embers: number;
  coreIngots: number;
  gems: number;
}

// ─── Plays / paths ──────────────────────────────────────────────────────────

export type TerminalReason =
  | "ends-here"
  | "no-target"
  | "loop"
  | "depth-cap"
  | "missing-target";

export interface PathChoiceCrumb {
  beatId: string;
  choiceId: string;
  label: string;
}

export interface PathEffectAggregate {
  coins: number;
  embers: number;
  coreIngots: number;
  gems: number;
  bondDeltas: Record<string, number>;
  flagsSet: string[];
  flagsCleared: string[];
  resourceDeltas: Record<string, number>;
  heirloomDeltas: Record<string, number>;
}

export interface StoryPath {
  beats: string[];
  choices: PathChoiceCrumb[];
  terminalBeat: string;
  terminalReason: TerminalReason;
  effects: PathEffectAggregate;
}

export interface PlaythroughStep {
  beatId: string;
  beatTitle: string;
  chosen: { id: string; label: string } | null;
}

export interface PlaythroughFinalState {
  coins: number;
  embers: number;
  coreIngots: number;
  gems: number;
  bonds: Record<string, number>;
  flagsSet: string[];
  flagsCleared: string[];
}

export interface PlaythroughResult {
  strategy: string;
  steps: PlaythroughStep[];
  finalState: PlaythroughFinalState;
  terminalReason: TerminalReason;
  label?: string;
}

// ─── Find / replace ──────────────────────────────────────────────────────────

export type FindField = "title" | "body" | "line" | "choice";

export interface FindMatch {
  beatId: string;
  beatTitle: string;
  field: FindField;
  index: number | null;
  text: string;
  count: number;
  snippet: string;
  speaker?: string | null;
  choiceId?: string | null;
}

export interface FindResult {
  matches: FindMatch[];
  total: number;
}

// ─── Bond timeline ──────────────────────────────────────────────────────────

export interface BondTimelineStop {
  beatId: string;
  beatTitle: string;
  choiceId: string;
  choiceLabel: string;
  amount: number;
  running: number;
  act: number | null;
}

export interface BondTimelineRow {
  npc: string;
  total: number;
  max: number;
  min: number;
  stops: BondTimelineStop[];
}

// ─── Outcome heatmap ────────────────────────────────────────────────────────

export type HeatmapBucket = "act1" | "act2" | "act3" | "side" | "draft";

export type HeatmapBucketCounts = Record<HeatmapBucket, number>;

export interface OutcomeHeatmap {
  buckets: HeatmapBucket[];
  counts: {
    coins: HeatmapBucketCounts;
    embers: HeatmapBucketCounts;
    coreIngots: HeatmapBucketCounts;
    gems: HeatmapBucketCounts;
    setFlags: HeatmapBucketCounts;
    clearFlags: HeatmapBucketCounts;
  };
  totals: {
    coins: number;
    embers: number;
    coreIngots: number;
    gems: number;
    setFlags: number;
    clearFlags: number;
  };
  bondPerNpc: Record<string, HeatmapBucketCounts>;
  choiceCounts: HeatmapBucketCounts;
}

// ─── React style + element passthrough ──────────────────────────────────────

export type ReactCSS = CSSProperties;
