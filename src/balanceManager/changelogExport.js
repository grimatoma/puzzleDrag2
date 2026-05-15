// Markdown changelog generator — turns a draftDiff(baseline, draft)
// result into a human-readable Markdown summary suitable for a PR
// description, release note, or in-team Slack post. Each section
// becomes a heading; each entry is a bullet showing the key + a
// terse before/after value for primitives, "<n keys>" / "{...}" for
// objects.

import { draftDiff } from "./diff.js";

function formatValue(value) {
  if (value === undefined) return "_(missing)_";
  if (value === null) return "_(null)_";
  if (typeof value === "number") return `\`${value}\``;
  if (typeof value === "string") return value.length > 64 ? `\`${value.slice(0, 60)}…\`` : `\`${value}\``;
  if (typeof value === "boolean") return `\`${value}\``;
  if (Array.isArray(value)) return `\`[${value.length}]\``;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "`{}`";
    if (keys.length <= 3) return `\`{${keys.join(", ")}}\``;
    return `\`{${keys.length} keys}\``;
  }
  return `\`${String(value)}\``;
}

function bulletForAdded(entry) {
  return `- **+** \`${entry.key}\` → ${formatValue(entry.value)}`;
}

function bulletForRemoved(entry) {
  return `- **−** \`${entry.key}\` (was ${formatValue(entry.value)})`;
}

function bulletForModified(entry) {
  return `- **~** \`${entry.key}\`: ${formatValue(entry.baseline)} → ${formatValue(entry.draft)}`;
}

function sectionHeading(name, totals) {
  const niceName = name === "_root" ? "Top-level fields" : name;
  const tail = [
    totals.added && `+${totals.added}`,
    totals.modified && `~${totals.modified}`,
    totals.removed && `−${totals.removed}`,
  ].filter(Boolean).join(" / ");
  return `### ${niceName}${tail ? ` _${tail}_` : ""}`;
}

/**
 * Render the draft↔baseline diff as a Markdown changelog string. Pass the
 * pre-computed diff if you have one; otherwise the helper computes it.
 */
export function renderDraftChangelog(baseline, draft, opts = {}) {
  const diff = opts.diff || draftDiff(baseline, draft);
  const lines = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push("# Balance changelog");
  lines.push("");
  lines.push(`_${today} · ${diff.totals.added} added · ${diff.totals.modified} modified · ${diff.totals.removed} removed_`);
  lines.push("");
  const sectionEntries = Object.entries(diff.sections);
  if (sectionEntries.length === 0) {
    lines.push("_(no changes vs the committed balance.json)_");
    return lines.join("\n");
  }
  sectionEntries.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, section] of sectionEntries) {
    const totals = {
      added: section.added.length,
      modified: section.modified.length,
      removed: section.removed.length,
    };
    lines.push(sectionHeading(name, totals));
    lines.push("");
    for (const entry of section.added) lines.push(bulletForAdded(entry));
    for (const entry of section.modified) lines.push(bulletForModified(entry));
    for (const entry of section.removed) lines.push(bulletForRemoved(entry));
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
