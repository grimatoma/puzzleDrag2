import { allBeatIds, effectiveBeat, NPCS } from "./shared.jsx";
import { evaluate } from "../config/progression/conditions.js";
import { buildFactSnapshot } from "../config/progression/storyBridge.js";
import type { NpcRegistry, PreviewState, StoryBeat, StoryChoice, StoryDraft } from "./types.js";

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : (typeof v === "string" && v ? [v] : []));

function clampNonNegative(n: number): number {
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

export function blankPreviewState(npcs: NpcRegistry = NPCS): PreviewState {
  const bonds: Record<string, number> = {};
  for (const k of Object.keys(npcs || {})) bonds[k] = 5;
  return {
    flags: {},
    bonds,
    resources: {},
    heirlooms: {},
    coins: 0,
    embers: 0,
    coreIngots: 0,
    gems: 0,
  };
}

export function applyFlagList(flags: Record<string, boolean>, value: unknown, on: boolean): Record<string, boolean> {
  const next = { ...flags };
  for (const f of arr(value)) next[f] = on;
  return next;
}

function addMapValues(base: Record<string, number> | undefined, values: unknown): Record<string, number> {
  const next: Record<string, number> = { ...(base || {}) };
  if (!values || typeof values !== "object") return next;
  for (const [key, amount] of Object.entries(values as Record<string, unknown>)) {
    if (!Number.isFinite(amount)) continue;
    next[key] = clampNonNegative((next[key] ?? 0) + (amount as number));
  }
  return next;
}

export function applyPreviewEffects(sim: PreviewState | null | undefined, beat: StoryBeat | null | undefined, choice: StoryChoice | null | undefined): PreviewState {
  const base = blankPreviewState();
  const next: PreviewState = {
    ...base,
    ...(sim ?? {}),
    flags: { ...(sim?.flags ?? {}) },
    bonds: { ...(sim?.bonds ?? {}) },
    resources: { ...(sim?.resources ?? {}) },
    heirlooms: { ...(sim?.heirlooms ?? {}) },
  };

  if (beat?.onComplete?.setFlag) next.flags = applyFlagList(next.flags, beat.onComplete.setFlag, true);

  const o = choice?.outcome || {};
  if (o.setFlag) next.flags = applyFlagList(next.flags, o.setFlag, true);
  if (o.clearFlag) next.flags = applyFlagList(next.flags, o.clearFlag, false);
  if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
    const cur = Number.isFinite(next.bonds[o.bondDelta.npc]) ? next.bonds[o.bondDelta.npc] : 5;
    next.bonds[o.bondDelta.npc] = Math.max(0, Math.min(10, cur + o.bondDelta.amount));
  }
  next.resources = addMapValues(next.resources, o.resources);
  next.heirlooms = addMapValues(next.heirlooms, o.heirlooms);
  if (Number.isFinite(o.coins)) next.coins = clampNonNegative((next.coins ?? 0) + (o.coins as number));
  for (const key of ["embers", "coreIngots", "gems"] as const) {
    if (Number.isFinite(o[key])) next[key] = clampNonNegative((next[key] ?? 0) + (o[key] as number));
  }
  return next;
}

export function firstTriggeredByPreviewState(sim: PreviewState | null | undefined, draft: StoryDraft | null | undefined, visited: Set<string> = new Set()): string | null {
  const flags = sim?.flags ?? {};
  const resources = sim?.resources ?? {};
  const bonds = sim?.bonds ?? {};
  // Build a snapshot without event fields — this is a state-change check, not
  // an event-driven check (mirrors how src/story.ts builds snapshots at settle).
  const snapshot = buildFactSnapshot(
    { type: "preview_state_changed" },
    resources,
    flags,
    bonds,
  );
  for (const id of allBeatIds(draft)) {
    if (visited.has(id)) continue;
    const beat = effectiveBeat(id, draft);
    const when = beat?.when ?? (beat?.trigger ? null : null);
    if (!when) continue;
    if (evaluate(when, snapshot)) return id;
  }
  return null;
}

function topEntries(obj: Record<string, unknown> | null | undefined, max: number = 4): string[] {
  return Object.entries(obj || {})
    .filter(([, value]) => value)
    .slice(0, max)
    .map(([key, value]) => `${key}${value === true ? "" : ` ${value}`}`);
}

export function previewStateSummary(sim: PreviewState | null | undefined): string[] {
  const bits: string[] = [];
  const flags = topEntries(Object.fromEntries(Object.entries(sim?.flags ?? {}).filter(([, v]) => v)));
  const resources = topEntries(sim?.resources);
  const heirlooms = topEntries(sim?.heirlooms);
  if (flags.length) bits.push(`flags ${flags.join(", ")}`);
  if (resources.length) bits.push(`resources ${resources.join(", ")}`);
  if (Number.isFinite(sim?.coins) && sim?.coins) bits.push(`coins ${sim.coins}`);
  if (Number.isFinite(sim?.embers) && sim?.embers) bits.push(`embers ${sim.embers}`);
  if (Number.isFinite(sim?.coreIngots) && sim?.coreIngots) bits.push(`core ingots ${sim.coreIngots}`);
  if (Number.isFinite(sim?.gems) && sim?.gems) bits.push(`gems ${sim.gems}`);
  if (heirlooms.length) bits.push(`heirlooms ${heirlooms.join(", ")}`);
  return bits;
}
