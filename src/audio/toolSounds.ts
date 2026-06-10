/**
 * Pure classifier for tool arm/fire/cancel sound triggers, fed by consecutive
 * game-state snapshots from useAudio. Phaser-free so it can be unit-tested.
 *
 * The reducer's contract (see USE_TOOL / TOOL_FIRED / disarmAllTools in
 * src/state.ts): tap-target powers spend their charge when fired, instant
 * powers spend it when armed and are refunded when cancelled. Tracking
 * whether the charge was spent at arm time lets us tell "fired" apart from
 * "cancelled" purely from (toolPending, tools[key]) transitions.
 */

export interface ToolSoundSnapshot {
  toolPending?: string | null;
  tools?: Record<string, number | boolean | undefined> | null;
}

export type ToolSoundEvent = "armed" | "fired" | null;

export function createToolSoundTracker(): (prev: ToolSoundSnapshot, next: ToolSoundSnapshot) => ToolSoundEvent {
  let armSpentCharge = false;
  const count = (s: ToolSoundSnapshot, key: string): number => { const v = s.tools?.[key]; return typeof v === 'number' ? v : 0; };

  return function step(prev, next) {
    const pKey = prev.toolPending ?? null;
    const nKey = next.toolPending ?? null;

    if (nKey && nKey !== pKey) {
      // Newly armed (or arming transferred to another tool).
      armSpentCharge = count(next, nKey) < count(prev, nKey);
      return "armed";
    }
    if (pKey && !nKey) {
      const delta = count(next, pKey) - count(prev, pKey);
      const fired = delta < 0 || (delta === 0 && armSpentCharge);
      armSpentCharge = false;
      return fired ? "fired" : null;
    }
    return null;
  };
}
