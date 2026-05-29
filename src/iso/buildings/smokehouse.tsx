// smokehouse — tapering smoke-hut (SMALL plot).
// Shape tells the story: a tall, steeply TAPERING charred-plank hut (a smoking
// "kiln cone") that funnels all its smoke out of a capped vent at the narrow
// top — billowing heavy smoke + embers. A low ember-glowing door shows fish &
// meat hung in the haze; a fish/flitch hangs curing outside on a rack and a
// woodpile feeds the fire.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Tapering charred smoke-hut (kiln cone) venting heavy smoke + embers from a capped top, ember-glow door with hung fish/meat, outdoor curing rack, woodpile. Distinct tapering silhouette.",
};

export default function IsoSmokehouse({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const bx0 = -0.62, bx1 = 0.62, by0 = -0.62, by1 = 0.62;     // base
  const tx0 = -0.16, tx1 = 0.16, ty0 = -0.16, ty1 = 0.16;     // narrow top
  const H = 74;

  // plank lines on a trapezoid face: base edge a0..a1 (ground), top edge b0..b1
  const planks = (a0: P, a1: P, b0: P, b1: P) => { const out: JSX.Element[] = [];
    for (let i = 1; i < 7; i++) { const t = i / 7; out.push(<line key={i} x1={lerp(a0, a1, t).x} y1={lerp(a0, a1, t).y} x2={lerp(b0, b1, t).x} y2={lerp(b0, b1, t).y} stroke="rgba(0,0,0,.28)" strokeWidth={0.8} />); }
    return <g>{out}</g>; };

  return (
    <g>
      <defs>
        <linearGradient id={id("charLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3324" /><stop offset="1" stopColor="#2a1c12" /></linearGradient>
        <linearGradient id={id("charShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c1d12" /><stop offset="1" stopColor="#160e08" /></linearGradient>
        <radialGradient id={id("ember")} cx="0.5" cy="0.7" r="0.7"><stop offset="0" stopColor="#ffd98a" /><stop offset="0.5" stopColor="#e0701c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={50} ry={20} fill="rgba(0,0,0,.34)" />

      {/* +gy (shade) tapering face */}
      {(() => { const a0 = gp(bx0, by1, 0), a1 = gp(bx1, by1, 0), b1 = gp(tx1, ty1, H), b0 = gp(tx0, ty1, H); return (
        <g><polygon points={pts(a0, a1, b1, b0)} fill={`url(#${id("charShade")})`} />{planks(a0, a1, b0, b1)}</g>
      ); })()}
      {/* +gx (lit) tapering face — ember door + hung curing */}
      {(() => { const a0 = gp(bx1, by0, 0), a1 = gp(bx1, by1, 0), b1 = gp(tx1, ty1, H), b0 = gp(tx1, ty0, H); const fc = (a0.x + a1.x) / 2, fb = (a0.y + a1.y) / 2; return (
        <g>
          <polygon points={pts(a0, a1, b1, b0)} fill={`url(#${id("charLit")})`} />{planks(a0, a1, b0, b1)}
          {/* ember-glow door */}
          <g data-door="entry">
            {nearDoor && <ellipse cx={fc} cy={fb - 14} rx={13} ry={16} fill="#ff8a28" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${fb - 14}px` }} />}
            <path d={`M${fc - 11},${fb} L${fc - 11},${fb - 22} a11,11 0 0 1 22,0 L${fc + 11},${fb} Z`} fill="#0e0a06" />
            <ellipse cx={fc} cy={fb - 9} rx={8} ry={9} fill={`url(#${id("ember")})`} style={{ animation: "flicker 1.8s ease-in-out infinite", transformOrigin: `${fc}px ${fb - 9}px` }} opacity={0.85} />
            {/* a fish + a flitch hung in the doorway haze */}
            <ellipse cx={fc - 4} cy={fb - 16} rx={2} ry={4.5} fill="#3a2c20" opacity={0.8} /><ellipse cx={fc + 4} cy={fb - 14} rx={2.6} ry={4} fill="#3a2c20" opacity={0.8} />
            {/* charred timber door-frame */}
            <path d={`M${fc - 11},${fb} L${fc - 11},${fb - 22} a11,11 0 0 1 22,0 L${fc + 11},${fb}`} fill="none" stroke="#2a1c12" strokeWidth={2} />
          </g>
        </g>
      ); })()}

      {/* charred corner posts (the arrises) for crisp edges */}
      <polyline points={pts(gp(bx1, by1, 0), gp(tx1, ty1, H))} fill="none" stroke="#1a1008" strokeWidth={2.5} />
      <polyline points={pts(gp(bx1, by0, 0), gp(tx1, ty0, H))} fill="none" stroke="#241710" strokeWidth={2} />
      <polyline points={pts(gp(bx0, by1, 0), gp(tx0, ty1, H))} fill="none" stroke="#241710" strokeWidth={2} />

      {/* ===== capped top + vent + heavy smoke (hero) ===== */}
      {(() => {
        const tN = gp(tx0, ty0, H), tE = gp(tx1, ty0, H), tS = gp(tx1, ty1, H), tW = gp(tx0, ty1, H);
        const cap = gp(0, 0, H + 8); const vent = gp(0, 0, H + 4);
        return (
          <g>
            {/* small roof cap (low pyramid) */}
            <polygon points={pts(tN, tE, cap)} fill="#3a2715" /><polygon points={pts(tE, tS, cap)} fill="#2c1d12" /><polygon points={pts(tW, tS, cap)} fill="#241710" />
            {/* louvre vent gap glowing faintly */}
            <ellipse cx={vent.x} cy={vent.y} rx={9} ry={4} fill="#1a1008" /><ellipse cx={vent.x} cy={vent.y} rx={6} ry={2.4} fill="#5a3416" opacity={0.7} />
            {/* embers spitting */}
            {[0, 0.8, 1.6].map((d, i) => <circle key={i} cx={vent.x} cy={vent.y - 2} r={0.8} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 4 : -4}px`, animation: `ember 2.6s ${d}s ease-out infinite`, transformOrigin: `${vent.x}px ${vent.y - 2}px` } as React.CSSProperties} />)}
            {/* heavy smoke */}
            <Smoke x={vent.x} y={vent.y - 4} scale={1.5} count={4} dur={3.4} color="#6a625a" />
            <Smoke x={vent.x + 3} y={vent.y - 4} scale={1.1} count={3} dur={4.2} color="#48423c" />
            <Smoke x={vent.x - 2} y={vent.y - 6} scale={0.8} count={3} dur={3.0} color="#7a7066" />
          </g>
        );
      })()}

      {/* outdoor curing rack (front-left) — hung fish/flitch swaying */}
      {(() => { const pL = gp(-1.5, 0.2, 0), pR = gp(-1.5, 1.1, 0); return (
        <g>
          <line x1={pL.x} y1={pL.y} x2={pL.x} y2={pL.y - 30} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
          <line x1={pR.x} y1={pR.y} x2={pR.x} y2={pR.y - 26} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
          <line x1={pL.x} y1={pL.y - 29} x2={pR.x} y2={pR.y - 25} stroke="#2c2012" strokeWidth={2} />
          {[0.3, 0.6, 0.85].map((t, i) => { const a = lerp({ x: pL.x, y: pL.y - 29 }, { x: pR.x, y: pR.y - 25 }, t); return (
            <g key={i} style={{ animation: `sway ${3.2 + i * 0.3}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: `${a.x}px ${a.y}px` }}>
              <line x1={a.x} y1={a.y} x2={a.x} y2={a.y + 3} stroke="#2c2012" strokeWidth={0.6} />
              {i === 1 ? <path d={`M${a.x - 3},${a.y + 5} L${a.x + 3},${a.y + 5} L${a.x},${a.y + 14} Z`} fill="#9a6a4a" /> : <g><ellipse cx={a.x} cy={a.y + 9} rx={2.4} ry={5} fill="#a8825a" /><path d={`M${a.x - 2.4},${a.y + 9} L${a.x - 4.6},${a.y + 11} L${a.x - 2.4},${a.y + 7} Z`} fill="#8a6a45" /></g>}
            </g>
          ); })}
        </g>
      ); })()}

      {/* woodpile (front-right) */}
      {(() => { const b = gp(1.45, 0.6, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}><ellipse cx={0} cy={2} rx={12} ry={3} fill="rgba(0,0,0,.28)" />{[-2, -6, -10].map((yy, r) => <g key={r}>{[-6, 6].map((dx) => <g key={dx} transform={`translate(${dx} ${yy})`}><ellipse cx={0} cy={0} rx={4.5} ry={3} fill="#7a5c34" /><ellipse cx={0} cy={0} rx={3} ry={1.8} fill="#a4824e" /><circle cx={0} cy={0} r={1} fill="#5a3a1f" /></g>)}</g>)}</g>
      ); })()}
    </g>
  );
}
