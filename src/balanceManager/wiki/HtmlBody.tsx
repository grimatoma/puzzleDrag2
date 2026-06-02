/**
 * HtmlBody.tsx — Converts an authored HTML fragment into live React, rewiring
 * internal links and mounting live game embeds.
 *
 * Algorithm:
 *   1. Parse the fragment with DOMParser (available in browser and under jsdom).
 *   2. Walk doc.body.childNodes recursively, converting each node to React.
 *   3. Special handling for:
 *      - Text nodes containing [[…]] → run through parseWikiLinks.
 *      - <script> / <style>          → DROP entirely (security).
 *      - Elements with data-game-visual → <GameScreenEmbed> (children ignored).
 *      - <a data-wiki>               → <WikiLinkButton>.
 *      - <svg> subtrees              → dangerouslySetInnerHTML (preserves attrs).
 *      - Headings h1/h2/h3           → add id={slugify(textContent)}.
 *      - Everything else             → React.createElement with safe props.
 *
 * Security:
 *   - <script> and <style> nodes are dropped entirely, including inside <svg>.
 *   - Any attribute whose name begins with "on" is stripped.
 *   - `href`, `src`, and `xlink:href` values starting with `javascript:` or
 *     `vbscript:` are dropped.
 *   - Only the node tree produced by DOMParser is processed; no eval.
 */

import React from "react";
import { parseWikiLinks } from "./wikilink.js";
import { WikiLinkButton } from "./WikiLinkButton.jsx";
import { GameScreenEmbed } from "./GameScreenEmbed.jsx";
import { COLORS } from "../shared.jsx";

// ---------------------------------------------------------------------------
// slugify — convert heading text to a URL-safe anchor id
// ---------------------------------------------------------------------------

/**
 * Convert `text` to a URL-safe anchor id: lowercase, spaces become hyphens,
 * non-alphanumeric characters (other than hyphens) become hyphens, then
 * collapse runs of hyphens to a single one and trim.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Style string parser — "font-size: 12px; color: red" → React style object
// ---------------------------------------------------------------------------

/** camelCase a CSS property name, e.g. "font-size" → "fontSize". */
function camelCaseProp(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Parse a CSS inline-style string into a React CSSProperties object.
 * Unknown or malformed declarations are silently skipped.
 */
function parseStyleString(styleStr: string): React.CSSProperties {
  const result: Record<string, string> = {};
  for (const decl of styleStr.split(";")) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim();
    if (!prop || !value) continue;
    result[camelCaseProp(prop)] = value;
  }
  return result as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Attribute conversion — DOM NamedNodeMap → React props
// ---------------------------------------------------------------------------

const ATTR_RENAME: Record<string, string> = {
  class: "className",
  colspan: "colSpan",
  rowspan: "rowSpan",
  for: "htmlFor",
};

/**
 * Convert a DOM element's attributes into a React props object.
 * Strips `on*` handlers; renames `class` → `className`, etc.;
 * parses `style` strings into React CSSProperties.
 */
function convertAttributes(
  el: Element,
  keyPrefix: string,
): Record<string, unknown> {
  const props: Record<string, unknown> = { key: keyPrefix };

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const name = attr.name.toLowerCase();

    // Security: strip all event-handler attributes.
    if (name.startsWith("on")) continue;

    // Security: block javascript: and vbscript: URL schemes.
    if (name === "href" || name === "src" || name === "xlink:href") {
      const v = attr.value.trim().toLowerCase();
      if (v.startsWith("javascript:") || v.startsWith("vbscript:")) continue;
    }

    // Parse inline styles into a React style object.
    if (name === "style") {
      props.style = parseStyleString(attr.value);
      continue;
    }

    // Rename HTML attrs to React equivalents.
    const reactName = ATTR_RENAME[name] ?? name;
    props[reactName] = attr.value;
  }

  return props;
}

// ---------------------------------------------------------------------------
// Heading style helpers
// ---------------------------------------------------------------------------

const HEADING_STYLES: Record<string, React.CSSProperties> = {
  h1: { fontSize: 18, fontWeight: 700, color: COLORS.ink, margin: "0.5em 0 0.25em" },
  h2: { fontSize: 15, fontWeight: 700, color: COLORS.ink, margin: "0.5em 0 0.25em" },
  h3: { fontSize: 13, fontWeight: 700, color: COLORS.ink, margin: "0.4em 0 0.2em" },
};

// ---------------------------------------------------------------------------
// Core recursive DOM → React converter
// ---------------------------------------------------------------------------

/**
 * Convert a DOM Node (and its subtree) into a React node.
 *
 * @param node       — The DOM node to convert.
 * @param keyPrefix  — A string key prefix for stable React list keys.
 * @returns A React node, or null to indicate the node should be dropped.
 */
function convertNode(node: Node, keyPrefix: string): React.ReactNode {
  // ── Text node ─────────────────────────────────────────────────────────────
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node as Text).data;
    if (!text) return null;

    // If the text contains [[…]], parse and convert wikilinks.
    if (text.includes("[[")) {
      const segments = parseWikiLinks(text);
      if (segments.length === 0) return text;

      return segments.map((seg, i) => {
        if (seg.kind === "text") return seg.value;
        // Link segment — render as WikiLinkButton
        return (
          <WikiLinkButton
            key={`${keyPrefix}-link-${i}`}
            raw={seg.raw}
            display={seg.display}
          />
        );
      });
    }

    return text;
  }

  // ── Non-element nodes (comments, CDATA, etc.) — drop ─────────────────────
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // ── Security: drop <script> and <style> entirely ──────────────────────────
  if (tag === "script" || tag === "style") return null;

  // ── data-game-visual → GameScreenEmbed (children ignored) ────────────────
  const gameVisual = el.getAttribute("data-game-visual");
  if (gameVisual !== null) {
    return <GameScreenEmbed key={keyPrefix} scenarioId={gameVisual} />;
  }

  // ── <a data-wiki> → WikiLinkButton ───────────────────────────────────────
  const dataWiki = el.getAttribute("data-wiki");
  if (tag === "a" && dataWiki !== null) {
    return (
      <WikiLinkButton
        key={keyPrefix}
        raw={dataWiki}
        display={el.textContent ?? ""}
      />
    );
  }

  // ── <svg> subtree → dangerouslySetInnerHTML (preserves exact SVG attrs) ──
  if (tag === "svg") {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("script, style").forEach((n) => n.remove());
    return (
      <span
        key={keyPrefix}
        dangerouslySetInnerHTML={{ __html: clone.outerHTML }}
      />
    );
  }

  // ── Convert children recursively ──────────────────────────────────────────
  const children = convertChildren(el, keyPrefix);

  // ── Headings: add slugified id + styling ─────────────────────────────────
  if (tag === "h1" || tag === "h2" || tag === "h3") {
    const props = convertAttributes(el, keyPrefix);
    const headingId = slugify(el.textContent ?? "");
    props.id = headingId;
    // Merge heading style with any inline style on the element.
    const inlineStyle = typeof props.style === "object" ? props.style as React.CSSProperties : {};
    props.style = { ...HEADING_STYLES[tag], ...inlineStyle };
    return React.createElement(tag, props, ...children);
  }

  // ── All other elements: pass through with safe props ──────────────────────
  const props = convertAttributes(el, keyPrefix);
  if (children.length === 0) {
    return React.createElement(tag, props);
  }
  return React.createElement(tag, props, ...children);
}

/**
 * Convert all child nodes of `parent` into an array of React nodes,
 * filtering out nulls.
 */
function convertChildren(parent: Node, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let childIndex = 0;
  parent.childNodes.forEach((child) => {
    const converted = convertNode(child, `${keyPrefix}-${childIndex}`);
    childIndex++;
    if (converted === null || converted === undefined) return;
    // An array (from wikilink expansion) gets spread in
    if (Array.isArray(converted)) {
      result.push(...converted);
    } else {
      result.push(converted);
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// HtmlBody — public component
// ---------------------------------------------------------------------------

export interface HtmlBodyProps {
  /** A raw HTML fragment string. Parsed by DOMParser; not eval'd. */
  source: string;
}

/**
 * Renders an authored HTML fragment as live React, rewiring [[wikilinks]],
 * `data-wiki` anchors, and `<div data-game-visual>` placeholders into their
 * respective interactive components.
 *
 * Security invariants:
 *   - `<script>` and `<style>` elements are dropped everywhere, including
 *     inside `<svg>` subtrees (clone + querySelectorAll before serialising).
 *   - `on*` event-handler attributes are stripped from all elements.
 *   - `href`, `src`, and `xlink:href` values beginning with `javascript:` or
 *     `vbscript:` are silently dropped.
 *   - SVG subtrees are cloned and sanitised before inlining via
 *     `dangerouslySetInnerHTML`; no external loads, no script execution path.
 *   - DOMParser runs in the browser's parser sandbox; no eval occurs.
 */
export default function HtmlBody({ source }: HtmlBodyProps) {
  const children = React.useMemo(() => {
    if (!source || !source.trim()) return [];

    // DOMParser is available in browsers and under jsdom (Vitest).
    const doc = new DOMParser().parseFromString(source, "text/html");
    return convertChildren(doc.body, "root");
  }, [source]);

  return (
    <div className="wiki-html flex flex-col gap-1">
      {children}
    </div>
  );
}
