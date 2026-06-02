/**
 * htmlContent.ts — Authored HTML content loader.
 *
 * Loads HTML fragments authored under src/balanceManager/content/ at build
 * time via Vite's import.meta.glob (raw, eager). Exposes three lookups:
 *
 *   bodyFor(conceptId, key)  — authored body for a specific entity
 *   pageFor(slug)            — authored body for a top-level narrative page
 *   listPages()              — sorted list of narrative page slugs
 *
 * The raw strings are returned as-is; [[wikilinks]], data-wiki anchors, and
 * <div data-game-visual> placeholders are processed by the renderer (Task 5+).
 */

const RAW = import.meta.glob("../content/**/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Strip everything up to and including `/content/` and the `.html` suffix. */
function norm(p: string): string {
  return p.replace(/^.*\/content\//, "").replace(/\.html$/, "");
}

const BY_REL = new Map<string, string>(
  Object.entries(RAW).map(([p, src]) => [norm(p), src]),
);

/**
 * Returns the authored HTML fragment for the given concept + entity key,
 * e.g. bodyFor("resources", "bread") → contents of content/resources/bread.html.
 * Returns null if no file exists for that pair.
 */
export function bodyFor(conceptId: string, key: string): string | null {
  return BY_REL.get(`${conceptId}/${key}`) ?? null;
}

/**
 * Returns the authored HTML fragment for a top-level narrative page,
 * e.g. pageFor("overview") → contents of content/pages/overview.html.
 * Returns null if no file exists for that slug.
 */
export function pageFor(slug: string): string | null {
  return BY_REL.get(`pages/${slug}`) ?? null;
}

/**
 * Returns a sorted list of narrative page slugs that exist under
 * content/pages/, with the "pages/" prefix stripped.
 */
export function listPages(): string[] {
  return [...BY_REL.keys()]
    .filter((k) => k.startsWith("pages/"))
    .map((k) => k.slice("pages/".length))
    .sort();
}
