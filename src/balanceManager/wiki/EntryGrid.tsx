import type { CSSProperties, ReactNode } from "react";
import Icon from "../../ui/Icon.jsx";
import { COLORS, hexToCss } from "../shared.jsx";
import { useWikiView } from "./wikiView.js";

/** A single fact chip rendered below an entity card's name. */
export interface WikiEntryFact {
  label?: string;
  value: string;
  /** Optional icon key to render before the value text. */
  iconKey?: string;
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
}: {
  entries: WikiEntry[] | null | undefined;
  emptyLabel?: ReactNode;
  onSelect?: (key: string) => void;
}) {
  const { view } = useWikiView();

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {entries.map((entry: WikiEntry) => {
        const bar = colorBarStyle(entry.color);
        const isSelectable = onSelect != null;
        // Visual: use iconKey if set, else emoji if set, else a muted initial placeholder
        const cardVisual = (() => {
          if (entry.iconKey) {
            return <Icon iconKey={entry.iconKey} size={36} />;
          }
          if (entry.emoji) {
            return (
              <span
                aria-hidden="true"
                style={{ fontSize: 28, lineHeight: 1, display: "block", textAlign: "center" }}
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
                width: 36,
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: COLORS.border,
                color: COLORS.inkSubtle,
                fontSize: 16,
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
            <div className="flex flex-col items-center justify-center gap-1 px-2 pt-2 pb-2 w-full">
              {cardVisual}
              <div
                className="text-[12px] font-bold text-center leading-tight break-words w-full"
                style={{ color: COLORS.ink }}
              >
                {entry.name}
              </div>
              {view === "developer" && (
                <div
                  className="font-mono text-[10px] text-center leading-tight break-all w-full"
                  style={{ color: COLORS.inkSubtle }}
                >
                  {entry.key}
                </div>
              )}
              {visibleFacts.length > 0 && (
                <div className="wiki-card-facts">
                  {visibleFacts.map((fact, i) => (
                    <span key={fact.label ?? fact.value ?? i} className="wiki-card-fact">
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
          </>
        );

        if (isSelectable) {
          return (
            <button
              key={entry.key}
              type="button"
              className="wiki-entry-card rounded-lg border flex flex-col items-center cursor-pointer text-left w-full p-0 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: COLORS.parchment,
                borderColor: COLORS.border,
                minHeight: 96,
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
            className="wiki-entry-card rounded-lg border flex flex-col items-center"
            style={{
              background: COLORS.parchment,
              borderColor: COLORS.border,
              minHeight: 96,
            }}
            title={entry.key}
          >
            {cardInner}
          </div>
        );
      })}
    </div>
  );
}
