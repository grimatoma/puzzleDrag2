// smokehouse — meat-curing hut (SMALL plot).
// A squat charred-timber hut with a dark hip roof topped by roof VENTS that
// puff heavy grey smoke + spitting embers (the hero), an iron door with a
// glowing inspection slot, racks of hanging meats swaying inside the eave, and a
// woodpile feeding the fire.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, planks } from "../isoKit.jsx";
import { Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Charred-timber smoking hut; dark hip roof with smoke-puffing vents + embers (hero), iron door with glowing slot, swaying hanging meats, woodpile. Small/dark to vary the set.",
};

const HALF_W = 50, HALF_H = 25, WALL_H = 50, ROOF_RISE = 38, EAVE = 8, LW = 120, LH = 92;

export default function IsoSmokehouse({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  const vent = (vx: number, vy: number, i: number) => {
    const p = { x: apex.x + vx, y: apex.y + vy };
    return (
      <g key={i}>
        <g transform={`translate(${p.x} ${p.y})`}>
          <rect x={-4} y={0} width={8} height={6} fill="#1a1410" />
          <path d="M-6,0 L0,-6 L6,0 Z" fill="#5b5346" />
          <ellipse cx={0} cy={3} rx={2.4} ry={0.7} fill="#ffb14a" opacity={0.7} style={{ animation: `flicker ${1.6 + i * 0.2}s ease-in-out infinite`, transformOrigin: "0px 3px" }} />
        </g>
        <Smoke x={p.x} y={p.y - 4} scale={1.4} color="#5b5346" count={3} dur={3.6 + i * 0.6} />
        <Smoke x={p.x + 2} y={p.y - 4} scale={0.95} color="#3a3530" count={2} dur={4.2 + i * 0.3} />
        {[0, 1.2, 2.4].map((d, k) => (
          <circle key={k} cx={p.x} cy={p.y - 4} r={0.7} fill="#ffb14a" style={{ "--sx": `${k % 2 ? 3 : -3}px`, animation: `ember 2.4s ${d + i * 0.4}s ease-out infinite`, transformOrigin: `${p.x}px ${p.y - 4}px` } as React.CSSProperties} />
        ))}
      </g>
    );
  };

  return (
    <g>
      <defs>
        <linearGradient id={id("woodLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3324" /><stop offset="1" stopColor="#2c1d12" /></linearGradient>
        <linearGradient id={id("woodShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c1d12" /><stop offset="1" stopColor="#160e08" /></linearGradient>
        <linearGradient id={id("roofLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a3022" /><stop offset="1" stopColor="#2a1a10" /></linearGradient>
        <linearGradient id={id("roofShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#33221688" /><stop offset="1" stopColor="#1a1008" /></linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 14} ry={HALF_H + 5} fill="rgba(0,0,0,.34)" />

      {/* SW wall (shade) — hanging meats on a rod under the eave */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("woodShade")})`} />
        {planks("sw", LW, LH, 13)}
        <rect x={0} y={LH - 9} width={LW} height={9} fill="#1a1410" />
        {/* meat rod */}
        <rect x={20} y={16} width={80} height={2} fill="#3a2715" />
        {[30, 50, 70, 90].map((x, i) => (
          <g key={x} transform={`translate(${x} 18)`} style={{ animation: `sway ${3 + i * 0.3}s ${i * 0.15}s ease-in-out infinite`, transformOrigin: "0px 0px" }}>
            <line x1={0} y1={0} x2={0} y2={4} stroke="#3a2715" strokeWidth={0.7} />
            {i % 2 === 0
              ? <ellipse cx={0} cy={10} rx={4} ry={6} fill="#7a3d24" stroke="#3a160a" strokeWidth={0.6} />
              : <g><ellipse cx={0} cy={9} rx={3} ry={5} fill="#c89570" stroke="#3a160a" strokeWidth={0.5} /><path d="M0,13 L-2,16 L2,16 Z" fill="#c89570" /></g>}
          </g>
        ))}
      </g>

      {/* SE wall (lit) — iron door with glowing slot */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("woodLit")})`} />
        {planks("se", LW, LH, 13)}
        <rect x={0} y={0} width={LW} height={4} fill="rgba(120,90,60,.16)" />
        <rect x={0} y={LH - 9} width={LW} height={9} fill="#1a1410" />
        <g data-door="entry">
          <rect x={fc - 16} y={LH - 46} width={32} height={46} fill="#0e0a06" />
          <rect x={fc - 16} y={LH - 46} width={32} height={3} fill="#3a3530" /><rect x={fc - 16} y={LH - 12} width={32} height={3} fill="#3a3530" />
          {/* rivets */}
          <g fill="#3a3530">{[-12, -6, 0, 6, 12].map((dx) => <circle key={`a${dx}`} cx={fc + dx} cy={LH - 42} r={1} />)}{[-12, -6, 0, 6, 12].map((dx) => <circle key={`b${dx}`} cx={fc + dx} cy={LH - 8} r={1} />)}</g>
          {/* glowing inspection slot */}
          <rect x={fc - 6} y={LH - 30} width={12} height={5} fill="#ffb14a" style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 27}px` }} />
          <rect x={fc - 6} y={LH - 30} width={12} height={5} fill="none" stroke="#3a3530" strokeWidth={0.8} />
          {nearDoor && <rect x={fc - 16} y={LH - 46} width={32} height={46} fill="#ff8a28" opacity={0.18} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 23}px` }} />}
        </g>
      </g>

      {/* eave + dark hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke="#1a1008" strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#1a1008" />
      <polygon points={pts(topE, rightE, apex)} fill="#1a1008" />
      {shingles(leftE, bottomE, apex, `url(#${id("roofShade")})`, "rgba(0,0,0,.3)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("roofLit")})`, "rgba(0,0,0,.26)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#0e0a06" strokeWidth={3.5} />

      {/* roof vents puffing smoke (hero) */}
      {vent(-16, 14, 0)}
      {vent(2, 8, 1)}
      {vent(18, 16, 2)}

      {/* woodpile (front-right) */}
      {(() => { const b = add(right, { x: 6, y: 8 }); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={2} rx={11} ry={2.4} fill="rgba(0,0,0,.3)" />
          {[-2, -6, -10].map((yy, r) => (
            <g key={r}>{[-8, 8].map((dx) => <g key={dx} transform={`translate(${dx} ${yy})`}><ellipse cx={0} cy={0} rx={4.5} ry={3} fill="#7a5c34" /><ellipse cx={0} cy={0} rx={3} ry={1.8} fill="#5a3a1f" /><circle cx={0} cy={0} r={1} fill="#bda268" /></g>)}</g>
          ))}
        </g>
      ); })()}
    </g>
  );
}
