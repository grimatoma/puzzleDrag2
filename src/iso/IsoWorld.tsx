// Reusable isometric walkable world. Renders a ground grid + a set of buildings
// with a single character that walks (arrow keys / WASD / click-to-walk),
// depth-sorts against every building, collides with their footprints, and can
// enter any one (proximity prompt → interior → Esc/Leave). Both the comparison
// scene and the street scene are just different configs passed to this engine.

import { useEffect, useRef, useState } from "react";
import { toScreen, toGrid, depthOf, tileDiamond, TILE_W, TILE_H } from "./isoMath.js";
import IsoCharacter from "./IsoCharacter.jsx";
import IsoInterior from "./IsoInterior.jsx";

export type Pt = { gx: number; gy: number };
export type WorldBuilding = {
  id: string;
  label?: string;
  Comp: (p: { originX: number; originY: number; nearDoor?: boolean }) => JSX.Element;
  center: Pt;
  footHalf?: number;
};
export type WorldConfig = {
  gridW: number;
  gridH: number;
  buildings: WorldBuilding[];
  start: Pt;
  tileFill: (gx: number, gy: number) => string;
  caption: string;
  showLabels?: boolean;
};

const PAD = 90;
const SPEED = 3.6;
const NEAR_RADIUS = 1.0;
const ENTER_RADIUS = 0.5;
const MOVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);

const doorOf = (b: WorldBuilding): Pt => ({ gx: b.center.gx, gy: b.center.gy + 2.2 });
const doorstepOf = (b: WorldBuilding): Pt => ({ gx: b.center.gx, gy: b.center.gy + 3.3 });
const boxOf = (b: WorldBuilding) => {
  const h = b.footHalf ?? 1.25;
  return { minGx: b.center.gx - h, maxGx: b.center.gx + h, minGy: b.center.gy - h, maxGy: b.center.gy + h };
};

export default function IsoWorld({ gridW, gridH, buildings, start, tileFill, caption, showLabels }: WorldConfig) {
  const clampX = (v: number) => Math.max(0, Math.min(gridW - 1, v));
  const clampY = (v: number) => Math.max(0, Math.min(gridH - 1, v));
  const inAny = (gx: number, gy: number) =>
    buildings.some((b) => { const k = boxOf(b); return gx > k.minGx && gx < k.maxGx && gy > k.minGy && gy < k.maxGy; });
  const resolveMove = (ox: number, oy: number, nx: number, ny: number): Pt => {
    const cx = clampX(nx); const cy = clampY(ny);
    if (!inAny(cx, cy)) return { gx: cx, gy: cy };
    if (!inAny(cx, oy)) return { gx: cx, gy: oy };
    if (!inAny(ox, cy)) return { gx: ox, gy: cy };
    return { gx: ox, gy: oy };
  };
  const nearestDoor = (gx: number, gy: number): number => {
    let best = -1; let bestD = NEAR_RADIUS;
    buildings.forEach((b, i) => { const d = doorOf(b); const dist = Math.hypot(gx - d.gx, gy - d.gy); if (dist <= bestD) { bestD = dist; best = i; } });
    return best;
  };

  // viewbox from grid corners (+ headroom for tall buildings / labels)
  const corners = [toScreen(0, 0), toScreen(gridW - 1, 0), toScreen(0, gridH - 1), toScreen(gridW - 1, gridH - 1)];
  const xs = corners.map((c) => c.x); const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs) - TILE_W / 2 - PAD;
  const maxX = Math.max(...xs) + TILE_W / 2 + PAD;
  const minY = Math.min(...ys) - TILE_H / 2 - PAD - 230;
  const maxY = Math.max(...ys) + TILE_H / 2 + PAD;

  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef({ ...start });
  const keys = useRef<Set<string>>(new Set());
  const target = useRef<Pt | null>(null);
  const [pos, setPos] = useState(start);
  const [walking, setWalking] = useState(false);
  const [nearIdx, setNearIdx] = useState(-1);
  const [inside, setInside] = useState(-1);
  const nearRef = useRef(-1);
  const insideRef = useRef(-1);

  const enter = (i: number) => { insideRef.current = i; setInside(i); keys.current.clear(); target.current = null; };
  const leave = () => {
    const i = insideRef.current; insideRef.current = -1; setInside(-1);
    if (i >= 0) { const s = doorstepOf(buildings[i]); posRef.current = { ...s }; setPos({ ...s }); }
    keys.current.clear(); target.current = null;
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

    let raf = 0; let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (insideRef.current >= 0) { raf = requestAnimationFrame(tick); return; }
      let { gx, gy } = posRef.current; let moving = false;
      let dgx = 0; let dgy = 0; const ks = keys.current;
      if (ks.has("arrowup") || ks.has("w")) { dgx -= 1; dgy -= 1; }
      if (ks.has("arrowdown") || ks.has("s")) { dgx += 1; dgy += 1; }
      if (ks.has("arrowleft") || ks.has("a")) { dgx -= 1; dgy += 1; }
      if (ks.has("arrowright") || ks.has("d")) { dgx += 1; dgy -= 1; }
      if (dgx !== 0 || dgy !== 0) {
        const len = Math.hypot(dgx, dgy);
        const r = resolveMove(gx, gy, gx + (dgx / len) * SPEED * dt, gy + (dgy / len) * SPEED * dt);
        gx = r.gx; gy = r.gy; moving = true;
      } else if (target.current) {
        const tg = target.current; const ddx = tg.gx - gx; const ddy = tg.gy - gy; const d = Math.hypot(ddx, ddy);
        if (d < 0.08) { target.current = null; } else {
          const step = Math.min(d, SPEED * dt);
          const r = resolveMove(gx, gy, gx + (ddx / d) * step, gy + (ddy / d) * step);
          if (Math.abs(r.gx - gx) < 1e-4 && Math.abs(r.gy - gy) < 1e-4) target.current = null;
          gx = r.gx; gy = r.gy; moving = true;
        }
      }
      posRef.current = { gx, gy }; setPos({ gx, gy }); setWalking(moving);
      const ni = nearestDoor(gx, gy);
      if (ni !== nearRef.current) { nearRef.current = ni; setNearIdx(ni); }
      if (ni >= 0) { const dr = doorOf(buildings[ni]); if (Math.hypot(gx - dr.gx, gy - dr.gy) <= ENTER_RADIUS) enter(ni); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const g = toGrid(loc.x, loc.y);
    target.current = { gx: clampX(g.gx), gy: clampY(g.gy) };
    keys.current.clear();
  };

  const tiles: JSX.Element[] = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      tiles.push(<polygon key={`${gx}-${gy}`} points={tileDiamond(gx, gy)} fill={tileFill(gx, gy)} stroke="rgba(0,0,0,.14)" strokeWidth={1} />);
    }
  }

  const charScreen = toScreen(pos.gx, pos.gy);
  const entities = [
    ...buildings.map((b, i) => {
      const a = toScreen(b.center.gx, b.center.gy);
      return { key: b.id, depth: depthOf(b.center.gx, b.center.gy), el: <b.Comp originX={a.x} originY={a.y} nearDoor={nearIdx === i} /> };
    }),
    { key: "char", depth: depthOf(pos.gx, pos.gy) + 0.01, el: <IsoCharacter x={charScreen.x} y={charScreen.y} walking={walking} /> },
  ].sort((a, b) => a.depth - b.depth);

  return (
    <>
      <div style={{ position: "fixed", top: 12, left: 12, zIndex: 10, color: "#cdd9e5", fontFamily: "system-ui, sans-serif", fontSize: "13px", background: "rgba(0,0,0,.4)", padding: "6px 10px", borderRadius: "6px" }}>
        {caption}
      </div>
      {nearIdx >= 0 && inside < 0 && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10, color: "#fff2dc", fontFamily: "system-ui, sans-serif", fontSize: "15px", fontWeight: 600, background: "rgba(40,20,8,.82)", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,170,80,.5)", animation: "fadeIn 0.2s ease-out" }}>
          ↵ Enter{buildings[nearIdx].label ? ` — ${buildings[nearIdx].label}` : ""}
        </div>
      )}
      {inside >= 0 && <IsoInterior onLeave={leave} />}
      <svg ref={svgRef} viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} style={{ width: "100%", height: "100vh", display: "block", cursor: "pointer" }} preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown}>
        <g data-layer="ground">{tiles}</g>
        <g data-layer="entities">{entities.map((ent) => <g key={ent.key}>{ent.el}</g>)}</g>
        {showLabels && (
          <g data-layer="labels">
            {buildings.map((b) => {
              const a = toScreen(b.center.gx, b.center.gy);
              return b.label ? (
                <text key={b.id} x={a.x} y={a.y - 188} textAnchor="middle" style={{ font: "600 13px system-ui, sans-serif", fill: "#ffffff", stroke: "rgba(0,0,0,.75)", strokeWidth: 3.5, paintOrder: "stroke" } as React.CSSProperties}>
                  {b.label}
                </text>
              ) : null;
            })}
          </g>
        )}
      </svg>
    </>
  );
}
