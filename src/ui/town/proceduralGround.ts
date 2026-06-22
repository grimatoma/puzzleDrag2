// Hand-rolled procedural ground for the settlement.
//
// Instead of stamping a raster tileset, we DRAW the terrain ourselves from
// signed-distance fields (SDFs): grass, a river + pond with smooth sandy shores,
// dirt lanes, a cobbled plaza, wooden bridge decks + a dock, and farm soil. Every
// boundary is derived from a true distance, so transitions are SMOOTH diagonals
// (no tile staircase) and "every edge type" is handled implicitly — there is no
// per-edge tile case analysis. The result is resolution-independent: render at any
// `scale` for a crisp image at high zoom.
//
// Pure module: no Phaser, no DOM. It returns an RGBA byte buffer, so the exact
// same code runs in a Node preview and in the browser (TownScene uploads the
// bytes into a texture). See reference/docs/town-layout/index.html for the reference look.

// A road segment. `material` names a reusable surface from the MATERIALS registry
// (default "dirt"); transitions to grass + to any neighbouring material stay smooth
// because they're distance-feathered, not authored as transition tiles.
export interface GroundRoad { x1: number; y1: number; x2: number; y2: number; half: number; material?: GroundMaterial }
export interface GroundEllipse { cx: number; cy: number; rx: number; ry: number; material?: GroundMaterial }
export interface GroundRect { cx: number; cy: number; w: number; h: number }
/** An oriented wooden bridge deck. `len` runs along the road, `wid` across it. */
export interface GroundBridge { cx: number; cy: number; len: number; wid: number; angle: number }

export interface GroundSpec {
  /** Stable cache key — TownScene reuses the baked texture across scene restarts. */
  key?: string;
  width: number;
  height: number;
  seed: number;
  /** River centre-line (px), its water half-width and the sandy shore width. */
  river: { pts: ReadonlyArray<readonly [number, number]>; half: number; bank: number } | null;
  /** A still pond, with its own shore width. */
  pond: (GroundEllipse & { bank: number }) | null;
  /** Dirt lanes (centre-line segments + half-width). */
  roads: GroundRoad[];
  /** Cobbled paving (plaza + paved centre). Drawn over dirt. */
  cobble: GroundEllipse[];
  /** Farm soil parcel. */
  field: GroundRect | null;
  /** Oriented wooden bridge decks (laid over the water where a lane crosses it). */
  bridges: GroundBridge[];
  /** Wooden plank dock reaching into the water. */
  dock: { x: number; y0: number; y1: number; half: number } | null;
}

export interface GroundImage { data: Uint8ClampedArray; width: number; height: number }

// ── palette (cohesive, slightly storybook) ───────────────────────────────────
type RGB = readonly [number, number, number];
const C = {
  grass: [104, 152, 70] as RGB,
  grassHi: [124, 172, 86] as RGB,
  grassLo: [78, 124, 54] as RGB,
  sand: [222, 202, 150] as RGB,
  sandLo: [202, 180, 128] as RGB,
  waterShallow: [104, 178, 206] as RGB,
  waterDeep: [54, 116, 162] as RGB,
  waterFoam: [206, 232, 238] as RGB,
  dirt: [188, 146, 96] as RGB,
  dirtLo: [168, 126, 80] as RGB,
  cobble: [160, 154, 142] as RGB,
  cobbleHi: [184, 178, 166] as RGB,
  cobbleLo: [120, 114, 102] as RGB,
  wood: [156, 104, 58] as RGB,
  woodLo: [120, 76, 40] as RGB,
  soil: [122, 84, 50] as RGB,
  soilLo: [98, 66, 38] as RGB,
  flower: [
    [232, 104, 96], [240, 214, 96], [244, 244, 236], [206, 138, 224],
  ] as RGB[],
  // Reusable road/paving materials. Each is a hi/lo tone pair (+ a grout colour for
  // the block pavers). Referenced by name from GroundRoad/GroundEllipse.material so
  // a paved street is a one-word change, reused across every zone.
  gravelHi: [176, 170, 156] as RGB,
  gravelLo: [128, 122, 110] as RGB,
  packedHi: [170, 132, 88] as RGB,
  packedLo: [132, 100, 64] as RGB,
  flagHi: [214, 202, 178] as RGB,
  flagLo: [170, 154, 124] as RGB,
  flagGrout: [126, 110, 84] as RGB,
  blockHi: [232, 216, 180] as RGB,   // crisp warm sandstone street blocks (the reference)
  blockLo: [200, 178, 138] as RGB,
  blockGrout: [146, 124, 92] as RGB,
  brickHi: [196, 104, 80] as RGB,
  brickLo: [134, 60, 44] as RGB,
  brickGrout: [150, 138, 116] as RGB,
};

export type GroundMaterial =
  | "dirt" | "packed_dirt" | "gravel" | "cobble" | "flagstone" | "stone_block" | "brick" | "sandstone";

// Stable id order so the coarse field can store the nearest road's material in a
// byte lattice and the pixel loop can dispatch on it.
const MAT_ORDER: GroundMaterial[] = ["dirt", "packed_dirt", "gravel", "cobble", "flagstone", "stone_block", "brick", "sandstone"];
const matIndexOf = (m?: GroundMaterial): number => {
  const i = m ? MAT_ORDER.indexOf(m) : 0;
  return i < 0 ? 0 : i;
};

/**
 * Surface colour of a paving `material` at world (X,Y). `dEdge` is the signed
 * distance to the road edge (negative inside) so the soft materials can darken at
 * the trodden verge. The block pavers (flagstone/stone_block/brick/sandstone) draw
 * tight rectangular units with a SHARP grout band + a top-left bevel highlight, so
 * later-tier paved streets read crisp — unlike the soft cobble.
 */
function materialColor(material: GroundMaterial, X: number, Y: number, seed: number, dEdge: number): RGB {
  switch (material) {
    case "gravel": {
      let c = mix(C.gravelLo, C.gravelHi, vnoise(X / 4, Y / 4, seed + 2));
      const g = hash(Math.floor(X / 2.4), Math.floor(Y / 2.4), seed + 17);
      if (g > 0.86) c = shade(c, 16); else if (g < 0.12) c = shade(c, -16);
      return c;
    }
    case "packed_dirt": {
      let c = mix(C.packedLo, C.packedHi, vnoise(X / 6, Y / 6, seed + 2));
      c = shade(c, -smooth(-3, 1, dEdge) * 12);
      return c;
    }
    case "flagstone":
      return blockPaver(X, Y, seed, 26, 14, 1.4, C.flagLo, C.flagHi, C.flagGrout, 0, 16);
    case "stone_block":
      return blockPaver(X, Y, seed, 22, 18, 1.2, C.blockLo, C.blockHi, C.blockGrout, 0, 20);
    case "sandstone":
      return blockPaver(X, Y, seed, 30, 20, 1.6, C.blockLo, C.blockHi, C.blockGrout, 0, 14);
    case "brick":
      return blockPaver(X, Y, seed, 14, 7, 1.0, C.brickLo, C.brickHi, C.brickGrout, 0.5, 12);
    case "cobble": {
      // Jittered rounded setts with dark grout + a top-left bevel — soft, organic.
      const cs = 12;
      const jx = (hash(Math.floor(X / cs), Math.floor(Y / cs), seed + 7) - 0.5) * 4;
      const jy = (hash(Math.floor(X / cs) + 99, Math.floor(Y / cs), seed + 7) - 0.5) * 4;
      const fx = ((X + jx) % cs + cs) % cs, fy = ((Y + jy) % cs + cs) % cs;
      const edge = Math.min(fx, cs - fx, fy, cs - fy);
      const tone = hash(Math.floor((X + jx) / cs), Math.floor((Y + jy) / cs), seed + 13);
      let cobble = mix(C.cobbleLo, C.cobbleHi, tone);
      const bevel = (cs / 2 - fx) + (cs / 2 - fy);
      cobble = shade(cobble, clamp01(0.5 + bevel * 0.06) * 16 - 8);
      cobble = mix(C.cobbleLo, cobble, smooth(0.5, 2.0, edge));
      return cobble;
    }
    case "dirt":
    default: {
      const dn = vnoise(X / 5, Y / 5, seed + 2);
      let dirt = mix(C.dirtLo, C.dirt, dn);
      const pb = hash(Math.floor(X / 3), Math.floor(Y / 3), seed + 17);
      if (pb > 0.94) dirt = shade(dirt, 14);
      else if (pb < 0.05) dirt = shade(dirt, -14);
      dirt = shade(dirt, -smooth(-3, 1, dEdge) * 12);
      return dirt;
    }
  }
}

/**
 * A rectangular block paver. `cell` is the block size; `grout` the dark seam WIDTH
 * (small = crisp); `cellW` scales block width vs height; `stagger` offsets alternate
 * rows half a cell (brick bond); `bevel` is the top-left-lit relief strength.
 */
function blockPaver(X: number, Y: number, seed: number, cell: number, _grout: number, cellW: number, lo: RGB, hi: RGB, grout: RGB, stagger: number, bevel: number): RGB {
  const cw = cell * cellW;
  const row = Math.floor(Y / cell);
  const xo = X + (stagger ? (row % 2) * cw * stagger : 0);
  const gx = Math.floor(xo / cw), gy = row;
  const tone = hash(gx, gy, seed + 5);
  let c = mix(lo, hi, tone);
  const fx = ((xo % cw) + cw) % cw, fy = ((Y % cell) + cell) % cell;
  // Top-left bevel highlight / bottom-right shade so each block reads raised.
  const b = (cell / 2 - fy) + (cw / 2 - fx);
  c = shade(c, clamp01(0.5 + b * 0.05) * bevel - bevel / 2);
  // Sharp grout: a narrow dark band hugging the block edges.
  const edge = Math.min(fx, cw - fx, fy, cell - fy);
  c = mix(grout, c, smooth(0.4, 1.8, edge));
  return c;
}

// ── small math ───────────────────────────────────────────────────────────────
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const shade = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d];

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// Hash-based value noise (deterministic, seedable) for organic texture.
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Signed distance to an axis-aligned ellipse boundary (≈, negative inside). */
function ellipseSD(px: number, py: number, e: GroundEllipse): number {
  const nx = (px - e.cx) / e.rx, ny = (py - e.cy) / e.ry;
  return (Math.hypot(nx, ny) - 1) * Math.min(e.rx, e.ry);
}

/**
 * Render the ground to an RGBA buffer at `scale`× the design resolution. The
 * heavy work is O(pixels · segments); kept lean (a handful of segments) so a
 * 2× bake of a 1280×960 town is well under a frame budget's worth of one-time work.
 */
export function renderGround(spec: GroundSpec, scale: number): GroundImage {
  const W = Math.round(spec.width * scale);
  const H = Math.round(spec.height * scale);
  const data = new Uint8ClampedArray(W * H * 4);
  const { seed } = spec;

  const river = spec.river;
  const rpts = river ? river.pts : [];
  const pond = spec.pond;

  // Coarse signed-distance fields for the two many-segment materials (roads,
  // water), sampled bilinearly per pixel. This turns the hot loop's O(segments)
  // distance work into a few lookups — the field is smooth, so a 4px lattice
  // resolves the few-pixel soft edges accurately. Cheap single-shape SDFs
  // (cobble/bridge/dock/field ellipses + rects) stay inline.
  const CS = 4;
  const GW = Math.ceil(spec.width / CS) + 1, GH = Math.ceil(spec.height / CS) + 1;
  const roadF = new Float32Array(GW * GH);
  const roadMatF = new Uint8Array(GW * GH); // nearest road's material id (MAT_ORDER index)
  const waterF = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    const Y = gy * CS;
    for (let gx = 0; gx < GW; gx++) {
      const X = gx * CS;
      let dRoad = 1e9, bestMat = 0;
      for (let i = 0; i < spec.roads.length; i++) {
        const r = spec.roads[i];
        const d = segDist(X, Y, r.x1, r.y1, r.x2, r.y2) - r.half;
        if (d < dRoad) { dRoad = d; bestMat = matIndexOf(r.material); }
      }
      let wd = 1e9;
      for (let i = 0; i < rpts.length - 1; i++) {
        const a = rpts[i], b = rpts[i + 1];
        const d = segDist(X, Y, a[0], a[1], b[0], b[1]);
        if (d < wd) wd = d;
      }
      if (river) wd -= river.half; else wd = 1e9;
      if (pond) wd = Math.min(wd, ellipseSD(X, Y, pond));
      roadF[gy * GW + gx] = dRoad;
      roadMatF[gy * GW + gx] = bestMat;
      waterF[gy * GW + gx] = wd;
    }
  }
  /** Nearest-cell material id at world (X,Y) — block edges don't need interpolation. */
  const sampleMat = (X: number, Y: number): number => {
    const gx = Math.min(GW - 1, Math.max(0, Math.round(X / CS)));
    const gy = Math.min(GH - 1, Math.max(0, Math.round(Y / CS)));
    return roadMatF[gy * GW + gx];
  };
  const sample = (f: Float32Array, X: number, Y: number): number => {
    const gx = X / CS, gy = Y / CS;
    const x0 = Math.min(GW - 2, Math.max(0, Math.floor(gx)));
    const y0 = Math.min(GH - 2, Math.max(0, Math.floor(gy)));
    const tx = gx - x0, ty = gy - y0, i = y0 * GW + x0;
    const a = f[i], b = f[i + 1], c = f[i + GW], d = f[i + GW + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  for (let py = 0; py < H; py++) {
    const Y = py / scale;
    for (let px = 0; px < W; px++) {
      const X = px / scale;

      // ── grass base (two-octave value noise + fine blade streaks + tufts) ──
      const n = vnoise(X / 26, Y / 26, seed) * 0.6 + vnoise(X / 7, Y / 7, seed + 9) * 0.4;
      let col: RGB = mix(C.grassLo, C.grassHi, n);
      col = shade(col, (vnoise(X / 2.3, Y / 3.6, seed + 21) - 0.5) * 11); // fine blades
      const tuft = hash(Math.floor(X / 5), Math.floor(Y / 5), seed + 44);
      if (tuft > 0.95) col = shade(col, -7); // darker grass clumps
      // sparse flower specks on grass (decided up-front; water/paths paint over)
      const fh = hash(Math.floor(X / 3), Math.floor(Y / 3), seed + 31);
      if (fh > 0.993) col = C.flower[Math.floor(hash(Math.floor(X), Math.floor(Y), seed + 5) * C.flower.length) % C.flower.length];

      // ── farm soil parcel (furrowed) ──
      if (spec.field) {
        const f = spec.field;
        const dx = Math.abs(X - f.cx) - f.w / 2, dy = Math.abs(Y - f.cy) - f.h / 2;
        const inside = Math.max(dx, dy);
        if (inside < 2) {
          const furrow = Math.sin(Y / 6) * 0.5 + 0.5;
          const soil = mix(C.soilLo, C.soil, 0.4 + 0.6 * furrow);
          col = mix(col, soil, smooth(2, -3, inside));
        }
      }

      // ── road lanes — surface chosen by each road's reusable material ──
      const dRoad = sample(roadF, X, Y);
      if (dRoad < 3) {
        const surf = materialColor(MAT_ORDER[sampleMat(X, Y)], X, Y, seed, dRoad);
        col = mix(col, surf, smooth(3, -1, dRoad));
      }

      // ── paved areas (plaza / square) over the lanes; each carries its material ──
      let cobbleCov = 0, cobbleMat: GroundMaterial = "cobble";
      for (let i = 0; i < spec.cobble.length; i++) {
        const cov = smooth(2, -2, ellipseSD(X, Y, spec.cobble[i]));
        if (cov > cobbleCov) { cobbleCov = cov; cobbleMat = spec.cobble[i].material ?? "cobble"; }
      }
      if (cobbleCov > 0) {
        const surf = materialColor(cobbleMat, X, Y, seed, -10);
        col = mix(col, surf, cobbleCov);
      }

      // ── river + pond: sandy shore, then water (sampled SDF) ──
      const wd = sample(waterF, X, Y);
      const bank = (river?.bank ?? 0) || (pond?.bank ?? 0) || 18;
      if (wd < bank) {
        // sandy shore band (grass → sand), darker where wet near the line
        const sn = vnoise(X / 8, Y / 8, seed + 4);
        let sand = mix(C.sandLo, C.sand, sn);
        sand = shade(sand, -smooth(8, 0, wd) * 10); // damp sand darkens toward the water
        col = mix(col, sand, smooth(bank, bank * 0.45, wd));
        if (wd < 1.5) {
          // depth-graded water with foam rim, ripples + the odd sparkle
          const depth = clamp01(-wd / 70);
          let water = mix(C.waterShallow, C.waterDeep, depth);
          const ripple = Math.sin((X + Y) / 9 + vnoise(X / 30, Y / 30, seed + 8) * 6) * 0.5 + 0.5;
          water = shade(water, (ripple - 0.5) * 12);
          const sparkle = hash(Math.floor(X / 3), Math.floor(Y / 3), seed + 50);
          if (sparkle > 0.984) water = mix(water, C.waterFoam, 0.5);
          col = mix(col, water, smooth(1.5, -1.5, wd));
          col = mix(col, C.waterFoam, smooth(0.5, -1.5, wd) * smooth(-4, -1.5, wd) * 0.7); // foam at the very edge
        }
      }

      // ── oriented wooden bridge decks + dock (laid over the water) ──
      // Track the best (most covered) deck and its local coords for plank detail.
      let woodCov = 0, lAlong = 0, lAcross = 0, halfWid = 1;
      for (let i = 0; i < spec.bridges.length; i++) {
        const b = spec.bridges[i];
        const ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
        const rx = (X - b.cx) * ca - (Y - b.cy) * sa; // along the road
        const ry = (X - b.cx) * sa + (Y - b.cy) * ca; // across the road
        const sd = Math.max(Math.abs(rx) - b.len / 2, Math.abs(ry) - b.wid / 2);
        const cov = smooth(1.5, -2, sd);
        if (cov > woodCov) { woodCov = cov; lAlong = rx; lAcross = ry; halfWid = b.wid / 2; }
      }
      if (spec.dock) {
        const d = spec.dock;
        const rx = X - d.x, ry = (d.y0 + d.y1) / 2 - Y; // vertical plank
        const sd = Math.max(Math.abs(rx) - d.half, Math.abs(ry) - (d.y1 - d.y0) / 2);
        const cov = smooth(1.5, -2, sd);
        if (cov > woodCov) { woodCov = cov; lAlong = ry; lAcross = rx; halfWid = d.half; }
      }
      if (woodCov > 0) {
        const wn = vnoise(lAlong / 6 + 50, lAcross / 6, seed + 6);
        const plank = Math.sin(lAlong / 7) * 0.5 + 0.5;          // planks run ACROSS the road
        let wood = mix(C.woodLo, C.wood, 0.5 + 0.5 * wn);
        wood = mix(wood, C.woodLo, smooth(0.62, 0.5, Math.abs(plank - 0.5)) * 0.7); // plank seams
        wood = shade(wood, smooth(halfWid - 3, halfWid, Math.abs(lAcross)) * -14); // side rails (darker edges)
        col = mix(col, wood, woodCov);
      }

      const o = (py * W + px) * 4;
      data[o] = col[0];
      data[o + 1] = col[1];
      data[o + 2] = col[2];
      data[o + 3] = 255;
    }
  }

  return { data, width: W, height: H };
}
