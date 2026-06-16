// Bridges app readiness to the initial loading screen baked into index.html.
//
// The splash markup, styles, and dismiss() all live in index.html so they
// paint on the first byte (before this bundle even downloads). Here we only
// signal "the game is fully loaded" — once the visible view's Phaser engine
// has booted — so the splash fades out. dismiss() is idempotent and there's a
// safety-net timeout in index.html, so calling this is best-effort.

interface BootSplashGlobal {
  __bootSplash?: { dismiss?: () => void };
}

let dismissed = false;

/**
 * Fade out and remove the initial loading screen. Safe to call more than once;
 * only the first call has any effect.
 */
export function dismissBootSplash(): void {
  if (dismissed) return;
  dismissed = true;
  if (typeof window === "undefined") return;
  (window as unknown as BootSplashGlobal).__bootSplash?.dismiss?.();
}
