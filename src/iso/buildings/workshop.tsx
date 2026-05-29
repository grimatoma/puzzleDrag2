// workshop — carpenter's workshop (NORMAL plot).
// Timber plank walls with an exposed heavy frame under a plank hip roof. The lit
// face opens as wide double doors onto a workbench (the hero), with tools (axe +
// saw) hanging on the side wall that wiggle on their pegs, sawdust motes
// drifting (pollen), a log stack and curly wood shavings in the yard.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, planks, Window } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Carpenter's workshop; timber plank walls + heavy frame, plank hip roof, open double doors onto a workbench (hero), wiggling hung tools (axe/saw), sawdust pollen, log stack + shavings.",
};

const HALF_W = 64, HALF_H = 32, WALL_H = 70, ROOF_RISE = 50, EAVE = 9, LW = 120, LH = 92;

export default function IsoWorkshop({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  return (
    <g>
      <defs>
        <linearGradient id={id("woodLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdaa72" /><stop offset="1" stopColor="#a4824e" /></linearGradient>
        <linearGradient id={id("woodShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c7c4c" /><stop offset="1" stopColor="#73572f" /></linearGradient>
        <linearGradient id={id("roofLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a6a42" /><stop offset="1" stopColor="#5a3f24" /></linearGradient>
        <linearGradient id={id("roofShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a4e30" /><stop offset="1" stopColor="#42301c" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />

      {/* SW wall (shade) — window + hanging tools (wiggle) */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("woodShade")})`} />
        {planks("sw")}
        <g stroke={PAL.timber} strokeWidth={3} vectorEffect="non-scaling-stroke"><line x1={3} y1={0} x2={3} y2={LH} /><line x1={LW - 3} y1={0} x2={LW - 3} y2={LH} /><line x1={0} y1={3} x2={LW} y2={3} /><line x1={0} y1={44} x2={LW} y2={44} /></g>
        <g stroke={PAL.timber} strokeWidth={3.5} strokeLinecap="round" opacity={0.8}><line x1={6} y1={3} x2={40} y2={44} /><line x1={LW - 6} y1={3} x2={LW - 40} y2={44} /></g>
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={30} y={56} w={18} h={20} id={id} lit dur={3.2} />
        {/* hung tools on pegs */}
        <g transform="translate(82 14)" style={{ animation: "wiggle 3s ease-in-out infinite", transformOrigin: "82px 14px" }}>
          <rect x={2.5} y={0} width={3} height={20} rx={1} fill={PAL.timberSoft} />
          <path d="M0,-4 L8,-4 L11,6 L8,10 L0,6 Z" fill={PAL.stoneShade} /><path d="M0,-4 L8,-4 L8,6 L0,6 Z" fill="#9a9a9a" />
        </g>
        <g transform="translate(100 16)" style={{ animation: "wiggle 3.8s 0.8s ease-in-out infinite", transformOrigin: "100px 16px" }}>
          <path d="M0,0 Q-2,-8 2,-18" stroke={PAL.timberSoft} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          <rect x={-1} y={-22} width={12} height={4} rx={0.5} fill="#9a9a9a" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-1 + i * 1.3},-18 L${-0.4 + i * 1.3},-16 L${0.2 + i * 1.3},-18`} fill="#787878" />)}
        </g>
      </g>

      {/* SE wall (lit) — wide open double doors onto workbench (hero) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("woodLit")})`} />
        {planks("se")}
        <g stroke={PAL.timber} strokeWidth={3} vectorEffect="non-scaling-stroke"><line x1={3} y1={0} x2={3} y2={LH} /><line x1={LW - 3} y1={0} x2={LW - 3} y2={LH} /><line x1={0} y1={3} x2={LW} y2={3} /></g>
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={22} y={18} w={16} h={18} id={id} lit dur={2.7} />
        {/* open doorway (dark interior) */}
        <g data-door="entry">
          <rect x={fc - 4} y={28} width={62} height={64} fill="#1a120a" />
          {nearDoor && <rect x={fc - 4} y={28} width={62} height={64} fill="#ff8a28" opacity={0.2} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc + 27}px 60px` }} />}
          {/* open door leaf swung to the left */}
          <rect x={fc - 18} y={30} width={16} height={60} fill="#3a2010" /><rect x={fc - 16} y={34} width={12} height={22} fill="#2a1808" /><rect x={fc - 16} y={60} width={12} height={26} fill="#2a1808" />
          {/* workbench inside (hero) */}
          <g transform={`translate(${fc + 30} 84)`}>
            <rect x={-22} y={-8} width={44} height={5} rx={1} fill="#8a6a3c" />
            <rect x={-18} y={-3} width={3} height={11} fill="#5a3f24" /><rect x={15} y={-3} width={3} height={11} fill="#5a3f24" />
            <rect x={-10} y={-15} width={10} height={7} rx={0.5} fill="#a4824e" /><rect x={-10} y={-16} width={10} height={2} fill="#cdaa72" />
            <rect x={-4} y={-22} width={1.6} height={8} fill="#9a9a9a" /><rect x={-5} y={-23} width={3} height={2} fill="#bcc4c8" />
            {/* clamp/vice */}
            <rect x={16} y={-7} width={4} height={6} fill="#7c858d" />
          </g>
        </g>
      </g>

      {/* eave + plank hip roof + rafter tails */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#42301c" />
      <polygon points={pts(topE, rightE, apex)} fill="#42301c" />
      {shingles(leftE, bottomE, apex, `url(#${id("roofShade")})`, "rgba(0,0,0,.24)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("roofLit")})`, "rgba(0,0,0,.2)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#2a1d10" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
        <g stroke="#caa86a" strokeWidth={1.2} opacity={0.7}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
      </g>

      {/* sawdust motes drifting in front of the doorway */}
      {[{ x: -14, y: -30, d: 3.2, p: 22 }, { x: 2, y: -22, d: 2.8, p: 28 }, { x: 16, y: -34, d: 3.6, p: -18 }, { x: 8, y: -16, d: 2.5, p: 22 }, { x: -6, y: -40, d: 3.1, p: 16 }].map((m, i) => (
        <circle key={i} cx={right.x + m.x} cy={right.y + m.y} r={i % 3 === 0 ? 1.2 : 0.8} fill={i % 2 ? "#e8d090" : "#d4c07a"} style={{ "--px": `${m.p}px`, animation: `pollen ${m.d}s ${i * 0.4}s ease-out infinite`, transformOrigin: `${right.x + m.x}px ${right.y + m.y}px`, opacity: 0.72 } as React.CSSProperties} />
      ))}

      {/* log stack + wood shavings (front, by the SW corner) */}
      {(() => { const b = add(leftT, { x: -4, y: WALL_H + 2 }); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={2} cy={2} rx={14} ry={3} fill="rgba(0,0,0,.26)" />
          {[[-6, 0], [4, 0], [-1, -7]].map(([lx, ly], i) => (
            <g key={i} transform={`translate(${lx} ${ly})`}>
              <ellipse cx={0} cy={0} rx={5.5} ry={4} fill="#a4824e" /><ellipse cx={0} cy={0} rx={3.6} ry={2.6} fill="#8a6a3c" /><circle cx={0} cy={0} r={1.2} fill="#6a4e30" />
            </g>
          ))}
          {/* curly shavings */}
          <g transform="translate(16 2)"><path d="M-8,0 Q-5,-5 0,-3 Q5,-7 8,-2" fill="none" stroke="#c8a060" strokeWidth={1.3} strokeLinecap="round" /><path d="M-6,0 Q-3,-4 2,-2 Q5,-5 9,0" fill="none" stroke="#d4ae70" strokeWidth={1} strokeLinecap="round" opacity={0.8} /></g>
        </g>
      ); })()}
    </g>
  );
}
