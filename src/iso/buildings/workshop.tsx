// workshop — carpenter's workshop (NORMAL plot).
// Shape tells the story: a timber-framed shed with its gable end thrown OPEN as
// big barn doors onto a workbench, and a projecting HOIST GANTRY beam jutting
// from the gable peak (pulley + a hanging timber baulk) for lifting stock into
// the loft. A lean-to LUMBER RACK stacked with planks runs down the side; saw-
// horses, a log and drifting sawdust fill the yard. Plank gable roof + loft door.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Carpenter's shop: open gable barn-doors onto a workbench, a projecting hoist gantry + pulley + hanging baulk at the gable peak, a lean-to lumber rack of planks, sawhorses + log + drifting sawdust.",
};

export default function IsoWorkshop({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));
  const x0 = -0.45, x1 = 1.0, y0 = -0.8, y1 = 0.8, H = 56, RISE = 42, ov = 0.14;

  return (
    <g>
      <defs>
        <linearGradient id={id("woodLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdaa72" /><stop offset="1" stopColor="#a4824e" /></linearGradient>
        <linearGradient id={id("woodShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c7c4c" /><stop offset="1" stopColor="#73572f" /></linearGradient>
        <linearGradient id={id("roofLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a6a42" /><stop offset="1" stopColor="#5a3f24" /></linearGradient>
        <linearGradient id={id("roofShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6a4e30" /><stop offset="1" stopColor="#42301c" /></linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={84} ry={32} fill="rgba(0,0,0,.3)" />

      {/* +gy long wall (shade) plank + window */}
      <g transform={swW(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("woodShade")})`} />
        <g stroke="rgba(0,0,0,.26)" strokeWidth={0.8}>{[12, 24, 36, 48, 60, 72].map((y) => <line key={y} x1={0} y1={y} x2={120} y2={y} vectorEffect="non-scaling-stroke" />)}</g>
        <g stroke="#5a3f24" strokeWidth={2.6} vectorEffect="non-scaling-stroke" opacity={0.6}><line x1={2} y1={2} x2={2} y2={90} /><line x1={60} y1={2} x2={60} y2={90} /><line x1={2} y1={3} x2={60} y2={45} /></g>
        <rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        <rect x={86} y={28} width={20} height={18} fill="#2c1c0e" /><rect x={88} y={30} width={16} height={14} fill="#3a4a52" />
      </g>

      {/* interior (seen through the open gable) */}
      <polygon points={pts(gp(x0, y0, 0), gp(x0, y1, 0), gp(x0, y1, H), gp(x0, y0, H))} fill="#241a10" />
      <polygon points={pts(gp(x0, y0, 0), gp(x1, y0, 0), gp(x1, y0, H), gp(x0, y0, H))} fill="#1c140c" />

      {/* workbench + half-built piece inside (screen space, at the opening) */}
      {(() => { const c = gp(x1 - 0.34, 0, 0); const cx = c.x, by = c.y; return (
        <g>
          <rect x={cx - 24} y={by - 16} width={48} height={6} rx={1} fill="#8a6a3c" /><rect x={cx - 24} y={by - 17} width={48} height={2} fill="#cdaa72" />
          <rect x={cx - 20} y={by - 10} width={4} height={10} fill="#5a3f24" /><rect x={cx + 16} y={by - 10} width={4} height={10} fill="#5a3f24" />
          {/* a chair frame being built on the bench */}
          <g stroke="#a4824e" strokeWidth={2} strokeLinecap="round" fill="none"><path d={`M${cx - 6},${by - 16} L${cx - 6},${by - 30} M${cx + 6},${by - 16} L${cx + 6},${by - 26} M${cx - 6},${by - 24} L${cx + 6},${by - 24}`} /></g>
          {/* tools: a saw + plane on the bench */}
          <rect x={cx - 22} y={by - 19} width={10} height={2.4} fill="#7c858d" /><rect x={cx + 6} y={by - 19} width={8} height={3} rx={1} fill="#5a3f24" />
          {/* clamp */}
          <rect x={cx + 20} y={by - 14} width={4} height={6} fill="#3a3530" />
        </g>
      ); })()}

      {/* +gx gable wall = OPEN barn doors (lit), one leaf swung out */}
      {(() => { const eL = gp(x1, y0, 0), eR = gp(x1, y1, 0), tL = gp(x1, y0, H), tR = gp(x1, y1, H); return (
        <g data-door="entry">
          {/* door reveal/frame */}
          <polyline points={pts(eL, tL, tR, eR)} fill="none" stroke="#3a2715" strokeWidth={4} />
          {nearDoor && <ellipse cx={gp(x1, 0, 22).x} cy={gp(x1, 0, 22).y} rx={22} ry={26} fill="#ffcf6a" opacity={0.3} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${gp(x1, 0, 22).x}px ${gp(x1, 0, 22).y}px` }} />}
          {/* open door leaf swung outward on the +gy side */}
          {(() => { const h0 = gp(x1, y1, 0), h1 = gp(x1, y1, H * 0.92), o0 = gp(x1 + 0.55, y1 + 0.5, 0), o1 = gp(x1 + 0.55, y1 + 0.5, H * 0.92); return (
            <g><polygon points={pts(h0, o0, o1, h1)} fill={`url(#${id("woodShade")})`} /><g stroke="#3a2715" strokeWidth={1} opacity={0.6}>{[0.3, 0.6].map((t) => <line key={t} x1={lerp(h0, o0, t).x} y1={lerp(h0, o0, t).y} x2={lerp(h1, o1, t).x} y2={lerp(h1, o1, t).y} />)}</g><line x1={lerp(h0, o0, 0.5).x} y1={lerp(h0, o0, 0.5).y - 8} x2={lerp(h0, o0, 0.5).x} y2={lerp(h0, o0, 0.5).y + 8} stroke="#2c2012" strokeWidth={1} /></g>
          ); })()}
        </g>
      ); })()}

      {/* ===== plank gable roof + loft door + HOIST GANTRY ===== */}
      {(() => {
        const eL = gp(x0 - ov, y1 + ov, H), eR = gp(x1 + ov, y1 + ov, H);
        const rL = gp(x0 - ov, 0, H + RISE), rR = gp(x1 + ov, 0, H + RISE);
        const gL = gp(x1, y1, H), gR = gp(x1, y0, H), gA = gp(x1, 0, H + RISE);
        const s: JSX.Element[] = [];
        for (let i = 1; i < 5; i++) { const a = lerp(eL, rL, i / 5), b = lerp(eR, rR, i / 5); s.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.2)" strokeWidth={1} />); }
        return (
          <g>
            <polygon points={pts(gp(x0 - ov, y0 - ov, H), rL, rR, gp(x1 + ov, y0 - ov, H))} fill="#42301c" />
            <polygon points={pts(eL, eR, rR, rL)} fill={`url(#${id("roofLit")})`} />{s}
            {/* +gx gable triangle (over the open doors) */}
            <polygon points={pts(gL, gR, gA)} fill={`url(#${id("woodLit")})`} />
            <g stroke="#5a3f24" strokeWidth={1.6} opacity={0.5}><line x1={(gL.x + gA.x) / 2} y1={(gL.y + gA.y) / 2} x2={(gR.x + gA.x) / 2} y2={(gR.y + gA.y) / 2} /></g>
            {/* loft door in the gable */}
            {(() => { const c = lerp(lerp(gL, gR, 0.5), gA, 0.5); return <g><rect x={c.x - 6} y={c.y - 5} width={12} height={13} fill="#2c1c0e" /><rect x={c.x - 4.5} y={c.y - 3.5} width={9} height={11} fill="#3a2715" /></g>; })()}
            <polyline points={pts(eL, eR)} fill="none" stroke="#2a1d10" strokeWidth={3.5} />
            <polyline points={pts(gL, gA, gR)} fill="none" stroke="#2a1d10" strokeWidth={2.5} />
            {/* HOIST GANTRY: a beam jutting out past the gable apex with a pulley + hanging baulk */}
            {(() => { const a = gp(x1, 0, H + RISE - 4); const tip = gp(x1 + 0.9, 0, H + RISE - 2); return (
              <g>
                <line x1={a.x} y1={a.y} x2={tip.x} y2={tip.y} stroke="#4a3520" strokeWidth={5} strokeLinecap="round" />
                <line x1={a.x + 6} y1={a.y + 10} x2={tip.x - 6} y2={tip.y - 2} stroke="#4a3520" strokeWidth={2.4} strokeLinecap="round" />
                <circle cx={tip.x} cy={tip.y + 2} r={2.4} fill="#3a3530" /><circle cx={tip.x} cy={tip.y + 2} r={1} fill="#bda268" />
                <g style={{ animation: "bob 4s ease-in-out infinite", transformOrigin: `${tip.x}px ${tip.y + 18}px` }}>
                  <line x1={tip.x} y1={tip.y + 2} x2={tip.x} y2={tip.y + 14} stroke="#2c2012" strokeWidth={1} />
                  {/* hanging timber baulk */}
                  <rect x={tip.x - 10} y={tip.y + 14} width={22} height={6} rx={1} fill="#a4824e" /><rect x={tip.x - 10} y={tip.y + 14} width={22} height={2} fill="#cdaa72" /><ellipse cx={tip.x - 10} cy={tip.y + 17} rx={2} ry={3} fill="#8a6a3c" />
                </g>
              </g>
            ); })()}
          </g>
        );
      })()}

      {/* ===== LEAN-TO LUMBER RACK down the +gy side ===== */}
      {(() => { const pA = gp(-0.3, y1 + 0.5, 0), pB = gp(0.7, y1 + 0.5, 0); return (
        <g>
          {/* posts + sloped roof */}
          <line x1={pA.x} y1={pA.y} x2={pA.x} y2={pA.y - 30} stroke="#5a3a1f" strokeWidth={3.5} strokeLinecap="round" />
          <line x1={pB.x} y1={pB.y} x2={pB.x} y2={pB.y - 30} stroke="#5a3a1f" strokeWidth={3.5} strokeLinecap="round" />
          <polygon points={pts(gp(-0.35, y1 + 0.05, H * 0.6), gp(0.75, y1 + 0.05, H * 0.6), { x: pB.x, y: pB.y - 30 }, { x: pA.x, y: pA.y - 30 })} fill={`url(#${id("roofShade")})`} />
          {/* stacked planks on the rack */}
          {[0, 1, 2, 3].map((r) => { const y = pA.y - 6 - r * 6; return <g key={r}><rect x={pA.x - 2} y={y} width={pB.x - pA.x + 4} height={4} fill={r % 2 ? "#bda268" : "#cdaa72"} /><ellipse cx={pA.x - 2} cy={y + 2} rx={2} ry={2} fill="#a4824e" stroke="#7a5c34" strokeWidth={0.3} /></g>; })}
        </g>
      ); })()}

      {/* sawhorse + log + sawdust (front-right) */}
      {(() => { const b = gp(1.4, 0.5, 0); return (
        <g>
          <g transform={`translate(${b.x} ${b.y})`}><rect x={-10} y={-10} width={20} height={3} rx={1} fill="#8a6a3c" /><line x1={-8} y1={-7} x2={-12} y2={0} stroke="#5a3f24" strokeWidth={2} /><line x1={-8} y1={-7} x2={-4} y2={0} stroke="#5a3f24" strokeWidth={2} /><line x1={8} y1={-7} x2={4} y2={0} stroke="#5a3f24" strokeWidth={2} /><line x1={8} y1={-7} x2={12} y2={0} stroke="#5a3f24" strokeWidth={2} /><rect x={-4} y={-12} width={14} height={3.4} rx={1} fill="#cdaa72" /></g>
          {/* sawdust motes */}
          {[{ x: -2, p: -24, d: 3.6 }, { x: 6, p: 26, d: 3.0 }, { x: 12, p: -18, d: 4.0 }].map((m, i) => <circle key={i} cx={b.x + m.x} cy={b.y - 8} r={0.8} fill="#e8d090" style={{ "--px": `${m.p}px`, animation: `pollen ${m.d}s ${i * 0.5}s ease-out infinite`, transformOrigin: `${b.x + m.x}px ${b.y - 8}px`, opacity: 0.7 } as React.CSSProperties} />)}
          {/* a fresh log */}
          <g transform={`translate(${gp(2.0, 0.7, 0).x} ${gp(2.0, 0.7, 0).y})`}><ellipse cx={0} cy={1} rx={9} ry={2.4} fill="rgba(0,0,0,.26)" /><ellipse cx={0} cy={-3} rx={6} ry={4.5} fill="#a4824e" /><ellipse cx={0} cy={-3} rx={4} ry={2.8} fill="#8a6a3c" /><circle cx={0} cy={-3} r={1.2} fill="#6a4e30" /></g>
        </g>
      ); })()}
    </g>
  );
}
