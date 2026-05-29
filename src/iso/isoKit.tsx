// Shared isometric building kit. Every iso building component in
// `src/iso/buildings/*` is built from these primitives so the whole set reads
// as one cohesive family: the same 2:1 dimetric projection, the same lighting
// (lit SE face / shaded SW face), the same brick/slate materials, the same
// roof + grounding language, and — critically — the SAME REFERENCE SCALE so a
// door / window / brick-course / character is the same size on every building.
//
// Technique: draw each wall as a flat panel in LOCAL coords (a PANEL.LW × PANEL.LH
// rectangle), then project it onto its iso plane with `panelMatrix` (an affine
// matrix) so brick courses and openings follow the iso edges. Strokes use
// vector-effect="non-scaling-stroke" so line weights stay crisp under the shear.
//
// Gradients must be namespaced per-instance (the gallery renders many buildings
// at once) — use `useId` in the component and pass the result through `IsoDefs`.

import { TILE_W, TILE_H } from "./isoMath.js";
import { PAL } from "../ui/buildings/v2kit.jsx";

export type P = { x: number; y: number };

// ---- iso tile half-extents (screen px) ----
export const T = TILE_W / 2; // 32 — half-width per tile along screen-x
export const TH = TILE_H / 2; // 16 — half-height per tile along screen-y

// ---- canonical local wall-panel space ----
// A wall is drawn as an LW×LH rectangle in local space then projected. Keeping
// these constant means `brick()` / window helpers line up on every building.
export const PANEL = { LW: 120, LH: 92 } as const;

// ============================================================================
// REFERENCE SCALE — hold every building to these so the finished set is one
// family. Sizes are screen px unless noted. A "storey" is one wall height from
// footprint to eave; multi-storey buildings stack storeys, they do not inflate
// the storey. Door / window / character sizes never change between buildings.
// ============================================================================
export const SCALE = {
  storey: 74, // one floor: footprint → eave (matches the approved forge)
  roofRise: 58, // hip apex height above the eave for a normal-pitch roof
  eave: 9, // roof overhang past the walls
  door: 34, // door opening height (local px) — same on every building
  window: 24, // window opening height (local px)
  brickCourse: 8, // brick course height (local px)
  character: 46, // reference walking-character height, for scale calibration
} as const;

// ============================================================================
// PLOT TIERS — every building snaps to one of three standard footprints so the
// town tessellates on a grid and relative sizes are honest. `half` is the
// footprint half-extent in TILES from the origin (so span = 2*half tiles).
// A building may claim a larger tier when it genuinely needs the room (barn,
// harbor dock, observatory). Record the tier in the component's `meta.plot`.
// ============================================================================
export const PLOT = {
  small: { half: 0.8, tiles: "2×2" }, // cottages, market stalls, small stores
  normal: { half: 1.1, tiles: "3×3" }, // the default (the forge is normal)
  large: { half: 1.6, tiles: "4×4" }, // barns, docks, observatories, towers' base
} as const;
export type PlotTier = keyof typeof PLOT;

// ---- vector helpers ----
export const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
export const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const pts = (...ps: P[]): string => ps.map((p) => `${p.x},${p.y}`).join(" ");

/**
 * Point factory for a building anchored at `origin` (its footprint-center on
 * the ground). `gp(dx, dy, h)` returns the screen point at tile offset
 * (dx along +gx, dy along +gy), raised `h` px vertically. This is the single
 * coordinate system every building draws in.
 */
export function makeGp(origin: P) {
  return (dx: number, dy: number, h = 0): P => ({
    x: origin.x + (dx - dy) * T,
    y: origin.y + (dx + dy) * TH - h,
  });
}

/**
 * Affine matrix that maps the local PANEL rectangle onto an iso wall plane.
 * `origin` = screen point of the panel's local (0,0); `U` = screen vector for
 * local +x across the full panel width; `V` = screen vector for local +y down
 * the full panel height.
 */
export function panelMatrix(origin: P, U: P, V: P, lw = PANEL.LW, lh = PANEL.LH): string {
  return `matrix(${U.x / lw} ${U.y / lw} ${V.x / lh} ${V.y / lh} ${origin.x} ${origin.y})`;
}

// ---- materials: gradient defs, namespaced via the caller's useId ----
/**
 * Drop `<IsoDefs id={id} />` at the top of a building's <g>. `id` is a function
 * `(suffix) => uniqueId` built from useId so gallery instances never collide:
 *   const uid = useId().replace(/:/g, ""); const id = (s) => `${uid}-${s}`;
 * Then reference fills as `url(#${id("brickLit")})`, etc.
 */
export function IsoDefs({ id }: { id: (s: string) => string }): JSX.Element {
  return (
    <defs>
      <linearGradient id={id("brickLit")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a05636" /><stop offset="0.5" stopColor="#8a4a30" /><stop offset="1" stopColor="#6a3320" />
      </linearGradient>
      <linearGradient id={id("brickShade")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5e3320" /><stop offset="1" stopColor="#3f2014" />
      </linearGradient>
      <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0ddb4" /><stop offset="1" stopColor="#d8bf8c" />
      </linearGradient>
      <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" />
      </linearGradient>
      <linearGradient id={id("woodLit")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a5a30" /><stop offset="1" stopColor="#5a3a1f" />
      </linearGradient>
      <linearGradient id={id("woodShade")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a3a1f" /><stop offset="1" stopColor="#3a2715" />
      </linearGradient>
      <linearGradient id={id("slateLit")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7c7466" /><stop offset="1" stopColor="#565045" />
      </linearGradient>
      <linearGradient id={id("slateShade")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#544d42" /><stop offset="1" stopColor="#3a352d" />
      </linearGradient>
      <linearGradient id={id("thatchLit")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cda85a" /><stop offset="1" stopColor="#9c7838" />
      </linearGradient>
      <radialGradient id={id("furnace")} cx="0.5" cy="0.62" r="0.6">
        <stop offset="0" stopColor="#fff1c0" /><stop offset="0.4" stopColor="#ffa83a" /><stop offset="0.8" stopColor="#d4541c" /><stop offset="1" stopColor="#5a1c08" />
      </radialGradient>
      <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7">
        <stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" />
      </radialGradient>
      <linearGradient id={id("chimney")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a5230" /><stop offset="1" stopColor="#5a2a18" />
      </linearGradient>
      <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5aa0bd" /><stop offset="1" stopColor="#21516a" />
      </linearGradient>
    </defs>
  );
}

/**
 * Beveled, staggered brick courses in local PANEL space: a dark mortar line
 * with a thin highlight beneath each course, vertical joints staggered per row,
 * plus a scatter of tinted bricks for texture. Reproduces the approved forge.
 */
export function brick(prefix: string, lw = PANEL.LW, lh = PANEL.LH): JSX.Element {
  const courses: JSX.Element[] = [];
  const ch = SCALE.brickCourse;
  let row = 0;
  for (let y = ch; y < lh; y += ch) {
    courses.push(<line key={`${prefix}m${y}`} x1={0} y1={y} x2={lw} y2={y} stroke={PAL.brickDark} strokeWidth={1} opacity={0.5} vectorEffect="non-scaling-stroke" />);
    courses.push(<line key={`${prefix}h${y}`} x1={0} y1={y + 1} x2={lw} y2={y + 1} stroke="#a8633f" strokeWidth={0.8} opacity={0.4} vectorEffect="non-scaling-stroke" />);
    const off = row % 2 ? 0 : 7;
    for (let x = off; x <= lw; x += 14) {
      courses.push(<line key={`${prefix}j${y}-${x}`} x1={x} y1={y} x2={x} y2={y + ch} stroke={PAL.brickDark} strokeWidth={0.8} opacity={0.4} vectorEffect="non-scaling-stroke" />);
    }
    row++;
  }
  const tint = [[10, 12], [38, 4], [92, 20], [22, 52], [70, 60], [102, 44], [50, 28], [82, 76], [14, 70]];
  const tiles = tint.map(([x, y], i) => (
    <rect key={`${prefix}t${i}`} x={x} y={y} width={12} height={6} fill={i % 2 ? "#7a3a24" : "#9a5230"} opacity={0.35} />
  ));
  return <g>{courses}{tiles}</g>;
}

/** Horizontal clapboard/plank courses in local space (for timber walls). */
export function planks(prefix: string, lw = PANEL.LW, lh = PANEL.LH, step = 11): JSX.Element {
  const out: JSX.Element[] = [];
  for (let y = step; y < lh; y += step) {
    out.push(<line key={`${prefix}p${y}`} x1={0} y1={y} x2={lw} y2={y} stroke="rgba(0,0,0,.28)" strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    out.push(<line key={`${prefix}q${y}`} x1={0} y1={y + 1.2} x2={lw} y2={y + 1.2} stroke="rgba(255,235,200,.12)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />);
  }
  return <g>{out}</g>;
}

/**
 * Individually-shingled hip-roof slope (triangle eaveA-eaveB-apex). Rows run
 * parallel to the eave, converging toward the apex; each row is split into
 * overlapping slate tabs with a bottom shadow lip. Reproduces the approved forge.
 */
export function shingles(eaveA: P, eaveB: P, apex: P, fill: string, edge: string, key: string, rows = 7): JSX.Element {
  const out: JSX.Element[] = [];
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows;
    const t1 = (i + 1) / rows;
    const lA = lerp(eaveA, apex, t0);
    const lB = lerp(eaveB, apex, t0);
    const uA = lerp(eaveA, apex, t1);
    const uB = lerp(eaveB, apex, t1);
    const n = Math.max(2, Math.round((rows + 2) * (1 - t0)));
    const stag = (i % 2) * (0.5 / n);
    for (let j = 0; j < n; j++) {
      const s0 = Math.min(1, j / n + stag);
      const s1 = Math.min(1, (j + 1) / n + stag);
      const p1 = lerp(lA, lB, s0);
      const p2 = lerp(lA, lB, s1);
      const p3 = lerp(uA, uB, s1);
      const p4 = lerp(uA, uB, s0);
      out.push(<polygon key={`${key}${i}-${j}`} points={pts(p1, p2, p3, p4)} fill={fill} stroke={edge} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />);
      out.push(<line key={`${key}s${i}-${j}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,0,0,.32)" strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    }
  }
  return <g>{out}</g>;
}

/** Quadrilateral (mono-pitch) shingled panel: low edge p1→p2, high edge p4→p3. */
export function quadShingles(p1: P, p2: P, p3: P, p4: P, fill: string, key: string, rows = 5, cols = 6): JSX.Element {
  const out: JSX.Element[] = [];
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows; const t1 = (i + 1) / rows;
    const lA = lerp(p1, p4, t0); const lB = lerp(p2, p3, t0);
    const uA = lerp(p1, p4, t1); const uB = lerp(p2, p3, t1);
    const stag = (i % 2) * (0.5 / cols);
    for (let j = 0; j < cols; j++) {
      const s0 = Math.min(1, j / cols + stag); const s1 = Math.min(1, (j + 1) / cols + stag);
      out.push(<polygon key={`${key}${i}-${j}`} points={pts(lerp(lA, lB, s0), lerp(lA, lB, s1), lerp(uA, uB, s1), lerp(uA, uB, s0))} fill={fill} stroke="rgba(0,0,0,.22)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />);
      out.push(<line key={`${key}s${i}-${j}`} x1={lerp(lA, lB, s0).x} y1={lerp(lA, lB, s0).y} x2={lerp(lA, lB, s1).x} y2={lerp(lA, lB, s1).y} stroke="rgba(0,0,0,.26)" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />);
    }
  }
  return <g>{out}</g>;
}

/**
 * Full center-apex hip roof over a rectangular footprint, with overhung eaves,
 * shingled lit/shade slopes, a dark fascia underside, hip ridges (shadow +
 * highlight) and an apex finial. Pass the four eave corners (already pushed out
 * for overhang) in screen space + the apex, and the namespaced id fn.
 *   back/right/front/left are the four wall-top eave corners going clockwise
 *   from the rear (−gx,−gy) corner. front = (+gy) corner faces the viewer.
 */
export function HipRoof({
  back, right, front, left, apex, id, rows = 7,
}: { back: P; right: P; front: P; left: P; apex: P; id: (s: string) => string; rows?: number }): JSX.Element {
  return (
    <g>
      {/* far slopes drawn as flat fill (mostly hidden) */}
      <polygon points={pts(back, left, apex)} fill="#3a352d" />
      <polygon points={pts(back, right, apex)} fill="#3a352d" />
      {/* near slopes, shingled: SW (shade, left→front) and SE (lit, right→front) */}
      {shingles(left, front, apex, `url(#${id("slateShade")})`, "rgba(0,0,0,.25)", "rsw", rows)}
      {shingles(right, front, apex, `url(#${id("slateLit")})`, "rgba(0,0,0,.2)", "rse", rows)}
      {/* eave fascia / overhang underside */}
      <polyline points={pts(left, front, right)} fill="none" stroke="#241f19" strokeWidth={3.5} />
      {/* hip ridges: shadow then highlight */}
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}>
          <line x1={apex.x} y1={apex.y} x2={front.x} y2={front.y} />
          <line x1={apex.x} y1={apex.y} x2={right.x} y2={right.y} />
          <line x1={apex.x} y1={apex.y} x2={left.x} y2={left.y} />
        </g>
        <g stroke={PAL.ridge} strokeWidth={1.4} opacity={0.85}>
          <line x1={apex.x} y1={apex.y} x2={front.x} y2={front.y} />
          <line x1={apex.x} y1={apex.y} x2={right.x} y2={right.y} />
          <line x1={apex.x} y1={apex.y} x2={left.x} y2={left.y} />
        </g>
      </g>
      <circle cx={apex.x} cy={apex.y} r={2.6} fill={PAL.ridge} />
    </g>
  );
}

/** A brick chimney standing `h` px tall, centered at screen (cx,cy) on the roof. */
export function Chimney({ cx, cy, h, half, gid }: { cx: number; cy: number; h: number; half: number; gid: string }): JSX.Element {
  const hh = half * (TILE_H / TILE_W);
  const top = cy - h;
  const fRight = `${cx + half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx + half},${cy + hh - h}`;
  const fLeft = `${cx - half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx - half},${cy + hh - h}`;
  const cap = `${cx},${top} ${cx + half},${top + hh} ${cx},${top + 2 * hh} ${cx - half},${top + hh}`;
  return (
    <g>
      <polygon points={fLeft} fill={PAL.brickDark} />
      <polygon points={fRight} fill={`url(#${gid})`} />
      <line x1={cx} y1={cy + 2 * hh - h * 0.66} x2={cx + half} y2={cy + hh - h * 0.66} stroke={PAL.brickDark} strokeWidth={0.6} opacity={0.6} />
      <line x1={cx} y1={cy + 2 * hh - h * 0.33} x2={cx + half} y2={cy + hh - h * 0.33} stroke={PAL.brickDark} strokeWidth={0.6} opacity={0.6} />
      <polygon points={cap} fill="#6a3320" />
      <polygon points={`${cx},${top + 1.5} ${cx + half * 0.8},${top + hh} ${cx},${top + 2 * hh - 1.5} ${cx - half * 0.8},${top + hh}`} fill="#4a2014" />
    </g>
  );
}

/** Ground-contact shadow ellipse under a building footprint (+ optional warm spill). */
export function GroundShadow({ origin, rx, ry, warm = false }: { origin: P; rx: number; ry: number; warm?: boolean }): JSX.Element {
  return (
    <g>
      <ellipse cx={origin.x} cy={origin.y + 3} rx={rx} ry={ry} fill="rgba(0,0,0,.30)" />
      {warm && <ellipse cx={origin.x} cy={origin.y + 1} rx={rx - 12} ry={ry - 6} fill="rgba(255,130,40,.10)" />}
    </g>
  );
}

/**
 * A cobbled apron quad on the ground (screen-space corners a,b,c,d). Joint lines
 * follow both axes. Use for forecourts / yards that frame a building.
 */
export function CobbleApron({ a, b, c, d, fill = "#9a8e72" }: { a: P; b: P; c: P; d: P; fill?: string }): JSX.Element {
  const joints: JSX.Element[] = [];
  for (let t = 0.18; t < 1; t += 0.18) {
    joints.push(<line key={`jx${t}`} x1={lerp(a, d, t).x} y1={lerp(a, d, t).y} x2={lerp(b, c, t).x} y2={lerp(b, c, t).y} stroke="rgba(0,0,0,.14)" strokeWidth={1} />);
    joints.push(<line key={`jy${t}`} x1={lerp(a, b, t).x} y1={lerp(a, b, t).y} x2={lerp(d, c, t).x} y2={lerp(d, c, t).y} stroke="rgba(0,0,0,.14)" strokeWidth={1} />);
  }
  return (
    <g>
      <polygon points={pts(a, b, c, d)} fill={fill} />
      <polygon points={pts(a, b, c, d)} fill="rgba(255,210,150,.05)" />
      {joints}
    </g>
  );
}

/**
 * Mullioned glowing window in local PANEL space, centered at (cx, top-anchored).
 * `lit` toggles the warm flicker. Width/height default to the reference scale.
 */
export function Window({
  cx, y, w = 18, h = SCALE.window, id, lit = true, dur = 3,
}: { cx: number; y: number; w?: number; h?: number; id: (s: string) => string; lit?: boolean; dur?: number }): JSX.Element {
  return (
    <g>
      <rect x={cx - w / 2 - 2} y={y - 2} width={w + 4} height={h + 4} rx={1.5} fill="#2c1c0e" />
      <rect x={cx - w / 2} y={y} width={w} height={h} fill={lit ? `url(#${id("pane")})` : "#3a4a52"} style={lit ? { animation: `flicker ${dur}s ease-in-out infinite`, transformOrigin: `${cx}px ${y + h / 2}px` } : undefined} />
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      <line x1={cx - w / 2} y1={y + h / 2} x2={cx + w / 2} y2={y + h / 2} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      <rect x={cx - w / 2 - 1} y={y + h} width={w + 2} height={3} rx={1} fill="#7a5c34" />
    </g>
  );
}

/**
 * Arched plank door in local PANEL space at footprint bottom (y = lh), centered
 * at `cx`. `nearDoor` lights a pulsing glow used by the walkable world. Mark the
 * group with data-door so the engine can find the entry.
 */
export function Door({
  cx, lh = PANEL.LH, w = 32, h = SCALE.door, nearDoor = false,
}: { cx: number; lh?: number; w?: number; h?: number; nearDoor?: boolean }): JSX.Element {
  const r = w / 2;
  return (
    <g data-door="entry">
      <ellipse cx={cx} cy={lh - h + 10} rx={r + 6} ry={h - 6} fill="#ff8a28" opacity={nearDoor ? 0.34 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${cx}px ${lh - h + 10}px` } : undefined} />
      <path d={`M${cx - r},${lh} L${cx - r},${lh - h + r} a${r},${r} 0 0 1 ${w},0 L${cx + r},${lh} Z`} fill="#2c1c0e" />
      <path d={`M${cx - r + 4},${lh} L${cx - r + 4},${lh - h + r} a${r - 4},${r - 4} 0 0 1 ${w - 8},0 L${cx + r - 4},${lh} Z`} fill="#160d06" />
      <line x1={cx} y1={lh} x2={cx} y2={lh - h + 2} stroke="#160d06" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={cx - r + 2} y={lh - h + r + 4} width={5} height={2} fill="#2c2620" />
      <rect x={cx - r + 2} y={lh - 12} width={5} height={2} fill="#2c2620" />
    </g>
  );
}

/** A small bracket lantern in local space (warm flicker). */
export function Lantern({ x, y, id }: { x: number; y: number; id: (s: string) => string }): JSX.Element {
  return (
    <g>
      <path d={`M${x - 12},${y} q9,-2 12,5`} fill="none" stroke="#2c2012" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      <circle cx={x} cy={y + 16} r={8} fill="#ff8a28" opacity={0.24} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${x}px ${y + 16}px` }} />
      <polygon points={`${x},${y + 7} ${x + 5},${y + 10} ${x + 5},${y + 22} ${x},${y + 25} ${x - 5},${y + 22} ${x - 5},${y + 10}`} fill="#2c2012" />
      <rect x={x - 3} y={y + 10} width={6} height={11} rx={1} fill={`url(#${id("pane")})`} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${x}px ${y + 16}px` }} />
    </g>
  );
}
