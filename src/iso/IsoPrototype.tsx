// Isometric forge prototype — an 8×8 grass plot with the forge re-drawn in
// isometric and a walkable character. Pure React + SVG.
//
// Layers: ground tiles are always painted first; the forge and the character
// live in a depth-sorted "entities" list (painter's algorithm on gx+gy) so the
// character correctly passes behind the forge when north of it and in front
// when south.

import { useEffect, useRef, useState } from "react";
import { toScreen, toGrid, depthOf, tileDiamond, TILE_W, TILE_H } from "./isoMath.js";
import IsoForge from "./IsoForge.jsx";
import IsoCharacter from "./IsoCharacter.jsx";
import IsoInterior from "./IsoInterior.jsx";

const GRID = 8; // 8×8 plot
const PAD = 80; // viewbox padding in px
const SPEED = 3.2; // character speed in grid-tiles / second

// Forge occupies the 2×2 footprint centered here; its anchor is the projected
// center of that footprint.
const FORGE_CENTER = { gx: 3.5, gy: 2.5 };
// Painter's-algorithm depth anchor: the footprint's front (max gx+gy) corner.
const FORGE_DEPTH = 4.5 + 3.5;
// Blocked region the character cannot walk through (slightly inset footprint).
const FORGE_BOX = { minGx: 2.4, maxGx: 4.6, minGy: 1.4, maxGy: 3.6 };

// The door faces front; the tile the character stands on to enter.
const DOOR_TILE = { gx: 4, gy: 4 };
// Where the character is placed after leaving — one step out on the path, so
// stepping back onto the door tile is required to re-enter (no instant re-entry).
const DOORSTEP_TILE = { gx: 4, gy: 5 };

// Where the character starts (on the cobble path, in front of the forge).
const CHAR_START = { gx: 4, gy: 6 };

// Door proximity radii (in grid tiles): show the prompt within NEAR, and
// auto-enter when the character actually steps onto the door tile.
const NEAR_RADIUS = 0.85;
const ENTER_RADIUS = 0.4;

function distToDoor(gx: number, gy: number): number {
  return Math.hypot(gx - DOOR_TILE.gx, gy - DOOR_TILE.gy);
}

// Cobble path tiles leading from the front edge up to the door tile.
const PATH_TILES: ReadonlyArray<readonly [number, number]> = [
  [4, 7],
  [4, 6],
  [4, 5],
  [4, 4],
];

const MOVE_KEYS = new Set([
  "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d",
]);

function isPathTile(gx: number, gy: number): boolean {
  return PATH_TILES.some(([px, py]) => px === gx && py === gy);
}

function clampToPlot(v: number): number {
  return Math.max(0, Math.min(GRID - 1, v));
}

function inForge(gx: number, gy: number): boolean {
  return gx > FORGE_BOX.minGx && gx < FORGE_BOX.maxGx && gy > FORGE_BOX.minGy && gy < FORGE_BOX.maxGy;
}

// Resolve a desired move from (ox,oy) to (nx,ny): clamp to the plot, then slide
// along whichever axis stays out of the forge footprint.
function resolveMove(ox: number, oy: number, nx: number, ny: number): { gx: number; gy: number } {
  const cx = clampToPlot(nx);
  const cy = clampToPlot(ny);
  if (!inForge(cx, cy)) return { gx: cx, gy: cy };
  if (!inForge(cx, oy)) return { gx: cx, gy: oy };
  if (!inForge(ox, cy)) return { gx: ox, gy: cy };
  return { gx: ox, gy: oy };
}

export default function IsoPrototype() {
  // Compute screen-space bounds from the projected grid corners.
  const corners = [
    toScreen(0, 0),
    toScreen(GRID - 1, 0),
    toScreen(0, GRID - 1),
    toScreen(GRID - 1, GRID - 1),
  ];
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

  // --- Character state + movement loop ---
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef({ ...CHAR_START });
  const keys = useRef<Set<string>>(new Set());
  const target = useRef<{ gx: number; gy: number } | null>(null);
  const [pos, setPos] = useState(CHAR_START);
  const [walking, setWalking] = useState(false);
  const [near, setNear] = useState(false);
  const [inside, setInside] = useState(false);
  const nearRef = useRef(false);
  const insideRef = useRef(false);

  const enterForge = () => {
    insideRef.current = true;
    setInside(true);
    keys.current.clear();
    target.current = null;
  };
  const leaveForge = () => {
    insideRef.current = false;
    setInside(false);
    // step back out onto the doorstep (one tile out), not the door itself,
    // so the auto-enter check doesn't immediately fire again.
    posRef.current = { ...DOORSTEP_TILE };
    setPos({ ...DOORSTEP_TILE });
    keys.current.clear();
    target.current = null;
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape" && insideRef.current) {
        leaveForge();
        return;
      }
      if ((k === "enter" || k === " ") && nearRef.current && !insideRef.current) {
        enterForge();
        e.preventDefault();
        return;
      }
      if (MOVE_KEYS.has(k)) {
        keys.current.add(k);
        target.current = null; // keyboard cancels click-to-walk
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      // While inside, freeze the overworld (the overlay covers it).
      if (insideRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      let { gx, gy } = posRef.current;
      let moving = false;

      let dgx = 0;
      let dgy = 0;
      const ks = keys.current;
      if (ks.has("arrowup") || ks.has("w")) { dgx -= 1; dgy -= 1; }
      if (ks.has("arrowdown") || ks.has("s")) { dgx += 1; dgy += 1; }
      if (ks.has("arrowleft") || ks.has("a")) { dgx -= 1; dgy += 1; }
      if (ks.has("arrowright") || ks.has("d")) { dgx += 1; dgy -= 1; }

      if (dgx !== 0 || dgy !== 0) {
        const len = Math.hypot(dgx, dgy);
        const r = resolveMove(gx, gy, gx + (dgx / len) * SPEED * dt, gy + (dgy / len) * SPEED * dt);
        gx = r.gx; gy = r.gy;
        moving = true;
      } else if (target.current) {
        const tg = target.current;
        const ddx = tg.gx - gx;
        const ddy = tg.gy - gy;
        const d = Math.hypot(ddx, ddy);
        if (d < 0.08) {
          target.current = null;
        } else {
          const step = Math.min(d, SPEED * dt);
          const r = resolveMove(gx, gy, gx + (ddx / d) * step, gy + (ddy / d) * step);
          // If a wall stopped us cold, drop the target so we don't grind.
          if (Math.abs(r.gx - gx) < 1e-4 && Math.abs(r.gy - gy) < 1e-4) target.current = null;
          gx = r.gx; gy = r.gy;
          moving = true;
        }
      }

      posRef.current = { gx, gy };
      setPos({ gx, gy });
      setWalking(moving);

      // Door proximity: prompt within NEAR, auto-enter when stepping onto it.
      const d = distToDoor(gx, gy);
      const isNear = d <= NEAR_RADIUS;
      if (isNear !== nearRef.current) {
        nearRef.current = isNear;
        setNear(isNear);
      }
      if (d <= ENTER_RADIUS) enterForge();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Click / tap a tile to walk there.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const loc = p.matrixTransform(ctm.inverse());
    const g = toGrid(loc.x, loc.y);
    target.current = { gx: clampToPlot(g.gx), gy: clampToPlot(g.gy) };
    keys.current.clear();
  };

  // Ground layer.
  const tiles: JSX.Element[] = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const path = isPathTile(gx, gy);
      const fill = path ? "#b9ac86" : (gx + gy) % 2 === 0 ? "#6fa04a" : "#629247";
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

  // Depth-sorted entities (painter's algorithm on gx+gy).
  const charScreen = toScreen(pos.gx, pos.gy);
  const entities = [
    {
      key: "forge",
      depth: FORGE_DEPTH,
      el: <IsoForge originX={forgeAnchor.x} originY={forgeAnchor.y} nearDoor={near} />,
    },
    {
      key: "char",
      depth: depthOf(pos.gx, pos.gy),
      el: <IsoCharacter x={charScreen.x} y={charScreen.y} walking={walking} />,
    },
  ].sort((a, b) => a.depth - b.depth);

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#1c2530", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed", top: 12, left: 12, zIndex: 10, color: "#cdd9e5",
          fontFamily: "system-ui, sans-serif", fontSize: "13px",
          background: "rgba(0,0,0,.35)", padding: "6px 10px", borderRadius: "6px",
        }}
      >
        Isometric Forge Prototype — arrow keys / WASD or click to walk
      </div>

      {/* Enter prompt when standing near the door */}
      {near && !inside && (
        <div
          style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
            zIndex: 10, color: "#fff2dc",
            fontFamily: "system-ui, sans-serif", fontSize: "15px", fontWeight: 600,
            background: "rgba(40,20,8,.8)", padding: "10px 18px", borderRadius: "8px",
            border: "1px solid rgba(255,170,80,.5)", boxShadow: "0 4px 14px rgba(0,0,0,.4)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          ↵ Enter Forge
        </div>
      )}

      {inside && <IsoInterior onLeave={leaveForge} />}
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        style={{ width: "100%", height: "100vh", display: "block", cursor: "pointer" }}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
      >
        {/* Ground layer */}
        <g data-layer="ground">{tiles}</g>

        {/* Door approach tile, faintly marked (wired for entry next task). */}
        <polygon
          points={tileDiamond(DOOR_TILE.gx, DOOR_TILE.gy)}
          fill="rgba(255,138,40,.10)"
          stroke="rgba(255,138,40,.30)"
          strokeWidth="1"
        />

        {/* Depth-sorted entities (forge + character) */}
        <g data-layer="entities">
          {entities.map((ent) => (
            <g key={ent.key}>{ent.el}</g>
          ))}
        </g>
      </svg>
    </div>
  );
}
