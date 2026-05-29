// larder — stone cold-store (SMALL plot).
// A squat coursed-stone store with quoins under a terracotta hip roof. A heavy
// arched timber door with iron strap-hinges + a ring handle sits on the lit
// face; a narrow window shows a cold blue interior lined with preserve jars; and
// a hook bar by the door hangs bundles of drying herbs that sway.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Stone cold-store; coursed stone + quoins, terracotta hip roof, heavy arched iron-strap door (hero), cold blue jar window, swaying hung herb bundles. Small tier.",
};

const HALF_W = 50, HALF_H = 25, WALL_H = 54, ROOF_RISE = 40, EAVE = 8, LW = 120, LH = 92;

export default function IsoLarder({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const right = add(o, { x: HALF_W, y: 0 }), bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H }, rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H }, leftT = { x: o.x - HALF_W, y: o.y - WALL_H };
  const apex = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * HALF_H) / HALF_W;
  const topE = { x: topT.x, y: topT.y - eY }, rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY }, leftE = { x: leftT.x - EAVE, y: leftT.y };
  const seMatrix = panelMatrix(bottomT, { x: HALF_W, y: -HALF_H }, { x: 0, y: WALL_H });
  const swMatrix = panelMatrix(leftT, { x: HALF_W, y: HALF_H }, { x: 0, y: WALL_H });
  const fc = LW / 2;

  const coursing = (lit: boolean) => (
    <g stroke={lit ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.2)"} strokeWidth={0.6} vectorEffect="non-scaling-stroke">
      {[20, 38, 56, 74].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}
      {[20, 56].map((y) => [30, 60, 90].map((x) => <line key={`${y}-${x}`} x1={x} y1={y} x2={x} y2={y + 18} vectorEffect="non-scaling-stroke" />))}
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b2a888" /><stop offset="1" stopColor="#928768" /></linearGradient>
        <linearGradient id={id("stoneShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#867a5e" /><stop offset="1" stopColor="#665b44" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c0623f" /><stop offset="1" stopColor="#853620" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#933f26" /><stop offset="1" stopColor="#5e2415" /></linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 14} ry={HALF_H + 5} fill="rgba(0,0,0,.28)" />

      {/* SW wall (shade) — cold jar window + hanging herbs */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneShade")})`} />
        {coursing(false)}
        <rect x={0} y={LH - 9} width={LW} height={9} fill="#665b44" />
        {/* cold window with jars */}
        <rect x={20} y={28} width={26} height={30} fill="#1a1410" /><rect x={22} y={30} width={22} height={26} fill="#2a2e36" />
        <g fill="#4a5060"><ellipse cx={28} cy={46} rx={3} ry={4.2} /><ellipse cx={34} cy={46} rx={2.7} ry={4.8} /><ellipse cx={40} cy={46} rx={3} ry={3.8} /></g>
        <g fill="#e0a83a" opacity={0.5} style={{ animation: "bob 4s ease-in-out infinite", transformOrigin: "34px 40px" }}><rect x={25} y={40} width={6} height={1.8} rx={0.5} /><rect x={31} y={39} width={5} height={1.8} rx={0.5} /><rect x={37} y={40.5} width={6} height={1.8} rx={0.5} /></g>
        <line x1={33} y1={30} x2={33} y2={56} stroke="#1a1410" strokeWidth={1} /><line x1={22} y1={43} x2={44} y2={43} stroke="#1a1410" strokeWidth={1} />
        {/* hook bar + hanging herb bundles */}
        <rect x={70} y={20} width={36} height={2} rx={0.5} fill="#2a2a2a" />
        {[{ x: 78, c: "#9060a8", l: "#aab050", d: 3.6 }, { x: 90, c: "#788840", l: "#607030", d: 4.2 }, { x: 100, c: "#c08040", l: "#a07840", d: 3.2 }].map((b, i) => (
          <g key={i} style={{ animation: `sway ${b.d}s ${i * 0.5}s ease-in-out infinite`, transformOrigin: `${b.x}px 22px` }}>
            <line x1={b.x} y1={22} x2={b.x} y2={34} stroke="#5a6820" strokeWidth={0.9} />
            <ellipse cx={b.x} cy={40} rx={3.5} ry={6} fill={b.l} /><ellipse cx={b.x} cy={39} rx={2.4} ry={4.4} fill={b.c} opacity={0.8} />
          </g>
        ))}
      </g>

      {/* SE wall (lit) — heavy arched iron-strap door (hero) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneLit")})`} />
        {coursing(true)}
        <rect x={0} y={0} width={LW} height={4} fill="rgba(255,235,200,.14)" />
        <rect x={0} y={LH - 9} width={LW} height={9} fill="#665b44" />
        <g data-door="entry">
          {nearDoor && <ellipse cx={fc + 16} cy={LH - 26} rx={18} ry={24} fill="#ff8a28" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc + 16}px ${LH - 26}px` }} />}
          <path d={`M${fc + 2},${LH} L${fc + 2},${LH - 44} a14,14 0 0 1 28,0 L${fc + 30},${LH} Z`} fill="#5b5346" />
          <path d={`M${fc + 5},${LH} L${fc + 5},${LH - 42} a11,11 0 0 1 22,0 L${fc + 27},${LH} Z`} fill={PAL.timber} />
          <g stroke="#3a2010" strokeWidth={0.7} opacity={0.5}>{[LH - 30, LH - 18].map((y) => <line key={y} x1={fc + 5} y1={y} x2={fc + 27} y2={y} />)}</g>
          {/* iron straps */}
          <g fill="#2a2a2a">{[LH - 38, LH - 26, LH - 14].map((y) => <rect key={y} x={fc + 5} y={y} width={9} height={2} rx={0.5} />)}</g>
          <circle cx={fc + 22} cy={LH - 22} r={2.4} fill="none" stroke="#2a2a2a" strokeWidth={1.4} />
          <ellipse cx={fc + 16} cy={LH - 44} rx={3} ry={1.8} fill={PAL.stone} />
        </g>
      </g>

      {/* eave + terracotta hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3} />
      <polygon points={pts(topE, leftE, apex)} fill="#5e2415" />
      <polygon points={pts(topE, rightE, apex)} fill="#5e2415" />
      {shingles(leftE, bottomE, apex, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 5)}
      {shingles(rightE, bottomE, apex, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 5)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3} />
      <g fill="none" strokeLinecap="round"><g stroke="rgba(0,0,0,.4)" strokeWidth={2.4}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g><g stroke={PAL.ridge} strokeWidth={1.2} opacity={0.8}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g></g>
    </g>
  );
}
