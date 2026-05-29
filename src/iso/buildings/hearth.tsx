// hearth — the town's home (NORMAL plot, the warm heart of the village).
// A wide, squat coursed-stone cottage with quoins under a terracotta hip roof.
// Two big amber-glowing windows flank an arched timber door with an iron ring
// (the welcoming hero); a tall brick chimney smokes; a flagstone path leads to
// the step, with little flowering garden bushes that wiggle. Extra-warm ground
// spill makes it feel lived-in.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney, Window } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "The town home; wide coursed-stone cottage + quoins, terracotta hip roof, two warm windows flanking an arched iron-ring door (hero), tall smoking brick chimney, flagstone path + wiggling garden bushes, warm ground spill.",
};

const HALF_W = 62, HALF_H = 31, WALL_H = 66, ROOF_RISE = 48, EAVE = 9, LW = 120, LH = 92;

export default function IsoHearth({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = (dx: number, dy: number, h = 0): P => ({ x: o.x + (dx - dy) * 32, y: o.y + (dx + dy) * 16 - h });
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
    <g stroke={lit ? "rgba(0,0,0,.1)" : "rgba(0,0,0,.18)"} strokeWidth={0.6} vectorEffect="non-scaling-stroke">
      {[18, 36, 54, 72].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}
      {[18, 54].map((y) => [30, 60, 90].map((x) => <line key={`${y}-${x}`} x1={x} y1={y} x2={x} y2={y + 18} vectorEffect="non-scaling-stroke" />))}
    </g>
  );
  const quoins = (rightSide: boolean) => (
    <g fill="rgba(0,0,0,.14)">{[6, 26, 46, 66].map((y) => <rect key={y} x={rightSide ? LW - 7 : 0} y={y} width={7} height={11} />)}</g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b6ab8e" /><stop offset="1" stopColor="#968a6c" /></linearGradient>
        <linearGradient id={id("stoneShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a7e62" /><stop offset="1" stopColor="#6a5f48" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#a23f24" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6f2716" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff0b8" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#ffcf6a" /><stop offset="1" stopColor="#7a3a10" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 4} ry={HALF_H - 4} fill="rgba(255,170,70,.16)" />

      {/* flagstone path to the door (front) */}
      {[0.7, 1.15, 1.6].map((dy, i) => { const c = gp(0, dy, 0); return <ellipse key={i} cx={c.x} cy={c.y} rx={9 - i} ry={4 - i * 0.6} fill={PAL.stone} opacity={0.6} />; })}

      {/* SW wall (shade) — a warm window */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneShade")})`} />
        {coursing(false)}{quoins(false)}
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.18)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={fc} y={32} w={22} h={24} id={id} lit dur={3.4} />
      </g>

      {/* SE wall (lit) — two warm windows flanking the arched door (hero) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneLit")})`} />
        {coursing(true)}{quoins(true)}
        <rect x={0} y={0} width={LW} height={4} fill="rgba(255,235,200,.16)" />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.12)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={24} y={30} w={20} h={24} id={id} lit dur={2.9} />
        <Window cx={96} y={30} w={20} h={24} id={id} lit dur={3.6} />
        {/* arched door */}
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 26} rx={18} ry={24} fill={`url(#${id("glow")})`} opacity={nearDoor ? 0.5 : 0.32} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 26}px` } : undefined} />
          <path d={`M${fc - 14},${LH} L${fc - 14},${LH - 30} a14,14 0 0 1 28,0 L${fc + 14},${LH} Z`} fill={PAL.stoneShade} />
          <path d={`M${fc - 11},${LH} L${fc - 11},${LH - 28} a11,11 0 0 1 22,0 L${fc + 11},${LH} Z`} fill={PAL.timber} />
          <g stroke="#3a2010" strokeWidth={0.7} opacity={0.5}>{[LH - 22, LH - 12].map((y) => <line key={y} x1={fc - 11} y1={y} x2={fc + 11} y2={y} />)}</g>
          <circle cx={fc + 6} cy={LH - 18} r={2.4} fill="none" stroke="#2a2a2a" strokeWidth={1.4} /><circle cx={fc + 6} cy={LH - 16} r={1} fill="#3a3a3a" />
          <ellipse cx={fc} cy={LH - 30} rx={3.5} ry={2} fill={PAL.stone} />
        </g>
      </g>

      {/* eave + terracotta hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#6f2716" />
      <polygon points={pts(topE, rightE, apex)} fill="#6f2716" />
      {shingles(leftE, bottomE, apex, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round"><g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g><g stroke={PAL.ridge} strokeWidth={1.3} opacity={0.8}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g></g>

      {/* prominent brick chimney + smoke (rear-right) */}
      <Chimney cx={apex.x + 22} cy={apex.y + 28} h={42} half={9} gid={id("terraShade")} />
      <Smoke x={apex.x + 22} y={apex.y - 16} scale={1.1} count={4} dur={4.4} color="#e4d8c0" />
      <Smoke x={apex.x + 24} y={apex.y - 16} scale={0.8} count={3} dur={3.6} color="#c8b898" />

      {/* garden bushes (wiggle) flanking the path */}
      {[{ x: -1.5, y: 0.7, c: "#7a9a38", f: "#f0d040" }, { x: 1.5, y: 0.7, c: "#6a8a30", f: "#e87090" }, { x: 0.55, y: 1.5, c: "#6a9a30", f: "#f8e060" }].map((b, i) => {
        const c = gp(b.x, b.y, 0);
        return (
          <g key={i} transform={`translate(${c.x} ${c.y})`} style={{ animation: `wiggle ${2.6 + i * 0.4}s ${i * 0.4}s ease-in-out infinite`, transformOrigin: `${c.x}px ${c.y}px` }}>
            <ellipse cx={0} cy={-1} rx={6 - i} ry={1.6} fill="rgba(0,0,0,.2)" />
            <ellipse cx={0} cy={-4} rx={6 - i} ry={5 - i} fill="#5a7a28" /><ellipse cx={0} cy={-5} rx={5 - i} ry={4 - i} fill={b.c} />
            <circle cx={-2} cy={-7} r={1} fill={b.f} /><circle cx={2} cy={-8} r={0.9} fill={b.f} /><circle cx={0} cy={-9} r={1.1} fill={b.f} />
          </g>
        );
      })}
    </g>
  );
}
