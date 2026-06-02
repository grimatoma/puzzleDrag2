/**
 * wikilink.ts — Wikilink parser and focus resolver for Dev Panel wiki prose.
 *
 * Wiki article text uses `[[...]]` markup to express cross-links between
 * entities. This module parses those links into typed segments, resolves them
 * to (conceptId, entityKey) pairs via the live catalog, and produces canonical
 * focus strings for navigation.
 *
 * Pure module — no React/DOM imports. Safe to use in any context.
 */

import { parseWikiFocus } from "./conceptEntities.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextSegment {
  kind: "text";
  value: string;
}

export interface LinkSegment {
  kind: "link";
  /** The raw link target: either `"conceptId:entityKey"` or a bare `"entityKey"`. */
  raw: string;
  /** Display text — the part after `|`, or `raw` when no pipe is present. */
  display: string;
}

export type Segment = TextSegment | LinkSegment;

// ---------------------------------------------------------------------------
// parseWikiLinks
// ---------------------------------------------------------------------------

/**
 * Split `text` into an ordered array of text and link segments.
 *
 * Links are written `[[inner]]` where `inner` is one of:
 *   - `conceptId:key`          — prefixed form, unambiguous
 *   - `key`                    — bare key, resolved via `conceptForKey` fallback
 *   - `key|Display text`       — bare or prefixed key with explicit display label
 *
 * The returned segments are in source order so a renderer can interleave them
 * without re-sorting. Text segments adjacent to no links are always returned
 * (there will be exactly one text segment for a string with no links). An empty
 * string returns an empty array.
 *
 * This function is reentrant: it constructs a fresh `RegExp` per call so there
 * is no shared `lastIndex` state between concurrent or sequential calls.
 */
export function parseWikiLinks(text: string): Segment[] {
  if (text.length === 0) return [];

  // Build a fresh regex per call — avoids lastIndex leakage between calls.
  const RE = /\[\[([^\]]+)\]\]/g;
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(text)) !== null) {
    // Text before this link
    if (m.index > last) {
      segs.push({ kind: "text", value: text.slice(last, m.index) });
    }

    const inner = m[1];
    const pipe = inner.indexOf("|");
    const raw = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();
    const display = (pipe === -1 ? raw : inner.slice(pipe + 1).trim());

    segs.push({ kind: "link", raw, display });
    last = m.index + m[0].length;
  }

  // Trailing text after the last link
  if (last < text.length) {
    segs.push({ kind: "text", value: text.slice(last) });
  }

  return segs;
}

// ---------------------------------------------------------------------------
// resolveWikiLink
// ---------------------------------------------------------------------------

/**
 * Resolve a wikilink raw target to a `{ conceptId, entityKey }` pair.
 *
 * Delegates entirely to `parseWikiFocus` which handles both the prefixed
 * `"conceptId:key"` format and bare keys via `conceptForKey` fallback.
 *
 * Returns `null` when the raw target cannot be resolved to a known entity.
 */
export function resolveWikiLink(
  raw: string,
): { conceptId: string; entityKey: string } | null {
  return parseWikiFocus(raw);
}

// ---------------------------------------------------------------------------
// focusForLink
// ---------------------------------------------------------------------------

/**
 * Return the canonical `"conceptId:entityKey"` focus string for a wikilink raw
 * target, or `null` if the target cannot be resolved.
 *
 * The returned string is ready to pass to the wiki router's `setFocus` helper.
 */
export function focusForLink(raw: string): string | null {
  const resolved = resolveWikiLink(raw);
  return resolved !== null ? `${resolved.conceptId}:${resolved.entityKey}` : null;
}
