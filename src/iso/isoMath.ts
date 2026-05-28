// Pure isometric projection helpers for the /iso/ prototype.
// Standard 2:1 diamond isometric. No React, no side effects.

/** Width of one isometric tile diamond in screen pixels. */
export const TILE_W = 64;
/** Height of one isometric tile diamond in screen pixels. */
export const TILE_H = 32;

/** Project a grid coordinate to screen-space pixels (relative to the iso origin). */
export function toScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Inverse of toScreen: screen-space pixels back to (fractional) grid coords. */
export function toGrid(sx: number, sy: number): { gx: number; gy: number } {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return {
    gx: (a + b) / 2,
    gy: (b - a) / 2,
  };
}

/** Painter's-algorithm depth for a grid cell: lower draws first (further back). */
export function depthOf(gx: number, gy: number): number {
  return gx + gy;
}

/**
 * SVG `points` string for the diamond tile centered on the projected position
 * of (gx, gy). Corners are the projected positions of the four half-step
 * neighbours, walking top → right → bottom → left.
 */
export function tileDiamond(gx: number, gy: number): string {
  const corners: ReadonlyArray<readonly [number, number]> = [
    [gx - 0.5, gy - 0.5],
    [gx + 0.5, gy - 0.5],
    [gx + 0.5, gy + 0.5],
    [gx - 0.5, gy + 0.5],
  ];
  return corners
    .map(([cx, cy]) => {
      const p = toScreen(cx, cy);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}
