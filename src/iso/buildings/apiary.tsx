// apiary — giant straw SKEP beehive (SMALL plot).
// Shape tells the story: the building IS a colossal coiled-straw skep — the
// archetypal domed beehive — built of stacked tapering rope-coils narrowing to
// a knotted finial, with a low arched flight-hole + landing board where bees
// stream in and out (pollen drift). A couple of timber hive boxes, a nodding
// sunflower and a honey jar dress the bee-yard. No box, no label needed.

import { useId } from "react";
import { type P, makeGp } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "small",
  notes: "Building IS a giant coiled-straw skep (domed beehive): stacked rope-coils to a knotted finial, arched flight-hole + landing board with bees streaming out (pollen), timber hive boxes, nodding sunflower, honey jar. Unmistakable apiary silhouette.",
};

const R = 42, HD = 70, N = 10;

export default function IsoApiary({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const cx = o.x, baseY = o.y - 2;
  const ringR = (t: number) => R * Math.sqrt(Math.max(0, 1 - t * t));

  // a small timber hive box (stacked supers + gabled lid)
  const hive = (hx: number, hy: number) => (
    <g transform={`translate(${hx} ${hy})`}>
      <ellipse cx={0} cy={2} rx={9} ry={2} fill="rgba(0,0,0,.3)" />
      <rect x={-8} y={-4} width={16} height={5} fill="#e8c266" stroke="#a98a4a" strokeWidth={0.5} />
      <rect x={-8} y={-9} width={16} height={5} fill="#f4d262" stroke="#a98a4a" strokeWidth={0.5} />
      <rect x={-8} y={-14} width={16} height={5} fill="#e8c266" stroke="#a98a4a" strokeWidth={0.5} />
      <path d="M-9,-14 L0,-19 L9,-14 Z" fill="#7a5c34" /><path d="M-9,-14 L0,-19 L-3,-14 Z" fill="rgba(0,0,0,.3)" />
      <rect x={-4} y={-2} width={8} height={1.4} fill="#3a2715" /><rect x={-2.5} y={-2.6} width={5} height={1} fill="#1a1410" />
    </g>
  );

  // bee specks drifting around an anchor (pollen keyframe; outer translate / inner anim)
  const bees = (bx: number, by: number, n: number, base = 0) =>
    Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`translate(${bx} ${by})`}>
        <g style={{ "--px": `${i % 2 ? 24 : -22}px`, animation: `pollen ${3.6 + i * 0.5}s ${base + i * 0.4}s ease-in-out infinite`, transformOrigin: "0 0" } as React.CSSProperties}>
          <ellipse cx={0} cy={0} rx={1.1} ry={0.7} fill="#f4d262" /><line x1={-0.8} y1={0} x2={0.8} y2={0} stroke="#1a1410" strokeWidth={0.35} />
          <ellipse cx={0} cy={-0.8} rx={0.9} ry={0.4} fill="#fbf7eb" opacity={0.6} />
        </g>
      </g>
    ));

  return (
    <g>
      <defs>
        {/* horizontal straw roundness: SW (left) shade → SE (right) lit */}
        <linearGradient id={id("straw")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a7838" /><stop offset="0.42" stopColor="#d8b25a" /><stop offset="0.7" stopColor="#f0d27a" /><stop offset="1" stopColor="#c89a48" />
        </linearGradient>
        <linearGradient id={id("strawDk")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c5e2a" /><stop offset="0.5" stopColor="#b08e42" /><stop offset="1" stopColor="#9a7634" />
        </linearGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={R + 22} ry={(R + 22) * 0.5} fill="rgba(0,0,0,.3)" />

      {/* clover dots in the grass */}
      {[-1.7, 1.8, 2.2].map((dx, i) => { const c = gp(dx, 0.7, 0); return <g key={i}><circle cx={c.x - 1} cy={c.y - 1.4} r={0.8} fill="#7fa848" /><circle cx={c.x + 1} cy={c.y - 1.4} r={0.8} fill="#7fa848" /><circle cx={c.x} cy={c.y - 2.4} r={0.5} fill="#fbf7eb" /></g>; })}

      {/* ===== the SKEP dome (hero): stacked tapering straw coils ===== */}
      {(() => {
        const bands: JSX.Element[] = [];
        for (let b = 0; b < N; b++) {
          const t0 = b / N, t1 = (b + 1) / N;
          const r0 = ringR(t0), y0 = baseY - t0 * HD;
          const dark = b % 2 === 1;
          bands.push(
            <g key={b}>
              {/* the coil row (full ellipse; upper coil overdraws its top) */}
              <ellipse cx={cx} cy={y0} rx={r0} ry={r0 * 0.5} fill={`url(#${id(dark ? "strawDk" : "straw")})`} />
              {/* seam shadow under this coil's front edge */}
              <path d={`M${cx - r0},${y0} A${r0},${r0 * 0.5} 0 0 0 ${cx + r0},${y0}`} fill="none" stroke="rgba(60,40,12,.45)" strokeWidth={1.1} />
              {/* coil stitch ticks across the front of the row */}
              <g stroke="rgba(90,62,20,.4)" strokeWidth={0.7}>
                {[-0.72, -0.45, -0.18, 0.12, 0.4, 0.66].map((f, k) => {
                  const ex = cx + f * r0, ey = y0 + Math.sqrt(Math.max(0, 1 - f * f)) * r0 * 0.5 - 1;
                  return <line key={k} x1={ex} y1={ey - (t1 - t0) * HD * 0.5} x2={ex + 1.6} y2={ey} />;
                })}
              </g>
            </g>,
          );
        }
        return <g>{bands}</g>;
      })()}
      {/* soft lit highlight running up the SE shoulder */}
      <path d={`M${cx + ringR(0) * 0.6},${baseY - 0.16 * HD} Q${cx + ringR(0.5) * 0.5},${baseY - 0.55 * HD} ${cx + 3},${baseY - HD + 6}`} fill="none" stroke="rgba(255,246,216,.16)" strokeWidth={5} strokeLinecap="round" />

      {/* knotted straw finial */}
      <g transform={`translate(${cx} ${baseY - HD})`}>
        <ellipse cx={0} cy={0} rx={5} ry={3} fill="#c89a48" /><ellipse cx={0} cy={-2} rx={2.4} ry={3.4} fill="#b08236" /><circle cx={0} cy={-4} r={1.4} fill="#9a6f2e" />
      </g>

      {/* ===== flight-hole + landing board (front, bees streaming) ===== */}
      {(() => { const fhY = baseY + R * 0.22; return (
        <g data-door="entry">
          {nearDoor && <ellipse cx={cx} cy={fhY - 6} rx={16} ry={13} fill="#ff8a28" opacity={0.28} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${cx}px ${fhY - 6}px` }} />}
          {/* arched dark flight hole */}
          <path d={`M${cx - 11},${fhY} L${cx - 11},${fhY - 9} a11,11 0 0 1 22,0 L${cx + 11},${fhY} Z`} fill="#1c1206" />
          <path d={`M${cx - 11},${fhY} L${cx - 11},${fhY - 9} a11,11 0 0 1 22,0`} fill="none" stroke="rgba(60,40,12,.6)" strokeWidth={1.4} />
          {/* honeycomb hint inside */}
          <g fill="#3a2c12" opacity={0.7}><circle cx={cx - 3} cy={fhY - 6} r={1.5} /><circle cx={cx + 1} cy={fhY - 4} r={1.5} /><circle cx={cx + 4} cy={fhY - 8} r={1.3} /></g>
          {/* alighting board */}
          <polygon points={`${cx - 13},${fhY} ${cx + 13},${fhY} ${cx + 16},${fhY + 5} ${cx - 16},${fhY + 5}`} fill="#8a6a3a" />
          <polygon points={`${cx - 16},${fhY + 5} ${cx + 16},${fhY + 5} ${cx + 16},${fhY + 7} ${cx - 16},${fhY + 7}`} fill="#5a4324" />
          {/* bees crawling on the board */}
          {[-6, 0, 7].map((dx) => <ellipse key={dx} cx={cx + dx} cy={fhY + 2.5} rx={1.1} ry={0.7} fill="#e8b53a" />)}
        </g>
      ); })()}

      {/* bees streaming from the flight hole + foraging around the skep */}
      {bees(cx, baseY + R * 0.22 - 4, 4, 0)}
      {bees(cx + R * 0.7, baseY - HD * 0.5, 3, 0.6)}

      {/* ===== bee-yard props ===== */}
      {[gp(-1.55, 0.95, 0), gp(1.5, 1.05, 0)].map((p, i) => <g key={i}>{hive(p.x, p.y)}</g>)}
      {bees(gp(-1.55, 0.95, 16).x, gp(-1.55, 0.95, 16).y, 2, 1.1)}

      {/* honey jar + nodding sunflower */}
      {(() => { const hj = gp(-2.0, 0.5, 0), sf = gp(1.95, 0.45, 0); return (
        <g>
          <g transform={`translate(${hj.x} ${hj.y})`}>
            <ellipse cx={0} cy={1} rx={4} ry={1} fill="rgba(0,0,0,.3)" />
            <path d="M-3,0 L-3,-6 Q-3,-7.5 -1.5,-7.5 L1.5,-7.5 Q3,-7.5 3,-6 L3,0 Z" fill="#e0a83a" />
            <rect x={-2.5} y={-7.5} width={5} height={1.4} fill="#fbf7eb" /><rect x={-2} y={-4.5} width={4} height={2.4} fill="#fbf7eb" />
            <circle cx={3.4} cy={-5} r={0.6} fill={PAL.brass} />
          </g>
          <g transform={`translate(${sf.x} ${sf.y})`}>
            <line x1={0} y1={0} x2={0} y2={-18} stroke="#4d6b25" strokeWidth={1.2} />
            <ellipse cx={-2.4} cy={-10} rx={1.8} ry={0.9} fill="#7fa848" transform="rotate(-30 -2.4 -10)" />
            <g style={{ animation: "sway 3.4s ease-in-out infinite", transformOrigin: "0px -16px" }}>
              <g transform="translate(0 -19)">
                {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <ellipse key={i} cx={Math.cos(a) * 2.8} cy={Math.sin(a) * 2.8} rx={1.6} ry={0.9} transform={`rotate(${(i / 12) * 360} ${Math.cos(a) * 2.8} ${Math.sin(a) * 2.8})`} fill="#f4d262" />; })}
                <circle r={2.4} fill="#7a5c34" />
              </g>
            </g>
          </g>
        </g>
      ); })()}
    </g>
  );
}
