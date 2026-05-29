// lighthouse — calibration building (TALL, small plot).
// Reimagined for iso: a tapered cylindrical tower wears curved red/white
// stripe bands (each band is the visible front of a cylinder ring, so its rims
// bulge toward the viewer), stands on a rocky iso islet ringed by animated
// water, and is capped by a glowing lamp room + dome. Signature animation: the
// rotating light beam (two opposing cones sweeping around the lamp), plus
// lapping waves, foam splash, a flickering lamp + portholes, and a bobbing
// dinghy at a little dock. A cylinder reads the same from any angle, so the
// roundness is faked with a horizontal lit/shade gradient rather than projected
// panels.

import { useId } from "react";
import { type P, makeGp, GroundShadow, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Tall tapered striped tower on a rocky islet; rotating beam, waves/splash, flickering lamp + portholes, bobbing dinghy. Calibration: tall silhouette + small plot.",
};

const WHITE = "#f3ead2";
const RED = "#c44a2c";

export default function IsoLighthouse({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const yOf = (h: number) => o.y - h; // height (px up from footprint) → screen y
  const rOf = (h: number) => lerp({ x: 28, y: 0 }, { x: 16, y: 0 }, (h - 30) / 150).x; // tower radius vs height

  // A curved cylinder band (front face) between two heights, rims bulging toward
  // the viewer (downward in screen space) by the local foreshortened radius.
  const band = (hBot: number, hTop: number, fill: string, key: string, extraR = 0): JSX.Element => {
    const rB = rOf(hBot) + extraR; const rT = rOf(hTop) + extraR;
    const yB = yOf(hBot); const yT = yOf(hTop);
    const eB = rB * 0.5; const eT = rT * 0.5;
    const d = `M${o.x - rB},${yB}`
      + ` Q${o.x},${yB + eB * 1.25} ${o.x + rB},${yB}`
      + ` L${o.x + rT},${yT}`
      + ` Q${o.x},${yT + eT * 1.25} ${o.x - rT},${yT} Z`;
    return <path key={key} d={d} fill={fill} />;
  };

  const stripes: JSX.Element[] = [];
  const bandStep = 25;
  let i = 0;
  for (let h = 30; h < 180; h += bandStep, i++) {
    stripes.push(band(h, Math.min(h + bandStep, 180), i % 2 === 0 ? WHITE : RED, `b${i}`));
  }

  const galleryH = 180;
  const lampBotH = 184;
  const lampTopH = 206;
  const domeTopH = 224;
  const lampCx = o.x;
  const lampCy = yOf((lampBotH + lampTopH) / 2);

  return (
    <g>
      <defs>
        <linearGradient id={id("cyl")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(0,0,0,.28)" />
          <stop offset="0.42" stopColor="rgba(0,0,0,0)" />
          <stop offset="0.62" stopColor="rgba(255,255,255,.16)" />
          <stop offset="1" stopColor="rgba(0,0,0,.14)" />
        </linearGradient>
        <radialGradient id={id("lamp")} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fffbe0" /><stop offset="0.5" stopColor="#ffe79a" /><stop offset="1" stopColor="#f2b24a" />
        </radialGradient>
        <radialGradient id={id("beam")} cx="0" cy="0.5" r="1">
          <stop offset="0" stopColor="#fff8c2" stopOpacity="0.55" /><stop offset="1" stopColor="#fff8c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("sea")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={PAL.seaLight} /><stop offset="1" stopColor={PAL.seaDark} />
        </radialGradient>
      </defs>

      {/* ===== WATER ===== a foreshortened sea disc with animated ripple rings */}
      <ellipse cx={o.x} cy={o.y + 8} rx={120} ry={60} fill={`url(#${id("sea")})`} />
      {[0, 1, 2].map((k) => (
        <ellipse key={k} cx={o.x} cy={o.y + 8} rx={50 + k * 26} ry={(50 + k * 26) * 0.5} fill="none" stroke={PAL.seaFoam} strokeWidth={1.4} opacity={0.5}
          style={{ animation: `splash ${2.6 + k * 0.5}s ${k * 0.4}s ease-in-out infinite`, transformOrigin: `${o.x}px ${o.y + 8}px` }} />
      ))}

      <GroundShadow origin={o} rx={40} ry={20} />

      {/* ===== ROCKY ISLET ===== lit SE + shaded SW faces */}
      {(() => {
        const top = [gp(-0.7, -0.5, 16), gp(0.7, -0.6, 18), gp(0.8, 0.6, 15), gp(-0.6, 0.8, 14)];
        const baseR = [gp(-0.85, -0.6, 0), gp(0.85, -0.7, 0), gp(0.95, 0.7, 0), gp(-0.75, 0.95, 0)];
        return (
          <g>
            {/* SE (lit) + SW (shade) rock faces */}
            <polygon points={`${top[1].x},${top[1].y} ${top[2].x},${top[2].y} ${baseR[2].x},${baseR[2].y} ${baseR[1].x},${baseR[1].y}`} fill="#6a6052" />
            <polygon points={`${top[2].x},${top[2].y} ${top[3].x},${top[3].y} ${baseR[3].x},${baseR[3].y} ${baseR[2].x},${baseR[2].y}`} fill="#474037" />
            <polygon points={`${top[0].x},${top[0].y} ${top[1].x},${top[1].y} ${baseR[1].x},${baseR[1].y} ${baseR[0].x},${baseR[0].y}`} fill="#574e42" />
            {/* rock top */}
            <polygon points={top.map((p) => `${p.x},${p.y}`).join(" ")} fill="#7a7060" />
            {/* foam splashing where water meets rock */}
            <ellipse cx={gp(-0.85, 0.2, 0).x} cy={gp(-0.85, 0.2, 0).y} rx={8} ry={2} fill={PAL.seaFoam} opacity={0.85}
              style={{ animation: "splash 1.6s ease-in-out infinite", transformOrigin: `${gp(-0.85, 0.2, 0).x}px ${gp(-0.85, 0.2, 0).y}px` }} />
            <ellipse cx={gp(0.9, -0.1, 0).x} cy={gp(0.9, -0.1, 0).y} rx={8} ry={2} fill={PAL.seaFoam} opacity={0.85}
              style={{ animation: "splash 1.9s .4s ease-in-out infinite", transformOrigin: `${gp(0.9, -0.1, 0).x}px ${gp(0.9, -0.1, 0).y}px` }} />
          </g>
        );
      })()}

      {/* ===== TOWER ===== granite base ring + striped cylinder + roundness overlay */}
      {band(16, 30, PAL.stone, "granite", 0)}
      <ellipse cx={o.x} cy={yOf(30)} rx={rOf(30)} ry={rOf(30) * 0.5} fill={PAL.stoneShade} opacity={0.4} />
      {stripes}
      {/* thin band seams */}
      {Array.from({ length: 6 }, (_, k) => 30 + k * bandStep).map((h, k) => (
        <path key={`seam${k}`} d={`M${o.x - rOf(h)},${yOf(h)} Q${o.x},${yOf(h) + rOf(h) * 0.5 * 1.25} ${o.x + rOf(h)},${yOf(h)}`} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={0.8} />
      ))}
      {/* cylindrical roundness shading over the whole body */}
      <path d={`M${o.x - rOf(30)},${yOf(30)} Q${o.x},${yOf(30) + rOf(30) * 0.5 * 1.25} ${o.x + rOf(30)},${yOf(30)} L${o.x + rOf(180)},${yOf(180)} L${o.x - rOf(180)},${yOf(180)} Z`} fill={`url(#${id("cyl")})`} />

      {/* portholes (front, lit + flicker) */}
      {[70, 120].map((h) => (
        <g key={h} data-door={h === 70 ? "entry" : undefined}>
          <circle cx={o.x} cy={yOf(h)} r={3} fill="#2c1c0e" />
          <circle cx={o.x} cy={yOf(h)} r={2.1} fill="#ffd98a" style={{ animation: `flicker ${2.6 + h * 0.01}s ease-in-out infinite`, transformOrigin: `${o.x}px ${yOf(h)}px` }} />
          <line x1={o.x - 3} y1={yOf(h)} x2={o.x + 3} y2={yOf(h)} stroke="#2c1c0e" strokeWidth={0.5} />
          {h === 70 && nearDoor && <circle cx={o.x} cy={yOf(h)} r={7} fill="#ff8a28" opacity={0.34} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${o.x}px ${yOf(h)}px` }} />}
        </g>
      ))}

      {/* ===== GALLERY walkway ring ===== */}
      <ellipse cx={o.x} cy={yOf(galleryH)} rx={rOf(galleryH) + 5} ry={(rOf(galleryH) + 5) * 0.5} fill="#3a3530" />
      <ellipse cx={o.x} cy={yOf(galleryH) - 1.5} rx={rOf(galleryH) + 4} ry={(rOf(galleryH) + 4) * 0.5} fill="#7c858d" />
      {/* rail posts */}
      {Array.from({ length: 9 }, (_, k) => k).map((k) => {
        const a = (k / 9) * Math.PI * 2;
        const rx = (rOf(galleryH) + 4) * Math.cos(a);
        const ry = (rOf(galleryH) + 4) * 0.5 * Math.sin(a);
        return <line key={k} x1={o.x + rx} y1={yOf(galleryH) + ry} x2={o.x + rx} y2={yOf(galleryH) + ry - 6} stroke="#3a3530" strokeWidth={0.9} />;
      })}
      <ellipse cx={o.x} cy={yOf(galleryH + 6)} rx={rOf(galleryH) + 4} ry={(rOf(galleryH) + 4) * 0.5} fill="none" stroke="#3a3530" strokeWidth={0.9} />

      {/* ===== LAMP ROOM ===== glowing glass cylinder with mullions ===== */}
      <path d={`M${o.x - 13},${yOf(lampBotH)} Q${o.x},${yOf(lampBotH) + 6} ${o.x + 13},${yOf(lampBotH)} L${o.x + 12},${yOf(lampTopH)} L${o.x - 12},${yOf(lampTopH)} Z`} fill="#2c2620" />
      <rect x={o.x - 11} y={yOf(lampTopH)} width={22} height={lampTopH - lampBotH} fill={`url(#${id("lamp")})`} opacity={0.92} />
      {/* lamp core orb */}
      <circle cx={lampCx} cy={lampCy} r={5} fill="#fffbe0" style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: `${lampCx}px ${lampCy}px` }} />
      <circle cx={lampCx} cy={lampCy} r={2.4} fill="#fff" />
      {/* diamond mullions */}
      <g stroke="#2c2620" strokeWidth={0.8}>
        <line x1={o.x - 11} y1={yOf((lampBotH + lampTopH) / 2)} x2={o.x + 11} y2={yOf((lampBotH + lampTopH) / 2)} />
        {[-7, 0, 7].map((dx) => <line key={dx} x1={o.x + dx} y1={yOf(lampBotH)} x2={o.x + dx} y2={yOf(lampTopH)} />)}
      </g>

      {/* ===== ROTATING BEAM (signature) ===== two opposing cones sweeping around the lamp */}
      <g transform={`translate(${lampCx} ${lampCy})`} style={{ animation: "windmill 7s linear infinite", transformOrigin: "0 0" }}>
        <polygon points="0,0 -92,-16 -92,16" fill={`url(#${id("beam")})`} />
        <polygon points="0,0 92,-14 92,14" fill={`url(#${id("beam")})`} opacity={0.7} />
      </g>

      {/* ===== DOME + finial ===== */}
      <path d={`M${o.x - 13},${yOf(lampTopH)} Q${o.x},${yOf(domeTopH) - 4} ${o.x + 13},${yOf(lampTopH)} Z`} fill={PAL.terracottaDark} />
      <path d={`M${o.x - 13},${yOf(lampTopH)} Q${o.x - 5},${yOf(domeTopH) - 4} ${o.x},${yOf(domeTopH) - 2} L${o.x - 4},${yOf(lampTopH)} Z`} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x} cy={yOf(lampTopH)} rx={13} ry={3} fill="#3a160a" />
      <line x1={o.x} y1={yOf(domeTopH) - 2} x2={o.x} y2={yOf(domeTopH + 8)} stroke="#3a3530" strokeWidth={1.4} />
      <circle cx={o.x} cy={yOf(domeTopH + 9)} r={2} fill="#bcc4c8" />

      {/* ===== DOCK + bobbing dinghy (front-right) ===== */}
      {(() => {
        const d0 = gp(0.9, 0.7, 0); const d1 = gp(2.1, 1.1, 0);
        return (
          <g>
            <line x1={d0.x} y1={d0.y} x2={d1.x} y2={d1.y} stroke="#7a5c34" strokeWidth={4} strokeLinecap="round" />
            <line x1={lerp(d0, d1, 0.5).x} y1={lerp(d0, d1, 0.5).y} x2={lerp(d0, d1, 0.5).x} y2={lerp(d0, d1, 0.5).y + 7} stroke="#5a3a1f" strokeWidth={1.5} />
            <line x1={d1.x} y1={d1.y} x2={d1.x} y2={d1.y + 7} stroke="#5a3a1f" strokeWidth={1.5} />
            <g style={{ animation: "bob 3.8s ease-in-out infinite", transformOrigin: `${d1.x + 10}px ${d1.y + 4}px` }}>
              <path d={`M${d1.x + 3},${d1.y + 3} Q${d1.x + 10},${d1.y + 9} ${d1.x + 17},${d1.y + 3} Z`} fill="#7a3d24" />
              <line x1={d1.x + 3} y1={d1.y + 2.5} x2={d1.x + 17} y2={d1.y + 2.5} stroke="#5a2415" strokeWidth={0.6} />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
