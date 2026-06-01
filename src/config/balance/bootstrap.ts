/**
 * Side-effect import: apply balance.json + draft overrides once all config modules loaded.
 * Import this as the first line in app/test entry points.
 */
import { initBalanceOverrides } from "./init.js";

initBalanceOverrides();
