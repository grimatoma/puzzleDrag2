// Icons viewer tab — renders every entry in ICON_REGISTRY (canvas-based)
// and DESIGN_ICONS_MAP (SVG-React) on a card so designers can browse, search,
// filter by usage, and copy icon keys.

import { useState, useMemo, useEffect, useRef, memo } from "react";
// Local declaration lives in src/balanceManager/canvas2svg.d.ts.
import C2S from "canvas2svg";
import { ICON_REGISTRY } from "../../textures/iconRegistry.js";
import { DESIGN_ICONS_MAP } from "../../ui/icons/index.jsx";
import { getUsedIconKeys } from "../iconUsage.js";
import { COLORS, FilterBar, SearchBar, SegmentedFilter } from "../shared.jsx";

// Derive category buckets from key prefixes. Canvas keys use `_` (e.g.
// "ui_lock" → "ui"); SVG keys use `.` (e.g. "design.tile.grass" → "design.tile").
// When an archived/legacy canvas entry has `replacedBy`, use that key's
// category instead so the legacy entry sorts next to its active sibling.
function categoryOf(key: string, replacedBy: string | null | undefined): string {
  const effective = replacedBy || key;
  if (effective.includes(".")) {
    const parts = effective.split(".");
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0];
  }
  const idx = effective.indexOf("_");
  return idx === -1 ? "other" : effective.slice(0, idx);
}

// Light-weight stub label for SVG entries that just publishes the key tail
// as a human label ("design.tile.grass" → "tile.grass").
function deriveSvgLabel(key: string): string {
  const tail = key.startsWith("design.") ? key.slice("design.".length) : key;
  return tail.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

const USED_KEYS = getUsedIconKeys();

interface CanvasEntryRaw {
  label?: string;
  color?: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
  archive?: boolean;
  replacedBy?: string;
}

const CANVAS_ENTRIES = Object.entries(ICON_REGISTRY as unknown as Record<string, CanvasEntryRaw>).map(([key, entry]) => ({
  key,
  label: entry.label ?? key,
  color: entry.color ?? "#888",
  draw: entry.draw,
  source: "canvas" as const,
  archive: entry.archive === true,
  replacedBy: entry.replacedBy ?? null,
  category: categoryOf(key, entry.replacedBy),
  inUse: USED_KEYS.has(key),
}));

const SVG_ENTRIES = Object.entries(DESIGN_ICONS_MAP).map(([key, Component]) => ({
  key,
  label: deriveSvgLabel(key),
  color: "#5a6a76",
  Component,
  source: "svg" as const,
  archive: false,
  replacedBy: null as string | null,
  category: categoryOf(key, null),
  inUse: USED_KEYS.has(key),
}));

type IconEntry = (typeof CANVAS_ENTRIES)[number] | (typeof SVG_ENTRIES)[number];
const ALL_ENTRIES: IconEntry[] = [...CANVAS_ENTRIES, ...SVG_ENTRIES];

const ALL_CATEGORIES = ["all", ...Array.from(new Set(ALL_ENTRIES.map((e) => e.category))).sort()];
const CATEGORY_OPTIONS = ALL_CATEGORIES.map((id) => ({ id, label: id }));
const RENDER_MODE_OPTIONS = [
  { id: "canvas", label: "Canvas" },
  { id: "svg", label: "SVG" },
];
const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "in-use", label: "In Use" },
  { id: "unused", label: "Unused" },
  { id: "legacy", label: "Legacy" },
];

const ICON_SIZE = 56; // px — canvas render size

// Run an icon's draw function against any Canvas-2D-shaped context with the
// same background tint and centering as the live game.
interface PaintableIconEntry {
  color: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

function paintIconForCell(ctx: CanvasRenderingContext2D, entry: PaintableIconEntry, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = entry.color + "28";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  try {
    entry.draw(ctx);
  } catch {
    // Silently skip broken draw functions in dev viewer.
  }
  ctx.restore();
}

// canvas2svg v1.0.16 predates several Canvas2D methods that iconRegistry
// uses. Polyfill them onto the C2S prototype once so the SVG recorder
// sees the same surface area as a real CanvasRenderingContext2D.
let c2sPatched = false;
function patchC2S() {
  if (c2sPatched) return;
  c2sPatched = true;
  const proto = C2S.prototype;
  if (!proto.ellipse) {
    proto.ellipse = function (cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw: boolean) {
      // Approximate the ellipse arc with cubic bezier segments (one per
      // ≤π/2 sweep). Output is in the same coord space as moveTo/lineTo,
      // so canvas2svg's path serialization handles it correctly.
      let delta = a1 - a0;
      if (ccw && delta > 0) delta -= Math.PI * 2;
      else if (!ccw && delta < 0) delta += Math.PI * 2;
      if (Math.abs(delta) > Math.PI * 2) delta = Math.sign(delta) * Math.PI * 2;
      const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
      const segDelta = delta / segments;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const xform = (px: number, py: number): [number, number] => [cx + px * cosR - py * sinR, cy + px * sinR + py * cosR];
      let theta = a0;
      const [sx, sy] = xform(rx * Math.cos(theta), ry * Math.sin(theta));
      this.lineTo(sx, sy);
      for (let i = 0; i < segments; i++) {
        const t1 = theta;
        const t2 = theta + segDelta;
        const k = (4 / 3) * Math.tan(segDelta / 4);
        const [c1x, c1y] = xform(
          rx * (Math.cos(t1) - k * Math.sin(t1)),
          ry * (Math.sin(t1) + k * Math.cos(t1)),
        );
        const [c2x, c2y] = xform(
          rx * (Math.cos(t2) + k * Math.sin(t2)),
          ry * (Math.sin(t2) - k * Math.cos(t2)),
        );
        const [ex, ey] = xform(rx * Math.cos(t2), ry * Math.sin(t2));
        this.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        theta = t2;
      }
    };
  }
  if (!proto.roundRect) {
    proto.roundRect = function (x: number, y: number, w: number, h: number, r: number | number[]) {
      const list = Array.isArray(r) ? r : [r, r, r, r];
      let tl, tr, br, bl;
      if (list.length === 1) [tl, tr, br, bl] = [list[0], list[0], list[0], list[0]];
      else if (list.length === 2) [tl, tr, br, bl] = [list[0], list[1], list[0], list[1]];
      else if (list.length === 3) [tl, tr, br, bl] = [list[0], list[1], list[2], list[1]];
      else [tl, tr, br, bl] = list;
      this.moveTo(x + tl, y);
      this.lineTo(x + w - tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + tr);
      this.lineTo(x + w, y + h - br);
      this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      this.lineTo(x + bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - bl);
      this.lineTo(x, y + tl);
      this.quadraticCurveTo(x, y, x + tl, y);
    };
  }
  if (!proto.setLineDash) {
    // No-op: SVG dasharray would require deeper integration with canvas2svg's
    // style serializer. Solid strokes are an acceptable approximation in the
    // dev viewer.
    proto.setLineDash = function () {};
  }
}

function renderIconSvg(entry: PaintableIconEntry, size: number) {
  patchC2S();
  const ctx = new C2S(size, size);
  paintIconForCell(ctx, entry, size);
  // canvas2svg bakes width/height into the root <svg>. Replace with a
  // viewBox so the SVG scales with its container — confirming it's truly
  // vector and not a fixed-size raster.
  return ctx
    .getSerializedSvg(true)
    .replace(
      /<svg([^>]*?)\s+width="[^"]*"\s+height="[^"]*"/,
      `<svg$1 width="100%" height="100%" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet"`,
    );
}

// Memoised cell: renders one icon to its own <canvas>, inline <svg>, or
// React-SVG component and shows key + label + status badge.
interface IconCellProps {
  entry: IconEntry;
  onClick: (key: string) => void;
  selected: boolean;
  mode: "canvas" | "svg";
}
const IconCell = memo(function IconCell({ entry, onClick, selected, mode }: IconCellProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgMarkup = useMemo(
    () => (mode === "svg" && entry.source === "canvas" ? renderIconSvg(entry, ICON_SIZE) : null),
    [entry, mode],
  );

  useEffect(() => {
    if (entry.source !== "canvas") return;
    if (mode !== "canvas") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Match the canvas backing store to the device pixel ratio so retina
    // displays render at native resolution instead of being bilinearly
    // upscaled from a 56px bitmap.
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    canvas.width = ICON_SIZE * dpr;
    canvas.height = ICON_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    paintIconForCell(ctx, entry, ICON_SIZE);
  }, [entry, mode]);

  // Status badge: "Legacy" wins over "Unused" because it's more specific
  // (legacy entries are always unused but the legacy badge tells the
  // designer *why*).
  let badge = null;
  if (entry.archive) badge = { label: "Legacy", color: "#7a4a18" };
  else if (!entry.inUse) badge = { label: "Unused", color: "#6a6a72" };

  const isSvgSource = entry.source === "svg";
  const SvgComp = isSvgSource ? entry.Component : null;

  return (
    <button
      onClick={() => onClick(entry.key)}
      title={`${entry.key}\n${entry.label}`}
      className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ember/50 relative"
      style={{
        background: selected ? entry.color + "22" : COLORS.parchment,
        borderColor: selected ? entry.color : COLORS.border,
        width: ICON_SIZE + 32,
        cursor: "pointer",
        opacity: entry.archive ? 0.85 : 1.0,
      }}
    >
      {badge && (
        <span
          className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-[1px] rounded uppercase tracking-wide pointer-events-none"
          style={{
            background: badge.color,
            color: "#fefae0",
            letterSpacing: "0.04em",
          }}
        >
          {badge.label}
        </span>
      )}
      {isSvgSource && SvgComp ? (
        <div
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: entry.color + "20",
            borderRadius: "50%",
          }}
        >
          <SvgComp size={ICON_SIZE - 8} fill={entry.color} />
        </div>
      ) : mode === "svg" ? (
        <div
          style={{ width: ICON_SIZE, height: ICON_SIZE, display: "block" }}
          dangerouslySetInnerHTML={{ __html: svgMarkup ?? "" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: ICON_SIZE, height: ICON_SIZE, display: "block" }}
        />
      )}
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
  const [status, setStatus] = useState("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"canvas" | "svg">("canvas");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_ENTRIES.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (status === "in-use" && (!e.inUse || e.archive)) return false;
      if (status === "unused" && (e.inUse || e.archive)) return false;
      if (status === "legacy" && !e.archive) return false;
      if (!q) return true;
      return e.key.toLowerCase().includes(q) || e.label.toLowerCase().includes(q);
    }).sort((a, b) => {
      // Within each category: in-use first, unused next, legacy last.
      const rankA = a.archive ? 2 : a.inUse ? 0 : 1;
      const rankB = b.archive ? 2 : b.inUse ? 0 : 1;
      if (rankA !== rankB) return rankA - rankB;
      // Within a rank, group by `replacedBy` so a legacy entry sits next
      // to the active key it replaces.
      const groupA = a.replacedBy || a.key;
      const groupB = b.replacedBy || b.key;
      return groupA.localeCompare(groupB);
    });
  }, [search, category, status]);

  function handleClick(key: string) {
    navigator.clipboard?.writeText(key).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Controls row */}
      <FilterBar className="gap-3 flex-shrink-0">
        <div className="flex-1 min-w-[160px] max-w-[320px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search key or label…" />
        </div>
        <SegmentedFilter
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
          ariaLabel="Icon category filter"
          className="[&>button]:!px-2 [&>button]:!py-1 [&>button]:!text-[10px] [&>button]:!rounded-md [&>button]:capitalize"
        />
        <div
          className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg border-2"
          role="group"
          aria-label="Usage status"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide pr-1"
            style={{ color: COLORS.inkSubtle }}
          >
            Status
          </span>
          <SegmentedFilter
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            ariaLabel="Icon usage status"
            className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-md"
          />
        </div>
        <div
          className="flex items-center gap-1 ml-auto flex-shrink-0 px-2 py-1 rounded-lg border-2"
          role="group"
          aria-label="Render mode"
          style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide pr-1"
            style={{ color: COLORS.inkSubtle }}
          >
            Render
          </span>
          <SegmentedFilter
            options={RENDER_MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            ariaLabel="Icon render mode"
            className="[&>button]:!px-2 [&>button]:!py-0.5 [&>button]:!text-[10px] [&>button]:!rounded-md"
          />
        </div>
        <div className="text-[11px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
          {filtered.length} / {ALL_ENTRIES.length} icons
        </div>
      </FilterBar>

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
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>

      <div className="text-[10px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
        Click any icon to copy its key to the clipboard. <span className="font-bold">Legacy</span> entries are archived originals; <span className="font-bold">Unused</span> entries are registered but not referenced anywhere in code.
      </div>
    </div>
  );
}
