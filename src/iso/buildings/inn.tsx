// inn — a grand coaching inn (LARGE plot).
// Shape tells the story: a jettied two-storey HALF-TIMBERED block (the
// oversailing upper floor reads instantly as an old inn), a projecting gabled
// PORCH over the door with a swinging lantern, TWIN brick chimneys smoking from
// big hearths, a row of glowing windows + roof DORMERS, and a tall GALLOWS SIGN
// arching over the road with a hanging tankard board.

import { useId } from "react";
import { type P, makeGp, pts, lerp, quadShingles } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Coaching inn: jettied half-timbered two storeys, projecting gabled porch + lantern, twin smoking chimneys, glowing windows + dormers, tall gallows sign over the road.",
};

export default function IsoInn({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seW = (gx: number, a: number, b: number, hb: number, ht: number) => PM(gp(gx, a, ht), gp(gx, b, ht), gp(gx, a, hb));
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));

  const x0 = -1.15, x1 = 1.15, y0 = -0.7, y1 = 0.7;     // ground footprint
  const H1 = 46, H2 = 42, ov = 0.14;                     // storeys
  const jx0 = x0 - 0.14, jx1 = x1 + 0.14, jy1 = y1 + 0.14; // jettied upper (oversails +gx/+gy)
  const HT = H1 + H2, RISE = 40;

  const pane = id("pane");
  const win = (m: string, cx: number, y: number, w: number, h: number, dur: number) => (
    <g transform={m}><rect x={cx - w / 2 - 2} y={y - 2} width={w + 4} height={h + 4} fill="#2c1c0e" /><rect x={cx - w / 2} y={y} width={w} height={h} fill={`url(#${pane})`} style={{ animation: `flicker ${dur}s ease-in-out infinite`, transformOrigin: `${cx}px ${y + h / 2}px` }} /><line x1={cx} y1={y} x2={cx} y2={y + h} stroke="#2c1c0e" strokeWidth={1.2} /><line x1={cx - w / 2} y1={y + h / 2} x2={cx + w / 2} y2={y + h / 2} stroke="#2c1c0e" strokeWidth={1.2} /><rect x={cx - w / 2 - 2} y={y + h} width={w + 4} height={2.5} fill="#7a5c34" /></g>
  );

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1ddb2" /><stop offset="1" stopColor="#d8bf8c" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9c8056" /></linearGradient>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8a078" /><stop offset="1" stopColor="#8e7650" /></linearGradient>
        <linearGradient id={id("stoneShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a7250" /><stop offset="1" stopColor="#665338" /></linearGradient>
        <linearGradient id={id("terraLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c0623f" /><stop offset="1" stopColor="#8a3620" /></linearGradient>
        <linearGradient id={id("terraShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a3f28" /><stop offset="1" stopColor="#5e2415" /></linearGradient>
        <linearGradient id={id("brick")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a2c1a" /><stop offset="0.5" stopColor="#8a4a30" /><stop offset="1" stopColor="#5a2c1a" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={104} ry={36} fill="rgba(0,0,0,.3)" />

      {/* timber framing helper for upper storey */}
      {(() => {
        const frame = (m: string, braces: boolean) => (
          <g transform={m}>
            <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterLit")})`} />
            <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.16)" />
            <g stroke="#6a4a28" strokeWidth={2.6} vectorEffect="non-scaling-stroke" opacity={0.7}>
              {[2, 40, 80, 118].map((x) => <line key={x} x1={x} y1={2} x2={x} y2={90} />)}
              <line x1={0} y1={3} x2={120} y2={3} /><line x1={0} y1={89} x2={120} y2={89} />
              {braces && <><line x1={4} y1={86} x2={26} y2={50} /><line x1={36} y1={86} x2={14} y2={50} /><line x1={84} y1={86} x2={106} y2={50} /><line x1={116} y1={86} x2={94} y2={50} /></>}
            </g>
          </g>
        );
        return (
          <>
            {/* ===== GROUND STOREY (stone + timber) ===== */}
            <g transform={swW(y1, x0, x1, 0, H1)}>
              <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneShade")})`} />
              <g stroke="rgba(0,0,0,.16)" strokeWidth={0.6}>{[34, 64].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
              <rect x={0} y={86} width={120} height={6} fill="#5b5346" />
              {win("", 24, 30, 16, 22, 3.1)}
              {win("", 96, 30, 16, 22, 2.7)}
            </g>
            <g transform={seW(x1, y0, y1, 0, H1)}>
              <rect x={0} y={0} width={120} height={92} fill={`url(#${id("stoneLit")})`} />
              <g stroke="rgba(0,0,0,.1)" strokeWidth={0.6}>{[34, 64].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
              <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.14)" /><rect x={0} y={86} width={120} height={6} fill="#5b5346" />
              {win("", 30, 30, 16, 22, 3.4)}
              {win("", 90, 30, 16, 22, 2.9)}
            </g>
            {/* jetty soffit (oversail) on +gy and +gx */}
            <polygon points={pts(gp(x0, y1, H1), gp(x1, y1, H1), gp(jx1, jy1, H1), gp(jx0, jy1, H1))} fill="#3a2a18" />
            <polygon points={pts(gp(x1, y0, H1), gp(x1, y1, H1), gp(jx1, jy1, H1), gp(jx1, y0, H1))} fill="#2c1f10" />
            {/* bressumer beam */}
            <polyline points={pts(gp(jx0, jy1, H1), gp(jx1, jy1, H1), gp(jx1, y0, H1))} fill="none" stroke="#3a2715" strokeWidth={3} />

            {/* ===== UPPER STOREY (jettied half-timber) ===== */}
            {frame(swW(jy1, jx0, jx1, H1, HT), true)}
            <g transform={swW(jy1, jx0, jx1, H1, HT)}>{win("", 22, 30, 16, 22, 3.3)}{win("", 60, 30, 16, 22, 2.8)}{win("", 98, 30, 16, 22, 3.6)}</g>
            {frame(seW(jx1, y0, jy1, H1, HT), false)}
            <g transform={seW(jx1, y0, jy1, H1, HT)}>{win("", 30, 30, 16, 22, 3.0)}{win("", 90, 30, 16, 22, 3.5)}</g>
          </>
        );
      })()}

      {/* eave */}
      <polyline points={pts(gp(jx0, jy1, HT), gp(jx1, jy1, HT), gp(jx1, y0, HT))} fill="none" stroke={PAL.eave} strokeWidth={3.5} />

      {/* ===== ROOF (terracotta, ridge along gx) + dormers ===== */}
      {(() => {
        const eL = gp(jx0 - ov, jy1 + ov, HT), eR = gp(jx1 + ov, jy1 + ov, HT);
        const rL = gp(jx0 - ov, 0, HT + RISE), rR = gp(jx1 + ov, 0, HT + RISE);
        return (
          <g>
            <polygon points={pts(gp(jx0 - ov, y0 - ov, HT), rL, rR, gp(jx1 + ov, y0 - ov, HT))} fill="#5e2415" />
            {quadShingles(eL, eR, rR, rL, `url(#${id("terraLit")})`, "rf", 5, 16)}
            <polyline points={pts(eL, eR)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
            <polyline points={pts(rL, rR)} fill="none" stroke={PAL.ridge} strokeWidth={1.4} opacity={0.75} />
            {/* dormers */}
            {[0.3, 0.7].map((u, i) => { const d = lerp(lerp(eL, rL, 0.5), lerp(eR, rR, 0.5), u); return (
              <g key={i}>
                <polygon points={`${d.x - 10},${d.y + 5} ${d.x},${d.y - 6} ${d.x + 10},${d.y + 5}`} fill="#8a3f28" />
                <rect x={d.x - 6} y={d.y + 2} width={12} height={9} fill="#2c1c0e" /><rect x={d.x - 4.5} y={d.y + 3} width={9} height={7} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${3 + i}s ease-in-out infinite`, transformOrigin: `${d.x}px ${d.y + 6}px` }} />
              </g>
            ); })}
          </g>
        );
      })()}

      {/* twin brick chimneys + smoke */}
      {[-0.92, 0.92].map((gx, i) => { const c = gp(gx, -0.1, HT + 8), w = 8, top = c.y - 40; return (
        <g key={i}>
          <polygon points={`${c.x - w},${c.y} ${c.x + w},${c.y} ${c.x + w - 1},${top} ${c.x - w + 1},${top}`} fill={`url(#${id("brick")})`} />
          <g stroke="rgba(0,0,0,.2)" strokeWidth={0.7}>{[0, 1, 2].map((k) => <line key={k} x1={c.x - w + 1} y1={top + 8 + k * 11} x2={c.x + w - 1} y2={top + 8 + k * 11} />)}</g>
          <polygon points={`${c.x - w - 2},${top + 2} ${c.x + w + 2},${top + 2} ${c.x + w + 2},${top - 3} ${c.x - w - 2},${top - 3}`} fill="#5a2c1a" />
          <Smoke x={c.x} y={top - 3} scale={1.0} count={4} dur={4.2 + i * 0.5} color="#d8ccb0" />
        </g>
      ); })}

      {/* ===== PROJECTING GABLED PORCH over the door (front, +gy) ===== */}
      {(() => {
        const px0 = -0.34, px1 = 0.34, py0 = y1 - 0.02, py1 = y1 + 0.7, PH = 38;
        const eaveL = gp(px0, py1, PH), eaveR = gp(px1, py1, PH);
        return (
          <g>
            {/* porch side wall (lit +gx) */}
            <g transform={seW(px1, py0, py1, 0, PH)}><rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterLit")})`} /><rect x={0} y={88} width={120} height={4} fill="#5b5346" /></g>
            {/* porch front (+gy shade) with the door */}
            <g transform={swW(py1, px0, px1, 0, PH)}>
              <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterShade")})`} /><rect x={0} y={88} width={120} height={4} fill="#5b5346" />
              <g data-door="entry">
                {nearDoor && <ellipse cx={60} cy={62} rx={20} ry={26} fill="#ffcf6a" opacity={0.4} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 62px" }} />}
                <path d="M40,92 L40,46 a20,20 0 0 1 40,0 L80,92 Z" fill="#2a1a0a" />
                <rect x={42} y={48} width={16} height={44} fill="#4a2e14" /><rect x={62} y={48} width={16} height={44} fill="#3a2010" />
                <circle cx={58} cy={70} r={1.8} fill={PAL.brass} /><circle cx={64} cy={70} r={1.8} fill={PAL.brass} />
              </g>
            </g>
            {/* porch gable roof (gable to +gy) */}
            <polygon points={pts(gp(px0 - 0.06, py1 + 0.06, PH), gp(px1 + 0.06, py1 + 0.06, PH), gp(px1 + 0.06, py1 - 0.36, PH + 20), gp(px0 - 0.06, py1 - 0.36, PH + 20))} fill={`url(#${id("terraLit")})`} />
            <polygon points={pts(gp(px1 + 0.06, py1 + 0.06, PH), gp(px1 + 0.06, py1 - 0.36, PH + 20), gp(px1 + 0.06, py1 - 0.36 - 0, PH + 20))} fill="#5e2415" />
            <polyline points={pts(eaveL, eaveR)} fill="none" stroke="#3a160a" strokeWidth={2.5} />
            {/* hanging lantern under the porch */}
            {(() => { const lc = gp(0, py1 - 0.18, PH - 6); return (
              <g><line x1={lc.x} y1={lc.y} x2={lc.x} y2={lc.y + 4} stroke="#2c2012" strokeWidth={1} />
                <g style={{ animation: "sway 3.4s ease-in-out infinite", transformOrigin: `${lc.x}px ${lc.y + 4}px` }}>
                  <polygon points={`${lc.x},${lc.y + 5} ${lc.x + 5},${lc.y + 8} ${lc.x + 5},${lc.y + 18} ${lc.x},${lc.y + 21} ${lc.x - 5},${lc.y + 18} ${lc.x - 5},${lc.y + 8}`} fill="#2c2012" />
                  <rect x={lc.x - 3} y={lc.y + 9} width={6} height={9} fill="#ffcf6a" style={{ animation: "flicker 2.6s ease-in-out infinite", transformOrigin: `${lc.x}px ${lc.y + 13}px` }} /></g></g>
            ); })()}
          </g>
        );
      })()}

      {/* ===== GALLOWS SIGN over the road (front-right) ===== */}
      {(() => { const post = gp(1.7, 1.5, 0), top = { x: post.x, y: post.y - 96 }, beamEnd = gp(0.9, 1.5, 0); const be = { x: beamEnd.x, y: beamEnd.y - 92 }; const sgn = { x: (top.x + be.x) / 2, y: (top.y + be.y) / 2 }; return (
        <g>
          <line x1={post.x} y1={post.y} x2={top.x} y2={top.y} stroke="#4a3520" strokeWidth={5} strokeLinecap="round" />
          <line x1={top.x} y1={top.y + 2} x2={be.x} y2={be.y + 2} stroke="#4a3520" strokeWidth={4} strokeLinecap="round" />
          <line x1={post.x} y1={post.y - 40} x2={top.x - 12} y2={top.y + 6} stroke="#4a3520" strokeWidth={2.4} strokeLinecap="round" />
          <g style={{ animation: "sway 3.8s ease-in-out infinite", transformOrigin: `${sgn.x}px ${sgn.y}px` }}>
            <line x1={sgn.x} y1={sgn.y} x2={sgn.x} y2={sgn.y + 4} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={sgn.x - 15} y={sgn.y + 4} width={30} height={22} rx={2} fill="#3a2d1c" stroke="#6a4a28" strokeWidth={1.5} />
            {/* foaming tankard emblem */}
            <rect x={sgn.x - 6} y={sgn.y + 10} width={9} height={11} rx={1} fill="#c8a050" stroke="#7a5c34" strokeWidth={0.6} /><path d={`M${sgn.x + 3},${sgn.y + 12} a3.5,3.5 0 0 1 0,6`} fill="none" stroke="#7a5c34" strokeWidth={1.2} />
            <rect x={sgn.x - 7} y={sgn.y + 8} width={11} height={3} rx={1.4} fill="#fbf7eb" />
          </g>
        </g>
      ); })()}

      {/* mounting block + barrel by the porch */}
      {(() => { const b = gp(-1.4, 1.0, 0); return <g transform={`translate(${b.x} ${b.y})`}><ellipse cx={0} cy={2} rx={9} ry={2} fill="rgba(0,0,0,.28)" /><path d="M-8,0 Q-9,-12 0,-13 Q9,-12 8,0 Q0,3 -8,0 Z" fill="#6a4a28" /><ellipse cx={0} cy={-13} rx={8} ry={2.2} fill="#4a2e14" /><path d="M-9,-7 Q0,-5 9,-7" fill="none" stroke="#3a2715" strokeWidth={1.2} /><path d="M-9,-2 Q0,0 9,-2" fill="none" stroke="#3a2715" strokeWidth={1.2} /></g>; })()}
    </g>
  );
}
