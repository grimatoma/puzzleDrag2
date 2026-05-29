// mill — a tower windmill (LARGE plot, landmark).
// Reimagined for iso: a tapered stone CYLINDER (same curved-band + roundness-
// gradient technique as the lighthouse) capped by a tiled CONICAL roof with a
// finial, a railed balcony ring, an arched door and lit windows. The hero is the
// four big lattice SAILS turning on a front axle (windmill), with flour-dust
// drifting off the cap (pollen) and tied flour sacks at the base.

import { useId } from "react";
import { type P, makeGp, GroundShadow, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Tower windmill: tapered stone cylinder + conical cap + balcony, four turning lattice sails (hero), flour-dust pollen, flour sacks. Cylinder via curved bands + roundness gradient.",
};

export default function IsoMill({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h;
  const baseH = 12, balH = 152, capH = 214;
  const rOf = (h: number) => 33 + (h - baseH) * ((22 - 33) / (balH - baseH)); // taper 33→22

  const band = (hBot: number, hTop: number, fill: string, key: string): JSX.Element => {
    const rB = rOf(hBot), rT = rOf(hTop), yB = yOf(hBot), yT = yOf(hTop);
    const d = `M${o.x - rB},${yB} Q${o.x},${yB + rB * 0.5 * 1.25} ${o.x + rB},${yB} L${o.x + rT},${yT} Q${o.x},${yT + rT * 0.5 * 1.25} ${o.x - rT},${yT} Z`;
    return <path key={key} d={d} fill={fill} />;
  };

  const sailCx = o.x, sailCy = yOf(180); // axle on the front of the cap

  return (
    <g>
      <defs>
        <linearGradient id={id("stoneCyl")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c855e" /><stop offset="0.45" stopColor="#e0c896" /><stop offset="0.62" stopColor="#f0dcae" /><stop offset="1" stopColor="#a8916a" />
        </linearGradient>
        <linearGradient id={id("capLit")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e3620" /><stop offset="0.55" stopColor="#8a5230" /><stop offset="1" stopColor="#6a3f24" />
        </linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <GroundShadow origin={o} rx={48} ry={22} warm />

      {/* ===== STONE TOWER (tapered cylinder) ===== */}
      {/* stone base ring */}
      {band(0, baseH, PAL.stoneShade, "base")}
      {band(baseH, balH, `url(#${id("stoneCyl")})`, "body")}
      {/* curved stone course lines */}
      {Array.from({ length: 5 }, (_, k) => baseH + (k + 1) * ((balH - baseH) / 6)).map((h, k) => (
        <path key={k} d={`M${o.x - rOf(h)},${yOf(h)} Q${o.x},${yOf(h) + rOf(h) * 0.5 * 1.1} ${o.x + rOf(h)},${yOf(h)}`} fill="none" stroke="rgba(0,0,0,.16)" strokeWidth={0.8} />
      ))}

      {/* arched door (front) */}
      {(() => { const dh = 34; return (
        <g data-door="entry">
          {nearDoor && <ellipse cx={o.x} cy={yOf(baseH + dh / 2)} rx={13} ry={dh / 2 + 3} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x}px ${yOf(baseH + dh / 2)}px` }} />}
          <path d={`M${o.x - 9},${yOf(baseH)} L${o.x - 9},${yOf(baseH + dh - 9)} a9,9 0 0 1 18,0 L${o.x + 9},${yOf(baseH)} Z`} fill="#5a3a1f" />
          <path d={`M${o.x - 6},${yOf(baseH)} L${o.x - 6},${yOf(baseH + dh - 9)} a6,6 0 0 1 12,0 L${o.x + 6},${yOf(baseH)} Z`} fill="#3a2010" />
          <circle cx={o.x + 4} cy={yOf(baseH + 16)} r={1.4} fill={PAL.brass} />
        </g>
      ); })()}
      {/* lit windows up the front */}
      {[78, 118].map((h) => (
        <g key={h}>
          <rect x={o.x - 6} y={yOf(h) - 7} width={12} height={13} rx={1} fill="#3a2715" />
          <rect x={o.x - 4.5} y={yOf(h) - 5.5} width={9} height={10} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${3 + h * 0.01}s ease-in-out infinite`, transformOrigin: `${o.x}px ${yOf(h)}px` }} />
          <line x1={o.x} y1={yOf(h) - 5.5} x2={o.x} y2={yOf(h) + 4.5} stroke="#3a2715" strokeWidth={0.8} />
        </g>
      ))}

      {/* ===== BALCONY ring ===== */}
      <ellipse cx={o.x} cy={yOf(balH)} rx={rOf(balH) + 6} ry={(rOf(balH) + 6) * 0.5} fill="#5a3a1f" />
      <ellipse cx={o.x} cy={yOf(balH) - 1.5} rx={rOf(balH) + 5} ry={(rOf(balH) + 5) * 0.5} fill="#7a5c34" />
      {Array.from({ length: 11 }, (_, k) => k).map((k) => {
        const a = (k / 11) * Math.PI * 2, rr = rOf(balH) + 5;
        return <line key={k} x1={o.x + rr * Math.cos(a)} y1={yOf(balH) + rr * 0.5 * Math.sin(a)} x2={o.x + rr * Math.cos(a)} y2={yOf(balH) + rr * 0.5 * Math.sin(a) - 6} stroke="#3a2715" strokeWidth={0.9} />;
      })}
      <ellipse cx={o.x} cy={yOf(balH + 6)} rx={rOf(balH) + 5} ry={(rOf(balH) + 5) * 0.5} fill="none" stroke="#3a2715" strokeWidth={0.9} />

      {/* ===== CONICAL CAP ===== */}
      {(() => {
        const capR = rOf(balH) + 2;
        const apex = { x: o.x, y: yOf(capH) };
        const bl = { x: o.x - capR, y: yOf(balH + 4) }, br = { x: o.x + capR, y: yOf(balH + 4) };
        return (
          <g>
            {/* eave ring */}
            <ellipse cx={o.x} cy={yOf(balH + 4)} rx={capR} ry={capR * 0.5} fill="#3a160a" />
            {/* cone front (lit) */}
            <path d={`M${bl.x},${bl.y} Q${o.x},${bl.y + capR * 0.5 * 1.1} ${br.x},${br.y} L${apex.x},${apex.y} Z`} fill={`url(#${id("capLit")})`} />
            {/* shade left half */}
            <path d={`M${bl.x},${bl.y} Q${o.x},${bl.y + capR * 0.5 * 1.1} ${o.x},${bl.y + capR * 0.55} L${apex.x},${apex.y} Z`} fill="rgba(0,0,0,.28)" />
            {/* tile course arcs */}
            {[0.28, 0.52, 0.74].map((t) => {
              const rr = capR * (1 - t), yy = lerp({ x: 0, y: yOf(balH + 4) }, { x: 0, y: apex.y }, t).y;
              return <path key={t} d={`M${o.x - rr},${yy} Q${o.x},${yy + rr * 0.5 * 1.05} ${o.x + rr},${yy}`} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth={0.8} />;
            })}
            {/* finial */}
            <line x1={apex.x} y1={apex.y} x2={apex.x} y2={apex.y - 9} stroke="#3a3530" strokeWidth={1.4} />
            <circle cx={apex.x} cy={apex.y - 10} r={2} fill="#bda268" />
          </g>
        );
      })()}

      {/* ===== FLOUR-DUST drifting off the cap (pollen) ===== */}
      {[0, 0.6, 1.2, 1.8].map((d, i) => (
        <circle key={i} cx={o.x - 12 + i * 8} cy={yOf(balH + 18)} r={1} fill="#fbf7eb" style={{ "--px": `${i % 2 ? 20 : -20}px`, animation: `pollen ${5 + i}s ${d}s ease-in-out infinite`, transformOrigin: `${o.x - 12 + i * 8}px ${yOf(balH + 18)}px`, opacity: 0.7 } as React.CSSProperties} />
      ))}

      {/* ===== SAILS (hero) — four lattice sails turning on the front axle ===== */}
      <g transform={`translate(${sailCx} ${sailCy})`}>
        <g style={{ animation: "windmill 14s linear infinite", transformOrigin: "0 0" }}>
          {[0, 90, 180, 270].map((deg) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <rect x={-1.5} y={0} width={3} height={52} fill="#3a2715" />
              <path d="M-11,6 L-11,48 L0,46 L0,6 Z" fill="#f0e6cc" stroke="#3a2715" strokeWidth={1} />
              <g stroke="#b6a070" strokeWidth={0.7}>
                <line x1={-6} y1={6} x2={-6} y2={48} />
                <line x1={-11} y1={20} x2={0} y2={20} /><line x1={-11} y1={34} x2={0} y2={34} />
              </g>
            </g>
          ))}
        </g>
        {/* hub */}
        <circle cx={0} cy={0} r={4} fill="#3a2715" />
        <circle cx={0} cy={0} r={1.8} fill="#bda268" />
      </g>

      {/* ===== FLOUR SACKS at the base ===== */}
      {[{ x: -1.05, s: 1 }, { x: 0.95, s: 0.85 }].map((m, i) => {
        const b = gp(m.x, 0.7, 0);
        return (
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${m.s})`}>
            <ellipse cx={0} cy={1} rx={8} ry={2} fill="rgba(0,0,0,.3)" />
            <path d="M-7,0 L-8,-11 Q-7,-14 -4,-14 L-2,-14 L-1,-16 L1,-16 L2,-14 L4,-14 Q7,-14 8,-11 L7,0 Z" fill="#fbf7eb" stroke="#a99262" strokeWidth={0.8} />
            <path d="M-2,-14 Q0,-13 2,-14" stroke="#a99262" strokeWidth={0.7} fill="none" />
            <path d="M-3,-8 L-2,-5 L-1,-7 L0,-5 L1,-8" stroke="#7a5c34" strokeWidth={0.6} fill="none" />
          </g>
        );
      })}
    </g>
  );
}
