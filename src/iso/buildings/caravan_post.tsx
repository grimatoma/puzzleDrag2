// caravan_post — traders' waystation (NORMAL plot).
// A plaster trading post under a terracotta hip roof, fronted by a wide striped
// AWNING (hero) with a hanging lantern, a glowing shop window and an arched
// door. A tall flag waves on a pole, merchandise CRATES are stacked by the wall
// and a spare WAGON WHEEL leans alongside.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, lerp, Window } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Trading post; plaster + terracotta hip roof, wide striped awning (hero) + hanging lantern over a shop window + arched door, waving flag on a pole, stacked crates, leaning wagon wheel.",
};

const HALF_W = 62, HALF_H = 31, WALL_H = 68, ROOF_RISE = 48, EAVE = 9, LW = 120, LH = 92;

export default function IsoCaravanPost({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1ddb2" /><stop offset="1" stopColor="#d8bf8c" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#a23f24" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6f2716" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#ffcf6a" /><stop offset="1" stopColor="#7a3a10" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 18} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />

      {/* flag pole + waving flag (rear-left) */}
      {(() => { const base = gp(-1.2, -1.0, 0), top = gp(-1.2, -1.0, 118); return (
        <g>
          <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke={PAL.timber} strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={top.x} cy={top.y} r={2} fill={PAL.brass} />
          <g style={{ animation: "sway 2.6s ease-in-out infinite", transformOrigin: `${top.x}px ${top.y + 3}px` }}>
            <path d={`M${top.x},${top.y + 2} Q${top.x + 16},${top.y - 2} ${top.x + 24},${top.y + 4} Q${top.x + 16},${top.y + 9} ${top.x},${top.y + 8} Z`} fill="#c03020" />
            <path d={`M${top.x},${top.y + 2} Q${top.x + 10},${top.y} ${top.x + 18},${top.y + 4}`} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={1} />
          </g>
        </g>
      ); })()}

      {/* SW wall (shade) */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterShade")})`} />
        <g stroke="rgba(0,0,0,.14)" strokeWidth={0.6}>{[30, 56].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={30} y={28} w={20} h={24} id={id} lit dur={3.4} />
      </g>

      {/* SE wall (lit) — shop window + arched door */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
        <g stroke="rgba(0,0,0,.08)" strokeWidth={0.6}>{[30, 56].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,235,200,.18)" />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.14)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* shop window (goods) */}
        <rect x={20} y={LH - 40} width={34} height={32} fill="#2c1c0e" />
        <rect x={22} y={LH - 38} width={30} height={28} fill={`url(#${id("pane")})`} opacity={0.85} style={{ animation: "flicker 3.8s ease-in-out infinite", transformOrigin: `37px ${LH - 24}px` }} />
        <line x1={37} y1={LH - 38} x2={37} y2={LH - 10} stroke="#2c1c0e" strokeWidth={1.4} /><line x1={22} y1={LH - 24} x2={52} y2={LH - 24} stroke="#2c1c0e" strokeWidth={1.4} />
        {/* arched door */}
        <g data-door="entry">
          <ellipse cx={fc + 28} cy={LH - 22} rx={16} ry={22} fill={`url(#${id("glow")})`} opacity={nearDoor ? 0.5 : 0.3} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc + 28}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc + 16},${LH} L${fc + 16},${LH - 26} a12,12 0 0 1 24,0 L${fc + 40},${LH} Z`} fill={PAL.wallTop} />
          <path d={`M${fc + 19},${LH} L${fc + 19},${LH - 24} a9,9 0 0 1 18,0 L${fc + 37},${LH} Z`} fill={PAL.timber} />
          <circle cx={fc + 34} cy={LH - 16} r={1.4} fill={PAL.brass} />
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

      {/* ===== STRIPED AWNING over the SE front (hero) ===== */}
      {(() => {
        const wl = gp(-1.0, 1.0, WALL_H - 20), wr = gp(1.0, 1.0, WALL_H - 20);
        const fl = gp(-1.05, 2.0, WALL_H - 36), fr = gp(1.05, 2.0, WALL_H - 36);
        const strips: JSX.Element[] = []; const n = 9;
        for (let i = 0; i < n; i++) { const a = lerp(wl, wr, i / n), b = lerp(wl, wr, (i + 1) / n), c = lerp(fl, fr, (i + 1) / n), d = lerp(fl, fr, i / n); strips.push(<polygon key={i} points={pts(a, b, c, d)} fill={i % 2 ? "#b03818" : "#e6dcc6"} />); }
        const scal: JSX.Element[] = [];
        for (let i = 0; i < n; i++) { const a = lerp(fl, fr, i / n), b = lerp(fl, fr, (i + 1) / n); scal.push(<path key={i} d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + 4} ${b.x},${b.y} Z`} fill={i % 2 ? "#b03818" : "#e6dcc6"} />); }
        // bracket arms
        return <g>{strips}{scal}<polyline points={pts(wl, wr)} fill="none" stroke="#8a2810" strokeWidth={2} /></g>;
      })()}

      {/* hanging lantern under the awning (sway + flicker) */}
      {(() => { const c = gp(-0.2, 1.7, WALL_H - 34); return (
        <g transform={`translate(${c.x} ${c.y})`}>
          <line x1={0} y1={0} x2={0} y2={4} stroke="#3a3a3a" strokeWidth={0.8} />
          <g style={{ animation: "sway 3.8s 0.3s ease-in-out infinite", transformOrigin: "0px 4px" }}>
            <rect x={-4} y={4} width={8} height={11} rx={1.2} fill="#2a1808" />
            <rect x={-3} y={5} width={6} height={9} fill="#ffcf6a" opacity={0.7} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: "0px 9px" }} />
            <rect x={-5} y={3} width={10} height={2} rx={0.5} fill={PAL.timberSoft} /><rect x={-5} y={15} width={10} height={2} rx={0.5} fill={PAL.timberSoft} />
            <ellipse cx={0} cy={11} rx={7} ry={5} fill="#ffcf6a" opacity={0.16} />
          </g>
        </g>
      ); })()}

      {/* crates stacked + wagon wheel (front-right / +gx) */}
      {(() => { const b = add(right, { x: -2, y: 6 }); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={4} cy={2} rx={20} ry={4} fill="rgba(0,0,0,.28)" />
          {/* crates */}
          <g>
            <rect x={-12} y={-14} width={16} height={14} rx={1} fill="#8a6040" stroke={PAL.timberSoft} strokeWidth={0.8} /><line x1={-4} y1={-14} x2={-4} y2={0} stroke={PAL.timberSoft} strokeWidth={0.6} opacity={0.5} />
            <rect x={-10} y={-27} width={14} height={13} rx={1} fill="#9a6a46" stroke={PAL.timberSoft} strokeWidth={0.8} />
            <rect x={-7} y={-35} width={9} height={8} rx={0.8} fill="#a07050" stroke={PAL.timberSoft} strokeWidth={0.7} />
          </g>
          {/* wagon wheel leaning */}
          <g transform={`translate(16 -8) rotate(10)`}>
            <circle r={13} fill="none" stroke={PAL.timber} strokeWidth={2.4} /><circle r={3.4} fill={PAL.timberSoft} stroke={PAL.timber} strokeWidth={0.8} />
            <g stroke={PAL.timber} strokeWidth={1.3}>{[0, 45, 90, 135].map((d) => <line key={d} x1={-13} y1={0} x2={13} y2={0} transform={`rotate(${d})`} />)}</g>
            <circle r={13} fill="none" stroke="#2a2a2a" strokeWidth={0.8} opacity={0.4} />
          </g>
        </g>
      ); })()}
    </g>
  );
}
