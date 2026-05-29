// hearth — the town home (NORMAL plot), the warm heart of the village.
// Shape tells the story: a cosy thatched cottage dominated by a MASSIVE battered
// STONE CHIMNEY-BREAST that bulges off the gable end and climbs into a fat
// smoking stack — the great fireplace glowing warm at its base. A catslide
// thatch roof sweeps low over a timbered porch with a bench; warm windows, a
// flower garden and a wiggling bush make it lived-in.

import { useId } from "react";
import { type P, makeGp, pts, lerp } from "../isoKit.jsx";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Cottage home: huge battered stone chimney-breast up the gable (glowing hearth + fat smoking stack) is the hero, catslide thatch roof, timber porch + bench, warm windows, flower garden.",
};

export default function IsoHearth({ originX, originY, nearDoor = false }: { originX: number; originY: number; nearDoor?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  const gp = makeGp(o);
  const PM = (org: P, U: P, V: P) => `matrix(${(U.x - org.x) / 120} ${(U.y - org.y) / 120} ${(V.x - org.x) / 92} ${(V.y - org.y) / 92} ${org.x} ${org.y})`;
  const seW = (gx: number, a: number, b: number, hb: number, ht: number) => PM(gp(gx, a, ht), gp(gx, b, ht), gp(gx, a, hb));
  const swW = (gy: number, a: number, b: number, hb: number, ht: number) => PM(gp(a, gy, ht), gp(b, gy, ht), gp(a, gy, hb));
  const x0 = -0.5, x1 = 0.92, y0 = -0.72, y1 = 0.72, H = 52, RISE = 40, ov = 0.16;

  // thatch slope helper (combed straw) over a triangle eaveA-eaveB-apex
  const thatch = (eA: P, eB: P, ap: P, fill: string, key: string) => { const s: JSX.Element[] = [];
    for (let i = 1; i < 10; i++) { const a = lerp(eA, eB, i / 10); s.push(<line key={`${key}${i}`} x1={a.x} y1={a.y} x2={a.x * 0.1 + ap.x * 0.9} y2={a.y * 0.1 + ap.y * 0.9} stroke="rgba(0,0,0,.14)" strokeWidth={0.7} />); }
    return <g><polygon points={pts(eA, eB, ap)} fill={fill} />{s}</g>; };

  return (
    <g>
      <defs>
        <linearGradient id={id("plasterLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e2cf" /><stop offset="1" stopColor="#e0c3a8" /></linearGradient>
        <linearGradient id={id("plasterShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cda98e" /><stop offset="1" stopColor="#a8856a" /></linearGradient>
        <linearGradient id={id("thatchLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8b25e" /><stop offset="1" stopColor="#a8813c" /></linearGradient>
        <linearGradient id={id("thatchShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8813c" /><stop offset="1" stopColor="#7c5c28" /></linearGradient>
        <linearGradient id={id("stoneLit")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6a5f4e" /><stop offset="0.5" stopColor="#9a8c74" /><stop offset="1" stopColor="#766a55" /></linearGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff0b8" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
        <radialGradient id={id("fire")} cx="0.5" cy="0.75" r="0.7"><stop offset="0" stopColor="#fff3c8" /><stop offset="0.5" stopColor="#ffb43a" /><stop offset="1" stopColor="#a3340c" /></radialGradient>
      </defs>

      <ellipse cx={o.x} cy={o.y + 3} rx={70} ry={26} fill="rgba(0,0,0,.3)" />
      <ellipse cx={o.x + 36} cy={o.y - 2} rx={26} ry={9} fill="rgba(255,150,60,.14)" />

      {/* ===== COTTAGE ===== */}
      {/* +gy long wall (shade) with door + window */}
      <g transform={swW(y1, x0, x1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterShade")})`} />
        <rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        <g stroke="#a8856a" strokeWidth={2} opacity={0.4} vectorEffect="non-scaling-stroke"><line x1={2} y1={4} x2={2} y2={92} /></g>
        <Win m="" cx={88} y={34} w={20} h={24} id={id} dur={3.3} />
      </g>
      {/* +gx gable wall (lit) with a window (chimney-breast sits on this end) */}
      <g transform={seW(x1, y0, y1, 0, H)}>
        <rect x={0} y={0} width={120} height={92} fill={`url(#${id("plasterLit")})`} />
        <rect x={0} y={0} width={120} height={4} fill="rgba(255,235,200,.18)" />
        <rect x={0} y={86} width={120} height={6} fill={PAL.stoneShade} />
        <Win m="" cx={86} y={34} w={20} h={26} id={id} dur={2.9} />
      </g>
      {/* gable triangle (lit) */}
      {(() => { const eL = gp(x1, y0, H), eR = gp(x1, y1, H), ap = gp(x1, 0, H + RISE); return <g><polygon points={pts(eL, ap, eR)} fill={`url(#${id("plasterLit")})`} /><polygon points={pts(eL, ap, eR)} fill="rgba(255,235,200,.05)" /></g>; })()}

      {/* ===== CATSLIDE THATCH ROOF (long sweeping +gy slope) ===== */}
      {(() => {
        const eL = gp(x0 - ov, y1 + 0.55, H - 18), eR = gp(x1 + ov, y1 + 0.55, H - 18); // catslide: front eave sweeps low + out
        const rL = gp(x0 - ov, 0, H + RISE), rR = gp(x1 + ov, 0, H + RISE);
        const s: JSX.Element[] = [];
        for (let i = 1; i < 11; i++) { const a = lerp(eL, rL, i / 11), b = lerp(eR, rR, i / 11); s.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,.12)" strokeWidth={0.7} />); }
        return (
          <g>
            <polygon points={pts(gp(x0 - ov, y0 - ov, H), rL, rR, gp(x1 + ov, y0 - ov, H))} fill="#7c5c28" />
            <polygon points={pts(eL, eR, rR, rL)} fill={`url(#${id("thatchLit")})`} />{s}
            {/* +gx gable end thatch (the rake) */}
            {thatch(gp(x1 + ov, y1 + 0.55, H - 18), gp(x1 + ov, y0 - ov, H), gp(x1 + ov, 0, H + RISE), `url(#${id("thatchShade")})`, "ge")}
            {/* fat rounded eave + ridge */}
            <polyline points={pts(eL, eR)} fill="none" stroke="#6a4e22" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={pts(rL, rR)} fill="none" stroke="#e0bc6a" strokeWidth={4} strokeLinecap="round" />
          </g>
        );
      })()}

      {/* ===== MASSIVE STONE CHIMNEY-BREAST on the +gx gable (hero) ===== */}
      {(() => {
        // battered breast: wide at base, tapering up; projects +gx from the gable
        const bw0 = 0.46, bw1 = 0.27;  // half-width in gy at base / top, in tiles
        const px = x1 + 0.2;           // projection out from gable
        const baseF = gp(px + 0.14, -bw0, 0), baseB = gp(px + 0.14, bw0, 0);
        const midF = gp(px, -bw0, 38), midB = gp(px, bw0, 38);
        const topF = gp(px - 0.06, -bw1, H + RISE - 4), topB = gp(px - 0.06, bw1, H + RISE - 4);
        const stackTop = H + RISE + 14;
        const stF = gp(px - 0.06, -bw1 + 0.04, stackTop), stB = gp(px - 0.06, bw1 - 0.04, stackTop);
        return (
          <g>
            {/* breast body (front face toward viewer = the SE/+gx outer face) */}
            <polygon points={pts(baseF, midF, topF, gp(px - 0.08, -bw1, H + RISE + 6))} fill="#6a5f4e" />
            <polygon points={pts(baseF, baseB, midB, midF)} fill={`url(#${id("stoneLit")})`} />
            <polygon points={pts(midF, midB, topB, topF)} fill={`url(#${id("stoneLit")})`} />
            {/* stone coursing */}
            {[10, 22, 34, 46].map((h) => <path key={h} d={`M${gp(px + 0.05, -bw0, h).x},${gp(px + 0.05, -bw0, h).y} L${gp(px + 0.05, bw0, h).x},${gp(px + 0.05, bw0, h).y}`} stroke="rgba(0,0,0,.18)" strokeWidth={0.8} />)}
            {/* carved date-stone niche (no exposed fire — the hearth is indoors) */}
            {(() => { const c = gp(px + 0.12, 0, 22); return <g><rect x={c.x - 5} y={c.y - 5} width={10} height={9} rx={1} fill="#4a4236" /><rect x={c.x - 3.5} y={c.y - 3.5} width={7} height={6} fill="#5a5044" /></g>; })()}
            {/* tapered cap to stack */}
            <polygon points={pts(topF, topB, stB, stF)} fill="#5a5044" />
            {/* stack cap */}
            <polygon points={pts(gp(px - 0.14, -bw1, stackTop), gp(px - 0.14, bw1, stackTop), gp(px - 0.02, bw1, stackTop + 5), gp(px - 0.02, -bw1, stackTop + 5))} fill="#3a342c" />
            <Smoke x={gp(px - 0.08, 0, stackTop).x} y={gp(px - 0.08, 0, stackTop).y - 4} scale={1.3} count={5} dur={4.6} color="#e4d8c0" />
            <Smoke x={gp(px - 0.08, 0, stackTop).x + 3} y={gp(px - 0.08, 0, stackTop).y - 4} scale={0.9} count={3} dur={3.8} color="#c8b898" />
          </g>
        );
      })()}

      {/* ===== TIMBER PORCH over the door (front +gy) ===== */}
      {(() => {
        const a = gp(-0.45, y1 + 0.05, 0), b = gp(0.25, y1 + 0.05, 0), af = gp(-0.45, y1 + 0.6, 0), bf = gp(0.25, y1 + 0.6, 0);
        const PH = 30;
        return (
          <g>
            {/* door on the wall behind */}
            <g data-door="entry" transform={swW(y1, x0, x1, 0, H)}>
              {nearDoor && <ellipse cx={32} cy={66} rx={16} ry={20} fill="#ffcf6a" opacity={0.4} style={{ animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "32px 66px" }} />}
              <path d="M20,92 L20,58 a12,12 0 0 1 24,0 L44,92 Z" fill={PAL.timber} /><path d="M23,92 L23,59 a9,9 0 0 1 18,0 L41,92 Z" fill={PAL.timberSoft} /><circle cx={38} cy={76} r={1.4} fill={PAL.brass} />
            </g>
            {/* porch posts + lean-to thatch */}
            <line x1={af.x} y1={af.y} x2={af.x} y2={af.y - PH} stroke="#5a3a1f" strokeWidth={4} strokeLinecap="round" />
            <line x1={bf.x} y1={bf.y} x2={bf.x} y2={bf.y - PH} stroke="#5a3a1f" strokeWidth={4} strokeLinecap="round" />
            <polygon points={pts({ x: a.x, y: a.y - PH - 12 }, { x: b.x, y: b.y - PH - 12 }, { x: bf.x, y: bf.y - PH }, { x: af.x, y: af.y - PH })} fill={`url(#${id("thatchShade")})`} />
            <polyline points={pts({ x: af.x, y: af.y - PH }, { x: bf.x, y: bf.y - PH })} fill="none" stroke="#6a4e22" strokeWidth={4} strokeLinecap="round" />
            {/* bench */}
            <g transform={`translate(${gp(0.55, y1 + 0.4, 0).x} ${gp(0.55, y1 + 0.4, 0).y})`}><rect x={-7} y={-5} width={14} height={2.4} rx={0.5} fill="#5a3a1f" /><rect x={-6} y={-3} width={1.4} height={3} fill="#5a3a1f" /><rect x={4.6} y={-3} width={1.4} height={3} fill="#5a3a1f" /></g>
          </g>
        );
      })()}

      {/* flower garden + bush (front-left) */}
      {(() => { const g = gp(-0.95, y1 + 0.2, 0); return (
        <g transform={`translate(${g.x} ${g.y})`} style={{ animation: "wiggle 3s ease-in-out infinite", transformOrigin: `${g.x}px ${g.y}px` }}>
          <ellipse cx={0} cy={1} rx={9} ry={2} fill="rgba(0,0,0,.2)" />
          <ellipse cx={0} cy={-4} rx={8} ry={6} fill="#5a7a28" /><ellipse cx={0} cy={-5} rx={6.5} ry={4.5} fill="#7fa848" />
          <circle cx={-3} cy={-7} r={1.2} fill="#dba7c4" /><circle cx={2} cy={-8} r={1.1} fill="#f4d262" /><circle cx={0} cy={-9} r={1.2} fill="#e58a4f" /><circle cx={4} cy={-5} r={1} fill="#dba7c4" />
        </g>
      ); })()}
    </g>
  );
}

function Win({ m, cx, y, w, h, id, dur }: { m: string; cx: number; y: number; w: number; h: number; id: (s: string) => string; dur: number }) {
  return (
    <g transform={m}>
      <rect x={cx - w / 2 - 2} y={y - 2} width={w + 4} height={h + 4} fill="#2c1c0e" />
      <rect x={cx - w / 2} y={y} width={w} height={h} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${dur}s ease-in-out infinite`, transformOrigin: `${cx}px ${y + h / 2}px` }} />
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke="#2c1c0e" strokeWidth={1.2} /><line x1={cx - w / 2} y1={y + h / 2} x2={cx + w / 2} y2={y + h / 2} stroke="#2c1c0e" strokeWidth={1.2} />
      <rect x={cx - w / 2 - 2} y={y + h} width={w + 4} height={2.5} fill="#7a5c34" />
    </g>
  );
}
