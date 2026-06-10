/**
 * Per-key cooldown gate for player-facing toasts fired from the Phaser scene
 * (e.g. "storage full" on capped chains). Pure + clock-injected so it can be
 * unit-tested without booting Phaser, mirroring producedResource.ts.
 */
export function createCooldownGate(windowMs: number): (key: string, now: number) => boolean {
  const lastShown = new Map<string, number>();
  return (key, now) => {
    const prev = lastShown.get(key);
    if (prev !== undefined && now - prev < windowMs) return false;
    lastShown.set(key, now);
    return true;
  };
}
