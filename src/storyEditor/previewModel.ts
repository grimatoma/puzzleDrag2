import { conditionMatches } from "../story.js";
import { allBeatIds, effectiveBeat, NPCS } from "./shared.jsx";

const arr = (v) => (Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []));

function clampNonNegative(n) {
  return Math.max(0, Number.isFinite(n) ? n : 0);
}

export function blankPreviewState(npcs = NPCS) {
  const bonds = {};
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

export function applyFlagList(flags, value, on) {
  const next = { ...flags };
  for (const f of arr(value)) next[f] = on;
  return next;
}

function addMapValues(base, values) {
  const next = { ...(base || {}) };
  if (!values || typeof values !== "object") return next;
  for (const [key, amount] of Object.entries(values)) {
    if (!Number.isFinite(amount)) continue;
    next[key] = clampNonNegative((next[key] ?? 0) + amount);
  }
  return next;
}

export function applyPreviewEffects(sim, beat, choice) {
  let next = {
    ...blankPreviewState(),
    ...sim,
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
  if (Number.isFinite(o.coins)) next.coins = clampNonNegative((next.coins ?? 0) + o.coins);
  for (const key of ["embers", "coreIngots", "gems"]) {
    if (Number.isFinite(o[key])) next[key] = clampNonNegative((next[key] ?? 0) + o[key]);
  }
  return next;
}

export function firstTriggeredByPreviewState(sim, draft, visited = new Set()) {
  const flags = sim?.flags ?? {};
  const resources = sim?.resources ?? {};
  const bonds = sim?.bonds ?? {};
  for (const id of allBeatIds(draft)) {
    if (visited.has(id)) continue;
    const beat = effectiveBeat(id, draft);
    const trigger = beat?.trigger;
    if (!trigger) continue;
    if (trigger.type === "bond_at_least") {
      if ((bonds[trigger.npc] ?? 0) >= trigger.amount) return id;
      continue;
    }
    if (conditionMatches(trigger, { type: "preview_state_changed" }, resources, flags)) return id;
  }
  return null;
}

function topEntries(obj, max = 4) {
  return Object.entries(obj || {})
    .filter(([, value]) => value)
    .slice(0, max)
    .map(([key, value]) => `${key}${value === true ? "" : ` ${value}`}`);
}

export function previewStateSummary(sim) {
  const bits = [];
  const flags = topEntries(Object.fromEntries(Object.entries(sim?.flags ?? {}).filter(([, v]) => v)));
  const resources = topEntries(sim?.resources);
  const heirlooms = topEntries(sim?.heirlooms);
  if (flags.length) bits.push(`flags ${flags.join(", ")}`);
  if (resources.length) bits.push(`resources ${resources.join(", ")}`);
  if (Number.isFinite(sim?.coins) && sim.coins) bits.push(`coins ${sim.coins}`);
  if (Number.isFinite(sim?.embers) && sim.embers) bits.push(`embers ${sim.embers}`);
  if (Number.isFinite(sim?.coreIngots) && sim.coreIngots) bits.push(`core ingots ${sim.coreIngots}`);
  if (Number.isFinite(sim?.gems) && sim.gems) bits.push(`gems ${sim.gems}`);
  if (heirlooms.length) bits.push(`heirlooms ${heirlooms.join(", ")}`);
  return bits;
}
