/**
 * recents.ts — a small localStorage MRU list of recently-opened wiki entries.
 *
 * Surfaced by the command palette (as the empty-query state) and by WikiHome
 * ("Jump back in"). Stored values are "tab:id" keys that match
 * commandPalette.entryKey(), so a stored key resolves straight back to a
 * CommandEntry. Mirrors wikiView.ts's localStorage idiom (hearth.wiki.* keys,
 * try/catch around every access so disabled/quota'd storage is a no-op).
 */

const RECENTS_KEY = "hearth.wiki.recents";
const MAX_RECENTS = 8;

/** Build the canonical "tab:id" storage key. Matches commandPalette.entryKey(). */
export function recentKey(tab: string, id: string): string {
  return `${tab}:${id}`;
}

/** The most-recent-first list of "tab:id" keys (capped, de-duped, sanitised). */
export function getRecents(): string[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** Record `tab:id` as the most-recent entry, moving it to the front if seen. */
export function pushRecent(tab: string, id: string): void {
  if (!tab || !id) return;
  try {
    if (typeof localStorage === "undefined") return;
    const key = recentKey(tab, id);
    const next = [key, ...getRecents().filter((k) => k !== key)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable / quota — recents are best-effort */
  }
}

/** Clear the recents list (used by tests and a potential "clear" affordance). */
export function clearRecents(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(RECENTS_KEY);
  } catch {
    /* storage unavailable */
  }
}
