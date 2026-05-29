// brewery — oast-house brewhouse (LARGE plot).
// Shape tells the story: a tall round brick KILN tower with a conical roof
// topped by the iconic white timber COWL vent (turns in the wind, venting
// steam) — instantly "malting/brewing" — beside a lower brick BREWHOUSE hall
// whose open arched bay shows a glowing COPPER KETTLE over a fire. Stacked oak
// BARRELS, a climbing HOPS bine and a swinging tankard sign finish it.

import { useId } from "react";
import { type P, makeGp, pts, lerp, panelMatrix } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Oast-house brewery: tall round kiln tower + conical roof + turning white cowl vent (hero silhouette), attached brick brewhouse with a glowing copper-kettle bay, stacked barrels, hops bine, tankard sign.",
};

export default function IsoBrewery({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);

  // ---- round KILN tower (screen-space cylinder), set back-left ----
  const kcx = o.x - 20, kby = o.y - 4, kR = 28, kTopH = 116, capH = 150;
  const kY = (h: number) => kby - h;
  const kArc = (h: number, r: number) => `M${kcx - r},${kY(h)} Q${kcx},${kY(h) + r * 0.5 * 1.15} ${kcx + r},${kY(h)}`;
  const kBand = (hB: number, hT: number, rB: number, rT: number) => `M${kcx - rB},${kY(hB)} Q${kcx},${kY(hB) + rB * 0.5 * 1.15} ${kcx + rB},${kY(hB)} L${kcx + rT},${kY(hT)} Q${kcx},${kY(hT) + rT * 0.5 * 1.15} ${kcx - rT},${kY(hT)} Z`;
  const kRofH = (h: number) => 28 - (h - 6) * (5 / (kTopH - 6)); // gentle taper 28→23

  // ---- brewhouse block (iso box) front-right ----
  const bx0 = 0.45, bx1 = 1.95, gy0 = -0.55, gy1 = 0.8, BH = 58, LW = 120, LH = 92;
  const right = gp(bx1, gy0, 0), rightT = gp(bx1, gy0, BH);
  const seM = panelMatrix(gp(bx1, gy0, BH), { x: gp(bx1, gy1, BH).x - rightT.x, y: gp(bx1, gy1, BH).y - rightT.y }, { x: 0, y: BH }, LW, LH);
  const swM = panelMatrix(gp(bx0, gy1, BH), { x: gp(bx1, gy1, BH).x - gp(bx0, gy1, BH).x, y: gp(bx1, gy1, BH).y - gp(bx0, gy1, BH).y }, { x: 0, y: BH }, LW, LH);
  void right;

  return (
    <g>
      <defs>
        <linearGradient id={id("brickCyl")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6a3320" /><stop offset="0.45" stopColor="#9a5230" /><stop offset="0.62" stopColor="#a86038" /><stop offset="1" stopColor="#5e2c18" /></linearGradient>
        <linearGradient id={id("brickLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a05636" /><stop offset="1" stopColor="#6a3320" /></linearGradient>
        <linearGradient id={id("brickShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5e3320" /><stop offset="1" stopColor="#3f2014" /></linearGradient>
        <linearGradient id={id("capLit")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a342c" /><stop offset="0.55" stopColor="#5b5346" /><stop offset="1" stopColor="#423c32" /></linearGradient>
        <linearGradient id={id("cowl")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2ead6" /><stop offset="1" stopColor="#cdbf9c" /></linearGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.7" r="0.7"><stop offset="0" stopColor="#fff3c8" /><stop offset="0.45" stopColor="#ffb43a" /><stop offset="0.8" stopColor="#e0561c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
        <linearGradient id={id("copper")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e89358" /><stop offset="0.5" stopColor="#c96442" /><stop offset="1" stopColor="#7e3a22" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={96} ry={34} fill="rgba(0,0,0,.3)" />

      {/* ===== KILN TOWER (round brick) ===== */}
      <ellipse cx={kcx} cy={kY(6)} rx={kR} ry={kR * 0.5} fill={PAL.stoneShade} />
      <path d={kBand(6, kTopH, kRofH(6), kRofH(kTopH))} fill={`url(#${id("brickCyl")})`} />
      {Array.from({ length: 7 }, (_, i) => 6 + 12 + i * ((kTopH - 18) / 7)).map((h, i) => (
        <path key={i} d={kArc(h, kRofH(h))} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={0.9} />
      ))}
      {/* a little lit vent window high on the kiln */}
      <g><rect x={kcx - 4} y={kY(82) - 6} width={8} height={12} fill="#1a1008" /><rect x={kcx - 2.5} y={kY(82) - 4} width={5} height={8} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: `${kcx}px ${kY(82)}px` }} /></g>

      {/* ===== BREWHOUSE block (front-right) ===== */}
      {/* SW wall (shade) */}
      <g transform={swM}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickShade")})`} />
        <g stroke="#3f2014" strokeWidth={0.8} opacity={0.5}>{[16, 32, 48, 64, 80].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={LH - 10} width={LW} height={10} fill={PAL.stoneShade} />
        <g data-door="entry">
          <path d="M48,92 L48,64 a12,12 0 0 1 24,0 L72,92 Z" fill="#3a2010" />
          {nearDoor && <ellipse cx={60} cy={74} rx={13} ry={16} fill="#ff8a28" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 74px" }} />}
        </g>
      </g>
      {/* SE wall (lit) — copper kettle bay */}
      <g transform={seM}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickLit")})`} />
        <g stroke="#5a2a18" strokeWidth={0.8} opacity={0.45}>{[16, 32, 48, 64, 80].map((y) => <line key={y} x1={0} y1={y} x2={LW} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <rect x={0} y={0} width={LW} height={4} fill="rgba(255,225,180,.18)" />
        <rect x={0} y={LH - 10} width={LW} height={10} fill={PAL.stoneShade} />
        {/* open arched bay */}
        <path d="M26,92 L26,50 a30,30 0 0 1 60,0 L86,92 Z" fill="#2a1408" />
        {/* copper kettle over fire */}
        <rect x={40} y={LH - 6} width={32} height={6} fill="#1a1410" />
        <g style={{ animation: "flicker 1.5s ease-in-out infinite", transformOrigin: "56px 84px" }}><path d="M44,88 Q50,74 56,82 Q62,74 68,88 Z" fill={`url(#${id("fire")})`} /></g>
        <ellipse cx={56} cy={LH - 12} rx={22} ry={5} fill="#5a2a18" />
        <path d="M34,80 Q32,54 42,48 L70,48 Q80,54 78,80 Z" fill={`url(#${id("copper")})`} />
        <ellipse cx={56} cy={48} rx={16} ry={4} fill="#7e3a22" /><ellipse cx={56} cy={48} rx={12} ry={2.6} fill="#1a0e06" />
        <path d="M40,72 Q38,58 44,50" stroke="#ffd56a" strokeWidth={1.4} fill="none" opacity={0.6} />
        <rect x={34} y={44} width={44} height={4} fill="#7e3a22" />
      </g>
      {/* steam from the kettle */}
      {(() => { const s = gp(bx1 - 0.5, gy0 + 0.3, BH - 6); return <g transform={`translate(${s.x} ${s.y})`}>{Array.from({ length: 4 }, (_, i) => <circle key={i} cx={0} cy={0} r={2.6 + (i % 2) * 1.3} fill="#fbf7eb" style={{ "--sx": `${i % 2 ? 7 : -7}px`, animation: `steam 2.4s ${i * 0.4}s ease-out infinite`, transformOrigin: "0 0", opacity: 0.8 } as React.CSSProperties} />)}</g>; })()}

      {/* brewhouse mono-pitch roof leaning against the kiln */}
      {(() => {
        const fL = gp(bx0 - 0.1, gy1 + 0.12, BH), fR = gp(bx1 + 0.12, gy1 + 0.12, BH);
        const bL = gp(bx0 - 0.1, gy0 - 0.12, BH + 22), bR = gp(bx1 + 0.12, gy0 - 0.12, BH + 22);
        return (
          <g>
            <polygon points={pts(fL, fR, bR, bL)} fill="#7a3320" />
            {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={lerp(fL, bL, t).x} y1={lerp(fL, bL, t).y} x2={lerp(fR, bR, t).x} y2={lerp(fR, bR, t).y} stroke="rgba(0,0,0,.22)" strokeWidth={1} />)}
            <polyline points={pts(fL, fR)} fill="none" stroke="#3a160a" strokeWidth={3} />
          </g>
        );
      })()}

      {/* ===== KILN conical roof + white COWL ===== */}
      {(() => {
        const capR = kRofH(kTopH) + 2, apex = { x: kcx, y: kY(capH) };
        const bl = { x: kcx - capR, y: kY(kTopH) }, br = { x: kcx + capR, y: kY(kTopH) };
        const cowlBase = { x: apex.x, y: apex.y };
        return (
          <g>
            <ellipse cx={kcx} cy={kY(kTopH)} rx={capR} ry={capR * 0.5} fill="#3a342c" />
            <path d={`M${bl.x},${bl.y} Q${kcx},${bl.y + capR * 0.5 * 1.1} ${br.x},${br.y} L${apex.x},${apex.y} Z`} fill={`url(#${id("capLit")})`} />
            <path d={`M${bl.x},${bl.y} Q${kcx},${bl.y + capR * 0.5 * 1.1} ${kcx},${bl.y + capR * 0.55} L${apex.x},${apex.y} Z`} fill="rgba(0,0,0,.26)" />
            {[0.32, 0.58, 0.8].map((t) => { const rr = capR * (1 - t), yy = lerp({ x: 0, y: kY(kTopH) }, { x: 0, y: apex.y }, t).y; return <path key={t} d={`M${kcx - rr},${yy} Q${kcx},${yy + rr * 0.5 * 1.05} ${kcx + rr},${yy}`} fill="none" stroke="rgba(0,0,0,.22)" strokeWidth={0.8} />; })}
            {/* COWL: white timber hood that turns, with a vane; steam vents from it */}
            <g style={{ animation: "sway 5s ease-in-out infinite", transformOrigin: `${cowlBase.x}px ${cowlBase.y}px` }}>
              {/* collar */}
              <ellipse cx={cowlBase.x} cy={cowlBase.y} rx={6} ry={3} fill="#5b5346" />
              {/* hood body (rounded, opening toward +gy/front-left) */}
              <path d={`M${cowlBase.x - 7},${cowlBase.y - 1} Q${cowlBase.x - 9},${cowlBase.y - 16} ${cowlBase.x},${cowlBase.y - 18} Q${cowlBase.x + 8},${cowlBase.y - 16} ${cowlBase.x + 6},${cowlBase.y - 2} Q${cowlBase.x},${cowlBase.y - 6} ${cowlBase.x - 7},${cowlBase.y - 1} Z`} fill={`url(#${id("cowl")})`} stroke="#a89878" strokeWidth={0.6} />
              {/* vane pole out the back-right */}
              <line x1={cowlBase.x + 2} y1={cowlBase.y - 14} x2={cowlBase.x + 16} y2={cowlBase.y - 8} stroke="#3a2715" strokeWidth={1.6} strokeLinecap="round" />
              <path d={`M${cowlBase.x + 12},${cowlBase.y - 11} L${cowlBase.x + 17},${cowlBase.y - 8} L${cowlBase.x + 12},${cowlBase.y - 5} Z`} fill="#3a2715" />
            </g>
            <Smoke x={cowlBase.x - 4} y={cowlBase.y - 14} scale={1.0} count={4} dur={4.6} color="#e8e0cc" />
          </g>
        );
      })()}

      {/* ===== HOPS bine climbing the kiln (front) ===== */}
      {(() => { const base = { x: kcx - kR + 4, y: kY(8) }; return (
        <g>
          <path d={`M${base.x},${base.y} Q${base.x - 8},${kY(40)} ${base.x + 2},${kY(66)} Q${base.x + 10},${kY(92)} ${base.x},${kY(108)}`} fill="none" stroke="#4d6b25" strokeWidth={1.6} />
          {[0.15, 0.35, 0.55, 0.78, 0.92].map((t, i) => { const px = base.x + (i % 2 ? 5 : -5), py = lerp({ x: 0, y: base.y }, { x: 0, y: kY(108) }, t).y; return <g key={i}><ellipse cx={px} cy={py} rx={1.8} ry={2.8} fill="#7fc94a" /><path d={`M${px - 4},${py + 2} l3,-1 l-1,2 Z`} fill="#7fa848" /></g>; })}
        </g>
      ); })()}

      {/* ===== STACKED BARRELS + tankard sign (front-right) ===== */}
      {(() => { const b = gp(bx0 + 0.15, gy1 + 0.6, 0); return (
        <g transform={`translate(${b.x} ${b.y})`}>
          <ellipse cx={2} cy={3} rx={22} ry={4} fill="rgba(0,0,0,.3)" />
          {[-10, 10].map((dx) => <g key={dx} transform={`translate(${dx} 0)`}><path d="M-8,0 Q-10,-10 -8,-20 L8,-20 Q10,-10 8,0 Z" fill="#7a4a26" /><path d="M-8,0 Q-10,-10 -8,-20 L-2,-20 Q-4,-10 -2,0 Z" fill="#5a3a1f" /><rect x={-9} y={-14} width={18} height={2} fill="#3a3530" /><rect x={-9} y={-6} width={18} height={2} fill="#3a3530" /><ellipse cx={0} cy={-20} rx={8} ry={2.2} fill="#8a5a30" /></g>)}
          <g transform="translate(0 -32)"><ellipse cx={-10} cy={0} rx={4.5} ry={9} fill="#7a4a26" /><rect x={-10} y={-9} width={20} height={18} fill="#7a4a26" /><ellipse cx={10} cy={0} rx={4.5} ry={9} fill="#8a5a30" /><rect x={-10} y={-5} width={20} height={1.6} fill="#3a3530" /><rect x={-10} y={3} width={20} height={1.6} fill="#3a3530" /><rect x={9} y={7} width={2} height={4} fill="#7c858d" /><ellipse cx={10} cy={12} rx={1.3} ry={0.7} fill="#fbf7eb" style={{ animation: "drip2 1.4s ease-in infinite", transformOrigin: "10px 11px" }} /></g>
        </g>
      ); })()}

      {(() => { const post = gp(bx1 + 0.55, gy1 + 0.5, 0), topp = { x: post.x, y: post.y - 56 }, arm = { x: post.x - 18, y: post.y - 52 }; return (
        <g>
          <line x1={post.x} y1={post.y} x2={topp.x} y2={topp.y} stroke="#3a2715" strokeWidth={3.4} strokeLinecap="round" />
          <path d={`M${topp.x},${topp.y} Q${topp.x - 11},${topp.y - 5} ${arm.x},${arm.y}`} fill="none" stroke="#2c2012" strokeWidth={2.4} />
          <g style={{ animation: "sway 4s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y}px` }}>
            <line x1={arm.x} y1={arm.y} x2={arm.x} y2={arm.y + 5} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={arm.x - 12} y={arm.y + 5} width={24} height={17} rx={2} fill="#fbf7eb" stroke="#5a3a1f" strokeWidth={1.3} />
            <rect x={arm.x - 5} y={arm.y + 9} width={8} height={9} fill="#bda268" stroke="#7a5c34" strokeWidth={0.6} /><path d={`M${arm.x + 3},${arm.y + 11} a3,3 0 0 1 0,5`} fill="none" stroke="#7a5c34" strokeWidth={1} /><rect x={arm.x - 5} y={arm.y + 8} width={8} height={2} rx={1} fill="#fff" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
