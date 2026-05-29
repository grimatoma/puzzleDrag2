// The town forge re-drawn as a boxy isometric building, painted strictly
// back-to-front. Returns a <g> meant to be embedded inside IsoPrototype's
// <svg> (the Smoke emitter expects to live inside an svg). Reuses the forge
// palette + Smoke emitter from the flat building kit; CSS keyframes (flicker,
// smoke, ember) come from src/index.css via the entry's import.

import { PAL, Smoke } from "../ui/buildings/v2kit.jsx";
import { TILE_W, TILE_H } from "./isoMath.js";

// --- Tunable geometry (screen-space pixels relative to the anchor) ---
// The forge sits on a 2×2 footprint. The anchor (originX/originY) is the
// projected center of that footprint. From the center, the four footprint
// corners of a 2×2 plot sit one tile-extent away along each iso axis.
const HALF_W = TILE_W; // px from center to the left/right footprint corners
const HALF_H = TILE_H; // px from center to the top/bottom footprint corners
const WALL_H = 70; // wall height in px (footprint top → eave)
const ROOF_RISE = 34; // ridge height above the eave
const CHIM_H = 22; // chimney box height
const CHIM_W = 12; // chimney box half-width footprint extent (iso)

// Chimney box: a small iso prism on the roof, defined by its ground
// (roof-contact) center and drawn as two faces + a top cap. Hoisted to module
// scope so it isn't re-created on every IsoForge render.
function Chimney({ cx, cy }: { cx: number; cy: number }) {
  const w = CHIM_W / 2;
  const h = (CHIM_W / 2) * (TILE_H / TILE_W);
  const cTop = { x: cx, y: cy - CHIM_H };
  const fRight = `${cx + w},${cy + h} ${cx},${cy + 2 * h} ${cx},${cy + 2 * h - CHIM_H} ${cx + w},${cy + h - CHIM_H}`;
  const fLeft = `${cx - w},${cy + h} ${cx},${cy + 2 * h} ${cx},${cy + 2 * h - CHIM_H} ${cx - w},${cy + h - CHIM_H}`;
  const cap = `${cTop.x},${cTop.y} ${cTop.x + w},${cTop.y + h} ${cTop.x},${cTop.y + 2 * h} ${cTop.x - w},${cTop.y + h}`;
  return (
    <g>
      <polygon points={fLeft} fill={PAL.brickDark} />
      <polygon points={fRight} fill={PAL.brick} />
      <polygon points={cap} fill={PAL.brickDark} />
    </g>
  );
}

export default function IsoForge({
  originX,
  originY,
  nearDoor = false,
}: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) {
  const ox = originX;
  const oy = originY;

  // Footprint corners (ground level, y down). For a 2×2 plot the projected
  // diamond spans 2 tiles, so corners are 2× a single tile's half extents.
  const top = { x: ox, y: oy - HALF_H };
  const right = { x: ox + HALF_W, y: oy };
  const bottom = { x: ox, y: oy + HALF_H };
  const left = { x: ox - HALF_W, y: oy };

  // Wall-top (eave) versions of the same corners, raised by WALL_H.
  const topT = { x: top.x, y: top.y - WALL_H };
  const rightT = { x: right.x, y: right.y - WALL_H };
  const bottomT = { x: bottom.x, y: bottom.y - WALL_H };
  const leftT = { x: left.x, y: left.y - WALL_H };

  // Two viewer-facing wall faces meet at the `bottom` (front) corner.
  // RIGHT-facing face: between `right` and `bottom`. LEFT-facing: `left`→`bottom`.
  const rightFace = `${right.x},${right.y} ${bottom.x},${bottom.y} ${bottomT.x},${bottomT.y} ${rightT.x},${rightT.y}`;
  const leftFace = `${left.x},${left.y} ${bottom.x},${bottom.y} ${bottomT.x},${bottomT.y} ${leftT.x},${leftT.y}`;

  // Roof: a hip roof with a single apex raised above the footprint center.
  // (A ridge between the front/back corners collapses to a vertical screen line
  // in iso, so a center apex with four triangular slopes reads far cleaner.)
  const apex = { x: ox, y: oy - WALL_H - ROOF_RISE };
  // Front two slopes are visible; back two are hidden behind the apex but drawn
  // first for safety. SE (front-right) slope is lit; SW (front-left) is shaded.
  const slopeBackLeft = `${topT.x},${topT.y} ${leftT.x},${leftT.y} ${apex.x},${apex.y}`;
  const slopeBackRight = `${topT.x},${topT.y} ${rightT.x},${rightT.y} ${apex.x},${apex.y}`;
  const slopeFrontRight = `${rightT.x},${rightT.y} ${bottomT.x},${bottomT.y} ${apex.x},${apex.y}`;
  const slopeFrontLeft = `${leftT.x},${leftT.y} ${bottomT.x},${bottomT.y} ${apex.x},${apex.y}`;

  // Brick course lines parallel to a face's top edge.
  function courses(
    a: { x: number; y: number },
    b: { x: number; y: number },
    aTop: { x: number; y: number },
    bTop: { x: number; y: number },
    n: number,
  ) {
    const lines: JSX.Element[] = [];
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const x1 = a.x + (aTop.x - a.x) * t;
      const y1 = a.y + (aTop.y - a.y) * t;
      const x2 = b.x + (bTop.x - b.x) * t;
      const y2 = b.y + (bTop.y - b.y) * t;
      lines.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />);
    }
    return lines;
  }

  // Front (right-facing) face local frame: we draw details in plain screen
  // space anchored near the bottom-right wall, roughly centered on that face.
  const faceMidX = (right.x + bottom.x) / 2;
  const faceMidY = (right.y + bottom.y) / 2;
  // SW (front-left) face midpoint — where the door + approach path live.
  const leftMidX = (left.x + bottom.x) / 2;
  const leftMidY = (left.y + bottom.y) / 2;

  // One chimney sitting on the SE roof slope, partway from apex toward the
  // right eave so it visibly rests on the roof rather than floating.
  const chim = {
    x: apex.x + (rightT.x - apex.x) * 0.42,
    y: apex.y + (rightT.y - apex.y) * 0.42,
  };

  return (
    <g>
      {/* 1. Footprint shadow on the ground */}
      <polygon
        points={`${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`}
        fill="rgba(0,0,0,.32)"
        transform={`translate(0 4)`}
      />

      {/* 2. Wall faces — left (shaded) then right (lit) */}
      <polygon points={leftFace} fill={PAL.brickDark} />
      <polygon points={rightFace} fill={PAL.brick} />
      {/* brick courses for texture */}
      <g stroke={PAL.brickDark} strokeWidth="0.6" opacity="0.45">
        {courses(left, bottom, leftT, bottomT, 5)}
      </g>
      <g stroke={PAL.brickDark} strokeWidth="0.6" opacity="0.6">
        {courses(right, bottom, rightT, bottomT, 5)}
      </g>

      {/* 3. Front (right-facing) face details — the forge identity.
            Sheared to lie flat against the right-facing wall.
            skewY tilts content to follow the iso top edge of that face. */}
      <g transform={`translate(${faceMidX} ${faceMidY}) skewY(26.57)`}>
        {/* glowing furnace arch */}
        <path d="M-18,-8 L-18,-32 a18,18 0 0 1 36,0 L18,-8 Z" fill={PAL.brickDark} />
        <path d="M-15,-8 L-15,-30 a15,15 0 0 1 30,0 L15,-8 Z" fill="#1a0a00" />
        <ellipse
          cx="0"
          cy="-14"
          rx="14"
          ry="9"
          fill="#ff8a28"
          opacity="0.7"
          style={{ animation: "flicker 2.2s ease-in-out infinite", transformOrigin: "0px -14px" }}
        />
        <g style={{ animation: "flicker 1.6s ease-in-out infinite", transformOrigin: "0px -18px" }}>
          <path d="M-10,-8 Q-6,-20 0,-14 Q6,-20 10,-8 Z" fill="#c96442" />
        </g>
        <g style={{ animation: "flicker 1.1s 0.2s ease-in-out infinite", transformOrigin: "0px -20px" }}>
          <path d="M-6,-8 Q-3,-18 0,-14 Q3,-18 6,-8 Z" fill="#ffb14a" />
        </g>
        {/* arch keystone */}
        <ellipse cx="0" cy="-32" rx="4" ry="2.5" fill={PAL.stone} />

        {/* lit window (upper-right of furnace on the face) */}
        <rect x="22" y="-46" width="14" height="11" rx="1" fill="#1a1410" />
        <rect
          x="23"
          y="-45"
          width="12"
          height="9"
          fill="#ffcf6a"
          style={{ animation: "flicker 2.6s 0.4s ease-in-out infinite", transformOrigin: "29px -40px" }}
        />
        <line x1="29" y1="-45" x2="29" y2="-36" stroke="#1a1410" strokeWidth="0.7" />
        <line x1="23" y1="-40" x2="35" y2="-40" stroke="#1a1410" strokeWidth="0.7" />
      </g>

      {/* 4. Hip roof — back slopes first, then the lit SE / shaded SW front
            slopes. Eave fascia + apex highlight for definition. */}
      <polygon points={slopeBackLeft} fill="#4a443a" />
      <polygon points={slopeBackRight} fill="#4a443a" />
      <polygon points={slopeFrontLeft} fill="#524b40" />
      <polygon points={slopeFrontRight} fill="#6b6356" />
      {/* eave fascia along the two visible wall tops */}
      <polyline
        points={`${leftT.x},${leftT.y} ${bottomT.x},${bottomT.y} ${rightT.x},${rightT.y}`}
        fill="none"
        stroke={PAL.eave}
        strokeWidth="2.5"
      />
      {/* apex hip ridges (toward the two visible eave corners) */}
      <g stroke={PAL.ridge} strokeWidth="1.5" opacity="0.8">
        <line x1={apex.x} y1={apex.y} x2={bottomT.x} y2={bottomT.y} />
        <line x1={apex.x} y1={apex.y} x2={rightT.x} y2={rightT.y} />
        <line x1={apex.x} y1={apex.y} x2={leftT.x} y2={leftT.y} />
      </g>

      {/* 5. Chimney + smoke */}
      <Chimney cx={chim.x} cy={chim.y} />
      <Smoke x={chim.x} y={chim.y - CHIM_H} scale={1} count={3} dur={4} color="#c8b898" />

      {/* 6. Door — arched doorway on the SW (front-left) face, where the cobble
            path leads. The warm glow pulses when the character is near. */}
      <g data-door="forge-entry" transform={`translate(${leftMidX} ${leftMidY + 8}) skewY(-26.57)`}>
        {/* warm glow behind the door — pulses on approach */}
        <ellipse
          cx="0"
          cy="-6"
          rx="13"
          ry="16"
          fill="#ff8a28"
          opacity={nearDoor ? 0.34 : 0.16}
          style={
            nearDoor
              ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: "0px -6px" }
              : undefined
          }
        />
        {/* timber frame */}
        <path d="M-10,2 L-10,-12 a10,12 0 0 1 20,0 L10,2 Z" fill="#5a3a1f" />
        {/* dark interior */}
        <path d="M-7,2 L-7,-11 a7,9 0 0 1 14,0 L7,2 Z" fill="#160d06" />
        {/* warm interior sliver */}
        <path d="M-3.5,2 L-3.5,-9 a3.5,5 0 0 1 7,0 L3.5,2 Z" fill="#a8521f" opacity="0.55" />
      </g>

      {/* small anvil prop beside the door (on the ground, screen space) */}
      <g transform={`translate(${right.x - 18} ${right.y - 2})`}>
        <ellipse cx="0" cy="0" rx="7" ry="2" fill="rgba(0,0,0,.3)" />
        <rect x="-5" y="-6" width="10" height="6" fill="#7a5c34" />
        <rect x="-6" y="-14" width="12" height="6" rx="0.8" fill="#5b5346" />
        <path d="M6,-11 L13,-10 Q14,-9 13,-8 L6,-8 Z" fill="#3a3530" />
        <rect x="-7" y="-9" width="14" height="2" rx="0.4" fill="#3a3530" />
      </g>
    </g>
  );
}
