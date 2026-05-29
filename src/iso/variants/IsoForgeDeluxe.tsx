// Deluxe isometric smithy (v4) — a multi-volume compound rather than a single
// block: a brick main hall with a shingled hip roof and corbelled chimney, plus
// an attached OPEN forge porch out front (timber posts + a lean-to awning
// sheltering a stone forge hearth, anvil and bellows), a swaying hanging sign,
// a water barrel and a log pile. Built with the same panel-projection technique
// as the premium variant (flat-drawn panels projected onto iso planes via an
// affine matrix), with gradient shading, slate shingles and ambient occlusion.

import { useId } from "react";
import { PAL, Smoke } from "../../ui/buildings/v2kit.jsx";
import { type P, T, TH, lerp, pts as str, panelMatrix, brick, shingles as kitShingles, quadShingles } from "../isoKit.jsx";

const H1 = 70; // main hall wall height
const RISE = 52; // main roof apex rise
const EAVE = 9;
const LW = 120; // wall panel local space (matches isoKit PANEL)
const LH = 92;

// Deluxe uses a slightly shallower 6-row slope; wrap the kit shingles to keep
// the original edge tint + row count.
const shingles = (eaveA: P, eaveB: P, apex: P, fill: string, key: string): JSX.Element =>
  kitShingles(eaveA, eaveB, apex, fill, "rgba(0,0,0,.22)", key, 6);

export default function IsoForgeDeluxe({
  originX,
  originY,
  nearDoor = false,
}: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const o: P = { x: originX, y: originY };
  // iso point at tile offset (dx along +gx, dy along +gy), raised by h px
  const gp = (dx: number, dy: number, h = 0): P => ({ x: o.x + (dx - dy) * T, y: o.y + (dx + dy) * TH - h });

  // ---- main hall footprint (2×2), shifted back so the porch sits in front ----
  const BK = -1.4; // back edge (−gy)
  const FR = 0.6; // front edge of the hall
  const LX = -1; // left edge (−gx)
  const RX = 1; // right edge (+gx)
  // Visible-wall corners: front-right (RX,FR), right-back (RX,BK), left-front
  // (LX,FR), left-back (LX,BK). Wall tops are raised by H1.
  const frG = gp(RX, FR), frT = gp(RX, FR, H1);
  const rbG = gp(RX, BK), rbT = gp(RX, BK, H1);
  const lfG = gp(LX, FR), lfT = gp(LX, FR, H1);
  const lbT = gp(LX, BK, H1);

  // SE (lit) wall: from front-right corner up the +gx face (rbG..frG)
  const seMatrix = panelMatrix(rbT, { x: frG.x - rbG.x, y: frG.y - rbG.y }, { x: 0, y: H1 });
  // SW (shade) wall: the +gy face (lfG..frG), origin at left-front top
  const swMatrix = panelMatrix(lfT, { x: frG.x - lfG.x, y: frG.y - lfG.y }, { x: 0, y: H1 });

  // hip roof apex + eaves (overhung)
  const apex = gp((LX + RX) / 2, (BK + FR) / 2, H1 + RISE);
  const eY = (EAVE * TH) / T;
  // eave corners (push outward past the walls for an overhang)
  const RBe = { x: rbT.x + EAVE, y: rbT.y - eY };
  const FRe = { x: frT.x + EAVE, y: frT.y + eY };
  const LFe = { x: lfT.x - EAVE, y: lfT.y + eY };
  const LBe = { x: lbT.x - EAVE, y: lbT.y - eY };

  // ---- open forge porch (in front, +gy) ----
  const pyBack = FR;       // porch back edge meets hall front
  const pyFront = FR + 1.5; // porch extends forward
  const pLX = -0.9, pRX = 1.1;
  const PH = 44; // post height
  const postFL = gp(pLX, pyFront), postFLt = gp(pLX, pyFront, PH);
  const postFR = gp(pRX, pyFront), postFRt = gp(pRX, pyFront, PH);
  const postBL = gp(pLX, pyBack), postBLt = gp(pLX, pyBack, PH);
  const postBR = gp(pRX, pyBack), postBRt = gp(pRX, pyBack, PH);

  // awning roof quad: high at hall side (raise back posts to ~PH+18), low at front posts
  const awBL = gp(pLX, pyBack, PH + 22), awBR = gp(pRX, pyBack, PH + 22);
  const awFL = gp(pLX, pyFront, PH + 4), awFR = gp(pRX, pyFront, PH + 4);

  const hearthC = gp(0.1, pyBack + 0.55); // forge hearth center (on the ground under porch)

  return (
    <g>
      <defs>
        <linearGradient id={id("brickLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a05636" /><stop offset="0.5" stopColor="#8a4a30" /><stop offset="1" stopColor="#6a3320" /></linearGradient>
        <linearGradient id={id("brickShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5e3320" /><stop offset="1" stopColor="#3f2014" /></linearGradient>
        <linearGradient id={id("slateLit")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c7466" /><stop offset="1" stopColor="#565045" /></linearGradient>
        <linearGradient id={id("slateShade")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#544d42" /><stop offset="1" stopColor="#3a352d" /></linearGradient>
        <radialGradient id={id("furnace")} cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.4" stopColor="#ffa83a" /><stop offset="0.8" stopColor="#d4541c" /><stop offset="1" stopColor="#5a1c08" /></radialGradient>
        <radialGradient id={id("pane")} cx="0.5" cy="0.5" r="0.7"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#f0a836" /></radialGradient>
        <linearGradient id={id("chimney")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a5230" /><stop offset="1" stopColor="#5a2a18" /></linearGradient>
        <linearGradient id={id("water")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5aa0bd" /><stop offset="1" stopColor="#21516a" /></linearGradient>
      </defs>

      {/* ground shadow over the whole compound */}
      <ellipse cx={o.x} cy={o.y + TH * (FR + 0.4)} rx={158} ry={66} fill="rgba(0,0,0,.28)" />

      {/* cobbled yard apron under the whole compound */}
      {(() => {
        const a = gp(LX - 0.8, BK - 0.4), b = gp(RX + 2.0, BK - 0.4), c = gp(RX + 2.0, pyFront + 0.5), d = gp(LX - 1.0, pyFront + 0.7);
        const joints: JSX.Element[] = [];
        for (let t = 0.18; t < 1; t += 0.18) {
          joints.push(<line key={`jx${t}`} x1={lerp(a, d, t).x} y1={lerp(a, d, t).y} x2={lerp(b, c, t).x} y2={lerp(b, c, t).y} stroke="rgba(0,0,0,.14)" strokeWidth={1} />);
          joints.push(<line key={`jy${t}`} x1={lerp(a, b, t).x} y1={lerp(a, b, t).y} x2={lerp(d, c, t).x} y2={lerp(d, c, t).y} stroke="rgba(0,0,0,.14)" strokeWidth={1} />);
        }
        return (
          <g>
            <polygon points={str(a, b, c, d)} fill="#9a8e72" />
            <polygon points={str(a, b, c, d)} fill="rgba(255,210,150,.05)" />
            {joints}
          </g>
        );
      })()}

      {/* ===== MAIN HALL ===== */}
      {/* SW (shade) wall */}
      <g transform={swMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickShade")})`} />
        {brick("sw")}
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.2)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {/* door */}
        <g data-door="forge-entry">
          <ellipse cx={LW / 2} cy={LH - 22} rx={20} ry={26} fill="#ff8a28" opacity={nearDoor ? 0.32 : 0.12} style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${LW / 2}px ${LH - 22}px` } : undefined} />
          <path d={`M${LW / 2 - 14},${LH} L${LW / 2 - 14},${LH - 28} a14,14 0 0 1 28,0 L${LW / 2 + 14},${LH} Z`} fill="#2c1c0e" />
          <path d={`M${LW / 2 - 10},${LH} L${LW / 2 - 10},${LH - 26} a10,10 0 0 1 20,0 L${LW / 2 + 10},${LH} Z`} fill="#160d06" />
          <line x1={LW / 2} y1={LH} x2={LW / 2} y2={LH - 30} stroke="#160d06" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
        <g>
          <rect x={26} y={20} width={18} height={22} rx={1.5} fill="#2c1c0e" />
          <rect x={28} y={22} width={14} height={18} fill={`url(#${id("pane")})`} style={{ animation: "flicker 3s ease-in-out infinite", transformOrigin: "35px 31px" }} />
          <line x1={35} y1={22} x2={35} y2={40} stroke="#160d06" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <line x1={28} y1={31} x2={42} y2={31} stroke="#160d06" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
      {/* SE (lit) wall */}
      <g transform={seMatrix}>
        <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id("brickLit")})`} />
        {brick("se")}
        <rect x={0} y={0} width={LW} height={5} fill="rgba(255,225,180,.18)" />
        <rect x={0} y={LH - 12} width={LW} height={12} fill="rgba(0,0,0,.16)" />
        <rect x={0} y={LH - 8} width={LW} height={8} fill={PAL.stoneShade} />
        {[34, LW - 34].map((cx) => (
          <g key={cx}>
            <rect x={cx - 9} y={18} width={18} height={22} rx={1.5} fill="#2c1c0e" />
            <rect x={cx - 7} y={20} width={14} height={18} fill={`url(#${id("pane")})`} style={{ animation: `flicker ${2.4 + cx * 0.01}s ease-in-out infinite`, transformOrigin: `${cx}px 29px` }} />
            <line x1={cx} y1={20} x2={cx} y2={38} stroke="#160d06" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            <line x1={cx - 7} y1={29} x2={cx + 7} y2={29} stroke="#160d06" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            <rect x={cx - 10} y={40} width={20} height={3} rx={1} fill="#7a5c34" />
          </g>
        ))}
      </g>
      {/* eave beam */}
      <polyline points={str(lfT, frT, rbT)} fill="none" stroke={PAL.eave} strokeWidth={3.5} />

      {/* hip roof */}
      <polygon points={str(LBe, LFe, apex)} fill="#3a352d" />
      <polygon points={str(LBe, RBe, apex)} fill="#3a352d" />
      {shingles(LFe, FRe, apex, `url(#${id("slateShade")})`, "rsw")}
      {shingles(RBe, FRe, apex, `url(#${id("slateLit")})`, "rse")}
      <polyline points={str(LFe, FRe, RBe)} fill="none" stroke="#241f19" strokeWidth={3.5} />
      <g fill="none" strokeLinecap="round">
        <g stroke="rgba(0,0,0,.4)" strokeWidth={2.6}><line x1={apex.x} y1={apex.y} x2={FRe.x} y2={FRe.y} /><line x1={apex.x} y1={apex.y} x2={RBe.x} y2={RBe.y} /><line x1={apex.x} y1={apex.y} x2={LFe.x} y2={LFe.y} /></g>
        <g stroke={PAL.ridge} strokeWidth={1.4} opacity={0.85}><line x1={apex.x} y1={apex.y} x2={FRe.x} y2={FRe.y} /><line x1={apex.x} y1={apex.y} x2={RBe.x} y2={RBe.y} /><line x1={apex.x} y1={apex.y} x2={LFe.x} y2={LFe.y} /></g>
      </g>

      {/* corbelled chimney seated on the back-left roof slope + smoke */}
      {(() => {
        const cx = apex.x - 20;
        const cy = apex.y + 30;
        const half = 10; const hh = half * (TH / T); const h = 46; const top = cy - h;
        return (
          <g>
            <polygon points={`${cx - half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx - half},${cy + hh - h}`} fill={PAL.brickDark} />
            <polygon points={`${cx + half},${cy + hh} ${cx},${cy + 2 * hh} ${cx},${cy + 2 * hh - h} ${cx + half},${cy + hh - h}`} fill={`url(#${id("chimney")})`} />
            {/* corbel cap */}
            <polygon points={`${cx},${top - 4} ${cx + half + 2},${top + hh} ${cx},${top + 2 * hh + 4} ${cx - half - 2},${top + hh}`} fill="#6a3320" />
            <polygon points={`${cx},${top} ${cx + half},${top + hh} ${cx},${top + 2 * hh} ${cx - half},${top + hh}`} fill="#4a2014" />
            <Smoke x={cx} y={top} scale={1.2} count={4} dur={4.2} color="#c8b898" />
          </g>
        );
      })()}

      {/* ===== SIDE WING (lower lean-to on the back-right) ===== */}
      {(() => {
        const x0 = RX, x1 = RX + 1.45, y0 = BK + 0.05, y1 = BK + 1.4;
        const hw = 42, rIn = hw + 16, rOut = hw - 2;
        const B = gp(x1, y0), C = gp(x1, y1), D = gp(x0, y1);
        const Bt = gp(x1, y0, hw), Ct = gp(x1, y1, hw), Dt = gp(x0, y1, hw);
        const Ar = gp(x0, y0, rIn), Dr = gp(x0, y1, rIn), Br = gp(x1, y0, rOut), Cr = gp(x1, y1, rOut);
        // a windowed lit pane on the +gy (front) face
        const fb0 = lerp(D, C, 0.34), fb1 = lerp(D, C, 0.66);
        const ft0 = lerp(Dt, Ct, 0.34), ft1 = lerp(Dt, Ct, 0.66);
        const wbl = lerp(fb0, ft0, 0.28), wbr = lerp(fb1, ft1, 0.28), wtr = lerp(fb1, ft1, 0.66), wtl = lerp(fb0, ft0, 0.66);
        return (
          <g>
            {/* right (+gx) face */}
            <polygon points={str(B, C, Ct, Bt)} fill={`url(#${id("brickLit")})`} />
            <polygon points={str(B, C, Ct, Bt)} fill="rgba(0,0,0,.06)" />
            {/* front (+gy) face (shaded) */}
            <polygon points={str(C, D, Dt, Ct)} fill={`url(#${id("brickShade")})`} />
            {/* lit window on the front face */}
            <polygon points={str(wbl, wbr, wtr, wtl)} fill={`url(#${id("pane")})`} stroke="#2c1c0e" strokeWidth={2} style={{ animation: "flicker 2.7s ease-in-out infinite", transformOrigin: `${(wbl.x + wtr.x) / 2}px ${(wbl.y + wtr.y) / 2}px` }} />
            {/* mono-pitch slate roof */}
            <polygon points={str(Ar, Br, Cr, Dr)} fill={`url(#${id("slateLit")})`} />
            {[0.33, 0.66].map((s) => (
              <line key={s} x1={lerp(Ar, Br, s).x} y1={lerp(Ar, Br, s).y} x2={lerp(Dr, Cr, s).x} y2={lerp(Dr, Cr, s).y} stroke="rgba(0,0,0,.26)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <polyline points={str(Dr, Cr)} fill="none" stroke="#241f19" strokeWidth={2.5} />
            <polyline points={str(Ar, Dr)} fill="none" stroke={PAL.ridge} strokeWidth={1.4} opacity={0.7} />
          </g>
        );
      })()}

      {/* ===== OPEN FORGE PORCH (front) ===== */}
      {/* warm glow spilling onto the ground under the porch */}
      <ellipse cx={hearthC.x} cy={hearthC.y + 6} rx={46} ry={20} fill="rgba(255,140,40,.18)" />
      {/* back posts */}
      <line x1={postBL.x} y1={postBL.y} x2={postBLt.x} y2={postBLt.y} stroke="#3a2715" strokeWidth={5} strokeLinecap="round" />
      <line x1={postBR.x} y1={postBR.y} x2={postBRt.x} y2={postBRt.y} stroke="#3a2715" strokeWidth={5} strokeLinecap="round" />

      {/* forge hearth (stone block) + fire */}
      {(() => {
        const a = gp(-0.45, pyBack + 0.1), bb = gp(0.65, pyBack + 0.1), c = gp(0.65, pyBack + 1.0), d = gp(-0.45, pyBack + 1.0);
        const HH = 24;
        const aT = { x: a.x, y: a.y - HH }, bT = { x: bb.x, y: bb.y - HH }, cT = { x: c.x, y: c.y - HH }, dT = { x: d.x, y: d.y - HH };
        return (
          <g>
            {/* right + front stone faces */}
            <polygon points={str(bb, c, cT, bT)} fill="#6f675a" />
            <polygon points={str(c, d, dT, cT)} fill="#524b40" />
            {/* top */}
            <polygon points={str(aT, bT, cT, dT)} fill="#7c7466" />
            {/* fire on top */}
            <ellipse cx={(aT.x + cT.x) / 2} cy={(aT.y + cT.y) / 2} rx={16} ry={9} fill={`url(#${id("furnace")})`} style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: `${(aT.x + cT.x) / 2}px ${(aT.y + cT.y) / 2}px` }} />
            <g style={{ animation: "flicker 1.5s ease-in-out infinite", transformOrigin: `${(aT.x + cT.x) / 2}px ${(aT.y + cT.y) / 2 - 6}px` }}>
              <path d={`M${(aT.x + cT.x) / 2 - 10},${(aT.y + cT.y) / 2 + 2} Q${(aT.x + cT.x) / 2 - 4},${(aT.y + cT.y) / 2 - 22} ${(aT.x + cT.x) / 2},${(aT.y + cT.y) / 2 - 8} Q${(aT.x + cT.x) / 2 + 4},${(aT.y + cT.y) / 2 - 22} ${(aT.x + cT.x) / 2 + 10},${(aT.y + cT.y) / 2 + 2} Z`} fill="#ffd24a" />
            </g>
            {[0, 0.8, 1.6].map((dd, i) => (
              <circle key={i} cx={(aT.x + cT.x) / 2 + (i % 2 ? 6 : -6)} cy={(aT.y + cT.y) / 2 - 4} r={1.2} fill="#ffb14a" style={{ "--sx": `${i % 2 ? 8 : -8}px`, animation: `ember 2.6s ${dd}s ease-out infinite`, transformOrigin: `0 0` } as React.CSSProperties} />
            ))}
          </g>
        );
      })()}

      {/* anvil + bellows under the porch, in front of the hearth */}
      {(() => {
        const aPos = gp(-0.7, pyBack + 1.15);
        const bPos = gp(0.75, pyBack + 0.7);
        return (
          <g>
            <g transform={`translate(${aPos.x} ${aPos.y})`}>
              <ellipse cx={0} cy={0} rx={10} ry={2.8} fill="rgba(0,0,0,.3)" />
              <rect x={-6} y={-10} width={12} height={10} fill="#6a4a28" />
              <rect x={-8} y={-19} width={16} height={6} rx={1} fill="#5b5346" />
              <path d="M8,-16 L17,-14.5 Q18.5,-13 17,-11.5 L8,-11.5 Z" fill="#3a3530" />
              <rect x={-9} y={-13} width={18} height={2.6} rx={0.6} fill="#3a3530" />
              <line x1={-5} y1={-18} x2={4} y2={-18} stroke="#b6b6b6" strokeWidth={0.9} opacity={0.7} />
            </g>
            <g transform={`translate(${bPos.x} ${bPos.y})`}>
              <ellipse cx={0} cy={1} rx={9} ry={2} fill="rgba(0,0,0,.28)" />
              <path d="M-9,-2 Q-10,-8 -2,-8 L8,-5 L8,2 L-2,5 Q-10,4 -9,-2 Z" fill="#6a4a28" />
              <path d="M-9,-2 Q-10,-8 -2,-8 L-2,5 Q-10,4 -9,-2 Z" fill="#4a2e14" />
              <rect x={7} y={-2} width={7} height={2.6} rx={0.8} fill="#5b5346" />
            </g>
          </g>
        );
      })()}

      {/* front posts (drawn after hearth so they read as in front) */}
      <line x1={postFL.x} y1={postFL.y} x2={postFLt.x} y2={postFLt.y} stroke="#4a2e14" strokeWidth={5.5} strokeLinecap="round" />
      <line x1={postFR.x} y1={postFR.y} x2={postFRt.x} y2={postFRt.y} stroke="#4a2e14" strokeWidth={5.5} strokeLinecap="round" />

      {/* awning (mono-pitch slate) over the porch */}
      <polygon points={str(awBL, awBR, awFR, awFL)} fill={`url(#${id("slateLit")})`} />
      {quadShingles(awFL, awFR, awBR, awBL, `url(#${id("slateLit")})`, "aw")}
      <polyline points={str(awFL, awFR)} fill="none" stroke="#241f19" strokeWidth={3} />
      {/* tie beam between front posts + back posts */}
      <line x1={postFLt.x} y1={postFLt.y} x2={postFRt.x} y2={postFRt.y} stroke="#3a2715" strokeWidth={3} />
      <line x1={postBLt.x} y1={postBLt.y} x2={postBRt.x} y2={postBRt.y} stroke="#3a2715" strokeWidth={2.5} opacity={0.8} />
      {/* knee braces under the front tie beam */}
      {(() => {
        const flLo = { x: postFL.x, y: postFLt.y + 13 };
        const frLo = { x: postFR.x, y: postFRt.y + 13 };
        return (
          <g stroke="#3a2715" strokeWidth={2.6} strokeLinecap="round">
            <line x1={flLo.x} y1={flLo.y} x2={lerp(postFLt, postFRt, 0.16).x} y2={lerp(postFLt, postFRt, 0.16).y} />
            <line x1={frLo.x} y1={frLo.y} x2={lerp(postFRt, postFLt, 0.16).x} y2={lerp(postFRt, postFLt, 0.16).y} />
          </g>
        );
      })()}
      {/* tools hung on the front-right post: tongs + hammer */}
      {(() => {
        const px = postFR.x, py = postFRt.y + 16;
        return (
          <g>
            <line x1={px - 4} y1={py} x2={px + 5} y2={py} stroke="#2c2012" strokeWidth={1.6} strokeLinecap="round" />
            {/* tongs */}
            <g stroke="#5b5346" strokeWidth={1.6} strokeLinecap="round" fill="none">
              <line x1={px - 3} y1={py} x2={px - 5} y2={py + 16} />
              <line x1={px - 3} y1={py} x2={px - 1} y2={py + 16} />
            </g>
            {/* hammer */}
            <line x1={px + 3} y1={py} x2={px + 3} y2={py + 15} stroke="#7a5c34" strokeWidth={2} strokeLinecap="round" />
            <rect x={px} y={py + 13} width={7} height={4} rx={1} fill="#3a3530" />
          </g>
        );
      })()}
      {/* grindstone wheel beside the porch */}
      {(() => {
        const b = gp(-1.25, pyBack + 1.2);
        return (
          <g transform={`translate(${b.x} ${b.y})`}>
            <ellipse cx={0} cy={2} rx={12} ry={3} fill="rgba(0,0,0,.28)" />
            {/* frame legs */}
            <line x1={-8} y1={1} x2={-5} y2={-11} stroke="#4a2e14" strokeWidth={2.4} strokeLinecap="round" />
            <line x1={8} y1={1} x2={5} y2={-11} stroke="#4a2e14" strokeWidth={2.4} strokeLinecap="round" />
            {/* stone wheel */}
            <circle cx={0} cy={-12} r={9} fill="#8a8276" stroke="#5b5346" strokeWidth={1.5} />
            <circle cx={0} cy={-12} r={9} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={1} />
            <circle cx={0} cy={-12} r={1.6} fill="#3a3530" />
          </g>
        );
      })()}

      {/* ===== YARD PROPS ===== */}
      {/* hanging sign (front-left) */}
      {(() => {
        const base = gp(-1.7, pyFront - 0.2);
        const topp = { x: base.x, y: base.y - 52 };
        const arm = { x: base.x + 22, y: base.y - 50 };
        return (
          <g>
            <line x1={base.x} y1={base.y} x2={topp.x} y2={topp.y} stroke="#3a2715" strokeWidth={4} strokeLinecap="round" />
            <line x1={topp.x} y1={topp.y} x2={arm.x} y2={arm.y} stroke="#3a2715" strokeWidth={3} strokeLinecap="round" />
            <g style={{ animation: "sway 3.4s ease-in-out infinite", transformOrigin: `${arm.x}px ${arm.y}px` }}>
              <line x1={arm.x} y1={arm.y} x2={arm.x} y2={arm.y + 6} stroke="#2c2012" strokeWidth={1.5} />
              <rect x={arm.x - 13} y={arm.y + 6} width={26} height={18} rx={2} fill="#5a3a1f" stroke="#2c2012" strokeWidth={1.5} />
              {/* horseshoe glyph */}
              <path d={`M${arm.x - 6},${arm.y + 21} a6,7 0 1 1 12,0`} fill="none" stroke="#d8c48a" strokeWidth={2.4} strokeLinecap="round" />
            </g>
          </g>
        );
      })()}

      {/* water barrel (front-right) */}
      {(() => {
        const b = gp(1.6, pyFront - 0.4);
        return (
          <g transform={`translate(${b.x} ${b.y})`}>
            <ellipse cx={0} cy={2} rx={11} ry={3} fill="rgba(0,0,0,.3)" />
            <path d="M-10,0 Q-12,-16 0,-17 Q12,-16 10,0 Q0,3 -10,0 Z" fill="#6a4a28" />
            <ellipse cx={0} cy={-16} rx={10} ry={3} fill={`url(#${id("water")})`} />
            <ellipse cx={-2} cy={-16.5} rx={4} ry={1} fill="#cfe4ee" opacity={0.6} />
            <path d="M-11,-9 Q0,-7 11,-9" fill="none" stroke="#3a2715" strokeWidth={1.4} />
            <path d="M-11,-3 Q0,-1 11,-3" fill="none" stroke="#3a2715" strokeWidth={1.4} />
          </g>
        );
      })()}

      {/* log pile (right side) */}
      {(() => {
        const b = gp(2.0, pyBack + 0.4);
        return (
          <g transform={`translate(${b.x} ${b.y})`}>
            <ellipse cx={0} cy={3} rx={16} ry={4} fill="rgba(0,0,0,.28)" />
            {[[-8, 0], [0, 0], [8, 0], [-4, -7], [4, -7], [0, -14]].map(([lx, ly], i) => (
              <g key={i} transform={`translate(${lx} ${ly})`}>
                <ellipse cx={0} cy={0} rx={5} ry={6.5} fill="#6a4a28" transform="rotate(20)" />
                <ellipse cx={-1.4} cy={0} rx={2.6} ry={4} fill="#9a7038" transform="rotate(20)" />
                <ellipse cx={-1.4} cy={0} rx={1.4} ry={2.4} fill="#5a3a1f" transform="rotate(20)" />
              </g>
            ))}
          </g>
        );
      })()}

      {/* low post-and-rail fence around the front-left of the yard (gap at the entrance) */}
      {(() => {
        const Hf = 16;
        const run = [
          gp(LX - 0.9, BK - 0.1),
          gp(LX - 0.9, FR),
          gp(LX - 0.9, pyFront),
          gp(-0.4, pyFront + 0.45),
        ];
        const rails: JSX.Element[] = [];
        for (let i = 0; i < run.length - 1; i++) {
          const a = run[i], b = run[i + 1];
          rails.push(<line key={`rt${i}`} x1={a.x} y1={a.y - Hf + 3} x2={b.x} y2={b.y - Hf + 3} stroke="#6a4a28" strokeWidth={2.4} strokeLinecap="round" />);
          rails.push(<line key={`rb${i}`} x1={a.x} y1={a.y - 5} x2={b.x} y2={b.y - 5} stroke="#6a4a28" strokeWidth={2.4} strokeLinecap="round" />);
        }
        const posts = run.map((p, i) => <line key={`p${i}`} x1={p.x} y1={p.y} x2={p.x} y2={p.y - Hf} stroke="#5a3a1f" strokeWidth={3} strokeLinecap="round" />);
        return <g>{rails}{posts}</g>;
      })()}
    </g>
  );
}
