// larder — earth-banked root cellar / cold store (SMALL plot).
// Shape tells the story: a squat, thick stone cold-store half-buried under a
// rounded GRASS-TURF mound (earth-sheltered = naturally cold), with a deep
// recessed stone-ARCHED doorway down a couple of steps showing a cool-blue
// interior hung with preserves, a stubby stone vent, and crocks + a herb bundle
// outside. No box + hip roof in sight.

import { useId } from "react";
import { type P, makeGp } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Earth-banked root cellar: stone cold-store under a rounded grass-turf mound, deep recessed stone-arched doorway + steps + cool-blue jar interior, stone vent, crocks + herbs.",
};

export default function IsoLarder({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  // stone face (the +gx,+gy facing front built into the bank) is a low arched wall
  const fc = o.x;

  return (
    <g>
      <defs>
        <linearGradient id={id("turfLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ba24e" /><stop offset="1" stopColor="#577a34" /></linearGradient>
        <linearGradient id={id("turfShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5c7d3a" /><stop offset="1" stopColor="#3e5626" /></linearGradient>
        <linearGradient id={id("stone")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b2a888" /><stop offset="1" stopColor="#857a5e" /></linearGradient>
        <radialGradient id={id("cold")} cx="0.5" cy="0.4" r="0.7"><stop offset="0" stopColor="#cfe0e8" /><stop offset="0.6" stopColor="#5a7282" /><stop offset="1" stopColor="#26323c" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={52} ry={20} fill="rgba(0,0,0,.3)" />

      {/* ===== EARTH BANK / TURF MOUND (the body) ===== */}
      {(() => {
        // a fat rounded mound: an ellipse dome rising behind/over the stone front
        const mTop = yOf(58);
        return (
          <g>
            {/* mound mass */}
            <path d={`M${o.x - 56},${o.y + 4} Q${o.x - 60},${mTop + 6} ${o.x - 18},${mTop} Q${o.x + 6},${mTop - 6} ${o.x + 40},${mTop + 10} Q${o.x + 62},${o.y + 2} ${o.x + 40},${o.y + 8} Q${o.x},${o.y + 14} ${o.x - 56},${o.y + 4} Z`} fill={`url(#${id("turfShade")})`} />
            <path d={`M${o.x - 56},${o.y + 2} Q${o.x - 60},${mTop + 6} ${o.x - 18},${mTop} Q${o.x + 6},${mTop - 6} ${o.x + 40},${mTop + 10} Q${o.x + 30},${o.y - 6} ${o.x - 20},${o.y - 4} Q${o.x - 44},${o.y - 2} ${o.x - 56},${o.y + 2} Z`} fill={`url(#${id("turfLit")})`} />
            {/* grass tufts + a couple of flowers on the mound */}
            {[[-34, -16], [-12, -30], [14, -26], [30, -14], [-2, -36], [22, -36]].map(([dx, dy], i) => (
              <g key={i} transform={`translate(${o.x + dx} ${o.y + dy})`}>
                <path d="M0,0 L-1.5,-5 M0,0 L0,-6 M0,0 L1.5,-5" stroke="#6a8a3a" strokeWidth={0.8} />
                {i % 3 === 0 && <circle cx={0} cy={-6} r={1.2} fill={i % 2 ? "#f4d262" : "#dba7c4"} />}
              </g>
            ))}
          </g>
        );
      })()}

      {/* ===== STONE FRONT built into the bank: retaining wall + recessed arched door ===== */}
      {(() => {
        const wL = o.x - 30, wR = o.x + 30, wTop = yOf(34), wBase = o.y + 4;
        return (
          <g>
            {/* battered stone retaining wall around the entrance */}
            <path d={`M${wL},${wBase} L${wL + 4},${wTop} Q${o.x},${wTop - 8} ${wR - 4},${wTop} L${wR},${wBase} Z`} fill={`url(#${id("stone")})`} />
            {/* coursing */}
            {[8, 18, 28].map((h) => <path key={h} d={`M${wL + 3},${yOf(h)} Q${o.x},${yOf(h) - 4} ${wR - 3},${yOf(h)}`} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth={0.8} />)}
            {/* big keystoned arch surround */}
            <path d={`M${fc - 16},${wBase} L${fc - 16},${yOf(20)} a16,16 0 0 1 32,0 L${fc + 16},${wBase} Z`} fill="#6a6048" />
            {/* recessed cold interior */}
            <path d={`M${fc - 12},${wBase} L${fc - 12},${yOf(18)} a12,12 0 0 1 24,0 L${fc + 12},${wBase} Z`} fill={`url(#${id("cold")})`} />
            {nearDoor && <ellipse cx={fc} cy={yOf(14)} rx={13} ry={16} fill="#aed3e8" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${yOf(14)}px` }} />}
            {/* keystone */}
            <path d={`M${fc - 4},${yOf(30)} L${fc + 4},${yOf(30)} L${fc + 3},${yOf(36)} L${fc - 3},${yOf(36)} Z`} fill="#cabfa0" />
            {/* preserve jars on a shelf inside (cool silhouettes) */}
            <rect x={fc - 11} y={yOf(12)} width={22} height={1.6} fill="#3a4650" />
            {[[-7, "#5a8a72"], [-1, "#4a7088"], [5, "#6a7a4a"]].map(([dx, c], i) => <g key={i}><rect x={fc + (dx as number) - 2} y={yOf(20)} width={4} height={8} rx={1} fill={c as string} /><circle cx={fc + (dx as number)} cy={yOf(17)} r={1} fill="#cfe4ee" opacity={0.5} /></g>)}
            {/* a hanging ham deeper in */}
            <ellipse cx={fc + 8} cy={yOf(24)} rx={2.4} ry={4} fill="#7a3d24" opacity={0.85} />
            {/* heavy plank door, ajar */}
            <g data-door="entry"><path d={`M${fc - 12},${wBase} L${fc - 12},${yOf(18)} a12,12 0 0 1 6,-10 L${fc - 3},${yOf(10)} L${fc - 3},${wBase} Z`} fill="#4a2e14" /><g stroke="#2c1a0c" strokeWidth={0.6}><line x1={fc - 10} y1={yOf(8)} x2={fc - 10} y2={wBase} /><line x1={fc - 6} y1={yOf(12)} x2={fc - 6} y2={wBase} /></g></g>
            {/* worn stone steps down to the door */}
            <ellipse cx={fc} cy={wBase + 5} rx={20} ry={5} fill="#9a8e72" /><ellipse cx={fc} cy={wBase + 8} rx={14} ry={3.5} fill="#867a5e" />
          </g>
        );
      })()}

      {/* stubby stone vent on the mound */}
      {(() => { const v = { x: o.x + 26, y: yOf(50) }; return (
        <g><rect x={v.x - 4} y={v.y - 10} width={8} height={14} rx={1} fill={`url(#${id("stone")})`} stroke="rgba(0,0,0,.2)" strokeWidth={0.6} /><ellipse cx={v.x} cy={v.y - 10} rx={5} ry={1.6} fill="#3a3530" /><ellipse cx={v.x} cy={v.y - 10} rx={3.4} ry={1} fill="#1a1410" /></g>
      ); })()}

      {/* crocks + herb bundle outside the door */}
      {(() => { const cl = gp(-1.4, 0.5, 0), cr = gp(1.45, 0.45, 0); return (
        <g>
          <g transform={`translate(${cl.x} ${cl.y})`}><ellipse cx={0} cy={1} rx={7} ry={2} fill="rgba(0,0,0,.28)" /><path d="M-6,0 Q-7,-9 -3,-11 L3,-11 Q7,-9 6,0 Z" fill="#8a6a4a" /><ellipse cx={0} cy={-11} rx={4} ry={1.3} fill="#5a4530" /><ellipse cx={0} cy={-11} rx={3} ry={0.9} fill="#3a2c1c" /></g>
          <g transform={`translate(${cr.x} ${cr.y})`}><ellipse cx={0} cy={1} rx={6} ry={1.8} fill="rgba(0,0,0,.28)" /><path d="M-5,0 Q-6,-7 0,-8 Q6,-7 5,0 Z" fill="#9a7458" /><ellipse cx={0} cy={-8} rx={3.4} ry={1.1} fill="#5a4530" />
            {/* herb bundle leaning */}
            <line x1={5} y1={-2} x2={9} y2={-16} stroke="#5a6820" strokeWidth={1} /><ellipse cx={9.5} cy={-18} rx={2.4} ry={4.5} fill="#788840" transform="rotate(12 9.5 -18)" /></g>
        </g>
      ); })()}
    </g>
  );
}
