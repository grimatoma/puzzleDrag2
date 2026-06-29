// SSR-safe device-pixel-ratio access. Consolidates ~10 copies of the same
// inline expression (health review #19). Pass a max to clamp — canvas backing
// stores cap the ratio so very high retina factors don't blow up texture
// memory. No imports so it stays bundle-neutral.

/**
 * Current device pixel ratio, falling back to 1 when unavailable (SSR / no
 * `window`). `max` clamps the result (Phaser/canvas sizing caps at 3).
 */
export function getDevicePixelRatio(max = Infinity): number {
  const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
  return max === Infinity ? dpr : Math.min(dpr, max);
}
