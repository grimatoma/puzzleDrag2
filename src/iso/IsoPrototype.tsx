// Isometric comparison world: three forge renderings side by side on one large
// plot so they can be judged against each other —
//   1 · Iso redraw (v2)     — bespoke isometric drawing
//   2 · Direct transfer     — the real ForgeIllustration, billboarded
//   3 · Premium true-iso     — high-detail isometric build
// A single walkable character (arrow keys / WASD / click) depth-sorts against
// all three, collides with their footprints, and can enter any of them.

import { useEffect, useRef, useState } from "react";
import { toScreen, toGrid, depthOf, tileDiamond, TILE_W, TILE_H } from "./isoMath.js";
import IsoForgeDetailed from "./variants/IsoForgeDetailed.jsx";
import IsoForgeBillboard from "./variants/IsoForgeBillboard.jsx";
import IsoForgePremium from "./variants/IsoForgePremium.jsx";
import IsoForgeDeluxe from "./variants/IsoForgeDeluxe.jsx";
import IsoCharacter from "./IsoCharacter.jsx";
import IsoInterior from "./IsoInterior.jsx";

type Pt = { gx: number; gy: number };
type Building = {
  id: string;
  label: string;
  Comp: (p: { originX: number; originY: number; nearDoor?: boolean }) => JSX.Element;
  center: Pt;
};

const GRID = 15; // 15×15 plot
const PAD = 90;
const SPEED = 3.4;
const FOOT = 1.25; // footprint half-extent (collision)
const NEAR_RADIUS = 1.0;
const ENTER_RADIUS = 0.5;

// The three forges sit on the same anti-diagonal (constant gx+gy) so they line
// up across the screen at the same depth without occluding each other.
const BUILDINGS: Building[] = [
  { id: "detailed", label: "1 · Iso redraw (v2)", Comp: IsoForgeDetailed, center: { gx: 1, gy: 13 } },
  { id: "billboard", label: "2 · Direct transfer", Comp: IsoForgeBillboard, center: { gx: 5, gy: 9 } },
  { id: "premium", label: "3 · Premium true-iso", Comp: IsoForgePremium, center: { gx: 9, gy: 5 } },
  { id: "deluxe", label: "4 · Deluxe smithy", Comp: IsoForgeDeluxe, center: { gx: 13, gy: 1 } },
];

const doorOf = (b: Building): Pt => ({ gx: b.center.gx, gy: b.center.gy + 2.2 });
const doorstepOf = (b: Building): Pt => ({ gx: b.center.gx, gy: b.center.gy + 3.3 });
const boxOf = (b: Building) => ({
  minGx: b.center.gx - FOOT, maxGx: b.center.gx + FOOT,
  minGy: b.center.gy - FOOT, maxGy: b.center.gy + FOOT,
});

const CHAR_START: Pt = { gx: 7, gy: 12 };

const MOVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);

function clampToPlot(v: number): number {
  return Math.max(0, Math.min(GRID - 1, v));
}
function inAnyForge(gx: number, gy: number): boolean {
  return BUILDINGS.some((b) => {
    const k = boxOf(b);
    return gx > k.minGx && gx < k.maxGx && gy > k.minGy && gy < k.maxGy;
  });
}
function resolveMove(ox: number, oy: number, nx: number, ny: number): Pt {
  const cx = clampToPlot(nx);
  const cy = clampToPlot(ny);
  if (!inAnyForge(cx, cy)) return { gx: cx, gy: cy };
  if (!inAnyForge(cx, oy)) return { gx: cx, gy: oy };
  if (!inAnyForge(ox, cy)) return { gx: ox, gy: cy };
  return { gx: ox, gy: oy };
}
// nearest building whose door is within NEAR_RADIUS, else -1
function nearestDoor(gx: number, gy: number): number {
  let best = -1;
  let bestD = NEAR_RADIUS;
  BUILDINGS.forEach((b, i) => {
    const d = doorOf(b);
    const dist = Math.hypot(gx - d.gx, gy - d.gy);
    if (dist <= bestD) { bestD = dist; best = i; }
  });
  return best;
}

export default function IsoPrototype() {
  const corners = [toScreen(0, 0), toScreen(GRID - 1, 0), toScreen(0, GRID - 1), toScreen(GRID - 1, GRID - 1)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs) - TILE_W / 2 - PAD;
  const maxX = Math.max(...xs) + TILE_W / 2 + PAD;
  const minY = Math.min(...ys) - TILE_H / 2 - PAD - 210; // headroom for tall buildings + labels
  const maxY = Math.max(...ys) + TILE_H / 2 + PAD;

  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef({ ...CHAR_START });
  const keys = useRef<Set<string>>(new Set());
  const target = useRef<Pt | null>(null);
  const [pos, setPos] = useState(CHAR_START);
  const [walking, setWalking] = useState(false);
  const [nearIdx, setNearIdx] = useState(-1);
  const [inside, setInside] = useState(-1);
  const nearRef = useRef(-1);
  const insideRef = useRef(-1);

  const enter = (i: number) => { insideRef.current = i; setInside(i); keys.current.clear(); target.current = null; };
  const leave = () => {
    const i = insideRef.current;
    insideRef.current = -1;
    setInside(-1);
    if (i >= 0) { const s = doorstepOf(BUILDINGS[i]); posRef.current = { ...s }; setPos({ ...s }); }
    keys.current.clear();
    target.current = null;
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape" && insideRef.current >= 0) { leave(); return; }
      if ((k === "enter" || k === " ") && nearRef.current >= 0 && insideRef.current < 0) { enter(nearRef.current); e.preventDefault(); return; }
      if (MOVE_KEYS.has(k)) { keys.current.add(k); target.current = null; e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (insideRef.current >= 0) { raf = requestAnimationFrame(tick); return; }
      let { gx, gy } = posRef.current;
      let moving = false;

      let dgx = 0;
      let dgy = 0;
      const ks = keys.current;
      if (ks.has("arrowup") || ks.has("w")) { dgx -= 1; dgy -= 1; }
      if (ks.has("arrowdown") || ks.has("s")) { dgx += 1; dgy += 1; }
      if (ks.has("arrowleft") || ks.has("a")) { dgx -= 1; dgy += 1; }
      if (ks.has("arrowright") || ks.has("d")) { dgx += 1; dgy -= 1; }

      if (dgx !== 0 || dgy !== 0) {
        const len = Math.hypot(dgx, dgy);
        const r = resolveMove(gx, gy, gx + (dgx / len) * SPEED * dt, gy + (dgy / len) * SPEED * dt);
        gx = r.gx; gy = r.gy; moving = true;
      } else if (target.current) {
        const tg = target.current;
        const ddx = tg.gx - gx;
        const ddy = tg.gy - gy;
        const d = Math.hypot(ddx, ddy);
        if (d < 0.08) { target.current = null; } else {
          const step = Math.min(d, SPEED * dt);
          const r = resolveMove(gx, gy, gx + (ddx / d) * step, gy + (ddy / d) * step);
          if (Math.abs(r.gx - gx) < 1e-4 && Math.abs(r.gy - gy) < 1e-4) target.current = null;
          gx = r.gx; gy = r.gy; moving = true;
        }
      }

      posRef.current = { gx, gy };
      setPos({ gx, gy });
      setWalking(moving);

      const ni = nearestDoor(gx, gy);
      if (ni !== nearRef.current) { nearRef.current = ni; setNearIdx(ni); }
      if (ni >= 0) {
        const dr = doorOf(BUILDINGS[ni]);
        if (Math.hypot(gx - dr.gx, gy - dr.gy) <= ENTER_RADIUS) enter(ni);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const g = toGrid(loc.x, loc.y);
    target.current = { gx: clampToPlot(g.gx), gy: clampToPlot(g.gy) };
    keys.current.clear();
  };

  // Door / doorstep tiles get a cobble patch.
  const cobble = new Set<string>();
  BUILDINGS.forEach((b) => {
    [doorOf(b), doorstepOf(b)].forEach((tt) => cobble.add(`${Math.round(tt.gx)}-${Math.round(tt.gy)}`));
  });

  const tiles: JSX.Element[] = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const isCobble = cobble.has(`${gx}-${gy}`);
      const fill = isCobble ? "#b9ac86" : (gx + gy) % 2 === 0 ? "#6fa04a" : "#629247";
      tiles.push(<polygon key={`${gx}-${gy}`} points={tileDiamond(gx, gy)} fill={fill} stroke="rgba(0,0,0,.16)" strokeWidth={1} />);
    }
  }

  // Depth-sorted entities: the three buildings + the character.
  const charScreen = toScreen(pos.gx, pos.gy);
  const entities = [
    ...BUILDINGS.map((b, i) => {
      const a = toScreen(b.center.gx, b.center.gy);
      return { key: b.id, depth: depthOf(b.center.gx, b.center.gy), el: <b.Comp originX={a.x} originY={a.y} nearDoor={nearIdx === i} /> };
    }),
    { key: "char", depth: depthOf(pos.gx, pos.gy) + 0.01, el: <IsoCharacter x={charScreen.x} y={charScreen.y} walking={walking} /> },
  ].sort((a, b) => a.depth - b.depth);

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#1c2530", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: 12, left: 12, zIndex: 10, color: "#cdd9e5", fontFamily: "system-ui, sans-serif", fontSize: "13px", background: "rgba(0,0,0,.4)", padding: "6px 10px", borderRadius: "6px" }}>
        Iso forge comparison — arrow keys / WASD or click to walk · approach a door to enter
      </div>

      {nearIdx >= 0 && inside < 0 && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, color: "#fff2dc", fontFamily: "system-ui, sans-serif", fontSize: "15px", fontWeight: 600, background: "rgba(40,20,8,.82)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,170,80,.5)", animation: "fadeIn 0.2s ease-out" }}>
          ↵ Enter — {BUILDINGS[nearIdx].label}
        </div>
      )}

      {inside >= 0 && <IsoInterior onLeave={leave} />}

      <svg ref={svgRef} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} style={{ width: "100%", height: "100vh", display: "block", cursor: "pointer" }} preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown}>
        <g data-layer="ground">{tiles}</g>
        <g data-layer="entities">{entities.map((ent) => <g key={ent.key}>{ent.el}</g>)}</g>
        {/* labels above each building (always on top) */}
        <g data-layer="labels">
          {BUILDINGS.map((b) => {
            const a = toScreen(b.center.gx, b.center.gy);
            return (
              <text key={b.id} x={a.x} y={a.y - 188} textAnchor="middle" style={{ font: "600 13px system-ui, sans-serif", fill: "#ffffff", stroke: "rgba(0,0,0,.75)", strokeWidth: 3.5, paintOrder: "stroke" } as React.CSSProperties}>
                {b.label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
