// watchtower — a round stone keep (NORMAL plot, tall defensive tower).
// A coursed stone CYLINDER with an arched portcullis door, glowing arrow-slits,
// machicolation corbels and a crenellated BATTLEMENT crown. A guard silhouette
// PATROLS the top (walk), a pennant FLAG snaps on its pole (sway), a lookout
// BRAZIER and wall TORCHES flicker, and low crenellated curtain-wall stubs flank
// the base.

import { useId } from "react";
import { type P, makeGp, GroundShadow, pts } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Round stone tower: cylinder + crenellated battlement + machicolations, arched portcullis, glowing arrow-slits; patrolling guard (walk), pennant (sway), brazier + torches (flicker), curtain-wall stubs.",
};

export default function IsoWatchtower({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  const R = 25, baseH = 6, topH = 116;
  const arc = (h: number, r = R) => `M${o.x - r},${yOf(h)} Q${o.x},${yOf(h) + r * 0.5 * 1.2} ${o.x + r},${yOf(h)}`;
  const band = (hB: number, hT: number, r = R) => `M${o.x - r},${yOf(hB)} Q${o.x},${yOf(hB) + r * 0.5 * 1.2} ${o.x + r},${yOf(hB)} L${o.x + r},${yOf(hT)} Q${o.x},${yOf(hT) + r * 0.5 * 1.2} ${o.x - r},${yOf(hT)} Z`;

  return (
    <g>
      <defs>
        <linearGradient id={id("stone")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c7058" /><stop offset="0.45" stopColor="#a89a7c" /><stop offset="0.62" stopColor="#bdae8c" /><stop offset="1" stopColor="#82765e" />
        </linearGradient>
        <radialGradient id={id("slit")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#ffe6a0" /><stop offset="1" stopColor="#c98a28" /></radialGradient>
      </defs>

      <GroundShadow origin={o} rx={48} ry={22} warm />

      {/* ===== CURTAIN-WALL STUBS (low, crenellated) — drawn behind the tower ===== */}
      {(() => {
        const Hcw = 26;
        const seg = (gxA: number, gxB: number, gy: number, lit: boolean) => {
          const a = gp(gxA, gy, 0), b = gp(gxB, gy, 0), at = gp(gxA, gy, Hcw), bt = gp(gxB, gy, Hcw);
          const merl: JSX.Element[] = [];
          for (let t = 0.05; t < 1; t += 0.3) {
            const m0 = { x: at.x + (bt.x - at.x) * t, y: at.y + (bt.y - at.y) * t };
            merl.push(<rect key={t} x={m0.x - 2} y={m0.y - 5} width={5} height={6} fill={lit ? "#a89a7c" : "#7c7058"} />);
          }
          return (
            <g>
              <polygon points={pts(a, b, bt, at)} fill={lit ? "#9c8e70" : "#73684f"} />
              <g stroke="rgba(0,0,0,.25)" strokeWidth={0.5}><line x1={at.x} y1={(at.y + a.y) / 2} x2={bt.x} y2={(bt.y + b.y) / 2} /></g>
              {merl}
            </g>
          );
        };
        return (
          <g>
            {seg(-2.2, -0.7, 0.0, false)}
            {seg(0.7, 2.2, 0.0, true)}
          </g>
        );
      })()}

      {/* ===== TOWER CYLINDER ===== */}
      <ellipse cx={o.x} cy={yOf(baseH)} rx={R} ry={R * 0.5} fill={PAL.stoneShade} />
      <path d={band(baseH, topH)} fill={`url(#${id("stone")})`} />
      {Array.from({ length: 6 }, (_, k) => baseH + 14 + k * 16).map((h, k) => (
        <path key={k} d={arc(h)} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth={0.8} />
      ))}

      {/* arched portcullis door */}
      <g data-door="entry">
        {nearDoor && <ellipse cx={o.x} cy={yOf(baseH + 12)} rx={12} ry={15} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x}px ${yOf(baseH + 12)}px` }} />}
        <path d={`M${o.x - 8},${yOf(baseH)} L${o.x - 8},${yOf(baseH + 16)} a8,8 0 0 1 16,0 L${o.x + 8},${yOf(baseH)} Z`} fill="#1a1410" />
        <path d={`M${o.x - 6},${yOf(baseH)} L${o.x - 6},${yOf(baseH + 15)} a6,6 0 0 1 12,0 L${o.x + 6},${yOf(baseH)} Z`} fill="#3a2715" />
        <g stroke="#7c858d" strokeWidth={0.6} opacity={0.7}>
          <line x1={o.x - 3} y1={yOf(baseH)} x2={o.x - 3} y2={yOf(baseH + 16)} /><line x1={o.x} y1={yOf(baseH)} x2={o.x} y2={yOf(baseH + 19)} /><line x1={o.x + 3} y1={yOf(baseH)} x2={o.x + 3} y2={yOf(baseH + 16)} />
          <line x1={o.x - 5} y1={yOf(baseH + 8)} x2={o.x + 5} y2={yOf(baseH + 8)} /><line x1={o.x - 5} y1={yOf(baseH + 13)} x2={o.x + 5} y2={yOf(baseH + 13)} />
        </g>
      </g>

      {/* arrow-slit windows (glow) */}
      {[58, 88].map((h) => (
        <g key={h}>
          <rect x={o.x - 2} y={yOf(h) - 6} width={4} height={12} fill="#1a1410" />
          <rect x={o.x - 1} y={yOf(h) - 3} width={2} height={5} fill={`url(#${id("slit")})`} style={{ animation: `flicker 4s ${h * 0.02}s ease-in-out infinite`, transformOrigin: `${o.x}px ${yOf(h)}px` }} />
        </g>
      ))}

      {/* wall torches (flicker) */}
      {[{ x: -15, h: 40 }, { x: 15, h: 40 }].map((t, i) => (
        <g key={i} transform={`translate(${o.x + t.x} ${yOf(t.h)})`}>
          <rect x={-1} y={-1} width={2} height={5} fill="#3a2715" />
          <g style={{ animation: `flicker ${1.2 + i * 0.2}s ease-in-out infinite`, transformOrigin: "0px -2px" }}>
            <path d="M-2,-2 Q0,-8 2,-2 Q0,-5 -2,-2 Z" fill="#ffb14a" />
            <path d="M-1,-2 Q0,-5 1,-2 Z" fill="#fff8c2" />
          </g>
        </g>
      ))}

      {/* ===== BATTLEMENT CROWN ===== */}
      {/* machicolation corbels */}
      {Array.from({ length: 9 }, (_, i) => -R + 3 + i * ((2 * R - 6) / 8)).map((dx, i) => (
        <path key={i} d={`M${o.x + dx},${yOf(topH)} l4,0 l-1,4 l-2,0 Z`} fill={PAL.stoneShade} />
      ))}
      {/* parapet ring */}
      <path d={band(topH, topH + 8, R + 3)} fill="#9c8e70" />
      <ellipse cx={o.x} cy={yOf(topH + 8)} rx={R + 3} ry={(R + 3) * 0.5} fill="#5a513c" />
      <ellipse cx={o.x} cy={yOf(topH + 8)} rx={R - 2} ry={(R - 2) * 0.5} fill="#3a3327" />
      {/* merlons around the front arc */}
      {Array.from({ length: 7 }, (_, i) => -0.82 + i * 0.27).map((u, i) => {
        const mx = o.x + Math.sin(u * Math.PI) * (R + 1);
        const my = yOf(topH + 8) + Math.cos(u * Math.PI) * 0 + ((R + 3) * 0.5) * Math.cos((u + 0.5) * Math.PI) * 0; // along front arc
        const ey = yOf(topH + 8) + Math.sqrt(Math.max(0, 1 - (Math.sin(u * Math.PI)) ** 2)) * ((R + 3) * 0.5);
        void my;
        return <rect key={i} x={mx - 2.4} y={ey - 8} width={4.8} height={8} fill={i % 2 ? "#b0a17f" : "#9c8e70"} />;
      })}

      {/* ===== PATROLLING GUARD on the parapet (walk) ===== */}
      <g style={{ animation: "walk 8s ease-in-out infinite alternate", transformOrigin: `${o.x}px ${yOf(topH + 8)}px`, ["--end" as string]: "22px" } as React.CSSProperties}>
        <g transform={`translate(${o.x - 11} ${yOf(topH + 8)})`}>
          <line x1={2} y1={-13} x2={2} y2={1} stroke="#3a2715" strokeWidth={1} />
          <path d="M1,-14 L3,-14 L2,-16 Z" fill="#9aa1a8" />
          <rect x={-1.6} y={-9} width={3.6} height={7} fill="#3a3530" />
          <circle cx={0.4} cy={-10} r={1.5} fill="#9aa1a8" />
          <rect x={-1.4} y={-2} width={1.5} height={3} fill="#3a2715" /><rect x={0.7} y={-2} width={1.5} height={3} fill="#3a2715" />
        </g>
      </g>

      {/* lookout brazier (flicker + embers) on the parapet */}
      <g transform={`translate(${o.x + 16} ${yOf(topH + 8)})`}>
        <rect x={-3} y={-4} width={6} height={5} fill="#3a3530" />
        <g style={{ animation: "flicker 1.4s ease-in-out infinite", transformOrigin: "0px -4px" }}>
          <path d="M-3,-4 Q0,-11 3,-4 Z" fill="#ffb14a" /><path d="M-1.5,-4 Q0,-8 1.5,-4 Z" fill="#fff8c2" />
        </g>
        {[0, 1].map((d, i) => (
          <circle key={i} cx={0} cy={-5} r={0.6} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 4 : -4}px`, animation: `ember 2.4s ${d}s ease-out infinite`, transformOrigin: "0px -5px" } as React.CSSProperties} />
        ))}
      </g>

      {/* ===== FLAG on pole (sway) ===== */}
      <line x1={o.x - 14} y1={yOf(topH + 6)} x2={o.x - 14} y2={yOf(topH + 40)} stroke="#3a2715" strokeWidth={1.2} />
      <circle cx={o.x - 14} cy={yOf(topH + 40)} r={1.2} fill={PAL.brass} />
      <g style={{ animation: "sway 2.4s ease-in-out infinite", transformOrigin: `${o.x - 14}px ${yOf(topH + 38)}px` }}>
        <path d={`M${o.x - 14},${yOf(topH + 38)} L${o.x - 1},${yOf(topH + 36)} L${o.x - 3},${yOf(topH + 33)} L${o.x - 1},${yOf(topH + 30)} L${o.x - 14},${yOf(topH + 28)} Z`} fill="#7a1d12" />
        <path d={`M${o.x - 11},${yOf(topH + 36)} L${o.x - 6},${yOf(topH + 35)} L${o.x - 6},${yOf(topH + 30)} L${o.x - 11},${yOf(topH + 31)} Z`} fill="#fbf7eb" opacity={0.4} />
      </g>
    </g>
  );
}
