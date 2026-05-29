// apiary — beekeeper's cottage (SMALL plot).
// A small whitewashed cottage with a green cedar-shingle hip roof and a
// bee-carved door, fronted by a row of stacked BEEHIVE boxes (the hero) with
// gabled lids. Bees stream out and forage (pollen drift), a sunflower nods, a
// HONEY jar sits on the step and clover dots the grass.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Whitewashed beekeeper's cottage + green cedar hip roof; row of stacked beehive boxes (hero), bees streaming out (pollen), nodding sunflower, honey jar, clover. Small tier.",
};

const HALF_W = 48, HALF_H = 24, WALL_H = 48, ROOF_RISE = 38, EAVE = 8, LW = 120, LH = 92;

export default function IsoApiary({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  // a beehive box (stacked supers + gabled lid), centered at screen (cx,cy ground)
  const hive = (cx: number, cy: number) => (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx={0} cy={2} rx={9} ry={2} fill="rgba(0,0,0,.3)" />
      <rect x={-8} y={-4} width={16} height={5} fill="#e8c266" stroke="#a98a4a" strokeWidth={0.5} />
      <rect x={-8} y={-9} width={16} height={5} fill="#f4d262" stroke="#a98a4a" strokeWidth={0.5} />
      <rect x={-8} y={-14} width={16} height={5} fill="#e8c266" stroke="#a98a4a" strokeWidth={0.5} />
      <path d="M-9,-14 L0,-19 L9,-14 Z" fill="#7a5c34" /><path d="M-9,-14 L0,-19 L-3,-14 Z" fill="rgba(0,0,0,.3)" />
      <rect x={-4} y={-2} width={8} height={1.4} fill="#3a2715" /><rect x={-2.5} y={-2.6} width={5} height={1} fill="#1a1410" />
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("wallLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9f3e4" /><stop offset="1" stopColor="#e6dcc6" /></linearGradient>
        <linearGradient id={id("wallShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6cab0" /><stop offset="1" stopColor="#b6a888" /></linearGradient>
        <linearGradient id={id("roofLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ba052" /><stop offset="1" stopColor="#557436" /></linearGradient>
        <linearGradient id={id("roofShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5c7d3c" /><stop offset="1" stopColor="#3e5626" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.28)" />
      {/* clover dots */}
      {[-1.7, 1.7, 2.1].map((dx, i) => { const c = gp(dx, 0.6, 0); return <g key={i}><circle cx={c.x - 1} cy={c.y - 1.4} r={0.8} fill="#7fa848" /><circle cx={c.x + 1} cy={c.y - 1.4} r={0.8} fill="#7fa848" /><circle cx={c.x} cy={c.y - 2.4} r={0.5} fill="#fbf7eb" /></g>; })}

      {/* SW wall (shade) — bee-carved door */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("wallShade")})`} />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.18)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 22} rx={15} ry={20} fill="#ff8a28" opacity={nearDoor ? 0.3 : 0.1} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc - 12},${LH} L${fc - 12},${LH - 24} a12,12 0 0 1 24,0 L${fc + 12},${LH} Z`} fill={PAL.timber} />
          <path d={`M${fc - 9},${LH} L${fc - 9},${LH - 22} a9,9 0 0 1 18,0 L${fc + 9},${LH} Z`} fill={PAL.timberSoft} />
          {/* bee carving */}
          <ellipse cx={fc} cy={LH - 30} rx={3.4} ry={2.2} fill="#e0a83a" stroke="#3a2715" strokeWidth={0.6} />
          <line x1={fc - 2} y1={LH - 31} x2={fc - 2} y2={LH - 29} stroke="#3a2715" strokeWidth={0.6} /><line x1={fc + 2} y1={LH - 31} x2={fc + 2} y2={LH - 29} stroke="#3a2715" strokeWidth={0.6} />
          <circle cx={fc + 7} cy={LH - 18} r={1.4} fill={PAL.brass} />
        </g>
      </g>

      {/* SE wall (lit) — high window + beekeeper hat */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("wallLit")})`} />
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,245,220,.2)" />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.1)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <rect x={26} y={18} width={16} height={18} fill="#3a2715" /><rect x={28} y={20} width={12} height={14} fill={`url(#${id("pane")})`} style={{ animation: "flicker 4s ease-in-out infinite", transformOrigin: "34px 27px" }} />
        {/* beekeeper veil hat on the wall */}
        <g transform="translate(86 40)"><rect x={-6} y={-5} width={12} height={3} fill="#5a3a1f" /><ellipse cx={0} cy={-3} rx={7} ry={2} fill="#5a3a1f" /><rect x={-5} y={-3} width={10} height={10} fill="#fbf7eb" opacity={0.8} /><g stroke="#a89262" strokeWidth={0.4} opacity={0.7}><line x1={-3} y1={-2} x2={-3} y2={7} /><line x1={0} y1={-2} x2={0} y2={7} /><line x1={3} y1={-2} x2={3} y2={7} /></g></g>
      </g>

      {/* eave + green cedar hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke="#3a4a25" strokeWidth={3} />
      <polygon points={pts(topE, leftE, apex)} fill="#3e5626" />
      <polygon points={pts(topE, rightE, apex)} fill="#3e5626" />
      {shingles(leftE, bottomE, apex, `url(#${id("roofShade")})`, "rgba(0,0,0,.24)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("roofLit")})`, "rgba(0,0,0,.2)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#2e3e1c" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round"><g stroke="rgba(0,0,0,.4)" strokeWidth={2.4}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g></g>

      {/* ===== BEEHIVE BOXES (hero) in front ===== */}
      {[gp(-0.9, 1.15, 0), gp(0.1, 1.35, 0), gp(1.1, 1.15, 0)].map((p, i) => <g key={i}>{hive(p.x, p.y)}</g>)}

      {/* bees streaming + foraging (pollen; outer translate / inner animation) */}
      {[gp(-0.9, 1.15, 14), gp(0.1, 1.35, 14), gp(1.1, 1.15, 14)].map((p, hi) => (
        <g key={hi} transform={`translate(${p.x} ${p.y})`}>
          {[0, 0.8, 1.6, 2.4].map((d, i) => (
            <g key={i} style={{ "--px": `${(i % 2 ? 26 : -26)}px`, animation: `pollen ${4 + i * 0.5}s ${d + hi * 0.4}s ease-in-out infinite`, transformOrigin: "0 0" } as React.CSSProperties}>
              <ellipse cx={0} cy={0} rx={1} ry={0.6} fill="#f4d262" /><line x1={-0.7} y1={0} x2={0.7} y2={0} stroke="#1a1410" strokeWidth={0.3} />
              <ellipse cx={0} cy={-0.7} rx={0.8} ry={0.4} fill="#fbf7eb" opacity={0.6} />
            </g>
          ))}
        </g>
      ))}

      {/* honey jar on the step + sunflower */}
      {(() => { const hj = gp(-1.5, 0.7, 0), sf = gp(1.6, 0.5, 0); return (
        <g>
          <g transform={`translate(${hj.x} ${hj.y})`}>
            <ellipse cx={0} cy={1} rx={4} ry={1} fill="rgba(0,0,0,.3)" />
            <path d="M-3,0 L-3,-6 Q-3,-7.5 -1.5,-7.5 L1.5,-7.5 Q3,-7.5 3,-6 L3,0 Z" fill="#e0a83a" />
            <rect x={-2.5} y={-7.5} width={5} height={1.4} fill="#fbf7eb" /><rect x={-2} y={-4.5} width={4} height={2.4} fill="#fbf7eb" />
          </g>
          <g transform={`translate(${sf.x} ${sf.y})`}>
            <line x1={0} y1={0} x2={0} y2={-16} stroke="#4d6b25" strokeWidth={1} />
            <ellipse cx={-2} cy={-9} rx={1.6} ry={0.8} fill="#7fa848" transform="rotate(-30 -2 -9)" />
            <g transform="translate(0 -17)">
              {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <ellipse key={i} cx={Math.cos(a) * 2.6} cy={Math.sin(a) * 2.6} rx={1.5} ry={0.8} transform={`rotate(${(i / 12) * 360} ${Math.cos(a) * 2.6} ${Math.sin(a) * 2.6})`} fill="#f4d262" />; })}
              <circle r={2.2} fill="#7a5c34" />
            </g>
          </g>
        </g>
      ); })()}
    </g>
  );
}
