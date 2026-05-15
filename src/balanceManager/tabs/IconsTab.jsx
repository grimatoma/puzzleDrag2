// Icons viewer tab — renders every entry in ICON_REGISTRY on a canvas cell
// (or as inline SVG) so designers can browse, search, and copy icon keys.

import { useState, useMemo, useEffect, useRef, memo } from "react";
import C2S from "canvas2svg";
import { ICON_REGISTRY } from "../../textures/iconRegistry.js";
import { COLORS, SearchBar, SmallButton, Pill } from "../shared.jsx";
import { auditIconCoverage, coverageRatio } from "../iconCoverage.js";

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

// Run an icon's draw function against any Canvas-2D-shaped context with the
// same background tint and centering as the live game.
function paintIcon(ctx, entry, size) {
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
    proto.ellipse = function (cx, cy, rx, ry, rot, a0, a1, ccw) {
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
      const xform = (px, py) => [cx + px * cosR - py * sinR, cy + px * sinR + py * cosR];
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
    proto.roundRect = function (x, y, w, h, r) {
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

function renderIconSvg(entry, size) {
  patchC2S();
  const ctx = new C2S(size, size);
  paintIcon(ctx, entry, size);
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

// Memoised cell: renders one icon to its own <canvas> or inline <svg> and
// shows key + label.
const IconCell = memo(function IconCell({ entry, onClick, selected, mode }) {
  const canvasRef = useRef(null);
  const svgMarkup = useMemo(
    () => (mode === "svg" ? renderIconSvg(entry, ICON_SIZE) : null),
    [entry, mode],
  );

  useEffect(() => {
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
    paintIcon(ctx, entry, ICON_SIZE);
  }, [entry, mode]);

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
      {mode === "svg" ? (
        <div
          style={{ width: ICON_SIZE, height: ICON_SIZE, display: "block" }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
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
  const [copiedKey, setCopiedKey] = useState(null);
  const [mode, setMode] = useState("canvas"); // "canvas" | "svg"
  const [coverageOpen, setCoverageOpen] = useState(false);
  const coverage = useMemo(() => auditIconCoverage(), []);
  const coveragePct = Math.round(coverageRatio(coverage) * 100);

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
      {/* Coverage audit — surfaces ITEMS entries whose iconKey isn't in
          the registry (silent placeholder fallback in-game). */}
      <div className="rounded-lg border-2 p-2 flex items-center gap-2 flex-shrink-0"
        style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          Item icon coverage
        </span>
        <Pill color="#fff" bg={coverage.missing.length === 0 ? COLORS.greenDeep : COLORS.ember}>
          {coveragePct}% · {coverage.ok.length}/{coverage.total}
        </Pill>
        {coverage.missing.length > 0 && (
          <span className="text-[11px]" style={{ color: COLORS.inkLight }}>
            {coverage.missing.length} item{coverage.missing.length === 1 ? "" : "s"} have no icon — silent placeholder in-game.
          </span>
        )}
        {coverage.missing.length > 0 && (
          <SmallButton className="ml-auto" onClick={() => setCoverageOpen((v) => !v)}>
            {coverageOpen ? "Hide" : "Show"} missing
          </SmallButton>
        )}
      </div>
      {coverageOpen && coverage.missing.length > 0 && (
        <div className="rounded-lg border-2 p-2 flex-shrink-0" style={{ background: "#fff", borderColor: COLORS.border, maxHeight: 120, overflowY: "auto" }}>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-0.5 text-[10px]" style={{ color: COLORS.ink }}>
            {coverage.missing.map((m) => (
              <li key={m.id}>
                <code style={{ color: COLORS.emberDeep }}>{m.id}</code>
                {" · "}
                <span style={{ color: COLORS.inkLight }}>{m.label}</span>
                {" — wants "}
                <code style={{ color: COLORS.inkSubtle }}>{m.iconKey}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {[
            { id: "canvas", label: "Canvas" },
            { id: "svg", label: "SVG" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className="px-2 py-0.5 text-[10px] font-bold rounded-md border-2 transition-colors"
              aria-pressed={mode === opt.id}
              style={
                mode === opt.id
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchment, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] italic flex-shrink-0" style={{ color: COLORS.inkSubtle }}>
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
                mode={mode}
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
