// Story-beat / flag sanitizers.
//
// Pure validators that whitelist untrusted story-beat and flag-trigger input
// down to the known editor vocabulary. Shared by the `/story/` editor (the live
// authoring tool) and any draft that feeds the story system. Each function is
// total: it returns a normalised value or `undefined`/`null` for anything it
// does not recognise — never throws on bad input.
//
// These used to live in `config/applyOverrides.ts` alongside the balance.json
// override-apply pipeline; that pipeline was removed (the canonical constants
// are the single source of truth) but the sanitizers are still needed by the
// story editor, so they live here on their own.

import { isKnownFact } from "./progression/facts.js";
import type { Cond, Op } from "./progression/types.js";

type AnyRecord = Record<string, unknown>;

/** A story flag list value: trims, drops blanks, collapses a 1-element array to a string. */
function sanitizeFlagList(v: unknown): string | string[] | null {
  const arr: unknown[] = Array.isArray(v) ? (v as unknown[]) : (typeof v === "string" ? [v] : []);
  const clean: string[] = [];
  for (const s of arr) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (t.length > 0 && !clean.includes(t)) clean.push(t);
  }
  if (clean.length === 0) return null;
  return clean.length === 1 ? clean[0] : clean;
}

interface BeatLineShape { speaker: string | null; text: string }

/** Normalised dialogue line list, or undefined if empty. */
export function sanitizeBeatLines(raw: unknown): BeatLineShape[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned: BeatLineShape[] = (raw as unknown[])
    .filter((l): l is AnyRecord => !!l && typeof l === "object" && typeof (l as AnyRecord).text === "string" && ((l as AnyRecord).text as string).length > 0)
    .map((l) => ({
      speaker: (typeof l.speaker === "string" && (l.speaker as string).length > 0) ? l.speaker as string : null,
      text: l.text as string,
    }));
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Whitelist a choice `outcome` to the keys the editor exposes:
 *   setFlag / clearFlag (string | string[]), bondDelta { npc, amount },
 *   embers / coreIngots / gems (int), queueBeat (string).
 * Returns undefined if nothing survives.
 */
export function sanitizeChoiceOutcome(raw: unknown): AnyRecord | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as AnyRecord;
  const out: AnyRecord = {};
  const sf = sanitizeFlagList(r.setFlag); if (sf) out.setFlag = sf;
  const cf = sanitizeFlagList(r.clearFlag); if (cf) out.clearFlag = cf;
  if (r.bondDelta && typeof r.bondDelta === "object") {
    const bd = r.bondDelta as AnyRecord;
    if (typeof bd.npc === "string" && (bd.npc as string).length > 0) {
      const amt = Number(bd.amount);
      if (Number.isFinite(amt) && amt !== 0) out.bondDelta = { npc: bd.npc, amount: amt };
    }
  }
  for (const k of ["embers", "coreIngots", "gems"] as const) {
    const n = Number(r[k]);
    if (Number.isFinite(n) && n !== 0) out[k] = Math.trunc(n);
  }
  if (typeof r.queueBeat === "string" && (r.queueBeat as string).trim().length > 0) out.queueBeat = (r.queueBeat as string).trim();
  return Object.keys(out).length === 0 ? undefined : out;
}

interface ChoiceShape { id: string; label: string; outcome?: AnyRecord }

/** Sanitised choice list (array form): `[{ id, label, outcome? }]`. */
export function sanitizeChoiceArray(raw: unknown): ChoiceShape[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChoiceShape[] = [];
  const seen = new Set<string>();
  (raw as unknown[]).forEach((cRaw, i) => {
    if (!cRaw || typeof cRaw !== "object") return;
    const c = cRaw as AnyRecord;
    let id = (typeof c.id === "string" && (c.id as string).trim().length > 0) ? (c.id as string).trim() : `choice_${i + 1}`;
    if (seen.has(id)) id = `${id}_${i + 1}`;
    seen.add(id);
    const choice: ChoiceShape = { id, label: (typeof c.label === "string" && (c.label as string).length > 0) ? c.label as string : "Continue" };
    const outcome = sanitizeChoiceOutcome(c.outcome);
    if (outcome) choice.outcome = outcome;
    out.push(choice);
  });
  return out;
}

/**
 * Sanitise a trigger condition to the known vocabulary — shared by beat triggers
 * (`beat.trigger`, one per beat) and flag triggers (`STORY_FLAGS[i].triggers[]`),
 * since both speak the same language (see `conditionMatches` in src/story.js):
 *   session_start | session_ended | all_buildings_built          (no args)
 *   act_entered          { act }
 *   resource_total       { key, amount }
 *   resource_total_multi { req: { key: amount, … } }
 *   craft_made           { item, count? }
 *   building_built        { id }
 *   boss_defeated        { id }
 *   bond_at_least        { npc, amount }      (state — fires at the next settle)
 *   flag_set / flag_cleared { flag }          (state — checked on the next event)
 * Returns undefined if the shape is unrecognised / incomplete.
 */
export function sanitizeTrigger(raw: unknown): AnyRecord | undefined {
  if (!raw || typeof raw !== "object" || typeof (raw as AnyRecord).type !== "string") return undefined;
  const r = raw as AnyRecord;
  const posInt = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null; };
  const str = (v: unknown): string | null => (typeof v === "string" && (v as string).trim().length > 0 ? (v as string).trim() : null);
  switch (r.type as string) {
    case "session_start":
    case "session_ended":
    case "all_buildings_built":
      return { type: r.type };
    case "act_entered": {
      const act = posInt(r.act); return act ? { type: "act_entered", act } : undefined;
    }
    case "resource_total": {
      const key = str(r.key), amount = posInt(r.amount);
      return key && amount ? { type: "resource_total", key, amount } : undefined;
    }
    case "resource_total_multi": {
      if (!r.req || typeof r.req !== "object") return undefined;
      const req: Record<string, number> = {};
      for (const [k, v] of Object.entries(r.req as AnyRecord)) { const a = posInt(v); if (str(k) && a) req[k] = a; }
      return Object.keys(req).length > 0 ? { type: "resource_total_multi", req } : undefined;
    }
    case "craft_made": {
      const item = str(r.item); if (!item) return undefined;
      const count = posInt(r.count); return count ? { type: "craft_made", item, count } : { type: "craft_made", item };
    }
    case "building_built": {
      const id = str(r.id); return id ? { type: "building_built", id } : undefined;
    }
    case "boss_defeated": {
      const id = str(r.id); return id ? { type: "boss_defeated", id } : undefined;
    }
    case "bond_at_least": {
      const npc = str(r.npc), amount = posInt(r.amount);
      return npc && amount ? { type: "bond_at_least", npc, amount } : undefined;
    }
    case "flag_set":
    case "flag_cleared": {
      const flag = str(r.flag); return flag ? { type: r.type, flag } : undefined;
    }
    default:
      return undefined;
  }
}

// Back-compat aliases — beat triggers (one per beat) and flag triggers (an array
// of triggers) both want the same vocabulary.
export const sanitizeBeatTrigger = sanitizeTrigger;
export const sanitizeFlagTrigger = sanitizeTrigger;

const KNOWN_OPS = new Set<string>(["eq", "ne", "gte", "lte", "gt", "lt", "truthy"]);

/**
 * Defensively sanitise an untrusted `Cond` tree from an editor draft. Returns
 * `undefined` for anything unrecognisable or empty.
 *
 * Accepted shapes (mirrors `src/config/progression/types.ts`):
 *   leaf: `{ fact: string }` where `isKnownFact(fact)` holds, with optional
 *         `op` (one of the engine Op values) and optional `value` (scalar).
 *   `{ all: Cond[] }` / `{ any: Cond[] }` — arrays; invalid elements dropped.
 *   `{ not: Cond }` — the inner Cond is recursively sanitised.
 */
export function sanitizeCond(raw: unknown): Cond | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;

  // ── leaf ──────────────────────────────────────────────────────────────────
  if (typeof r.fact === "string") {
    const fact = (r.fact as string).trim();
    if (!fact || !isKnownFact(fact)) return undefined;
    const leaf: { fact: string; op?: Op; value?: string | number | boolean } = { fact };
    if (r.op !== undefined) {
      if (typeof r.op !== "string" || !KNOWN_OPS.has(r.op as string)) return undefined;
      leaf.op = r.op as Op;
    }
    if (r.value !== undefined) {
      const v = r.value;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        leaf.value = v;
      }
      // anything else (object, array, null) → reject the leaf
      else return undefined;
    }
    return leaf;
  }

  // ── all / any ─────────────────────────────────────────────────────────────
  for (const k of ["all", "any"] as const) {
    if (k in r) {
      if (!Array.isArray(r[k])) return undefined;
      const children: Cond[] = (r[k] as unknown[])
        .map((c) => sanitizeCond(c))
        .filter((c): c is Cond => c !== undefined);
      if (children.length === 0) return undefined;
      return { [k]: children } as Cond;
    }
  }

  // ── not ───────────────────────────────────────────────────────────────────
  if ("not" in r) {
    const inner = sanitizeCond(r.not);
    if (!inner) return undefined;
    return { not: inner };
  }

  return undefined;
}

/** `repeat` field on a beat: true (re-fires) or undefined (one-shot). */
export function sanitizeBeatRepeat(raw: unknown): true | undefined {
  return raw === true ? true : undefined;
}

/** Optional repeat cooldown, measured in story-evaluation events after fire. */
export function sanitizeBeatRepeatCooldown(raw: unknown): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

/** Sanitised array of flag triggers (drops bad entries). */
export function sanitizeFlagTriggerArray(raw: unknown): AnyRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AnyRecord[] = [];
  for (const t of raw as unknown[]) { const s = sanitizeFlagTrigger(t); if (s) out.push(s); }
  return out;
}

/** Sanitised `onComplete` — only `setFlag` is editable from the /story/ editor. */
export function sanitizeBeatOnComplete(raw: unknown): { setFlag: string | string[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const sf = sanitizeFlagList((raw as AnyRecord).setFlag);
  return sf ? { setFlag: sf } : undefined;
}
