// apothecary — crooked alchemist's tower-shop (NORMAL plot, tall).
// Shape tells the story: a narrow, leaning timber-framed tower whose JETTIED
// upper floor oversails the street, topped by a steep crooked WITCH-HAT roof
// with an alembic chimney puffing green vapour. A protruding BAY WINDOW packed
// with glowing coloured bottles is the ground-floor hero; dried herbs hang under
// the jetty, a mortar-&-pestle sign swings, and a green mist drifts.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Crooked alchemist tower: leaning timber-frame shop, jettied upper floor, steep witch-hat roof + alembic vapour chimney, protruding glowing-bottle bay (hero), hanging herbs, mortar sign, green mist.",
};

export default function IsoApothecary({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seW = (gx: number, a: number, b: number, hb: number, ht: number) => PM(gp(gx, a, ht), gp(gx, b, ht), gp(gx, a, hb));
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));

  // lean: each storey nudges +gx as it rises, for a crooked look
  const s1 = { x0: -0.5, x1: 0.5, y0: -0.5, y1: 0.5, hb: 0, ht: 40 };
  const s2 = { x0: -0.66, x1: 0.66, y0: -0.66, y1: 0.66, hb: 40, ht: 78, lean: 0.08 };
  const BOT = ["#7a1d12", "#3a7088", "#6f8a3a", "#dba7c4", "#e0a83a", "#5a3a92"];

  return (
    <g>
      <defs>
        <linearGradient id={id("tealLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4e7274" /><stop offset="1" stopColor="#345052" /></linearGradient>
        <linearGradient id={id("tealShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e4848" /><stop offset="1" stopColor="#1c3232" /></linearGradient>
        <linearGradient id={id("slate")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4252" /><stop offset="1" stopColor="#2a2434" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={42} ry={18} fill="rgba(0,0,0,.3)" />

      {/* green apothecary mist on the ground */}
      <ellipse cx={o.x} cy={o.y} rx={30} ry={8} fill="rgba(120,180,120,.14)" />

      {/* ===== GROUND STOREY ===== */}
      <g transform={swW(s1.y1, s1.x0, s1.x1, s1.hb, s1.ht)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("tealShade")})`} />
        <g stroke="#1c3232" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.7}><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={3} x2={120} y2={3} /></g>
        <rect x={0} y={88} width={120} height={4} fill="#16282a" />
        {/* door */}
        <g data-door="entry">
          {nearDoor && <ellipse cx={60} cy={70} rx={14} ry={18} fill="#aed3e8" opacity={0.34} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 70px" }} />}
          <path d="M46,92 L46,60 a14,14 0 0 1 28,0 L74,92 Z" fill={PAL.timber} /><path d="M49,92 L49,61 a11,11 0 0 1 22,0 L71,92 Z" fill="#3a2010" />
          <rect x={54} y={66} width={12} height={8} fill="#2c1c0e" /><rect x={55.5} y={67.5} width={9} height={5} fill="#aed3e8" opacity={0.6} />
          <circle cx={67} cy={80} r={1.4} fill={PAL.brass} />
        </g>
      </g>
      {/* +gx lit wall of ground storey — protruding BOTTLE BAY (hero) */}
      <g transform={seW(s1.x1, s1.y0, s1.y1, s1.hb, s1.ht)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("tealLit")})`} />
        <g stroke="#1c3232" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.55}><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={3} x2={120} y2={3} /></g>
        <rect x={0} y={0} width={120} height={4} fill="rgba(180,230,230,.14)" />
        <rect x={0} y={88} width={120} height={4} fill="#16282a" />
      </g>
      {/* the bay window projects from the +gx face — drawn in screen space */}
      {(() => {
        const c = gp(s1.x1 + 0.28, 0, 20); const bx = c.x, by = c.y; // bay center, projecting +gx
        return (
          <g>
            {/* bay box (a little oriel) */}
            <path d={`M${bx - 26},${by - 22} L${bx + 4},${by - 30} L${bx + 4},${by + 14} L${bx - 26},${by + 22} Z`} fill="#16282a" />
            {/* shelves of glowing bottles (two rows) */}
            {[0, 1].map((row) => BOT.map((col, i) => { const t = i / (BOT.length - 1); const p = lerp({ x: bx - 23, y: by - 18 + row * 18 }, { x: bx + 2, y: by - 25 + row * 18 }, t); return (
              <g key={`${row}-${i}`}>
                <rect x={p.x - 2.4} y={p.y - 6} width={4.8} height={8} rx={1.4} fill={col} />
                <circle cx={p.x} cy={p.y - 3} r={1.5} fill="#fbf7eb" opacity={0.5} style={{ animation: `flicker ${1.8 + i * 0.2}s ${(row + i) * 0.12}s ease-in-out infinite`, transformOrigin: `${p.x}px ${p.y - 3}px` }} />
              </g>
            ); }))}
            {/* bay roof + sill */}
            <path d={`M${bx - 28},${by - 22} L${bx + 6},${by - 30} L${bx + 2},${by - 36} L${bx - 30},${by - 28} Z`} fill="#2c4444" />
            <path d={`M${bx - 27},${by + 21} L${bx + 5},${by + 13} L${bx + 5},${by + 17} L${bx - 27},${by + 25} Z`} fill="#3a2715" />
          </g>
        );
      })()}

      {/* jetty soffit under the oversailing upper storey */}
      <polygon points={pts(gp(s1.x1, s1.y0, s1.ht), gp(s2.x1 + s2.lean, s2.y0, s2.hb), gp(s2.x1 + s2.lean, s2.y1, s2.hb), gp(s1.x1, s1.y1, s1.ht))} fill="#16282a" />
      <polygon points={pts(gp(s1.x0, s1.y1, s1.ht), gp(s1.x1, s1.y1, s1.ht), gp(s2.x1 + s2.lean, s2.y1, s2.hb), gp(s2.x0 + s2.lean, s2.y1, s2.hb))} fill="#101e20" />

      {/* ===== UPPER STOREY (jettied + leaning +gx) ===== */}
      {(() => { const L = s2.lean; return (
        <>
          <g transform={swW(s2.y1, s2.x0 + L, s2.x1 + L, s2.hb, s2.ht)}>
            <rect x={0} y={0} width={120} height={92} fill={`url(#${id("tealShade")})`} />
            <g stroke="#1c3232" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.7}><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={46} x2={120} y2={46} /><line x1={2} y1={4} x2={60} y2={46} /><line x1={118} y1={4} x2={60} y2={46} /></g>
            <rect x={44} y={28} width={20} height={22} rx={1.5} fill="#16282a" /><rect x={46} y={30} width={16} height={18} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3.2s ease-in-out infinite", transformOrigin: "54px 39px" }} />
          </g>
          <g transform={seW(s2.x1 + L, s2.y0, s2.y1, s2.hb, s2.ht)}>
            <rect x={0} y={0} width={120} height={92} fill={`url(#${id("tealLit")})`} />
            <rect x={0} y={0} width={120} height={4} fill="rgba(180,230,230,.14)" />
            <g stroke="#1c3232" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.55}><line x1={2} y1={0} x2={2} y2={92} /><line x1={118} y1={0} x2={118} y2={92} /><line x1={0} y1={46} x2={120} y2={46} /><line x1={60} y1={4} x2={2} y2={46} /><line x1={60} y1={4} x2={118} y2={46} /></g>
            <rect x={44} y={26} width={20} height={20} rx={1.5} fill="#16282a" /><rect x={46} y={28} width={16} height={16} fill={`url(#${id("pane")})`} style={{ animation: "flicker 2.7s ease-in-out infinite", transformOrigin: "54px 36px" }} />
          </g>
        </>
      ); })()}

      {/* hanging dried herbs under the jetty (front) */}
      {(() => { const L = s2.lean; return [0.62, 0.9, 1.18].map((u, i) => { const a = lerp(gp(s2.x0 + L, s2.y1, s2.hb), gp(s2.x1 + L, s2.y1, s2.hb), u / 1.4); return (
        <g key={i} style={{ animation: `sway ${3.4 + i * 0.4}s ${i * 0.3}s ease-in-out infinite`, transformOrigin: `${a.x}px ${a.y}px` }}>
          <line x1={a.x} y1={a.y} x2={a.x} y2={a.y + 4} stroke="#2c2012" strokeWidth={0.8} />
          <ellipse cx={a.x} cy={a.y + 9} rx={2.6} ry={5} fill={i % 2 ? "#788840" : "#9060a8"} /><ellipse cx={a.x} cy={a.y + 8} rx={1.6} ry={3.4} fill={i % 2 ? "#9aa850" : "#a878c0"} opacity={0.7} />
        </g>
      ); }); })()}

      {/* ===== WITCH-HAT ROOF (steep, crooked) + alembic chimney ===== */}
      {(() => {
        const L = s2.lean;
        const tl = gp(s2.x0 + L, s2.y0, s2.ht), tr = gp(s2.x1 + L, s2.y0, s2.ht), bl = gp(s2.x0 + L, s2.y1, s2.ht), br = gp(s2.x1 + L, s2.y1, s2.ht);
        const knee = gp(0.18 + L, 0.18, s2.ht + 30); // bent point, offset for crooked
        const apex = gp(0.32 + L, 0.05, s2.ht + 58);
        return (
          <g>
            {/* lower flared cone faces */}
            <polygon points={pts(bl, br, knee)} fill={`url(#${id("slate")})`} />
            <polygon points={pts(br, tr, knee)} fill="#332d3e" />
            <polygon points={pts(bl, tl, knee)} fill="#241f2e" />
            {/* upper bent spike */}
            <polygon points={pts(knee, br, apex)} fill={`url(#${id("slate")})`} />
            <polygon points={pts(knee, bl, apex)} fill="#241f2e" />
            <polyline points={pts(bl, knee, apex)} fill="none" stroke="#5a5468" strokeWidth={1} opacity={0.6} />
            <polyline points={pts(br, knee)} fill="none" stroke="#5a5468" strokeWidth={1} opacity={0.5} />
            {/* crescent-moon finial */}
            <g transform={`translate(${apex.x} ${apex.y - 2})`}><path d="M0,-6 a6,6 0 1 0 3,11 a4.5,4.5 0 1 1 -3,-11 Z" fill="#e8e0a0" /></g>
          </g>
        );
      })()}

      {/* alembic vapour chimney on the roof shoulder */}
      {(() => { const c = gp(-0.3 + s2.lean, -0.2, s2.ht + 16); return (
        <g>
          <rect x={c.x - 4} y={c.y - 8} width={8} height={18} fill="#2c4444" /><rect x={c.x - 5} y={c.y - 10} width={10} height={3} fill="#1c3232" />
          {[0, 0.9, 1.8].map((d, i) => <circle key={i} cx={c.x} cy={c.y - 10} r={2.4 + (i % 2)} fill="#9ad080" style={{ "--sx": `${i % 2 ? 6 : -6}px`, animation: `smoke 3.8s ${d}s ease-out infinite`, transformOrigin: `${c.x}px ${c.y - 10}px`, opacity: 0.55 } as React.CSSProperties} />)}
        </g>
      ); })()}

      {/* mortar & pestle hanging sign (front-right) */}
      {(() => { const base = gp(0.95, 0.9, 0), topp = { x: base.x, y: base.y - 50 }, arm = { x: base.x - 16, y: base.y - 46 }; return (
        <g>
          <line x1={base.x} y1={base.y} x2={topp.x} y2={topp.y} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
          <path d={`M${topp.x},${topp.y} Q${topp.x - 10},${topp.y - 4} ${arm.x},${arm.y}`} fill="none" stroke="#2c2012" strokeWidth={2.2} />
          <g style={{ animation: "sway 5s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y}px` }}>
            <line x1={arm.x} y1={arm.y} x2={arm.x} y2={arm.y + 4} stroke="#2c2012" strokeWidth={1.4} />
            <rect x={arm.x - 11} y={arm.y + 4} width={22} height={16} rx={2} fill="#f3ecd6" stroke="#5a3a1f" strokeWidth={1.2} />
            <path d={`M${arm.x - 5},${arm.y + 15} Q${arm.x - 4},${arm.y + 10} ${arm.x},${arm.y + 10} Q${arm.x + 4},${arm.y + 10} ${arm.x + 5},${arm.y + 15} Z`} fill="#5a8a72" />
            <ellipse cx={arm.x} cy={arm.y + 10} rx={5} ry={1.3} fill="#3a5a5a" />
            <line x1={arm.x} y1={arm.y + 10} x2={arm.x + 5} y2={arm.y + 6} stroke="#5a3a1f" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        </g>
      ); })()}
    </g>
  );
}
