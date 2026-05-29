// barn — calibration building (LARGE plot, non-cube gambrel massing).
// Reimagined for iso: a long red board-and-batten barn whose ridge runs along
// +gx, so its signature GAMBREL gable end (two-pitch silhouette) faces the lit
// SE side as the hero — big X-brace double doors + loft window below it. The
// long +gy eave wall shows board-and-batten battens; the front roof shows both
// gambrel pitches (steep lower + shallow upper) in shingles. Signature
// animation: hay-dust motes drifting (`bob`) over a hay bale; plus a turning
// weather-vane and a little fence. Demonstrates the Large tier + a roof that is
// deliberately NOT a hip.

import { useId } from "react";
import { type P, makeGp, GroundShadow, quadShingles, pts } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Long gambrel barn; gable end (X-brace doors + loft) faces lit SE. Hay-dust bob, weather-vane, fence. Calibration: Large tier + non-hip roof.",
};

const BOARD_DK = "#7a1d12";

export default function IsoBarn({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);

  // footprint: long along the ridge (gx), shallower in depth (gy)
  const bx0 = -1.35, bx1 = 1.35, by0 = -0.92, by1 = 0.92;
  const H = 80; // wall height
  // gambrel: a STEEP lower flare then a SHALLOW upper pitch (the barn silhouette)
  const kneeGy = 0.78; // pitch break near the eave → short, near-vertical lower slope
  const kneeH = H + 46;
  const ridgeH = H + 62;
  const ov = 0.16; // roof overhang (tiles)
  const bx0e = bx0 - ov, bx1e = bx1 + ov;

  // ---- wall-top corners ----
  const Bt = gp(bx1, by0, H), Ct = gp(bx1, by1, H); // +gx gable wall top edge
  const Dt = gp(bx0, by1, H); // far end of the +gy long wall top

  // ---- panel matrices ----
  // long +gy wall (shaded): from Dt across to Ct, down H
  const longMatrix = `matrix(${(Ct.x - Dt.x) / 120} ${(Ct.y - Dt.y) / 120} 0 ${H / 92} ${Dt.x} ${Dt.y})`;
  // +gx gable wall (lit): from Bt across to Ct, down H
  const gableMatrix = `matrix(${(Ct.x - Bt.x) / 120} ${(Ct.y - Bt.y) / 120} 0 ${H / 92} ${Bt.x} ${Bt.y})`;

  // gambrel cross-section heights for the front (+gy) roof, along gx
  const eaveF = (gx: number) => gp(gx, by1 + ov, H);
  const kneeF = (gx: number) => gp(gx, kneeGy, kneeH);
  const ridge = (gx: number) => gp(gx, 0, ridgeH);

  // gable pentagon (at gx = bx1) outline points
  const gp_eL = gp(bx1, by0, H), gp_kL = gp(bx1, -kneeGy, kneeH), gp_ap = gp(bx1, 0, ridgeH), gp_kR = gp(bx1, kneeGy, kneeH), gp_eR = gp(bx1, by1, H);

  return (
    <g>
      <defs>
        <linearGradient id={id("boardLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c44a2c" /><stop offset="1" stopColor="#8f2d18" /></linearGradient>
        <linearGradient id={id("boardShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8f3320" /><stop offset="1" stopColor="#5e1c10" /></linearGradient>
        <linearGradient id={id("roofLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a3622" /><stop offset="1" stopColor="#6a1d11" /></linearGradient>
      </defs>

      <GroundShadow origin={o} rx={92} ry={36} />

      {/* ===== LONG +gy WALL (shaded board-and-batten) ===== */}
      <g transform={longMatrix}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("boardShade")})`} />
        {/* battens */}
        {Array.from({ length: 11 }, (_, k) => 6 + k * 11).map((x) => (
          <line key={x} x1={x} y1={0} x2={x} y2={92} stroke={BOARD_DK} strokeWidth={1.4} opacity={0.5} vectorEffect="non-scaling-stroke" />
        ))}
        <rect x={0} y={0} width={120} height={5} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={92 - 12} width={120} height={12} fill="rgba(0,0,0,.22)" />
        <rect x={0} y={92 - 8} width={120} height={8} fill={PAL.stoneShade} />
        {/* a small shaded-side window */}
        <rect x={26} y={30} width={16} height={20} fill="#1c140c" />
        <rect x={28} y={32} width={12} height={16} fill="#3a2a18" />
        <line x1={34} y1={32} x2={34} y2={48} stroke="#1c140c" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </g>

      {/* ===== +gx GABLE WALL (lit) with X-brace double doors + loft window ===== */}
      <g transform={gableMatrix}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("boardLit")})`} />
        {Array.from({ length: 10 }, (_, k) => 8 + k * 12).map((x) => (
          <line key={x} x1={x} y1={0} x2={x} y2={92} stroke={BOARD_DK} strokeWidth={1.2} opacity={0.45} vectorEffect="non-scaling-stroke" />
        ))}
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,225,180,.16)" />
        <rect x={0} y={92 - 12} width={120} height={12} fill="rgba(0,0,0,.16)" />
        <rect x={0} y={92 - 8} width={120} height={8} fill={PAL.stoneShade} />
        {/* big X-brace double doors, centered */}
        <g data-door="entry">
          <rect x={32} y={26} width={56} height={66} fill={BOARD_DK} opacity={0.7} />
          {nearDoor && <rect x={32} y={26} width={56} height={66} fill="#ff8a28" opacity={0.28} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 59px" }} />}
          {[34, 61].map((dx) => (
            <g key={dx}>
              <rect x={dx} y={28} width={25} height={64} fill="#5a2818" stroke={BOARD_DK} strokeWidth={1.2} />
              <line x1={dx + 1} y1={30} x2={dx + 24} y2={90} stroke={PAL.eave} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
              <line x1={dx + 24} y1={30} x2={dx + 1} y2={90} stroke={PAL.eave} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
            </g>
          ))}
          <rect x={58.5} y={26} width={3} height={66} fill={PAL.eave} opacity={0.9} />
        </g>
      </g>

      {/* ===== GAMBREL GABLE INFILL (the two-pitch pentagon, lit) ===== */}
      <polygon points={pts(gp_eL, gp_kL, gp_ap, gp_kR, gp_eR)} fill={`url(#${id("boardLit")})`} />
      <polygon points={pts(gp_eL, gp_kL, gp_ap, gp_kR, gp_eR)} fill="rgba(255,235,200,.06)" />
      {/* batten lines on the gable (vertical-ish, following the wall up) */}
      {[-0.5, 0, 0.5].map((g) => (
        <line key={g} x1={gp(bx1, g, H).x} y1={gp(bx1, g, H).y} x2={gp(bx1, g, Math.abs(g) < 0.01 ? ridgeH : kneeH).x} y2={gp(bx1, g, Math.abs(g) < 0.01 ? ridgeH : kneeH).y} stroke={BOARD_DK} strokeWidth={1} opacity={0.4} />
      ))}
      {/* loft window near the apex */}
      {(() => {
        const c = gp(bx1, 0, H + 30);
        return (
          <g>
            <rect x={c.x - 9} y={c.y - 9} width={18} height={16} rx={1} fill="#13100a" />
            <rect x={c.x - 7} y={c.y - 7} width={14} height={12} fill="#ffd98a" opacity={0.55} style={{ animation: "flicker 3.4s ease-in-out infinite", transformOrigin: `${c.x}px ${c.y}px` }} />
            <line x1={c.x} y1={c.y - 7} x2={c.x} y2={c.y + 5} stroke="#13100a" strokeWidth={1} />
            <line x1={c.x - 7} y1={c.y - 1} x2={c.x + 7} y2={c.y - 1} stroke="#13100a" strokeWidth={1} />
          </g>
        );
      })()}

      {/* ===== FRONT (+gy) GAMBREL ROOF: steep lower + shallow upper, shingled ===== */}
      {/* lower steep slope */}
      {quadShingles(eaveF(bx0e), eaveF(bx1e), kneeF(bx1e), kneeF(bx0e), `url(#${id("roofLit")})`, "lo", 4, 11)}
      {/* upper shallow slope */}
      {quadShingles(kneeF(bx0e), kneeF(bx1e), ridge(bx1e), ridge(bx0e), `url(#${id("roofLit")})`, "up", 3, 11)}
      {/* knee break line + eave fascia + ridge */}
      <polyline points={pts(kneeF(bx0e), kneeF(bx1e))} fill="none" stroke={PAL.eave} strokeWidth={3} />
      <polyline points={pts(eaveF(bx0e), eaveF(bx1e))} fill="none" stroke="#241f19" strokeWidth={3.5} />
      <polyline points={pts(ridge(bx0e), ridge(bx1e))} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth={2.6} />
      <polyline points={pts(ridge(bx0e), ridge(bx1e))} fill="none" stroke={PAL.ridge} strokeWidth={1.4} opacity={0.85} />
      {/* gable-edge barge boards (down the +gx gambrel rake) */}
      <polyline points={pts(gp(bx1e, by1 + ov, H), gp(bx1e, kneeGy, kneeH), gp(bx1e, 0, ridgeH))} fill="none" stroke="#241f19" strokeWidth={2.6} />

      {/* ===== WEATHER-VANE on the ridge (turning) ===== */}
      {(() => {
        const base = ridge(bx0e + 0.12);
        const top = { x: base.x, y: base.y - 26 };
        return (
          <g>
            <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke="#2c2620" strokeWidth={1.6} strokeLinecap="round" />
            <g style={{ animation: "windmill 9s linear infinite", transformOrigin: `${top.x}px ${top.y}px` }}>
              <path d={`M${top.x - 9},${top.y} L${top.x + 9},${top.y} L${top.x + 4},${top.y - 4} M${top.x + 9},${top.y} L${top.x + 4},${top.y + 4}`} fill="none" stroke="#3a3530" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={top.x} cy={top.y} r={1.6} fill="#3a3530" />
            </g>
          </g>
        );
      })()}

      {/* ===== HAY BALE + drifting dust motes (front, beside the doors) ===== */}
      {(() => {
        const b = gp(bx1 + 0.55, by1 + 0.35, 0);
        return (
          <g>
            <g transform={`translate(${b.x} ${b.y})`}>
              <ellipse cx={2} cy={1} rx={15} ry={3} fill="rgba(0,0,0,.27)" />
              <rect x={-9} y={-15} width={22} height={15} rx={4} fill="#c8a040" />
              <rect x={-7} y={-13} width={18} height={11} rx={3} fill="#d8b050" opacity={0.6} />
              <line x1={-4} y1={-15} x2={-4} y2={0} stroke="#8a7020" strokeWidth={1.4} opacity={0.7} />
              <line x1={5} y1={-15} x2={5} y2={0} stroke="#8a7020" strokeWidth={1.4} opacity={0.7} />
              <g stroke="#e8c058" strokeWidth={0.7} opacity={0.6}><line x1={-7} y1={-12} x2={-2} y2={-7} /><line x1={1} y1={-13} x2={4} y2={-9} /><line x1={6} y1={-12} x2={10} y2={-8} /></g>
            </g>
            {[{ x: -6, y: -18, d: 2.8, l: 0 }, { x: 10, y: -22, d: 3.3, l: 0.6 }, { x: 2, y: -26, d: 2.5, l: 1.1 }, { x: 16, y: -14, d: 3.1, l: 0.4 }, { x: -2, y: -30, d: 3.5, l: 0.9 }].map((m, i) => (
              <circle key={i} cx={b.x + m.x} cy={b.y + m.y} r={i % 2 ? 0.8 : 1.1} fill="#e8c858" style={{ animation: `bob ${m.d}s ${m.l}s ease-in-out infinite`, transformOrigin: `${b.x + m.x}px ${b.y + m.y}px`, opacity: 0.65 }} />
            ))}
          </g>
        );
      })()}

      {/* ===== POST-AND-RAIL FENCE (front-left, +gy side) ===== */}
      {(() => {
        const run = [gp(bx0 - 0.3, by1 + 0.35), gp(-0.2, by1 + 0.5), gp(0.7, by1 + 0.55)];
        const Hf = 15;
        const rails: JSX.Element[] = [];
        for (let i = 0; i < run.length - 1; i++) {
          const a = run[i], c = run[i + 1];
          rails.push(<line key={`rt${i}`} x1={a.x} y1={a.y - Hf + 3} x2={c.x} y2={c.y - Hf + 3} stroke="#6a4a28" strokeWidth={2.2} strokeLinecap="round" />);
          rails.push(<line key={`rb${i}`} x1={a.x} y1={a.y - 5} x2={c.x} y2={c.y - 5} stroke="#6a4a28" strokeWidth={2.2} strokeLinecap="round" />);
        }
        const posts = run.map((p, i) => <line key={`p${i}`} x1={p.x} y1={p.y} x2={p.x} y2={p.y - Hf} stroke="#5a3a1f" strokeWidth={3} strokeLinecap="round" />);
        return <g>{rails}{posts}</g>;
      })()}
    </g>
  );
}
