import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Icon from "../../ui/Icon.jsx";
import type { IconVariant } from "../../textures/iconRegistry.js";
import { COLORS, hexToCss } from "../shared.jsx";
import { useWikiView } from "./wikiView.js";
import { reachabilityOf } from "../../game/reachability.js";

// Grey wash applied to cards for entities the player has no unlock path to. The
// hexes live in wikiTheme.css as --wiki-locked-*; referencing the CSS vars here
// keeps the inline background/border in sync with the .--unreached CSS rules.
const LOCKED_BG = "var(--wiki-locked-bg)";
const LOCKED_BORDER = "var(--wiki-locked-border)";

type CardSize = "s" | "m" | "l";
// Cards lay out horizontally (visual on the left, details on the right). For
// `m`/`l` the two sides split the card ~50/50 (`split: true`) so the icon can be
// rendered much larger; `s` keeps the visual at inline-text size (like a
// currency glyph inside a sentence) and lets the details fill the rest.
const SIZE_CONFIG: Record<
  CardSize,
  { icon: number; emoji: number; placeholder: number; label: number; gridCols: string; minHeight: number; split: boolean }
> = {
  s: { icon: 20,  emoji: 18, placeholder: 22, label: 12, gridCols: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2",  minHeight: 44,  split: false },
  m: { icon: 72,  emoji: 56, placeholder: 64, label: 14, gridCols: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3",  minHeight: 100, split: true  },
  l: { icon: 104, emoji: 84, placeholder: 96, label: 16, gridCols: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",                 minHeight: 140, split: true  },
};

/** A single fact chip rendered below an entity card's name. */
export interface WikiEntryFact {
  label?: string;
  value: string;
  /** Optional icon key to render before the value text. */
  iconKey?: string;
  /**
   * Optional colour tone — tags this chip as a kind of key detail so the card
   * can colour-code it (e.g. "power", "craft", "ingredient", "unlock"). Plain
   * descriptive facts omit it and render in the neutral chip style.
   */
  tone?: string;
}

export interface WikiEntry {
  key: string;
  name?: ReactNode;
  iconKey?: string;
  /** Emoji character to show as the card visual when no iconKey is available. */
  emoji?: string;
  color?: number | string | null;
  /** Fact chips rendered below the name. Concept-agnostic: EntryGrid renders up to 3. */
  facts?: WikiEntryFact[];
}

function colorBarStyle(color: number | string | null | undefined): CSSProperties | null {
  if (color === undefined || color === null) return null;
  const css = typeof color === "number" ? hexToCss(color) : String(color);
  return {
    height: 3,
    background: css,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  };
}

export default function EntryGrid({
  entries,
  emptyLabel = "No entries.",
  onSelect,
  renderVisual,
  iconVariant = "auto",
  conceptId,
}: {
  entries: WikiEntry[] | null | undefined;
  emptyLabel?: ReactNode;
  onSelect?: (key: string) => void;
  /**
   * Optional per-entry visual override. When provided, its result replaces the
   * default baked `<Icon iconKey={entry.iconKey}>` — used for concepts whose
   * entities have no baked icon (e.g. buildings, which render an inline-SVG
   * illustration via EntityVisual).
   */
  renderVisual?: (entry: WikiEntry) => ReactNode;
  /**
   * Which icon representation to bake for each card — `"canvas"` (procedural),
   * `"pixel"` (baked seasonal sprite, falling back to the general icon), or
   * `"auto"` (live game behaviour). Used by the tiles page's canvas/pixel toggle.
   */
  iconVariant?: IconVariant;
  /**
   * Concept these entries belong to. When provided, each card's reachability is
   * derived (via `reachabilityOf`) and entries with no unlock path ("not yet
   * reachable") get a grey wash. Omit for concepts that aren't reachability-gated.
   */
  conceptId?: string;
}) {
  const { view } = useWikiView();
  const [size, setSize] = useState<CardSize>("m");
  const cfg = SIZE_CONFIG[size];

  if (!entries || entries.length === 0) {
    return (
      <div
        className="text-center py-8 text-[12px] italic"
        style={{ color: COLORS.inkSubtle }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2 gap-1">
        {(["s", "m", "l"] as CardSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            title={{ s: "Small", m: "Medium", l: "Large" }[s]}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: `1.5px solid ${size === s ? COLORS.ember : COLORS.border}`,
              background: size === s ? COLORS.ember : COLORS.parchment,
              color: size === s ? "#fff" : COLORS.inkSubtle,
              fontSize: s === "s" ? 10 : s === "m" ? 12 : 14,
              fontWeight: 700,
              cursor: "pointer",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
    <div className={cfg.gridCols}>
      {(conceptId
        ? [...entries].sort((a, b) => {
            const aUnreached = reachabilityOf(conceptId, a.key) === "unreachable";
            const bUnreached = reachabilityOf(conceptId, b.key) === "unreachable";
            if (aUnreached === bUnreached) return 0;
            return aUnreached ? 1 : -1;
          })
        : entries
      ).map((entry: WikiEntry) => {
        const bar = colorBarStyle(entry.color);
        const isSelectable = onSelect != null;
        // Grey only entities with NO unlock path ("unreachable"). "gated"
        // (reachable via research / buy / daily) stays normal — it's reachable,
        // just not on the default board. `reachabilityOf` is null for un-gated concepts.
        const reach = conceptId ? reachabilityOf(conceptId, entry.key) : null;
        const unreached = reach === "unreachable";
        // Visual: use iconKey if set, else emoji if set, else a muted initial placeholder
        const cardVisual = (() => {
          if (entry.iconKey) {
            return <Icon iconKey={entry.iconKey} size={cfg.icon} variant={iconVariant} />;
          }
          if (entry.emoji) {
            return (
              <span
                aria-hidden="true"
                style={{ fontSize: cfg.emoji, lineHeight: 1, display: "block", textAlign: "center" }}
              >
                {entry.emoji}
              </span>
            );
          }
          // Muted initial placeholder — never a "?"
          const initial = (typeof entry.name === "string" ? entry.name : entry.key)
            .trim()
            .charAt(0)
            .toUpperCase();
          return (
            <span
              aria-hidden="true"
              style={{
                width: cfg.placeholder,
                height: cfg.placeholder,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: COLORS.border,
                color: COLORS.inkSubtle,
                fontSize: Math.round(cfg.placeholder * 0.44),
                fontWeight: 700,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {initial}
            </span>
          );
        })();

        const visibleFacts = entry.facts?.slice(0, 3) ?? [];

        const cardInner = (
          <>
            {bar && <div style={{ ...bar, width: "100%" }} />}
            <div
              className="flex flex-row items-center gap-2 px-2 py-2 w-full"
              style={{ flex: 1 }}
            >
              {/* Visual — left half. For m/l it grows to share the card 50/50
                  with the details; for s it stays at its (inline) icon size. */}
              <div
                className="flex items-center justify-center"
                style={
                  cfg.split
                    ? { flex: "1 1 0", minWidth: 0, alignSelf: "stretch" }
                    : { flexShrink: 0 }
                }
              >
                {renderVisual ? renderVisual(entry) : cardVisual}
              </div>
              {/* Details — right half. */}
              <div className="flex flex-col gap-0.5 min-w-0" style={{ flex: "1 1 0" }}>
                <div
                  className="font-bold leading-tight break-words"
                  style={{ color: COLORS.ink, fontSize: cfg.label }}
                >
                  {entry.name}
                </div>
                {view === "developer" && (
                  <div
                    className="font-mono text-[10px] leading-tight break-all"
                    style={{ color: COLORS.inkSubtle }}
                  >
                    {entry.key}
                  </div>
                )}
                {visibleFacts.length > 0 && (
                  <div className="wiki-card-facts" style={{ justifyContent: "flex-start" }}>
                    {visibleFacts.map((fact, i) => (
                      <span
                        key={fact.label ?? fact.value ?? i}
                        className="wiki-card-fact"
                        data-tone={fact.tone || undefined}
                      >
                        {fact.iconKey && (
                          <Icon iconKey={fact.iconKey} size={12} style={{ flexShrink: 0 }} />
                        )}
                        {fact.label && (
                          <span className="wiki-card-fact__label">{fact.label}:</span>
                        )}
                        <span>{fact.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        );

        if (isSelectable) {
          return (
            <button
              key={entry.key}
              type="button"
              className={`wiki-entry-card rounded-lg border flex flex-col cursor-pointer text-left w-full p-0 focus-visible:outline-2 focus-visible:outline-offset-2${
                unreached ? " wiki-entry-card--unreached" : ""
              }`}
              style={{
                background: unreached ? LOCKED_BG : COLORS.parchment,
                borderColor: unreached ? LOCKED_BORDER : COLORS.border,
                minHeight: cfg.minHeight,
                outlineColor: COLORS.ember,
              }}
              title={entry.key}
              onClick={() => onSelect(entry.key)}
            >
              {cardInner}
            </button>
          );
        }

        return (
          <div
            key={entry.key}
            className={`wiki-entry-card rounded-lg border flex flex-col${
              unreached ? " wiki-entry-card--unreached" : ""
            }`}
            style={{
              background: unreached ? LOCKED_BG : COLORS.parchment,
              borderColor: unreached ? LOCKED_BORDER : COLORS.border,
              minHeight: cfg.minHeight,
            }}
            title={entry.key}
          >
            {cardInner}
          </div>
        );
      })}
    </div>
    </div>
  );
}
