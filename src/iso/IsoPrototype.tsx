// Task 1: a static isometric scene — an 8×8 grass plot with the forge re-drawn
// in isometric, plus a short cobble path to the door. Pure React + SVG.
//
// Structure note: ground tiles and "entities" (buildings, later the character)
// are kept conceptually separate so Tasks 2 & 3 can add a walkable character
// layer and a depth-sorted render list without reshuffling this file.

import { toScreen, tileDiamond, TILE_W, TILE_H } from "./isoMath.js";
import IsoForge from "./IsoForge.jsx";

const GRID = 8; // 8×8 plot
const PAD = 80; // viewbox padding in px

// Forge occupies the 2×2 footprint (3,2)-(4,3); its anchor is the projected
// center of that footprint.
const FORGE_CENTER = { gx: 3.5, gy: 2.5 };
// The door faces front (toward the viewer / +gy). The approach/door tile.
const DOOR_TILE = { gx: 4, gy: 4 };

// Cobble path tiles leading from the front edge up to the door tile.
const PATH_TILES: ReadonlyArray<readonly [number, number]> = [
  [4, 7],
  [4, 6],
  [4, 5],
  [4, 4],
];

function isPathTile(gx: number, gy: number): boolean {
  return PATH_TILES.some(([px, py]) => px === gx && py === gy);
}

export default function IsoPrototype() {
  // Compute screen-space bounds from the projected grid corners.
  const corners = [
    toScreen(0, 0),
    toScreen(GRID - 1, 0),
    toScreen(0, GRID - 1),
    toScreen(GRID - 1, GRID - 1),
  ];
  // include half-tile overhang of the diamonds + building height headroom.
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs) - TILE_W / 2 - PAD;
  const maxX = Math.max(...xs) + TILE_W / 2 + PAD;
  // extra headroom on top for the tall forge + smoke.
  const minY = Math.min(...ys) - TILE_H / 2 - PAD - 140;
  const maxY = Math.max(...ys) + TILE_H / 2 + PAD;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const forgeAnchor = toScreen(FORGE_CENTER.gx, FORGE_CENTER.gy);

  // Ground layer.
  const tiles: JSX.Element[] = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const path = isPathTile(gx, gy);
      const fill = path
        ? "#b9ac86"
        : (gx + gy) % 2 === 0
          ? "#6fa04a"
          : "#629247";
      tiles.push(
        <polygon
          key={`${gx}-${gy}`}
          points={tileDiamond(gx, gy)}
          fill={fill}
          stroke="rgba(0,0,0,.18)"
          strokeWidth="1"
        />,
      );
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#1c2530", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10,
          color: "#cdd9e5",
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          background: "rgba(0,0,0,.35)",
          padding: "6px 10px",
          borderRadius: "6px",
        }}
      >
        Isometric Forge Prototype — Task 1: static scene
      </div>
      <svg
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        style={{ width: "100%", height: "100vh", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ground layer */}
        <g data-layer="ground">{tiles}</g>

        {/* Entities layer (Task 1: just the forge; later: depth-sorted
            character + buildings). Door approach tile faintly marked. */}
        <g data-layer="entities">
          <polygon
            points={tileDiamond(DOOR_TILE.gx, DOOR_TILE.gy)}
            fill="rgba(255,138,40,.10)"
            stroke="rgba(255,138,40,.30)"
            strokeWidth="1"
          />
          <IsoForge originX={forgeAnchor.x} originY={forgeAnchor.y} />
        </g>
      </svg>
    </div>
  );
}
