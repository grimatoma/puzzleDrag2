// The forge in the isometric scene, rendered Pokémon-style: the world (ground
// tiles + character movement) is isometric, but the building itself is a
// front-facing elevation — which is exactly how Pokémon towns are drawn. So we
// reuse the *real* ForgeIllustration component verbatim (1:1 with the rest of
// the game's art, including its live fire/smoke) as a billboard placed on the
// plot, with a ground shadow and an optional warm door-glow. Embedded via
// <foreignObject> so it stays inside IsoPrototype's <svg> and depth-sorts
// against the character correctly.

import ForgeIllustration from "../ui/buildings/forge.jsx";
import { TILE_W, TILE_H } from "./isoMath.js";

// Billboard footprint (screen px). The building art is bottom-anchored
// (forge.tsx uses preserveAspectRatio="xMidYMax meet"), so the box bottom sits
// on the ground; width drives the on-screen size.
const BILLBOARD_W = 168;
const BILLBOARD_H = Math.round(BILLBOARD_W * (116 / 128)); // match forge.tsx viewBox aspect
const BASE_DROP = 20; // how far below the anchor the building base sits (toward the front of the footprint)

export default function IsoForge({
  originX,
  originY,
  nearDoor = false,
}: {
  originX: number;
  originY: number;
  nearDoor?: boolean;
}) {
  const baseY = originY + BASE_DROP; // ground line the building stands on
  return (
    <g>
      {/* ground shadow on the plot */}
      <ellipse cx={originX} cy={baseY} rx={TILE_W + 8} ry={TILE_H} fill="rgba(0,0,0,.30)" />
      <ellipse cx={originX} cy={baseY - 2} rx={TILE_W - 10} ry={TILE_H - 8} fill="rgba(255,130,40,.10)" />

      {/* warm glow at the entrance, pulses on approach */}
      <ellipse
        cx={originX}
        cy={baseY - 14}
        rx={26}
        ry={22}
        fill="#ff8a28"
        opacity={nearDoor ? 0.3 : 0.12}
        style={nearDoor ? { animation: "v2pulse 1.4s ease-in-out infinite", transformOrigin: `${originX}px ${baseY - 14}px` } : undefined}
      />

      {/* the real forge elevation, billboarded onto the plot */}
      <foreignObject
        x={originX - BILLBOARD_W / 2}
        y={baseY - BILLBOARD_H}
        width={BILLBOARD_W}
        height={BILLBOARD_H}
        style={{ overflow: "visible" }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <ForgeIllustration isBuilt />
        </div>
      </foreignObject>
    </g>
  );
}
