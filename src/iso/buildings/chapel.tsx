// chapel — stone church with a bell tower (NORMAL plot, tall accent).
// Reimagined for iso as a classic church silhouette: a dominant front BELL
// TOWER (the hero) carrying an arched door, a glowing ROSE stained-glass window,
// an arched bell opening with a SWINGING bell, and a steep pyramidal spire + a
// cross finial — with a lower NAVE attached behind under a steep slate gable
// roof, lancet windows + candle glow on its flank, and ♪ chime notes drifting
// from the belfry. Gravestones at the side.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts, quadShingles } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Stone church: front bell tower (rose window + swinging bell + spire + cross), lower gable-roof nave, lancet windows + candle glow, chime ♪ notes, gravestones.",
};

const STONE_S = "#a89262", SLATE_L = "#46505f", SLATE_S = "#2f3848";

export default function IsoChapel({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);

  // generic wall panels (local 120×92 → iso plane)
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, gy0: number, gy1: number, hb: number, ht: number) => PM(gp(gx, gy0, ht), gp(gx, gy1, ht), gp(gx, gy0, hb));
  const swWall = (gy: number, gx0: number, gx1: number, hb: number, ht: number) => PM(gp(gx0, gy, ht), gp(gx1, gy, ht), gp(gx0, gy, hb));

  // footprints
  const tX0 = 0.18, tX1 = 1.05, tY0 = -0.45, tY1 = 0.45; // tower
  const TH_ = 104; // tower wall height
  const nX0 = -1.25, nX1 = 0.2, nY0 = -0.7, nY1 = 0.7; // nave
  const NH = 56; // nave wall height
  const navRidge = NH + 40;

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneL")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2d8c2" /><stop offset="1" stopColor="#c2b288" /></linearGradient>
        <linearGradient id={id("stoneS")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b6a074" /><stop offset="1" stopColor="#8a744c" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <GroundShadow origin={o} rx={56} ry={24} />

      {/* ===== NAVE (drawn first, behind the tower) ===== */}
      {/* SW (shade) long wall with lancet windows + candle glow */}
      <g transform={swWall(nY1, nX0, nX1, 0, NH)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneS")})`} />
        <g stroke="rgba(0,0,0,.18)" strokeWidth={0.5} vectorEffect="non-scaling-stroke">{[24, 44, 64].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={92 - 10} width={120} height={10} fill={STONE_S} />
        {[30, 62, 94].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={36} r={11} fill="#ffd56a" opacity={0.4} style={{ animation: `flicker ${3 + cx * 0.01}s ease-in-out infinite`, transformOrigin: `${cx}px 36px` }} />
            <path d={`M${cx - 5},${64} L${cx - 5},${30} a5,5 0 0 1 10,0 L${cx + 5},${64} Z`} fill="#2c2012" />
            <path d={`M${cx - 3.5},${64} L${cx - 3.5},${31} a3.5,3.5 0 0 1 7,0 L${cx + 3.5},${64} Z`} fill="#6a9a80" />
            <circle cx={cx} cy={46} r={1.4} fill="#fff8c2" opacity={0.8} />
          </g>
        ))}
      </g>

      {/* nave gable roof: front (+gy) slate slope + ridge */}
      {(() => {
        const eaveL = gp(nX0 - 0.12, nY1 + 0.14, NH), eaveR = gp(nX1 + 0.12, nY1 + 0.14, NH);
        const ridgeL = gp(nX0 - 0.12, 0, navRidge), ridgeR = gp(nX1 + 0.12, 0, navRidge);
        return (
          <g>
            {/* far slope hint */}
            <polygon points={pts(gp(nX0 - 0.12, nY0 - 0.14, NH), ridgeL, ridgeR, gp(nX1 + 0.12, nY0 - 0.14, NH))} fill={SLATE_S} />
            {quadShingles(eaveL, eaveR, ridgeR, ridgeL, SLATE_L, "nav", 5, 12)}
            <polyline points={pts(eaveL, eaveR)} fill="none" stroke="#1a1410" strokeWidth={3} />
            <polyline points={pts(ridgeL, ridgeR)} fill="none" stroke="#1a1410" strokeWidth={2} />
            <polyline points={pts(ridgeL, ridgeR)} fill="none" stroke={PAL.ridge} strokeWidth={1} opacity={0.7} />
          </g>
        );
      })()}

      {/* ===== BELL TOWER (hero) ===== */}
      {/* SW (shade) face */}
      <g transform={swWall(tY1, tX0, tX1, 0, TH_)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneS")})`} />
        <g stroke="rgba(0,0,0,.16)" strokeWidth={0.5} vectorEffect="non-scaling-stroke">{[16, 34, 52, 70].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={92 - 10} width={120} height={10} fill={STONE_S} />
      </g>
      {/* SE (lit) face — door, rose window, bell opening */}
      <g transform={seWall(tX1, tY0, tY1, 0, TH_)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneL")})`} />
        <g stroke="rgba(0,0,0,.1)" strokeWidth={0.5} vectorEffect="non-scaling-stroke">{[16, 34, 52, 70].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" />
        <rect x={0} y={92 - 10} width={120} height={10} fill={STONE_S} />
        {/* arched door */}
        <g data-door="entry">
          {nearDoor && <ellipse cx={60} cy={74} rx={16} ry={20} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 74px" }} />}
          <path d="M48,92 L48,62 a12,12 0 0 1 24,0 L72,92 Z" fill={PAL.timber} />
          <path d="M51,92 L51,63 a9,9 0 0 1 18,0 L69,92 Z" fill={PAL.timberSoft} />
          <line x1={60} y1={92} x2={60} y2={54} stroke="#3a2715" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx={56} cy={78} r={1.2} fill={PAL.brass} /><circle cx={64} cy={78} r={1.2} fill={PAL.brass} />
        </g>
        {/* ROSE stained-glass window (hero) */}
        <g transform="translate(60 34)">
          <circle r={13} fill="#fff8c2" opacity={0.2} style={{ animation: "flicker 3.4s ease-in-out infinite", transformOrigin: "0 0" }} />
          <circle r={11} fill={STONE_S} /><circle r={9.5} fill="#2c2012" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const col = i % 4 === 0 ? "#c96442" : i % 4 === 1 ? "#5a3a92" : i % 4 === 2 ? "#e0a83a" : "#3a7088";
            return <ellipse key={i} cx={Math.cos(a) * 4.6} cy={Math.sin(a) * 4.6} rx={2.4} ry={3.6} transform={`rotate(${(i / 8) * 360} ${Math.cos(a) * 4.6} ${Math.sin(a) * 4.6})`} fill={col} opacity={0.95} />;
          })}
          <circle r={2.4} fill="#fff8c2" />
          <line x1={-9.5} y1={0} x2={9.5} y2={0} stroke="#2c2012" strokeWidth={0.6} /><line x1={0} y1={-9.5} x2={0} y2={9.5} stroke="#2c2012" strokeWidth={0.6} />
        </g>
        {/* arched belfry opening near the top */}
        <path d="M52,18 L52,8 a8,8 0 0 1 16,0 L68,18 Z" fill="#1a1410" />
      </g>

      {/* tower cornice */}
      <polyline points={pts(gp(tX0, tY1, TH_), gp(tX1, tY1, TH_), gp(tX1, tY0, TH_))} fill="none" stroke="#1a1410" strokeWidth={2.5} />

      {/* SWINGING BELL in the belfry (screen space, in front of the opening) */}
      {(() => {
        const c = gp((tX0 + tX1) / 2 + 0.18, tY1 - 0.18, TH_ - 16);
        return (
          <g transform={`translate(${c.x} ${c.y})`}>
            <line x1={-4} y1={-3} x2={4} y2={-3} stroke="#3a2715" strokeWidth={1} />
            <g style={{ animation: "bell 4s ease-in-out infinite", transformOrigin: "0px -3px" }}>
              <path d="M-3.2,-2 L-4,6 L4,6 L3.2,-2 Q1.6,-4 0,-4 Q-1.6,-4 -3.2,-2 Z" fill="#e0a83a" stroke="#a87825" strokeWidth={0.6} />
              <ellipse cx={0} cy={6} rx={4} ry={0.9} fill="#a87825" />
              <line x1={0} y1={0} x2={0} y2={7} stroke="#5a3a1f" strokeWidth={0.6} />
            </g>
          </g>
        );
      })()}

      {/* ===== SPIRE (square pyramid) + cross ===== */}
      {(() => {
        const apex = gp((tX0 + tX1) / 2, (tY0 + tY1) / 2, TH_ + 56);
        const tl = gp(tX0, tY0, TH_), tr = gp(tX1, tY0, TH_), bl = gp(tX0, tY1, TH_), br = gp(tX1, tY1, TH_);
        return (
          <g>
            <polygon points={pts(tl, tr, apex)} fill={SLATE_S} />
            <polygon points={pts(tr, br, apex)} fill={SLATE_L} />
            <polygon points={pts(bl, br, apex)} fill={SLATE_S} />
            {/* hip highlights */}
            <g stroke={PAL.ridge} strokeWidth={1} opacity={0.7} fill="none"><line x1={apex.x} y1={apex.y} x2={br.x} y2={br.y} /><line x1={apex.x} y1={apex.y} x2={tr.x} y2={tr.y} /></g>
            <g stroke="rgba(0,0,0,.4)" strokeWidth={1} fill="none"><line x1={apex.x} y1={apex.y} x2={bl.x} y2={bl.y} /></g>
            {/* cross finial */}
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={apex.y - 16} stroke="#cabf9a" strokeWidth={2} />
            <line x1={apex.x - 5} y1={apex.y - 11} x2={apex.x + 5} y2={apex.y - 11} stroke="#cabf9a" strokeWidth={2} />
          </g>
        );
      })()}

      {/* ♪ chime notes drifting from the belfry */}
      {[0, 1.2, 2.4].map((d, i) => {
        const c = gp(tX1 - 0.1, tY1 - 0.2, TH_ - 14);
        return (
          <text key={i} x={c.x + i * 2} y={c.y} fontFamily="Georgia, serif" fontSize={7} fill="#cabf9a" style={{ "--nx": `${10 + i * 3}px`, animation: `note 3.6s ${d}s ease-out infinite`, transformOrigin: `${c.x}px ${c.y}px`, opacity: 0.8 } as React.CSSProperties}>♪</text>
        );
      })}

      {/* gravestones at the side (front-left, by the nave) */}
      {[{ x: -1.5, y: 0.55 }, { x: -1.15, y: 0.85 }].map((m, i) => {
        const b = gp(m.x, m.y, 0);
        return (
          <g key={i} transform={`translate(${b.x} ${b.y})`}>
            <ellipse cx={0} cy={2} rx={5} ry={1.4} fill="rgba(0,0,0,.3)" />
            <path d="M-3,2 L-3,-5 a3,3 0 0 1 6,0 L3,2 Z" fill="#9a8e72" />
            <path d="M-3,2 L-3,-5 a3,3 0 0 1 1.5,-2.6 L-1.5,2 Z" fill="#7a6f58" />
            <line x1={-1.4} y1={-3} x2={1.4} y2={-3} stroke="#5b5346" strokeWidth={0.5} /><line x1={0} y1={-4.4} x2={0} y2={-1.6} stroke="#5b5346" strokeWidth={0.5} />
          </g>
        );
      })}
    </g>
  );
}
