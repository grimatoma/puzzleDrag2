# Typed tests (`GameState` + actions)

Vitest files under `src/__tests__/` and `tests/` are **not** part of `npm run typecheck` (root `tsconfig.json` excludes `**/*.test.ts`). Playwright specs are checked by `npm run typecheck:tests`.

## Building state for reducers

Do **not** pass bare `{ inventory: { … }, castle: … }` literals into `gameReducer` / slice `reduce` — TypeScript correctly rejects them as `GameState`.

Use:

| Helper | When |
|--------|------|
| `mergeTestState(...layers)` | Normal cases: shallow-merge patches onto `createFreshState()` (same spirit as `{ ...defaults, ...over }`). |
| `unsafeGameState(x)` | Defensive-accessor tests that intentionally use malformed / partial saves. |
| `testAction({ type: "…" })` | Dispatching a non-catalog action for “unchanged” branches. |
| `as Action` | Slice-specific payloads that are valid at runtime but awkward to spell as `Action`. |

Import from `src/testUtils/testState.ts`:

```ts
import { mergeTestState, unsafeGameState, testAction } from "../testUtils/testState.js";
import type { Action } from "../types/state.js";

const s0 = mergeTestState({ coins: 0, inventory: { flour: 3 } });
gameReducer(s0, { type: "BUY_RESOURCE", payload: { key: "flour", count: 1 } } as Action);
```

## CI

- `npm run typecheck` — production `src/**/*.ts` + entries (strict). **`src/testUtils/` is included** so helpers like `mergeTestState` stay type-safe.
- `npm run typecheck:tests` — Playwright + Vitest setup harness (relaxed null/any for browser globals only in that project).

## Roadmap

Bring `tests/phase-*.test.ts` and remaining `src/__tests__/**/*.test.ts` under strict `tsc` by migrating fixtures to `mergeTestState` / `unsafeGameState` and fixing local helper types, then widen `tsconfig.tests.json` `include` until `typecheck:tests` covers the full tree with `strict: true`.
