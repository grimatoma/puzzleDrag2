// bakery — the village bakehouse (NORMAL/L plot).
// Reimagined as a multi-volume building whose SHAPE tells the story: a
// gable-fronted half-timbered shop (flour-loft door with an iron HOIST beam +
// pulley above a bread-counter shopfront), a bulging wood-fired BEEHIVE OVEN
// apse with a glowing arched mouth, and a tall tapering brick CHIMNEY smoking
// over it. Terracotta pantile roof + dormer. Animations: oven fire flicker +
// embers + warm spill, chimney smoke, cooling-loaf steam, swinging bread sign,
// the hoisted flour sack swaying.

import { useId } from "react";
import { type P, makeGp, pts, lerp, quadShingles } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Bakehouse: gable shopfront + flour-loft hoist, bulging brick beehive oven with glowing mouth, tall smoking chimney, pantile roof + dormer. Multi-volume; shape reads as a bakery.",
};

export default function IsoBakery({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seWall = (gx: number, a: number, b: number, hb: number, ht: number) => PM(gp(gx, a, ht), gp(gx, b, ht), gp(gx, a, hb));
  const swWall = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));

  // main bakehouse block: gable end faces +gx (lit), ridge along gx
  const bx0 = -0.55, bx1 = 1.05, gy0 = -0.82, gy1 = 0.82, H = 60, RISE = 46, ov = 0.14;
  const apexX0 = gp(bx0, 0, H + RISE), apexX1 = gp(bx1, 0, H + RISE);

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4e1ba" /><stop offset="1" stopColor="#dcc492" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2a875" /><stop offset="1" stopColor="#9a7e54" /></linearGradient>
        <linearGradient id={id("panLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cf6a44" /><stop offset="1" stopColor="#9c3f24" /></linearGradient>
        <linearGradient id={id("panShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c4528" /><stop offset="1" stopColor="#6a2916" /></linearGradient>
        <radialGradient id={id("brick")} cx="0.62" cy="0.4" r="0.7"><stop offset="0" stopColor="#a8623e" /><stop offset="0.6" stopColor="#7e4026" /><stop offset="1" stopColor="#532516" /></radialGradient>
        <linearGradient id={id("chim")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a2c1a" /><stop offset="0.5" stopColor="#8a4a30" /><stop offset="1" stopColor="#5a2c1a" /></linearGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.75" r="0.7"><stop offset="0" stopColor="#fff3c8" /><stop offset="0.45" stopColor="#ffb43a" /><stop offset="0.8" stopColor="#e0561c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 4} rx={96} ry={34} fill="rgba(0,0,0,.3)" />

      {/* cobbled apron */}
      {(() => { const a = gp(-1.4, 0.9, 0), b = gp(1.3, 0.9, 0), c = gp(1.3, 2.2, 0), d = gp(-1.7, 2.2, 0); const j: JSX.Element[] = [];
        for (let t = 0.2; t < 1; t += 0.2) { j.push(<line key={`x${t}`} x1={lerp(a, d, t).x} y1={lerp(a, d, t).y} x2={lerp(b, c, t).x} y2={lerp(b, c, t).y} stroke="rgba(0,0,0,.12)" strokeWidth={1} />); j.push(<line key={`y${t}`} x1={lerp(a, b, t).x} y1={lerp(a, b, t).y} x2={lerp(d, c, t).x} y2={lerp(d, c, t).y} stroke="rgba(0,0,0,.12)" strokeWidth={1} />); }
        return <g><polygon points={pts(a, b, c, d)} fill="#9a8e72" />{j}</g>; })()}

      {/* ===== MAIN BLOCK ===== */}
      {/* +gy long wall (shade) */}
      <g transform={swWall(gy1, bx0, bx1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterShade")})`} />
        <g stroke="#6a4a28" strokeWidth={2.6} vectorEffect="non-scaling-stroke" opacity={0.55}><line x1={0} y1={3} x2={120} y2={3} /><line x1={0} y1={88} x2={120} y2={88} /><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={48} x2={120} y2={48} /></g>
        <rect x={0} y={88} width={120} height={4} fill={PAL.stoneShade} />
        <rect x={92} y={20} width={18} height={22} rx={1.5} fill="#2c1c0e" /><rect x={94} y={22} width={14} height={18} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3.4s ease-in-out infinite", transformOrigin: "101px 31px" }} />
      </g>

      {/* +gx gable wall (lit) — shopfront */}
      <g transform={seWall(bx1, gy0, gy1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterLit")})`} />
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.18)" />
        {/* exposed timber posts/rails */}
        <g stroke="#6a4a28" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.6}><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={3} x2={120} y2={3} /><line x1={0} y1={50} x2={120} y2={50} /></g>
        <rect x={0} y={88} width={120} height={4} fill={PAL.stoneShade} />
        {/* counter shopfront: open window with loaves under a pent roof */}
        <rect x={12} y={56} width={66} height={30} fill="#241910" />
        {/* loaves on the counter */}
        {[[20, "#d68a44"], [33, "#c87838"], [46, "#e0a050"], [59, "#bd6c30"], [70, "#d68a44"]].map(([lx, c], i) => (
          <g key={i}><ellipse cx={lx as number} cy={70} rx={6} ry={3.4} fill={c as string} /><ellipse cx={lx as number} cy={68.6} rx={4.4} ry={2.2} fill="#f0c074" opacity={0.6} /></g>
        ))}
        <rect x={10} y={84} width={70} height={4} fill="#7a5c34" />
        {/* pent roof over the counter */}
        <path d="M8,56 L82,56 L76,48 L14,48 Z" fill="#8a3f28" /><rect x={8} y={54} width={74} height={2.5} fill="#3a160a" />
        {/* door right of counter */}
        <g data-door="entry">
          {nearDoor && <ellipse cx={98} cy={70} rx={13} ry={18} fill="#ff8a28" opacity={0.32} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "98px 70px" }} />}
          <path d="M88,92 L88,62 a10,10 0 0 1 20,0 L108,92 Z" fill="#5a3a1f" /><path d="M91,92 L91,63 a7,7 0 0 1 14,0 L105,92 Z" fill="#3a2010" />
          <circle cx={102} cy={78} r={1.4} fill={PAL.brass} />
        </g>
      </g>

      {/* gable triangle (lit) — half-timber + flour-loft door */}
      {(() => { const eL = gp(bx1, gy0, H), eR = gp(bx1, gy1, H), ap = gp(bx1, 0, H + RISE), mid = gp(bx1, 0, H); return (
        <g>
          <polygon points={pts(eL, ap, eR)} fill={`url(#${id("plasterLit")})`} />
          <polygon points={pts(eL, ap, eR)} fill="rgba(255,235,200,.05)" />
          {/* half-timber: king post + braces */}
          <g stroke="#6a4a28" strokeWidth={2.2} opacity={0.55}><line x1={mid.x} y1={mid.y} x2={ap.x} y2={ap.y} /><line x1={eL.x} y1={eL.y} x2={lerp(mid, ap, 0.5).x} y2={lerp(mid, ap, 0.5).y} /><line x1={eR.x} y1={eR.y} x2={lerp(mid, ap, 0.5).x} y2={lerp(mid, ap, 0.5).y} /></g>
          {/* loft door */}
          {(() => { const c = lerp(mid, ap, 0.5); return <g><rect x={c.x - 6} y={c.y - 4} width={12} height={14} fill="#2c1c0e" /><rect x={c.x - 4.5} y={c.y - 2.5} width={9} height={11} fill="#4a2e14" /><line x1={c.x} y1={c.y - 2.5} x2={c.x} y2={c.y + 8} stroke="#2c1c0e" strokeWidth={0.8} /></g>; })()}
        </g>
      ); })()}

      {/* ===== ROOF (terracotta pantile gable) ===== */}
      {(() => {
        const eL = gp(bx0 - ov, gy1 + ov, H), eR = gp(bx1 + ov, gy1 + ov, H);
        const rL = gp(bx0 - ov, 0, H + RISE), rR = gp(bx1 + ov, 0, H + RISE);
        return (
          <g>
            {/* back slope sliver */}
            <polygon points={pts(gp(bx0 - ov, gy0 - ov, H), rL, rR, gp(bx1 + ov, gy0 - ov, H))} fill="#6a2916" />
            {quadShingles(eL, eR, rR, rL, `url(#${id("panLit")})`, "pan", 5, 13)}
            <polyline points={pts(eL, eR)} fill="none" stroke="#3a160a" strokeWidth={3.5} />
            {/* +gx gable bargeboard rake */}
            <polyline points={pts(gp(bx1 + ov, gy1 + ov, H), apexX1, gp(bx1 + ov, gy0 - ov, H))} fill="none" stroke="#3a160a" strokeWidth={3} />
            <polyline points={pts(rL, rR)} fill="none" stroke={PAL.ridge} strokeWidth={1.4} opacity={0.75} />
            <polyline points={pts(apexX0, apexX1)} fill="none" stroke="#7a1d12" strokeWidth={2} opacity={0.6} />
            {/* gabled dormer on the +gy slope */}
            {(() => { const d = lerp(lerp(eL, eR, 0.5), lerp(rL, rR, 0.5), 0.5); return (
              <g>
                <polygon points={`${d.x - 9},${d.y + 4} ${d.x},${d.y - 5} ${d.x + 9},${d.y + 4}`} fill="#8a3f28" />
                <rect x={d.x - 5} y={d.y + 2} width={10} height={8} fill="#2c1c0e" /><rect x={d.x - 3.5} y={d.y + 3} width={7} height={6} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3.8s ease-in-out infinite", transformOrigin: `${d.x}px ${d.y + 6}px` }} />
              </g>
            ); })()}
          </g>
        );
      })()}

      {/* ===== BEEHIVE OVEN APSE (front-left) ===== */}
      {(() => {
        const base = gp(-0.05, gy1 + 0.78, 0); const cx = base.x, by = base.y; const hw = 26;
        const bell = `M${cx - hw},${by} C ${cx - hw - 2},${by - 28} ${cx - 15},${by - 46} ${cx},${by - 46} C ${cx + 15},${by - 46} ${cx + hw + 2},${by - 28} ${cx + hw},${by} Z`;
        return (
          <g>
            {/* warm spill on the apron */}
            <ellipse cx={cx} cy={by + 8} rx={40} ry={14} fill="rgba(255,150,50,.22)" style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: `${cx}px ${by + 8}px` }} />
            {/* stone base */}
            <ellipse cx={cx} cy={by} rx={hw} ry={8} fill={PAL.stoneShade} />
            {/* brick bell */}
            <path d={bell} fill={`url(#${id("brick")})`} />
            {/* brick course arcs */}
            {[6, 16, 26, 35].map((h, i) => { const w = hw - i * 5.2; return <path key={h} d={`M${cx - w},${by - h} Q${cx},${by - h + w * 0.42} ${cx + w},${by - h}`} fill="none" stroke="rgba(0,0,0,.2)" strokeWidth={0.8} />; })}
            <path d={bell} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={1} />
            {/* arched mouth + fire */}
            <path d={`M${cx - 13},${by} L${cx - 13},${by - 15} a13,13 0 0 1 26,0 L${cx + 13},${by} Z`} fill="#2a1408" />
            <ellipse cx={cx} cy={by - 6} rx={11} ry={9} fill={`url(#${id("fire")})`} style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: `${cx}px ${by - 6}px` }} />
            <g style={{ animation: "flicker 1.5s .2s ease-in-out infinite", transformOrigin: `${cx}px ${by - 8}px` }}><path d={`M${cx - 7},${by} Q${cx - 3},${by - 16} ${cx},${by - 7} Q${cx + 3},${by - 16} ${cx + 7},${by} Z`} fill="#ffc24a" /></g>
            {[0, 0.8, 1.6].map((d, i) => <circle key={i} cx={cx + (i % 2 ? 5 : -5)} cy={by - 4} r={1.1} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 6 : -6}px`, animation: `ember 2.6s ${d}s ease-out infinite`, transformOrigin: `${cx}px ${by - 4}px` } as React.CSSProperties} />)}
            {/* stone hearth lintel + shelf */}
            <path d={`M${cx - 15},${by - 15} a15,15 0 0 1 30,0`} fill="none" stroke={PAL.stone} strokeWidth={2.5} />
            <ellipse cx={cx} cy={by + 2} rx={18} ry={4} fill={PAL.stoneShade} /><ellipse cx={cx} cy={by + 1} rx={18} ry={3.5} fill={PAL.stone} />
            {/* peel leaning */}
            <line x1={cx + 16} y1={by + 2} x2={cx + 30} y2={by - 40} stroke="#7a5c34" strokeWidth={2.4} strokeLinecap="round" />
            <ellipse cx={cx + 31} cy={by - 43} rx={5} ry={7} fill="#9a7444" transform={`rotate(20 ${cx + 31} ${by - 43})`} />
            {/* split firewood stack */}
            <g transform={`translate(${cx - 34} ${by + 2})`}><ellipse cx={0} cy={2} rx={12} ry={3} fill="rgba(0,0,0,.25)" />{[[-6, 0], [4, 0], [-1, -6]].map(([lx, ly], i) => <g key={i} transform={`translate(${lx} ${ly})`}><ellipse cx={0} cy={0} rx={5} ry={3.4} fill="#a4824e" /><ellipse cx={0} cy={0} rx={3.2} ry={2} fill="#c8a060" /></g>)}</g>
          </g>
        );
      })()}

      {/* ===== TALL BRICK CHIMNEY (rises behind the oven) ===== */}
      {(() => {
        const b = gp(-0.05, gy1 + 0.5, 0); const cx = b.x + 14, topY = b.y - 116, w = 9;
        return (
          <g>
            <polygon points={`${cx - w},${b.y - 34} ${cx + w},${b.y - 34} ${cx + w - 1},${topY} ${cx - w + 1},${topY}`} fill={`url(#${id("chim")})`} />
            <g stroke="rgba(0,0,0,.22)" strokeWidth={0.7}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={cx - w + 1} y1={topY + 12 + i * 12} x2={cx + w - 1} y2={topY + 12 + i * 12} />)}</g>
            {/* corbelled cap */}
            <polygon points={`${cx - w - 3},${topY + 2} ${cx + w + 3},${topY + 2} ${cx + w + 3},${topY - 5} ${cx - w - 3},${topY - 5}`} fill="#6a3320" />
            <polygon points={`${cx - w - 3},${topY - 5} ${cx + w + 3},${topY - 5} ${cx + w},${topY - 9} ${cx - w},${topY - 9}`} fill="#4a2014" />
            <Smoke x={cx} y={topY - 8} scale={1.2} count={4} dur={4.4} color="#e4d8c0" />
            <Smoke x={cx + 3} y={topY - 8} scale={0.85} count={3} dur={3.6} color="#c8b898" />
          </g>
        );
      })()}

      {/* cooling-loaf steam off the counter */}
      {(() => { const s = gp(1.05, gy0 + 0.2, 34); return <g transform={`translate(${s.x} ${s.y})`}>{Array.from({ length: 3 }, (_, i) => <circle key={i} cx={0} cy={0} r={2.2 + (i % 2) * 1.2} fill="#fbf7eb" style={{ "--sx": `${i % 2 ? 5 : -5}px`, animation: `steam 2.4s ${i * 0.4}s ease-out infinite`, transformOrigin: "0 0", opacity: 0.8 } as React.CSSProperties} />)}</g>; })()}

      {/* swinging wrought-iron bread sign (front-right) */}
      {(() => { const post = gp(1.4, 1.6, 0), topp = { x: post.x, y: post.y - 60 }, arm = { x: post.x + 20, y: post.y - 56 }; return (
        <g>
          <line x1={post.x} y1={post.y} x2={topp.x} y2={topp.y} stroke="#3a2715" strokeWidth={3.5} strokeLinecap="round" />
          <path d={`M${topp.x},${topp.y} Q${topp.x + 12},${topp.y - 6} ${arm.x},${arm.y}`} fill="none" stroke="#2c2012" strokeWidth={2.4} />
          <g style={{ animation: "sway 3.6s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y}px` }}>
            <line x1={arm.x} y1={arm.y} x2={arm.x} y2={arm.y + 5} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={arm.x - 13} y={arm.y + 5} width={26} height={18} rx={2} fill="#5a3a1f" stroke="#2c2012" strokeWidth={1.5} />
            <path d={`M${arm.x - 6},${arm.y + 19} q-2,-8 6,-8 q8,0 6,8 q-2,3 -4,-1 q-2,-3 -8,1`} fill="none" stroke="#e8c074" strokeWidth={2} strokeLinecap="round" />
          </g>
        </g>
      ); })()}

      {/* flour sacks at the shop corner */}
      {(() => { const b = gp(1.25, 1.0, 0); return <g transform={`translate(${b.x} ${b.y})`}>{[[0, 1], [11, 0.85]].map(([dx, s], i) => <g key={i} transform={`translate(${dx} 0) scale(${s})`}><ellipse cx={0} cy={1} rx={8} ry={2} fill="rgba(0,0,0,.28)" /><path d="M-7,0 L-8,-11 Q-7,-14 -4,-14 L-2,-14 L-1,-16 L1,-16 L2,-14 L4,-14 Q7,-14 8,-11 L7,0 Z" fill="#efe6cf" stroke="#bda98a" strokeWidth={0.7} /><path d="M-3,-8 L-2,-5 L-1,-7 L0,-5 L1,-8" stroke="#9a7030" strokeWidth={0.6} fill="none" /></g>)}</g>; })()}
    </g>
  );
}
