/**
 * IconVariantToggle.tsx — Canvas ⇄ Pixel art switch for the wiki tiles pages.
 *
 * The tiles list and a tile's detail page can both render a tile's icon either as
 * its procedural "canvas" draw (the general icon) or as its baked seasonal pixel
 * sprite. This is the shared segmented control that flips between the two.
 */

import { COLORS } from "../shared.jsx";

export type TileIconVariant = "canvas" | "pixel";

const OPTIONS: { id: TileIconVariant; label: string; title: string }[] = [
  { id: "canvas", label: "Canvas", title: "Procedural canvas icons (the general icon)" },
  { id: "pixel", label: "Pixel art", title: "Baked seasonal pixel sprites where available" },
];

export function IconVariantToggle({
  value,
  onChange,
}: {
  value: TileIconVariant;
  onChange: (v: TileIconVariant) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border-2"
      role="group"
      aria-label="Tile icon style"
      style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wide pr-1"
        style={{ color: COLORS.inkSubtle }}
      >
        Icons
      </span>
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.title}
            aria-pressed={active}
            className="px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors"
            style={{
              border: `1.5px solid ${active ? COLORS.ember : COLORS.border}`,
              background: active ? COLORS.ember : COLORS.parchment,
              color: active ? "#fff" : COLORS.inkSubtle,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default IconVariantToggle;
