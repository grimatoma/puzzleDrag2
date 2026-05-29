// harbor_dock — working wharf (LARGE plot, landmark).
// An iso plank PIER on pilings reaching out over animated water, a small
// harbor-master SHACK at the shore end (lit window + anchor + slate roof), a
// moored SAILBOAT bobbing alongside (swaying pennant), a crane DERRICK lifting a
// bobbing CRATE, lapping waves + ripple rings + foam, and gulls wheeling
// overhead.

import { useId } from "react";
import { type P, makeGp, pts } from "../isoKit.jsx";
import { PAL } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "large",
  notes: "Plank pier on pilings over animated water; harbor-master shack (lit window + anchor), moored bobbing sailboat + swaying pennant, crane derrick with bobbing crate, ripple rings + foam, wheeling gulls.",
};

export default function IsoHarborDock({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const deckH = 10;

  return (
    <g>
      <defs>
        <radialGradient id={id("sea")} cx="0.5" cy="0.4" r="0.6"><stop offset="0" stopColor={PAL.seaLight} /><stop offset="1" stopColor={PAL.seaDark} /></radialGradient>
        <linearGradient id={id("deck")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#caaf78" /><stop offset="1" stopColor="#9c8050" /></linearGradient>
        <radialGradient id={id("win")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#e0a83a" /></radialGradient>
      </defs>

      {/* ===== WATER ===== */}
      <ellipse cx={o.x} cy={o.y + 6} rx={130} ry={64} fill={`url(#${id("sea")})`} />
      {[0, 1, 2].map((k) => (
        <ellipse key={k} cx={o.x} cy={o.y + 6} rx={46 + k * 28} ry={(46 + k * 28) * 0.5} fill="none" stroke={PAL.seaFoam} strokeWidth={1.3} opacity={0.45}
          style={{ animation: `splash ${2.8 + k * 0.5}s ${k * 0.4}s ease-in-out infinite`, transformOrigin: `${o.x}px ${o.y + 6}px` }} />
      ))}
      {/* shoreline sand at the back */}
      <polygon points={pts(gp(-2.4, -1.7, 0), gp(0.6, -1.7, 0), gp(0.6, -1.05, 0), gp(-2.4, -1.05, 0))} fill="#d8c08a" />

      {/* ===== PIER ===== pilings then deck */}
      {(() => {
        const dx0 = -0.7, dx1 = 0.7, dy0 = -1.0, dy1 = 1.35;
        const piles = [[dx0, dy1], [dx1, dy1], [dx1, 0.2], [dx0, 0.2], [dx1, dy0], [dx0, dy0]];
        return (
          <g>
            {piles.map(([px, py], i) => {
              const t = gp(px, py, deckH), b = gp(px, py, -10);
              return <line key={i} x1={t.x} y1={t.y} x2={b.x} y2={b.y} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />;
            })}
            {/* deck top */}
            <polygon points={pts(gp(dx0, dy0, deckH), gp(dx1, dy0, deckH), gp(dx1, dy1, deckH), gp(dx0, dy1, deckH))} fill={`url(#${id("deck")})`} />
            {/* plank lines (along gy) */}
            {[-0.45, 0, 0.45].map((px) => <line key={px} x1={gp(px, dy0, deckH).x} y1={gp(px, dy0, deckH).y} x2={gp(px, dy1, deckH).x} y2={gp(px, dy1, deckH).y} stroke="rgba(0,0,0,.2)" strokeWidth={0.8} />)}
            {[-0.5, 0.1, 0.7, 1.3].map((py) => <line key={py} x1={gp(dx0, py, deckH).x} y1={gp(dx0, py, deckH).y} x2={gp(dx1, py, deckH).x} y2={gp(dx1, py, deckH).y} stroke="rgba(0,0,0,.16)" strokeWidth={0.7} />)}
            {/* front fascia */}
            <polygon points={pts(gp(dx0, dy1, deckH), gp(dx1, dy1, deckH), gp(dx1, dy1, deckH - 4), gp(dx0, dy1, deckH - 4))} fill="#5a3a1f" />
            <polygon points={pts(gp(dx1, dy0, deckH), gp(dx1, dy1, deckH), gp(dx1, dy1, deckH - 4), gp(dx1, dy0, deckH - 4))} fill="#3a2715" />
          </g>
        );
      })()}

      {/* ===== HARBOR-MASTER SHACK (shore end, back) ===== */}
      {(() => {
        const sx0 = -0.62, sx1 = 0.0, sy0 = -0.9, sy1 = -0.2, H = 42;
        const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
        const apex = gp((sx0 + sx1) / 2, (sy0 + sy1) / 2, deckH + H + 26);
        const tl = gp(sx0, sy0, deckH + H), tr = gp(sx1, sy0, deckH + H), bl = gp(sx0, sy1, deckH + H), br = gp(sx1, sy1, deckH + H);
        return (
          <g>
            {/* SW (front, lit-ish) wall */}
            <g transform={PM(gp(sx0, sy1, deckH + H), gp(sx1, sy1, deckH + H), gp(sx0, sy1, deckH))}>
              <rect x={0} y={0} width={120} height={92} fill="#e0c08a" />
              <rect x={0} y={88} width={120} height={4} fill="#a8884a" />
              <g data-door="entry">
                <rect x={44} y={40} width={32} height={52} fill={PAL.timber} />
                {nearDoor && <rect x={44} y={40} width={32} height={52} fill="#ff8a28" opacity={0.26} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "60px 66px" }} />}
              </g>
              <rect x={84} y={26} width={24} height={26} fill="#3a2715" /><rect x={87} y={29} width={18} height={20} fill={`url(#${id("win")})`} style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: "96px 39px" }} />
            </g>
            {/* SE (side, shade) wall */}
            <g transform={PM(gp(sx1, sy0, deckH + H), gp(sx1, sy1, deckH + H), gp(sx1, sy0, deckH))}>
              <rect x={0} y={0} width={120} height={92} fill="#a8884a" />
              <rect x={0} y={88} width={120} height={4} fill="#7a5c34" />
            </g>
            {/* hip-ish slate roof */}
            <polygon points={pts(tl, tr, apex)} fill="#2f3848" />
            <polygon points={pts(tr, br, apex)} fill="#46505f" />
            <polygon points={pts(bl, br, apex)} fill="#3a4654" />
            <polyline points={pts(bl, br, tr)} fill="none" stroke="#1a1410" strokeWidth={2.5} />
          </g>
        );
      })()}

      {/* ===== CRANE DERRICK + bobbing crate ===== */}
      {(() => {
        const base = gp(-0.3, 0.7, deckH), tip = { x: base.x + 26, y: base.y - 40 };
        const mastTop = { x: base.x, y: base.y - 46 };
        return (
          <g>
            <line x1={base.x} y1={base.y} x2={mastTop.x} y2={mastTop.y} stroke="#5a3a1f" strokeWidth={3} strokeLinecap="round" />
            <line x1={mastTop.x} y1={mastTop.y} x2={tip.x} y2={tip.y} stroke="#5a3a1f" strokeWidth={2.4} strokeLinecap="round" />
            <line x1={mastTop.x} y1={mastTop.y} x2={base.x + 8} y2={base.y} stroke="#3a2715" strokeWidth={1} />
            <circle cx={tip.x} cy={tip.y} r={1.4} fill="#3a3530" />
            <g style={{ animation: "bob 3.2s ease-in-out infinite", transformOrigin: `${tip.x}px ${tip.y + 18}px` }}>
              <line x1={tip.x} y1={tip.y} x2={tip.x} y2={tip.y + 12} stroke="#3a2715" strokeWidth={0.9} />
              <rect x={tip.x - 6} y={tip.y + 12} width={12} height={10} fill="#bda268" stroke="#5a3a1f" strokeWidth={1} />
              <line x1={tip.x - 6} y1={tip.y + 17} x2={tip.x + 6} y2={tip.y + 17} stroke="#5a3a1f" strokeWidth={0.6} />
              <line x1={tip.x} y1={tip.y + 12} x2={tip.x} y2={tip.y + 22} stroke="#5a3a1f" strokeWidth={0.6} />
            </g>
          </g>
        );
      })()}

      {/* ===== MOORED SAILBOAT (bobbing) on the +gx side ===== */}
      {(() => { const c = gp(1.55, 0.6, 4); return (
        <g transform={`translate(${c.x} ${c.y})`}>
          <g style={{ animation: "bob 4s ease-in-out infinite", transformOrigin: "0px 0px" }}>
            <path d="M-15,0 Q-10,6 0,6 Q10,6 15,0 Z" fill="#7a3d24" />
            <path d="M-15,0 L15,0 L12,-3 L-12,-3 Z" fill="#a55a3a" />
            <line x1={0} y1={-3} x2={0} y2={-30} stroke="#3a2715" strokeWidth={1.6} />
            <path d="M0,-30 L0,-7 L12,-7 Z" fill="#fbf7eb" stroke="#7a5c34" strokeWidth={0.7} />
            <path d="M0,-30 L0,-20 L-9,-20 Z" fill="#f0e8d6" stroke="#7a5c34" strokeWidth={0.7} />
            <g style={{ animation: "sway 2.4s ease-in-out infinite", transformOrigin: "0px -30px" }}>
              <path d="M0,-30 L8,-28 L5,-26 L8,-24 L0,-25 Z" fill="#c96442" />
            </g>
          </g>
        </g>
      ); })()}

      {/* ===== GULLS wheeling overhead ===== */}
      {[{ x: 0.2, h: 70, e: 40, d: 18, dl: 0, s: 1 }, { x: 1.1, h: 84, e: -34, d: 20, dl: 2, s: 0.8 }, { x: -0.6, h: 96, e: 26, d: 24, dl: 1, s: 0.7 }].map((g, i) => {
        const c = gp(g.x, 0, g.h);
        return (
          <g key={i} transform={`translate(${c.x} ${c.y})`}>
            <g style={{ animation: `walk ${g.d}s ${g.dl}s linear infinite alternate`, transformOrigin: "0 0", ["--end" as string]: `${g.e}px` } as React.CSSProperties}>
              <g style={{ animation: `flap ${0.4 + i * 0.05}s ${i * 0.15}s ease-in-out infinite`, transformOrigin: "0 0" }} transform={`scale(${g.s})`}>
                <path d="M-5,1 Q-2,-3 0,0 Q2,-3 5,1" stroke="#3a2715" strokeWidth={1.3} fill="none" strokeLinecap="round" />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}
