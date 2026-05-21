/**
 * Dev/test helper: detect when CSS truncation (`text-overflow: ellipsis`) is
 * actually clipping content — i.e. the user is seeing a "…". The auto-fit
 * primitive should make this unreachable for titles, but anywhere we still
 * fall back to plain `truncate` we want a loud warning.
 *
 * Only runs in dev/test; the production bundle pays no cost.
 */
const reported = new WeakSet();

function inspect(el) {
  if (reported.has(el)) return null;
  const rect = el.getBoundingClientRect?.();
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  if (el.scrollWidth <= el.clientWidth + 1) return null;
  reported.add(el);
  return {
    element: el,
    text: el.textContent?.trim() ?? "",
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  };
}

function scan(root = document) {
  const hits = [];
  const truncates = root.querySelectorAll(".truncate, [data-truncate]");
  for (const el of truncates) {
    const hit = inspect(el);
    if (hit) hits.push({ ...hit, kind: "truncate" });
  }
  const autofits = root.querySelectorAll('[data-autofit="1"]');
  for (const el of autofits) {
    const hit = inspect(el);
    if (hit) hits.push({ ...hit, kind: "autofit-floor" });
  }
  return hits;
}

export function startTruncationDetector({ intervalMs = 1500 } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const run = () => {
    const hits = scan();
    for (const hit of hits) {
      console.warn(
        `[truncationDetector] "${hit.text}" is being clipped (${hit.kind}: scrollWidth=${hit.scrollWidth}, clientWidth=${hit.clientWidth}).`,
        hit.element,
      );
    }
  };
  run();
  const id = window.setInterval(run, intervalMs);
  if (typeof window !== "undefined") {
    window.__truncationDetector = { run, scan };
  }
  return () => {
    window.clearInterval(id);
    if (typeof window !== "undefined" && window.__truncationDetector) {
      delete window.__truncationDetector;
    }
  };
}
