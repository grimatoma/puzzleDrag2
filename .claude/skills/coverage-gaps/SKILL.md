---
name: coverage-gaps
description: Identify untested feature paths by combining vitest --coverage output with the feature inventory under src/features/. Use when you suspect a feature is wired but unverified, or before a release to spot unsafe areas.
---

# coverage-gaps

1090 tests pass on this repo, but Pass-3's hollow-hazard-wiring shipped because tests covered the reducer (state transitions) without covering the rendered output (Phaser tiles + texture). This skill finds those gaps.

## Procedure

1. **Run coverage**:
   ```bash
   npm run test:coverage 2>&1 | tee /tmp/coverage.log
   ```
   Reads the coverage table and the JSON summary at `coverage/coverage-summary.json`.

2. **Build the feature inventory**:
   ```bash
   ls src/features/
   ```
   Each subdirectory is a feature. Note its files (`slice.js`, `data.js`, `index.jsx`, `effects.js`, `aggregate.js`).

3. **Cross-reference** for each feature:
   - **Reducer coverage**: line coverage on `slice.js`. <70% is suspicious.
   - **Pure helper coverage**: `data.js`, `effects.js`, `aggregate.js`. <80% is suspicious.
   - **UI coverage**: `index.jsx` typically has low coverage in this repo (no UI test runner). Flag if `slice.js` is well-covered but UI is dead — that's the hollow-wiring shape.
   - **Cross-cut**: greps for `dispatch({ type: "FEATURE/..." })` across the repo. If reducer paths are untested but dispatchers exist, the action type is unprotected.

4. **Output**:
   ```
   FEATURE: <name>
     slice.js:    <line%>  <branch%>
     data.js:     <line%>
     UI / index:  <line%>
     Risk: <LOW | MEDIUM | HIGH | HOLLOW-WIRING>
     Suggested test: <one-liner>
   ```

5. **Risk classification**:
   - **HOLLOW-WIRING** (highest priority): reducer covered, integration / render path uncovered. Mirror of Pass-3 hazard bug. Suggest: write a test that asserts the rendered/state effect, not just the reducer return.
   - **HIGH**: reducer <50% covered with active dispatchers.
   - **MEDIUM**: data.js / aggregate.js helpers <70%.
   - **LOW**: UI-only file with no dispatchers (cosmetic).

## Output target

Write the report to `/tmp/coverage-gaps-<date>.md` so it can be fed into a fix-batch subagent prompt.

## Common pitfalls

- **Coverage of dead code**: a 100% line-covered slice may still have action types that are never dispatched. Cross-reference dispatchers separately.
- **Test files counted as covered**: vitest will inflate coverage if test files are included. Use `coverage.exclude: ['**/__tests__/**']`.
- **Untested ALWAYS_RUN_SLICES actions**: pure-slice actions in `SLICE_PRIMARY_ACTIONS` may pass coverage but never run because they're not in the right set. The check-slice-action skill covers that.

## When to invoke

- Before opening a release-grade PR.
- Periodically during long QA loops (every 2-3 passes).
- After landing a new feature, to find the integration gap.
- When a bug like Pass-3's hollow hazard wiring slips past tests.
