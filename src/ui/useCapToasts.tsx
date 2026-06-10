import { useEffect, useRef } from "react";
import { announce } from "../a11y.js";
import { getItem } from "../constants.js";

/**
 * Surfaces the reducer's inventory-cap signal as a player-facing toast.
 *
 * addCappedResourceMut (src/state/helpers.ts) flips seasonStats.capFloaters[key]
 * the moment a roll-up credit is clamped at the inventory cap — once per
 * resource per season (CLOSE_SEASON resets the map, re-arming the toast).
 * The legacy state.floaters entries it also pushes are consumed by no UI;
 * this hook is the visible half of that signal.
 */

type CapFlags = Record<string, unknown> | null | undefined;

/** Pure diff: keys whose cap flag flipped falsy→truthy between snapshots. */
export function newlyCappedKeys(prev: CapFlags, next: CapFlags): string[] {
  if (!next) return [];
  const out: string[] = [];
  for (const key of Object.keys(next)) {
    if (next[key] && !prev?.[key]) out.push(key);
  }
  return out;
}

interface CapToastState {
  seasonStats?: { capFloaters?: Record<string, unknown> | unknown[] } | null;
}

/** Normalise the raw capFloaters field to the CapFlags shape (arrays become null). */
function asCapFlags(raw: Record<string, unknown> | unknown[] | null | undefined): CapFlags {
  return Array.isArray(raw) ? null : (raw as CapFlags);
}

export function useCapToasts(state: CapToastState | null | undefined): void {
  const prevFlags = useRef<CapFlags>(asCapFlags(state?.seasonStats?.capFloaters));
  useEffect(() => {
    const next = asCapFlags(state?.seasonStats?.capFloaters);
    for (const key of newlyCappedKeys(prevFlags.current, next)) {
      const label = getItem(key)?.label ?? key;
      announce(`${label} storage full — extra is wasted`, { tone: "warning", icon: "⚠️" });
    }
    prevFlags.current = next;
  });
}
