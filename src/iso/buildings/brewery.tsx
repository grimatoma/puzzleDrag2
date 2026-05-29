// brewery — Tudor brewhouse (NORMAL plot).
// Cream plaster + dark timber-framed walls under a terracotta hip roof, with an
// open arched bay on the lit face showing a COPPER BREWING KETTLE over a fire
// (the hero) with STEAM pouring out, a smoking chimney, a climbing HOPS vine,
// STACKED BARRELS with a foam-dripping TAP, a swinging tankard sign and malt
// sacks. Shares the bakery's scale/scaffold, differentiated by the copper-kettle
// hero + brewing props.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney, Window } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Tudor brewhouse; open bay with copper kettle over fire + steam (hero), timber-frame plaster walls, terracotta hip roof, chimney smoke, hops vine, stacked barrels + dripping tap, tankard sign, malt sacks.",
};

const HALF_W = 64, HALF_H = 32, WALL_H = 72, ROOF_RISE = 50, EAVE = 9, LW = 120, LH = 92;

export default function IsoBrewery({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  const timber = (n: number) => (
    <g stroke={PAL.timber} strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.65}>
      <line x1={0} y1={2} x2={LW} y2={2} /><line x1={0} y1={LH - 2} x2={LW} y2={LH - 2} />
      {[0, LW / 2, LW].map((x) => <line key={x} x1={x} y1={2} x2={x} y2={LH} />)}
      {n === 1 && <><line x1={4} y1={4} x2={fc - 4} y2={LH - 4} /><line x1={fc - 4} y1={4} x2={4} y2={LH - 4} /></>}
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3ddae" /><stop offset="1" stopColor="#dcc188" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c4aa72" /><stop offset="1" stopColor="#9e8252" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b6553a" /><stop offset="1" stopColor="#7a3320" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a3f28" /><stop offset="1" stopColor="#5e2415" /></linearGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.7" r="0.6"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.5" stopColor="#ffa83a" /><stop offset="1" stopColor="#a3340c" /></radialGradient>
        <linearGradient id={id("copper")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e08a52" /><stop offset="0.5" stopColor="#c96442" /><stop offset="1" stopColor="#8a3d24" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 8} ry={HALF_H - 6} fill="rgba(255,150,60,.1)" />

      {/* ===== SW WALL (shade) — door + window + timber ===== */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterShade")})`} />
        {timber(0)}
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 22} rx={18} ry={24} fill="#ff8a28" opacity={nearDoor ? 0.32 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc - 13},${LH} L${fc - 13},${LH - 24} a13,13 0 0 1 26,0 L${fc + 13},${LH} Z`} fill={PAL.timber} />
          <path d={`M${fc - 10},${LH} L${fc - 10},${LH - 22} a10,10 0 0 1 20,0 L${fc + 10},${LH} Z`} fill="#3a2010" />
          <rect x={fc - 6} y={LH - 16} width={12} height={6} fill="#2c1c0e" /><rect x={fc - 5} y={LH - 15} width={10} height={4} fill="#aed3e8" opacity={0.6} />
          <circle cx={fc + 7} cy={LH - 14} r={1.4} fill={PAL.brass} />
        </g>
        <Window cx={26} y={26} w={18} h={22} id={id} lit dur={3.2} />
      </g>

      {/* ===== SE WALL (lit) — open bay with copper kettle (hero) ===== */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
        {timber(1)}
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.14)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* open arched brewing bay */}
        <path d={`M${fc + 8},${LH} L${fc + 8},${LH - 46} a28,28 0 0 1 56,0 L${fc + 64},${LH} Z`} fill="#3a160a" />
        <path d={`M${fc + 13},${LH} L${fc + 13},${LH - 42} a23,23 0 0 1 46,0 L${fc + 59},${LH} Z`} fill="#24140a" />
        {/* COPPER KETTLE over fire */}
        <g>
          {/* fire base */}
          <rect x={fc + 24} y={LH - 6} width={24} height={6} fill="#1a1410" />
          <g style={{ animation: "flicker 1.4s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 8}px` }}>
            <path d={`M${fc + 26},${LH - 4} Q${fc + 31},${LH - 14} ${fc + 36},${LH - 8} Q${fc + 41},${LH - 14} ${fc + 46},${LH - 4} Z`} fill={`url(#${id("fire")})`} />
          </g>
          {/* kettle */}
          <ellipse cx={fc + 36} cy={LH - 10} rx={20} ry={5} fill="#5a2a18" />
          <path d={`M${fc + 16},${LH - 10} Q${fc + 14},${LH - 34} ${fc + 22},${LH - 40} L${fc + 50},${LH - 40} Q${fc + 58},${LH - 34} ${fc + 56},${LH - 10} Z`} fill={`url(#${id("copper")})`} />
          <ellipse cx={fc + 36} cy={LH - 40} rx={14} ry={3.5} fill="#7a3d24" />
          <ellipse cx={fc + 36} cy={LH - 40} rx={11} ry={2.4} fill="#1a0e06" />
          <path d={`M${fc + 22},${LH - 34} Q${fc + 20},${LH - 22} ${fc + 26},${LH - 14}`} stroke="#ffd56a" strokeWidth={1.2} fill="none" opacity={0.6} />
        </g>
      </g>

      {/* steam pouring from the kettle (screen space, rising out of the bay) */}
      {(() => { const s = { x: right.x - 28, y: right.y - 40 }; return (
        <g transform={`translate(${s.x} ${s.y})`}>
          {Array.from({ length: 4 }, (_, i) => (
            <circle key={i} cx={0} cy={0} r={2.6 + (i % 2) * 1.3} fill="#fbf7eb" style={{ "--sx": `${i % 2 ? 7 : -7}px`, animation: `steam 2.4s ${i * 0.4}s ease-out infinite`, transformOrigin: "0 0", opacity: 0.85 } as React.CSSProperties} />
          ))}
        </g>
      ); })()}

      {/* eave + terracotta hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#5e2415" />
      <polygon points={pts(topE, rightE, apex)} fill="#5e2415" />
      {shingles(leftE, bottomE, apex, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
        <g stroke={PAL.ridge} strokeWidth={1.3} opacity={0.8}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
      </g>

      {/* chimney + smoke */}
      <Chimney cx={apex.x - 18} cy={apex.y + 30} h={32} half={6} gid={id("terraShade")} />
      <Smoke x={apex.x - 18} y={apex.y - 6} scale={0.9} count={3} dur={4.2} color="#e8dcc2" />

      {/* ===== STACKED BARRELS + dripping tap (front-left) ===== */}
      {(() => { const b = { x: leftT.x + 14, y: o.y - 2 }; return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={2} rx={18} ry={4} fill="rgba(0,0,0,.3)" />
          {[-9, 9].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <path d="M-7,0 Q-9,-9 -7,-18 L7,-18 Q9,-9 7,0 Z" fill="#7a4a26" />
              <path d="M-7,0 Q-9,-9 -7,-18 L-2,-18 Q-4,-9 -2,0 Z" fill="#5a3a1f" />
              <rect x={-8} y={-12} width={16} height={1.6} fill="#3a3530" /><rect x={-8} y={-6} width={16} height={1.6} fill="#3a3530" />
              <ellipse cx={0} cy={-18} rx={7} ry={2} fill="#8a5a30" />
            </g>
          ))}
          {/* top horizontal barrel + tap */}
          <g transform="translate(0 -30)">
            <ellipse cx={-9} cy={0} rx={4} ry={8} fill="#7a4a26" /><ellipse cx={-9} cy={0} rx={2.6} ry={6} fill="#5a3a1f" />
            <rect x={-9} y={-8} width={18} height={16} fill="#7a4a26" /><ellipse cx={9} cy={0} rx={4} ry={8} fill="#8a5a30" />
            <rect x={-9} y={-5} width={18} height={1.4} fill="#3a3530" /><rect x={-9} y={3} width={18} height={1.4} fill="#3a3530" />
            <rect x={8} y={6} width={2} height={4} fill="#7c858d" />
            <ellipse cx={9} cy={11} rx={1.3} ry={0.7} fill="#fbf7eb" style={{ animation: "drip2 1.4s ease-in infinite", transformOrigin: "9px 10px" }} />
          </g>
        </g>
      ); })()}

      {/* ===== HOPS VINE climbing the front-right corner ===== */}
      {(() => { const base = { x: right.x - 6, y: right.y - 4 }; return (
        <g>
          <path d={`M${base.x},${base.y} Q${base.x + 6},${base.y - 24} ${base.x - 2},${base.y - 44} Q${base.x - 8},${base.y - 60} ${base.x + 2},${base.y - 72}`} fill="none" stroke="#4d6b25" strokeWidth={1.4} />
          {[0.2, 0.45, 0.7, 0.9].map((t, i) => {
            const px = base.x + (i % 2 ? 4 : -4), py = base.y - t * 70;
            return <g key={i}><ellipse cx={px} cy={py} rx={1.6} ry={2.6} fill="#7fc94a" /><path d={`M${px - 4},${py + 2} l3,-1 l-1,2 Z`} fill="#7fa848" /></g>;
          })}
        </g>
      ); })()}

      {/* ===== TANKARD SIGN (sway) + malt sacks ===== */}
      {(() => { const base = { x: leftE.x + 6, y: leftT.y + 16 }, arm = { x: base.x + 18, y: base.y }; return (
        <g>
          <line x1={base.x} y1={base.y - 4} x2={arm.x} y2={arm.y - 4} stroke="#3a2715" strokeWidth={2.6} strokeLinecap="round" />
          <g style={{ animation: "sway 4s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y - 4}px` }}>
            <line x1={arm.x} y1={arm.y - 4} x2={arm.x} y2={arm.y + 2} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={arm.x - 11} y={arm.y + 2} width={22} height={16} rx={2} fill="#fbf7eb" stroke="#5a3a1f" strokeWidth={1.2} />
            <rect x={arm.x - 5} y={arm.y + 6} width={8} height={9} fill="#bda268" stroke="#7a5c34" strokeWidth={0.6} />
            <path d={`M${arm.x + 3},${arm.y + 8} a3,3 0 0 1 0,5`} fill="none" stroke="#7a5c34" strokeWidth={1} />
            <rect x={arm.x - 5} y={arm.y + 5} width={8} height={2} rx={1} fill="#fff" />
          </g>
        </g>
      ); })()}
      {(() => { const b = { x: right.x - 2, y: o.y + 8 }; return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={1} rx={6} ry={1.4} fill="rgba(0,0,0,.3)" />
          <path d="M-5,0 L-6,-8 Q-4,-11 0,-11 Q4,-11 6,-8 L5,0 Z" fill="#bda268" stroke="#7a5c34" strokeWidth={0.6} />
        </g>
      ); })()}
    </g>
  );
}
