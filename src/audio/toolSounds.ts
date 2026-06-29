/**
 * Pure classifier for tool arm/fire/cancel sound triggers, fed by consecutive
 * game-state snapshots from useAudio. Phaser-free so it can be unit-tested.
 *
 * The reducer's contract (see USE_TOOL / TOOL_FIRED / disarmAllTools in
 * src/state.ts): tap-target powers spend their charge when fired, instant
 * powers spend it when armed and are refunded when cancelled. Tracking
 * whether the charge was spent at arm time lets us tell "fired" apart from
 * "cancelled" purely from (toolPending, tools[key]) transitions.
 *
 * No-arm fallback: tools that resolve entirely inside USE_TOOL (e.g. axe /
 * clear_category) never set toolPending. In this case — when neither the arm
 * nor the clear branch matched — any decrease in a tool count between
 * snapshots is treated as a fire event. Note: batched USE_TOOL+TOOL_FIRED
 * rendered in the same React pass are also caught by this fallback because
 * the classifier only sees the rendered snapshot pair.
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
      // Tool was disarmed — determine whether it fired or was cancelled.
      const toolCountDropped = count(next, pKey) < count(prev, pKey);
      const toolCountIncreased = count(next, pKey) > count(prev, pKey);
      const refunded = toolCountIncreased;
      const fired = toolCountDropped || (!refunded && armSpentCharge);
      armSpentCharge = false;
      return fired ? "fired" : null;
    }

    // No pending transition — catch instant tools that resolve wholly inside
    // USE_TOOL (clear_all, clear_category, …) and never set toolPending.
    const keys = new Set([...Object.keys(prev.tools ?? {}), ...Object.keys(next.tools ?? {})]);
    for (const k of keys) {
      if (count(next, k) < count(prev, k)) return "fired";
    }
    return null;
  };
}
