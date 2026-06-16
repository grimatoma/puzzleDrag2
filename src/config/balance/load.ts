import { parseBalanceOverrides } from "../schemas/parseBalance.js";
import type { BalanceOverrides } from "../schemas/balance.js";

// Single source of truth: the committed `balance.json` override file has been
// removed — the canonical constants (constants.ts + feature data) ARE the balance.
// The override pipeline now carries no committed data; only an optional in-browser
// Dev Panel draft can layer on top (and the panel is read-only today, so in
// practice nothing overrides the constants). Fully deleting the (now-inert) apply
// pipeline is a separate refactor (see docs/zone-tier-ladder.html → What's next).
const balanceFile: Record<string, unknown> = {};

export const BALANCE_DRAFT_KEY = "hearth.balance.draft";

/** Read the localStorage draft, if any. Safe in non-browser environments. */
export function readBalanceDraft(): Record<string, unknown> | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(BALANCE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function writeBalanceDraft(draft: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (draft == null) localStorage.removeItem(BALANCE_DRAFT_KEY);
    else localStorage.setItem(BALANCE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}

/** Shallow-merge two override objects. Values from `b` win. */
export function mergeOverrides(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!a) return (b ?? {}) as Record<string, unknown>;
  if (!b) return (a ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (av && typeof av === "object" && !Array.isArray(av)
        && bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[k] = { ...(av as Record<string, unknown>), ...(bv as Record<string, unknown>) };
    } else {
      out[k] = bv;
    }
  }
  return out;
}

/** Merge committed balance.json with optional Dev Panel draft and validate. */
export function loadBalanceOverrides(): BalanceOverrides {
  const raw = mergeOverrides(
    balanceFile as Record<string, unknown>,
    readBalanceDraft(),
  );
  if (raw.resources && !raw.items) {
    raw.items = raw.resources;
  }
  return parseBalanceOverrides(raw);
}
