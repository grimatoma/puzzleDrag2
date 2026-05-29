// sawmill — riverside saw shed (NORMAL plot).
// A natural-plank shed under a low timber roof beside a river. The lit face
// opens onto a saw bench where a circular SAW BLADE spins through a log (the
// hero), throwing sawdust sparks; a big paddle WATER WHEEL on the river side
// turns and drips with a splash, sawdust motes drift, and fresh-cut lumber is
// stacked out front.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts, quadShingles } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Riverside sawmill; open bench with spinning circular saw through a log (hero) + sparks, turning paddle water-wheel over a river (drips + splash), sawdust pollen, stacked lumber.",
};

const PLANK_S = "#8a6a3a";

export default function IsoSawmill({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, gy0: number, gy1: number, hb: number, ht: number) => PM(gp(gx, gy0, ht), gp(gx, gy1, ht), gp(gx, gy0, hb));
  const swWall = (gy: number, gx0: number, gx1: number, hb: number, ht: number) => PM(gp(gx0, gy, ht), gp(gx1, gy, ht), gp(gx0, gy, hb));
  const x0 = -1.0, x1 = 1.0, y0 = -0.85, y1 = 0.85, H = 56, RIDGE = H + 30, ov = 0.14;

  return (
    <g>
      <defs>
        <linearGradient id={id("plankLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfa86a" /><stop offset="1" stopColor="#a4824a" /></linearGradient>
        <linearGradient id={id("plankShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#97784a" /><stop offset="1" stopColor="#6f5430" /></linearGradient>
        <linearGradient id={id("roof")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a4a2c" /><stop offset="1" stopColor="#42301c" /></linearGradient>
        <radialGradient id={id("win")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      {/* river strip along the +gx side */}
      <polygon points={pts(gp(x1 + 0.2, y0, 0), gp(x1 + 1.9, y0, 0), gp(x1 + 1.9, y1 + 0.4, 0), gp(x1 + 0.2, y1 + 0.4, 0))} fill={PAL.sea} />
      {[0, 1].map((k) => (
        <path key={k} d={`M${gp(x1 + 0.4, y0 + k * 0.5, 0).x},${gp(x1 + 0.4, y0 + k * 0.5, 0).y} Q${gp(x1 + 1.1, y0 + k * 0.5 + 0.2, 0).x},${gp(x1 + 1.1, y0 + k * 0.5 + 0.2, 0).y + 3} ${gp(x1 + 1.8, y0 + k * 0.5, 0).x},${gp(x1 + 1.8, y0 + k * 0.5, 0).y}`} fill="none" stroke={PAL.seaLight} strokeWidth={1.4} opacity={0.5} style={{ animation: `wave ${3 + k}s ${k * 0.6}s ease-in-out infinite`, transformOrigin: `${o.x}px ${o.y}px` }} />
      ))}

      <GroundShadow origin={o} rx={56} ry={24} />

      {/* +gy wall (shade) */}
      <g transform={swWall(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plankShade")})`} />
        <g stroke="#6f5430" strokeWidth={0.7} opacity={0.7}>{Array.from({ length: 10 }, (_, i) => 8 + i * 11).map((x) => <line key={x} x1={x} y1={0} x2={x} y2={92} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={92 - 9} width={120} height={9} fill={PLANK_S} />
      </g>

      {/* +gx wall (lit) — open saw bench (hero) + window */}
      <g transform={seWall(x1, y0, y1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plankLit")})`} />
        <g stroke="#7a5c34" strokeWidth={0.7} opacity={0.6}>{Array.from({ length: 10 }, (_, i) => 8 + i * 11).map((x) => <line key={x} x1={x} y1={0} x2={x} y2={92} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" />
        <rect x={0} y={92 - 9} width={120} height={9} fill={PLANK_S} />
        {/* lit window */}
        <rect x={94} y={30} width={14} height={18} fill="#3a2715" /><rect x={96} y={32} width={10} height={14} fill={`url(#${id("win")})`} style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: "101px 39px" }} />
        {/* open saw doorway (dark) */}
        <g data-door="entry">
          <rect x={20} y={34} width={56} height={58} fill="#160f08" />
          {nearDoor && <rect x={20} y={34} width={56} height={58} fill="#ff8a28" opacity={0.18} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "48px 63px" }} />}
          {/* saw bench + log + spinning blade */}
          <rect x={26} y={74} width={44} height={5} fill="#5a3a1f" />
          <ellipse cx={38} cy={70} rx={11} ry={4.5} fill="#a98a5a" /><ellipse cx={38} cy={70} rx={7} ry={3} fill="#bda268" />
          <ellipse cx={38} cy={70} rx={3.5} ry={1.6} fill="none" stroke="#7a5c34" strokeWidth={0.5} />
          {/* circular saw (spins) */}
          <g transform="translate(54 70)">
            <g style={{ animation: "v2spin 0.35s linear infinite", transformOrigin: "0 0" }}>
              <circle r={9} fill="#9a9c9e" /><circle r={7} fill="#bcc4c8" stroke="#5b5346" strokeWidth={0.6} />
              <g fill="#3a3530">{Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <polygon key={i} points={`${Math.cos(a) * 9},${Math.sin(a) * 9} ${Math.cos(a + 0.2) * 11},${Math.sin(a + 0.2) * 11} ${Math.cos(a + 0.4) * 9},${Math.sin(a + 0.4) * 9}`} />; })}</g>
              <circle r={1.6} fill="#3a3530" />
            </g>
          </g>
          {/* sawdust sparks at the cut */}
          {[0, 0.15, 0.3, 0.45].map((d, i) => (
            <circle key={i} cx={46} cy={70} r={1} fill="#e8c39a" style={{ "--sx": `${i % 2 ? -8 : -14}px`, "--sy": `${-(i + 1) * 2}px`, animation: `spark 1s ${d}s ease-out infinite`, transformOrigin: "46px 70px" } as React.CSSProperties} />
          ))}
        </g>
      </g>

      {/* eave + roof (+gx slope) + gable */}
      {(() => {
        const eaveB = gp(x1 + ov, y0 - ov, H), eaveF = gp(x1 + ov, y1 + ov, H);
        const ridgeB = gp(0, y0 - ov, RIDGE), ridgeF = gp(0, y1 + ov, RIDGE);
        const gL = gp(x0, y1 + ov, H), gR = gp(x1 + ov, y1 + ov, H), gA = gp(0, y1 + ov, RIDGE);
        return (
          <g>
            <polygon points={pts(gp(x0 - ov, y0 - ov, H), ridgeB, ridgeF, gp(x0 - ov, y1 + ov, H))} fill="#42301c" />
            {quadShingles(eaveB, eaveF, ridgeF, ridgeB, `url(#${id("roof")})`, "rf", 4, 11)}
            <polygon points={pts(gL, gR, gA)} fill={`url(#${id("plankShade")})`} />
            {/* hayloft door in the gable */}
            <rect x={(gL.x + gR.x) / 2 - 5} y={(gL.y + gA.y) / 2 - 2} width={10} height={9} fill="#3a2715" />
            <polyline points={pts(eaveB, eaveF)} fill="none" stroke="#2a1d10" strokeWidth={3} />
            <polyline points={pts(gL, gA, gR)} fill="none" stroke="#2a1d10" strokeWidth={2} />
            <polyline points={pts(ridgeB, ridgeF)} fill="none" stroke="#caa86a" strokeWidth={1.2} opacity={0.7} />
          </g>
        );
      })()}

      {/* ===== WATER WHEEL on the river (+gx) side (turns + drips + splash) ===== */}
      {(() => { const c = gp(x1 + 0.9, y1 + 0.1, 18); return (
        <g transform={`translate(${c.x} ${c.y})`}>
          <rect x={-12} y={-2} width={6} height={4} fill="#5a3a1f" />
          <g style={{ animation: "waterwheel 6s linear infinite", transformOrigin: "0 0" }}>
            <circle r={16} fill="none" stroke="#5a3a1f" strokeWidth={2.4} /><circle r={12} fill="none" stroke="#5a3a1f" strokeWidth={1} />
            <g stroke="#5a3a1f" strokeWidth={1.6}>{[0, 45, 90, 135].map((d) => <line key={d} x1={-16} y1={0} x2={16} y2={0} transform={`rotate(${d})`} />)}</g>
            <g fill="#3a2715">{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d) => <rect key={d} x={12} y={-2} width={5} height={4} transform={`rotate(${d})`} />)}</g>
            <circle r={2.4} fill="#3a2715" /><circle r={0.9} fill="#bda268" />
          </g>
          {[0, 0.8, 1.6].map((d, i) => <ellipse key={i} cx={16} cy={-2 + i * 2} rx={0.8} ry={1.6} fill={PAL.seaFoam} style={{ animation: `drip 2s ${d}s ease-in infinite`, transformOrigin: `16px ${-2 + i * 2}px` }} />)}
          <ellipse cx={6} cy={16} rx={9} ry={2} fill={PAL.seaFoam} opacity={0.8} style={{ animation: "splash 1.4s ease-in-out infinite", transformOrigin: "6px 16px" }} />
        </g>
      ); })()}

      {/* sawdust motes + lumber stack (front-left) */}
      {[{ x: -10, p: -30, d: 4 }, { x: -2, p: 30, d: 4.5 }, { x: 6, p: -24, d: 5 }].map((m, i) => {
        const c = gp(x1, -0.2, 22);
        return <circle key={i} cx={c.x + m.x} cy={c.y} r={0.7} fill="#e8c39a" style={{ "--px": `${m.p}px`, animation: `pollen ${m.d}s ${i * 0.5}s ease-in-out infinite`, transformOrigin: `${c.x + m.x}px ${c.y}px`, opacity: 0.7 } as React.CSSProperties} />;
      })}
      {(() => { const b = gp(-1.4, 0.7, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={2} rx={14} ry={3} fill="rgba(0,0,0,.3)" />
          {[-6, -3, 0, 3].map((yy, r) => <g key={r}><rect x={-12} y={yy - 4} width={24} height={2.4} fill={r % 2 ? "#bda268" : "#c89570"} /><circle cx={-12} cy={yy - 3} r={1} fill="#a98a5a" stroke="#7a5c34" strokeWidth={0.3} /></g>)}
        </g>
      ); })()}
    </g>
  );
}
