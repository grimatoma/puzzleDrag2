import type { CSSProperties, ReactNode } from "react";
import Icon from "../../ui/Icon.jsx";
import { COLORS, hexToCss } from "../shared.jsx";

export interface WikiEntry {
  key: string;
  name?: ReactNode;
  iconKey?: string;
  color?: number | string | null;
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

export default function EntryGrid({ entries, emptyLabel = "No entries." }: { entries: WikiEntry[] | null | undefined; emptyLabel?: ReactNode }) {
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
        return (
          <div
            key={entry.key}
            className="rounded-lg border flex flex-col items-center transition-shadow hover:shadow-md"
            style={{
              background: COLORS.parchment,
              borderColor: COLORS.border,
              minHeight: 96,
            }}
            title={entry.key}
          >
            {bar && <div style={{ ...bar, width: "100%" }} />}
            <div className="flex flex-col items-center justify-center gap-1 px-2 pt-2 pb-2 w-full">
              <Icon iconKey={entry.iconKey} size={36} />
              <div
                className="text-[12px] font-bold text-center leading-tight break-words w-full"
                style={{ color: COLORS.ink }}
              >
                {entry.name}
              </div>
              <div
                className="font-mono text-[10px] text-center leading-tight break-all w-full"
                style={{ color: COLORS.inkSubtle }}
              >
                {entry.key}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
