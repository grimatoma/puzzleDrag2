// kitchen — open-fronted cook-house (NORMAL plot).
// Shape tells the story: the lit face is an OPEN cooking bay (timber posts + a
// lintel, no wall) revealing a stone hearth with a roaring fire, a SPIT-ROAST
// turning over it and a hanging cauldron — all under a big tapering plaster
// SMOKE-HOOD that funnels up through the roof into a smoking flue. Hanging game,
// a window of herbs on the side, a woodpile and a water barrel finish it.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL, Smoke, Steam } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Open cook-house: open-fronted bay with hearth fire + turning spit-roast + hanging cauldron under a big tapering smoke-hood/flue (hero), hanging game, herb window, woodpile, water barrel.",
};

export default function IsoKitchen({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));
  const x0 = -0.5, x1 = 1.0, y0 = -0.8, y1 = 0.8, H = 56, RISE = 44, ov = 0.14;

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1ddb2" /><stop offset="1" stopColor="#d8bf8c" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("hood")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7a6a4c" /><stop offset="0.5" stopColor="#a89372" /><stop offset="1" stopColor="#82714f" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#9c3f24" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6a2916" /></linearGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.7" r="0.7"><stop offset="0" stopColor="#fff3c8" /><stop offset="0.45" stopColor="#ffb43a" /><stop offset="0.85" stopColor="#e0561c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={78} ry={30} fill="rgba(0,0,0,.3)" />
      <ellipse cx={gp(x1, 0, 0).x - 4} cy={gp(x1, 0, 0).y + 2} rx={30} ry={11} fill="rgba(255,150,50,.2)" style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: `${gp(x1, 0, 0).x}px ${gp(x1, 0, 0).y}px` }} />

      {/* ===== back/left walls (closed) ===== */}
      {/* +gy long wall (shade) — herb window */}
      <g transform={swW(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterShade")})`} />
        <g stroke="#6a4a28" strokeWidth={2.4} vectorEffect="non-scaling-stroke" opacity={0.55}><line x1={0} y1={3} x2={120} y2={3} /><line x1={0} y1={88} x2={120} y2={88} /><line x1={2} y1={3} x2={2} y2={92} /><line x1={60} y1={3} x2={60} y2={92} /></g>
        <rect x={0} y={88} width={120} height={4} fill={PAL.stoneShade} />
        <rect x={20} y={26} width={20} height={22} fill="#2c1c0e" /><rect x={22} y={28} width={16} height={18} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3.3s ease-in-out infinite", transformOrigin: "30px 37px" }} />
        {/* hanging herbs/onions */}
        {[78, 90, 102].map((x, i) => <g key={x} transform={`translate(${x} 12)`} style={{ animation: `sway ${3 + i * 0.3}s ${i * 0.2}s ease-in-out infinite`, transformOrigin: `${x}px 12px` }}><line x1={0} y1={0} x2={0} y2={4} stroke="#2c2012" strokeWidth={0.8} /><ellipse cx={0} cy={8} rx={2.4} ry={4} fill={i % 2 ? "#c8a050" : "#9060a8"} /></g>)}
      </g>

      {/* interior back (the -gx inner face, seen through the open front) */}
      <polygon points={pts(gp(x0, y0, 0), gp(x0, y1, 0), gp(x0, y1, H), gp(x0, y0, H))} fill="#241a10" />
      <polygon points={pts(gp(x0, y0, 0), gp(x1, y0, 0), gp(x1, y0, H), gp(x0, y0, H))} fill="#1c140c" />

      {/* ===== HEARTH + SPIT-ROAST inside the open bay (screen space) ===== */}
      {(() => { const c = gp(x1 - 0.32, 0, 0); const cx = c.x, by = c.y; return (
        <g>
          {/* stone hearth platform */}
          <ellipse cx={cx} cy={by} rx={26} ry={8} fill={PAL.stoneShade} /><ellipse cx={cx} cy={by - 2} rx={24} ry={6.5} fill={PAL.stone} />
          {/* logs + fire */}
          <g style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: `${cx}px ${by - 4}px` }}><path d={`M${cx - 14},${by - 2} Q${cx - 6},${by - 22} ${cx},${by - 8} Q${cx + 6},${by - 22} ${cx + 14},${by - 2} Z`} fill={`url(#${id("fire")})`} /></g>
          <g style={{ animation: "flicker 1.1s .2s ease-in-out infinite", transformOrigin: `${cx}px ${by - 6}px` }}><path d={`M${cx - 7},${by - 2} Q${cx - 2},${by - 16} ${cx},${by - 6} Q${cx + 2},${by - 16} ${cx + 7},${by - 2} Z`} fill="#ffe07a" /></g>
          {[0, 0.7, 1.4].map((d, i) => <circle key={i} cx={cx + (i % 2 ? 6 : -6)} cy={by - 4} r={1.1} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 7 : -7}px`, animation: `ember 2.6s ${d}s ease-out infinite`, transformOrigin: `${cx}px ${by - 4}px` } as React.CSSProperties} />)}
          {/* spit uprights + turning roast */}
          <line x1={cx - 18} y1={by - 24} x2={cx - 18} y2={by - 2} stroke="#3a3530" strokeWidth={2} /><line x1={cx + 18} y1={by - 24} x2={cx + 18} y2={by - 2} stroke="#3a3530" strokeWidth={2} />
          <line x1={cx - 22} y1={by - 22} x2={cx + 22} y2={by - 22} stroke="#5b5346" strokeWidth={2} />
          <g style={{ animation: "v2spin 5s linear infinite", transformOrigin: `${cx}px ${by - 22}px` }}><ellipse cx={cx} cy={by - 22} rx={9} ry={5.5} fill="#9a5a32" /><ellipse cx={cx} cy={by - 23} rx={6.5} ry={3.6} fill="#c47a44" /><circle cx={cx - 3} cy={by - 23} r={1} fill="#7a3d24" /></g>
          {/* crank handle */}
          <line x1={cx + 22} y1={by - 22} x2={cx + 26} y2={by - 18} stroke="#3a3530" strokeWidth={1.6} />
        </g>
      ); })()}

      {/* steam/savoury wisp from the roast */}
      {(() => { const s = gp(x1 - 0.32, 0, 30); return <g transform={`translate(${s.x} ${s.y})`}><Steam x={0} y={0} scale={0.8} count={3} /></g>; })()}

      {/* ===== OPEN-FRONT timber posts + lintel ===== */}
      {(() => { const pA = gp(x1, y0, 0), pAt = gp(x1, y0, H), pB = gp(x1, y1, 0), pBt = gp(x1, y1, H); const dc = gp(x1, 0, 14); return (
        <g data-door="entry">
          {nearDoor && <ellipse cx={dc.x} cy={dc.y} rx={20} ry={26} fill="#ffcf6a" opacity={0.34} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${dc.x}px ${dc.y}px` }} />}
          <line x1={pA.x} y1={pA.y} x2={pAt.x} y2={pAt.y} stroke="#5a3a1f" strokeWidth={6} strokeLinecap="round" />
          <line x1={pB.x} y1={pB.y} x2={pBt.x} y2={pBt.y} stroke="#4a2e14" strokeWidth={6} strokeLinecap="round" />
          <line x1={pAt.x} y1={pAt.y} x2={pBt.x} y2={pBt.y} stroke="#3a2715" strokeWidth={5} strokeLinecap="round" />
          {/* knee braces */}
          <line x1={pAt.x} y1={pAt.y} x2={lerp(pA, pAt, 0.7).x + 10} y2={lerp(pA, pAt, 0.7).y} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
        </g>
      ); })()}

      {/* ===== ROOF (terracotta gable, ridge along gx) ===== */}
      {(() => {
        const eL = gp(x0 - ov, y1 + ov, H), eR = gp(x1 + ov, y1 + ov, H);
        const rL = gp(x0 - ov, 0, H + RISE), rR = gp(x1 + ov, 0, H + RISE);
        const s: JSX.Element[] = [];
        for (let i = 1; i < 6; i++) { const a = lerp(eL, rL, i / 6), b = lerp(eR, rR, i / 6); s.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.2)" strokeWidth={1} />); }
        return (
          <g>
            <polygon points={pts(gp(x0 - ov, y0 - ov, H), rL, rR, gp(x1 + ov, y0 - ov, H))} fill="#6a2916" />
            <polygon points={pts(eL, eR, rR, rL)} fill={`url(#${id("terraLit")})`} />{s}
            {/* +gx gable triangle (over the open bay) */}
            <polygon points={pts(gp(x1 + ov, y1 + ov, H), gp(x1 + ov, y0 - ov, H), gp(x1 + ov, 0, H + RISE))} fill={`url(#${id("terraShade")})`} />
            <polyline points={pts(eL, eR)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
            <polyline points={pts(gp(x1 + ov, y1 + ov, H), gp(x1 + ov, 0, H + RISE), gp(x1 + ov, y0 - ov, H))} fill="none" stroke="#3a160a" strokeWidth={2.5} />
            <polyline points={pts(rL, rR)} fill="none" stroke={PAL.ridge} strokeWidth={1.4} opacity={0.75} />
          </g>
        );
      })()}

      {/* ===== SMOKE-HOOD funnel rising from the hearth through the roof ===== */}
      {(() => {
        const hc = gp(x1 - 0.32, 0, 0).x; // hood centred over the hearth (screen x)
        const hbX = gp(x1 - 0.32, 0, 0); const baseY = hbX.y - 48; // hood mouth well above the fire/spit
        const fluX = gp(0.15, 0, H + RISE + 6).x, fluTopY = gp(0.15, 0, H + RISE + 30).y;
        // hood: wide funnel mouth tapering to a flue that exits the ridge
        return (
          <g>
            <path d={`M${hc - 16},${baseY} L${hc + 16},${baseY} L${fluX + 7},${gp(0.15, 0, H + RISE + 6).y} L${fluX - 7},${gp(0.15, 0, H + RISE + 6).y} Z`} fill={`url(#${id("hood")})`} />
            <path d={`M${hc - 16},${baseY} L${fluX - 7},${gp(0.15, 0, H + RISE + 6).y} L${fluX - 7},${gp(0.15, 0, H + RISE + 6).y} L${hc - 24},${baseY} Z`} fill="rgba(0,0,0,.12)" />
            <line x1={hc - 24} y1={baseY} x2={hc + 16} y2={baseY} stroke="#3a2715" strokeWidth={2} />
            {/* flue stack */}
            <rect x={fluX - 7} y={fluTopY} width={14} height={gp(0.15, 0, H + RISE + 6).y - fluTopY} fill="#9c8c70" />
            <rect x={fluX - 9} y={fluTopY - 4} width={18} height={5} fill="#7a6c52" />
            <Smoke x={fluX} y={fluTopY - 4} scale={1.2} count={4} dur={4.4} color="#d8ccb0" />
          </g>
        );
      })()}

      {/* woodpile + water barrel (front-left) */}
      {(() => { const wp = gp(-0.55, 0.7, 0), wb = gp(0.4, 1.4, 0); return (
        <g>
          <g transform={`translate(${wp.x} ${wp.y})`}><ellipse cx={0} cy={2} rx={13} ry={3} fill="rgba(0,0,0,.26)" />{[-2, -6, -10].map((yy, r) => <g key={r}>{[-7, 7].map((dx) => <g key={dx} transform={`translate(${dx} ${yy})`}><ellipse cx={0} cy={0} rx={4.5} ry={3} fill="#a4824e" /><ellipse cx={0} cy={0} rx={3} ry={1.8} fill="#6a4e30" /></g>)}</g>)}</g>
          <g transform={`translate(${wb.x} ${wb.y})`}><ellipse cx={0} cy={2} rx={9} ry={2.4} fill="rgba(0,0,0,.28)" /><path d="M-8,0 Q-9,-12 0,-13 Q9,-12 8,0 Q0,3 -8,0 Z" fill="#6a4a28" /><ellipse cx={0} cy={-13} rx={8} ry={2.2} fill="#3a7088" /><ellipse cx={-2} cy={-13.5} rx={3} ry={0.8} fill="#cfe4ee" opacity={0.6} /><path d="M-9,-7 Q0,-5 9,-7" fill="none" stroke="#3a2715" strokeWidth={1.2} /></g>
        </g>
      ); })()}
    </g>
  );
}
