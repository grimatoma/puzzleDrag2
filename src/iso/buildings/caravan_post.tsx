// caravan_post — traders' caravan depot (LARGE plot).
// Shape tells the story: a covered merchant's WAGON — a cart on big spoked
// wheels with an arched canvas tilt over hoops (the hero) — drawn up beside an
// open timber GOODS-CANOPY stacked with crates, barrels and sacks. A tall
// banner POLE flies a pennant, a posting board carries notices and a lantern
// glows. Clearly a trading waystation, no plain box.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Caravan depot: covered merchant wagon (canvas tilt + spoked wheels, hero) beside an open timber goods-canopy of crates/barrels/sacks, a tall banner pole + pennant, a notices board + lantern.",
};

export default function IsoCaravanPost({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);

  const wheel = (cx: number, cy: number, r: number) => (
    <g><ellipse cx={cx} cy={cy + 1.5} rx={r} ry={r * 0.35} fill="rgba(0,0,0,.28)" /><circle cx={cx} cy={cy} r={r} fill="none" stroke="#3a2715" strokeWidth={3} /><circle cx={cx} cy={cy} r={r - 3} fill="none" stroke="#5a3a1f" strokeWidth={1} />
      <g stroke="#5a3a1f" strokeWidth={1.4}>{[0, 30, 60, 90, 120, 150].map((d) => <line key={d} x1={cx - r} y1={cy} x2={cx + r} y2={cy} transform={`rotate(${d} ${cx} ${cy})`} />)}</g>
      <circle cx={cx} cy={cy} r={2.4} fill="#3a2715" /><circle cx={cx} cy={cy} r={0.9} fill="#bda268" /></g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("canvas")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0e6cc" /><stop offset="1" stopColor="#cdbf9c" /></linearGradient>
        <linearGradient id={id("wood")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a5a30" /><stop offset="1" stopColor="#5a3a1f" /></linearGradient>
        <radialGradient id={id("lant")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={100} ry={34} fill="rgba(0,0,0,.3)" />

      {/* ===== open GOODS CANOPY (back-left) ===== */}
      {(() => {
        const x0 = -1.7, x1 = -0.4, y0 = -0.6, y1 = 0.6, PH = 52;
        const posts: P[] = [gp(x0, y0, 0), gp(x1, y0, 0), gp(x1, y1, 0), gp(x0, y1, 0)];
        const fL = gp(x0 - 0.1, y1 + 0.1, PH - 12), fR = gp(x1 + 0.1, y1 + 0.1, PH - 12), bL = gp(x0 - 0.1, y0 - 0.1, PH + 6), bR = gp(x1 + 0.1, y0 - 0.1, PH + 6);
        return (
          <g>
            {posts.map((p, i) => <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={p.y - PH} stroke="#4a2e14" strokeWidth={4} strokeLinecap="round" />)}
            {/* sloped plank roof */}
            <polygon points={pts(fL, fR, bR, bL)} fill="#6a4a28" />
            {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={lerp(fL, bL, t).x} y1={lerp(fL, bL, t).y} x2={lerp(fR, bR, t).x} y2={lerp(fR, bR, t).y} stroke="rgba(0,0,0,.22)" strokeWidth={1} />)}
            <polyline points={pts(fL, fR)} fill="none" stroke="#3a2715" strokeWidth={3} />
            {/* stacked crates + barrel + sacks under it */}
            {(() => { const b = gp((x0 + x1) / 2 + 0.1, 0, 0); return (
              <g transform={`translate(${b.x} ${b.y})`}>
                <rect x={-16} y={-16} width={16} height={16} rx={1} fill="#9a6a46" stroke="#c8a070" strokeWidth={0.8} /><line x1={-8} y1={-16} x2={-8} y2={0} stroke="#c8a070" strokeWidth={0.6} opacity={0.5} />
                <rect x={1} y={-13} width={14} height={13} rx={1} fill="#8a6040" stroke="#c8a070" strokeWidth={0.8} />
                <rect x={-12} y={-29} width={13} height={13} rx={1} fill="#a07050" stroke="#c8a070" strokeWidth={0.8} />
                {/* sacks */}
                <path d="M2,0 L1,-9 Q3,-12 7,-12 Q11,-12 13,-9 L12,0 Z" fill="#cbb88f" stroke="#a8946a" strokeWidth={0.6} transform="translate(6 0)" />
              </g>
            ); })()}
          </g>
        );
      })()}

      {/* ===== COVERED WAGON (hero, front-right) ===== */}
      {(() => {
        const c = gp(0.7, 0.5, 0); const cx = c.x, gy = c.y; // ground contact center
        const bedY = gy - 18;       // wagon bed top
        const halfL = 30;           // half length (along screen-x)
        return (
          <g>
            {/* rear wheel (further) then bed then front wheel (nearer) for depth */}
            {wheel(cx - 18, gy - 2, 12)}
            {/* wagon bed (box) */}
            <polygon points={`${cx - halfL},${bedY} ${cx + halfL},${bedY} ${cx + halfL - 4},${bedY + 10} ${cx - halfL + 4},${bedY + 10}`} fill={`url(#${id("wood")})`} />
            <rect x={cx - halfL} y={bedY - 3} width={halfL * 2} height={4} rx={1} fill="#3a2715" />
            <g stroke="#3a2715" strokeWidth={0.6} opacity={0.5}>{[-18, -6, 6, 18].map((dx) => <line key={dx} x1={cx + dx} y1={bedY} x2={cx + dx} y2={bedY + 9} />)}</g>
            {/* canvas tilt: arched half-cylinder over hoops */}
            <path d={`M${cx - halfL + 2},${bedY - 2} Q${cx - halfL + 2},${bedY - 40} ${cx - halfL + 16},${bedY - 42} L${cx + halfL - 16},${bedY - 42} Q${cx + halfL - 2},${bedY - 40} ${cx + halfL - 2},${bedY - 2} Z`} fill={`url(#${id("canvas")})`} />
            {/* hoop ribs + shading */}
            <g stroke="rgba(0,0,0,.14)" strokeWidth={1} fill="none">{[-18, -6, 6, 18].map((dx) => <path key={dx} d={`M${cx + dx},${bedY - 2} Q${cx + dx},${bedY - 40} ${cx + dx},${bedY - 42}`} />)}</g>
            <path d={`M${cx - halfL + 2},${bedY - 2} Q${cx - halfL + 2},${bedY - 40} ${cx - halfL + 16},${bedY - 42} L${cx - halfL + 16},${bedY - 38} Q${cx - halfL + 6},${bedY - 36} ${cx - halfL + 6},${bedY - 2} Z`} fill="rgba(0,0,0,.12)" />
            {/* dark opening at the rear of the tilt */}
            <ellipse cx={cx - halfL + 9} cy={bedY - 20} rx={5} ry={16} fill="#2c2418" opacity={0.8} />
            {/* front wheel (nearer, drawn on top) + draw-bar */}
            <line x1={cx + halfL - 6} y1={bedY + 6} x2={cx + halfL + 16} y2={gy + 2} stroke="#4a2e14" strokeWidth={3} strokeLinecap="round" />
            {wheel(cx + 20, gy, 14)}
            {/* near-door marker = wagon tail */}
            {nearDoor && <ellipse cx={cx - halfL + 9} cy={bedY - 18} rx={9} ry={18} fill="#ffcf6a" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${cx - halfL + 9}px ${bedY - 18}px` }} />}
            <g data-door="entry"><rect x={cx - 1} y={gy - 1} width={2} height={2} fill="none" /></g>
          </g>
        );
      })()}

      {/* ===== TALL BANNER POLE + pennant (front) ===== */}
      {(() => { const base = gp(1.7, -0.4, 0), top = { x: base.x, y: base.y - 104 }; return (
        <g>
          <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke="#4a3520" strokeWidth={4} strokeLinecap="round" />
          <circle cx={top.x} cy={top.y} r={2.4} fill={PAL.brass} />
          {/* long swallowtail pennant */}
          <g style={{ animation: "sway 2.8s ease-in-out infinite", transformOrigin: `${top.x}px ${top.y + 6}px` }}>
            <path d={`M${top.x},${top.y + 4} L${top.x + 30},${top.y + 8} L${top.x + 22},${top.y + 14} L${top.x + 30},${top.y + 20} L${top.x},${top.y + 22} Z`} fill="#b03828" />
            <path d={`M${top.x},${top.y + 8} L${top.x + 14},${top.y + 10} L${top.x + 14},${top.y + 18} L${top.x},${top.y + 18} Z`} fill="#f0e0b0" opacity={0.4} />
          </g>
          {/* hanging lantern lower on the pole */}
          <g transform={`translate(${base.x} ${base.y - 40})`}><line x1={0} y1={0} x2={6} y2={2} stroke="#2c2012" strokeWidth={1.2} /><g style={{ animation: "sway 3.6s ease-in-out infinite", transformOrigin: "6px 2px" }}><polygon points="2,3 9,6 9,16 2,19 -5,16 -5,6" fill="#2c2012" /><rect x={-2} y={7} width={6} height={9} fill={`url(#${id("lant")})`} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: "1px 11px" }} /></g></g>
        </g>
      ); })()}

      {/* ===== notices board (front-left) ===== */}
      {(() => { const b = gp(-1.7, 0.7, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <line x1={-7} y1={0} x2={-7} y2={-26} stroke="#5a3a1f" strokeWidth={3} strokeLinecap="round" /><line x1={7} y1={0} x2={7} y2={-26} stroke="#5a3a1f" strokeWidth={3} strokeLinecap="round" />
          <rect x={-12} y={-40} width={24} height={18} rx={1} fill="#6a4a28" stroke="#3a2715" strokeWidth={1.5} />
          <rect x={-12} y={-43} width={24} height={4} fill="#5a3a1f" />
          {/* pinned notices */}
          <rect x={-9} y={-37} width={8} height={10} fill="#efe6cf" transform="rotate(-4 -5 -32)" /><rect x={1} y={-36} width={8} height={9} fill="#e6dcc0" transform="rotate(3 5 -31)" />
          <g stroke="#9a8a6a" strokeWidth={0.4}><line x1={-8} y1={-34} x2={-2} y2={-34} /><line x1={-8} y1={-31} x2={-2} y2={-31} /><line x1={2} y1={-33} x2={8} y2={-33} /></g>
        </g>
      ); })()}
    </g>
  );
}
