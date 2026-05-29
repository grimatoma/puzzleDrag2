// inn — a two-storey timber-frame lodge (NORMAL plot).
// Tests the "stack storeys, don't inflate" rule: a heavier stone+timber ground
// floor with a wide arched double-door entrance (hero, lit SE face) flanked by
// warm windows, a lighter timber-frame plaster upper floor with three glowing
// windows, and a terracotta hip roof. A brick chimney smokes at the rear and a
// swinging mug sign hangs by the door.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney, Window } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Two-storey timber-frame inn; arched double-door hero on lit face, two rows of warm windows, terracotta hip roof, chimney smoke, swinging mug sign. Tests stacked storeys at the shared scale.",
};

const HW = 64, HH = 32;          // footprint half-extents (matches forge)
const H1 = 48;                   // ground storey height
const H2 = 44;                   // upper storey height
const ROOF_RISE = 46, EAVE = 9, LW = 120, LH = 92;

export default function IsoInn({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };

  // wall-panel matrices for a storey between heights hb..ht
  const seM = (hb: number, ht: number) => panelMatrix({ x: o.x, y: o.y + HH - ht }, { x: HW, y: -HH }, { x: 0, y: ht - hb }, LW, LH);
  const swM = (hb: number, ht: number) => panelMatrix({ x: o.x - HW, y: o.y - ht }, { x: HW, y: HH }, { x: 0, y: ht - hb }, LW, LH);

  // roof corners at top of upper storey (h = H1+H2)
  const HT = H1 + H2;
  const right = add(o, { x: HW, y: -HT }), bottom = add(o, { x: 0, y: HH - HT });
  const topT = { x: o.x, y: o.y - HH - HT }, leftT = { x: o.x - HW, y: o.y - HT };
  const apex = { x: o.x, y: o.y - HH - HT - ROOF_RISE + HH };
  const apexP = { x: o.x, y: o.y - HT - ROOF_RISE };
  const eY = (EAVE * HH) / HW;
  const topE = { x: topT.x, y: topT.y - eY }, rightE = { x: right.x + EAVE, y: right.y };
  const bottomE = { x: bottom.x, y: bottom.y + eY }, leftE = { x: leftT.x - EAVE, y: leftT.y };
  void apex;
  const fc = LW / 2;

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1ddb2" /><stop offset="1" stopColor="#d8bf8c" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8ad7e" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("stoneShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c8056" /><stop offset="1" stopColor="#72603f" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#a23f24" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6f2716" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#ffcf6a" /><stop offset="1" stopColor="#7a3a10" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HW + 16} ry={HH + 6} fill="rgba(0,0,0,.3)" />

      {/* timber-frame helper for the upper storey */}
      {(() => {
        const frame = (transform: string) => (
          <g transform={transform}>
            <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
            <g stroke={PAL.timber} strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.7}>
              {[0, 40, 80, LW].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={LH} vectorEffect="non-scaling-stroke" />)}
              <line x1={0} y1={2} x2={LW} y2={2} /><line x1={0} y1={LH - 2} x2={LW} y2={LH - 2} />
            </g>
            <g stroke={PAL.timber} strokeWidth={1.1} opacity={0.3}>
              <line x1={0} y1={0} x2={40} y2={LH} /><line x1={40} y1={0} x2={0} y2={LH} />
              <line x1={80} y1={0} x2={LW} y2={LH} /><line x1={LW} y1={0} x2={80} y2={LH} />
            </g>
          </g>
        );
        return (
          <>
            {/* ===== GROUND STOREY ===== */}
            <g transform={swM(0, H1)}>
              <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneShade")})`} />
              <g stroke="rgba(0,0,0,.18)" strokeWidth={0.6}>{[30, 58].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
              <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.22)" />
              <rect x={0} y={LH - 9} width={LW} height={9} fill={PAL.stoneShade} />
              <Window cx={30} y={26} w={20} h={28} id={id} lit dur={2.8} />
            </g>
            <g transform={seM(0, H1)}>
              <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("stoneLit")})`} />
              <g stroke="rgba(0,0,0,.1)" strokeWidth={0.6}>{[30, 58].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
              <rect x={0} y={0} width={LW} height={5} fill="rgba(255,235,200,.16)" />
              <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.14)" />
              <rect x={0} y={LH - 9} width={LW} height={9} fill={PAL.stoneShade} />
              {/* a flanking window */}
              <Window cx={26} y={28} w={18} h={26} id={id} lit dur={3.6} />
              {/* ===== WIDE ARCHED DOUBLE-DOOR ENTRANCE (hero) ===== */}
              <g data-door="entry">
                <ellipse cx={fc + 18} cy={LH - 30} rx={26} ry={28} fill={`url(#${id("glow")})`} opacity={nearDoor ? 0.5 : 0.32} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc + 18}px ${LH - 30}px` } : undefined} />
                <path d={`M${fc + 0},${LH} L${fc + 0},${LH - 44} a18,18 0 0 1 36,0 L${fc + 36},${LH} Z`} fill={PAL.wallTop} />
                <path d={`M${fc + 3},${LH} L${fc + 3},${LH - 42} a15,15 0 0 1 30,0 L${fc + 33},${LH} Z`} fill="#2a1a0a" />
                <rect x={fc + 4} y={LH - 42} width={14} height={42} fill="#4a2e14" />
                <rect x={fc + 19} y={LH - 42} width={14} height={42} fill="#3a2010" />
                <line x1={fc + 18} y1={LH} x2={fc + 18} y2={LH - 44} stroke={PAL.wallTop} strokeWidth={1.4} />
                <circle cx={fc + 15} cy={LH - 22} r={1.6} fill={PAL.brass} /><circle cx={fc + 21} cy={LH - 22} r={1.6} fill={PAL.brass} />
                <ellipse cx={fc + 18} cy={LH - 44} rx={4} ry={2.6} fill={PAL.stone} />
              </g>
            </g>
            {/* floor-divider beam */}
            <polyline points={pts({ x: o.x - HW, y: o.y - H1 }, { x: o.x, y: o.y + HH - H1 }, { x: o.x + HW, y: o.y - H1 })} fill="none" stroke={PAL.wallTop} strokeWidth={3} />

            {/* ===== UPPER STOREY (timber frame) ===== */}
            {frame(swM(H1, HT))}
            <g transform={swM(H1, HT)}>
              <Window cx={30} y={30} w={20} h={26} id={id} lit dur={3.2} />
              <Window cx={84} y={30} w={20} h={26} id={id} lit dur={3.8} />
            </g>
            {frame(seM(H1, HT))}
            <g transform={seM(H1, HT)}>
              <Window cx={30} y={30} w={20} h={26} id={id} lit dur={2.9} />
              <Window cx={84} y={30} w={20} h={26} id={id} lit dur={3.5} />
            </g>
          </>
        );
      })()}

      {/* eave beam */}
      <polyline points={pts(leftT, bottom, right)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />

      {/* ===== TERRACOTTA HIP ROOF ===== */}
      <polygon points={pts(topE, leftE, apexP)} fill="#6f2716" />
      <polygon points={pts(topE, rightE, apexP)} fill="#6f2716" />
      {shingles(leftE, bottomE, apexP, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 6)}
      {shingles(rightE, bottomE, apexP, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apexP.x} y1={apexP.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apexP.x} y1={apexP.y} x2={rightE.x} y2={rightE.y} /><line x1={apexP.x} y1={apexP.y} x2={leftE.x} y2={leftE.y} /></g>
        <g stroke={PAL.ridge} strokeWidth={1.3} opacity={0.8}><line x1={apexP.x} y1={apexP.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apexP.x} y1={apexP.y} x2={rightE.x} y2={rightE.y} /><line x1={apexP.x} y1={apexP.y} x2={leftE.x} y2={leftE.y} /></g>
      </g>

      {/* chimney + smoke (rear-right) */}
      <Chimney cx={apexP.x + 24} cy={apexP.y + 30} h={34} half={8} gid={id("terraShade")} />
      <Smoke x={apexP.x + 24} y={apexP.y - 6} scale={1.0} count={4} dur={4.2} color="#d4c8a8" />

      {/* ===== HANGING MUG SIGN by the entrance ===== */}
      {(() => {
        const base = { x: right.x - 4, y: o.y - H1 - 6 };
        const arm = { x: base.x - 18, y: base.y };
        return (
          <g>
            <line x1={base.x} y1={base.y} x2={arm.x} y2={arm.y} stroke={PAL.timber} strokeWidth={2.4} strokeLinecap="round" />
            <g style={{ animation: "sway 3.2s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y}px` }}>
              <line x1={arm.x} y1={arm.y} x2={arm.x} y2={arm.y + 4} stroke="#2c2012" strokeWidth={1.4} />
              <rect x={arm.x - 11} y={arm.y + 4} width={22} height={15} rx={2} fill="#f0e0b0" stroke={PAL.timber} strokeWidth={1.2} />
              <rect x={arm.x - 5} y={arm.y + 7} width={7} height={8} rx={1} fill="#c87840" />
              <path d={`M${arm.x + 2},${arm.y + 8} q4,0 4,4 q0,3 -4,3`} fill="none" stroke="#c87840" strokeWidth={1.4} />
              <ellipse cx={arm.x - 1.5} cy={arm.y + 7} rx={4} ry={1.4} fill="#fff" opacity={0.6} />
            </g>
          </g>
        );
      })()}
    </g>
  );
}
