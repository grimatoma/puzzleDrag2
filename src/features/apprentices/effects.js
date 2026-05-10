// Legacy module — kept as a thin re-export for older Phase 4 tests that
// import `computeWorkerEffects` from this path. The implementation moved
// to `aggregate.js` (which itself now delegates to the unified
// abilities aggregator in `src/config/abilitiesAggregate.js`).

export { computeWorkerEffects } from "./aggregate.js";
