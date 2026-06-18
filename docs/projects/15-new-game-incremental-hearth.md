# NEW GAME SYSTEM — Incremental "Hearthkeeping" (the idle layer)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Add a **second game system** to puzzleDrag2: a small, hard-bounded **incremental / idle layer** that runs in *real time* alongside the active board run. While the player is away (and between board runs), their settlement's hearth **keeps burning** — slow generators convert kindling → **Warmth** over wall-clock time, with a sane offline cap; Warmth feeds upgradeable generators and milestone unlocks, and a **prestige reset ("Rekindle")** trades accumulated progress for a permanent meta-boon that buffs the *next* board run. It is a classic numbers-go-up loop, but deliberately small, with soft caps and diminishing returns so it **augments and never replaces** the puzzle-board economy.

Why it matters: the board game today only progresses when the player is actively dragging chains. There is no reason to re-open the app between sessions and no "the world moved while I was gone" hook — the single retention primitive (`LOGIN_TICK` / daily streak) is actually **defined but never wired** (see Background). The idle layer gives the game a low-stakes between-session loop, a sink/source for resources that ties into the existing buildings and Hearthwood theme, and a *re-entry reward* ("the hearth kept burning while you were away") — without touching the core board balance. It also exercises (and pays down) two pieces of repo debt: a real mount/visibility time-delta tick, and — because it persists `lastTickAt` — the save-migration ladder (doc 08).

## Background & current state (VERIFIED)

I opened the real files. **The seed brief is wrong about file extensions and about one load-bearing assumption (LOGIN_TICK is not actually wired).** Corrections are flagged inline. Trust this section over the seed brief.

### Doc-drift corrections (the seed brief / CLAUDE.md say `.js`/`.jsx` — they are wrong)

- The router is **`src/router.ts`** (not `router.js`). `KNOWN_VIEWS` is at `src/router.ts:34-38`, `KNOWN_MODALS` at `:42-48`.
- The reducer is **`src/state.ts`** (not `state.js`). Slice imports `:24-46`, the `slices` array `:64`, `SLICE_PRIMARY_ACTIONS` `:1590-1634`, `ALWAYS_RUN_SLICES` `:1639-1642`, the dispatch machinery (`rawReducer`/`shouldAlwaysRunSlices`) `:1644-1671`.
- The app entry is **`index.html` → `/main.tsx` → `prototype.tsx`** (`main.tsx:4,63-66`). There is **no `main.jsx`** — CLAUDE.md's "`main.jsx`" reference is stale. The `useReducer(gameReducer, undefined, initialState)` lives at `prototype.tsx:334`.
- Feature slices are `.ts`; feature views/modals are `index.tsx`.

### The router (SHIPPED)

- `KNOWN_VIEWS` (`router.ts:34-38`) is a `Set` seeded with `"town"`, `"board"`, **plus** every `viewKey` a feature module exports — they are auto-collected via `import.meta.glob("./features/*/index.{jsx,tsx}")` (`router.ts:28-31`). **So you do not hand-edit `KNOWN_VIEWS` to add a feature view** — you export `viewKey` from the feature's `index.tsx` and it registers itself. (Seed brief said "add to `KNOWN_VIEWS`" — technically you add it *by exporting a `viewKey`*, not by editing the set.)
- `KNOWN_MODALS` (`router.ts:42-48`) **is** a hand-maintained literal `Set` (`"menu","boss","tutorial","debug","festivals"`). A new URL-reachable modal *does* get added here. Gameplay-gated modals (`season`, `leaveBoard`, `runSummary`) are intentionally **excluded** from deep links (`router.ts:41` comment) — they are not in `KNOWN_MODALS`.
- `VIEW_ALIASES` (`router.ts:51-58`) maps short URL segments to long view keys (`tiles`→`tileCollection`). Optional for us.

### The reducer + slice system (SHIPPED) — and the footgun, verified

- `gameReducer` (`state.ts:1696`) wraps `rawReducer` (`state.ts:1653`), which runs `coreReducer` first, then folds every slice in `slices` (`state.ts:64`): `slices.reduce((s, slice) => slice.reduce(s, action), afterCore)` (`state.ts:1668`).
- **THE SLICE FOOTGUN (CONFIRMED):** `rawReducer` only runs slices when `afterCore !== state` **OR** the action type is in `SLICE_PRIMARY_ACTIONS` **OR** `shouldAlwaysRunSlices` returns true (`state.ts:1664-1666`). `coreReducer` has a `default: return state` (`state.ts:1580`). **So a brand-new action that `coreReducer` doesn't handle returns `state` unchanged → `afterCore === state` → slices are SKIPPED → your slice silently no-ops** unless the action type is listed in `SLICE_PRIMARY_ACTIONS` (`state.ts:1590-1634`). This is exactly the footgun CLAUDE.md warns about. Every action our new slice *owns* MUST be added to `SLICE_PRIMARY_ACTIONS`. Use the **`check-slice-action`** skill to verify.
- Slice authoring contract (three touch points — verified against `boons`, `runSummary`):
  1. `src/features/<name>/slice.ts` exports `initial` (an object literal merged into fresh state) and `reduce(state, action)` — e.g. `boons/slice.ts:13` `export const initial = { boons: {} }`, `:15` `export function reduce(...)`.
  2. `src/state.ts` imports the slice (`import * as embergarden from "./features/embergarden/slice.js"`, near `:46`) and adds it to the `slices` array (`state.ts:64`).
  3. `src/state/init.ts` spreads the slice's `initial` into `createFreshState` (`init.ts:165-176`, e.g. `...boons.initial`).
- Feature views/modals self-register via `import.meta.glob` in **two** places: `router.ts:28` (collects `viewKey`) and `src/ui.tsx:95` (collects `default`/`viewKey`/`modalKey`/`alwaysMounted` → renders). A module exporting `viewKey = "embergarden"` becomes a full-screen view when `state.view === "embergarden"` (`ui.tsx:142-175`); a module exporting `modalKey` renders as a modal when `state.modal === <key>` (`ui.tsx:106-140`); `alwaysMounted = true` mounts it permanently and lets it self-gate visibility (used by `runSummary/index.tsx:15`).

### The `LOGIN_TICK` day-key pattern (the seed brief's reference) — DEFINED BUT NOT WIRED

This is the most important correction.

- The reducer **case exists**: `state.ts:1323-1365` (`case "LOGIN_TICK"`). It reads `action.payload?.today` (an injected `YYYY-MM-DD` string — **not** read from `Date.now()` inside the reducer, keeping the reducer pure/testable), compares to `state.dailyStreak.lastClaimedDate`, is **idempotent for same-day** (`:1327` `if (last === today) return state;`), advances/breaks the streak by date diff (`:1332-1335`), credits rewards, and opens a `daily_streak` modal.
- `dayKeyForDate(d: Date)` (`constants.ts:1186-1191`) produces the local `YYYY-MM-DD` key the action expects.
- **BUT:** `LOGIN_TICK` is **never dispatched** anywhere in app code. Grepping the whole repo, the only references are: the reducer case (`state.ts`), the action-type union (`types/actions.ts:56`), the payload type (`types/actionPayloads.ts:362`), and **tests** (`src/__tests__/daily-streak.test.ts`, `tests/phase-3-economy.test.ts`). There is **no `dispatch({ type: "LOGIN_TICK" })`** in `prototype.tsx`, `main.tsx`, `src/ui.tsx`, or anywhere else (verified by grep across `*.tsx` / repo). `dailyStreak` initial state exists (`init.ts:144`), the modal payload is produced (`state.ts:1364`), but the trigger that would fire it on mount **does not exist**.
- **Consequence for us:** we can *copy the pattern* (pure reducer, time injected via payload, idempotent guard, day/delta math) — that part is a proven, tested template. But the **mount/visibility wiring** the brief calls "reuse" **is net-new work** (there's nothing to reuse — it was never built). Our `prototype.tsx` mount effect is the first real instance of this pattern firing in the running app. *(Optional nicety, out of scope: while we're adding our tick effect we could also finally dispatch `LOGIN_TICK` there — but that's a separate concern; do not bundle it.)*

### Currencies that ALREADY exist — naming collision with "Embergarden" (IMPORTANT)

The seed brief's working name "Embergarden" / "embers" **collides with existing state**:

- `state.embers` and `state.coreIngots` are **already shipped currencies** (`init.ts:137-138`, both default `0`). They are earned from **keeper trials** (`src/state/keeperTrials.ts:156-162`) and **spent on the boon trees** (`src/features/boons/slice.ts:27-28`: `embers: state.embers - (cost.embers ?? 0)`). `embers` = the "coexist" keeper-path currency; `coreIngots` = the "drive-out" path currency. They are an existing prestige-ish meta-progression.
- Other existing currencies: `coins` (default `150`, `init.ts:71`), `runes` + `runeStash` (`init.ts:135-136`), `gems` (`init.ts:139`), `influence` (`init.ts:121`), `heirlooms` (`init.ts:140`).
- **Decision:** do NOT reuse `embers`. Name the new idle resources distinctly so we don't entangle the keeper/boon economy. This brief uses:
  - **Warmth** — the soft, board-feeding idle output (the "spendable" idle currency; resets on Rekindle).
  - **Embers'kept / "Hearthlight"** — the **prestige currency** granted on Rekindle (permanent; never reset). *(Pick the final word during implementation; "Hearthlight" avoids any `embers*` substring collision with the existing `state.embers` field. The new state fields below use `warmth` and `hearthlight` to be unambiguous.)*
  - System/working name retired from "Embergarden" to **"Hearthkeeping"** to avoid implying the existing `embers` field.

### Persistence (SHIPPED — destructive; gated by doc 08)

- `SAVE_SCHEMA_VERSION = 45` (`constants.ts:207`). Comment at `:205-206`: *"Forward migrations are not maintained — bump this whenever persisted state changes shape and existing saves will be discarded."*
- The whole `GameState` minus `VOLATILE` keys is persisted (`src/state/persistence.ts`); on a version mismatch the save is **wiped** (`persistence.ts` load gate + the redundant gate at `init.ts:185`). **There is no migration ladder today** — doc `08-save-migration-ladder.md` builds it.
- Our new persisted fields (`warmth`, `hearthlight`, generator levels, `lastTickAt`) **change the persisted shape → require a `SAVE_SCHEMA_VERSION` bump → would wipe every save unless doc 08's ladder is in place first.** This is a hard dependency.

### What does NOT exist yet (so a fresh session doesn't go looking)

- No `src/features/embergarden/` (or `hearthkeeping/`) directory. Net-new.
- No real-time / `setInterval` / `requestAnimationFrame`-driven *game-state* tick. The Phaser scene has its own render loop, but it does not advance React game state on a wall-clock. The `useEffect`s in `prototype.tsx:359-470+` are event/registry bridges, not timers.
- No `visibilitychange` handler that dispatches a reducer action.

### Reference docs in this series (verified to exist)

`docs/projects/` contains `02..11`, `13`, `14`, and this is `15`. **Doc 05 is `05-ai-playtest-balance-harness.md`** (the AI-playtest balance harness referenced for curve tuning). **Doc 08 is `08-save-migration-ladder.md`** (the save ladder we depend on). Both are real files.

## Scope

**In scope:**
- A new feature slice `src/features/embergarden/` (slice + data + a view and a small "welcome back" modal) implementing a bounded incremental layer:
  - **Generators**: tie to existing settlement buildings/theme. A small fixed set of generator *tracks* (e.g. Kindling Pile → Warmth, Charcoal Kiln, Ash Garden) each with a level, a base rate, a cost curve, and a soft-cap/diminishing-returns multiplier.
  - **Warmth** as the produced idle currency (per-second rate), accrued over real time with an **offline cap**.
  - **Milestones** (level thresholds that unlock the next generator / a flat multiplier).
  - **Prestige ("Rekindle")**: spend accumulated lifetime Warmth to reset generators/Warmth in exchange for **Hearthlight** (permanent), which buys a small permanent boon that applies a **bounded** buff to the *next board run* (e.g. +X% chain coin payout, capped).
- **Pure accrual math** in the slice/data layer (no `Date.now()` inside the reducer — time is injected via the action payload, exactly like `LOGIN_TICK`), so it is unit-testable in the node/vitest env (no canvas).
- A **mount + `visibilitychange` time-delta tick**: a `useEffect` in `prototype.tsx` that, on mount/foreground, computes `elapsed = now - state.embergarden.lastTickAt`, clamps to the offline cap, and dispatches `EMBERGARDEN/TICK { now }`.
- **Router wiring**: export `viewKey = "embergarden"` from the feature `index.tsx` (auto-registers in `KNOWN_VIEWS`); add `"embergarden"` to `KNOWN_MODALS` only if we want the welcome-back modal deep-linkable (recommended: do NOT — gate it like `runSummary`).
- **Slice registration**: add the module to `slices[]` (`state.ts:64`), spread `initial` in `init.ts`, and **add every owned action type to `SLICE_PRIMARY_ACTIONS`** (`state.ts:1590`).
- **Persistence**: new persisted fields incl. `lastTickAt`; **bump `SAVE_SCHEMA_VERSION` 45→46 and add a `MIGRATIONS[45]` migrator per doc 08** (default the new fields).
- A balance table with example numbers, soft caps, and bounds (below).
- Unit tests for accrual math (incl. offline cap, diminishing returns, prestige conversion, idempotent/zero-delta tick), and an in-game manual verify.

**Out of scope / non-goals (keep it tight):**
- A Phaser canvas/board for the idle layer. It's a React DOM screen (numbers + buttons), not a new `GameScene`. **No new Phaser scene** — that keeps it inside the unit-testable layer and out of the un-regenerable visual-goldens path.
- Wiring up the dormant `LOGIN_TICK` (separate concern; do not bundle).
- Notifications / push / background workers / true offline compute. "Offline" = "time elapsed since `lastTickAt`, computed on next foreground," capped.
- Any change to board balance other than the **single, capped** Rekindle boon's effect.
- Real-money / IAP, cloud sync, multi-device merge.
- Touching the existing `embers`/`coreIngots`/boon economy. New currencies only.
- New resource *tiles* (no `resource-add` pipeline run) — Warmth/Hearthlight are scalar currencies, not board tiles.

## Implementation plan

Ordered. New feature dir + edits to `state.ts`, `init.ts`, `constants.ts`, `prototype.tsx`, plus doc-08 migration + tests.

### 0. Hard prerequisite — doc 08 must land first

This brief persists `lastTickAt` and new currencies → bumps `SAVE_SCHEMA_VERSION`. **Without doc 08's migration ladder, that bump wipes every player save.** Confirm `src/state/saveMigrations.ts` exists with a working `migrateSave` + `MIGRATIONS` registry before bumping. If doc 08 is not yet merged, **stop and do doc 08 first** (or descope to a non-persisted prototype that re-zeroes on reload — not recommended).

### 1. New module: `src/features/embergarden/data.ts` (pure tables + math)

All numbers and curves live here so doc 05's harness can tune them. No React, no `localStorage`, no `Date.now()`.

```ts
// src/features/embergarden/data.ts
export interface GeneratorDef {
  id: string;            // "kindling" | "kiln" | "ashgarden"
  name: string;
  baseRatePerSec: number;   // Warmth/sec at level 1
  baseCost: number;         // Warmth to buy level 1
  costGrowth: number;       // geometric cost multiplier per level (>1)
  softCapLevel: number;     // level after which rate gains taper
  unlockAtWarmthLifetime: number; // milestone gate (lifetime Warmth)
}

// EXAMPLE NUMBERS — tune via doc 05. Bounded so idle << active board income.
export const GENERATORS: GeneratorDef[] = [
  { id: "kindling",  name: "Kindling Pile", baseRatePerSec: 0.05, baseCost: 10,   costGrowth: 1.15, softCapLevel: 25, unlockAtWarmthLifetime: 0 },
  { id: "kiln",      name: "Charcoal Kiln", baseRatePerSec: 0.40, baseCost: 250,  costGrowth: 1.18, softCapLevel: 20, unlockAtWarmthLifetime: 500 },
  { id: "ashgarden", name: "Ash Garden",    baseRatePerSec: 3.00, baseCost: 6000, costGrowth: 1.22, softCapLevel: 15, unlockAtWarmthLifetime: 20000 },
];

// Diminishing returns past the soft cap: each level above softCap counts as
// sqrt of its linear contribution. Keeps "numbers go up" but flattens runaway.
export function generatorRate(def: GeneratorDef, level: number): number {
  if (level <= 0) return 0;
  const linear = Math.min(level, def.softCapLevel);
  const over = Math.max(0, level - def.softCapLevel);
  return def.baseRatePerSec * (linear + Math.sqrt(over));
}

// Geometric cost for the NEXT level (level→level+1).
export function generatorCost(def: GeneratorDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}

// Total Warmth/sec across all owned generators, including the permanent
// Hearthlight multiplier (prestige boon). Bounded multiplier.
export function totalWarmthPerSec(levels: Record<string, number>, hearthlight: number): number {
  const base = GENERATORS.reduce((sum, g) => sum + generatorRate(g, levels[g.id] ?? 0), 0);
  return base * hearthlightMult(hearthlight);
}

// Offline accrual cap: 8 real hours of production, no matter how long away.
export const OFFLINE_CAP_SECONDS = 8 * 3600;

// Prestige: Hearthlight gained on Rekindle from lifetime Warmth this cycle.
// Cube-root curve → first prestige is meaningful, later ones diminish.
export const REKINDLE_MIN_LIFETIME_WARMTH = 10000; // can't Rekindle before this
export function hearthlightFromLifetime(lifetimeWarmth: number): number {
  if (lifetimeWarmth < REKINDLE_MIN_LIFETIME_WARMTH) return 0;
  return Math.floor(Math.cbrt(lifetimeWarmth / 1000));
}

// Permanent prestige multiplier on idle production: +5% per Hearthlight,
// HARD CAP at +100% (x2). Keeps the idle layer from snowballing.
export function hearthlightMult(hearthlight: number): number {
  return 1 + Math.min(hearthlight * 0.05, 1.0);
}

// The ONE board-run buff Hearthlight grants. Capped tiny so it augments,
// never trivializes the active economy: +1% chain coin payout per Hearthlight,
// HARD CAP +15%. Read by the board coin hook (see step 6).
export const HEARTHLIGHT_BOARD_COIN_CAP = 0.15;
export function hearthlightBoardCoinBonus(hearthlight: number): number {
  return Math.min(hearthlight * 0.01, HEARTHLIGHT_BOARD_COIN_CAP);
}
```

### 2. New module: `src/features/embergarden/slice.ts` (pure reducer)

Mirrors `LOGIN_TICK`'s discipline: **time is injected via payload**, reducer stays pure, accrual is idempotent for zero/negative deltas.

```ts
import type { Action, GameState } from "../../types/state.js";
import { GENERATORS, generatorCost, totalWarmthPerSec, OFFLINE_CAP_SECONDS,
         hearthlightFromLifetime, REKINDLE_MIN_LIFETIME_WARMTH } from "./data.js";

export interface EmbergardenState {
  warmth: number;            // spendable, resets on Rekindle
  lifetimeWarmth: number;    // accrued since last Rekindle (drives prestige)
  hearthlight: number;       // permanent prestige currency
  levels: Record<string, number>;  // generator id -> level
  lastTickAt: number | null; // epoch ms of last accrual; null = uninitialised
}

export const initial = {
  embergarden: {
    warmth: 0, lifetimeWarmth: 0, hearthlight: 0,
    levels: {}, lastTickAt: null,
  } as EmbergardenState,
};

function accrue(eg: EmbergardenState, now: number): EmbergardenState {
  if (eg.lastTickAt == null) return { ...eg, lastTickAt: now }; // first run: just stamp
  const elapsedSec = Math.max(0, (now - eg.lastTickAt) / 1000);
  if (elapsedSec <= 0) return { ...eg, lastTickAt: now };       // idempotent / clock skew
  const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SECONDS);  // offline cap
  const rate = totalWarmthPerSec(eg.levels, eg.hearthlight);
  const gained = rate * cappedSec;
  return {
    ...eg,
    warmth: eg.warmth + gained,
    lifetimeWarmth: eg.lifetimeWarmth + gained,
    lastTickAt: now,
  };
}

export function reduce(state: GameState, action: Action): GameState {
  const eg = (state as GameState & { embergarden?: EmbergardenState }).embergarden;
  switch (action.type) {
    case "EMBERGARDEN/TICK": {
      if (!eg) return state;
      const now = action.payload?.now;
      if (typeof now !== "number") return state;
      const next = accrue(eg, now);
      if (next === eg) return state;
      return { ...state, embergarden: next };
    }
    case "EMBERGARDEN/BUY_GENERATOR": {
      if (!eg) return state;
      const id = action.payload?.id;
      const def = GENERATORS.find(g => g.id === id);
      if (!def) return state;
      // accrue up to `now` first so a purchase doesn't drop pending Warmth
      const acc = action.payload?.now != null ? accrue(eg, action.payload.now) : eg;
      if (acc.lifetimeWarmth < def.unlockAtWarmthLifetime) return state; // gated
      const level = acc.levels[id] ?? 0;
      const cost = generatorCost(def, level);
      if (acc.warmth < cost) return state;                               // can't afford
      return {
        ...state,
        embergarden: { ...acc, warmth: acc.warmth - cost, levels: { ...acc.levels, [id]: level + 1 } },
      };
    }
    case "EMBERGARDEN/REKINDLE": {
      if (!eg) return state;
      const acc = action.payload?.now != null ? accrue(eg, action.payload.now) : eg;
      if (acc.lifetimeWarmth < REKINDLE_MIN_LIFETIME_WARMTH) return state; // gate
      const gained = hearthlightFromLifetime(acc.lifetimeWarmth);
      if (gained <= 0) return state;
      return {
        ...state,
        embergarden: {
          warmth: 0, lifetimeWarmth: 0,                 // reset the cycle
          hearthlight: acc.hearthlight + gained,        // permanent gain
          levels: {},                                   // generators reset
          lastTickAt: acc.lastTickAt,
        },
        // (optional) open a "Rekindled" celebration modal here, gameplay-gated.
      };
    }
    default:
      return state;
  }
}
```

**Note the footgun:** all three action types (`EMBERGARDEN/TICK`, `EMBERGARDEN/BUY_GENERATOR`, `EMBERGARDEN/REKINDLE`) are **slice-owned** — `coreReducer` has no case for them, so without registration they no-op. Step 4 registers them.

### 3. New view + modal: `src/features/embergarden/index.tsx`

- `export const viewKey = "embergarden";` — this auto-registers in `KNOWN_VIEWS` (`router.ts:28-31`) and makes the screen mount when `state.view === "embergarden"` (`ui.tsx:142-175`). **No manual edit to `KNOWN_VIEWS`.**
- Default export: a React DOM screen showing Warmth, Warmth/sec, each generator (level, cost, buy button → `dispatch({type:"EMBERGARDEN/BUY_GENERATOR", payload:{ id, now: Date.now() }})`), milestones, and a Rekindle panel (shows `hearthlightFromLifetime(lifetimeWarmth)`, gated by `REKINDLE_MIN_LIFETIME_WARMTH`). Use existing UI primitives (`src/ui/primitives/*` — `Button`, `Pill`, `ProgressTrack`, `MetricCard`) as `runSummary/index.tsx` does, for visual consistency.
- **Optional welcome-back modal** ("the hearth kept burning — +N Warmth while you were away"): either a second always-mounted feature module, or fold into the screen. If a modal: prefer `alwaysMounted` + internal self-gating (like `runSummary/index.tsx:15`) so it stays out of `KNOWN_MODALS`/deep-links. Open it from the mount tick when `gained` exceeded a threshold.
- Add a Town entry point (a button/card on the town view) that does `dispatch({ type: "SET_VIEW", view: "embergarden" })` (use the existing `SET_VIEW` action used elsewhere for navigation).

### 4. Wire the slice into `src/state.ts` (THREE edits — all required)

1. Import near the other slice imports (`state.ts:46`):
   ```ts
   import * as embergarden from "./features/embergarden/slice.js";
   ```
2. Add to the `slices` array (`state.ts:64`):
   ```ts
   const slices = [crafting, quests, ..., runSummary, embergarden];
   ```
3. **Register the owned actions in `SLICE_PRIMARY_ACTIONS` (`state.ts:1590-1634`)** — THE FOOTGUN FIX:
   ```ts
   // Embergarden (idle layer) — owned entirely by embergarden/slice
   "EMBERGARDEN/TICK",
   "EMBERGARDEN/BUY_GENERATOR",
   "EMBERGARDEN/REKINDLE",
   ```
   Without this, `coreReducer` returns `state` unchanged for these, slices are skipped, and the idle layer is a dead no-op. **Run the `check-slice-action` skill on each of the three types.**

Also add the action types + payloads to `src/types/actions.ts` (the union, near `:56` where `LOGIN_TICK` lives) and `src/types/actionPayloads.ts` (the payload interface, near `:362`).

### 5. Initial state + persistence

- Spread the slice initial in `src/state/init.ts` `createFreshState`, alongside the others (`init.ts:165-176`):
  ```ts
  ...embergarden.initial,
  ```
- **Bump `SAVE_SCHEMA_VERSION` 45 → 46** (`constants.ts:207`) and **add `MIGRATIONS[45]` in `src/state/saveMigrations.ts`** (doc 08) that defaults the new fields and sets `version: 46`:
  ```ts
  45: (save) => ({
    ...save, version: 46,
    embergarden: (save as any).embergarden ?? { warmth: 0, lifetimeWarmth: 0, hearthlight: 0, levels: {}, lastTickAt: null },
  }),
  ```
  Add a fixture `src/__tests__/fixtures/saves/v45-pre-embergarden.json` and assert it migrates (doc 08's test convention). **Do not skip this — bumping the version without the migrator wipes saves.**

### 6. The mount / visibility time-delta tick (`prototype.tsx`)

This is the net-new "reuse the LOGIN_TICK pattern" wiring (which never existed). Add **one `useEffect`** near the other mount effects (around `prototype.tsx:359-470`), after `const [state, dispatch] = useReducer(...)` (`:334`):

```tsx
// Embergarden idle accrual: tick on mount and whenever the tab returns to
// foreground. Time is injected so the reducer stays pure (mirrors LOGIN_TICK).
useEffect(() => {
  const tick = () => dispatch({ type: "EMBERGARDEN/TICK", payload: { now: Date.now() } });
  tick(); // mount: settle offline gains immediately
  const onVis = () => { if (document.visibilityState === "visible") tick(); };
  document.addEventListener("visibilitychange", onVis);
  // optional: a slow heartbeat so the on-screen number ticks while the idle
  // view is open. Keep it coarse (e.g. 1s) — accrual math is delta-based so
  // interval cadence doesn't change totals.
  const id = window.setInterval(tick, 1000);
  return () => { document.removeEventListener("visibilitychange", onVis); window.clearInterval(id); };
}, [dispatch]);
```

The `setInterval` is purely cosmetic (smooth counter); correctness comes from the delta math, so a missed interval just means the next tick accrues more. The offline cap is enforced in `accrue`.

### 7. The single board-run buff (the only board-balance touch)

Where the board computes chain coin payout (the `floor(gained * value)` site referenced in `runSummary/slice.ts:148-152` — the real payout lives in `state.ts`'s chain-collect path), apply the **capped** Hearthlight bonus:
```ts
const egBonus = hearthlightBoardCoinBonus(state.embergarden?.hearthlight ?? 0); // ≤ 0.15
const coins = Math.floor(gained * value * (1 + egBonus));
```
Keep this the **only** board effect, and keep the cap. Add a test asserting the bonus is capped and that `hearthlight = 0` is a no-op (back-compat for non-idle players).

### 8. After code changes

Run `graphify update .` (AST-only, no API cost) so the knowledge graph reflects the new slice/view.

## Success criteria

- [ ] `src/features/embergarden/{data.ts,slice.ts,index.tsx}` exist; `data.ts` is pure (no React/`localStorage`/`Date.now()`); `slice.ts` injects time via payload (no `Date.now()` in the reducer).
- [ ] `EMBERGARDEN/TICK`, `EMBERGARDEN/BUY_GENERATOR`, `EMBERGARDEN/REKINDLE` are all listed in `SLICE_PRIMARY_ACTIONS` (`state.ts:1590`); `check-slice-action` passes for each.
- [ ] The slice is in the `slices` array (`state.ts:64`) and its `initial` is spread in `createFreshState` (`init.ts`).
- [ ] Navigating to `#/embergarden` mounts the idle screen; `"embergarden" ∈ KNOWN_VIEWS` at runtime (auto-registered via `viewKey`).
- [ ] Accrual is correct: with one Kindling Pile at level 1, `EMBERGARDEN/TICK` after 100s adds `100 * generatorRate(kindling,1)` Warmth (= `100 * 0.05` = 5 with example numbers).
- [ ] Offline cap holds: a tick with `now - lastTickAt` = 24h credits at most `OFFLINE_CAP_SECONDS` (8h) of production, not 24h.
- [ ] Zero/negative delta tick is idempotent (re-firing `TICK` with the same `now`, or a smaller `now`, never adds Warmth or moves `lastTickAt` backward).
- [ ] Buying a generator deducts the geometric cost, increments the level, and is rejected when unaffordable or below `unlockAtWarmthLifetime`.
- [ ] Rekindle is gated by `REKINDLE_MIN_LIFETIME_WARMTH`, grants `hearthlightFromLifetime(lifetimeWarmth)` Hearthlight, resets `warmth`/`lifetimeWarmth`/`levels`, and **never** resets `hearthlight`.
- [ ] Idle production multiplier is bounded: `hearthlightMult` ≤ 2.0 regardless of Hearthlight.
- [ ] Board buff is bounded: `hearthlightBoardCoinBonus` ≤ `0.15`; with `hearthlight = 0` it is exactly `0` (no board behaviour change for non-idle players).
- [ ] `SAVE_SCHEMA_VERSION` is `46`, with a `MIGRATIONS[45]` migrator and a fixture that migrates a v45 save without data loss (doc 08).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Commands (all GATING):**
```bash
npm run typecheck      # tsc --noEmit; new action types + slice must typecheck
npm run lint           # ESLint over src/ + prototype.tsx
npm test               # vitest, node env, fake localStorage, NO canvas — covers all accrual math
npm run build          # production build must succeed
```
After code changes: `graphify update .`

**New unit test — `src/features/embergarden/__tests__/embergarden.test.ts`** (or `src/__tests__/embergarden.test.ts`), asserting:
- `accrual basic`: state with `levels:{kindling:1}, lastTickAt:0`; `TICK {now:100000}` → `warmth === 5` and `lastTickAt === 100000` (uses example `baseRatePerSec 0.05`).
- `first tick stamps only`: `lastTickAt:null` → first `TICK` sets `lastTickAt` and adds **0** Warmth.
- `offline cap`: `lastTickAt:0`, `TICK {now: 24*3600*1000}` → warmth == `OFFLINE_CAP_SECONDS * rate`, not 24h * rate.
- `idempotent / clock skew`: two `TICK`s with the same `now` add Warmth once; a `TICK` with `now < lastTickAt` adds nothing and does not move `lastTickAt` back.
- `buy generator`: affordable → level+1, warmth -= cost; unaffordable → unchanged (`===` same ref); below `unlockAtWarmthLifetime` → unchanged.
- `cost curve`: `generatorCost(kindling, n)` is geometric and monotonic increasing.
- `diminishing returns`: `generatorRate(kindling, softCapLevel+4)` < linear `baseRate*(softCapLevel+4)`.
- `rekindle`: below gate → unchanged; at/above → `hearthlight += hearthlightFromLifetime`, `warmth/lifetimeWarmth/levels` reset, `hearthlight` preserved across a second Rekindle.
- `bounded multipliers`: `hearthlightMult(1000) === 2.0`; `hearthlightBoardCoinBonus(1000) === 0.15`; `hearthlightBoardCoinBonus(0) === 0`.

**The footgun test (CRITICAL — proves the slice actually runs):**
- `slice fires through gameReducer`: import `gameReducer` from `src/state.ts`, build a state via `createInitialState`/test util, dispatch a real `EMBERGARDEN/BUY_GENERATOR` *through `gameReducer`* (not the slice directly), and assert the level changed. **If `EMBERGARDEN/*` is missing from `SLICE_PRIMARY_ACTIONS`, this test fails (slice skipped) — that is the whole point.** Mirror `daily-streak.test.ts`'s style of driving `gameReducer` end-to-end.

**Migration test (doc 08 convention):** `src/__tests__/save-migrations.test.ts` (or the embergarden test) loads `fixtures/saves/v45-pre-embergarden.json` through `loadSavedState`/`initialState` and asserts it returns a non-null state with `version === 46` and an `embergarden` field defaulted — *and* that the player's pre-existing coins/inventory survived.

**Manual in-game check (informational, not gating — this is DOM, no canvas):**
1. Spin a worktree Vite on a spare port with base `/puzzleDrag2/`: `node ../../../node_modules/vite/bin/vite.js` (the worktree has no `node_modules` — use the parent binary). The `:5173` server serves MAIN, not the worktree.
2. In the page console, drive state via the dev bridge: `window.__hearthVisual.dispatch({ type: "EMBERGARDEN/TICK", payload: { now: Date.now() } })`; inspect with `window.__hearthVisual.state()` and confirm `embergarden.warmth` increased. (`__hearthVisual` API: `dispatch`, `state`, `freeze` — `src/visualTesting/global.d.ts:9-22`.)
3. Simulate offline: `dispatch` a `TICK` with a `now` 24h in the future and confirm Warmth gained == 8h of rate (offline cap), via `state()`.
4. Navigate to `#/embergarden`, buy a generator, and assert the rendered Warmth/sec via DOM + `getComputedStyle` (do NOT rely on `preview_screenshot` — it **hangs on this host**).

**Gating vs informational:** `typecheck`/`lint`/`test`/`build` are **gating**. The in-game check is informational. **`test:e2e`/`test:visual` are NOT required** for this work — the idle layer is DOM (no new canvas/Phaser scene), and the visual goldens are not regenerable on this Windows host (DOM drifts 3-5%) and aren't in CI. Do not trust a local visual regen.

## Double-check / adversarial review

**"Did I really wire it?" (prove the previously-impossible path now fires):**
- The slice-through-`gameReducer` test above is the single most important proof: before registration, `EMBERGARDEN/*` actions are silent no-ops (the footgun). After adding them to `SLICE_PRIMARY_ACTIONS`, the same dispatch mutates state. If that test passes, the slice is genuinely wired. Grep the diff: `SLICE_PRIMARY_ACTIONS` must contain all three types; the module must be in `slices[]`; `initial` must be spread in `init.ts`. A slice that's defined but absent from `slices[]` typechecks but never runs.
- Confirm the view actually mounts: at runtime, `KNOWN_VIEWS.has("embergarden")` is `true` only if the feature `index.tsx` exports `viewKey` AND the glob picked it up — verify by navigating to `#/embergarden` and seeing the screen, not the town fallback (`router.ts:74` falls back to `"town"` for unknown views, so a typo'd `viewKey` silently routes home).
- Confirm the mount tick fires: add a temporary `console.log` in the `useEffect` or assert `embergarden.lastTickAt` is non-null after first paint via `__hearthVisual.state()`.

**Edge cases a skeptic will attack:**
- **Clock tampering / NTP jumps:** `now < lastTickAt` (user set clock back) must add 0 and not move `lastTickAt` backward (tested). `now` huge (clock set forward years) is clamped by `OFFLINE_CAP_SECONDS` (tested).
- **Float drift:** Warmth is a float; large lifetime sums could lose precision. For our bounded numbers (cap 8h, capped multipliers) this is fine, but display with `Math.floor`. Don't compare floats with `===` in tests — use the exact integer cases above or `toBeCloseTo`.
- **Reducer purity:** no `Date.now()` inside the slice (injected via payload) — grep the slice to confirm. A `Date.now()` in the reducer would make it non-deterministic and untestable, and break referential-equality no-op semantics.
- **No-op referential equality:** `TICK` with zero delta must return the **same `state` reference** (so React doesn't needlessly re-render and so `rawReducer`'s `afterSlices === state` short-circuit holds, `state.ts:1670`). The slice returns `state` (not a new object) on no-op — verify.
- **Save back-compat:** a v45 save (no `embergarden`) must migrate, not wipe. A non-idle player (`hearthlight 0`, `lastTickAt null`) must see **zero** board behaviour change — assert `hearthlightBoardCoinBonus(0) === 0`.
- **Balance bound:** prove idle income is small vs board. With example numbers, 8h offline at a modest mid-game setup yields far less than one good board run's coins. If a reviewer claims "this trivializes the board," point at `OFFLINE_CAP_SECONDS`, the sqrt soft-cap in `generatorRate`, and the `+15%` hard cap on the only board buff. Tune via doc 05 if the harness shows otherwise.

**Rollback safety:** the change is additive (one feature dir, three slice registrations, one mount effect, one capped board-coin term). To revert: remove the feature dir, the three `SLICE_PRIMARY_ACTIONS` entries + `slices[]` entry + `init.ts` spread, the mount effect, the board-coin term — and, importantly, **decide on the schema version**. If v46 saves have shipped, you must keep a migrator path or those players' saves are now "forward-version" and would be discarded by doc 08's ladder (which is the safe behaviour, but means idle progress is lost on rollback). Prefer feature-flagging the *view entry point* over reverting the schema once shipped.

## Risks & gotchas

- **Naming collision:** `state.embers`/`state.coreIngots` already exist (keeper/boon currencies — `init.ts:137-138`, `boons/slice.ts:27-28`). Do **not** reuse `embers`. New fields are `warmth`/`hearthlight` under `state.embergarden`. The doc's working name "Embergarden" is fine as a *display* name, but the *prestige currency* must not be called "embers."
- **The slice footgun is the #1 failure mode here.** Three brand-new slice-owned actions, all of which `coreReducer` ignores → all silently no-op unless registered in `SLICE_PRIMARY_ACTIONS` (`state.ts:1590-1634`). This is the most likely "I built it and nothing happens" bug. `check-slice-action` skill exists precisely for this.
- **`LOGIN_TICK` is a pattern, not a wire.** The brief says "reuse" it, but it is **never dispatched in app code** — only tested. You are building the first real mount/visibility tick. Don't waste time looking for an existing tick to copy from the running app; copy the *reducer shape* from `state.ts:1323-1365` and the *day/time-injection* discipline, but write the `useEffect` fresh.
- **Schema bump wipes saves without doc 08.** `SAVE_SCHEMA_VERSION 45→46` (`constants.ts:207`) is destructive today (no migration ladder; redundant gates at `persistence.ts` and `init.ts:185`). **Doc 08 is a hard prerequisite.** Add the `MIGRATIONS[45]` migrator + fixture in the same PR as the bump.
- **No canvas in unit tests.** vitest runs node + fake localStorage + **no canvas**. Keep ALL game logic (accrual, costs, prestige) in `data.ts`/`slice.ts` so it's fully unit-testable. Anything that needs canvas has zero unit coverage — which is exactly why this brief keeps the idle layer DOM-only (**no new Phaser scene**).
- **Visual goldens are NOT regenerable on this Windows host** and this DOM-only feature shouldn't touch the Phaser goldens anyway. Do not run/trust a local `test:visual` regen.
- **Don't break referential-equality no-ops.** The reducer relies on `afterSlices === state` to detect true no-ops (`state.ts:1670`); return the original `state` (not a fresh clone) on rejected/zero-delta actions, or you'll cause spurious re-renders and re-persists (`persistState` fires on every `next !== state`, `state.ts:1708`).
- **`KNOWN_VIEWS` is auto-collected, `KNOWN_MODALS` is manual.** Add a view by exporting `viewKey` (not by editing the set). Only add to `KNOWN_MODALS` if you genuinely want the modal deep-linkable — for a "welcome back" modal, prefer `alwaysMounted` self-gating like `runSummary` and keep it out of the URL.
- **Tuning belongs to doc 05.** The example numbers here are a *starting point*. Doc `05-ai-playtest-balance-harness.md` runs AI playtests over the economy; once this lands, feed `GENERATORS`, `OFFLINE_CAP_SECONDS`, the soft-cap curve, and the prestige curves into that harness to confirm idle income stays a small fraction of active board income and the prestige cadence feels right. Because all curves live in `data.ts` as plain functions/tables, the harness can sweep them without touching the reducer.

## References

- `src/router.ts:28-48` — `KNOWN_VIEWS` (auto-collected via `viewKey` glob) + `KNOWN_MODALS` (manual). **View registration target.**
- `src/state.ts:24-46, 64` — slice imports + the `slices` array. **Add the slice here.**
- `src/state.ts:1590-1634` — `SLICE_PRIMARY_ACTIONS`. **THE FOOTGUN FIX — add all three `EMBERGARDEN/*` types.**
- `src/state.ts:1644-1671` — `shouldAlwaysRunSlices` / `rawReducer` (the dispatch machinery the footgun lives in).
- `src/state.ts:1323-1365` — `LOGIN_TICK` reducer case: the pure, time-injected, idempotent pattern to copy (note: never dispatched in app code).
- `src/constants.ts:1186-1191` — `dayKeyForDate` (local `YYYY-MM-DD`), if the welcome-back copy wants a date.
- `src/constants.ts:205-207` — `SAVE_SCHEMA_VERSION = 45` + the destructive comment. **Bump to 46.**
- `src/state/init.ts:64-180` — `createFreshState`; `:137-138` existing `embers`/`coreIngots`; `:165-176` where slice `initial`s are spread. **Spread `embergarden.initial` here.**
- `src/state/init.ts:182-216` — `initialState` hydration + the redundant version gate at `:185`.
- `src/features/boons/slice.ts` — model slice that owns a currency-spending action via `SLICE_PRIMARY_ACTIONS`; shows the `embers`/`coreIngots` spend (collision reference).
- `src/features/runSummary/{slice.ts,index.tsx}` — model slice + `alwaysMounted` self-gating modal/screen using `src/ui/primitives/*`.
- `src/ui.tsx:81-175` — `FeatureModals` / `FeatureScreens`: how `viewKey`/`modalKey`/`alwaysMounted` get rendered.
- `prototype.tsx:334, 359-470` — `useReducer` + the mount `useEffect` cluster. **Add the time-delta tick here.**
- `src/types/actions.ts:56` + `src/types/actionPayloads.ts:362` — where `LOGIN_TICK`'s type/payload live; add `EMBERGARDEN/*` alongside.
- `src/visualTesting/global.d.ts:9-30` — `__hearthVisual` (`dispatch`/`state`/`freeze`) + `__phaserScene`: the in-game verify handles.
- `src/__tests__/daily-streak.test.ts` — template for driving a time-injected action through `gameReducer` end-to-end (mirror for the footgun test).
- `docs/projects/08-save-migration-ladder.md` — **hard dependency**: the migration ladder that makes the schema bump non-destructive.
- `docs/projects/05-ai-playtest-balance-harness.md` — the harness to tune the generator/prestige curves once landed.
- `.claude/skills/check-slice-action` — validate the three `EMBERGARDEN/*` registrations.
- `.claude/skills/phaser-scene-debug` — only if you (against this brief's advice) add a canvas; the idle layer is DOM-only.
- CLAUDE.md — house rules (note: it says `.js/.jsx`; the real files are `.ts/.tsx` — trust the code).
