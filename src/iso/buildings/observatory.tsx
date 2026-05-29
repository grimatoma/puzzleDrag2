// observatory — domed stargazing hall (LARGE plot, landmark).
// A coursed stone DRUM (cylinder) carrying a metal hemispherical DOME with a
// dark observation SLIT, a tilted brass TELESCOPE poking out (slow scan via
// sway), arched lit windows + a door bearing a moon glyph. Above it the night
// sky TWINKLES (stars pulse, a shooting star streaks) and a little ringed planet
// drifts. An astronomer and a scroll sit at the base.

import { useId } from "react";
import { type P, makeGp, GroundShadow } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Stone drum + metal slit-dome + tilted telescope (scan/sway), arched lit windows + moon-glyph door, twinkling stars + shooting star + ringed planet, astronomer + scroll.",
};

export default function IsoObservatory({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  const R = 30, drumB = 10, drumT = 58, domeT = 96;
  const arc = (h: number, r = R) => `M${o.x - r},${yOf(h)} Q${o.x},${yOf(h) + r * 0.5 * 1.2} ${o.x + r},${yOf(h)}`;
  const band = (hB: number, hT: number, r = R) => `M${o.x - r},${yOf(hB)} Q${o.x},${yOf(hB) + r * 0.5 * 1.2} ${o.x + r},${yOf(hB)} L${o.x + r},${yOf(hT)} Q${o.x},${yOf(hT) + r * 0.5 * 1.2} ${o.x - r},${yOf(hT)} Z`;

  return (
    <g>
      <defs>
        <linearGradient id={id("stone")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a7c5a" /><stop offset="0.45" stopColor="#cfc6b2" /><stop offset="0.62" stopColor="#e0d8c2" /><stop offset="1" stopColor="#94865f" />
        </linearGradient>
        <linearGradient id={id("dome")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b636b" /><stop offset="0.5" stopColor="#9aa3aa" /><stop offset="0.7" stopColor="#b4bcc2" /><stop offset="1" stopColor="#6a727a" />
        </linearGradient>
        <radialGradient id={id("win")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff8c2" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      {/* ===== NIGHT SKY above (stars twinkle, shooting star, ringed planet) ===== */}
      {[[-34, 118], [-20, 138], [-6, 126], [10, 144], [24, 124], [34, 136], [-14, 152], [16, 150]].map(([sx, sy], i) => (
        <circle key={i} cx={o.x + sx} cy={yOf(sy)} r={0.9} fill="#fff8c2" style={{ animation: `pulse2 ${2 + i * 0.2}s ${i * 0.3}s ease-in-out infinite`, transformOrigin: `${o.x + sx}px ${yOf(sy)}px` }} />
      ))}
      <g transform={`translate(${o.x - 30} ${yOf(146)})`}>
        <g style={{ animation: "walk 6s linear infinite", transformOrigin: "0 0", ["--end" as string]: "64px" } as React.CSSProperties}>
          <line x1={0} y1={0} x2={7} y2={2} stroke="#fff8c2" strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
          <circle cx={7} cy={2} r={0.7} fill="#fff8c2" />
        </g>
      </g>
      <g transform={`translate(${o.x + 28} ${yOf(128)})`}>
        <g style={{ animation: "sway 8s ease-in-out infinite", transformOrigin: "0 0" }}>
          <circle r={2.6} fill="#e0a83a" />
          <ellipse rx={4.4} ry={1} fill="none" stroke="#fbf7eb" strokeWidth={0.5} opacity={0.7} transform="rotate(-15)" />
        </g>
      </g>

      <GroundShadow origin={o} rx={50} ry={23} />

      {/* ===== STONE DRUM ===== */}
      <ellipse cx={o.x} cy={yOf(drumB)} rx={R} ry={R * 0.5} fill={PAL.stoneShade} />
      <path d={band(drumB, drumT)} fill={`url(#${id("stone")})`} />
      {[26, 40, 52].map((h, k) => <path key={k} d={arc(h)} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth={0.8} />)}

      {/* door with moon glyph */}
      <g data-door="entry">
        {nearDoor && <ellipse cx={o.x} cy={yOf(drumB + 12)} rx={12} ry={15} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x}px ${yOf(drumB + 12)}px` }} />}
        <path d={`M${o.x - 8},${yOf(drumB)} L${o.x - 8},${yOf(drumB + 17)} a8,8 0 0 1 16,0 L${o.x + 8},${yOf(drumB)} Z`} fill={PAL.timber} />
        <path d={`M${o.x - 6},${yOf(drumB)} L${o.x - 6},${yOf(drumB + 16)} a6,6 0 0 1 12,0 L${o.x + 6},${yOf(drumB)} Z`} fill={PAL.timberSoft} />
        <circle cx={o.x} cy={yOf(drumB + 14)} r={2.4} fill="#1a1410" />
        <path d={`M${o.x},${yOf(drumB + 16.4)} a2.4,2.4 0 0 0 0,4.8 Z`} fill="#fff8c2" />
      </g>
      {/* arched lit windows */}
      {[-17, 17].map((dx, i) => (
        <g key={i}>
          <path d={`M${o.x + dx - 3},${yOf(drumB + 16)} L${o.x + dx - 3},${yOf(drumB + 24)} a3,3 0 0 1 6,0 L${o.x + dx + 3},${yOf(drumB + 16)} Z`} fill="#2c2012" />
          <path d={`M${o.x + dx - 2},${yOf(drumB + 16)} L${o.x + dx - 2},${yOf(drumB + 24)} a2,2 0 0 1 4,0 L${o.x + dx + 2},${yOf(drumB + 16)} Z`} fill={`url(#${id("win")})`} style={{ animation: `flicker ${3 + i}s ease-in-out infinite`, transformOrigin: `${o.x + dx}px ${yOf(drumB + 20)}px` }} />
        </g>
      ))}
      {/* dome ring */}
      <path d={band(drumT, drumT + 5)} fill="#5b5346" />
      <ellipse cx={o.x} cy={yOf(drumT + 5)} rx={R} ry={R * 0.5} fill="#3a3530" />

      {/* ===== METAL DOME with slit ===== */}
      {(() => {
        const ry0 = R * 0.5;
        const dome = `M${o.x - R},${yOf(drumT + 5)} Q${o.x - R},${yOf(domeT)} ${o.x},${yOf(domeT + 2)} Q${o.x + R},${yOf(domeT)} ${o.x + R},${yOf(drumT + 5)} Q${o.x},${yOf(drumT + 5) + ry0 * 1.15} ${o.x - R},${yOf(drumT + 5)} Z`;
        return (
          <g>
            <path d={dome} fill={`url(#${id("dome")})`} />
            {/* shade left */}
            <path d={`M${o.x - R},${yOf(drumT + 5)} Q${o.x - R},${yOf(domeT)} ${o.x},${yOf(domeT + 2)} L${o.x},${yOf(drumT + 5) + ry0} Q${o.x - R + 4},${yOf(drumT + 5) + 2} ${o.x - R},${yOf(drumT + 5)} Z`} fill="rgba(0,0,0,.2)" />
            {/* seams */}
            {[-0.6, 0.6].map((s) => <path key={s} d={`M${o.x + s * R},${yOf(drumT + 5)} Q${o.x + s * R * 0.5},${yOf(domeT - 4)} ${o.x},${yOf(domeT)}`} fill="none" stroke="rgba(0,0,0,.2)" strokeWidth={0.7} />)}
            {/* observation slit (dark), tilted up-right */}
            <path d={`M${o.x - 4},${yOf(drumT + 6)} L${o.x + 2},${yOf(drumT + 6)} L${o.x + 9},${yOf(domeT - 1)} L${o.x + 3},${yOf(domeT)} Z`} fill="#12100c" />
          </g>
        );
      })()}

      {/* ===== TELESCOPE poking out of the slit (slow scan) ===== */}
      <g transform={`translate(${o.x + 4} ${yOf(domeT - 8)})`}>
        <g style={{ animation: "sway 9s ease-in-out infinite", transformOrigin: "0px 6px" }}>
        <g transform="rotate(-30)">
          <rect x={-3} y={-26} width={6} height={28} rx={1.4} fill="#3a3530" />
          <rect x={-3} y={-26} width={2} height={28} fill="#1a1410" />
          <rect x={-3.6} y={-20} width={7.2} height={1.4} fill="#7c858d" /><rect x={-3.6} y={-10} width={7.2} height={1.4} fill="#7c858d" />
          <ellipse cx={0} cy={-26} rx={3} ry={1} fill="#aed3e8" stroke="#fbf7eb" strokeWidth={0.3} />
          <line x1={-3} y1={-12} x2={-7} y2={-9} stroke="#3a3530" strokeWidth={1.6} />
          <circle cx={-8} cy={-8} r={2} fill="#3a3530" />
        </g>
        </g>
      </g>

      {/* ===== ASTRONOMER + scroll at the base ===== */}
      {(() => {
        const a = gp(-1.3, 0.5, 0), s = gp(1.3, 0.55, 0);
        return (
          <g>
            <g transform={`translate(${a.x} ${a.y})`}>
              <ellipse cx={0} cy={1} rx={3} ry={0.8} fill="rgba(0,0,0,.3)" />
              <path d="M-3,0 L-3.6,-9 L3.6,-9 L3,0 Z" fill="#4a3578" />
              <circle cx={0} cy={-11} r={2.4} fill="#e8c39a" />
              <path d="M-3,-12 L0,-18 L3,-12 Z" fill="#4a3578" />
              <circle cx={0} cy={-18} r={0.8} fill="#fff8c2" style={{ animation: "pulse2 2s ease-in-out infinite", transformOrigin: `0px -18px` }} />
            </g>
            <g transform={`translate(${s.x} ${s.y})`}>
              <ellipse cx={0} cy={1} rx={7} ry={1} fill="rgba(0,0,0,.3)" />
              <rect x={-6} y={-4} width={12} height={3} rx={0.5} fill="#7a5c34" />
              <rect x={-5} y={-6} width={10} height={2.4} fill="#fbf7eb" />
              <circle cx={-5} cy={-4.8} r={1.1} fill="#fbf7eb" stroke="#7a5c34" strokeWidth={0.4} /><circle cx={5} cy={-4.8} r={1.1} fill="#fbf7eb" stroke="#7a5c34" strokeWidth={0.4} />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
