// Premium true-isometric forge. Same panel-projection technique as the v2
// redraw (draw a rich flat panel in local coords, project onto the iso plane
// with an affine matrix), but pushed to a professional finish: gradient-shaded
// brick with beveled courses + ambient occlusion, an individually-shingled
// slate hip roof, a layered glowing furnace with embers, gradient-lit mullioned
// windows, two gradient chimneys, and a full prop set (anvil, bellows, tongs
// rack, coal bucket). Gradients are namespaced with useId so multiple instances
// don't collide. Strokes use vector-effect="non-scaling-stroke" to stay crisp.

import { useId } from "react";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import { TILE_W, TILE_H } from "../isoMath.js";
import { type P, add, pts, panelMatrix, brick, shingles, Chimney } from "../isoKit.jsx";

const HALF_W = TILE_W; // center → left/right footprint corner (x)
const HALF_H = TILE_H; // center → front/back footprint corner (y)
const WALL_H = 74; // wall height (footprint → eave)
const ROOF_RISE = 58; // apex height above eave
const EAVE = 9; // roof overhang past walls (px)
const LW = 120; // wall panel local width
const LH = 92; // wall panel local height

export default function IsoForgePremium({
  originX,
  originY,
  nearDoor = false,
}: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };

  const right = add(o, { x: HALF_W, y: 0 });
  const bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H };
  const rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H };
  const leftT = { x: o.x - HALF_W, y: o.y - WALL_H };

  const apex = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * TILE_H) / TILE_W;
  const topE = { x: topT.x, y: topT.y - eY };
  const rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY };
  const leftE = { x: leftT.x - EAVE, y: leftT.y };

  const seMatrix = panelMatrix(bottomT, { x: HALF_W, y: -HALF_H }, { x: 0, y: WALL_H });
  const swMatrix = panelMatrix(leftT, { x: HALF_W, y: HALF_H }, { x: 0, y: WALL_H });

  const fc = LW / 2; // furnace/ door center x in local space

  return (
    <g>
      <defs>
        <linearGradient id={id("brickLit")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a05636" />
          <stop offset="0.5" stopColor="#8a4a30" />
          <stop offset="1" stopColor="#6a3320" />
        </linearGradient>
        <linearGradient id={id("brickShade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5e3320" />
          <stop offset="1" stopColor="#3f2014" />
        </linearGradient>
        <linearGradient id={id("slateLit")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c7466" />
          <stop offset="1" stopColor="#565045" />
        </linearGradient>
        <linearGradient id={id("slateShade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#544d42" />
          <stop offset="1" stopColor="#3a352d" />
        </linearGradient>
        <radialGradient id={id("furnace")} cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#fff1c0" />
          <stop offset="0.4" stopColor="#ffa83a" />
          <stop offset="0.8" stopColor="#d4541c" />
          <stop offset="1" stopColor="#5a1c08" />
        </radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#f0a836" />
        </radialGradient>
        <linearGradient id={id("chimney")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a5230" />
          <stop offset="1" stopColor="#5a2a18" />
        </linearGradient>
      </defs>

      {/* ground shadow + warm spill + contact AO */}
      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 16} ry={HALF_H + 6} fill="rgba(0,0,0,.30)" />
      <ellipse cx={o.x} cy={o.y + 1} rx={HALF_W - 4} ry={HALF_H - 6} fill="rgba(255,130,40,.10)" />

      {/* ===== SW WALL (shaded) ===== */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickShade")})`} />
        {brick("sw")}
        {/* ambient occlusion at base + under eave */}
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.22)" />
        <rect x={0} y={0} width={LW} height={6} fill="rgba(0,0,0,.18)" />
        {/* stone foundation */}
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* door */}
        <g data-door="forge-entry">
          <ellipse cx={fc} cy={LH - 24} rx={22} ry={28} fill="#ff8a28" opacity={nearDoor ? 0.34 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 24}px` } : undefined} />
          <path d={`M${fc - 16},${LH} L${fc - 16},${LH - 30} a16,16 0 0 1 32,0 L${fc + 16},${LH} Z`} fill="#2c1c0e" />
          <path d={`M${fc - 12},${LH} L${fc - 12},${LH - 28} a12,12 0 0 1 24,0 L${fc + 12},${LH} Z`} fill="#160d06" />
          <path d={`M${fc - 6},${LH} L${fc - 6},${LH - 24} a6,8 0 0 1 12,0 L${fc + 6},${LH} Z`} fill="#a8521f" opacity={0.5} />
          {/* planks + iron hinges */}
          <line x1={fc} y1={LH} x2={fc} y2={LH - 32} stroke="#160d06" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <rect x={fc - 14} y={LH - 22} width={6} height={2} fill="#2c2620" />
          <rect x={fc - 14} y={LH - 10} width={6} height={2} fill="#2c2620" />
        </g>
        {/* bracket lantern */}
        <g>
          <path d={`M${fc + 22},${LH - 50} q9,-2 12,5`} fill="none" stroke="#2c2012" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <circle cx={fc + 34} cy={LH - 34} r={8} fill="#ff8a28" opacity={0.24} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${fc + 34}px ${LH - 34}px` }} />
          <polygon points={`${fc + 34},${LH - 43} ${fc + 39},${LH - 40} ${fc + 39},${LH - 28} ${fc + 34},${LH - 25} ${fc + 29},${LH - 28} ${fc + 29},${LH - 40}`} fill="#2c2012" />
          <rect x={fc + 31} y={LH - 40} width={6} height={11} rx={1} fill={`url(#${id("pane")})`} style={{ animation: "flicker 2.8s ease-in-out infinite", transformOrigin: `${fc + 34}px ${LH - 34}px` }} />
        </g>
        {/* high window */}
        <g>
          <rect x={16} y={18} width={20} height={24} rx={1.5} fill="#2c1c0e" />
          <rect x={18} y={20} width={16} height={20} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: "26px 30px" }} />
          <line x1={26} y1={20} x2={26} y2={40} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <line x1={18} y1={30} x2={34} y2={30} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        </g>
      </g>

      {/* ===== SE WALL (lit) ===== */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickLit")})`} />
        {brick("se")}
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.18)" />
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,225,180,.18)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* windows */}
        {[26, LW - 26].map((cx) => (
          <g key={cx}>
            <rect x={cx - 10} y={16} width={20} height={24} rx={1.5} fill="#2c1c0e" />
            <rect x={cx - 8} y={18} width={16} height={20} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${2.4 + cx * 0.01}s ease-in-out infinite`, transformOrigin: `${cx}px 28px` }} />
            <line x1={cx} y1={18} x2={cx} y2={38} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <line x1={cx - 8} y1={28} x2={cx + 8} y2={28} stroke="#160d06" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            <rect x={cx - 11} y={40} width={22} height={3} rx={1} fill="#7a5c34" />
          </g>
        ))}
        {/* furnace arch */}
        <g>
          <path d={`M${fc - 26},${LH} L${fc - 26},${LH - 54} a26,26 0 0 1 52,0 L${fc + 26},${LH} Z`} fill={PAL.stoneShade} />
          <path d={`M${fc - 21},${LH} L${fc - 21},${LH - 50} a21,21 0 0 1 42,0 L${fc + 21},${LH} Z`} fill="#1a0c02" />
          {/* glowing core */}
          <ellipse cx={fc} cy={LH - 20} rx={18} ry={18} fill={`url(#${id("furnace")})`} style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 20}px` }} />
          <g style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 24}px` }}>
            <path d={`M${fc - 13},${LH} Q${fc - 7},${LH - 34} ${fc},${LH - 20} Q${fc + 7},${LH - 34} ${fc + 13},${LH} Z`} fill="#e07a2a" />
          </g>
          <g style={{ animation: "flicker 1.1s 0.2s ease-in-out infinite", transformOrigin: `${fc}px ${LH - 26}px` }}>
            <path d={`M${fc - 7},${LH} Q${fc - 3},${LH - 26} ${fc},${LH - 18} Q${fc + 3},${LH - 26} ${fc + 7},${LH} Z`} fill="#ffd24a" />
          </g>
          {/* embers */}
          {[0, 0.7, 1.4, 2.1].map((d, i) => (
            <circle key={i} cx={fc + (i % 2 ? 5 : -5)} cy={LH - 16} r={1.1} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 7 : -7}px`, animation: `ember 2.6s ${d}s ease-out infinite`, transformOrigin: `${fc + (i % 2 ? 5 : -5)}px ${LH - 16}px` } as React.CSSProperties} />
          ))}
          <ellipse cx={fc} cy={LH - 50} rx={5} ry={3} fill={PAL.stone} />
          <rect x={fc - 30} y={LH - 4} width={60} height={5} rx={1.5} fill={PAL.stoneShade} />
        </g>
      </g>

      {/* eave beam with under-shadow */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />

      {/* ===== HIP ROOF ===== */}
      <polygon points={pts(topE, leftE, apex)} fill="#3a352d" />
      <polygon points={pts(topE, rightE, apex)} fill="#3a352d" />
      {shingles(leftE, bottomE, apex, `url(#${id("slateShade")})`, "rgba(0,0,0,.25)", "rsw")}
      {shingles(rightE, bottomE, apex, `url(#${id("slateLit")})`, "rgba(0,0,0,.2)", "rse")}
      {/* eave fascia / overhang underside */}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#241f19" strokeWidth={3.5} />
      {/* hip ridges: shadow then highlight */}
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}>
          <line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} />
          <line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} />
          <line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} />
        </g>
        <g stroke={PAL.ridge} strokeWidth={1.4} opacity={0.85}>
          <line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} />
          <line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} />
          <line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} />
        </g>
      </g>
      <circle cx={apex.x} cy={apex.y} r={2.6} fill={PAL.ridge} />

      {/* ===== CHIMNEYS + SMOKE ===== */}
      <Chimney cx={apex.x - 24} cy={apex.y + 34} h={34} half={9} gid={id("chimney")} />
      <Smoke x={apex.x - 24} y={apex.y} scale={1.1} count={4} dur={4.4} color="#c8b898" />
      <Chimney cx={apex.x + 26} cy={apex.y + 46} h={20} half={7} gid={id("chimney")} />
      <Smoke x={apex.x + 26} y={apex.y + 26} scale={0.8} count={3} dur={3.8} color="#a89878" />

      {/* ===== YARD PROPS (screen space, front-right) ===== */}
      {/* anvil on stump */}
      <g transform={`translate(${right.x - 14} ${right.y - 1})`}>
        <ellipse cx={0} cy={0} rx={10} ry={2.8} fill="rgba(0,0,0,.32)" />
        <rect x={-6} y={-10} width={12} height={10} fill="#6a4a28" />
        <ellipse cx={0} cy={-10} rx={6} ry={1.8} fill="#4a3018" />
        <rect x={-7} y={-19} width={14} height={6} rx={1} fill="#5b5346" />
        <path d="M7,-16 L16,-14.5 Q17.5,-13 16,-11.5 L7,-11.5 Z" fill="#3a3530" />
        <rect x={-8} y={-13} width={16} height={2.4} rx={0.6} fill="#3a3530" />
        <line x1={-5} y1={-18} x2={3} y2={-18} stroke="#b6b6b6" strokeWidth={0.8} opacity={0.7} />
      </g>
      {/* bellows */}
      <g transform={`translate(${right.x + 8} ${right.y + 6})`}>
        <ellipse cx={0} cy={1} rx={8} ry={2} fill="rgba(0,0,0,.28)" />
        <path d="M-8,-2 Q-9,-7 -2,-7 L7,-4 L7,2 L-2,4 Q-9,3 -8,-2 Z" fill="#6a4a28" />
        <path d="M-8,-2 Q-9,-7 -2,-7 L-2,4 Q-9,3 -8,-2 Z" fill="#4a2e14" />
        <g stroke="#7a5c34" strokeWidth={0.6} opacity={0.6}><line x1={-4} y1={-5} x2={-4} y2={2} /><line x1={-1} y1={-6} x2={-1} y2={3} /></g>
        <rect x={6} y={-2} width={6} height={2.4} rx={0.8} fill="#5b5346" />
      </g>
      {/* coal bucket */}
      <g transform={`translate(${right.x - 2} ${right.y + 14})`}>
        <ellipse cx={0} cy={0} rx={7} ry={2} fill="rgba(0,0,0,.28)" />
        <path d="M-5,0 L-4,-8 L4,-8 L5,0 Z" fill="#4a443a" />
        <ellipse cx={0} cy={-8} rx={4.6} ry={1.4} fill="#2c2620" />
        <path d="M-4,-8 a4,4 0 0 1 8,0" fill="none" stroke="#2c2620" strokeWidth={1} />
        <g fill="#150d08"><circle cx={-1.5} cy={-9} r={1} /><circle cx={1.5} cy={-9.4} r={1.1} /></g>
      </g>
    </g>
  );
}
