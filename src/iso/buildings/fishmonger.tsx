// fishmonger — open-air fish market stall (NORMAL plot).
// Shape tells the story: NO walls — just four posts holding a big striped
// canvas AWNING (gabled) over a long ICE COUNTER heaped with whole fish on
// crushed ice (the hero). A drying rack of hung fish sways at the back, brine
// barrels + a tipping scale + a chalk price slate sit alongside, gulls wheel
// overhead and the cobbles are wet.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Open market stall: posts + striped gabled awning (no walls) over an iced fish counter (hero), swaying drying rack of fish, brine barrels, tipping scale, price slate, wheeling gulls, wet cobbles.",
};

export default function IsoFishmonger({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const x0 = -0.95, x1 = 0.95, y0 = -0.7, y1 = 0.7, PH = 52;

  const fish = (cx: number, cy: number, body: string, belly: string, s = 1) => (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={9} ry={2.6} fill={body} /><ellipse cx={0} cy={-0.7} rx={9} ry={1.5} fill={belly} />
      <path d="M9,0 L13,-3 L13,3 Z" fill={body} /><path d="M0,-2.2 L2,-3.6 L4,-2.2 Z" fill={body} />
      <circle cx={-6} cy={-0.7} r={0.9} fill="#fbf7eb" /><circle cx={-6} cy={-0.7} r={0.5} fill="#1a1410" />
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("ice")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eaf4f8" /><stop offset="1" stopColor="#a8c4d0" /></linearGradient>
        <linearGradient id={id("counter")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a5c34" /><stop offset="1" stopColor="#4a2e14" /></linearGradient>
      </defs>

      {/* wet cobble apron + puddle reflection */}
      {(() => { const a = gp(-1.4, -1.0, 0), b = gp(1.4, -1.0, 0), c = gp(1.4, 1.5, 0), d = gp(-1.4, 1.5, 0); const j: JSX.Element[] = [];
        for (let t = 0.2; t < 1; t += 0.2) { j.push(<line key={`x${t}`} x1={lerp(a, d, t).x} y1={lerp(a, d, t).y} x2={lerp(b, c, t).x} y2={lerp(b, c, t).y} stroke="rgba(0,0,0,.12)" strokeWidth={1} />); j.push(<line key={`y${t}`} x1={lerp(a, b, t).x} y1={lerp(a, b, t).y} x2={lerp(d, c, t).x} y2={lerp(d, c, t).y} stroke="rgba(0,0,0,.12)" strokeWidth={1} />); }
        return <g><polygon points={pts(a, b, c, d)} fill="#7c7e80" /><polygon points={pts(a, b, c, d)} fill="rgba(120,170,190,.08)" />{j}<ellipse cx={gp(0.5, 1.1, 0).x} cy={gp(0.5, 1.1, 0).y} rx={12} ry={4} fill="#5a8ca0" opacity={0.4} /></g>; })()}

      {/* back posts */}
      {[gp(x0, y0, 0), gp(x1, y0, 0)].map((p, i) => <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={p.y - PH} stroke="#5a3a1f" strokeWidth={4} strokeLinecap="round" />)}

      {/* ===== drying rack of hung fish (back) ===== */}
      {(() => { const a = gp(x0 + 0.1, y0 + 0.05, PH - 8), b = gp(x1 - 0.1, y0 + 0.05, PH - 8); return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3a2715" strokeWidth={2} />
          {[0.12, 0.3, 0.5, 0.7, 0.88].map((t, i) => { const p = lerp(a, b, t); return (
            <g key={i} style={{ animation: `sway ${3 + i * 0.3}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: `${p.x}px ${p.y}px` }}>
              <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 4} stroke="#2c2012" strokeWidth={0.6} />
              <ellipse cx={p.x} cy={p.y + 9} rx={3} ry={5} fill={i % 2 ? "#9aa6ac" : "#c89570"} /><path d={`M${p.x},${p.y + 14} L${p.x - 2},${p.y + 17} L${p.x + 2},${p.y + 17} Z`} fill={i % 2 ? "#7c858d" : "#a87a5a"} /><circle cx={p.x + 1.6} cy={p.y + 7} r={0.5} fill="#1a1410" />
            </g>
          ); })}
        </g>
      ); })()}

      {/* ===== ICE COUNTER heaped with fish (hero) ===== */}
      {(() => {
        const a = gp(x0 + 0.15, y1 - 0.15, 0), b = gp(x1 - 0.15, y1 - 0.15, 0), c = gp(x1 - 0.15, y0 + 0.5, 0), d = gp(x0 + 0.15, y0 + 0.5, 0);
        const TH = 26;
        const aT = { x: a.x, y: a.y - TH }, bT = { x: b.x, y: b.y - TH }, cT = { x: c.x, y: c.y - TH }, dT = { x: d.x, y: d.y - TH };
        return (
          <g>
            {/* counter front + side */}
            <polygon points={pts(a, b, bT, aT)} fill={`url(#${id("counter")})`} />
            <polygon points={pts(b, c, cT, bT)} fill="#3a2715" />
            <g stroke="#3a2715" strokeWidth={0.6} opacity={0.5}>{[0.25, 0.5, 0.75].map((t) => <line key={t} x1={lerp(a, b, t).x} y1={lerp(a, b, t).y} x2={lerp(aT, bT, t).x} y2={lerp(aT, bT, t).y} />)}</g>
            {/* crushed-ice bed */}
            <polygon points={pts(aT, bT, cT, dT)} fill={`url(#${id("ice")})`} />
            <g fill="#fbfdff" opacity={0.8}>{[[0.2, 0.3], [0.5, 0.6], [0.8, 0.35], [0.35, 0.75], [0.65, 0.8]].map(([u, v], i) => { const p = lerp(lerp(aT, bT, u), lerp(dT, cT, u), v); return <circle key={i} cx={p.x} cy={p.y} r={0.8} />; })}</g>
            {/* fish heaped on ice */}
            {fish(lerp(aT, cT, 0.4).x - 16, lerp(aT, cT, 0.4).y, "#7c858d", "#bcc4c8")}
            {fish(lerp(aT, cT, 0.5).x, lerp(aT, cT, 0.5).y - 2, "#c89570", "#e8c39a")}
            {fish(lerp(aT, cT, 0.6).x + 16, lerp(aT, cT, 0.55).y, "#7c858d", "#bcc4c8", 0.9)}
            {fish(lerp(aT, cT, 0.7).x - 6, lerp(aT, cT, 0.7).y + 3, "#9a8aa0", "#c8bcd0", 0.85)}
            {/* a couple of lemons + a crab */}
            <circle cx={lerp(aT, cT, 0.5).x - 24} cy={lerp(aT, cT, 0.5).y + 1} r={2} fill="#f4d262" />
            <ellipse cx={lerp(aT, cT, 0.5).x + 26} cy={lerp(aT, cT, 0.5).y + 2} rx={4} ry={2.6} fill="#c0492c" />
          </g>
        );
      })()}

      {/* front posts (in front of the counter) */}
      {[gp(x0, y1, 0), gp(x1, y1, 0)].map((p, i) => <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={p.y - PH} stroke="#4a2e14" strokeWidth={4.5} strokeLinecap="round" />)}

      {/* ===== STRIPED GABLED AWNING over the stall ===== */}
      {(() => {
        const eFL = gp(x0 - 0.12, y1 + 0.12, PH - 4), eFR = gp(x1 + 0.12, y1 + 0.12, PH - 4);
        const eBL = gp(x0 - 0.12, y0 - 0.12, PH - 4), eBR = gp(x1 + 0.12, y0 - 0.12, PH - 4);
        const rL = gp(x0 - 0.12, 0, PH + 18), rR = gp(x1 + 0.12, 0, PH + 18);
        const stripes = (a0: P, a1: P, b0: P, b1: P, key: string) => { const out: JSX.Element[] = []; const n = 11;
          for (let i = 0; i < n; i++) { const p0 = lerp(a0, a1, i / n), p1 = lerp(a0, a1, (i + 1) / n), q1 = lerp(b0, b1, (i + 1) / n), q0 = lerp(b0, b1, i / n); out.push(<polygon key={`${key}${i}`} points={pts(p0, p1, q1, q0)} fill={i % 2 ? "#327088" : "#f4f0e2"} />); } return <g>{out}</g>; };
        return (
          <g>
            {/* front slope (lit-ish) + back slope */}
            {stripes(eBL, eBR, rL, rR, "bk")}
            {stripes(eFL, eFR, rL, rR, "fr")}
            {/* scalloped front hem */}
            {Array.from({ length: 11 }, (_, i) => { const a = lerp(eFL, eFR, i / 11), b = lerp(eFL, eFR, (i + 1) / 11); return <path key={i} d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + 4} ${b.x},${b.y} Z`} fill={i % 2 ? "#327088" : "#f4f0e2"} />; })}
            <polyline points={pts(rL, rR)} fill="none" stroke="#1f4a5a" strokeWidth={2} />
            <polyline points={pts(eFL, eFR)} fill="none" stroke="#28323c" strokeWidth={1.5} />
          </g>
        );
      })()}

      {/* near-door marker (the counter is the "entry") */}
      {nearDoor && <ellipse cx={gp(0, y1, 8).x} cy={gp(0, y1, 8).y} rx={20} ry={10} fill="#ffcf6a" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${gp(0, y1, 8).x}px ${gp(0, y1, 8).y}px` }} />}
      <g data-door="entry"><rect x={gp(0, y1, 0).x - 1} y={gp(0, y1, 0).y - 2} width={2} height={2} fill="none" /></g>

      {/* brine barrels + tipping scale + price slate (sides) */}
      {(() => { const bl = gp(-1.45, 0.6, 0), sc = gp(1.4, 0.2, PH - 18), ps = gp(1.5, 1.0, 0); return (
        <g>
          {/* barrels */}
          <g transform={`translate(${bl.x} ${bl.y})`}><ellipse cx={2} cy={2} rx={16} ry={3} fill="rgba(0,0,0,.28)" />{[-8, 8].map((dx) => <g key={dx} transform={`translate(${dx} 0)`}><path d="M-7,0 Q-8,-9 -7,-16 L7,-16 Q8,-9 7,0 Z" fill="#5a7a6a" /><path d="M-7,0 Q-8,-9 -7,-16 L-2,-16 Q-3,-9 -2,0 Z" fill="#3f5a4f" /><rect x={-8} y={-11} width={16} height={1.6} fill="#3a3530" /><rect x={-8} y={-5} width={16} height={1.6} fill="#3a3530" /><ellipse cx={0} cy={-16} rx={7} ry={2} fill="#2c3a34" /></g>)}</g>
          {/* hanging scale on the front post */}
          <g transform={`translate(${sc.x} ${sc.y})`}><line x1={0} y1={0} x2={0} y2={-6} stroke="#3a2715" strokeWidth={0.9} /><g style={{ animation: "sway 3s ease-in-out infinite", transformOrigin: "0px -6px" }}><line x1={-7} y1={-6} x2={7} y2={-6} stroke="#3a2715" strokeWidth={1} /><path d="M-10,-6 L-4,-6 L-5,-3 L-9,-3 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth={0.4} /><path d="M4,-6 L10,-6 L9,-3 L5,-3 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth={0.4} /></g></g>
          {/* price slate */}
          <g transform={`translate(${ps.x} ${ps.y})`}><rect x={-1} y={-20} width={2} height={20} fill="#5a3a1f" /><rect x={-9} y={-34} width={18} height={14} fill="#2a2a2a" /><rect x={-8} y={-33} width={16} height={12} fill="#3a4248" /><text x={0} y={-29} textAnchor="middle" fontFamily="Georgia, serif" fontSize={3.4} fontWeight={700} fill="#cfe4ee">CATCH</text><text x={0} y={-24.5} textAnchor="middle" fontFamily="Georgia, serif" fontSize={3} fill="#aec8d0">Cod 3</text></g>
        </g>
      ); })()}

      {/* gulls */}
      {[{ x: 0.2, h: PH + 46, e: 34, d: 16, dl: 0, s: 1 }, { x: 1.0, h: PH + 60, e: -28, d: 20, dl: 2, s: 0.8 }].map((g, i) => { const c = gp(g.x, 0, g.h); return (
        <g key={i} transform={`translate(${c.x} ${c.y})`}><g style={{ animation: `walk ${g.d}s ${g.dl}s linear infinite alternate`, transformOrigin: "0 0", ["--end" as string]: `${g.e}px` } as React.CSSProperties}><g style={{ animation: `flap ${0.45 + i * 0.05}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: "0 0" }} transform={`scale(${g.s})`}><path d="M-5,1 Q-2,-3 0,0 Q2,-3 5,1" stroke="#3a2715" strokeWidth={1.3} fill="none" strokeLinecap="round" /></g></g></g>
      ); })}
    </g>
  );
}
