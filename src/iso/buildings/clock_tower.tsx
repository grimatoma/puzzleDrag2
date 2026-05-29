// clock_tower — tall civic clock tower (NORMAL plot, tall accent).
// A square coursed-stone shaft with quoins, an arched door + slot windows, a
// big CLOCK FACE on the lit face (hour + minute hands sweep), an open BELFRY
// with a swinging BELL, and a slate PYRAMID roof topped by a finial + a turning
// weathervane. Doves perch on the belfry; a bench + a little fountain sit at the
// base. The clock is drawn as a true screen-space circle so it stays legible.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Square stone clock tower: clock face with sweeping hands (hero), belfry with swinging bell, slate pyramid roof + turning weathervane, doves, base bench + fountain.",
};

const STONE_S = "#b8a778";

export default function IsoClockTower({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, gy0: number, gy1: number, hb: number, ht: number) => PM(gp(gx, gy0, ht), gp(gx, gy1, ht), gp(gx, gy0, hb));
  const swWall = (gy: number, gx0: number, gx1: number, hb: number, ht: number) => PM(gp(gx0, gy, ht), gp(gx1, gy, ht), gp(gx0, gy, hb));

  const x0 = -0.72, x1 = 0.72, y0 = -0.72, y1 = 0.72;
  const H = 104, belfry = 22, ROOF = 40;
  const clock = gp(x1, 0, 66); // clock center on the lit SE face

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneL")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6dab6" /><stop offset="1" stopColor="#cdbd92" /></linearGradient>
        <linearGradient id={id("stoneS")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfae82" /><stop offset="1" stopColor="#988458" /></linearGradient>
        <radialGradient id={id("win")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      <GroundShadow origin={o} rx={42} ry={20} />

      {/* ===== SHAFT ===== */}
      <g transform={swWall(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneS")})`} />
        <g stroke="rgba(0,0,0,.16)" strokeWidth={0.5} vectorEffect="non-scaling-stroke">{[20, 40, 60, 78].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={92 - 10} width={120} height={10} fill={STONE_S} />
        {/* quoins */}
        <g fill="#a89262">{[8, 28, 48, 68].map((y) => <rect key={y} x={0} y={y} width={6} height={10} />)}</g>
      </g>
      <g transform={seWall(x1, y0, y1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneL")})`} />
        <g stroke="rgba(0,0,0,.1)" strokeWidth={0.5} vectorEffect="non-scaling-stroke">{[20, 40, 60, 78].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" />
        <rect x={0} y={92 - 10} width={120} height={10} fill={STONE_S} />
        <g fill="#a89262">{[8, 28, 48, 68].map((y) => <rect key={y} x={114} y={y} width={6} height={10} />)}</g>
        {/* arched door */}
        <g data-door="entry">
          {nearDoor && <ellipse cx={60} cy={74} rx={14} ry={18} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 74px" }} />}
          <path d="M50,92 L50,64 a10,10 0 0 1 20,0 L70,92 Z" fill={PAL.timber} />
          <path d="M53,92 L53,65 a7,7 0 0 1 14,0 L67,92 Z" fill={PAL.timberSoft} />
          <circle cx={63} cy={78} r={1.4} fill={PAL.brass} />
        </g>
        {/* slot window above door */}
        <rect x={56} y={34} width={8} height={16} fill="#2c1c0e" />
        <rect x={58} y={36} width={4} height={12} fill={`url(#${id("win")})`} style={{ animation: "flicker 4s ease-in-out infinite", transformOrigin: "60px 42px" }} />
      </g>

      {/* shaft top band */}
      <polyline points={pts(gp(x0, y1, H), gp(x1, y1, H), gp(x1, y0, H))} fill="none" stroke="#7a5c34" strokeWidth={3} />

      {/* ===== BELFRY (open arches + swinging bell) ===== */}
      <g transform={seWall(x1, y0, y1, H, H + belfry)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneL")})`} />
        <path d="M30,92 L30,34 a18,18 0 0 1 36,0 L66,92 Z" fill="#1a1410" opacity={0.92} transform="translate(12 0)" />
      </g>
      <g transform={swWall(y1, x0, x1, H, H + belfry)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneS")})`} />
        <path d="M44,92 L44,34 a18,18 0 0 1 36,0 L80,92 Z" fill="#1a1410" opacity={0.9} />
      </g>
      {/* swinging bell (screen space, centered in the belfry) */}
      {(() => {
        const c = gp((x0 + x1) / 2, (y0 + y1) / 2, H + belfry - 9);
        return (
          <g transform={`translate(${c.x} ${c.y})`}>
            <g style={{ animation: "bell 3s ease-in-out infinite", transformOrigin: "0px -5px" }}>
              <line x1={-4} y1={-5} x2={4} y2={-5} stroke="#3a2715" strokeWidth={1} />
              <path d="M-3,-4 L-4,3 L4,3 L3,-4 Q1.6,-5.5 0,-5.5 Q-1.6,-5.5 -3,-4 Z" fill="#e0a83a" stroke="#a87825" strokeWidth={0.6} />
              <ellipse cx={0} cy={3} rx={4} ry={0.7} fill="#a87825" />
              <line x1={0} y1={-1} x2={0} y2={4} stroke="#5a3a1f" strokeWidth={0.6} />
            </g>
          </g>
        );
      })()}

      {/* ===== PYRAMID ROOF + finial + weathervane ===== */}
      {(() => {
        const apex = gp(0, 0, H + belfry + ROOF);
        const tl = gp(x0, y0, H + belfry), tr = gp(x1, y0, H + belfry), bl = gp(x0, y1, H + belfry), br = gp(x1, y1, H + belfry);
        return (
          <g>
            <polygon points={pts(tl, tr, apex)} fill="#2f3848" />
            <polygon points={pts(tr, br, apex)} fill="#46505f" />
            <polygon points={pts(bl, br, apex)} fill="#3a4654" />
            <polyline points={pts(bl, br, tr)} fill="none" stroke="#1a1410" strokeWidth={2.5} />
            <g stroke={PAL.ridge} strokeWidth={1} opacity={0.6} fill="none"><line x1={apex.x} y1={apex.y} x2={br.x} y2={br.y} /><line x1={apex.x} y1={apex.y} x2={tr.x} y2={tr.y} /></g>
            {/* finial */}
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={apex.y - 14} stroke="#3a3530" strokeWidth={1.4} />
            {/* weathervane (turning) */}
            <g transform={`translate(${apex.x} ${apex.y - 14})`}>
              <g style={{ animation: "sway 9s ease-in-out infinite", transformOrigin: "0 2px" }}>
                <path d="M-4,0 L0,-2 L4,0 L3,1 L-3,1 Z" fill="#3a3530" />
                <line x1={-5} y1={2} x2={5} y2={2} stroke="#3a3530" strokeWidth={0.6} />
              </g>
              <circle cx={0} cy={3} r={1.2} fill={PAL.brass} />
            </g>
          </g>
        );
      })()}

      {/* ===== CLOCK FACE (hero, true circle, hands sweep) ===== */}
      <g transform={`translate(${clock.x} ${clock.y})`}>
        <circle r={16} fill="#9a8e72" /><circle r={14.5} fill="#3a2715" /><circle r={13} fill="#fbf7eb" />
        <g stroke="#3a2715" strokeWidth={1} strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={Math.sin(a) * 11} y1={-Math.cos(a) * 11} x2={Math.sin(a) * 12.6} y2={-Math.cos(a) * 12.6} />;
          })}
        </g>
        <g fontFamily="Georgia, serif" fontSize={3.4} fontWeight={700} fill="#3a2715" textAnchor="middle">
          <text x={0} y={-8.5}>XII</text><text x={9.5} y={1.2}>III</text><text x={0} y={11}>VI</text><text x={-9.5} y={1.2}>IX</text>
        </g>
        <g style={{ animation: "windmill 60s linear infinite", transformOrigin: "0px 0px" }}>
          <path d="M-0.9,2 L-0.9,-8 L0,-9 L0.9,-8 L0.9,2 Z" fill="#3a2715" />
        </g>
        <g style={{ animation: "windmill 12s linear infinite", transformOrigin: "0px 0px" }}>
          <path d="M-0.7,2 L-0.7,-12 L0,-12.8 L0.7,-12 L0.7,2 Z" fill="#3a2715" />
        </g>
        <circle r={1.6} fill="#7a1d12" /><circle r={0.7} fill="#fbf7eb" />
      </g>

      {/* doves on the belfry corners */}
      {[gp(x0, y1, H + belfry), gp(x1, y0, H + belfry)].map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y - 2})`}>
          <ellipse cx={0} cy={0} rx={2} ry={0.9} fill="#dde2e7" /><circle cx={i ? 1 : -1} cy={-0.9} r={0.8} fill="#dde2e7" />
        </g>
      ))}

      {/* base bench + fountain */}
      {(() => {
        const bn = gp(-1.5, 0.4, 0), ft = gp(1.5, 0.5, 0);
        return (
          <g>
            <g transform={`translate(${bn.x} ${bn.y})`}>
              <rect x={-6} y={-4} width={12} height={2.4} rx={0.5} fill="#5a3a1f" /><rect x={-5} y={-2} width={1.4} height={3} fill="#5a3a1f" /><rect x={3.6} y={-2} width={1.4} height={3} fill="#5a3a1f" />
            </g>
            <g transform={`translate(${ft.x} ${ft.y})`}>
              <ellipse cx={0} cy={0} rx={8} ry={2.6} fill="#7a716a" /><ellipse cx={0} cy={-1.6} rx={8} ry={2.4} fill="#a89262" /><ellipse cx={0} cy={-1.8} rx={5} ry={1.4} fill="#5aa0bd" />
              <circle cx={0} cy={-2.4} r={0.9} fill="#cfe4ee" style={{ animation: "v2pulse 2s ease-in-out infinite", transformOrigin: `0px -2.4px` }} />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
