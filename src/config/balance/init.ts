import { loadBalanceOverrides } from "./load.js";
import { applyAllBalanceOverrides } from "./applyAll.js";
import type { BalanceOverrides } from "../schemas/balance.js";
import type { TuningOverrides } from "./applyAll.js";

let _balanceOverrides: BalanceOverrides | null = null;
let _tuningOverrides: TuningOverrides | null = null;
let _initialized = false;

/** Parsed overrides (merge balance.json + localStorage draft). */
export function getBalanceOverrides(): BalanceOverrides {
  if (!_balanceOverrides) _balanceOverrides = loadBalanceOverrides();
  return _balanceOverrides;
}

/** Validated tuning subset after {@link initBalanceOverrides}. */
export function getTuningOverrides(): TuningOverrides {
  if (!_tuningOverrides) {
    initBalanceOverrides();
  }
  return _tuningOverrides ?? {};
}

/**
 * Load and apply all Dev Panel / balance.json overrides exactly once.
 * Safe to call from game entry, Dev Panel entry, and Vitest setup.
 */
export function initBalanceOverrides(): void {
  if (_initialized) return;
  _balanceOverrides = loadBalanceOverrides();
  _tuningOverrides = applyAllBalanceOverrides(_balanceOverrides);
  _initialized = true;
}

/** Test-only reset. */
export function _resetBalanceInitForTests(): void {
  _balanceOverrides = null;
  _tuningOverrides = null;
  _initialized = false;
}
