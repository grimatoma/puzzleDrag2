// Grass↔sand area autotiler for the settlement ground.
//
// The town map's biggest "programmer-art" tell was roads/plaza painted as flat
// DIRT rectangles butted straight against grass — a hard pixel staircase at
// every boundary. The fix (see reference/docs/archive/road-system-proposal.html and the
// tileset-scene-design skill) is to never let two materials touch as flat fills:
// bridge each boundary with TRANSITION TILES chosen automatically from each
// cell's neighbours.
//
// We model paths/plaza/yards as a single boolean MASK over the 40×30 grid (a
// cell is "sand" or it's grass), then for every sand cell read its 8 neighbours,
// classify the boundary, and emit the matching tile from the Tuxemon set's
// grass↔sand blob — a clean 3×3 ring (edges + outer corners) plus a 2×2 inner-
// corner block, with tile 173 (the blob's centre) as the flat interior. The soft
// rounded sand border falls out automatically; nothing is hand-placed.
//
// Tile indices were verified by slicing public/town/tileset.png and rendering the
// autotiler output against the real tiles before wiring (the skill's "verify by
// eye, from real tiles" step). All indices are 0-based into the 24-col sheet.

/** grass↔sand blob roles → tileset index (the verified mapping). */
export const SAND = {
  fill: 173, // clean tan interior — the blob's centre tile (35 carried a baked dark fleck)
  iso: 173, // sand surrounded by grass on most sides (peninsula / 1-wide)
  edgeN: 149, edgeS: 197, edgeW: 172, edgeE: 174,
  outerNW: 148, outerNE: 150, outerSW: 196, outerSE: 198, // convex corners
  innerSE: 170, innerSW: 171, innerNE: 194, innerNW: 195, // concave corners
} as const;

export type Mask = boolean[][];

/** A rows×cols mask, all grass (false). */
export function blankMask(rows: number, cols: number): Mask {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
}

const on = (m: Mask, x: number, y: number): boolean =>
  y >= 0 && y < m.length && x >= 0 && x < m[0].length && m[y][x];

/**
 * Which sand transition tile belongs at (x,y), from the 8-neighbour boundary.
 * Out-of-bounds counts as grass, so sand rounds off cleanly at the map edge.
 */
export function sandTileFor(m: Mask, x: number, y: number): number {
  const N = on(m, x, y - 1), E = on(m, x + 1, y), S = on(m, x, y + 1), W = on(m, x - 1, y);
  const NE = on(m, x + 1, y - 1), NW = on(m, x - 1, y - 1), SE = on(m, x + 1, y + 1), SW = on(m, x - 1, y + 1);
  const gN = !N, gE = !E, gS = !S, gW = !W;
  const card = (gN ? 1 : 0) + (gE ? 1 : 0) + (gS ? 1 : 0) + (gW ? 1 : 0);
  if (card === 0) {
    // interior — unless a single diagonal is grass (concave inner corner)
    if (!SE) return SAND.innerSE;
    if (!SW) return SAND.innerSW;
    if (!NE) return SAND.innerNE;
    if (!NW) return SAND.innerNW;
    return SAND.fill;
  }
  if (card === 1) {
    return gN ? SAND.edgeN : gS ? SAND.edgeS : gW ? SAND.edgeW : SAND.edgeE;
  }
  if (card === 2) {
    if (gN && gW) return SAND.outerNW;
    if (gN && gE) return SAND.outerNE;
    if (gS && gW) return SAND.outerSW;
    if (gS && gE) return SAND.outerSE;
    return SAND.iso; // opposite sides → 1-wide strip; degrade gracefully
  }
  return SAND.iso; // 3–4 grass cardinals → peninsula / isolated cell
}

/** Overlay autotiled sand onto `grid` for every masked cell (grid mutated). */
export function paintSandPaths(grid: number[][], m: Mask): void {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[0].length; x++) {
      if (m[y][x]) grid[y][x] = sandTileFor(m, x, y);
    }
  }
}

// ── mask stamps — describe WHERE sand goes; the autotiler handles WHICH tile ──

/** Fill an axis-aligned tile rect [x,y,w,h). */
export function maskRect(m: Mask, x: number, y: number, w: number, h: number): void {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++)
      if (j >= 0 && j < m.length && i >= 0 && i < m[0].length) m[j][i] = true;
}

/** Horizontal band `thick` tiles tall, centred on row `ty`, from x1..x2. */
export function maskBandH(m: Mask, x1: number, x2: number, ty: number, thick = 2): void {
  const half = Math.floor(thick / 2);
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    for (let o = -half; o < thick - half; o++)
      if (ty + o >= 0 && ty + o < m.length && x >= 0 && x < m[0].length) m[ty + o][x] = true;
}

/** Vertical band `thick` tiles wide, centred on col `tx`, from y1..y2. */
export function maskBandV(m: Mask, y1: number, y2: number, tx: number, thick = 2): void {
  const half = Math.floor(thick / 2);
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    for (let o = -half; o < thick - half; o++)
      if (y >= 0 && y < m.length && tx + o >= 0 && tx + o < m[0].length) m[y][tx + o] = true;
}

/** Filled ellipse (tile space) — the plaza disc. */
export function maskDisc(m: Mask, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++)
      if (((x - cx) ** 2) / (rx * rx) + ((y - cy) ** 2) / (ry * ry) <= 1.05 &&
          y >= 0 && y < m.length && x >= 0 && x < m[0].length) m[y][x] = true;
}
