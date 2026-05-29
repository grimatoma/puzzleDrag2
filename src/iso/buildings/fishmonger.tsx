// fishmonger — fish-market stall (NORMAL plot).
// A small blue-plank building under a slate hip roof, fronted on the lit side by
// a striped teal/cream AWNING that shelters an iced DISPLAY COUNTER laid with
// fish (the hero). Fish hang swaying from a rod under the awning, a hanging
// SCALE tips, a chalk price board leans by the door, and a bucket + lobster pot
// sit in the yard. A gull wheels above.

import { useId } from "react";
import { type P, add, pts, panelMatrix, shingles, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Fish-market stall; blue-plank building + slate hip roof, striped awning over an iced fish display counter (hero), swaying hung fish, tipping scale, price board, bucket + lobster pot, wheeling gull.",
};

const HALF_W = 58, HALF_H = 29, WALL_H = 58, ROOF_RISE = 44, EAVE = 9, LW = 120, LH = 92;

export default function IsoFishmonger({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = (dx: number, dy: number, h = 0): P => ({ x: o.x + (dx - dy) * 32, y: o.y + (dx + dy) * 16 - h });
  const right = add(o, { x: HALF_W, y: 0 }), bottom = add(o, { x: 0, y: HALF_H });
  const topT = { x: o.x, y: o.y - HALF_H - WALL_H }, rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H }, leftT = { x: o.x - HALF_W, y: o.y - WALL_H };
  const apex = { x: o.x, y: o.y - WALL_H - ROOF_RISE };
  const eY = (EAVE * HALF_H) / HALF_W;
  const topE = { x: topT.x, y: topT.y - eY }, rightE = { x: rightT.x + EAVE, y: rightT.y };
  const bottomE = { x: bottomT.x, y: bottomT.y + eY }, leftE = { x: leftT.x - EAVE, y: leftT.y };
  const seMatrix = panelMatrix(bottomT, { x: HALF_W, y: -HALF_H }, { x: 0, y: WALL_H });
  const swMatrix = panelMatrix(leftT, { x: HALF_W, y: HALF_H }, { x: 0, y: WALL_H });

  const fish = (cx: number, cy: number, body: string, belly: string) => (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx={0} cy={0} rx={9} ry={2.6} fill={body} /><ellipse cx={0} cy={-0.7} rx={9} ry={1.5} fill={belly} />
      <path d="M9,0 L13,-3 L13,3 Z" fill={body} /><path d="M0,-2.2 L2,-3.6 L4,-2.2 Z" fill={body} />
      <circle cx={-6} cy={-0.7} r={0.9} fill="#fbf7eb" /><circle cx={-6} cy={-0.7} r={0.5} fill="#1a1410" />
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("plankLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b4ccd6" /><stop offset="1" stopColor="#8aa6b4" /></linearGradient>
        <linearGradient id={id("plankShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7e9aa8" /><stop offset="1" stopColor="#5a7888" /></linearGradient>
        <linearGradient id={id("slateLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#566678" /><stop offset="1" stopColor="#384452" /></linearGradient>
        <linearGradient id={id("slateShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3c4856" /><stop offset="1" stopColor="#28323c" /></linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={HALF_W + 18} ry={HALF_H + 6} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x} cy={o.y} rx={HALF_W - 6} ry={HALF_H - 6} fill="rgba(80,150,180,.14)" />

      {/* SW wall (shade) — door + price board */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plankShade")})`} />
        <g stroke="#5a7888" strokeWidth={0.7} opacity={0.6}>{Array.from({ length: 9 }, (_, i) => 12 + i * 12).map((x) => <line key={x} x1={x} y1={0} x2={x} y2={LH} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={LH - 9} width={LW} height={9} fill={PAL.stoneShade} />
        <g data-door="entry">
          <rect x={LW / 2 - 13} y={LH - 40} width={26} height={40} fill="#3a4654" />
          {nearDoor && <rect x={LW / 2 - 13} y={LH - 40} width={26} height={40} fill="#ff8a28" opacity={0.24} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${LW / 2}px ${LH - 20}px` }} />}
          <rect x={LW / 2 - 10} y={LH - 37} width={20} height={34} fill="#5a3a1f" />
          <circle cx={LW / 2 + 6} cy={LH - 18} r={1.4} fill={PAL.brass} />
        </g>
      </g>

      {/* SE wall (lit) */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("plankLit")})`} />
        <g stroke="#5a7888" strokeWidth={0.7} opacity={0.5}>{Array.from({ length: 9 }, (_, i) => 12 + i * 12).map((x) => <line key={x} x1={x} y1={0} x2={x} y2={LH} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={LW} height={4} fill="rgba(255,255,255,.12)" />
        <rect x={0} y={LH - 9} width={LW} height={9} fill={PAL.stoneShade} />
        {/* dark counter recess behind */}
        <rect x={20} y={LH - 46} width={86} height={40} fill="#2a3640" opacity={0.8} />
      </g>

      {/* eave + slate hip roof */}
      <polyline points={pts(leftT, bottomT, rightT)} fill="none" stroke="#28323c" strokeWidth={3.5} />
      <polygon points={pts(topE, leftE, apex)} fill="#28323c" />
      <polygon points={pts(topE, rightE, apex)} fill="#28323c" />
      {shingles(leftE, bottomE, apex, `url(#${id("slateShade")})`, "rgba(0,0,0,.24)", "rsw", 6)}
      {shingles(rightE, bottomE, apex, `url(#${id("slateLit")})`, "rgba(0,0,0,.2)", "rse", 6)}
      <polyline points={pts(leftE, bottomE, rightE)} fill="none" stroke="#1a222a" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round"><g stroke="rgba(0,0,0,.4)" strokeWidth={2.4}><line x1={apex.x} y1={apex.y} x2={bottomE.x} y2={bottomE.y} /><line x1={apex.x} y1={apex.y} x2={rightE.x} y2={rightE.y} /><line x1={apex.x} y1={apex.y} x2={leftE.x} y2={leftE.y} /></g></g>

      {/* hanging fish from a rod under the SE eave (sway) */}
      {[-0.5, 0, 0.5].map((dgy, i) => {
        const r = gp(0.95, dgy, WALL_H - 8);
        return (
          <g key={i} transform={`translate(${r.x} ${r.y})`}>
            <line x1={0} y1={0} x2={0} y2={6} stroke="#3a2715" strokeWidth={0.6} />
            <g transform="translate(0 10)" style={{ animation: `sway ${3 + i * 0.3}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: "0px -4px" }}>
              <ellipse cx={0} cy={0} rx={4.5} ry={1.6} fill="#c89570" /><ellipse cx={0} cy={-0.4} rx={4.5} ry={1} fill="#e8c39a" />
              <path d="M0,-1.6 L0,1.6 L-2.4,2.6 L-2.4,-2.6 Z" fill="#a87a5a" /><circle cx={3} cy={-0.5} r={0.4} fill="#1a1410" />
            </g>
          </g>
        );
      })}

      {/* ===== STRIPED AWNING over the SE front ===== */}
      {(() => {
        // awning quad: high at the wall (SE eave), low + forward at the front
        const wl = gp(-1.0, 1.0, WALL_H - 6), wr = gp(1.0, 1.0, WALL_H - 6);
        const fl = gp(-1.05, 2.05, WALL_H - 24), fr = gp(1.05, 2.05, WALL_H - 24);
        const strips: JSX.Element[] = [];
        const n = 9;
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n;
          const a = lerp(wl, wr, t0), b = lerp(wl, wr, t1), c = lerp(fl, fr, t1), d = lerp(fl, fr, t0);
          strips.push(<polygon key={i} points={pts(a, b, c, d)} fill={i % 2 ? "#327088" : "#f4f0e2"} />);
        }
        // scalloped front edge
        const scal: JSX.Element[] = [];
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n; const a = lerp(fl, fr, t0), b = lerp(fl, fr, t1);
          scal.push(<path key={i} d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + 4} ${b.x},${b.y} Z`} fill={i % 2 ? "#327088" : "#f4f0e2"} />);
        }
        return <g>{strips}{scal}<polyline points={pts(wl, wr)} fill="none" stroke="#28323c" strokeWidth={2} /></g>;
      })()}

      {/* ===== DISPLAY COUNTER with ice + fish (hero), in front ===== */}
      {(() => {
        const a = gp(-1.0, 1.6, 0), b = gp(1.0, 1.6, 0), c = gp(1.0, 2.4, 0), d = gp(-1.0, 2.4, 0);
        const TH_ = 22;
        const aT = { x: a.x, y: a.y - TH_ }, bT = { x: b.x, y: b.y - TH_ }, cT = { x: c.x, y: c.y - TH_ }, dT = { x: d.x, y: d.y - TH_ };
        return (
          <g>
            {/* front + side faces */}
            <polygon points={pts(d, c, cT, dT)} fill="#5a3a1f" />
            <polygon points={pts(b, c, cT, bT)} fill="#3a2715" />
            {/* ice top */}
            <polygon points={pts(aT, bT, cT, dT)} fill="#cfe4ee" />
            <polygon points={pts(aT, bT, cT, dT)} fill="rgba(255,255,255,.25)" />
            {/* fish laid on ice */}
            {fish(lerp(aT, cT, 0.32).x, lerp(aT, cT, 0.4).y, "#7c858d", "#bcc4c8")}
            {fish(lerp(aT, cT, 0.55).x, lerp(aT, cT, 0.55).y, "#c89570", "#e8c39a")}
            {fish(lerp(aT, cT, 0.75).x, lerp(aT, cT, 0.7).y, "#7c858d", "#bcc4c8")}
            {/* lemon wedges */}
            <circle cx={lerp(aT, cT, 0.46).x - 12} cy={lerp(aT, cT, 0.46).y} r={1.6} fill="#f4d262" />
          </g>
        );
      })()}

      {/* hanging scale (tips) + price board, on the SW/front-left */}
      {(() => { const sc = gp(-1.25, 1.0, WALL_H - 18), pb = gp(-1.4, 1.7, 0); return (
        <g>
          <g transform={`translate(${sc.x} ${sc.y})`}>
            <line x1={0} y1={0} x2={0} y2={-6} stroke="#3a2715" strokeWidth={0.9} />
            <g style={{ animation: "sway 3s ease-in-out infinite", transformOrigin: "0px -6px" }}>
              <line x1={-7} y1={-6} x2={7} y2={-6} stroke="#3a2715" strokeWidth={1} />
              <path d="M-10,-6 L-4,-6 L-5,-3 L-9,-3 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth={0.4} />
              <path d="M4,-6 L10,-6 L9,-3 L5,-3 Z" fill="#bcc4c8" stroke="#3a3530" strokeWidth={0.4} />
            </g>
          </g>
          <g transform={`translate(${pb.x} ${pb.y})`}>
            <rect x={-1} y={-22} width={2} height={22} fill="#5a3a1f" />
            <rect x={-9} y={-34} width={18} height={14} fill="#2a1a10" /><rect x={-8} y={-33} width={16} height={12} fill="#3a2715" />
            <text x={0} y={-29} textAnchor="middle" fontFamily="Georgia, serif" fontSize={3.4} fontWeight={700} fill="#fbf7eb">CATCH</text>
            <text x={0} y={-25} textAnchor="middle" fontFamily="Georgia, serif" fontSize={3} fill="#cfe4ee">Cod · 3</text>
          </g>
        </g>
      ); })()}

      {/* bucket + lobster pot props */}
      {(() => { const bk = gp(1.6, 1.6, 0), lp = gp(1.9, 0.9, 0); return (
        <g>
          <g transform={`translate(${bk.x} ${bk.y})`}><path d="M-5,0 L-6,-7 L6,-7 L5,0 Z" fill="#3a3d44" /><ellipse cx={0} cy={-7} rx={6} ry={1.4} fill="#7c858d" /><path d="M-2,-9 L-3,-13 L-1,-13 Z" fill="#bcc4c8" /></g>
          <g transform={`translate(${lp.x} ${lp.y})`}><path d="M-6,0 L-7,-7 L7,-7 L6,0 Z" fill="#a98a5a" /><g stroke="#7a5c34" strokeWidth={0.4} fill="none"><path d="M-7,-5 L7,-5" /><path d="M-7,-3 L7,-3" /></g><ellipse cx={0} cy={-7} rx={7} ry={1.4} fill="#7a5c34" /></g>
        </g>
      ); })()}

      {/* gull wheeling above */}
      <g transform={`translate(${gp(0.5, 0, WALL_H + 40).x} ${gp(0.5, 0, WALL_H + 40).y})`}>
        <g style={{ animation: "walk 16s linear infinite alternate", transformOrigin: "0 0", ["--end" as string]: "34px" } as React.CSSProperties}>
          <g style={{ animation: "flap 0.45s ease-in-out infinite", transformOrigin: "0 0" }}>
            <path d="M-5,1 Q-2,-3 0,0 Q2,-3 5,1" stroke="#3a2715" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </g>
  );
}
