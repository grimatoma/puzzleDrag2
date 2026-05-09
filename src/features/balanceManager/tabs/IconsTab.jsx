// Icons viewer tab — renders every entry in ICON_REGISTRY on a canvas cell
// so designers can browse, search, and copy icon keys.

import { useState, useMemo, useEffect, useRef, memo } from "react";
import { ICON_REGISTRY } from "../../../textures/iconRegistry.js";
import { COLORS, SearchBar } from "../shared.jsx";

// Derive category buckets from key prefixes (everything before the first "_").
// Keys with no underscore fall into "other".
function categoryOf(key) {
  const idx = key.indexOf("_");
  return idx === -1 ? "other" : key.slice(0, idx);
}

const ALL_ENTRIES = Object.entries(ICON_REGISTRY).map(([key, entry]) => ({
  key,
  label: entry.label ?? key,
  color: entry.color ?? "#888",
  draw: entry.draw,
  category: categoryOf(key),
}));

const ALL_CATEGORIES = ["all", ...Array.from(new Set(ALL_ENTRIES.map((e) => e.category))).sort()];

const ICON_SIZE = 56; // px — canvas render size

// Memoised cell: renders one icon to its own <canvas> and shows key + label.
const IconCell = memo(function IconCell({ entry, onClick, selected }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = ICON_SIZE;
    ctx.clearRect(0, 0, s, s);
    // Background circle using the icon's accent color.
    ctx.save();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = entry.color + "28"; // 16 % opacity tint
    ctx.fill();
    ctx.restore();
    // Translate to center so draw functions work from (0,0).
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    try {
      entry.draw(ctx);
    } catch {
      // Silently skip broken draw functions in dev viewer.
    }
    ctx.restore();
  }, [entry]);

  return (
    <button
      onClick={() => onClick(entry.key)}
      title={`${entry.key}\n${entry.label}`}
      className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#d6612a]/50"
      style={{
        background: selected ? entry.color + "22" : COLORS.parchment,
        borderColor: selected ? entry.color : COLORS.border,
        width: ICON_SIZE + 32,
        cursor: "pointer",
      }}
    >
      <canvas
        ref={canvasRef}
        width={ICON_SIZE}
        height={ICON_SIZE}
        style={{ imageRendering: "crisp-edges" }}
      />
      <div
        className="text-center leading-tight max-w-full"
        style={{ width: ICON_SIZE + 24 }}
      >
        <div
          className="text-[10px] font-bold truncate"
          style={{ color: COLORS.ink }}
          title={entry.label}
        >
          {entry.label}
        </div>
        <div
          className="text-[9px] font-mono truncate opacity-60"
          style={{ color: COLORS.inkSubtle }}
          title={entry.key}
        >
          {entry.key}
        </div>
      </div>
    </button>
  );
});

export default function IconsTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_ENTRIES.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return e.key.toLowerCase().includes(q) || e.label.toLowerCase().includes(q);
    });
  }, [search, category]);

  function handleClick(key) {
    navigator.clipboard?.writeText(key).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="flex-1 min-w-[160px] max-w-[320px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search key or label…" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-2 py-1 text-[10px] font-bold rounded-md border-2 transition-colors capitalize"
              style={
                category === cat
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-[11px] italic ml-auto flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
          {filtered.length} / {ALL_ENTRIES.length} icons
        </div>
      </div>

      {/* Copy notice */}
      {copiedKey && (
        <div
          className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-center flex-shrink-0"
          style={{ background: COLORS.green, color: "#fff" }}
        >
          Copied <span className="font-mono">{copiedKey}</span> to clipboard
        </div>
      )}

      {/* Icon grid */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No icons match your search.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pb-4">
            {filtered.map((entry) => (
              <IconCell
                key={entry.key}
                entry={entry}
                onClick={handleClick}
                selected={copiedKey === entry.key}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-[10px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
        Click any icon to copy its key to the clipboard.
      </div>
    </div>
  );
}
