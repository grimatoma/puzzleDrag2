/** Query params outside the route path (hash-router globals + `location.search`). */

const CONCEPT_TILES_STORAGE_KEY = "hearth.conceptTiles";

/** Merge `location.search` and the query portion of `location.hash`. */
export function readAppQueryParams(): URLSearchParams {
  const merged = new URLSearchParams();
  if (typeof window === "undefined") return merged;

  const search = window.location.search.replace(/^\?/, "");
  if (search) {
    new URLSearchParams(search).forEach((v, k) => merged.set(k, v));
  }

  const hash = window.location.hash || "";
  const q = hash.indexOf("?");
  if (q >= 0) {
    new URLSearchParams(hash.slice(q + 1)).forEach((v, k) => merged.set(k, v));
  }

  return merged;
}

/** Persist `conceptTiles=1` across in-app hash navigation (session until `=0`). */
export function syncConceptTilesFlag(): void {
  if (typeof window === "undefined") return;
  const v = readAppQueryParams().get("conceptTiles");
  try {
    if (v === "1" || v === "true") sessionStorage.setItem(CONCEPT_TILES_STORAGE_KEY, "1");
    else if (v === "0" || v === "false") sessionStorage.removeItem(CONCEPT_TILES_STORAGE_KEY);
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

export function isConceptTilesFlagEnabled(): boolean {
  syncConceptTilesFlag();
  const v = readAppQueryParams().get("conceptTiles");
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  try {
    return sessionStorage.getItem(CONCEPT_TILES_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Append preserved global flags to a hash query segment (without leading `?`). */
export function appendGlobalHashFlags(queryParts: string[]): string[] {
  const parts = [...queryParts];
  if (isConceptTilesFlagEnabled() && !parts.some((p) => p.startsWith("conceptTiles="))) {
    parts.push("conceptTiles=1");
  }
  return parts;
}
