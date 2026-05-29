// granary — round stone grain tower (NORMAL plot).
// A fat stone-banded CYLINDER (curved-band + roundness gradient) capped by a
// tiled CONICAL terracotta roof + finial, with an arched door, grain dust
// sifting down off the eave (grainfall) and plump grain sacks stacked at the
// base.

import { useId } from "react";
import { type P, makeGp, GroundShadow, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Round stone-banded granary cylinder + conical terracotta roof + finial; arched door, sifting grain dust (grainfall), stacked grain sacks.",
};

export default function IsoGranary({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  const baseH = 8, topH = 96;
  const rOf = (h: number) => 34 + (h - baseH) * ((27 - 34) / (topH - baseH)); // gentle taper 34→27
  const arc = (h: number, r = rOf(h)) => `M${o.x - r},${yOf(h)} Q${o.x},${yOf(h) + r * 0.5 * 1.15} ${o.x + r},${yOf(h)}`;
  const band = (hB: number, hT: number) => { const rB = rOf(hB), rT = rOf(hT); return `M${o.x - rB},${yOf(hB)} Q${o.x},${yOf(hB) + rB * 0.5 * 1.15} ${o.x + rB},${yOf(hB)} L${o.x + rT},${yOf(hT)} Q${o.x},${yOf(hT) + rT * 0.5 * 1.15} ${o.x - rT},${yOf(hT)} Z`; };

  return (
    <g>
      <defs>
        <linearGradient id={id("stone")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8e8266" /><stop offset="0.45" stopColor="#cabfa0" /><stop offset="0.62" stopColor="#ddd2b2" /><stop offset="1" stopColor="#98896a" /></linearGradient>
        <linearGradient id={id("capLit")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a3f24" /><stop offset="0.55" stopColor="#c0623f" /><stop offset="1" stopColor="#9a4a2c" /></linearGradient>
      </defs>

      <GroundShadow origin={o} rx={44} ry={20} />

      {/* stone base ring + banded cylinder */}
      {(() => { const rB = rOf(0); return <path d={`M${o.x - rB},${yOf(0)} Q${o.x},${yOf(0) + rB * 0.5 * 1.15} ${o.x + rB},${yOf(0)} L${o.x + rOf(baseH)},${yOf(baseH)} Q${o.x},${yOf(baseH) + rOf(baseH) * 0.5 * 1.15} ${o.x - rOf(baseH)},${yOf(baseH)} Z`} fill={PAL.stoneShade} />; })()}
      <path d={band(baseH, topH)} fill={`url(#${id("stone")})`} />
      {/* stone banding (curved courses) */}
      {Array.from({ length: 7 }, (_, k) => baseH + 8 + k * ((topH - baseH - 10) / 7)).map((h, k) => (
        <g key={k}>
          <path d={arc(h)} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={1.4} />
          <path d={arc(h - 1.5)} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={0.7} />
        </g>
      ))}

      {/* arched door */}
      {(() => { const dh = 32; return (
        <g data-door="entry">
          {nearDoor && <ellipse cx={o.x} cy={yOf(baseH + dh / 2)} rx={13} ry={dh / 2 + 3} fill="#ff8a28" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x}px ${yOf(baseH + dh / 2)}px` }} />}
          <path d={`M${o.x - 11},${yOf(baseH)} L${o.x - 11},${yOf(baseH + dh - 11)} a11,11 0 0 1 22,0 L${o.x + 11},${yOf(baseH)} Z`} fill={PAL.timberSoft} />
          <path d={`M${o.x - 8},${yOf(baseH)} L${o.x - 8},${yOf(baseH + dh - 11)} a8,8 0 0 1 16,0 L${o.x + 8},${yOf(baseH)} Z`} fill="#2a1a0a" />
          <ellipse cx={o.x} cy={yOf(baseH + dh - 11)} rx={3.5} ry={2} fill={PAL.stone} />
          <circle cx={o.x + 6} cy={yOf(baseH + 13)} r={1.4} fill={PAL.brass} />
        </g>
      ); })()}
      {/* a couple of small vents up the tower */}
      {[46, 70].map((h) => <g key={h}><rect x={o.x - 3} y={yOf(h) - 4} width={6} height={8} fill="#2a1a0a" /><rect x={o.x - 1.5} y={yOf(h) - 2.5} width={3} height={5} fill="#3a2715" /></g>)}

      {/* ===== CONICAL TERRACOTTA ROOF ===== */}
      {(() => {
        const capR = rOf(topH) + 3, apexH = topH + 36;
        const bl = { x: o.x - capR, y: yOf(topH) }, br = { x: o.x + capR, y: yOf(topH) }, apex = { x: o.x, y: yOf(apexH) };
        return (
          <g>
            <ellipse cx={o.x} cy={yOf(topH)} rx={capR} ry={capR * 0.5} fill="#3a160a" />
            <path d={`M${bl.x},${bl.y} Q${o.x},${bl.y + capR * 0.5 * 1.1} ${br.x},${br.y} L${apex.x},${apex.y} Z`} fill={`url(#${id("capLit")})`} />
            <path d={`M${bl.x},${bl.y} Q${o.x},${bl.y + capR * 0.5 * 1.1} ${o.x},${bl.y + capR * 0.55} L${apex.x},${apex.y} Z`} fill="rgba(0,0,0,.26)" />
            {[0.3, 0.55, 0.78].map((t) => { const rr = capR * (1 - t), yy = lerp({ x: 0, y: yOf(topH) }, { x: 0, y: apex.y }, t).y; return <path key={t} d={`M${o.x - rr},${yy} Q${o.x},${yy + rr * 0.5 * 1.05} ${o.x + rr},${yy}`} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth={0.8} />; })}
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={apex.y - 7} stroke="#3a3530" strokeWidth={1.4} />
            <ellipse cx={apex.x} cy={apex.y - 8} rx={2.4} ry={1.6} fill="#bda268" />
          </g>
        );
      })()}

      {/* grain dust sifting down off the eave */}
      {[{ x: -10, d: 2.6, l: 0 }, { x: 2, d: 3.1, l: 0.5 }, { x: 12, d: 2.4, l: 1.1 }, { x: -3, d: 3.6, l: 1.8 }, { x: -16, d: 3.3, l: 0.3 }].map((m, i) => (
        <circle key={i} cx={o.x + m.x} cy={yOf(topH - 4)} r={i % 3 === 0 ? 1.2 : 0.8} fill="#e8d090" style={{ animation: `grainfall ${m.d}s ${m.l}s ease-in infinite`, transformOrigin: `${o.x + m.x}px ${yOf(topH - 4)}px`, opacity: 0.75 }} />
      ))}

      {/* grain sacks at the base */}
      {(() => { const r = gp(1.5, 0.55, 0), l = gp(-1.5, 0.5, 0); return (
        <g>
          <g transform={`translate(${r.x} ${r.y})`}>
            <ellipse cx={4} cy={1} rx={11} ry={2} fill="rgba(0,0,0,.25)" />
            <ellipse cx={0} cy={-5} rx={9} ry={5.5} fill="#c8a050" /><ellipse cx={0} cy={-5} rx={7} ry={4} fill="#d8b060" />
            <ellipse cx={3} cy={-12} rx={7} ry={4.5} fill="#b89040" /><ellipse cx={3} cy={-12} rx={5.5} ry={3.2} fill="#c8a050" /><ellipse cx={3} cy={-16} rx={2.4} ry={1.2} fill="#9a7030" />
          </g>
          <g transform={`translate(${l.x} ${l.y})`}>
            <ellipse cx={0} cy={1} rx={8} ry={1.6} fill="rgba(0,0,0,.22)" />
            <ellipse cx={0} cy={-4} rx={7} ry={4.5} fill="#b89040" /><ellipse cx={0} cy={-4} rx={5.5} ry={3.2} fill="#c8a050" /><ellipse cx={0} cy={-8} rx={2} ry={1} fill="#9a7030" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
