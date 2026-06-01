import { z } from "zod";
import { balanceSchema, type BalanceOverrides } from "./balance.js";

const _warnedParse = { value: false };

function warnOnce(message: string, detail?: unknown): void {
  if (_warnedParse.value) return;
  _warnedParse.value = true;
  console.warn(message, detail);
}

/**
 * Validate merged balance.json + localStorage draft at module load.
 * DEV: throws on invalid document. PROD: warn-once and returns {} (policy A).
 */
export function parseBalanceOverrides(raw: unknown): BalanceOverrides {
  const result = balanceSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }

  const formatted = z.prettifyError(result.error);
  if (import.meta.env.DEV) {
    throw new Error(`Invalid balance overrides:\n${formatted}`);
  }

  warnOnce("[hearth] Invalid balance overrides; ignoring Dev Panel draft.", formatted);
  return { version: 1 };
}

/** Reset warn-once flag (tests only). */
export function _resetBalanceParseWarningsForTests(): void {
  _warnedParse.value = false;
}
