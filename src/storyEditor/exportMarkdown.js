// Exports the full story (built-ins + draft overrides + author-created beats)
// as a single markdown screenplay file. Useful when a writer wants to
// proofread the whole arc end-to-end outside the editor, paste it into a
// Google Doc for review, or diff two drafts in plain text.
//
// Layout (per beat):
//
//   ## Act I · The First Harvest — `act1_first_harvest`
//   > **Trigger:** session_start
//   > **Speaker:** Wren — "Took you long enough."
//   > _Narration goes in italics._
//
//   **Choices**
//   - **A.** Stay quiet → `act1_keep_quiet`  *(+1 bond Wren, ⚐ kept_quiet)*
//
// Renders deterministically from a draft + the canonical STORY_BEATS /
// SIDE_BEATS lists (the same ones the canvas reads). Pure function — easy
// to test, no React or DOM dependencies.

import { STORY_BEATS, SIDE_BEATS } from "../story.js";
import { effectiveBeat, allBeatIds, draftBeats, NPCS, triggerSummary, isDraftBeat, effectiveChoices } from "./shared.jsx";

const ACT_LABEL = { 1: "Act I · Roots", 2: "Act II · Iron", 3: "Act III · Kingdom" };

function speakerName(key) {
  if (!key) return "Narrator";
  return NPCS[key]?.name || key;
}

function escapeMd(text) {
  return String(text ?? "").replace(/([_*`<>])/g, "\\$1");
}

function outcomeBadgeBits(outcome) {
  const o = outcome || {};
  const out = [];
  if (o.bondDelta?.npc && Number.isFinite(o.bondDelta.amount)) {
    const sign = o.bondDelta.amount > 0 ? "+" : "";
    out.push(`♥ ${sign}${o.bondDelta.amount} ${speakerName(o.bondDelta.npc)}`);
  }
  if (Number.isFinite(o.coins) && o.coins) out.push(`¢ ${o.coins > 0 ? "+" : ""}${o.coins} coins`);
  if (Number.isFinite(o.embers) && o.embers) out.push(`✸ ${o.embers > 0 ? "+" : ""}${o.embers} embers`);
  if (Number.isFinite(o.coreIngots) && o.coreIngots) out.push(`◈ ${o.coreIngots > 0 ? "+" : ""}${o.coreIngots} core ingots`);
  if (Number.isFinite(o.gems) && o.gems) out.push(`◆ ${o.gems > 0 ? "+" : ""}${o.gems} gems`);
  for (const [key, amount] of Object.entries(o.resources || {})) {
    if (Number.isFinite(amount) && amount) out.push(`${amount > 0 ? "+" : ""}${amount} ${key}`);
  }
  for (const [key, amount] of Object.entries(o.heirlooms || {})) {
    if (Number.isFinite(amount) && amount) out.push(`${amount > 0 ? "+" : ""}${amount} ${key}`);
  }
  for (const flag of asList(o.setFlag)) out.push(`⚐ ${flag}`);
  for (const flag of asList(o.clearFlag)) out.push(`⚑ ${flag} off`);
  return out;
}

const asList = (v) => Array.isArray(v) ? v : (typeof v === "string" && v ? [v] : []);

function renderBeat(beat, beatId, draft, { isDraft = false } = {}) {
  if (!beat) return "";
  const lines = [];
  const titlePart = beat.title || beatId;
  const actLabel = ACT_LABEL[beat.act];
  const headerPrefix = isDraft
    ? "Draft"
    : (beat.side ? "Side" : actLabel || "Beat");
  lines.push(`## ${headerPrefix} · ${escapeMd(titlePart)} — \`${beatId}\``);
  lines.push("");

  const ts = triggerSummary(beat);
  if (ts) lines.push(`> **Trigger:** ${ts.icon} ${escapeMd(ts.label)}`);
  if (beat.scene) lines.push(`> **Scene:** \`${beat.scene}\``);
  if (beat.onComplete?.setFlag) {
    const flags = asList(beat.onComplete.setFlag).map((f) => `\`${f}\``).join(", ");
    if (flags) lines.push(`> **On complete · setFlag:** ${flags}`);
  }
  if (ts || beat.scene || beat.onComplete?.setFlag) lines.push("");

  const beatLines = Array.isArray(beat.lines) ? beat.lines : [];
  if (beatLines.length > 0) {
    for (const line of beatLines) {
      const text = String(line?.text ?? "").trim();
      if (!text) continue;
      if (line?.speaker) {
        lines.push(`> **${escapeMd(speakerName(line.speaker))}:** "${escapeMd(text)}"`);
      } else {
        lines.push(`> _${escapeMd(text)}_`);
      }
    }
    lines.push("");
  } else if (typeof beat.body === "string" && beat.body.trim()) {
    lines.push(`> ${escapeMd(beat.body.trim())}`);
    lines.push("");
  }

  const choices = Array.isArray(beat.choices) ? beat.choices : [];
  if (choices.length > 0) {
    lines.push("**Choices**");
    choices.forEach((c, idx) => {
      const letter = "ABCDEFGH"[idx] || `${idx + 1}`;
      const label = escapeMd(c.label || c.id || "(no label)");
      const target = c.outcome?.queueBeat;
      const badges = outcomeBadgeBits(c.outcome);
      const tail = [];
      if (target) tail.push(`→ \`${target}\``);
      if (badges.length > 0) tail.push(`*(${badges.join(", ")})*`);
      lines.push(`- **${letter}.** ${label}${tail.length ? "  " + tail.join("  ") : ""}`);
    });
    lines.push("");
  } else if (beatLines.length > 0 || beat.body) {
    lines.push("_(no choices · branch ends here)_");
    lines.push("");
  }

  return lines.join("\n");
}

/** Compare two beat ids for ordering: main story by act+position, then sides, then drafts. */
function orderingScore(beatId, draft) {
  const beat = effectiveBeat(beatId, draft);
  if (!beat) return [9, 9999, beatId];
  if (isDraftBeat(draft, beatId)) {
    const idx = draftBeats(draft).findIndex((b) => b.id === beatId);
    return [3, idx, beatId];
  }
  if (beat.side || !beat.act) {
    const idx = SIDE_BEATS.findIndex((b) => b.id === beatId);
    return [2, idx >= 0 ? idx : 999, beatId];
  }
  const idx = STORY_BEATS.findIndex((b) => b.id === beatId);
  return [1, idx >= 0 ? idx : 999, beatId];
}

export function compareBeatOrder(aId, bId, draft) {
  const [aSec, aIdx, aKey] = orderingScore(aId, draft);
  const [bSec, bIdx, bKey] = orderingScore(bId, draft);
  if (aSec !== bSec) return aSec - bSec;
  if (aIdx !== bIdx) return aIdx - bIdx;
  return aKey.localeCompare(bKey);
}

/**
 * Filter beat ids to those reachable from `startBeatId` through queueBeat
 * choices (DFS with cycle detection). Used to scope the markdown export
 * to one branch of the tree.
 */
export function reachableBeatIds(startBeatId, draft) {
  const seen = new Set();
  const stack = [startBeatId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const c of effectiveChoices(id, draft)) {
      const target = c?.outcome?.queueBeat;
      if (typeof target === "string" && !seen.has(target)) stack.push(target);
    }
  }
  return seen;
}

/**
 * Return true if a beat has any dialogue lines spoken by `speakerKey`. A
 * `speakerKey` of `null` matches narrator lines.
 */
function beatMentionsSpeaker(beat, speakerKey) {
  if (!beat || !Array.isArray(beat.lines)) return false;
  for (const line of beat.lines) {
    if (!line || typeof line.text !== "string" || line.text.trim().length === 0) continue;
    if ((line.speaker || null) === speakerKey) return true;
  }
  return false;
}

/**
 * Render every beat in the draft (built-ins, sides, author-created drafts —
 * minus suppressed side beats) as a single markdown document. Sectioned by
 * Act / Side / Drafts so writers can scan straight to the part they're
 * editing.
 *
 * Optional filters in `opts`:
 *   - `speakerKey`: only include beats with ≥1 dialogue line by this speaker
 *     (use `null` for narration-only beats).
 *   - `rootBeatId`: only include beats reachable through queueBeat from this
 *     beat — useful for exporting a single branch.
 */
export function renderStoryMarkdown(draft, opts = {}) {
  const reachable = opts.rootBeatId ? reachableBeatIds(opts.rootBeatId, draft) : null;
  let ids = [...allBeatIds(draft)].sort((a, b) => compareBeatOrder(a, b, draft));
  if (reachable) ids = ids.filter((id) => reachable.has(id));
  if (opts.speakerKey !== undefined) {
    ids = ids.filter((id) => beatMentionsSpeaker(effectiveBeat(id, draft), opts.speakerKey));
  }
  if (ids.length === 0) return "# Hearthlands · Story Script\n\n_(no beats matched the filter)_\n";

  const parts = [];
  parts.push("# Hearthlands · Story Script");
  const filterBits = [];
  if (opts.speakerKey !== undefined) filterBits.push(`speaker: ${opts.speakerKey === null ? "Narrator" : (NPCS[opts.speakerKey]?.name || opts.speakerKey)}`);
  if (opts.rootBeatId) filterBits.push(`branch from \`${opts.rootBeatId}\``);
  parts.push("");
  const filterTag = filterBits.length > 0 ? ` · filtered (${filterBits.join("; ")})` : "";
  parts.push(`_${ids.length} beats · exported from the Story Tree Editor${filterTag}._`);
  parts.push("");

  let currentSection = "";
  for (const id of ids) {
    const beat = effectiveBeat(id, draft);
    if (!beat) continue;
    const isDraft = isDraftBeat(draft, id);
    const section = isDraft
      ? "Drafts (author-created)"
      : (beat.side || !beat.act ? "Side events" : (ACT_LABEL[beat.act] || `Act ${beat.act}`));
    if (section !== currentSection) {
      parts.push(`---\n\n# ${section}\n`);
      currentSection = section;
    }
    parts.push(renderBeat(beat, id, draft, { isDraft }));
  }
  parts.push("");
  return parts.join("\n");
}
