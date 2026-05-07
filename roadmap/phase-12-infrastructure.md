# Phase 12 — Infrastructure

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Players never see this phase directly — it shows
up in the things that *don't* break. A save from a year ago opens cleanly into
the latest build with every Phase 2/3/4/.../11 slice initialised to safe
defaults. The first paint of `index.html` finishes faster because Phaser ships
in its own cached chunk and bundles compress over the wire. Bugs that used to
sneak past the in-game self-tests now fail a real test runner before the PR
ever lands on `main`.

**Why now:** Phases 0–11 grew the codebase past the point where the in-game
`runSelfTests()` scales — a single 800-line function asserting against live
scene state can't isolate per-phase regressions, can't gate merges, and can't
report coverage. The save schema has accreted eleven phases of additions
(story slice, market, runes, workers, species, NPC bonds, quests, almanac,
boss state, mine hazards, farm rats, polish prefs); without explicit
migrations, a returning player whose save was made before, say, Phase 5
either crashes on load or silently loses unrecognised slices. CI is the
safety net that keeps future phases from breaking what the prior eleven
already shipped.

> **Note on existing test infra:** Vitest is **already installed** in
> `package.json` (`"vitest": "^4.1.5"`, `"test": "vitest run"`), and there
> is an existing `src/__tests__/reducers.test.js`. Phase 12 therefore
> *completes* the migration — porting every `runSelfTests()` assertion
> into per-phase Vitest files, formalising the coverage gate, and wiring
> CI — rather than introducing the runner from scratch. The Phase 12
> tasks below assume Vitest is the existing test surface and elevate it
> to the canonical merge-gate runner.

**Entry check:** [Phase 11 Sign-off Gate](./phase-11-polish.md#phase-11-sign-off-gate)
complete — but per the ROADMAP dependency graph, Phase 12 can also be picked
up earlier in parallel if test friction grows. Spec'ing it last keeps the
migration coverage comprehensive (one migration step per save-shape change
across all eleven prior phases).

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 12.1 — Real test runner (Vitest)

**What this delivers:** Vitest replaces the in-game `runSelfTests()` as the
authoritative test surface. Every assertion the eleven prior phases parked
inside `runSelfTests()` migrates into a per-phase file under `tests/` so a
failing chain-threshold check no longer requires booting a Phaser scene. The
in-game self-test path stays callable from the browser console as a *smoke
set* — a compact cross-phase invariants list ("fresh state has bond 5 for all
NPCs", "MAX_TURNS === 10", "INITIAL_STORY_STATE.beat === 'act1_arrival'") —
so dev-loop console use survives, but CI runs the comprehensive Vitest suite.
Coverage threshold: 70% on `src/utils.js`, `src/state.js`, and
`src/features/**`. Test file naming is enforced (`tests/phase-N-*.test.js`)
so the per-phase mapping stays legible at a glance.

**Completion Criteria:**
- [ ] `npm test` exits 0 on a clean tree and runs every `tests/*.test.js` file
- [ ] `npm test` exits non-zero (code 1) when any single assertion fails —
  verified by a deliberate red-fixture test that is skipped after demo
- [ ] `vitest.config.js` exists at repo root with `test.environment: "node"`,
  `coverage.provider: "v8"`, and `coverage.thresholds: { lines: 70, statements:
  70, functions: 70, branches: 60 }` against `src/utils.js`, `src/state.js`,
  `src/features/**`
- [ ] One test file per phase: `tests/phase-0-bugs.test.js`,
  `tests/phase-1-chain.test.js`, ... `tests/phase-11-polish.test.js`
- [ ] Each test file is independent — imports only from `src/`, no scene boot,
  no `window`, no `document` (jsdom not required for unit suites)
- [ ] All `runSelfTests()` assertions from phases 0–11 migrated 1:1 (no test
  loss; deletions are explicit, not silent)
- [ ] In-game `runSelfTests()` becomes a thin shim: imports a `SMOKE_INVARIANTS`
  array from `src/smokeTests.js` and asserts each at scene init. The
  comprehensive suite is *not* called from the scene — only from `npm test`
- [ ] Test file naming convention enforced by a meta-test: any file under
  `tests/` not matching `phase-\d+-[a-z-]+\.test\.js$` (plus `tests/fixtures/`)
  fails the suite
- [ ] `npm test:watch` and `npm test:ui` (via `@vitest/ui`) wired in `package.json`
- [ ] Coverage report lands at `coverage/index.html` and is git-ignored

**Validation Spec — write before code:**

*Tests (red phase) — write the failing test first:*
```js
// tests/phase-12-infra.test.js — meta-test for the runner itself.
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 12.1 — test runner", () => {
  it("exposes Vitest globals", () => {
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
    expect(typeof expect).toBe("function");
  });

  it("has a test file per phase 0..11", () => {
    const files = readdirSync(resolve(process.cwd(), "tests"))
      .filter(f => f.endsWith(".test.js"));
    for (let n = 0; n <= 11; n++) {
      const found = files.some(f => f.startsWith(`phase-${n}-`));
      expect(found, `expected tests/phase-${n}-*.test.js`).toBe(true);
    }
  });

  it("rejects test files that violate the naming convention", () => {
    const re = /^phase-\d+-[a-z0-9-]+\.test\.js$/;
    const files = readdirSync(resolve(process.cwd(), "tests"))
      .filter(f => f.endsWith(".test.js"));
    for (const f of files) expect(f, `bad name: ${f}`).toMatch(re);
  });

  it("exposes a SMOKE_INVARIANTS list for the in-game shim", async () => {
    const mod = await import("../src/smokeTests.js");
    expect(Array.isArray(mod.SMOKE_INVARIANTS)).toBe(true);
    expect(mod.SMOKE_INVARIANTS.length).toBeGreaterThanOrEqual(5);
    for (const inv of mod.SMOKE_INVARIANTS) {
      expect(typeof inv.name).toBe("string");
      expect(typeof inv.check).toBe("function");
    }
  });
});
```
Run — confirm: `Cannot find module '../src/smokeTests.js'` and `expected
tests/phase-0-*.test.js` (no per-phase files exist yet).

*Gameplay simulation (developer running `npm test` on a feature branch with
a regression in chain math):* A contributor pushes a one-line "fix" to
`upgradeCountForChain` that accidentally returns `Math.floor(n / 2)` instead
of the threshold-table lookup. Locally they run `npm test`. Vitest prints
`tests/phase-1-chain.test.js > chain of 6 hay → 1 wheat upgrade … FAIL —
expected 1, received 3` in under 10 seconds. They fix the regression,
`npm test` goes green, push the branch. The same test run blocks the PR's
required check on GitHub Actions until the fix lands. The previous workflow
— "open the browser, watch a console line" — is gone.

Designer reflection: *Does a developer who has never opened the game before
get a clear, fast signal of what they broke from `npm test` alone? Or do they
still need to open the browser to understand the failure context?*

**Implementation:**
- `vitest.config.js` (new):
  ```js
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      environment: "node",
      include: ["tests/**/*.test.js"],
      exclude: ["tests/fixtures/**", "node_modules/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        include: ["src/utils.js", "src/state.js", "src/features/**"],
        thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
      },
    },
  });
  ```
- `package.json` scripts — `test` already wired; add `test:watch`,
  `test:ui`, `test:coverage`. Devdeps already include `vitest`; add
  `@vitest/ui` and `@vitest/coverage-v8`.
- `src/smokeTests.js` (new) — cross-phase invariants for the in-game shim:
  ```js
  import { createInitialState } from "./state.js";
  import { INITIAL_STORY_STATE } from "./story.js";
  import { MAX_TURNS } from "./constants.js";

  export const SMOKE_INVARIANTS = [
    { name: "MAX_TURNS === 10",
      check: () => MAX_TURNS === 10 },
    { name: "fresh state has 1 NPC (Wren)",
      check: () => createInitialState().npcs.roster.length === 1 },
    { name: "fresh state has bond 5 for Wren",
      check: () => createInitialState().npcs.bonds.wren === 5 },
    { name: "fresh state starts at story act 1, beat act1_arrival",
      check: () => {
        const s = createInitialState();
        return s.story.act === 1 && s.story.beat === "act1_arrival";
      } },
    { name: "INITIAL_STORY_STATE has no flags",
      check: () => Object.keys(INITIAL_STORY_STATE.flags).length === 0 },
  ];
  ```
- `src/utils.js` — `runSelfTests()` becomes:
  ```js
  import { SMOKE_INVARIANTS } from "./smokeTests.js";
  export function runSelfTests() {
    let passed = 0, failed = 0;
    for (const { name, check } of SMOKE_INVARIANTS) {
      try { check() ? passed++ : failed++; console.assert(check(), name); }
      catch (e) { failed++; console.error("smoke fail:", name, e); }
    }
    console.log(`[smoke] ${passed} passed, ${failed} failed`);
    return failed === 0;
  }
  ```
- Migrate every existing `runSelfTests()` block into the matching
  `tests/phase-N-*.test.js` file. Each migrated assertion gets wrapped in a
  Vitest `it(...)` block; deletions of obsolete asserts are explicit (commit
  message names them). One file per phase; subdivide if a phase exceeds ~300
  lines (`phase-3-economy-market.test.js`, `phase-3-economy-runes.test.js`).
- `tests/fixtures/` directory for shared test fixtures (used heavily by 12.2).

**Manual Verify Walk-through:**
1. Run `npm test`. Confirm Vitest boots, runs ≥12 phase files, exits 0.
2. Edit `src/utils.js:upgradeCountForChain` to return `0` always. Run `npm
   test`. Confirm `tests/phase-1-chain.test.js` reports failures and exit
   code is non-zero. Revert.
3. Run `npm run test:coverage`. Open `coverage/index.html`. Confirm
   `src/utils.js`, `src/state.js`, `src/features/**` each show ≥70% lines.
4. Drop the threshold to 99% in `vitest.config.js`. Confirm `npm test` fails
   with a coverage error. Revert.
5. Add a file `tests/notaphase.test.js`. Confirm the meta-test fails.
   Remove.
6. Open the browser console. Run `runSelfTests()`. Confirm it logs `[smoke]
   N passed, 0 failed` and is fast (<50ms).
7. `npm test` passes all 12.1 assertions.

---

### 12.2 — Save-file schema migrations

**What this delivers:** A versioned, idempotent migration pipeline that lets
*any* save from any prior build load cleanly into the current build with
every later-phase slice initialised to spec'd defaults. `SAVE_SCHEMA_VERSION`
is a single integer that increments by 1 every time a phase changes the save
shape — currently `11`, one per phase 1..11 (Phase 0 was the v0 baseline).
Each migration is a pure function `(stateAtVN) => stateAtVN+1` with no
side effects, no I/O, and no cross-version coupling. On load, if
`save.version < SAVE_SCHEMA_VERSION`, migrations run in sequence; if a save
is corrupted (missing `version`, mangled JSON, missing required top-level
keys) the loader falls back to a fresh `createInitialState()` with a console
warning naming the corruption. A v0 save (committed as a frozen fixture)
must round-trip into a fully-playable Phase 11 state.

**Completion Criteria:**
- [ ] `SAVE_SCHEMA_VERSION = 11` exported from `src/migrations.js`
- [ ] `MIGRATIONS` array in `src/migrations.js` with exactly 11 entries
  indexed 0..10 — `MIGRATIONS[N]` migrates v`N` → v`N+1`
- [ ] Each migration is pure (`(state) => state`), does not mutate input,
  returns a new object
- [ ] Each migration is idempotent: `M(M(state)) deepEquals M(state)`
- [ ] `migrateSave(rawSave)` returns `{ state, migratedFrom, version }`,
  applies every needed step in sequence
- [ ] Corrupted save (no `version`, missing `inventory`, JSON parse error)
  → falls back to `createInitialState()` and logs `console.warn("[save]
  corrupted, starting fresh:", reason)`
- [ ] Every save written sets `state.version = SAVE_SCHEMA_VERSION`
- [ ] Frozen fixture `tests/fixtures/save-v0.json` committed (a real Phase 0
  save shape with `inventory`, `coins`, `turnsUsed`, etc., no story slice)
- [ ] One additional fixture per "interesting" prior version
  (`save-v3.json`, `save-v6.json`, `save-v9.json`) so the test surface
  covers mid-pipeline jumps, not just v0 → v11
- [ ] Migration list is documented in code with a one-line comment per step
  naming the phase that introduced the change
- [ ] No migration ever *removes* a key from the player's save — only adds
  defaults or rewrites shapes (renames go via a temporary alias step)

**Validation Spec — write before code:**

*Tests (red phase) — write the failing test first:*
```js
// tests/phase-12-migrations.test.js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SAVE_SCHEMA_VERSION,
  MIGRATIONS,
  migrateSave,
} from "../src/migrations.js";
import { createInitialState } from "../src/state.js";

const fix = (name) => JSON.parse(
  readFileSync(resolve("tests/fixtures", name), "utf8")
);

describe("Phase 12.2 — save migrations", () => {
  it("SAVE_SCHEMA_VERSION === 11 (one per phase 1..11)", () => {
    expect(SAVE_SCHEMA_VERSION).toBe(11);
  });

  it("MIGRATIONS array has exactly 11 entries", () => {
    expect(MIGRATIONS).toHaveLength(11);
    for (const step of MIGRATIONS) expect(typeof step).toBe("function");
  });

  it("each migration is pure (does not mutate input)", () => {
    const v0 = fix("save-v0.json");
    const before = JSON.stringify(v0);
    MIGRATIONS[0](v0);
    expect(JSON.stringify(v0)).toBe(before);
  });

  it("each migration is idempotent (M(M(s)) deepEquals M(s))", () => {
    let s = fix("save-v0.json");
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const once = MIGRATIONS[i]({ ...s });
      const twice = MIGRATIONS[i](JSON.parse(JSON.stringify(once)));
      expect(twice).toEqual(once);
      s = once;
    }
  });

  it("v0 save loads cleanly into v11 with all phase slices defaulted", () => {
    const result = migrateSave(fix("save-v0.json"));
    expect(result.version).toBe(11);
    expect(result.migratedFrom).toBe(0);

    // Phase 2 slice present, default story
    expect(result.state.story.beat).toBe("act1_arrival");
    // Phase 3 slices
    expect(result.state.market).toBeDefined();
    expect(result.state.runes).toBe(0);
    expect(result.state.dailyStreak).toBeDefined();
    // Phase 4
    expect(result.state.workers).toEqual({ hires: {}, debt: 0 });
    // Phase 5
    expect(result.state.species).toBeDefined();
    expect(Array.isArray(result.state.species.discovered)).toBe(true);
    // Phase 6
    expect(result.state.npcs.bonds.wren).toBe(5);
    // Phase 7
    expect(result.state.quests).toBeDefined();
    expect(result.state.almanac.level).toBe(1);
    // Phase 8
    expect(result.state.weather).toBeDefined();
    // Phase 9 — mine hazards bag
    expect(result.state.hazards).toEqual({
      caveIn: null, gasVent: null, rats: [],
    });
    // Phase 10 — farm tools / fertilizer flag
    expect(result.state.tools.rake).toBe(0);
    expect(result.state.fertilizerActive).toBe(false);
    // Phase 11 — accessibility prefs
    expect(result.state.prefs).toBeDefined();
  });

  it("preserves player progress across migrations (no data loss)", () => {
    const v0 = fix("save-v0.json");
    v0.coins = 1234;
    v0.inventory = { ...v0.inventory, hay: 73 };
    v0.turnsUsed = 6;
    const { state } = migrateSave(v0);
    expect(state.coins).toBe(1234);
    expect(state.inventory.hay).toBe(73);
    expect(state.turnsUsed).toBe(6);
  });

  it("mid-pipeline fixtures also reach v11", () => {
    for (const f of ["save-v3.json", "save-v6.json", "save-v9.json"]) {
      const r = migrateSave(fix(f));
      expect(r.version).toBe(11);
    }
  });

  it("corrupted save falls back to fresh state with a warning", () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...a) => warns.push(a.join(" "));
    try {
      const r1 = migrateSave({ /* no version, no inventory */ });
      expect(r1.state).toEqual(createInitialState());
      expect(warns.some(w => w.includes("[save] corrupted"))).toBe(true);

      const r2 = migrateSave(null);
      expect(r2.state).toEqual(createInitialState());
    } finally { console.warn = orig; }
  });

  it("every save written carries the current SAVE_SCHEMA_VERSION", () => {
    // Stub the save writer and inspect the payload.
    const fresh = createInitialState();
    expect(fresh.version).toBe(SAVE_SCHEMA_VERSION);
  });
});
```
Run — confirm: `Cannot find module '../src/migrations.js'` (and the v0
fixture file does not exist yet).

*Gameplay simulation (returning player whose save was made in the Phase 5
era loading the Phase 11 build):* A player last opened Hearthwood Vale in
month 3 of last year — the build at the time had Phases 0–5 shipped (story,
economy, workers, species). Their localStorage save still has `version: 5`,
no `quests`, no `weather`, no `hazards`, no `tools.rake`, no `prefs`. They
return after a six-month break and load the Phase 11 build. The loader
detects `5 < 11` and walks the migration chain v5→v6→...→v11. Their
discovered species, bond with Mira (Liked), 47 hay in inventory, and 230
coins all survive untouched. They open a fresh boss season and weather
applies cleanly because Phase 8 default state is now seeded. They never see
an error message — the only signal that anything happened is a single dev
console line: `[save] migrated v5 → v11 in 4ms`.

Designer reflection: *Does the returning player feel like the dev team cared
about their save, or like they got punished for taking a break? Is "silent
upgrade" the right default — or should the game proactively pop a "Welcome
back! Six months of new content has been added; here's what's new" modal on
the first post-migration session?*

**Implementation:**
- `src/migrations.js` (new):
  ```js
  // Phase 12.2 — save schema migrations.
  // SAVE_SCHEMA_VERSION = N means: this build understands save shape vN.
  // Every phase 1..11 that touched the save shape adds exactly one step.
  // Locked rule: migrations are PURE and IDEMPOTENT. No I/O. No mutation.
  export const SAVE_SCHEMA_VERSION = 11;

  import { createInitialState } from "./state.js";
  import { INITIAL_STORY_STATE } from "./story.js";

  export const MIGRATIONS = [
    // v0 → v1: Phase 1 — chain model swap, gridCols/gridRows persisted
    (s) => ({ ...s, gridCols: s.gridCols ?? 7, gridRows: s.gridRows ?? 6,
              chainModel: "threshold" }),
    // v1 → v2: Phase 2 — story slice
    (s) => ({ ...s, story: s.story ?? { ...INITIAL_STORY_STATE } }),
    // v2 → v3: Phase 3 — market, runes, dailyStreak, supplies
    (s) => ({ ...s,
              market: s.market ?? { drift: {}, lastSeasonRolled: null },
              runes: s.runes ?? 0,
              dailyStreak: s.dailyStreak ?? { day: 0, lastClaim: null },
              supplies: s.supplies ?? 0 }),
    // v3 → v4: Phase 4 — workers slice (max-effect data model)
    (s) => ({ ...s, workers: s.workers ?? { hires: {}, debt: 0 } }),
    // v4 → v5: Phase 5 — species discovery + active filter
    (s) => ({ ...s, species: s.species ?? {
              discovered: [], active: { grass: "hay", grain: "wheat",
                wood: "log", berry: "berry", bird: "sparrow" } } }),
    // v5 → v6: Phase 6 — npcs.bonds (existing roster, default 5)
    (s) => {
      const roster = s.npcs?.roster ?? ["wren"];
      const bonds = { ...(s.npcs?.bonds ?? {}) };
      for (const id of roster) if (bonds[id] == null) bonds[id] = 5;
      return { ...s, npcs: { ...(s.npcs ?? {}), bonds,
                            lastGiftSeason: s.npcs?.lastGiftSeason ?? {} } };
    },
    // v6 → v7: Phase 7 — quests, almanac (level/xp), achievements
    (s) => ({ ...s,
              quests: s.quests ?? { active: [], claimed: [], rolledFor: null },
              almanac: s.almanac ?? { level: 1, xp: 0 },
              achievements: s.achievements ?? {} }),
    // v7 → v8: Phase 8 — boss + weather banner state
    (s) => ({ ...s,
              boss: s.boss ?? null,
              weather: s.weather ?? { current: "None", rolledForSeason: null } }),
    // v8 → v9: Phase 9 — mine biome hazards bag + biome flag
    (s) => ({ ...s,
              biome: s.biome ?? "farm",
              unlockedBiomes: s.unlockedBiomes ?? { farm: true },
              hazards: { caveIn: null, gasVent: null,
                         ...(s.hazards ?? {}), rats: s.hazards?.rats ?? [] } }),
    // v9 → v10: Phase 10 — farm tools, fertilizer flag, season pool mods
    (s) => ({ ...s,
              tools: { ...(s.tools ?? {}),
                       rake: s.tools?.rake ?? 0,
                       axe: s.tools?.axe ?? 0,
                       fertilizer: s.tools?.fertilizer ?? 0 },
              fertilizerActive: s.fertilizerActive ?? false }),
    // v10 → v11: Phase 11 — accessibility / motion / colorblind prefs
    (s) => ({ ...s,
              prefs: s.prefs ?? { colorblind: "off", reduceMotion: false,
                                  keyboardChain: false, screenReader: false } }),
  ];

  function isCorrupted(raw) {
    if (raw == null || typeof raw !== "object") return "not an object";
    if (typeof raw.inventory !== "object") return "no inventory";
    return null;
  }

  export function migrateSave(raw) {
    const reason = isCorrupted(raw);
    if (reason) {
      console.warn(`[save] corrupted, starting fresh: ${reason}`);
      return { state: createInitialState(), migratedFrom: -1,
               version: SAVE_SCHEMA_VERSION };
    }
    let state = raw;
    const from = state.version ?? 0;
    for (let v = from; v < SAVE_SCHEMA_VERSION; v++) {
      try {
        state = MIGRATIONS[v]({ ...state });
      } catch (e) {
        console.warn(`[save] migration v${v}→v${v+1} failed: ${e.message}`);
        return { state: createInitialState(), migratedFrom: from,
                 version: SAVE_SCHEMA_VERSION };
      }
    }
    state.version = SAVE_SCHEMA_VERSION;
    return { state, migratedFrom: from, version: SAVE_SCHEMA_VERSION };
  }
  ```
- `src/state.js` — `createInitialState()` ends with
  `state.version = SAVE_SCHEMA_VERSION` so every fresh save self-stamps.
- `src/GameScene.js` — replace any direct `JSON.parse(localStorage...)` →
  `gameState = ...` path with `gameState = migrateSave(parsed).state`. Save
  writer continues to JSON-stringify the whole state.
- `tests/fixtures/save-v0.json` — committed real-shape Phase 0 save:
  ```json
  { "inventory": { "hay": 12, "wheat": 3, "log": 0 },
    "coins": 80, "turnsUsed": 3, "season": "Spring",
    "year": 1, "level": 2, "biome": "farm" }
  ```
- `tests/fixtures/save-v3.json`, `save-v6.json`, `save-v9.json` — frozen
  shapes captured from real playthroughs at each phase boundary.

**Manual Verify Walk-through:**
1. Open the game on a clean tree. Save (any chain). Inspect localStorage —
   confirm `version === 11`.
2. Manually edit localStorage and set `version: 5`, delete the `quests`,
   `weather`, `hazards`, `tools`, `prefs`, `fertilizerActive` keys. Reload.
   Confirm dev-console line `[save] migrated v5 → v11`. Confirm the game
   boots with intact inventory + coins + bonds, and all defaulted slices
   present.
3. Set localStorage to `{}`. Reload. Confirm `[save] corrupted, starting
   fresh: no inventory` warning and a fresh game.
4. Set localStorage to `null`. Reload. Confirm fresh game, warning printed.
5. Set localStorage to a v0 fixture by hand. Reload. Confirm v0 → v11 walk.
6. In console: `migrateSave(JSON.parse(JSON.stringify(window.gameState)))`.
   Confirm the result `version === 11` and `migratedFrom === 11` (no-op).
7. `npm test` passes all 12.2 assertions.

---

### 12.3 — CI pipeline (GitHub Actions)

**What this delivers:** A `.github/workflows/ci.yml` workflow that runs on
every PR opened against `main` and on every push to `main`, with three
parallel jobs: `lint` (eslint), `test` (vitest), `build` (vite build). Each
job uses `actions/setup-node@v4` with Node 20, restores `node_modules` from
`actions/cache` keyed on `package-lock.json`, and is required to pass before
a PR can merge. End-to-end target: <3 minutes wall-clock on the default
GitHub-hosted runner. The workflow is itself tested — a meta-test parses
the YAML and asserts the required jobs/triggers are present, so
accidentally renaming a job (and silently breaking branch protection)
fails CI before it ever runs.

**Completion Criteria:**
- [ ] `.github/workflows/ci.yml` exists and is valid YAML
- [ ] Triggers: `pull_request` (any branch → `main`) and `push` (to `main`)
- [ ] Three jobs: `lint`, `test`, `build` — each runs in parallel
- [ ] All jobs use `actions/setup-node@v4` with `node-version: 20` and
  `cache: "npm"`
- [ ] All jobs run `npm ci` for reproducible installs
- [ ] `lint` job runs `npm run lint` and fails on any eslint error
- [ ] `test` job runs `npm test` and uploads `coverage/` as an artifact
- [ ] `build` job runs `npm run build` and uploads `dist/` as an artifact
- [ ] Branch protection on `main` requires `lint`, `test`, `build` all green
  before a PR can merge (configured in repo settings — documented in the
  workflow file's leading comment)
- [ ] Workflow finishes in <3 minutes on a warm cache (cache hit)
- [ ] A meta-test parses the YAML and asserts triggers, job names, Node
  version — so workflow drift fails the suite locally

**Validation Spec — write before code:**

*Tests (red phase) — write the failing test first:*
```yaml
# .github/workflows/ci.yml — will be created in this task.
# Meta-tested by tests/phase-12-ci.test.js below.

name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

```js
// tests/phase-12-ci.test.js — meta-test the workflow itself.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ymlPath = resolve(".github/workflows/ci.yml");

describe("Phase 12.3 — CI pipeline", () => {
  it("workflow file exists", () => {
    expect(existsSync(ymlPath)).toBe(true);
  });

  it("workflow has the required top-level structure", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/^name:\s*CI/m);
    expect(yml).toMatch(/pull_request:/);
    expect(yml).toMatch(/push:/);
    expect(yml).toMatch(/branches:\s*\[main\]/);
  });

  it("has lint, test, build jobs", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/^\s{2}lint:/m);
    expect(yml).toMatch(/^\s{2}test:/m);
    expect(yml).toMatch(/^\s{2}build:/m);
  });

  it("uses Node 20 with npm cache in every job", () => {
    const yml = readFileSync(ymlPath, "utf8");
    const nodeBlocks = yml.match(/setup-node@v4[\s\S]+?(?=\n\s{0,6}-|\n\s{0,4}\w)/g);
    expect(nodeBlocks?.length).toBeGreaterThanOrEqual(3);
    for (const b of nodeBlocks) {
      expect(b).toMatch(/node-version:\s*20/);
      expect(b).toMatch(/cache:\s*npm/);
    }
  });

  it("uploads coverage and dist artifacts", () => {
    const yml = readFileSync(ymlPath, "utf8");
    expect(yml).toMatch(/upload-artifact@v4[\s\S]+?name:\s*coverage/);
    expect(yml).toMatch(/upload-artifact@v4[\s\S]+?name:\s*dist/);
  });

  it("every job has a timeout to fail fast on hangs", () => {
    const yml = readFileSync(ymlPath, "utf8");
    const matches = yml.match(/timeout-minutes:\s*\d+/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
```
Run — confirm: `workflow file exists … expected true, received false` (the
`.github/workflows/ci.yml` file is not present yet).

*Gameplay simulation (developer opening a PR with a deliberately broken
chain test):* A contributor branches off `main`, edits
`src/utils.js:upgradeCountForChain` to return `0` always, opens a PR. Within
~90 seconds GitHub Actions reports: `lint` green, `test` red ("8 failures
in tests/phase-1-chain.test.js"), `build` green. The PR's "Required checks"
panel blocks the merge button. The contributor reverts the change, pushes,
the workflow re-runs in <60 seconds (cache hit), all three jobs go green,
the merge button enables. A second contributor adds a missing eslint
semicolon — `lint` goes red, blocks merge. A third intentionally adds a
`throw new Error("intentional")` to `vite.config.js`; `build` goes red.

Designer reflection: *Does CI failing fast (<3 minutes) feel like a helpful
co-pilot, or like a bureaucratic gate? Is the cost of "every PR runs three
jobs" worth the safety of catching a chain-math regression before it lands
on `main` — given that a regression on the chain mechanic destroys the core
loop for every player on the next deploy?*

**Implementation:**
- `.github/workflows/ci.yml` — exactly the YAML above (the test stub *is*
  the implementation; the file content lives at the workflow path, the
  meta-test asserts against it).
- `package.json` — add `test:coverage` script: `vitest run --coverage`.
- `eslint.config.js` already exists from prior phases; the `lint` job uses
  whatever rules are currently configured (Phase 12 doesn't change them).
- Branch protection settings (manual, documented): require status checks
  `lint`, `test`, `build` to pass; require branches up-to-date before
  merging; dismiss stale approvals on push. Document this in the
  workflow's leading comment so a fresh fork can replicate the protection.
- README addition (one line under "Commands"): "CI runs `lint` + `test` +
  `build` on every PR; see `.github/workflows/ci.yml`."

**Manual Verify Walk-through:**
1. Open a draft PR with no changes. Confirm CI triggers and all three jobs
   pass.
2. Push a commit that adds a semicolon error. Confirm `lint` fails and the
   PR is blocked.
3. Push a fix; confirm cache hit reduces `test` job from ~80s to <40s.
4. Push a deliberate failing test (e.g. `expect(1).toBe(2)` in any
   `tests/*.test.js`). Confirm `test` fails with the assertion line.
5. Push a syntax error in `vite.config.js`. Confirm `build` fails.
6. Revert all three. Confirm all green within 3 minutes.
7. In the repo settings, confirm `lint`, `test`, `build` are listed as
   required checks for `main`.
8. `npm test` passes all 12.3 assertions (meta-tests verify the workflow
   YAML shape locally).

---

### 12.4 — Vite build optimisation

**What this delivers:** First-paint speed and bundle hygiene at
production-build time. Phaser ships in its own `vendor/phaser` chunk
(currently the heaviest single dependency at ~1.2MB pre-gzip), so the React
shell can render before the canvas mounts. Both gzip and brotli
pre-compressed copies of every JS/CSS asset land in `dist/` via
`vite-plugin-compression`, letting any modern static host serve `.br` to
supporting clients. `rollup-plugin-visualizer` writes `dist/stats.html` on
every build for on-demand bundle inspection. Critical assets (the first
scene's procedurally-generated textures kick off as soon as Phaser parses,
plus the one font referenced by the React HUD) preload via
`<link rel="preload">` injected by Vite's HTML transform. Targets: main
entry chunk <200KB gzipped; total first-load assets <500KB gzipped.

**Completion Criteria:**
- [ ] `vite.config.js` extended with `build.rollupOptions.output.manualChunks`
  splitting `phaser` into a `vendor/phaser` chunk
- [ ] React + ReactDOM split into `vendor/react`
- [ ] `vite-plugin-compression` (gzip + brotli) added to plugins; both
  `.gz` and `.br` siblings appear next to every JS/CSS asset in `dist/`
- [ ] `rollup-plugin-visualizer` added; `dist/stats.html` exists after every
  `npm run build`
- [ ] Main entry chunk < 200KB gzipped — measured by reading the file size
  of `dist/assets/index-*.js.gz` after build
- [ ] Phaser chunk < 400KB gzipped (separate accounting)
- [ ] Total first-load gzipped JS+CSS < 500KB
- [ ] `<link rel="preload" as="font">` injected for the HUD font and
  `<link rel="modulepreload">` for the Phaser chunk
- [ ] Source maps produced (`build.sourcemap: true`) so production bug
  reports are debuggable
- [ ] No regression in `npm run dev` — dev server still HMRs in <1s
- [ ] Lighthouse first-contentful-paint > 90 (manual verify, not automated
  — audited once at sign-off)

**Validation Spec — write before code:**

*Tests (red phase) — write the failing test first:*
```js
// tests/phase-12-build.test.js — runs after `npm run build`.
import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { gzipSync, brotliCompressSync } from "node:zlib";

const distDir = resolve("dist");
const assetsDir = resolve("dist/assets");

describe("Phase 12.4 — build optimisation", () => {
  beforeAll(() => {
    // Build once for the whole describe block.
    if (!existsSync(distDir)) execSync("npm run build", { stdio: "inherit" });
  }, 120_000);

  it("dist/ exists with index.html", () => {
    expect(existsSync(resolve(distDir, "index.html"))).toBe(true);
  });

  it("produces a separate phaser vendor chunk", () => {
    const files = readdirSync(assetsDir);
    const phaserChunk = files.find(f => /phaser/i.test(f) && f.endsWith(".js"));
    expect(phaserChunk, "expected a phaser-named chunk").toBeDefined();
  });

  it("produces a separate react vendor chunk", () => {
    const files = readdirSync(assetsDir);
    const reactChunk = files.find(f => /react/i.test(f) && f.endsWith(".js"));
    expect(reactChunk).toBeDefined();
  });

  it("main entry chunk is under 200KB gzipped", () => {
    const files = readdirSync(assetsDir);
    const entry = files.find(f =>
      /^index-/.test(f) && f.endsWith(".js") && !f.includes("phaser"));
    expect(entry).toBeDefined();
    const buf = readFileSync(resolve(assetsDir, entry));
    const gz = gzipSync(buf);
    expect(gz.length, `main entry gzipped size: ${gz.length} bytes`)
      .toBeLessThan(200 * 1024);
  });

  it("phaser chunk is under 400KB gzipped", () => {
    const files = readdirSync(assetsDir);
    const ph = files.find(f => /phaser/i.test(f) && f.endsWith(".js"));
    const buf = readFileSync(resolve(assetsDir, ph));
    expect(gzipSync(buf).length).toBeLessThan(400 * 1024);
  });

  it("total first-load JS+CSS is under 500KB gzipped", () => {
    const files = readdirSync(assetsDir)
      .filter(f => f.endsWith(".js") || f.endsWith(".css"));
    const total = files.reduce((sum, f) =>
      sum + gzipSync(readFileSync(resolve(assetsDir, f))).length, 0);
    expect(total).toBeLessThan(500 * 1024);
  });

  it("emits .gz and .br siblings for every js/css asset", () => {
    const files = readdirSync(assetsDir);
    const codeAssets = files.filter(f =>
      (f.endsWith(".js") || f.endsWith(".css")) &&
      !f.endsWith(".map"));
    for (const f of codeAssets) {
      expect(files.includes(f + ".gz"), `${f}.gz missing`).toBe(true);
      expect(files.includes(f + ".br"), `${f}.br missing`).toBe(true);
    }
  });

  it("emits dist/stats.html for the bundle analyzer", () => {
    expect(existsSync(resolve(distDir, "stats.html"))).toBe(true);
  });

  it("emits sourcemaps for the entry chunk", () => {
    const files = readdirSync(assetsDir);
    const map = files.find(f => /^index-/.test(f) && f.endsWith(".js.map"));
    expect(map).toBeDefined();
  });

  it("index.html contains preload hints", () => {
    const html = readFileSync(resolve(distDir, "index.html"), "utf8");
    expect(html).toMatch(/<link\s+rel="modulepreload"[^>]+phaser/i);
  });
});
```
Run — confirm: `expected a phaser-named chunk … received undefined` and
`stats.html missing` (the build is currently a single bundle).

*Gameplay simulation (end user opening Hearthwood Vale on a slow connection
for the first time):* Player on a phone tethering 4G clicks the deployed
URL. Browser parses `index.html`; preload hint fires the Phaser chunk and
HUD font in parallel. React shell paints the loading frame within ~600ms
(main entry chunk only ~150KB gzipped). Phaser chunk arrives ~400ms later,
canvas mounts, Wren's portrait fades in. Total visible-content time ~1.1s
on a connection that previously took ~3.4s when everything shipped in one
1.6MB blob. The brotli-compressed assets save ~25% wire bytes vs gzip on
modern browsers.

Designer reflection: *Does shaving 2.3 seconds off cold load actually move
the player retention needle on a sandbox puzzle game, or is it
optimisation theater? Is the ~2KB increase in build complexity (compression
plugin + visualizer + manual chunk config) a fair trade for faster load
and on-demand bundle inspection on every PR?*

**Implementation:**
- `package.json` — add devdeps:
  `vite-plugin-compression`, `rollup-plugin-visualizer`. (The other
  devdeps — `vitest`, `@vitest/ui`, `@vitejs/plugin-react`,
  `@vitest/coverage-v8` — were added in 12.1.)
- `vite.config.js` — extend:
  ```js
  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react";
  import compression from "vite-plugin-compression";
  import { visualizer } from "rollup-plugin-visualizer";

  export default defineConfig({
    plugins: [
      react(),
      compression({ algorithm: "gzip", ext: ".gz" }),
      compression({ algorithm: "brotliCompress", ext: ".br" }),
      visualizer({ filename: "dist/stats.html",
                   gzipSize: true, brotliSize: true }),
    ],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor/phaser": ["phaser"],
            "vendor/react": ["react", "react-dom"],
          },
        },
      },
    },
  });
  ```
- `index.html` — add preload hints at the top of `<head>`:
  ```html
  <link rel="modulepreload" href="/assets/vendor/phaser.js" as="script">
  <link rel="preload" href="/assets/hud-font.woff2" as="font" type="font/woff2" crossorigin>
  ```
  (Vite rewrites the hashed filenames at build time; the dev path uses a
  conditional injected by the React shell.)
- No source code in `src/` changes — this is a build-config-only task.

**Manual Verify Walk-through:**
1. Run `npm run build`. Confirm `dist/assets/` contains an `index-*.js`,
   a `vendor/phaser-*.js`, a `vendor/react-*.js`, and `.gz` + `.br`
   siblings for each.
2. `du -h dist/assets/index-*.js.gz` — confirm <200KB.
3. `du -h dist/assets/vendor/phaser-*.js.gz` — confirm <400KB.
4. Open `dist/stats.html` in the browser. Confirm interactive treemap
   renders showing each chunk and its gzip/brotli sizes.
5. Run `npm run dev`. Confirm HMR latency on a `src/GameScene.js` save is
   <1s. Confirm the dev server does not produce gzip/brotli artifacts
   (compression is build-only).
6. Serve `dist/` via `npx serve dist`. Open in Chrome with DevTools →
   Network. Confirm `Content-Encoding: br` on the JS responses (or `gzip`
   if brotli unsupported).
7. Run Lighthouse on the served build. Confirm First Contentful Paint
   score > 90.
8. Confirm `dist/assets/index-*.js.map` exists and points at readable
   `src/` paths.
9. `npm test` passes all 12.4 assertions; `npm run build` passes.

---

## Phase 12 Sign-off Gate

Run the full test + build pipeline on a fresh clone (`rm -rf node_modules
dist coverage && npm ci && npm test && npm run build`) and audit the
artifacts. Then walk three save-migration scenarios end-to-end (v0 → v11,
v6 → v11, corrupted → fresh). Before declaring infrastructure done,
confirm all:

- [ ] 12.1 Completion Criteria all checked
- [ ] 12.2 Completion Criteria all checked
- [ ] 12.3 Completion Criteria all checked
- [ ] 12.4 Completion Criteria all checked
- [ ] **All `runSelfTests()` assertions across phases 0–11 are migrated to
  `tests/phase-N-*.test.js` files; `npm test` runs them all** — verified by
  cross-referencing the historic `runSelfTests()` body against the per-phase
  test files; no assertion is silently dropped
- [ ] **A v0 save fixture (committed at `tests/fixtures/save-v0.json`) loads
  into the Phase 11 build without data loss** — coins, inventory, turnsUsed,
  season survive the migration walk verbatim
- [ ] **Every PR opened against `main` runs `lint` + `test` + `build` via
  GitHub Actions, and all three are required for merge** — verified by
  opening a sentinel PR with a deliberate eslint error and watching the
  merge button stay disabled
- [ ] **Production bundle is < 200KB gzipped for the main entry chunk and
  < 500KB total first-load** — measured from `dist/assets/*.gz` byte sizes
- [ ] **Bundle analyzer report (`dist/stats.html`) exists after every build
  and is included in the `dist` artifact uploaded by the CI build job** —
  downloadable from the workflow run page
- [ ] **The in-game `runSelfTests()` shim still works as a 50ms console
  smoke check** — covers the cross-phase invariants (MAX_TURNS, fresh-state
  bonds, story start) without booting the comprehensive Vitest suite
- [ ] **Migrations are pure and idempotent** — `M(M(state)) deepEquals
  M(state)` holds for every step; running the full pipeline twice on a v0
  fixture yields the same v11 state
- [ ] **A returning player whose six-month-old save is at v5 sees zero
  errors and zero data loss on first reload** — verified by hand-editing
  localStorage to a v5 shape and reloading the deployed build

*Designer gut-check: Does a returning player who hasn't opened the game in
six months feel like the dev team cared about their save — or like they got
punished for taking a break? When the next contributor opens a PR that
breaks chain math, does CI catch it in the 90 seconds before they context-
switch to something else, or does the regression sneak through to a
deploy because the safety net was the wrong shape?*
