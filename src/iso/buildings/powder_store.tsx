// powder_store — gunpowder magazine (NORMAL plot).
// A squat, heavily-reinforced block-stone magazine banked by a grass berm, with
// a low lead BARREL-VAULT roof, an iron-banded blast DOOR under a hazard-chevron
// strip + skull plate (the hero), narrow slit vents, a lightning ROD that
// sparks, and X-marked gunpowder BARRELS with a no-flames sign out front.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts, lerp } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Reinforced gunpowder magazine; block-stone walls + grass berm, low lead barrel-vault roof, iron blast door + hazard chevrons + skull (hero), slit vents, sparking lightning rod, X-marked barrels + no-flames sign.",
};

export default function IsoPowderStore({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, gy0: number, gy1: number, hb: number, ht: number) => PM(gp(gx, gy0, ht), gp(gx, gy1, ht), gp(gx, gy0, hb));
  const swWall = (gy: number, gx0: number, gx1: number, hb: number, ht: number) => PM(gp(gx0, gy, ht), gp(gx1, gy, ht), gp(gx0, gy, hb));
  const x0 = -1.0, x1 = 1.0, y0 = -0.7, y1 = 0.7, H = 46, RISE = 30;

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#968d82" /><stop offset="1" stopColor="#736a60" /></linearGradient>
        <linearGradient id={id("stoneShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5e564e" /><stop offset="1" stopColor="#403a34" /></linearGradient>
        <linearGradient id={id("lead")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a8e92" /><stop offset="0.5" stopColor="#6a7076" /><stop offset="1" stopColor="#4a5056" /></linearGradient>
      </defs>

      {/* grass berm banked around the base */}
      <ellipse cx={o.x} cy={o.y + 4} rx={66} ry={20} fill="#5c7a3c" />
      <ellipse cx={o.x} cy={o.y + 2} rx={66} ry={18} fill="#6b8a4a" />
      <GroundShadow origin={o} rx={48} ry={20} />

      {/* SW wall (shade) — slit vent */}
      <g transform={swWall(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneShade")})`} />
        <g stroke="#2e2a26" strokeWidth={1.4} fill="none">{[0, 30, 60, 90, 120].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={92} vectorEffect="non-scaling-stroke" />)}{[24, 48, 72].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={56} y={28} width={6} height={26} fill="#1a1410" />
      </g>

      {/* SE wall (lit) — iron blast door + hazard + skull (hero) */}
      <g transform={seWall(x1, y0, y1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneLit")})`} />
        <g stroke="#3a342e" strokeWidth={1.4} fill="none">{[0, 30, 60, 90, 120].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={92} vectorEffect="non-scaling-stroke" />)}{[24, 48, 72].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,255,255,.08)" />
        {/* slit vents */}
        <rect x={14} y={30} width={6} height={24} fill="#1a1410" /><rect x={100} y={30} width={6} height={24} fill="#1a1410" />
        {/* iron blast door */}
        <g data-door="entry">
          {nearDoor && <rect x={38} y={36} width={44} height={56} fill="#ff8a28" opacity={0.2} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 64px" }} />}
          <rect x={38} y={36} width={44} height={56} fill="#3a2715" />
          <rect x={38} y={36} width={44} height={4} fill="#1a1410" />
          <g fill="#5b5346"><rect x={38} y={48} width={44} height={4} /><rect x={38} y={74} width={44} height={4} /></g>
          <g fill="#1a1410">{[44, 52, 60, 68, 76].map((x) => <circle key={`a${x}`} cx={x} cy={50} r={1.3} />)}{[44, 52, 60, 68, 76].map((x) => <circle key={`b${x}`} cx={x} cy={76} r={1.3} />)}</g>
          {/* ring handle */}
          <circle cx={60} cy={64} r={4} fill="none" stroke="#1a1410" strokeWidth={2} /><circle cx={60} cy={62} r={1.2} fill="#7c858d" />
        </g>
        {/* hazard chevron strip above the door */}
        <rect x={34} y={24} width={52} height={8} fill="#e0a83a" />
        <g fill="#1a1410">{Array.from({ length: 6 }, (_, i) => <polygon key={i} points={`${34 + i * 9},24 ${34 + i * 9 + 5},24 ${34 + i * 9},32 ${34 + i * 9 - 5},32`} />)}</g>
        <rect x={34} y={24} width={52} height={8} fill="none" stroke="#7a5c34" strokeWidth={1} />
        {/* skull plate */}
        <g transform="translate(24 16)"><circle cx={0} cy={0} r={4} fill="#f5ecd6" /><rect x={-2.6} y={3} width={5.2} height={2.6} fill="#f5ecd6" /><circle cx={-1.4} cy={-0.5} r={1} fill="#1a1410" /><circle cx={1.4} cy={-0.5} r={1} fill="#1a1410" /></g>
      </g>

      {/* ===== LEAD BARREL-VAULT ROOF ===== */}
      {(() => {
        const ov = 0.12;
        const feL = gp(x0 - ov, y1 + ov, H), feR = gp(x1 + ov, y1 + ov, H); // front eave
        const rL = gp(x0 - ov, 0, H + RISE), rR = gp(x1 + ov, 0, H + RISE);   // ridge
        // +gx end arch cap
        const eEaveF = gp(x1 + ov, y1 + ov, H), eRidge = gp(x1 + ov, 0, H + RISE), eEaveB = gp(x1 + ov, y0 - ov, H);
        const ribs: JSX.Element[] = [];
        for (let t = 0.2; t < 1; t += 0.2) { const a = lerp(feL, rL, t), b = lerp(feR, rR, t); ribs.push(<line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.18)" strokeWidth={0.8} />); }
        return (
          <g>
            {/* back-top sliver */}
            <polygon points={pts(gp(x0 - ov, y0 - ov, H), rL, rR, gp(x1 + ov, y0 - ov, H))} fill="#454b50" />
            {/* front curved surface (one quad, gradient-lit) */}
            <polygon points={pts(feL, feR, rR, rL)} fill={`url(#${id("lead")})`} />
            {ribs}
            {/* +gx arch end cap */}
            <path d={`M${eEaveF.x},${eEaveF.y} Q${eRidge.x + 8},${(eEaveF.y + eRidge.y) / 2} ${eRidge.x},${eRidge.y} Q${eRidge.x - 8},${(eEaveB.y + eRidge.y) / 2} ${eEaveB.x},${eEaveB.y} Z`} fill="#5a6066" />
            {/* eave + ridge lines */}
            <polyline points={pts(feL, feR)} fill="none" stroke="#2e2a26" strokeWidth={3} />
            <polyline points={pts(rL, rR)} fill="none" stroke="#aab0b4" strokeWidth={1.4} opacity={0.8} />
          </g>
        );
      })()}

      {/* ===== LIGHTNING ROD (sparks) ===== */}
      {(() => { const base = gp(-0.4, 0, H + RISE), tip = { x: base.x, y: base.y - 22 }; return (
        <g>
          <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke="#3a3530" strokeWidth={1.6} />
          <path d={`M${tip.x - 1.4},${tip.y} L${tip.x + 1.4},${tip.y} L${tip.x},${tip.y - 4} Z`} fill="#bcc4c8" />
          <g style={{ animation: "flicker 4s ease-in-out infinite", transformOrigin: `${tip.x}px ${tip.y - 4}px` }}>
            <circle cx={tip.x} cy={tip.y - 4} r={2} fill="#cfe4ee" opacity={0.6} />
            <path d={`M${tip.x},${tip.y - 4} L${tip.x - 2},${tip.y} L${tip.x + 0.6},${tip.y} L${tip.x - 1},${tip.y + 4}`} stroke="#cfe4ee" strokeWidth={0.6} fill="none" opacity={0.8} />
          </g>
        </g>
      ); })()}

      {/* ===== GUNPOWDER BARRELS (X) + no-flames sign ===== */}
      {(() => { const bl = gp(-1.55, 0.5, 0), br = gp(1.55, 0.5, 0), sg = gp(1.5, -0.3, 0); return (
        <g>
          {[bl, br].map((b, i) => (
            <g key={i} transform={`translate(${b.x} ${b.y}) scale(${i ? 0.9 : 1})`}>
              <ellipse cx={0} cy={1} rx={8} ry={1.8} fill="rgba(0,0,0,.3)" />
              <path d="M-7,0 Q-8,-7 -7,-14 L7,-14 Q8,-7 7,0 Z" fill="#7a4a26" />
              <ellipse cx={0} cy={-14} rx={7} ry={1.8} fill="#3a3530" />
              <path d="M-7.6,-9 Q0,-8 7.6,-9 L7.4,-8 Q0,-7 -7.4,-8 Z" fill="#3a3530" /><path d="M-7.6,-5 Q0,-4 7.6,-5 L7.4,-4 Q0,-3 -7.4,-4 Z" fill="#3a3530" />
              <path d="M-3,-11 L3,-4 M3,-11 L-3,-4" stroke="#e0a83a" strokeWidth={1} />
            </g>
          ))}
          {/* no-flames sign */}
          <g transform={`translate(${sg.x} ${sg.y})`}>
            <rect x={-0.6} y={0} width={1.2} height={14} fill="#5a3a1f" />
            <rect x={-7} y={-8} width={14} height={8} fill="#fbf7eb" stroke="#3a2715" strokeWidth={0.8} />
            <path d="M-2,-6 Q-1,-2 0,-4 Q1,-2 2,-6 Q0,-4 -1,-6 Q0,-5 -2,-6 Z" fill="#c96442" />
            <line x1={-5} y1={-1} x2={5} y2={-7} stroke="#c96442" strokeWidth={1.6} />
          </g>
        </g>
      ); })()}
    </g>
  );
}
