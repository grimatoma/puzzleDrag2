// Draft size / weight monitor. Renders the live draft as JSON and breaks
// the byte total down by top-level section so designers can see which
// part of balance.json is growing the fastest. Pure module.

function bytesOf(value) {
  if (value == null) return 0;
  try { return JSON.stringify(value).length; } catch { return 0; }
}

/**
 * For each top-level key in `draft`, report its serialised byte count
 * and key count (when the value is an object). The result is sorted by
 * byte count descending so the heaviest section reads first.
 */
export function analyseDraftSize(draft) {
  if (!draft || typeof draft !== "object") {
    return { total: 0, sections: [] };
  }
  let total = 0;
  try { total = JSON.stringify(draft).length; } catch { total = 0; }
  const sections = Object.entries(draft).map(([key, value]) => {
    const bytes = bytesOf(value);
    const keyCount = (value && typeof value === "object" && !Array.isArray(value))
      ? Object.keys(value).length
      : (Array.isArray(value) ? value.length : 0);
    return { key, bytes, keyCount, share: total > 0 ? bytes / total : 0 };
  });
  sections.sort((a, b) => b.bytes - a.bytes);
  return { total, sections };
}

/** Convenience: human-readable byte string. */
export function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
