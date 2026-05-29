// housing — snug family cottage (SMALL plot). Shared by housing/housing2/3.
// Shape tells the story (and differs from the hearth): an L-plan cottage where a
// gabled CROSS-WING projects toward the street — a flower-box bay window in its
// gable — meeting the main catslide-thatch range in a valley. A leaning cob
// chimney smokes, a swinging laundry line is strung to a pole, and a little
// vegetable/flower garden + a wiggling bush sit out front.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "L-plan cottage: gabled cross-wing with a flower-box bay projects to the street, meeting a catslide-thatch main range; leaning cob chimney + smoke, swaying laundry line, garden + wiggling bush.",
};

export default function IsoHousing({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seW = (gx: number, a: number, b: number, hb: number, ht: number) => PM(gp(gx, a, ht), gp(gx, b, ht), gp(gx, a, hb));
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));
  // main range runs along +gx (gable to +gx? no — ridge along gx, long walls +/-gy)
  const mx0 = -0.6, mx1 = 0.55, my0 = -0.55, my1 = 0.5, H = 44, RISE = 32, ov = 0.14;
  // cross-wing projects toward +gy (front), gable faces +gy
  const wx0 = -0.5, wx1 = 0.05, wy0 = 0.5, wy1 = 1.15, WH = 40, WRISE = 30;

  const thatchTri = (eA: P, eB: P, ap: P, fill: string, key: string) => { const s: JSX.Element[] = [];
    for (let i = 1; i < 8; i++) { const a = lerp(eA, eB, i / 8); s.push(<line key={`${key}${i}`} x1={a.x} y1={a.y} x2={a.x * 0.12 + ap.x * 0.88} y2={a.y * 0.12 + ap.y * 0.88} stroke="rgba(0,0,0,.13)" strokeWidth={0.6} />); }
    return <g><polygon points={pts(eA, eB, ap)} fill={fill} />{s}</g>; };
  const thatchQuad = (eL: P, eR: P, rR: P, rL: P, fill: string, key: string) => { const s: JSX.Element[] = [];
    for (let i = 1; i < 9; i++) { const a = lerp(eL, rL, i / 9), b = lerp(eR, rR, i / 9); s.push(<line key={`${key}${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.12)" strokeWidth={0.6} />); }
    return <g><polygon points={pts(eL, eR, rR, rL)} fill={fill} />{s}</g>; };

  const Win = (m: string, cx: number, y: number, w: number, h: number, dur: number) => (
    <g transform={m}><rect x={cx - 11} y={y - 6} width={4} height={h + 8} fill="#7fa848" /><rect x={cx + 7} y={y - 6} width={4} height={h + 8} fill="#7fa848" /><rect x={cx - w / 2 - 2} y={y - 2} width={w + 4} height={h + 4} fill="#3a2715" /><rect x={cx - w / 2} y={y} width={w} height={h} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${dur}s ease-in-out infinite`, transformOrigin: `${cx}px ${y + h / 2}px` }} /><line x1={cx} y1={y} x2={cx} y2={y + h} stroke="#3a2715" strokeWidth={1} /><line x1={cx - w / 2} y1={y + h / 2} x2={cx + w / 2} y2={y + h / 2} stroke="#3a2715" strokeWidth={1} />
      {/* flower box */}
      <rect x={cx - w / 2 - 2} y={y + h + 1} width={w + 4} height={4} rx={1} fill="#7a3d24" />{[-5, 0, 5].map((dx, i) => <circle key={i} cx={cx + dx} cy={y + h + 1} r={1.8} fill={["#dba7c4", "#f4d262", "#e58a4f"][i]} />)}
    </g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("cobLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3e0cb" /><stop offset="1" stopColor="#ddc1a6" /></linearGradient>
        <linearGradient id={id("cobShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cba788" /><stop offset="1" stopColor="#a8856a" /></linearGradient>
        <linearGradient id={id("thatchLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8b25e" /><stop offset="1" stopColor="#a8813c" /></linearGradient>
        <linearGradient id={id("thatchShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8813c" /><stop offset="1" stopColor="#7c5c28" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff0b8" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={58} ry={22} fill="rgba(0,0,0,.28)" />

      {/* ===== MAIN RANGE ===== */}
      <g transform={swW(my1, mx0, mx1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("cobShade")})`} /><rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        {/* door (set in the inner corner of the L) */}
        <g data-door="entry">
          {nearDoor && <ellipse cx={96} cy={64} rx={13} ry={17} fill="#ffcf6a" opacity={0.36} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "96px 64px" }} />}
          <path d="M84,92 L84,58 a12,12 0 0 1 24,0 L108,92 Z" fill={PAL.timber} /><path d="M87,92 L87,59 a9,9 0 0 1 18,0 L105,92 Z" fill={PAL.timberSoft} /><circle cx={101} cy={76} r={1.4} fill={PAL.brass} />
        </g>
      </g>
      <g transform={seW(mx1, my0, my1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("cobLit")})`} /><rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" /><rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        {Win("", 60, 34, 18, 22, 3.1)}
      </g>
      {/* main catslide thatch roof (front +gy slope sweeps low) */}
      {(() => { const eL = gp(mx0 - ov, my1 + 0.4, H - 12), eR = gp(mx1 + ov, my1 + 0.4, H - 12), rL = gp(mx0 - ov, 0, H + RISE), rR = gp(mx1 + ov, 0, H + RISE); return (
        <g>
          <polygon points={pts(gp(mx0 - ov, my0 - ov, H), rL, rR, gp(mx1 + ov, my0 - ov, H))} fill="#7c5c28" />
          {thatchQuad(eL, eR, rR, rL, `url(#${id("thatchLit")})`, "m")}
          {thatchTri(gp(mx0 - ov, my1 + 0.4, H - 12), gp(mx0 - ov, my0 - ov, H), gp(mx0 - ov, 0, H + RISE), `url(#${id("thatchShade")})`, "mg")}
          <polyline points={pts(eL, eR)} fill="none" stroke="#6a4e22" strokeWidth={5} strokeLinecap="round" />
          <polyline points={pts(rL, rR)} fill="none" stroke="#e0bc6a" strokeWidth={3.5} strokeLinecap="round" />
        </g>
      ); })()}

      {/* ===== CROSS-WING (projects to +gy, gable to viewer) ===== */}
      <g transform={seW(wx1, wy0, wy1, 0, WH)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("cobLit")})`} /><rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
      </g>
      <g transform={swW(wy1, wx0, wx1, 0, WH)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("cobShade")})`} /><rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.12)" /><rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        {Win("", 60, 32, 20, 22, 2.8)}
      </g>
      {/* wing gable triangle (faces +gy, shaded) */}
      {(() => { const eL = gp(wx0, wy1, WH), eR = gp(wx1, wy1, WH), ap = gp((wx0 + wx1) / 2, wy1, WH + WRISE); const c = { x: (eL.x + eR.x + ap.x) / 3, y: (eL.y + eR.y + ap.y) / 3 - 2 }; return <g><polygon points={pts(eL, eR, ap)} fill={`url(#${id("cobShade")})`} /><rect x={c.x - 4} y={c.y - 4} width={8} height={8} fill="#2c1c0e" /><rect x={c.x - 2.6} y={c.y - 2.6} width={5.2} height={5.2} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3.5s ease-in-out infinite", transformOrigin: `${c.x}px ${c.y}px` }} /></g>; })()}
      {/* wing thatch roof (gable to +gy) */}
      {(() => { const eL = gp(wx0 - ov, wy1 + ov, WH), eR = gp(wx1 + ov, wy1 + ov, WH), rB = gp((wx0 + wx1) / 2, wy0 - ov, WH + WRISE), rF = gp((wx0 + wx1) / 2, wy1 + ov, WH + WRISE); return (
        <g>
          {thatchQuad(gp(wx0 - ov, wy1 + ov, WH), gp(wx0 - ov, wy0 - ov, WH), rB, rF, `url(#${id("thatchShade")})`, "wl")}
          {thatchQuad(eR, gp(wx1 + ov, wy0 - ov, WH), rB, rF, `url(#${id("thatchLit")})`, "wr")}
          <polyline points={pts(rF, rB)} fill="none" stroke="#e0bc6a" strokeWidth={3} strokeLinecap="round" />
          <polyline points={pts(eL, rF, eR)} fill="none" stroke="#6a4e22" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ); })()}

      {/* leaning cob chimney + smoke (rear of main range) */}
      {(() => { const c = gp(mx0 + 0.4, -0.04, H + RISE - 8); const cx = c.x, by = c.y, w = 7, top = by - 28; return (
        <g>
          <polygon points={`${cx - w},${by} ${cx + w},${by} ${cx + w - 3},${top} ${cx - w - 1},${top}`} fill="#a8856a" />
          <polygon points={`${cx - w},${by} ${cx - w + 4},${by} ${cx - w - 1 + 4},${top} ${cx - w - 1},${top}`} fill="#8a6a50" />
          <ellipse cx={cx - 1} cy={top} rx={w} ry={2.4} fill="#5a4530" />
          <Smoke x={cx - 1} y={top - 2} scale={0.85} count={4} dur={4.2} color="#e4d8c0" />
        </g>
      ); })()}

      {/* swaying laundry line (front-right to a pole) */}
      {(() => { const a = gp(mx1, my1 + 0.05, H - 6), pole = gp(1.45, my1 + 0.3, 0), b = { x: pole.x, y: pole.y - 36 }; return (
        <g>
          <line x1={pole.x} y1={pole.y} x2={pole.x} y2={pole.y - 38} stroke="#5a3a1f" strokeWidth={2} strokeLinecap="round" />
          <path d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + 7} ${b.x},${b.y}`} fill="none" stroke="#3a2715" strokeWidth={0.6} />
          {[{ t: 0.42, c: "#aed3e8" }, { t: 0.7, c: "#e58a4f" }].map((g, i) => { const p = lerp(a, b, g.t); return (
            <g key={i} style={{ animation: `sway ${4.4 - i}s ${i * 0.5}s ease-in-out infinite`, transformOrigin: `${p.x}px ${p.y + 3}px` }}>
              <path d={`M${p.x - 4},${p.y + 3} L${p.x + 4},${p.y + 2} L${p.x + 5},${p.y + 11} L${p.x + 1},${p.y + 10} L${p.x + 1},${p.y + 13} L${p.x - 4},${p.y + 12} L${p.x - 4},${p.y + 10} L${p.x - 5},${p.y + 11} Z`} fill={g.c} stroke="rgba(0,0,0,.18)" strokeWidth={0.3} />
            </g>
          ); })}
        </g>
      ); })()}

      {/* veg/flower garden + wiggling bush (front-left) */}
      {(() => { const g = gp(-1.25, my1 + 0.4, 0); return (
        <g>
          {/* tilled rows */}
          <g transform={`translate(${gp(-0.7, my1 + 0.7, 0).x} ${gp(-0.7, my1 + 0.7, 0).y})`}><ellipse cx={0} cy={0} rx={14} ry={5} fill="#5a4028" />{[-6, 0, 6].map((dx) => <g key={dx}><ellipse cx={dx} cy={-1} rx={1.6} ry={1} fill="#4a3420" /><circle cx={dx} cy={-3} r={1.4} fill="#6b8a4a" /></g>)}</g>
          <g transform={`translate(${g.x} ${g.y})`} style={{ animation: "wiggle 3s ease-in-out infinite", transformOrigin: `${g.x}px ${g.y}px` }}>
            <ellipse cx={0} cy={1} rx={8} ry={2} fill="rgba(0,0,0,.2)" /><ellipse cx={0} cy={-4} rx={7} ry={5.5} fill="#5a7a28" /><ellipse cx={0} cy={-5} rx={5.5} ry={4} fill="#7fa848" />
            <circle cx={-2} cy={-7} r={1} fill="#f4d262" /><circle cx={2} cy={-8} r={1} fill="#dba7c4" /><circle cx={0} cy={-9} r={1.1} fill="#e58a4f" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
