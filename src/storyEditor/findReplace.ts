// Global find/replace across story dialogue. Walks every beat and reports
// matches in:
//
//   - beat.title
//   - beat.body (legacy field)
//   - beat.lines[i].text
//   - beat.choices[i].label
//
// Search is case-insensitive substring matching by default; pass
// `{ caseSensitive: true }` for exact case, `{ regex: true }` to treat
// `query` as a regular expression (errors return zero matches).
//
// `applyReplacements` returns a NEW `story` draft slice that overlays the
// replacements on top of every effective beat — the caller folds it back
// into the full draft via the normal `updateDraft` flow.
//
// Pure module; no React.

import { effectiveBeat, allBeatIds, isDraftBeat, draftBeats } from "./shared.jsx";

function makeRegex(query, opts) {
  if (!query) return null;
  try {
    if (opts?.regex) return new RegExp(query, opts.caseSensitive ? "g" : "gi");
    const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, opts?.caseSensitive ? "g" : "gi");
  } catch { return null; }
}

function* iterateText(beat, beatId) {
  if (typeof beat?.title === "string" && beat.title) {
    yield { beatId, field: "title", index: null, text: beat.title };
  }
  if (typeof beat?.body === "string" && beat.body) {
    yield { beatId, field: "body", index: null, text: beat.body };
  }
  if (Array.isArray(beat?.lines)) {
    for (let i = 0; i < beat.lines.length; i += 1) {
      const line = beat.lines[i];
      if (line && typeof line.text === "string" && line.text) {
        yield { beatId, field: "line", index: i, text: line.text, speaker: line.speaker || null };
      }
    }
  }
  if (Array.isArray(beat?.choices)) {
    for (let i = 0; i < beat.choices.length; i += 1) {
      const choice = beat.choices[i];
      if (choice && typeof choice.label === "string" && choice.label) {
        yield { beatId, field: "choice", index: i, text: choice.label, choiceId: choice.id || null };
      }
    }
  }
}

/**
 * Find every occurrence of `query` across the draft. Returns
 * `{ matches: [{ beatId, beatTitle, field, index, text, snippet, count }], total }`.
 * `snippet` is a short excerpt with the match highlighted via the
 * literal sentinel `«…»`, useful for preview rendering.
 */
export function findInStory(draft, query, opts = {}) {
  const re = makeRegex(query, opts);
  if (!re) return { matches: [], total: 0 };
  const matches = [];
  let total = 0;
  for (const id of allBeatIds(draft)) {
    const beat = effectiveBeat(id, draft);
    if (!beat) continue;
    for (const item of iterateText(beat, id)) {
      const localCount = item.text.match(re)?.length || 0;
      if (localCount === 0) continue;
      total += localCount;
      const firstIdx = item.text.search(re);
      const start = Math.max(0, firstIdx - 24);
      const end = Math.min(item.text.length, firstIdx + 64);
      const before = item.text.slice(start, firstIdx);
      const matched = item.text.slice(firstIdx, firstIdx + (item.text.match(re)?.[0]?.length || 0));
      const after = item.text.slice(firstIdx + matched.length, end);
      const snippet = (start > 0 ? "…" : "") + before + "«" + matched + "»" + after + (end < item.text.length ? "…" : "");
      matches.push({
        beatId: id, beatTitle: beat.title || id,
        field: item.field, index: item.index, speaker: item.speaker, choiceId: item.choiceId,
        text: item.text, count: localCount, snippet,
      });
    }
  }
  return { matches, total };
}

function replaceField(beat, field, index, transform) {
  if (field === "title") {
    return { ...beat, title: transform(beat.title || "") };
  }
  if (field === "body") {
    return { ...beat, body: transform(beat.body || "") };
  }
  if (field === "line") {
    const lines = (beat.lines || []).slice();
    if (index >= 0 && index < lines.length) {
      lines[index] = { ...lines[index], text: transform(lines[index].text || "") };
    }
    return { ...beat, lines };
  }
  if (field === "choice") {
    const choices = (beat.choices || []).slice();
    if (index >= 0 && index < choices.length) {
      choices[index] = { ...choices[index], label: transform(choices[index].label || "") };
    }
    return { ...beat, choices };
  }
  return beat;
}

/**
 * Apply `query → replacement` across the matches and return a new draft.
 * For each affected beat the function builds an override patch on top of
 * the effective beat (so built-in beats become balance-draft beats; draft
 * beats are mutated in place inside the newBeats slot).
 *
 * Pass the same `opts` used by `findInStory` so the regex matches.
 */
export function applyReplacements(draft, query, replacement, opts = {}) {
  const re = makeRegex(query, opts);
  if (!re) return draft;
  const result = JSON.parse(JSON.stringify(draft || {}));
  result.story = result.story || {};
  const transform = (text) => text.replace(re, String(replacement ?? ""));
  for (const id of allBeatIds(result)) {
    const beat = effectiveBeat(id, result);
    if (!beat) continue;
    let nextBeat = beat;
    let changed = false;
    for (const item of iterateText(beat, id)) {
      if (!re.test(item.text)) continue;
      nextBeat = replaceField(nextBeat, item.field, item.index, transform);
      changed = true;
    }
    if (!changed) continue;
    // Store the replacement either in newBeats (for draft beats) or as a
    // patch under story.beats[id] (for built-ins / side beats).
    if (isDraftBeat(result, id)) {
      const arr = (result.story.newBeats || []).slice();
      const idx = arr.findIndex((b) => b && b.id === id);
      if (idx >= 0) arr[idx] = nextBeat;
      result.story.newBeats = arr;
    } else {
      result.story.beats = result.story.beats || {};
      const existing = result.story.beats[id] || {};
      const patch = { ...existing };
      if (nextBeat.title !== beat.title || existing.title !== undefined) patch.title = nextBeat.title;
      if (Array.isArray(nextBeat.lines)) patch.lines = nextBeat.lines;
      if (Array.isArray(nextBeat.choices)) patch.choices = nextBeat.choices;
      if (typeof nextBeat.body === "string") patch.body = nextBeat.body;
      result.story.beats[id] = patch;
    }
  }
  return result;
}

/** Convenience: count of unique beats touched by a given query. */
export function affectedBeatCount(findResult) {
  if (!findResult) return 0;
  return new Set(findResult.matches.map((m) => m.beatId)).size;
}

/** Sanity helper used by the panel to gate the Apply button. */
export function isReplacementSafe(query, replacement, opts) {
  if (!query) return false;
  if (opts?.regex) {
    try { new RegExp(query, opts.caseSensitive ? "g" : "gi"); } catch { return false; }
  }
  // Block the no-op case where the replacement is identical to the query
  // (case-insensitive substring would otherwise loop in the user's head).
  if (!opts?.regex && String(replacement) === String(query)) return false;
  return true;
}

export { draftBeats };
