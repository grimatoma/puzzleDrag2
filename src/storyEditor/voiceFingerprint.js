// Per-NPC voice fingerprint — collects lexical statistics for each speaker
// across the draft. Lets writers spot consistency drift (e.g. Wren has
// the longest lines, Bram speaks the fewest words per sentence, Liss
// uses 'we' twice as often as everyone else).
//
// Stats reported per NPC (and the narrator):
//   - lineCount
//   - wordCount
//   - charCount
//   - avgLineWords  (mean words per line)
//   - avgWordChars  (mean chars per word, excludes whitespace)
//   - uniqueWords   (lowercased + stripped of trailing punctuation)
//   - vocabularyRatio = uniqueWords / wordCount (a rough "richness" proxy)
//   - topStarts     [{ word, count }, ...] — top-5 first-words of lines
//   - punctMix      { question: n, exclaim: n, period: n, ellipsis: n }
//
// Pure module; no React.

import { effectiveBeat, allBeatIds, NPCS } from "./shared.jsx";

const NARRATOR_KEY = "_narrator";

function tokenize(text) {
  if (typeof text !== "string") return [];
  return text.toLowerCase()
    .replace(/[—–-]+/g, " ")          // dashes → word boundary
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z'0-9]+|[^a-z'0-9]+$/g, ""))
    .filter((w) => w.length > 0);
}

function endingPunctuation(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.endsWith("…")) return "ellipsis";
  if (trimmed.endsWith("...")) return "ellipsis";
  if (trimmed.endsWith("?")) return "question";
  if (trimmed.endsWith("!")) return "exclaim";
  if (trimmed.endsWith(".")) return "period";
  return null;
}

function emptyRow() {
  return {
    lineCount: 0,
    wordCount: 0,
    charCount: 0,
    uniqueWordSet: new Set(),
    firstWords: new Map(),
    punctMix: { question: 0, exclaim: 0, period: 0, ellipsis: 0 },
  };
}

/** Walk every beat and return per-speaker fingerprints (narrator first). */
export function computeVoiceFingerprints(draft) {
  const rows = new Map();
  const ensure = (key) => {
    if (!rows.has(key)) rows.set(key, emptyRow());
    return rows.get(key);
  };

  for (const id of allBeatIds(draft)) {
    const beat = effectiveBeat(id, draft);
    if (!beat || !Array.isArray(beat.lines)) continue;
    for (const line of beat.lines) {
      if (!line || typeof line.text !== "string") continue;
      const text = line.text.trim();
      if (!text) continue;
      const key = line.speaker || NARRATOR_KEY;
      const row = ensure(key);
      row.lineCount += 1;
      const tokens = tokenize(text);
      row.wordCount += tokens.length;
      row.charCount += text.replace(/\s+/g, "").length;
      for (const w of tokens) row.uniqueWordSet.add(w);
      if (tokens[0]) row.firstWords.set(tokens[0], (row.firstWords.get(tokens[0]) || 0) + 1);
      const punct = endingPunctuation(text);
      if (punct) row.punctMix[punct] += 1;
    }
  }

  const result = [];
  for (const [key, row] of rows) {
    const topStarts = [...row.firstWords.entries()]
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));
    result.push({
      key,
      isNarrator: key === NARRATOR_KEY,
      name: key === NARRATOR_KEY ? "Narrator" : (NPCS[key]?.name || key),
      color: key === NARRATOR_KEY ? null : (NPCS[key]?.color || null),
      lineCount: row.lineCount,
      wordCount: row.wordCount,
      charCount: row.charCount,
      avgLineWords: row.lineCount > 0 ? Number((row.wordCount / row.lineCount).toFixed(1)) : 0,
      avgWordChars: row.wordCount > 0 ? Number((row.charCount / row.wordCount).toFixed(1)) : 0,
      uniqueWords: row.uniqueWordSet.size,
      vocabularyRatio: row.wordCount > 0 ? Number((row.uniqueWordSet.size / row.wordCount).toFixed(2)) : 0,
      topStarts,
      punctMix: { ...row.punctMix },
    });
  }
  result.sort((a, b) => (b.wordCount - a.wordCount) || a.name.localeCompare(b.name));
  return result;
}

export const NARRATOR_KEY_NAME = NARRATOR_KEY;
