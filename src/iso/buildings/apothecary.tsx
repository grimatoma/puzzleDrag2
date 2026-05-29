// apothecary — herbalist's shop (NORMAL plot).
// Deep-teal plaster + dark timber-framed walls under a steep dark-tile hip roof.
// The hero is a protruding BAY WINDOW packed with rows of glowing coloured
// bottles on the lit face. A swinging mortar-&-pestle sign (with rising bubbles),
// a dormer, a herb planter, a sleeping cat and a wisp of magical mist complete
// it. Shares the bakery/brewery scaffold; differentiated by palette + bottle bay.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Teal timber-frame apothecary; glowing bottle bay-window hero on lit face, dark-tile hip roof, mortar/pestle sign (sway + bubbles), dormer, herb planter, sleeping cat, magical mist.",
};

const HALF_W = 60, HALF_H = 30, WALL_H = 64, ROOF_RISE = 52, EAVE = 9, LW = 120, LH = 92;

export default function IsoApothecary({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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

  const frame = (
    <g stroke={PAL.timber} strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.7}>
      <line x1={0} y1={3} x2={LW} y2={3} /><line x1={0} y1={LH - 3} x2={LW} y2={LH - 3} />
      {[0, 40, 80, LW].map((x) => <line key={x} x1={x} y1={3} x2={x} y2={LH} />)}
      <line x1={2} y1={5} x2={38} y2={LH - 5} /><line x1={38} y1={5} x2={2} y2={LH - 5} />
      <line x1={82} y1={5} x2={118} y2={LH - 5} /><line x1={118} y1={5} x2={82} y2={LH - 5} />
    </g>
  );

  const BOT_T = ["#7a1d12", "#3a7088", "#6f8a3a", "#dba7c4", "#e0a83a", "#5a3a92"];
  const BOT_M = ["#5a8a72", "#c96442", "#aed3e8", "#f4d262", "#dba7c4"];

  return (
    <g>
      <defs>
        <linearGradient id={id("tealLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#46686a" /><stop offset="1" stopColor="#324e4e" /></linearGradient>
        <linearGradient id={id("tealShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c4444" /><stop offset="1" stopColor="#1c3232" /></linearGradient>
        <linearGradient id={id("tileLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a3320" /><stop offset="1" stopColor="#4e1d10" /></linearGradient>
        <linearGradient id={id("tileShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a2515" /><stop offset="1" stopColor="#3a160a" /></linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />

      {/* SW wall (shade) — door + mortar sign */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("tealShade")})`} />
        {frame}
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.22)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <g data-door="entry">
          <ellipse cx={fc + 30} cy={LH - 22} rx={15} ry={20} fill="#aed3e8" opacity={nearDoor ? 0.34 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc + 30}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc + 18},${LH} L${fc + 18},${LH - 24} a12,12 0 0 1 24,0 L${fc + 42},${LH} Z`} fill={PAL.timber} />
          <path d={`M${fc + 21},${LH} L${fc + 21},${LH - 22} a9,9 0 0 1 18,0 L${fc + 39},${LH} Z`} fill={PAL.timberSoft} />
          <rect x={fc + 24} y={LH - 20} width={12} height={8} fill="#2c1c0e" /><rect x={fc + 25} y={LH - 19} width={10} height={6} fill="#aed3e8" opacity={0.6} />
          <circle cx={fc + 37} cy={LH - 14} r={1.4} fill={PAL.brass} />
        </g>
      </g>

      {/* SE wall (lit) — bottle BAY WINDOW (hero) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("tealLit")})`} />
        {frame}
        <rect x={0} y={0} width={LW} height={4} fill="rgba(180,230,230,.14)" />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.16)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* bay window box */}
        {(() => { const bx = fc, by = LH - 18; return (
          <g>
            <rect x={bx - 34} y={by - 44} width={68} height={48} fill="#1a1410" />
            <rect x={bx - 31} y={by - 41} width={62} height={42} fill="#2c2418" />
            {/* shelves */}
            {[-30, -12, 6].map((sy) => <rect key={sy} x={bx - 31} y={by + sy} width={62} height={2} fill="#5a3a1f" />)}
            {/* three rows of glowing bottles */}
            {BOT_T.map((c, i) => { const px = bx - 26 + i * 10.4; return (
              <g key={`t${i}`}>
                <path d={`M${px - 3},${by - 18} L${px - 3},${by - 25} Q${px - 3},${by - 28} ${px},${by - 28} Q${px + 3},${by - 28} ${px + 3},${by - 25} L${px + 3},${by - 18} Z`} fill={c} />
                <circle cx={px} cy={by - 22} r={1.6} fill="#fbf7eb" opacity={0.5} style={{ animation: `flicker ${1.8 + i * 0.2}s ${i * 0.15}s ease-in-out infinite`, transformOrigin: `${px}px ${by - 22}px` }} />
              </g>
            ); })}
            {BOT_M.map((c, i) => { const px = bx - 22 + i * 11; return (
              <ellipse key={`m${i}`} cx={px} cy={by - 6} rx={3.6} ry={5} fill={c} opacity={0.92} style={{ animation: `flicker ${2 + i * 0.2}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: `${px}px ${by - 6}px` }} />
            ); })}
            {BOT_T.map((c, i) => { const px = bx - 26 + i * 10.4; return <rect key={`b${i}`} x={px - 3} y={by - 2} width={6} height={5} fill={c} opacity={0.9} />; })}
            {/* bay roof */}
            <path d={`M${bx - 38},${by - 44} L${bx - 30},${by - 52} L${bx + 30},${by - 52} L${bx + 38},${by - 44} Z`} fill="#5a2515" />
            <rect x={bx - 38} y={by - 44} width={76} height={2.5} fill="#1a1410" />
          </g>
        ); })()}
      </g>

      {/* eave + dark-tile hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#3a160a" />
      <polygon points={pts(topE, rightE, apex)} fill="#3a160a" />
      {shingles(leftE, bottomE, apex, `url(#${id("tileShade")})`, "rgba(0,0,0,.26)", "rsw", 7)}
      {shingles(rightE, bottomE, apex, `url(#${id("tileLit")})`, "rgba(0,0,0,.2)", "rse", 7)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#1a1410" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
        <g stroke="#8a6a4a" strokeWidth={1.2} opacity={0.7}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
      </g>

      {/* dormer with glowing herbs (on the SE roof slope) */}
      {(() => { const d = { x: rightE.x - 40, y: rightE.y - 20 }; return (
        <g transform={`translate(${d.x} ${d.y})`}>
          <path d="M-7,10 L0,2 L7,10 Z" fill="#5a2515" />
          <rect x={-4} y={5} width={8} height={6} fill="#2c1c0e" /><rect x={-3} y={6} width={6} height={4.5} fill="#ffd98a" opacity={0.7} style={{ animation: "flicker 4s ease-in-out infinite", transformOrigin: "0px 8px" }} />
        </g>
      ); })()}

      {/* chimney + faint blue mist */}
      <Chimney cx={apex.x + 20} cy={apex.y + 30} h={26} half={6} gid={id("tileShade")} />
      <Smoke x={apex.x + 20} y={apex.y - 4} scale={0.7} count={3} dur={5} color="#aed3e8" />

      {/* mortar/pestle hanging sign (sway + bubbles) */}
      {(() => { const base = { x: leftE.x + 6, y: leftT.y + 18 }, arm = { x: base.x + 18, y: base.y }; return (
        <g>
          <line x1={base.x} y1={base.y - 4} x2={arm.x} y2={arm.y - 4} stroke="#3a2715" strokeWidth={2.6} strokeLinecap="round" />
          <g style={{ animation: "sway 5s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y - 4}px` }}>
            <line x1={arm.x} y1={arm.y - 4} x2={arm.x} y2={arm.y + 2} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={arm.x - 11} y={arm.y + 2} width={22} height={16} rx={2} fill="#fbf7eb" stroke="#5a3a1f" strokeWidth={1.2} />
            <path d={`M${arm.x - 5},${arm.y + 14} Q${arm.x - 4},${arm.y + 9} ${arm.x},${arm.y + 9} Q${arm.x + 4},${arm.y + 9} ${arm.x + 5},${arm.y + 14} Z`} fill="#5a8a72" />
            <ellipse cx={arm.x} cy={arm.y + 9} rx={5} ry={1.3} fill="#3a5a5a" />
            <line x1={arm.x} y1={arm.y + 9} x2={arm.x + 5} y2={arm.y + 5} stroke="#5a3a1f" strokeWidth={1.6} strokeLinecap="round" />
            <circle cx={arm.x} cy={arm.y + 7} r={0.6} fill="#7fa848" style={{ "--sx": "0px", animation: "ember 2s ease-out infinite", transformOrigin: `${arm.x}px ${arm.y + 9}px` } as React.CSSProperties} />
          </g>
        </g>
      ); })()}

      {/* herb planter + sleeping cat at base */}
      {(() => { const pl = add(leftT, { x: -2, y: WALL_H + 4 }), cat = add(right, { x: 4, y: 6 }); return (
        <g>
          <g transform={`translate(${pl.x} ${pl.y})`}>
            <rect x={-6} y={-4} width={12} height={4} rx={0.5} fill="#7a5c34" /><ellipse cx={0} cy={-4} rx={6} ry={1.2} fill="#5a3a1f" />
            <g stroke="#4d6b25" strokeWidth={0.7} fill="none"><line x1={-3} y1={-4} x2={-3} y2={-9} /><line x1={0} y1={-4} x2={0} y2={-11} /><line x1={3} y1={-4} x2={3} y2={-8} /></g>
            <ellipse cx={-3} cy={-10} rx={1.4} ry={2.4} fill="#6b8a4a" /><ellipse cx={0} cy={-12} rx={1.2} ry={2.2} fill="#7fa848" /><ellipse cx={3} cy={-9} rx={1.4} ry={1.8} fill="#dba7c4" />
          </g>
          <g transform={`translate(${cat.x} ${cat.y})`}>
            <ellipse cx={0} cy={0} rx={5} ry={1.6} fill="#a55a3a" /><circle cx={-3.4} cy={-1.4} r={1.7} fill="#a55a3a" />
            <path d="M-4.4,-2.6 L-3.8,-1.4 L-3,-2.6 Z" fill="#a55a3a" /><path d="M3,-0.6 Q5,-2 4,-4" stroke="#a55a3a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
