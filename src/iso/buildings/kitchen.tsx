// kitchen — communal cook-house (NORMAL plot).
// Warm plaster walls + terracotta hip roof, with an open arched hearth bay on
// the lit face: a fire with a hanging CAULDRON (the hero) billowing steam. A
// rack of hanging POTS, bundles of drying HERBS under the eave, a smoking
// chimney, a veg basket and a chopping board. Shares the bakery scaffold.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, Chimney, Window } from "../isoKit.jsx";
import { PAL, Smoke, Steam } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Cook-house; open hearth bay with hanging cauldron over fire + steam (hero), hanging pots, drying herb bundles, terracotta hip roof, chimney smoke + embers, veg basket + chopping board.",
};

const HALF_W = 62, HALF_H = 31, WALL_H = 70, ROOF_RISE = 50, EAVE = 9, LW = 120, LH = 92;

export default function IsoKitchen({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
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
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3ddae" /><stop offset="1" stopColor="#dcc188" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c4aa72" /><stop offset="1" stopColor="#9e8252" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c0623f" /><stop offset="1" stopColor="#853620" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#933f26" /><stop offset="1" stopColor="#5e2415" /></linearGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.7" r="0.6"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.5" stopColor="#ffa83a" /><stop offset="1" stopColor="#a3340c" /></radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 8} ry={HALF_H - 6} fill="rgba(255,160,70,.12)" />

      {/* SW wall (shade) — door + window + herb bundles under eave */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterShade")})`} />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <g data-door="entry">
          <ellipse cx={fc} cy={LH - 22} rx={18} ry={24} fill="#ff8a28" opacity={nearDoor ? 0.32 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 22}px` } : undefined} />
          <path d={`M${fc - 13},${LH} L${fc - 13},${LH - 24} a13,13 0 0 1 26,0 L${fc + 13},${LH} Z`} fill={PAL.timber} />
          <path d={`M${fc - 10},${LH} L${fc - 10},${LH - 22} a10,10 0 0 1 20,0 L${fc + 10},${LH} Z`} fill="#3a2010" />
          <circle cx={fc + 7} cy={LH - 16} r={1.4} fill={PAL.brass} />
        </g>
        <Window cx={26} y={26} w={18} h={22} id={id} lit dur={3.2} />
        {/* herb bundles hanging under the eave */}
        {[70, 84, 98].map((x, i) => (
          <g key={x} transform={`translate(${x} 8)`}>
            <line x1={0} y1={0} x2={0} y2={4} stroke="#3a2715" strokeWidth={0.9} />
            <path d="M-2.6,4 L-1.4,11 L0,5 L1.4,11 L2.6,4 Z" fill={i % 2 ? "#6f8a3a" : "#a98a4a"} />
          </g>
        ))}
      </g>

      {/* SE wall (lit) — open hearth bay with hanging cauldron (hero) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plasterLit")})`} />
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,235,200,.18)" />
        <rect x={0} y={LH - 11} width={LW} height={11} fill="rgba(0,0,0,.14)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        <Window cx={26} y={16} w={18} h={20} id={id} lit dur={2.8} />
        {/* open arched bay */}
        <path d={`M${fc + 6},${LH} L${fc + 6},${LH - 46} a30,30 0 0 1 60,0 L${fc + 66},${LH} Z`} fill="#3a160a" />
        <path d={`M${fc + 11},${LH} L${fc + 11},${LH - 42} a25,25 0 0 1 50,0 L${fc + 61},${LH} Z`} fill="#24140a" />
        {/* fire on the hearth floor */}
        <rect x={fc + 22} y={LH - 6} width={28} height={6} fill="#1a1410" />
        <g style={{ animation: "flicker 1.4s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 8}px` }}>
          <path d={`M${fc + 24},${LH - 4} Q${fc + 30},${LH - 16} ${fc + 36},${LH - 8} Q${fc + 42},${LH - 16} ${fc + 48},${LH - 4} Z`} fill={`url(#${id("fire")})`} />
        </g>
        <g style={{ animation: "flicker 1.1s 0.2s ease-in-out infinite", transformOrigin: `${fc + 36}px ${LH - 10}px` }}>
          <path d={`M${fc + 30},${LH - 4} Q${fc + 33},${LH - 13} ${fc + 36},${LH - 7} Q${fc + 39},${LH - 13} ${fc + 42},${LH - 4} Z`} fill="#ffc24a" />
        </g>
        {/* trammel hook + hanging cauldron */}
        <line x1={fc + 36} y1={LH - 46} x2={fc + 36} y2={LH - 26} stroke="#3a3530" strokeWidth={1.4} />
        <ellipse cx={fc + 36} cy={LH - 24} rx={13} ry={4} fill="#2c2620" />
        <path d={`M${fc + 23},${LH - 24} Q${fc + 22},${LH - 12} ${fc + 36},${LH - 10} Q${fc + 50},${LH - 12} ${fc + 49},${LH - 24} Z`} fill="#3a3530" />
        <path d={`M${fc + 25},${LH - 22} Q${fc + 26},${LH - 17} ${fc + 30},${LH - 16}`} stroke="#7c858d" strokeWidth={1} fill="none" opacity={0.6} />
        <path d={`M${fc + 23},${LH - 26} a13,5 0 0 1 26,0`} fill="none" stroke="#2c2620" strokeWidth={1.4} />
      </g>

      {/* steam from the cauldron */}
      {(() => { const s = { x: right.x - 28, y: right.y - 30 }; return (
        <g transform={`translate(${s.x} ${s.y})`}><Steam x={0} y={0} scale={0.85} count={4} /></g>
      ); })()}

      {/* eave + terracotta hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#5e2415" />
      <polygon points={pts(topE, rightE, apex)} fill="#5e2415" />
      {shingles(leftE, bottomE, apex, `url(#${id("terraShade")})`, "rgba(0,0,0,.22)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("terraLit")})`, "rgba(0,0,0,.18)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
        <g stroke={PAL.ridge} strokeWidth={1.3} opacity={0.8}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g>
      </g>

      {/* chimney + smoke + embers */}
      <Chimney cx={apex.x + 22} cy={apex.y + 30} h={32} half={7} gid={id("terraShade")} />
      <Smoke x={apex.x + 22} y={apex.y - 4} scale={0.9} count={3} dur={4.2} color="#e8dcc2" />

      {/* hanging pots rack (front-left, under eave on the SW side) + veg basket */}
      {(() => { const b = add(leftT, { x: 2, y: 24 }); const veg = add(leftT, { x: -4, y: WALL_H + 2 }); return (
        <g>
          <g transform={`translate(${b.x} ${b.y})`}>
            <line x1={-12} y1={0} x2={12} y2={0} stroke="#3a2715" strokeWidth={1.4} />
            <g transform="translate(-8 0)"><line x1={0} y1={0} x2={0} y2={4} stroke="#3a2715" strokeWidth={0.6} /><path d="M-3,4 q3,5 6,0 Z" fill="#7c858d" /></g>
            <g transform="translate(0 0)"><line x1={0} y1={0} x2={0} y2={3} stroke="#3a2715" strokeWidth={0.6} /><rect x={-3} y={3} width={6} height={4} rx={0.5} fill="#bda268" /></g>
            <g transform="translate(8 0)"><line x1={0} y1={0} x2={0} y2={3} stroke="#3a2715" strokeWidth={0.6} /><ellipse cx={0} cy={5} rx={2.5} ry={1.5} fill="#a55a3a" /></g>
          </g>
          <g transform={`translate(${veg.x} ${veg.y})`}>
            <path d="M-7,0 L-6,-6 L6,-6 L7,0 Z" fill="#7a5c34" /><ellipse cx={0} cy={-6} rx={7} ry={1.6} fill="#5a3a1f" />
            <circle cx={-2.5} cy={-7} r={2.2} fill="#c96442" /><circle cx={2.5} cy={-7} r={1.8} fill="#e0a83a" /><ellipse cx={0} cy={-8.5} rx={2.2} ry={1.2} fill="#7fa848" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
