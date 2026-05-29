// ─── TownGround ─────────────────────────────────────────────────────────────
// The town's top-down *terrain* layer: a grassy ground, water bodies, the dirt
// road network, tilled fields, a central cobbled plaza with a well, faint pads
// under each building lot, fences, the back layer of trees (+ all tree ground
// shadows), and a little top-down street furniture (lampposts, a cart, a
// signpost, planters). Rendered as an SVG in the same STAGE_W×STAGE_H design
// space (plan.width/plan.height) as the rest of the Town view, sitting between
// the backdrop and the building illustrations so the town reads as a planned
// settlement seen from above.
//
// Layer order, back → front:
//   1. grass base + soft organic blobs
//   2. water (pond/shore polygons, river polylines) — under roads so a road
//      crossing reads as a bridge
//   3. roads (dirt polylines: edge underlay, body, dashed centerline)
//   4. fields (rotated soil rects with crop rows)
//   5. plaza (cobbled oval)
//   6a. lot parcels (framed earth plots under every non-plaza lot)
//   6b. lot shadow pads / empty-lot dashed markers + board pads
//   7. fences (post-and-rail)
//   8. trees: shadow for EVERY tree, canopy only for back-layer (!front) trees
//   9. props (street furniture)

import { memo } from "react";

interface GroundPal {
  grass: string;
  grassDark: string;
  grassLight: string;
  dirt: string;
  dirtEdge: string;
  water: string;
  waterEdge: string;
  rock: string;
  sand: string;
  shadow: string;
}

interface Pt { x: number; y: number }

interface TownPlan {
  width?: number;
  height?: number;
  ground: { top: number };
  streets: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>;
  plaza: { cx: number; cy: number; rx: number; ry: number };
  well?: { cx: number; cy: number; r: number };
  lots: Array<{ index: number; cx: number; cy: number; w: number; h: number; row?: string }>;
  boards?: Array<{ kind?: string; cx: number; cy: number; w: number; h: number }>;
  props: Array<{ kind: string; x: number; y: number }>;
  roads?: Array<{ points: Pt[]; width: number; kind?: string }>;
  water?: Array<{ kind: string; polygon?: Pt[]; path?: Pt[]; width?: number }>;
  trees?: Array<{ x: number; y: number; r: number; cluster?: number; front?: boolean }>;
  fields?: Array<{ cx: number; cy: number; w: number; h: number; rows: number; angle: number }>;
  fences?: Array<{ points: Pt[] }>;
}

interface Theme {
  road?: string;
  roadLine?: string;
  groundTint?: string;
  waterTint?: string;
  dirtTint?: string;
}

// Top-down terrain palette per biome family. Streets/dirt still respect the
// theme's `road` / `roadLine` so they tie into the existing colour scheme, and
// optional theme tints (groundTint/waterTint/dirtTint) override the family base.
function groundPalette(biomeVariant: string, theme?: Theme): GroundPal {
  let pal: GroundPal;
  if (biomeVariant === "mine") {
    pal = {
      grass: "#6a6e58", grassDark: "#565a48", grassLight: "#7c8068",
      dirt: "#8a857c", dirtEdge: "#6a655d",
      water: "#3a5a66", waterEdge: "#2a444e",
      rock: "#5a5e62", sand: "#9a9484",
      shadow: "rgba(20,18,14,0.32)",
    };
  } else {
    pal = {
      grass: "#6f9a44", grassDark: "#5a7f36", grassLight: "#83ad52",
      dirt: "#b08a52", dirtEdge: "#8a6a3a",
      water: "#4f8fb0", waterEdge: "#3a6f8a",
      rock: "#8a8478", sand: "#d8c89a",
      shadow: "rgba(30,24,12,0.30)",
    };
  }
  if (theme?.groundTint) pal.grass = theme.groundTint;
  if (theme?.waterTint) pal.water = theme.waterTint;
  if (theme?.dirtTint) pal.dirt = theme.dirtTint;
  return pal;
}

interface PropPositionalProps { x: number; y: number; pal: GroundPal }

function Well({ x, y, pal }: PropPositionalProps) {
  return (
    <g>
      <ellipse cx={x} cy={y + 10} rx={22} ry={9} fill={pal.shadow} />
      <ellipse cx={x} cy={y} rx={18} ry={9} fill="#7a6a4a" stroke="#5a4a30" strokeWidth="2.5" />
      <ellipse cx={x} cy={y} rx={12} ry={6} fill="#23323a" />
      <rect x={x - 16} y={y - 2} width="3.5" height="22" fill="#5a4a30" />
      <rect x={x + 12.5} y={y - 2} width="3.5" height="22" fill="#5a4a30" />
      <rect x={x - 19} y={y - 18} width="38" height="6" rx="2" fill="#6a4a26" />
      <polygon points={`${x - 22},${y - 16} ${x},${y - 30} ${x + 22},${y - 16}`} fill="#7a3a1c" />
      <polygon points={`${x - 22},${y - 16} ${x},${y - 30} ${x + 22},${y - 16}`} fill="none" stroke="#5a2810" strokeWidth="1.5" />
    </g>
  );
}

function Lamppost({ x, y, pal }: PropPositionalProps) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={7} ry={3} fill={pal.shadow} />
      <rect x={x - 1.5} y={y - 38} width="3" height="40" fill="#3a3630" />
      <rect x={x - 5} y={y - 44} width="10" height="9" rx="2" fill="#46423a" />
      <ellipse cx={x} cy={y - 39.5} rx="4.5" ry="3.5" fill="#ffe79a" opacity="0.92" />
      <ellipse cx={x} cy={y - 39.5} rx="9" ry="7" fill="#ffe79a" opacity="0.2" />
    </g>
  );
}

function Signpost({ x, y, pal }: PropPositionalProps) {
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx={9} ry={3} fill={pal.shadow} />
      <rect x={x - 2} y={y - 30} width="4" height="32" fill="#6a4a26" />
      <rect x={x - 16} y={y - 30} width="22" height="9" rx="1.5" fill="#8a6a3a" stroke="#5a3a18" strokeWidth="1" />
      <rect x={x - 2} y={y - 18} width="20" height="8" rx="1.5" fill="#8a6a3a" stroke="#5a3a18" strokeWidth="1" />
    </g>
  );
}

function Cart({ x, y, pal }: PropPositionalProps) {
  return (
    <g>
      <ellipse cx={x} cy={y + 8} rx={26} ry={6} fill={pal.shadow} />
      <rect x={x - 22} y={y - 16} width="44" height="16" rx="2" fill="#7a5a32" stroke="#5a3e1e" strokeWidth="1.5" />
      <rect x={x - 22} y={y - 24} width="44" height="9" rx="2" fill="#9a7a44" opacity="0.85" />
      <circle cx={x - 13} cy={y + 2} r="7" fill="#3a2c18" stroke="#5a4426" strokeWidth="2" />
      <circle cx={x + 13} cy={y + 2} r="7" fill="#3a2c18" stroke="#5a4426" strokeWidth="2" />
      <rect x={x + 20} y={y - 12} width="14" height="3" rx="1.5" fill="#6a4a26" />
    </g>
  );
}

function Planter({ x, y, pal }: PropPositionalProps) {
  return (
    <g>
      <ellipse cx={x} cy={y + 5} rx={11} ry={3} fill={pal.shadow} />
      <rect x={x - 10} y={y - 4} width="20" height="10" rx="2" fill="#6a4a28" stroke="#4a3018" strokeWidth="1" />
      <ellipse cx={x - 4} cy={y - 6} rx="6" ry="5" fill={pal.grass} />
      <ellipse cx={x + 5} cy={y - 5} rx="5" ry="4" fill={pal.grass} />
      <circle cx={x - 5} cy={y - 8} r="2" fill="#f0c84a" />
      <circle cx={x + 4} cy={y - 8} r="2" fill="#e87878" />
    </g>
  );
}

const PROP_COMPONENTS: Record<string, ((p: PropPositionalProps) => JSX.Element) | undefined> = { well: Well, lamppost: Lamppost, signpost: Signpost, cart: Cart, planter: Planter };

const ptsStr = (pts: Pt[]): string => pts.map((p) => `${p.x},${p.y}`).join(" ");

interface TownGroundProps {
  plan: TownPlan | null | undefined;
  theme?: Theme;
  biomeVariant: string;
  builtLots: Set<number> | unknown;
}

function TownGround({ plan, theme, biomeVariant, builtLots }: TownGroundProps) {
  if (!plan) return null;
  const pal = groundPalette(biomeVariant, theme);
  const road = theme?.road || pal.dirt;
  const roadLine = theme?.roadLine || pal.dirtEdge;
  const built: Set<number> = builtLots instanceof Set ? (builtLots as Set<number>) : new Set();
  const w = plan.width ?? 1280;
  const h = plan.height ?? 960;

  // Roads: prefer polyline roads, fall back to flat 2-pt streets.
  const roads: Array<{ points: Pt[]; width: number; kind?: string }> =
    plan.roads && plan.roads.length
      ? plan.roads.map((r) => ({ points: r.points, width: r.width, kind: r.kind }))
      : plan.streets.map((s) => ({ points: [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }], width: s.width, kind: "branch" }));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      {/* ── 1. Grass base + soft organic texture blobs ── */}
      <rect x={0} y={0} width={w} height={h} fill={pal.grass} />
      <path
        d={`M${-0.05 * w},${0.18 * h} C${0.18 * w},${0.04 * h} ${0.42 * w},${0.12 * h} ${0.5 * w},${0.3 * h} C${0.58 * w},${0.48 * h} ${0.3 * w},${0.5 * h} ${0.16 * w},${0.42 * h} C${0.04 * w},${0.35 * h} ${-0.05 * w},${0.34 * h} ${-0.05 * w},${0.18 * h} Z`}
        fill={pal.grassDark}
        opacity="0.28"
      />
      <path
        d={`M${0.6 * w},${0.06 * h} C${0.82 * w},${0.0 * h} ${1.05 * w},${0.12 * h} ${1.05 * w},${0.32 * h} C${1.05 * w},${0.5 * h} ${0.78 * w},${0.46 * h} ${0.66 * w},${0.36 * h} C${0.56 * w},${0.27 * h} ${0.46 * w},${0.12 * h} ${0.6 * w},${0.06 * h} Z`}
        fill={pal.grassLight}
        opacity="0.3"
      />
      <ellipse cx={0.34 * w} cy={0.84 * h} rx={0.3 * w} ry={0.18 * h} fill={pal.grassDark} opacity="0.26" />
      <ellipse cx={0.82 * w} cy={0.78 * h} rx={0.26 * w} ry={0.16 * h} fill={pal.grassLight} opacity="0.26" />

      {/* ── 2. Water — drawn before roads so crossings read as bridges ── */}
      {(plan.water || []).map((wb, i) => {
        if (wb.kind === "river" && wb.path && wb.path.length > 1) {
          const d = ptsStr(wb.path);
          const bw = wb.width ?? 18;
          return (
            <g key={`wr${i}`}>
              <polyline points={d} fill="none" stroke={pal.sand} strokeWidth={bw + 10} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
              <polyline points={d} fill="none" stroke={pal.water} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={d} fill="none" stroke={pal.waterEdge} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
            </g>
          );
        }
        if (wb.polygon && wb.polygon.length > 2) {
          const bb = wb.polygon.reduce(
            (a, p) => ({ x0: Math.min(a.x0, p.x), y0: Math.min(a.y0, p.y), x1: Math.max(a.x1, p.x), y1: Math.max(a.y1, p.y) }),
            { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
          );
          const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
          return (
            <g key={`wp${i}`}>
              <polygon points={ptsStr(wb.polygon)} fill={pal.water} stroke={pal.waterEdge} strokeWidth={3} strokeLinejoin="round" />
              <ellipse cx={cx} cy={cy - (bb.y1 - bb.y0) * 0.12} rx={(bb.x1 - bb.x0) * 0.28} ry={(bb.y1 - bb.y0) * 0.18} fill="#ffffff" opacity="0.14" />
            </g>
          );
        }
        return null;
      })}

      {/* ── 3. Roads — dirt polylines: edge underlay, body, dashed centerline ── */}
      {roads.map((r, i) => {
        if (r.points.length < 2) return null;
        const d = ptsStr(r.points);
        return (
          <g key={`r${i}`}>
            <polyline points={d} fill="none" stroke={roadLine} strokeWidth={r.width + 6} strokeLinecap="square" strokeLinejoin="miter" opacity="0.55" />
            <polyline points={d} fill="none" stroke={road} strokeWidth={r.width} strokeLinecap="square" strokeLinejoin="miter" />
            {r.kind === "main" && (
              <polyline points={d} fill="none" stroke={roadLine} strokeWidth={1.5} strokeDasharray="7 8" strokeLinecap="square" strokeLinejoin="miter" opacity="0.4" />
            )}
          </g>
        );
      })}

      {/* ── 4. Fields — rotated soil rects with alternating crop rows ── */}
      {(plan.fields || []).map((f, i) => {
        const x0 = f.cx - f.w / 2, y0 = f.cy - f.h / 2;
        const rows = Math.max(1, Math.floor(f.rows));
        const gap = f.h / rows;
        const rowLines = [];
        for (let k = 0; k < rows; k++) {
          const ry = y0 + gap * (k + 0.5);
          rowLines.push(
            <line
              key={`fr${i}_${k}`}
              x1={x0 + 4}
              y1={ry}
              x2={x0 + f.w - 4}
              y2={ry}
              stroke={k % 2 === 0 ? "#7fae4a" : "#7a5a30"}
              strokeWidth={Math.max(2, gap * 0.38)}
              strokeLinecap="round"
              opacity="0.85"
            />,
          );
        }
        return (
          <g key={`f${i}`} transform={`rotate(${(f.angle * 180) / Math.PI} ${f.cx} ${f.cy})`}>
            <rect x={x0} y={y0} width={f.w} height={f.h} rx={6} fill="#9a6f3e" stroke="#6f4f28" strokeWidth={2} />
            {rowLines}
          </g>
        );
      })}

      {/* ── 5. Central plaza — cobbled oval ringed in stone ── */}
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx + 6} ry={plan.plaza.ry + 5} fill={pal.dirtEdge} opacity="0.7" />
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx} ry={plan.plaza.ry} fill={pal.dirt} />
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx} ry={plan.plaza.ry} fill="none" stroke={pal.dirtEdge} strokeWidth="2" />
      <ellipse cx={plan.plaza.cx} cy={plan.plaza.cy} rx={plan.plaza.rx * 0.62} ry={plan.plaza.ry * 0.62} fill="none" stroke={pal.dirtEdge} strokeWidth="1" opacity="0.4" />

      {/* ── 6a. Lot parcels — a framed earth plot under every non-plaza lot so
              each lot reads as a bounded parcel within its city block ── */}
      {plan.lots.filter((l) => l.row !== "plaza").map((l) => (
        <g key={`parcel${l.index}`}>
          <rect x={l.cx - l.w / 2} y={l.cy - l.h / 2} width={l.w} height={l.h} rx={4} fill={pal.dirt} opacity={0.18} />
          <rect x={l.cx - l.w / 2} y={l.cy - l.h / 2} width={l.w} height={l.h} rx={4} fill="none" stroke={pal.dirtEdge} strokeWidth={1.5} opacity={0.6} />
        </g>
      ))}

      {/* ── 6b. Lot shadow pads (built) / dashed markers (empty) + board pads ── */}
      {plan.lots.map((l) => {
        const baseY = l.cy + l.h / 2 - 4;
        if (built.has(l.index) || l.row === "plaza") {
          const rx = l.w * 0.5;
          const ry = Math.max(9, l.h * 0.14);
          return (
            <g key={`pad${l.index}`}>
              <ellipse cx={l.cx} cy={baseY} rx={rx} ry={ry} fill={pal.shadow} />
              <ellipse cx={l.cx} cy={baseY} rx={rx * 0.6} ry={ry * 0.62} fill={pal.shadow} />
            </g>
          );
        }
        const mw = l.w * 0.78, mh = Math.max(14, l.h * 0.22);
        return (
          <g key={`pad${l.index}`} opacity="0.55">
            <rect x={l.cx - mw / 2} y={baseY - mh} width={mw} height={mh} rx={4} fill={pal.dirt} opacity="0.4" />
            <rect x={l.cx - mw / 2} y={baseY - mh} width={mw} height={mh} rx={4} fill="none" stroke={pal.dirtEdge} strokeWidth="1.5" strokeDasharray="5 4" />
          </g>
        );
      })}
      {(plan.boards || []).map((b, i) => (
        <ellipse key={`bpad${i}`} cx={b.cx} cy={b.cy + b.h / 2 - 4} rx={b.w * 0.5} ry={Math.max(8, b.h * 0.12)} fill={pal.shadow} />
      ))}

      {/* ── 7. Fences — post-and-rail polylines ── */}
      {(plan.fences || []).map((fc, i) => {
        if (!fc.points || fc.points.length < 2) return null;
        return (
          <g key={`fence${i}`}>
            <polyline points={ptsStr(fc.points)} fill="none" stroke="#7a5630" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={ptsStr(fc.points)} fill="none" stroke="#9a784a" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            {fc.points.map((p, k) => (
              <circle key={`fp${i}_${k}`} cx={p.x} cy={p.y} r={2.6} fill="#5a3e1e" />
            ))}
          </g>
        );
      })}

      {/* ── 8. Trees — shadow for EVERY tree; canopy only for back-layer (!front) ── */}
      {(plan.trees || []).map((t, i) => (
        <ellipse key={`tsh${i}`} cx={t.x + t.r * 0.18} cy={t.y + t.r * 0.55} rx={t.r * 0.85} ry={t.r * 0.4} fill={pal.shadow} opacity="0.5" />
      ))}
      {(plan.trees || []).filter((t) => !t.front).map((t, i) => (
        <g key={`tc${i}`}>
          <circle cx={t.x} cy={t.y} r={t.r} fill="#3f6a2c" />
          <circle cx={t.x - t.r * 0.22} cy={t.y - t.r * 0.24} r={t.r * 0.62} fill="#5a8a3a" />
          <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.32} r={t.r * 0.32} fill="#7fae52" opacity="0.85" />
        </g>
      ))}

      {/* ── 9. Street furniture ── */}
      {plan.props.map((p, i) => {
        const C = PROP_COMPONENTS[p.kind];
        return C ? <C key={`p${i}`} x={p.x} y={p.y} pal={pal} /> : null;
      })}
    </svg>
  );
}

export default memo(TownGround);
