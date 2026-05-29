// housing — cosy cottage (SMALL plot). Shared by housing/housing2/housing3.
// Smaller footprint than the Normal buildings, with cream plaster walls and a
// fat THATCH hip roof (rolled ridge + combed straw) to vary the roofline from
// the slate/terracotta set. A round-top door, a shuttered window with a flower
// box, a smoking chimney, a swaying laundry line and a little garden bush make
// it homely.

import { useId } from "react";
import { type P, add, pts } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Cosy thatch-roof cottage; round door, shuttered window + flower box, chimney smoke, swaying laundry line, garden bush. Small tier; thatch roof for variety.",
};

const HALF_W = 48, HALF_H = 24, WALL_H = 50, ROOF_RISE = 42, EAVE = 9, LW = 120, LH = 92;

export default function IsoHousing({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };

  const right = add(o, { x: HALF_W, y: 0 }), bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H }, rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H }, leftT = { x: o.x - HALF_W, y: o.y - WALL_H };
  const apex = { x: o.x, y: o.y - HALF_H - WALL_H - ROOF_RISE + HALF_H };
  const apexP = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * HALF_H) / HALF_W;
  const topE = { x: topT.x, y: topT.y - eY }, rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY }, leftE = { x: leftT.x - EAVE, y: leftT.y };
  void apex;
  const seMatrix = `matrix(${HALF_W / LW} ${-HALF_H / LW} 0 ${WALL_H / LH} ${bottomT.x} ${bottomT.y})`;
  const swMatrix = `matrix(${HALF_W / LW} ${HALF_H / LW} 0 ${WALL_H / LH} ${leftT.x} ${leftT.y})`;
  const fc = LW / 2;

  // thatch slope (triangle eaveA-eaveB-apex): filled + combed straw strokes
  const thatch = (eaveA: P, eaveB: P, ap: P, fill: string, key: string) => {
    const strokes: JSX.Element[] = [];
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      const a = { x: eaveA.x + (eaveB.x - eaveA.x) * t, y: eaveA.y + (eaveB.y - eaveA.y) * t };
      strokes.push(<line key={`${key}${i}`} x1={a.x} y1={a.y} x2={a.x * 0.12 + ap.x * 0.88} y2={a.y * 0.12 + ap.y * 0.88} stroke="rgba(0,0,0,.16)" strokeWidth={0.7} />);
    }
    return <g><polygon points={pts(eaveA, eaveB, ap)} fill={fill} />{strokes}</g>;
  };

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e2cf" /><stop offset="1" stopColor="#e0c3a8" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cda98e" /><stop offset="1" stopColor="#a8856a" /></linearGradient>
        <linearGradient id={id("thatchLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8b25e" /><stop offset="1" stopColor="#a8813c" /></linearGradient>
        <linearGradient id={id("thatchShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8813c" /><stop offset="1" stopColor="#7c5c28" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#cfeaf6" /><stop offset="1" stopColor="#8fb6cc" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 14} ry={HALF_H + 5} fill="rgba(0,0,0,.28)" />

      {/* SW wall (shade) — round-top door */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterShade")})`} />
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 24} rx={16} ry={22} fill="#ff8a28" opacity={nearDoor ? 0.32 : 0.1} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 24}px` } : undefined} />
          <path d={`M${fc - 13},${LH} L${fc - 13},${LH - 26} a13,13 0 0 1 26,0 L${fc + 13},${LH} Z`} fill={PAL.timber} />
          <path d={`M${fc - 10},${LH} L${fc - 10},${LH - 24} a10,10 0 0 1 20,0 L${fc + 10},${LH} Z`} fill={PAL.timberSoft} />
          <line x1={fc} y1={LH} x2={fc} y2={LH - 32} stroke={PAL.timber} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx={fc + 7} cy={LH - 18} r={1.6} fill={PAL.brass} />
        </g>
      </g>

      {/* SE wall (lit) — shuttered window + flower box */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,235,200,.18)" />
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.12)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* exposed corner timber */}
        <g stroke="#a8856a" strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.4}><line x1={2} y1={6} x2={2} y2={LH} /></g>
        {/* window */}
        {(() => { const wx = fc; const wy = 40; return (
          <g>
            <rect x={wx - 14} y={wy - 8} width={4} height={26} fill="#7fa848" /><rect x={wx + 10} y={wy - 8} width={4} height={26} fill="#7fa848" />
            <rect x={wx - 11} y={wy - 8} width={22} height={22} rx={1.5} fill="#3a2715" />
            <rect x={wx - 9} y={wy - 6} width={18} height={18} fill={`url(#${id("pane")})`} />
            <line x1={wx} y1={wy - 6} x2={wx} y2={wy + 12} stroke="#3a2715" strokeWidth={1.2} /><line x1={wx - 9} y1={wy + 3} x2={wx + 9} y2={wy + 3} stroke="#3a2715" strokeWidth={1.2} />
            {/* flower box */}
            <rect x={wx - 13} y={wy + 14} width={26} height={5} rx={1} fill="#7a3d24" />
            {[-8, -3, 2, 7].map((dx, i) => <circle key={i} cx={wx + dx} cy={wy + 14} r={2.2} fill={["#dba7c4", "#e58a4f", "#f4d262", "#dba7c4"][i]} />)}
          </g>
        ); })()}
      </g>

      {/* eave beam */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke="#7a5c34" strokeWidth={3} />

      {/* ===== THATCH HIP ROOF ===== */}
      <polygon points={pts(topE, leftE, apexP)} fill="#7c5c28" />
      <polygon points={pts(topE, rightE, apexP)} fill="#7c5c28" />
      {thatch(leftE, bottomE, apexP, `url(#${id("thatchShade")})`, "ts")}
      {thatch(rightE, bottomE, apexP, `url(#${id("thatchLit")})`, "tl")}
      {/* fat rounded eave + ridge */}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#6a4e22" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      <g strokeLinecap="round">
        <line x1={apexP.x} y1={apexP.y} x2={bottomE.x} y2={bottomE.y} stroke="#e0bc6a" strokeWidth={4} />
        <line x1={apexP.x} y1={apexP.y} x2={rightE.x} y2={rightE.y} stroke="#c89f4f" strokeWidth={3} />
        <line x1={apexP.x} y1={apexP.y} x2={leftE.x} y2={leftE.y} stroke="#a8813c" strokeWidth={3} />
      </g>
      <circle cx={apexP.x} cy={apexP.y} r={3} fill="#e0bc6a" />

      {/* chimney + smoke */}
      {(() => { const cx = apexP.x - 16, cy = apexP.y + 22, half = 6, hh = half * 0.5, h = 26, top = cy - h; return (
        <g>
          <polygon points={`${cx - half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx - half},${cy + hh - h}`} fill={PAL.brickDark} />
          <polygon points={`${cx + half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx + half},${cy + hh - h}`} fill="#a55a3a" />
          <polygon points={`${cx},${top} ${cx + half},${top + hh} ${cx},${top + 2 * hh} ${cx - half},${top + hh}`} fill="#5a2415" />
          <Smoke x={cx} y={top} scale={0.7} count={3} dur={4} color="#e4d8c0" />
        </g>
      ); })()}

      {/* ===== LAUNDRY LINE (swaying clothes), strung from the eave to a pole ===== */}
      {(() => {
        const pole = add(right, { x: 16, y: 2 });
        const lineA = { x: rightT.x, y: rightT.y + 6 }, lineB = { x: pole.x, y: pole.y - WALL_H + 4 };
        return (
          <g>
            <line x1={pole.x} y1={pole.y} x2={pole.x} y2={pole.y - WALL_H + 2} stroke="#5a3a1f" strokeWidth={2} strokeLinecap="round" />
            <path d={`M${lineA.x},${lineA.y} Q${(lineA.x + lineB.x) / 2},${(lineA.y + lineB.y) / 2 + 6} ${lineB.x},${lineB.y}`} fill="none" stroke="#3a2715" strokeWidth={0.6} />
            {[{ t: 0.38, c: "#aed3e8", d: 5 }, { t: 0.66, c: "#e58a4f", d: 4 }].map((g, i) => {
              const px = lineA.x + (lineB.x - lineA.x) * g.t, py = lineA.y + (lineB.y - lineA.y) * g.t + 3;
              return (
                <g key={i} style={{ animation: `sway ${g.d}s ${i * 0.5}s ease-in-out infinite`, transformOrigin: `${px}px ${py}px` }}>
                  <path d={`M${px - 4},${py} L${px + 4},${py - 1} L${px + 5},${py + 7} L${px + 2},${py + 6} L${px + 2},${py + 9} L${px - 3},${py + 8} L${px - 3},${py + 6} L${px - 5},${py + 7} Z`} fill={g.c} stroke="rgba(0,0,0,.2)" strokeWidth={0.3} />
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* garden bush (front-left) */}
      {(() => { const b = add(leftT, { x: -2, y: WALL_H + 2 }); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={0} cy={1} rx={7} ry={1.8} fill="rgba(0,0,0,.2)" />
          <circle cx={-3} cy={-3} r={4} fill="#6b8a4a" /><circle cx={3} cy={-4} r={4.4} fill="#7fa848" /><circle cx={0} cy={-7} r={3} fill="#7fa848" />
          <circle cx={-3} cy={-7} r={1} fill="#dba7c4" /><circle cx={3} cy={-8} r={1} fill="#f4d262" />
        </g>
      ); })()}
    </g>
  );
}
