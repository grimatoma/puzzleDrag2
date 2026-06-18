/**
 * Pure scalar timing curves for board "juice" (screen shake, radial flash),
 * extracted from GameScene so the math is unit-testable without Phaser. The
 * scene keeps the GameObject/tween work and its `len < 3 ⇒ no effect` guards;
 * these functions just compute the numbers. The formulas mirror the former
 * inline arithmetic exactly so the on-screen feel is unchanged.
 */

/**
 * Screen-shake intensity for a chain of length `len`:
 * `min(0.018, 0.0025 + (len-3)*0.0028)`. 0 below the minimum chain of 3.
 * (3 → barely; 6 → noticeable; 9+ → clamped bone-rattling.)
 */
export function shakeIntensityFor(len: number): number {
  if (len < 3) return 0;
  return Math.min(0.018, 0.0025 + (len - 3) * 0.0028);
}

/**
 * Screen-shake duration (ms) for a chain of length `len`:
 * `min(520, 160 + (len-3)*50)`. 0 below the minimum chain of 3.
 */
export function shakeDurationFor(len: number): number {
  if (len < 3) return 0;
  return Math.min(520, 160 + (len - 3) * 50);
}

/**
 * Radial-flash peak ring radius (world px) for a chain of length `len` at the
 * given `tileScale`: `(40 + min(80, (len-3)*14)) * tileScale`. Callers guard
 * `len < 3` (no flash), so this is only meaningful for len ≥ 3.
 */
export function radialPeakRadiusFor(len: number, tileScale: number): number {
  return (40 + Math.min(80, (len - 3) * 14)) * tileScale;
}
