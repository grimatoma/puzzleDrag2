// bakery — calibration building (NORMAL plot, like the forge).
// Same footprint/scale as the reference forge, but deliberately differentiated:
// cream PLASTER walls + a TERRACOTTA hip roof (vs the forge's brick + slate), a
// glowing OVEN ARCH as the unobstructed hero on the lit SE face, fresh bread on
// a window sill, a swinging pretzel sign, and a smoking chimney. Signature
// animations: oven fire flicker, steam from the oven, chimney smoke.
// Demonstrates holding the Normal tier to the reference scale while reading as a
// completely different building through material + hero detail, not size.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney, Window } from "../isoKit.jsx";
import { PAL, Smoke, Steam } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Plaster + terracotta bakery at the forge's scale; glowing oven arch hero on the lit face, bread sill, pretzel sign, chimney smoke + oven steam. Calibration: Normal tier, differentiate by material/detail not size.",
};

const HALF_W = 64; // matches the reference forge footprint (Normal tier)
const HALF_H = 32;
const WALL_H = 72;
const ROOF_RISE = 50;
const EAVE = 9;
const LW = 120;
const LH = 92;

export default function IsoBakery({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };

  const right = add(o, { x: HALF_W, y: 0 });
  const bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H };
  const rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H };
  const leftT = { x: o.x - HALF_W, y: o.y - WALL_H };

  const apex = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * HALF_H) / HALF_W;
  const topE = { x: topT.x, y: topT.y - eY };
  const rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY };
  const leftE = { x: leftT.x - EAVE, y: leftT.y };

  const seMatrix = panelMatrix(bottomT, { x: HALF_W, y: -HALF_H }, { x: 0, y: WALL_H });
  const swMatrix = panelMatrix(leftT, { x: HALF_W, y: HALF_H }, { x: 0, y: WALL_H });
  const fc = LW / 2;

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1ddb2" /><stop offset="1" stopColor="#d8bf8c" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#a23f24" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6f2716" /></linearGradient>
        <radialGradient id={id("oven")} cx="0.5" cy="0.62" r="0.6"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.4" stopColor="#ffa83a" /><stop offset="0.8" stopColor="#d4541c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      {/* ground shadow + warm spill */}
      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.30)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 6} ry={HALF_H - 6} fill="rgba(255,150,60,.12)" />

      {/* ===== SW WALL (shaded) — door, window, hanging sign ===== */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterShade")})`} />
        {/* plaster joints */}
        <g stroke="rgba(0,0,0,.16)" strokeWidth={0.6} vectorEffect="non-scaling-stroke">
          {[28, 50, 72].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}
        </g>
        <rect x={0} y={0} width={LW} height={6} fill="rgba(0,0,0,.16)" />
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* exposed timber framing (Tudor-ish, bakery charm) */}
        <g stroke="#6a4a28" strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.5}>
          <line x1={0} y1={50} x2={LW} y2={50} />
          <line x1={40} y1={6} x2={40} y2={50} /><line x1={84} y1={6} x2={84} y2={50} />
        </g>
        {/* door */}
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 22} rx={20} ry={26} fill="#ff8a28" opacity={nearDoor ? 0.34 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc - 14},${LH} L${fc - 14},${LH - 26} a14,14 0 0 1 28,0 L${fc + 14},${LH} Z`} fill="#5a3a1f" />
          <path d={`M${fc - 11},${LH} L${fc - 11},${LH - 24} a11,11 0 0 1 22,0 L${fc + 11},${LH} Z`} fill="#3a2010" />
          <circle cx={fc + 7} cy={LH - 16} r={1.6} fill={PAL.brass} />
        </g>
        {/* small window */}
        <Window cx={26} y={26} w={18} h={22} id={id} lit dur={3.4} />
      </g>

      {/* ===== SE WALL (lit) — the glowing OVEN ARCH hero + window ===== */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
        <g stroke="rgba(0,0,0,.1)" strokeWidth={0.6}>
          {[28, 50, 72].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}
        </g>
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,235,200,.2)" />
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.14)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* timber framing */}
        <g stroke="#6a4a28" strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.45}>
          <line x1={0} y1={50} x2={LW} y2={50} />
        </g>
        {/* a high window (left of oven) */}
        <Window cx={26} y={16} w={18} h={20} id={id} lit dur={2.8} />
        {/* ===== OVEN ARCH (hero) ===== */}
        <g>
          <path d={`M${fc + 6},${LH} L${fc + 6},${LH - 42} a30,30 0 0 1 60,0 L${fc + 66},${LH} Z`} fill="#9c4528" />
          <path d={`M${fc + 11},${LH} L${fc + 11},${LH - 38} a25,25 0 0 1 50,0 L${fc + 61},${LH} Z`} fill="#1a0800" />
          {/* glow */}
          <ellipse cx={fc + 36} cy={LH - 18} rx={22} ry={15} fill={`url(#${id("oven")})`} opacity={0.7} style={{ animation: "flicker 2.4s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 18}px` }} />
          {/* flames */}
          <g style={{ animation: "flicker 1.8s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 22}px` }}>
            <path d={`M${fc + 22},${LH} Q${fc + 30},${LH - 30} ${fc + 36},${LH - 16} Q${fc + 42},${LH - 30} ${fc + 50},${LH} Z`} fill="#d4642e" />
          </g>
          <g style={{ animation: "flicker 1.2s 0.3s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 24}px` }}>
            <path d={`M${fc + 28},${LH} Q${fc + 33},${LH - 24} ${fc + 36},${LH - 14} Q${fc + 39},${LH - 24} ${fc + 44},${LH} Z`} fill="#ffc24a" />
          </g>
          {/* embers */}
          {[0, 0.7, 1.4].map((d, i) => (
            <circle key={i} cx={fc + 36 + (i % 2 ? 6 : -6)} cy={LH - 14} r={1.2} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 7 : -7}px`, animation: `ember 2.6s ${d}s ease-out infinite`, transformOrigin: `${fc + 36 + (i % 2 ? 6 : -6)}px ${LH - 14}px` } as React.CSSProperties} />
          ))}
          {/* keystone + arch outline */}
          <path d={`M${fc + 6},${LH - 42} a30,30 0 0 1 60,0`} fill="none" stroke="#6f2716" strokeWidth={2.5} />
          <ellipse cx={fc + 36} cy={LH - 42} rx={4} ry={2.6} fill={PAL.stone} />
          {/* peel (oven paddle) leaning by the arch */}
          <line x1={fc + 4} y1={LH} x2={fc - 6} y2={LH - 48} stroke="#7a5c34" strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx={fc - 7} cy={LH - 50} rx={4} ry={6} fill="#8a6a3c" />
        </g>
      </g>

      {/* eave beam */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />

      {/* ===== TERRACOTTA HIP ROOF ===== */}
      <polygon points={pts(topE, leftE, apex)} fill="#6f2716" />
      <polygon points={pts(topE, rightE, apex)} fill="#6f2716" />
      {shingles(leftE, bottomE, apex, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}>
          <line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} />
        </g>
        <g stroke={PAL.ridge} strokeWidth={1.3} opacity={0.8}>
          <line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} />
        </g>
      </g>

      {/* ===== CHIMNEY (rear-left) + heavy smoke ===== */}
      <Chimney cx={apex.x - 22} cy={apex.y + 30} h={36} half={9} gid={id("terraLit")} />
      <Smoke x={apex.x - 22} y={apex.y - 6} scale={1.1} count={4} dur={4.6} color="#e4d8c0" />
      <Smoke x={apex.x - 20} y={apex.y - 6} scale={0.8} count={3} dur={3.8} color="#c8b898" />

      {/* ===== STEAM rising from the oven mouth ===== */}
      <Steam x={right.x - 24} y={right.y - 6} scale={0.8} count={3} />
      <Steam x={right.x - 14} y={right.y - 4} scale={0.62} count={2} />

      {/* ===== BREAD SILL (front, screen space, under the oven) ===== */}
      {(() => {
        const sx = right.x - 20; const sy = right.y + 8;
        return (
          <g transform={`translate(${sx} ${sy})`}>
            <ellipse cx={6} cy={4} rx={26} ry={5} fill="rgba(0,0,0,.26)" />
            <rect x={-16} y={-2} width={44} height={5} rx={1} fill="#7a5c34" />
            <rect x={-16} y={-2} width={44} height={2} rx={1} fill="#9a7444" />
            {/* loaves */}
            {[[-8, 0.0], [2, 1.0], [12, 0.85], [21, 0.72]].map(([lx, s], i) => (
              <g key={i} transform={`translate(${lx} -4) scale(${s + 0.0})`}>
                <ellipse cx={0} cy={0} rx={5} ry={3} fill="#c87840" />
                <ellipse cx={0} cy={-1} rx={3.6} ry={1.7} fill="#e8a050" />
                <path d={`M-2,-1.6 Q0,-3.6 2,-1.6`} fill="none" stroke="#a85e28" strokeWidth={0.6} />
              </g>
            ))}
            {/* flour dust */}
            <g fill="#f8f4ea" opacity={0.6}><circle cx={-4} cy={-1} r={0.7} /><circle cx={6} cy={-0.5} r={0.6} /><circle cx={16} cy={-1} r={0.6} /></g>
          </g>
        );
      })()}

      {/* ===== HANGING PRETZEL SIGN (front-left corner) + bracket lantern ===== */}
      {(() => {
        const base = { x: leftE.x + 6, y: leftT.y + 18 };
        const arm = { x: base.x + 20, y: base.y };
        return (
          <g>
            <line x1={base.x} y1={base.y - 4} x2={arm.x} y2={arm.y - 4} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
            <g style={{ animation: "sway 3.6s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y - 4}px` }}>
              <line x1={arm.x} y1={arm.y - 4} x2={arm.x} y2={arm.y + 2} stroke="#2c2012" strokeWidth={1.4} />
              <rect x={arm.x - 12} y={arm.y + 2} width={24} height={17} rx={2} fill="#f5e8c0" stroke="#7a5c34" strokeWidth={1.4} />
              {/* pretzel glyph */}
              <path d={`M${arm.x - 5},${arm.y + 14} Q${arm.x - 7},${arm.y + 6} ${arm.x},${arm.y + 6} Q${arm.x + 7},${arm.y + 6} ${arm.x + 5},${arm.y + 14} Q${arm.x + 2},${arm.y + 16} ${arm.x},${arm.y + 11} Q${arm.x - 2},${arm.y + 16} ${arm.x - 5},${arm.y + 14}`} fill="none" stroke="#8a4a18" strokeWidth={1.5} strokeLinecap="round" />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
