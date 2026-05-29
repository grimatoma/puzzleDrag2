// portal — arcane gateway (NORMAL plot).
// Two rune-carved purple-grey stone PILLARS (iso boxes) flank a face-on glowing
// PORTAL — layered purple depth + a bright core — spanned by a thick stone ARCH
// with a glowing keystone. A spinning RUNE RING (v2spin) and floating star motes
// (pollen) orbit the portal, which pulses (v2pulse) and casts a glow on the
// ground. The magical plane reads face-on between the iso pillars.

import { useId } from "react";
import { type P, makeGp, pts } from "../isoKit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Arcane gateway: two rune-carved iso stone pillars + stone arch with glowing keystone, face-on layered glowing portal, spinning rune ring (v2spin), floating motes (pollen), pulsing glow.",
};

const STONE = "#4a3a6a", SHADE = "#2e2248", LIGHT = "#6a5a8a", RUNE = "#e0b0ff", GLOW = "#c080ff";

export default function IsoPortal({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const H = 100;

  // iso stone pillar (box) centered at (cgx,0), half 0.22 tiles, height H
  const pillar = (cgx: number) => {
    const hx = 0.22, hy = 0.22;
    const seB = gp(cgx + hx, -hy, 0), seT = gp(cgx + hx, hy, 0);
    const seBt = gp(cgx + hx, -hy, H), seTt = gp(cgx + hx, hy, H);
    const swB = gp(cgx - hx, hy, 0), swT = gp(cgx + hx, hy, 0);
    const swBt = gp(cgx - hx, hy, H), swTt = gp(cgx + hx, hy, H);
    const capN = gp(cgx, -hy, H), capE = gp(cgx + hx, 0, H), capS = gp(cgx, hy, H), capW = gp(cgx - hx, 0, H);
    const runeC = { x: (seB.x + seBt.x) / 2 + 4, y: (seB.y + seTt.y) / 2 - H * 0.45 };
    return (
      <g>
        {/* SW (shade) face */}
        <polygon points={pts(swB, swT, swTt, swBt)} fill={SHADE} />
        {/* SE (lit) face */}
        <polygon points={pts(seB, seT, seTt, seBt)} fill={STONE} />
        <polygon points={pts(seB, seT, seTt, seBt)} fill="rgba(255,255,255,.05)" />
        {/* top cap */}
        <polygon points={pts(capN, capE, capS, capW)} fill={LIGHT} />
        {/* cap overhang */}
        <polygon points={pts(gp(cgx, -hy - 0.06, H), gp(cgx + hx + 0.06, 0, H), gp(cgx, hy + 0.06, H), gp(cgx - hx - 0.06, 0, H))} fill={LIGHT} opacity={0.5} />
        {/* runes on the SE face */}
        <g stroke={RUNE} strokeWidth={0.9} opacity={0.55} fill="none">
          <line x1={runeC.x} y1={runeC.y - 9} x2={runeC.x} y2={runeC.y + 9} />
          <line x1={runeC.x - 4} y1={runeC.y - 3} x2={runeC.x + 4} y2={runeC.y - 3} />
          <circle cx={runeC.x} cy={runeC.y + 2} r={3.4} />
        </g>
      </g>
    );
  };

  const pcx = o.x, pcy = o.y - 56; // portal center (screen)
  const leftTop = gp(-0.9, 0, H), rightTop = gp(0.9, 0, H);

  return (
    <g>
      <defs>
        <radialGradient id={id("portal")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0d8ff" /><stop offset="0.35" stopColor="#c080ff" /><stop offset="0.7" stopColor="#7030c8" /><stop offset="1" stopColor="#2a1050" />
        </radialGradient>
      </defs>

      {/* ground shadow + arcane spill */}
      <ellipse cx={o.x} cy={o.y + 3} rx={56} ry={16} fill="rgba(0,0,0,.34)" />
      <ellipse cx={o.x} cy={o.y} rx={34} ry={9} fill={GLOW} opacity={0.2} style={{ animation: "v2pulse 3s 0.5s ease-in-out infinite", transformOrigin: `${o.x}px ${o.y}px` }} />

      {/* ===== PORTAL (face-on, behind the pillars/arch) ===== */}
      <ellipse cx={pcx} cy={pcy} rx={30} ry={46} fill={`url(#${id("portal")})`} />
      <ellipse cx={pcx} cy={pcy} rx={20} ry={32} fill="#8040d8" opacity={0.55} />
      <ellipse cx={pcx} cy={pcy} rx={9} ry={16} fill="#f0d8ff" opacity={0.85} style={{ animation: "v2pulse 2s ease-in-out infinite", transformOrigin: `${pcx}px ${pcy}px` }} />
      {/* pulsing halo */}
      <ellipse cx={pcx} cy={pcy} rx={31} ry={47} fill="none" stroke={GLOW} strokeWidth={2.5} opacity={0.45} style={{ animation: "v2pulse 2.4s ease-in-out infinite", transformOrigin: `${pcx}px ${pcy}px` }} />

      {/* spinning rune ring */}
      <g transform={`translate(${pcx} ${pcy})`}>
        <g style={{ animation: "v2spin 9s linear infinite", transformOrigin: "0 0" }}>
          <ellipse rx={34} ry={40} fill="none" stroke={RUNE} strokeWidth={1} opacity={0.55} />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 32} y1={Math.sin(a) * 38} x2={Math.cos(a) * 34} y2={Math.sin(a) * 40} stroke={RUNE} strokeWidth={i % 6 === 0 ? 1.8 : 0.8} opacity={i % 6 === 0 ? 0.9 : 0.5} />;
          })}
          <ellipse rx={23} ry={28} fill="none" stroke={RUNE} strokeWidth={0.7} opacity={0.4} />
        </g>
      </g>

      {/* floating star motes */}
      {[[-22, -40], [20, -46], [-32, -20], [30, -16], [-12, -54], [12, 8], [-28, 6], [26, 2]].map(([dx, dy], i) => (
        <circle key={i} cx={pcx + dx} cy={pcy + dy} r={1 + (i % 3) * 0.3} fill={GLOW} opacity={0.7} style={{ "--px": `${dx < 0 ? -20 : 20}px`, animation: `pollen ${2.6 + (i % 4) * 0.4}s ${i * 0.3}s ease-in-out infinite`, transformOrigin: `${pcx + dx}px ${pcy + dy}px` } as React.CSSProperties} />
      ))}

      {/* ===== PILLARS (in front of the portal) ===== */}
      {pillar(-0.9)}
      {pillar(0.9)}

      {/* ===== STONE ARCH over the pillars ===== */}
      <path d={`M${leftTop.x},${leftTop.y} Q${o.x},${Math.min(leftTop.y, rightTop.y) - 26} ${rightTop.x},${rightTop.y}`} fill="none" stroke={STONE} strokeWidth={13} strokeLinecap="round" />
      <path d={`M${leftTop.x},${leftTop.y} Q${o.x},${Math.min(leftTop.y, rightTop.y) - 26} ${rightTop.x},${rightTop.y}`} fill="none" stroke={LIGHT} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
      {/* keystone */}
      <ellipse cx={o.x} cy={Math.min(leftTop.y, rightTop.y) - 22} rx={6} ry={5} fill={LIGHT} />
      <circle cx={o.x} cy={Math.min(leftTop.y, rightTop.y) - 22} r={2.6} fill={GLOW} style={{ animation: "v2pulse 2.4s ease-in-out infinite", transformOrigin: `${o.x}px ${Math.min(leftTop.y, rightTop.y) - 22}px` }} />

      {/* near-door marker (the portal is the entry) */}
      {nearDoor && <ellipse cx={pcx} cy={pcy} rx={26} ry={40} fill="#c080ff" opacity={0.25} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${pcx}px ${pcy}px` }} />}
    </g>
  );
}
