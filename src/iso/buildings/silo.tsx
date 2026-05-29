// silo — a metal grain silo (SMALL plot, tall cylinder).
// A straight corrugated-metal CYLINDER (curved-band + roundness-gradient
// technique) capped by a hemispherical DOME with a vent, a painted "GRAIN"
// band, a front ladder, inspection portholes, and a base hatch + chute where
// grain falls (grainfall) onto a little pile. Tied sacks beside it.

import { useId } from "react";
import { type P, makeGp, GroundShadow } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Corrugated metal silo cylinder + dome + vent; GRAIN band, ladder, portholes, base hatch + chute with grainfall onto a grain pile, sacks.",
};

export default function IsoSilo({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  const R = 27;
  const baseH = 8, topH = 150;
  const arc = (h: number) => `M${o.x - R},${yOf(h)} Q${o.x},${yOf(h) + R * 0.5 * 1.2} ${o.x + R},${yOf(h)}`;
  const band = (hB: number, hT: number) => `M${o.x - R},${yOf(hB)} Q${o.x},${yOf(hB) + R * 0.5 * 1.2} ${o.x + R},${yOf(hB)} L${o.x + R},${yOf(hT)} Q${o.x},${yOf(hT) + R * 0.5 * 1.2} ${o.x - R},${yOf(hT)} Z`;

  return (
    <g>
      <defs>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9aa1a8" /><stop offset="0.42" stopColor="#dde2e7" /><stop offset="0.6" stopColor="#f4f6f8" /><stop offset="1" stopColor="#a8a399" />
        </linearGradient>
        <linearGradient id={id("dome")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a626a" /><stop offset="0.55" stopColor="#8a949c" /><stop offset="1" stopColor="#646b72" />
        </linearGradient>
        <radialGradient id={id("port")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      <GroundShadow origin={o} rx={36} ry={17} />

      {/* concrete footing */}
      <path d={band(0, baseH)} fill="#9a948a" />
      <ellipse cx={o.x} cy={yOf(baseH)} rx={R} ry={R * 0.5} fill="#cfd3d8" />

      {/* metal cylinder body */}
      <path d={band(baseH, topH)} fill={`url(#${id("metal")})`} />
      {/* corrugation rings */}
      {Array.from({ length: 18 }, (_, k) => baseH + 4 + k * ((topH - baseH - 6) / 18)).map((h, k) => (
        <path key={k} d={arc(h)} fill="none" stroke="rgba(0,0,0,.13)" strokeWidth={0.8} />
      ))}

      {/* GRAIN band */}
      <path d={band(86, 100)} fill="#c44a2c" />
      <path d={arc(100)} fill="none" stroke="#7a1d12" strokeWidth={1} />
      <path d={arc(86)} fill="none" stroke="#7a1d12" strokeWidth={1} />
      <text x={o.x} y={yOf(91)} textAnchor="middle" fontFamily="Georgia, serif" fontSize={6} fontWeight={800} fill="#fbf7eb" letterSpacing={0.6}>GRAIN</text>

      {/* inspection portholes (front-left) */}
      {[64, 116].map((h) => (
        <g key={h}>
          <circle cx={o.x - 11} cy={yOf(h)} r={2.8} fill="#3a2715" />
          <circle cx={o.x - 11} cy={yOf(h)} r={2} fill={`url(#${id("port")})`} style={{ animation: `flicker ${3 + h * 0.01}s ease-in-out infinite`, transformOrigin: `${o.x - 11}px ${yOf(h)}px` }} />
        </g>
      ))}

      {/* ladder (front-right) */}
      <g stroke="#5a626a" strokeWidth={1.4} fill="none">
        <line x1={o.x + 12} y1={yOf(topH - 6)} x2={o.x + 12} y2={yOf(baseH)} />
        <line x1={o.x + 16} y1={yOf(topH - 6)} x2={o.x + 16} y2={yOf(baseH)} />
        {Array.from({ length: 16 }, (_, i) => yOf(baseH + 6 + i * 8)).map((y, i) => (
          <line key={i} x1={o.x + 12} y1={y} x2={o.x + 16} y2={y} strokeWidth={1} />
        ))}
      </g>

      {/* DOME cap + vent */}
      <ellipse cx={o.x} cy={yOf(topH)} rx={R} ry={R * 0.5} fill="#3a3d44" />
      <path d={`M${o.x - R},${yOf(topH)} Q${o.x - R},${yOf(topH + 22)} ${o.x},${yOf(topH + 24)} Q${o.x + R},${yOf(topH + 22)} ${o.x + R},${yOf(topH)} Q${o.x},${yOf(topH) + R * 0.5 * 1.2} ${o.x - R},${yOf(topH)} Z`} fill={`url(#${id("dome")})`} />
      <path d={`M${o.x - R},${yOf(topH)} Q${o.x - R},${yOf(topH + 22)} ${o.x},${yOf(topH + 24)} L${o.x},${yOf(topH) + 4} Q${o.x - R + 4},${yOf(topH) + 2} ${o.x - R},${yOf(topH)} Z`} fill="rgba(0,0,0,.22)" />
      {/* vent cap */}
      <rect x={o.x - 4} y={yOf(topH + 30)} width={8} height={7} rx={1} fill="#3a3d44" />
      <ellipse cx={o.x} cy={yOf(topH + 30)} rx={5} ry={1.6} fill="#5a626a" />

      {/* base hatch */}
      <g data-door="entry">
        {nearDoor && <ellipse cx={o.x + 2} cy={yOf(baseH + 9)} rx={11} ry={12} fill="#ff8a28" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x + 2}px ${yOf(baseH + 9)}px` }} />}
        <rect x={o.x - 6} y={yOf(baseH + 18)} width={15} height={16} rx={1} fill="#3a3530" />
        <rect x={o.x - 5} y={yOf(baseH + 16)} width={13} height={12} fill="#5a3a1f" />
        <circle cx={o.x + 5} cy={yOf(baseH + 8)} r={1.1} fill="#e0a83a" />
      </g>

      {/* chute + grainfall + pile */}
      {(() => {
        const cx = o.x + 16, cy = yOf(baseH + 18);
        return (
          <g>
            <path d={`M${cx - 6},${cy} L${cx + 4},${cy + 5} L${cx + 4},${cy + 8} L${cx - 6},${cy + 3} Z`} fill="#7c858d" />
            {[0, 0.3, 0.6, 0.9].map((d, i) => (
              <circle key={i} cx={cx + 2 + (i % 2 ? 1 : -1)} cy={cy + 8} r={0.9} fill="#dab078" style={{ animation: `grainfall 1.4s ${d}s linear infinite`, transformOrigin: `${cx + 2}px ${cy + 8}px` }} />
            ))}
            <ellipse cx={cx + 3} cy={cy + 22} rx={10} ry={2.4} fill="rgba(0,0,0,.25)" />
            <path d={`M${cx - 5},${cy + 21} Q${cx + 3},${cy + 13} ${cx + 11},${cy + 21} Z`} fill="#dab078" />
            <path d={`M${cx - 2},${cy + 21} Q${cx + 3},${cy + 16} ${cx + 8},${cy + 21} Z`} fill="#e8c39a" />
          </g>
        );
      })()}

      {/* tied sacks (front-left) */}
      {[{ x: -1.15, s: 1 }, { x: -1.55, s: 0.82 }].map((m, i) => {
        const b = gp(m.x, 0.55, 0);
        return (
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${m.s})`}>
            <ellipse cx={0} cy={1} rx={7} ry={1.6} fill="rgba(0,0,0,.3)" />
            <path d="M-6,0 L-7,-8 Q-5,-12 0,-12 Q5,-12 7,-8 L6,0 Z" fill="#e6d29a" stroke="#a99262" strokeWidth={0.7} />
            <path d="M-3,-12 q3,-2 6,0" stroke="#a99262" strokeWidth={0.8} fill="none" />
          </g>
        );
      })}
    </g>
  );
}
