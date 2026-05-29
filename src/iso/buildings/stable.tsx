// stable — long low horse stable (NORMAL plot, elongated).
// Ridge runs along +gy so the long sandy timber-framed wall faces the lit SE
// side: two Dutch-door stalls with HORSE HEADS poking over the half-doors
// (bob), a central sliding door between them, under a shallow brown-tile roof.
// A hay bale, a rippling water trough, a horseshoe sign, a leaning pitchfork and
// a darting swallow dress the yard.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts, quadShingles } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Long low stable; two Dutch-door stalls with bobbing horse heads (hero) + central sliding door on the lit long wall, shallow tile roof, hay bale, rippling trough, horseshoe sign, pitchfork, darting swallow.",
};

const SAND_S = "#b8a060";

export default function IsoStable({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, gy0: number, gy1: number, hb: number, ht: number) => PM(gp(gx, gy0, ht), gp(gx, gy1, ht), gp(gx, gy0, hb));
  const swWall = (gy: number, gx0: number, gx1: number, hb: number, ht: number) => PM(gp(gx0, gy, ht), gp(gx1, gy, ht), gp(gx0, gy, hb));

  const gx0 = -0.8, gx1 = 0.8, gy0 = -1.35, gy1 = 1.35;
  const H = 46, RIDGE = H + 30, ov = 0.14;

  // horse head poking over a Dutch door at gy, drawn in screen space
  const horse = (gy: number, coat: string, mane: string, dur: number, delay: number) => {
    const c = gp(gx1, gy, 28);
    return (
      <g transform={`translate(${c.x} ${c.y})`}>
        <g style={{ animation: `bob ${dur}s ${delay}s ease-in-out infinite`, transformOrigin: "0px 4px" }}>
          <path d="M-4,4 L-3,-7 L4,-7 L5,4 Z" fill={coat} />
          <path d="M-1,-7 Q-1,-11 1,-12 L5,-12 Q8,-12 8,-8 L8,-2 L5,-2 L5,1 L-1,1 Z" fill={coat} />
          <path d="M-1,-7 L-4,-2 L-2.6,-1 L-1.6,-5 Z" fill={mane} />
          <path d="M-1,-10 L-4,-7 L-2.6,-6 Z" fill={mane} />
          <path d="M1,-12 L2.4,-15 L4,-12 Z" fill={coat} />
          <circle cx={3.4} cy={-8} r={0.7} fill="#1a1410" />
          <ellipse cx={7} cy={-4} rx={0.5} ry={0.8} fill="#1a0e06" />
        </g>
      </g>
    );
  };

  return (
    <g>
      <defs>
        <linearGradient id={id("sandL")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ecd49a" /><stop offset="1" stopColor="#d2b870" /></linearGradient>
        <linearGradient id={id("sandS")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bda468" /><stop offset="1" stopColor="#9a8048" /></linearGradient>
        <linearGradient id={id("tileL")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a05636" /><stop offset="1" stopColor="#6f3420" /></linearGradient>
      </defs>

      <GroundShadow origin={o} rx={68} ry={28} />

      {/* +gy short end wall (shade) */}
      <g transform={swWall(gy1, gx0, gx1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("sandS")})`} />
        <g stroke={PAL.timber} strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.6}>
          <line x1={0} y1={28} x2={120} y2={28} /><line x1={0} y1={60} x2={120} y2={60} /><line x1={60} y1={0} x2={60} y2={92} />
        </g>
        <rect x={0} y={92 - 10} width={120} height={10} fill={SAND_S} />
      </g>

      {/* +gx long wall (lit) — stalls + central sliding door */}
      <g transform={seWall(gx1, gy0, gy1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("sandL")})`} />
        {/* timber framing */}
        <g stroke={PAL.timber} strokeWidth={2.2} vectorEffect="non-scaling-stroke" opacity={0.6}>
          <line x1={0} y1={3} x2={120} y2={3} /><line x1={0} y1={34} x2={120} y2={34} /><line x1={0} y1={89} x2={120} y2={89} />
          {[0, 30, 60, 90, 120].map((x) => <line key={x} x1={x} y1={3} x2={x} y2={92} />)}
        </g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" />
        <rect x={0} y={92 - 9} width={120} height={9} fill={SAND_S} />
        {/* two stall doorways (open top) + central sliding door. local x: ~18, 60, 102 */}
        {[18, 102].map((cx) => (
          <g key={cx}>
            <rect x={cx - 13} y={40} width={26} height={52} fill="#241a10" />
            <rect x={cx - 13} y={66} width={26} height={26} fill="#7a5c34" />
            <g stroke="#5a3a1f" strokeWidth={0.8}><line x1={cx - 13} y1={78} x2={cx + 13} y2={78} /></g>
            <rect x={cx - 6} y={50} width={12} height={5} rx={1} fill="#fbf7eb" />
          </g>
        ))}
        {/* central sliding door */}
        <g data-door="entry">
          {nearDoor && <rect x={44} y={34} width={32} height={58} fill="#ff8a28" opacity={0.26} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 63px" }} />}
          <rect x={44} y={34} width={32} height={58} fill="#5a3a1f" />
          <g stroke="#3a2715" strokeWidth={0.8}>{[50, 56, 62, 68, 74].map((x) => <line key={x} x1={x} y1={34} x2={x} y2={92} />)}<line x1={44} y1={62} x2={76} y2={62} /></g>
          <line x1={44} y1={34} x2={76} y2={92} stroke="#3a2715" strokeWidth={1.6} /><line x1={76} y1={34} x2={44} y2={92} stroke="#3a2715" strokeWidth={1.6} />
          <rect x={42} y={31} width={36} height={3} fill="#3a3530" />
        </g>
      </g>

      {/* eave + shallow tile roof: +gx slope (lit) + gable end at +gy */}
      {(() => {
        const eaveB = gp(gx1 + ov, gy0 - ov, H), eaveF = gp(gx1 + ov, gy1 + ov, H);
        const ridgeB = gp(0, gy0 - ov, RIDGE), ridgeF = gp(0, gy1 + ov, RIDGE);
        const gEaveL = gp(gx0, gy1 + ov, H), gEaveR = gp(gx1 + ov, gy1 + ov, H), gApex = gp(0, gy1 + ov, RIDGE);
        return (
          <g>
            {/* far slope hint */}
            <polygon points={pts(gp(gx0 - ov, gy0 - ov, H), ridgeB, ridgeF, gp(gx0 - ov, gy1 + ov, H))} fill="#5e2c18" />
            {quadShingles(eaveB, eaveF, ridgeF, ridgeB, `url(#${id("tileL")})`, "rf", 4, 12)}
            {/* +gy gable triangle */}
            <polygon points={pts(gEaveL, gEaveR, gApex)} fill={`url(#${id("sandS")})`} />
            <path d={`M${(gEaveL.x + gApex.x) / 2},${(gEaveL.y + gApex.y) / 2} L${(gEaveR.x + gApex.x) / 2},${(gEaveR.y + gApex.y) / 2}`} stroke="#3a2715" strokeWidth={1} opacity={0.4} />
            <polyline points={pts(eaveB, eaveF)} fill="none" stroke="#3a160a" strokeWidth={3} />
            <polyline points={pts(gEaveL, gApex, gEaveR)} fill="none" stroke="#3a160a" strokeWidth={2} />
            <polyline points={pts(ridgeB, ridgeF)} fill="none" stroke={PAL.ridge} strokeWidth={1.2} opacity={0.7} />
          </g>
        );
      })()}

      {/* horse heads poking over the two stalls (bob) */}
      {horse(-0.74, "#a55a3a", "#5a3a1f", 4, 0)}
      {horse(0.74, "#c9c2b4", "#8a8276", 4.4, 0.6)}

      {/* ===== YARD PROPS ===== */}
      {/* hay bale (front-left) */}
      {(() => { const b = gp(gx1 + 0.5, gy0 + 0.2, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={1} rx={11} ry={2.4} fill="rgba(0,0,0,.3)" />
          <rect x={-9} y={-11} width={18} height={11} rx={2} fill="#e8c266" />
          <g stroke="#a98a4a" strokeWidth={0.6} fill="none"><line x1={-9} y1={-7} x2={9} y2={-7} /><line x1={-3} y1={-11} x2={-3} y2={0} /><line x1={3} y1={-11} x2={3} y2={0} /></g>
        </g>
      ); })()}
      {/* water trough (front-right) */}
      {(() => { const b = gp(gx1 + 0.5, gy1 - 0.1, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={1} rx={11} ry={2.4} fill="rgba(0,0,0,.3)" />
          <rect x={-10} y={-7} width={20} height={7} fill="#5a3a1f" /><rect x={-10} y={-7} width={20} height={1.4} fill="#3a2715" />
          <rect x={-9} y={-6} width={18} height={4} fill="#3a7088" /><ellipse cx={0} cy={-6} rx={8.5} ry={1} fill="#5aa0bd" />
          <g style={{ animation: "wave 2.4s ease-in-out infinite", transformOrigin: "0px -5px" }}><ellipse cx={0} cy={-5} rx={6} ry={0.4} fill="#cfe4ee" opacity={0.6} /></g>
        </g>
      ); })()}
      {/* horseshoe sign + pitchfork near the door */}
      {(() => { const s = gp(gx1, 0, 40); const pf = gp(gx1 + 0.35, gy0 + 0.5, 0); return (
        <g>
          {/* horseshoe nailed above the central door */}
          <g transform={`translate(${s.x} ${s.y}) scale(1.5)`}>
            <path d="M-4,0 a4,4 0 0 1 8,0 L2.2,2 L2.2,5 L-2.2,5 L-2.2,2 Z" fill="#7c858d" stroke="#3a3530" strokeWidth={0.5} />
            <g fill="#3a3530"><circle cx={-2.6} cy={0} r={0.4} /><circle cx={2.6} cy={0} r={0.4} /><circle cx={-1.4} cy={-2} r={0.4} /><circle cx={1.4} cy={-2} r={0.4} /></g>
          </g>
          <g transform={`translate(${pf.x} ${pf.y}) rotate(14)`}>
            <line x1={0} y1={0} x2={0} y2={-22} stroke="#7a5c34" strokeWidth={1.4} />
            <g stroke="#7c858d" strokeWidth={1} fill="none"><line x1={-2} y1={-22} x2={-2} y2={-27} /><line x1={0} y1={-22} x2={0} y2={-27} /><line x1={2} y1={-22} x2={2} y2={-27} /></g>
          </g>
        </g>
      ); })()}
      {/* darting swallow */}
      <g transform={`translate(${gp(0, gy1, RIDGE + 14).x} ${gp(0, gy1, RIDGE + 14).y})`}>
        <g style={{ animation: "walk 12s linear infinite alternate", transformOrigin: "0 0", ["--end" as string]: "30px" } as React.CSSProperties}>
          <path d="M-4,1 Q-2,-1.5 0,0 Q2,-1.5 4,1" stroke="#3a2715" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}
