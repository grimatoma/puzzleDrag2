// The town forge re-drawn as a detailed isometric building. Technique: each
// wall/roof is drawn as a rich *flat* panel in local coordinates, then
// projected onto its iso plane with an SVG affine matrix(). That lets us port
// the original front-elevation forge's vocabulary — staggered brickwork, slate
// courses, mullioned lit windows, the glowing furnace arch, and yard props —
// onto the iso faces, with brick courses correctly following the iso edges.
// Strokes use vector-effect="non-scaling-stroke" so line weights stay crisp
// despite the shear. Reuses the forge palette + Smoke emitter; CSS keyframes
// (flicker, smoke, ember, v2pulse) come from src/index.css via the entry.

import { PAL, Smoke } from "../ui/buildings/v2kit.jsx";
import { TILE_W, TILE_H } from "./isoMath.js";

type P = { x: number; y: number };

// --- Footprint / massing (screen px relative to the anchor) ---
const HALF_W = TILE_W; // center → left/right footprint corner (x)
const HALF_H = TILE_H; // center → front/back footprint corner (y)
const WALL_H = 66; // wall height (footprint → eave)
const ROOF_RISE = 50; // apex height above the eave
const EAVE = 6; // roof overhang past the walls (px)

// Local design space for a wall panel (x along the wall, y down from eave).
const LW = 120;
const LH = 88;

const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// Affine matrix mapping local (x in [0,LW], y in [0,LH]) → screen, given the
// panel's top-left origin and its local +x (U) / +y (V) screen vectors.
function panelMatrix(origin: P, U: P, V: P): string {
  return `matrix(${U.x / LW} ${U.y / LW} ${V.x / LH} ${V.y / LH} ${origin.x} ${origin.y})`;
}

// Staggered brick courses for a wall panel (drawn in local space).
function brickCourses(prefix: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const ch = 8; // course height
  let row = 0;
  for (let y = 0; y <= LH; y += ch) {
    out.push(
      <line key={`${prefix}c${y}`} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />,
    );
    const off = row % 2 ? 0 : 7;
    for (let x = off; x <= LW; x += 14) {
      out.push(
        <line
          key={`${prefix}j${y}-${x}`}
          x1={x}
          y1={y}
          x2={x}
          y2={Math.min(y + ch, LH)}
          vectorEffect="non-scaling-stroke"
        />,
      );
    }
    row++;
  }
  return out;
}

// A mullioned, warm-lit window (local coords), centered at (cx, top).
function Window({ cx, top, k }: { cx: number; top: number; k: string }) {
  const w = 18;
  const h = 22;
  const x = cx - w / 2;
  return (
    <g key={k}>
      {/* timber frame */}
      <rect x={x - 2} y={top - 2} width={w + 4} height={h + 4} rx={1.5} fill="#3a2715" />
      <rect x={x} y={top} width={w} height={h} fill="#160d06" />
      {/* warm lit pane */}
      <rect
        x={x + 1}
        y={top + 1}
        width={w - 2}
        height={h - 2}
        fill="#ffcf6a"
        style={{ animation: `flicker ${2.4 + cx * 0.01}s ease-in-out infinite`, transformOrigin: `${cx}px ${top + h / 2}px` }}
      />
      {/* mullions */}
      <line x1={cx} y1={top} x2={cx} y2={top + h} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      <line x1={x} y1={top + h / 2} x2={x + w} y2={top + h / 2} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      {/* sill */}
      <rect x={x - 3} y={top + h + 1} width={w + 6} height={3} rx={1} fill="#7a5c34" />
    </g>
  );
}

// The glowing furnace arch (local coords), set into the front wall.
function Furnace({ cx, glow }: { cx: number; glow: string }) {
  const base = LH; // ground line
  const archTop = base - 52;
  const r = 22;
  return (
    <g>
      {/* stone surround */}
      <path
        d={`M${cx - r - 4},${base} L${cx - r - 4},${archTop} a${r + 4},${r + 4} 0 0 1 ${2 * (r + 4)},0 L${cx + r + 4},${base} Z`}
        fill={PAL.stoneShade}
      />
      <path
        d={`M${cx - r},${base} L${cx - r},${archTop} a${r},${r} 0 0 1 ${2 * r},0 L${cx + r},${base} Z`}
        fill="#150800"
      />
      {/* inner glow + flames */}
      <ellipse
        cx={cx}
        cy={base - 18}
        rx={r - 4}
        ry={16}
        fill={glow}
        opacity={0.72}
        style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: `${cx}px ${base - 18}px` }}
      />
      <g style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: `${cx}px ${base - 22}px` }}>
        <path d={`M${cx - 14},${base} Q${cx - 8},${base - 30} ${cx},${base - 18} Q${cx + 8},${base - 30} ${cx + 14},${base} Z`} fill="#c96442" />
      </g>
      <g style={{ animation: "flicker 1.1s 0.2s ease-in-out infinite", transformOrigin: `${cx}px ${base - 24}px` }}>
        <path d={`M${cx - 8},${base} Q${cx - 4},${base - 24} ${cx},${base - 16} Q${cx + 4},${base - 24} ${cx + 8},${base} Z`} fill="#ffb14a" />
      </g>
      {/* keystone */}
      <ellipse cx={cx} cy={archTop} rx={5} ry={3.2} fill={PAL.stone} />
      {/* hearth lip */}
      <rect x={cx - r - 6} y={base - 3} width={2 * (r + 6)} height={4} rx={1} fill={PAL.stoneShade} />
    </g>
  );
}

// Slate courses over a triangular hip-roof slope, parallel to the eave and
// converging toward the apex, plus a few tile joints near the eave.
function slopeCourses(eaveA: P, eaveB: P, apex: P, key: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const a = lerp(eaveA, apex, t);
    const b = lerp(eaveB, apex, t);
    out.push(
      <line key={`${key}${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.28)" strokeWidth={1} vectorEffect="non-scaling-stroke" />,
    );
  }
  for (let j = 1; j <= 6; j++) {
    const u = j / 7;
    const lo = lerp(eaveA, eaveB, u);
    const hi = lerp(lerp(eaveA, apex, 1 / 3), lerp(eaveB, apex, 1 / 3), u);
    out.push(
      <line key={`${key}v${j}`} x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} stroke="rgba(0,0,0,.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />,
    );
  }
  return out;
}

// An iso brick chimney prism rising `h` px from roof-contact center (cx,cy).
function Chimney({ cx, cy, h, half }: { cx: number; cy: number; h: number; half: number }) {
  const hh = half * (TILE_H / TILE_W);
  const top = cy - h;
  const fRight = `${cx + half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx + half},${cy + hh - h}`;
  const fLeft = `${cx - half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx - half},${cy + hh - h}`;
  const cap = `${cx},${top} ${cx + half},${top + hh} ${cx},${top + 2 * hh} ${cx - half},${top + hh}`;
  return (
    <g>
      <polygon points={fLeft} fill={PAL.brickDark} />
      <polygon points={fRight} fill={PAL.brick} />
      <line x1={cx} y1={cy + 2 * hh - h * 0.66} x2={cx + half} y2={cy + hh - h * 0.66} stroke={PAL.brickDark} strokeWidth={0.6} opacity={0.6} />
      <line x1={cx} y1={cy + 2 * hh - h * 0.33} x2={cx + half} y2={cy + hh - h * 0.33} stroke={PAL.brickDark} strokeWidth={0.6} opacity={0.6} />
      {/* clay cap */}
      <polygon points={cap} fill="#6a3320" />
      <polygon points={`${cx},${top + 1.5} ${cx + half * 0.8},${top + hh} ${cx},${top + 2 * hh - 1.5} ${cx - half * 0.8},${top + hh}`} fill="#4a2014" />
    </g>
  );
}

export default function IsoForge({
  originX,
  originY,
  nearDoor = false,
}: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) {
  const o: P = { x: originX, y: originY };

  // Ground footprint corners + their eave (raised) versions.
  const right = add(o, { x: HALF_W, y: 0 });
  const bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H };
  const rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H };
  const leftT = { x: o.x - HALF_W, y: o.y - WALL_H };

  // Roof apex + overhanging eave corners (push outward from center).
  const apex = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * TILE_H) / TILE_W;
  const topE = { x: topT.x, y: topT.y - eY };
  const rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY };
  const leftE = { x: leftT.x - EAVE, y: leftT.y };

  // Panel transforms for the two visible walls (origin = panel top-left).
  // SE (lit, viewer-right): local x runs bottom→right corner.
  const seMatrix = panelMatrix(bottomT, { x: HALF_W, y: -HALF_H }, { x: 0, y: WALL_H });
  // SW (shaded, viewer-left): local x runs left→bottom corner.
  const swMatrix = panelMatrix(leftT, { x: HALF_W, y: HALF_H }, { x: 0, y: WALL_H });

  return (
    <g>
      {/* ground shadow + warm spill */}
      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 14} ry={HALF_H + 5} fill="rgba(0,0,0,.30)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 6} ry={HALF_H - 6} fill="rgba(255,130,40,.10)" />

      {/* ===== SW WALL (shaded) — brick + door ===== */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={PAL.brick} />
        <rect x={0} y={0} width={LW} height={LH} fill="rgba(0,0,0,.30)" />
        <g stroke={PAL.brickDark} strokeWidth={0.8} opacity={0.45}>{brickCourses("sw")}</g>
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} opacity={0.6} />

        {/* door */}
        <g data-door="forge-entry">
          <ellipse
            cx={LW / 2}
            cy={LH - 22}
            rx={20}
            ry={26}
            fill="#ff8a28"
            opacity={nearDoor ? 0.34 : 0.14}
            style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${LW / 2}px ${LH - 22}px` } : undefined}
          />
          <path d={`M${LW / 2 - 15},${LH} L${LW / 2 - 15},${LH - 28} a15,15 0 0 1 30,0 L${LW / 2 + 15},${LH} Z`} fill="#3a2715" />
          <path d={`M${LW / 2 - 11},${LH} L${LW / 2 - 11},${LH - 26} a11,11 0 0 1 22,0 L${LW / 2 + 11},${LH} Z`} fill="#160d06" />
          <path d={`M${LW / 2 - 5},${LH} L${LW / 2 - 5},${LH - 22} a5,7 0 0 1 10,0 L${LW / 2 + 5},${LH} Z`} fill="#a8521f" opacity={0.5} />
          <line x1={LW / 2} y1={LH} x2={LW / 2} y2={LH - 30} stroke="#160d06" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
        {/* wall lantern beside the door — bracket + housing + warm glass */}
        <g>
          <path d={`M${LW / 2 + 20},${LH - 46} q8,-2 11,4`} fill="none" stroke="#2c2012" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <circle cx={LW / 2 + 31} cy={LH - 32} r={7} fill="#ff8a28" opacity={0.22} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${LW / 2 + 31}px ${LH - 32}px` }} />
          {/* housing */}
          <polygon points={`${LW / 2 + 31},${LH - 41} ${LW / 2 + 36},${LH - 38} ${LW / 2 + 36},${LH - 26} ${LW / 2 + 31},${LH - 23} ${LW / 2 + 26},${LH - 26} ${LW / 2 + 26},${LH - 38}`} fill="#2c2012" />
          {/* warm glass */}
          <rect x={LW / 2 + 28} y={LH - 38} width={6} height={11} rx={1} fill="#ffcf6a" style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${LW / 2 + 31}px ${LH - 32}px` }} />
          <rect x={LW / 2 + 27} y={LH - 42} width={8} height={2} rx={1} fill="#2c2012" />
        </g>
        {/* small high window */}
        <Window cx={26} top={18} k="sww" />
      </g>

      {/* ===== SE WALL (lit) — brick + furnace + windows ===== */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={PAL.brick} />
        <rect x={0} y={0} width={LW} height={LH} fill="rgba(255,210,150,.10)" />
        <rect x={0} y={LH * 0.62} width={LW} height={LH * 0.38} fill="rgba(0,0,0,.12)" />
        <g stroke={PAL.brickDark} strokeWidth={0.8} opacity={0.4}>{brickCourses("se")}</g>
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} opacity={0.6} />
        <Window cx={26} top={16} k="sel" />
        <Window cx={LW - 26} top={16} k="ser" />
        <Furnace cx={LW / 2} glow="#ff8a28" />
      </g>

      {/* timber eave beam along the two visible wall tops */}
      <polyline
        points={`${leftT.x},${leftT.y} ${bottomT.x},${bottomT.y} ${rightT.x},${rightT.y}`}
        fill="none"
        stroke={PAL.eave}
        strokeWidth={3}
      />

      {/* ===== HIP ROOF ===== */}
      <polygon points={`${topE.x},${topE.y} ${leftE.x},${leftE.y} ${apex.x},${apex.y}`} fill="#433d34" />
      <polygon points={`${topE.x},${topE.y} ${rightE.x},${rightE.y} ${apex.x},${apex.y}`} fill="#433d34" />
      {/* SW slope (shaded) */}
      <polygon points={`${leftE.x},${leftE.y} ${bottomE.x},${bottomE.y} ${apex.x},${apex.y}`} fill="#524b40" />
      <g>{slopeCourses(leftE, bottomE, apex, "rsw")}</g>
      {/* SE slope (lit) */}
      <polygon points={`${rightE.x},${rightE.y} ${bottomE.x},${bottomE.y} ${apex.x},${apex.y}`} fill="#6f6759" />
      <g>{slopeCourses(rightE, bottomE, apex, "rse")}</g>
      {/* eave fascia (overhang underside) */}
      <polyline points={`${leftE.x},${leftE.y} ${bottomE.x},${bottomE.y} ${rightE.x},${rightE.y}`} fill="none" stroke="#2c2620" strokeWidth={3} />
      {/* hip ridges from apex to the three visible eave corners */}
      <g stroke={PAL.ridge} strokeWidth={1.6} opacity={0.85} strokeLinecap="round">
        <line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} />
        <line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} />
        <line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} />
      </g>
      <circle cx={apex.x} cy={apex.y} r={2.4} fill={PAL.ridge} />

      {/* ===== CHIMNEYS + SMOKE ===== */}
      <Chimney cx={apex.x - 22} cy={apex.y + 30} h={30} half={9} />
      <Smoke x={apex.x - 22} y={apex.y} scale={1.1} count={4} dur={4.4} color="#c8b898" />
      <Chimney cx={apex.x + 24} cy={apex.y + 40} h={18} half={7} />
      <Smoke x={apex.x + 24} y={apex.y + 22} scale={0.8} count={3} dur={3.8} color="#a89878" />

      {/* ===== YARD PROPS (screen space, in front of the SE side) ===== */}
      {/* anvil on a stump */}
      <g transform={`translate(${right.x - 16} ${right.y - 1})`}>
        <ellipse cx={0} cy={0} rx={9} ry={2.6} fill="rgba(0,0,0,.32)" />
        <rect x={-6} y={-9} width={12} height={9} fill="#7a5c34" />
        <ellipse cx={0} cy={-9} rx={6} ry={1.8} fill="#5a3a1f" />
        <rect x={-7} y={-18} width={14} height={6} rx={1} fill="#5b5346" />
        <path d="M7,-15 L15,-13.5 Q16.5,-12 15,-10.5 L7,-10.5 Z" fill="#3a3530" />
        <rect x={-8} y={-12} width={16} height={2.4} rx={0.6} fill="#3a3530" />
        <line x1={-5} y1={-17} x2={3} y2={-17} stroke="#9a9a9a" strokeWidth={0.7} opacity={0.7} />
      </g>
      {/* coal bucket */}
      <g transform={`translate(${right.x + 4} ${right.y + 10})`}>
        <ellipse cx={0} cy={0} rx={7} ry={2} fill="rgba(0,0,0,.28)" />
        <path d="M-5,0 L-4,-8 L4,-8 L5,0 Z" fill="#4a443a" />
        <ellipse cx={0} cy={-8} rx={4.6} ry={1.4} fill="#2c2620" />
        <path d="M-4,-8 a4,4 0 0 1 8,0" fill="none" stroke="#2c2620" strokeWidth={1} />
        <g fill="#150d08"><circle cx={-1.5} cy={-9} r={1} /><circle cx={1.5} cy={-9.4} r={1.1} /></g>
      </g>
    </g>
  );
}
