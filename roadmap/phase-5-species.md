# Phase 5 — Species

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** The first time the player chains 6 hay, a soft fanfare
plays and a "New species: Wheat" floater rises from the endpoint — they've just
*discovered* something the game didn't tell them about up front. Reach 20 hay in a
single chain and the floater reads "New species: Meadow Grass". Open the new Species
panel and Meadow Grass sits glowing next to Hay in the Grass column, ready to be
toggled active. Toggling it on swaps Hay out of the board pool — the same drag
mechanic now plays on a re-shaped field. Free-move species (Turkey, Clover) chain
into bonus turns that don't tick the season counter.

**Why now:** Phase 4 wired workers — the slot system that mods chain thresholds and
pool weight from the *worker* side. Species is the parallel slot system that mods the
same board pool from the *resource* side, plus introduces the locked free-move
trigger from §18 (chain the species, not just have it active). Without species the
unlock tree from §13 is dead text, the board pool is permanently the 9-key default,
and the player has nothing to discover from chain length beyond raw upgrades. The
discovery moment also gives the Almanac (Phase 7+) something to record.

**Entry check:** [Phase 4 Sign-off Gate](./phase-4-workers.md#phase-4-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 5.1 — Species data model + categories

**What this delivers:** A locked, single-source-of-truth catalog of every species in
Hearthwood Vale, organised into the 5 farm categories from GAME_SPEC §13:
`grass / grain / wood / berry / bird`. Each entry encodes its category, its
`baseResource` (the tile key it spawns as on the board), its tier within the
category, *how* it is discovered (`default` / `chain` / `research` / `buy`), and any
gameplay effects it carries (free moves, pool-weight delta). This is the file 5.2's
state slice indexes into and 5.3/5.4 read from — every other species task in the
phase is a consumer of this catalog, never a re-statement of it.

**Completion Criteria:**
- [ ] `src/features/species/data.js` exists and exports `SPECIES` array, `SPECIES_MAP`
  (id-keyed lookup), and `SPECIES_BY_CATEGORY` (category-keyed array lookup)
- [ ] Categories enumerated in a const `CATEGORIES = ["grass","grain","wood","berry","bird"]`
- [ ] Every entry has shape:
  `{ id, category, displayName, baseResource, tier, discovery: {...}, effects: {...} }`
- [ ] `discovery.method` is one of `"default" | "chain" | "research" | "buy"`
- [ ] Chain-method entries carry `chainLengthOf: <prerequisite resource key>`; the
  `chainLength` threshold is *not* a free number — for tier-1 chain entries it equals
  `UPGRADE_THRESHOLDS[prereq]`, for the §13 Meadow Grass it is the literal `20`
- [ ] Research-method entries carry `researchOf: <resource key>` plus a numeric
  `researchAmount`
- [ ] Buy-method entries carry a numeric `coinCost`
- [ ] Every category has at least one `default`-method species
- [ ] All 5 categories are represented in `SPECIES`
- [ ] No `UPGRADE_EVERY = 3` literal anywhere — only `UPGRADE_THRESHOLDS` from Phase 1

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { SPECIES, SPECIES_MAP, SPECIES_BY_CATEGORY, CATEGORIES }
  from "./features/species/data.js";
import { UPGRADE_THRESHOLDS } from "./constants.js";

assert(Array.isArray(SPECIES) && SPECIES.length >= 12,
       "≥12 species across the 5 farm categories");
assert(CATEGORIES.length === 5, "5 farm categories");
for (const c of ["grass","grain","wood","berry","bird"]) {
  assert(CATEGORIES.includes(c), `category ${c} present`);
  assert(SPECIES_BY_CATEGORY[c] && SPECIES_BY_CATEGORY[c].length >= 1,
         `category ${c} has ≥1 species`);
}

// Shape — every entry has the required fields
for (const s of SPECIES) {
  assert(typeof s.id === "string" && SPECIES_MAP[s.id] === s,
         `${s.id} is in SPECIES_MAP`);
  assert(CATEGORIES.includes(s.category), `${s.id}.category valid`);
  assert(typeof s.baseResource === "string", `${s.id}.baseResource string`);
  assert(Number.isInteger(s.tier) && s.tier >= 0,    `${s.id}.tier ≥ 0`);
  assert(s.discovery && typeof s.discovery.method === "string",
         `${s.id}.discovery.method present`);
  assert(["default","chain","research","buy"].includes(s.discovery.method),
         `${s.id}.discovery.method valid`);
}

// Every category has a default (so the board is never empty at session start)
for (const c of CATEGORIES) {
  const defaults = SPECIES_BY_CATEGORY[c].filter((s) => s.discovery.method === "default");
  assert(defaults.length >= 1, `category ${c} has a default species`);
}

// Chain-method entries name their prerequisite + threshold
const chainSpecies = SPECIES.filter((s) => s.discovery.method === "chain");
for (const s of chainSpecies) {
  assert(typeof s.discovery.chainLengthOf === "string",
         `${s.id} chain entry names chainLengthOf`);
  assert(Number.isInteger(s.discovery.chainLength) && s.discovery.chainLength >= 1,
         `${s.id} chain entry has integer chainLength`);
}

// Research-method entries name resource + numeric amount
const researchSpecies = SPECIES.filter((s) => s.discovery.method === "research");
for (const s of researchSpecies) {
  assert(typeof s.discovery.researchOf === "string",
         `${s.id} research entry names researchOf`);
  assert(Number.isInteger(s.discovery.researchAmount) && s.discovery.researchAmount > 0,
         `${s.id} research entry has positive integer amount`);
}

// Buy-method entries name a coin cost
for (const s of SPECIES.filter((s) => s.discovery.method === "buy")) {
  assert(Number.isInteger(s.discovery.coinCost) && s.discovery.coinCost > 0,
         `${s.id} buy entry has coinCost`);
}

// Locked: tier-1 chain discoveries reference UPGRADE_THRESHOLDS, not "3"
const wheat = SPECIES_MAP.wheat;
assert(wheat && wheat.discovery.method === "chain", "wheat is chain-discovered");
assert(wheat.discovery.chainLength === UPGRADE_THRESHOLDS.hay,
       "wheat chain threshold === UPGRADE_THRESHOLDS.hay (no UPGRADE_EVERY)");

// Locked: §13 number for meadow_grass is the literal 20
assert(SPECIES_MAP.meadow_grass.discovery.chainLength === 20,
       "meadow_grass chains at exactly 20 hay (GAME_SPEC §13)");

// Free-move species carry the locked effect
assert(SPECIES_MAP.turkey.effects.freeMoves === 2, "Turkey grants +2 free moves/chain");
assert(SPECIES_MAP.clover.effects.freeMoves === 2, "Clover grants +2 free moves/chain");
assert(SPECIES_MAP.melon.effects.freeMoves  === 5, "Melon grants +5 free moves/chain");
```
Run — confirm: `Cannot find module './features/species/data.js'`.

*Gameplay simulation (mid-Act-2 player opening the Species panel for the first time):*
The player has just chained 6 hay and seen "New species: Wheat" rise off the board.
They open the Species panel (new HUD button). The panel shows 5 columns: Grass,
Grain, Wood, Berry, Bird. Under Grass: Hay (active, glowing), Meadow Grass
(locked, "Chain 20 hay to discover"), Spiky Grass (locked, "Research 50 grass-class").
Under Grain: Wheat (newly discovered, "Tap to activate"), Grain (locked, "Research
30 wheat"), Flour (locked, "Research 50 grain"). The data model has to surface every
one of those tooltip strings from the same `discovery` object that the chain
discovery in 5.4 reads from — the panel cannot have its own copy of the unlock rules.

Designer reflection: *Does the unlock tree feel like a map of the game's depth, or
like a wall of locked icons? Are the two distinct discovery routes (chain vs research)
legible to a player who has never read GAME_SPEC §13?*

**Implementation:**
- New file `src/features/species/data.js`:
  ```js
  import { UPGRADE_THRESHOLDS } from "../../constants.js";

  export const CATEGORIES = ["grass", "grain", "wood", "berry", "bird"];

  export const SPECIES = [
    // Grass
    { id: "hay", category: "grass", displayName: "Hay", baseResource: "hay", tier: 0,
      discovery: { method: "default" },
      effects: {} },
    { id: "meadow_grass", category: "grass", displayName: "Meadow Grass",
      baseResource: "meadow_grass", tier: 1,
      discovery: { method: "chain", chainLengthOf: "hay", chainLength: 20 },
      effects: { poolWeightDelta: { hay: 1 } } },
    { id: "spiky_grass", category: "grass", displayName: "Spiky Grass",
      baseResource: "spiky_grass", tier: 2,
      discovery: { method: "research", researchOf: "hay", researchAmount: 50 },
      effects: { poolWeightDelta: { hay: 2 } } },

    // Grain
    { id: "wheat", category: "grain", displayName: "Wheat", baseResource: "wheat", tier: 0,
      discovery: { method: "chain", chainLengthOf: "hay",
                   chainLength: UPGRADE_THRESHOLDS.hay },
      effects: {} },
    { id: "grain", category: "grain", displayName: "Grain", baseResource: "grain", tier: 1,
      discovery: { method: "research", researchOf: "wheat", researchAmount: 30 },
      effects: {} },
    { id: "flour", category: "grain", displayName: "Flour", baseResource: "flour", tier: 2,
      discovery: { method: "research", researchOf: "grain", researchAmount: 50 },
      effects: {} },

    // Wood
    { id: "log", category: "wood", displayName: "Log", baseResource: "log", tier: 0,
      discovery: { method: "default" },
      effects: {} },
    { id: "plank", category: "wood", displayName: "Plank", baseResource: "plank", tier: 1,
      discovery: { method: "chain", chainLengthOf: "log",
                   chainLength: UPGRADE_THRESHOLDS.log },
      effects: {} },
    { id: "beam", category: "wood", displayName: "Beam", baseResource: "beam", tier: 2,
      discovery: { method: "research", researchOf: "plank", researchAmount: 30 },
      effects: {} },

    // Berry
    { id: "berry", category: "berry", displayName: "Berry", baseResource: "berry", tier: 0,
      discovery: { method: "default" },
      effects: {} },
    { id: "jam", category: "berry", displayName: "Jam", baseResource: "jam", tier: 1,
      discovery: { method: "chain", chainLengthOf: "berry",
                   chainLength: UPGRADE_THRESHOLDS.berry },
      effects: {} },

    // Bird
    { id: "egg", category: "bird", displayName: "Egg", baseResource: "egg", tier: 0,
      discovery: { method: "default" },
      effects: {} },
    { id: "turkey", category: "bird", displayName: "Turkey", baseResource: "turkey", tier: 1,
      discovery: { method: "research", researchOf: "egg", researchAmount: 20 },
      effects: { freeMoves: 2 } },
    { id: "clover", category: "bird", displayName: "Clover", baseResource: "clover", tier: 2,
      discovery: { method: "buy", coinCost: 200 },
      effects: { freeMoves: 2 } },
    { id: "melon", category: "bird", displayName: "Melon", baseResource: "melon", tier: 3,
      discovery: { method: "buy", coinCost: 500 },
      effects: { freeMoves: 5 } },
  ];

  export const SPECIES_MAP = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
  export const SPECIES_BY_CATEGORY = Object.fromEntries(
    CATEGORIES.map((c) => [c, SPECIES.filter((s) => s.category === c)]),
  );
  ```
- Note: `UPGRADE_THRESHOLDS` (Phase 1.0) supplies the per-resource threshold for
  tier-1 chain discoveries. Meadow Grass uses the literal §13 figure of 20 — that
  number is a designed gate, not a function of `UPGRADE_THRESHOLDS.hay`.
- The new `baseResource` keys (`meadow_grass`, `spiky_grass`, `turkey`, `clover`,
  `melon`) are *not yet* in `BIOMES.farm.resources` — Phase 5.5 will register their
  textures and add them to the resource list. For 5.1's tests we only need their
  names, not their visual existence.

**Manual Verify Walk-through:**
1. `npm run dev`. In console:
   `console.table((await import("./src/features/species/data.js")).SPECIES)`. Confirm
   ≥12 rows with `id, category, baseResource, tier, discovery.method`.
2. `(await import("./src/features/species/data.js")).SPECIES_BY_CATEGORY.grass.length`
   returns 3.
3. `(await import("./src/features/species/data.js")).SPECIES_MAP.wheat.discovery.chainLength`
   matches `(await import("./src/constants.js")).UPGRADE_THRESHOLDS.hay`.
4. `SPECIES_MAP.meadow_grass.discovery.chainLength === 20`.
5. `runSelfTests()` passes all 5.1 assertions.

---

### 5.2 — `state.species` slice

**What this delivers:** A persisted `state.species` slice that tracks (a) which
species the player has *discovered* (a flat boolean map keyed by species id), (b)
cumulative *research progress* per researchable species (locked global per §18),
(c) the *active* species per category (one slot per category, may be `null`), and
(d) `freeMoves` accumulated this session from chaining free-move species. The slice
seeds with every default-method species already discovered and active, no other
species discovered, every research counter at 0, and `freeMoves: 0`. Old saves that
predate Phase 5 merge into the default shape so loading them doesn't blow up.

**Completion Criteria:**
- [ ] `src/state.js:initialState()` includes a `species` slice with the locked shape
- [ ] `state.species.discovered` has every default-method species id mapped to
  `true`, every other species id either absent or `false`
- [ ] `state.species.researchProgress` has a numeric counter for every research-method
  species id (initial value 0)
- [ ] `state.species.activeByCategory` has every category key, with the value being
  the id of the default species (e.g. `grass: "hay"`) — except `grain`, which has no
  default so seeds to `null`
- [ ] `state.species.freeMoves === 0` at session start
- [ ] Save schema persists `state.species`; load merges with defaults so any missing
  field on an old save is filled in (idempotent migration)
- [ ] `DEV/RESET_GAME` resets `state.species` to a fresh clone of the initial shape
- [ ] No reducer or scene method writes directly to `state.species` outside the
  reducers introduced by 5.3, 5.4, and 5.5/5.6 — single-writer rule

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { initialState, rootReducer, mergeLoadedState } from "./state.js";
import { SPECIES, SPECIES_MAP } from "./features/species/data.js";

const s0 = initialState();
assert(s0.species, "state.species exists at init");
assert(s0.species.freeMoves === 0, "freeMoves starts at 0");

// Defaults discovered, non-defaults not
for (const sp of SPECIES) {
  if (sp.discovery.method === "default") {
    assert(s0.species.discovered[sp.id] === true,
           `${sp.id} discovered at init (default)`);
  } else {
    assert(!s0.species.discovered[sp.id],
           `${sp.id} NOT discovered at init`);
  }
}

// activeByCategory: defaults set, no-default categories null
assert(s0.species.activeByCategory.grass === "hay",  "hay active in grass");
assert(s0.species.activeByCategory.wood  === "log",  "log active in wood");
assert(s0.species.activeByCategory.berry === "berry","berry active in berry");
assert(s0.species.activeByCategory.bird  === "egg",  "egg active in bird");
assert(s0.species.activeByCategory.grain === null,
       "grain has no default, starts null");

// researchProgress has every research-method species at 0
for (const sp of SPECIES.filter((s) => s.discovery.method === "research")) {
  assert(s0.species.researchProgress[sp.id] === 0,
         `${sp.id} research starts at 0`);
}

// Save roundtrip
const saved   = JSON.parse(JSON.stringify(s0));
const reload1 = mergeLoadedState(saved);
assert(JSON.stringify(reload1.species) === JSON.stringify(s0.species),
       "save → load preserves species slice");

// Migration from a save that lacks the species slice entirely
const oldSave = { ...JSON.parse(JSON.stringify(s0)) };
delete oldSave.species;
const migrated = mergeLoadedState(oldSave);
assert(migrated.species, "migrated save has species slice");
assert(migrated.species.discovered.hay === true,
       "migrated save: hay discovered (default seed)");
assert(migrated.species.activeByCategory.grass === "hay",
       "migrated save: grass active = hay");
assert(migrated.species.freeMoves === 0, "migrated save: freeMoves 0");

// Migration is idempotent
const migrated2 = mergeLoadedState(JSON.parse(JSON.stringify(migrated)));
assert(JSON.stringify(migrated2.species) === JSON.stringify(migrated.species),
       "migration is idempotent");

// DEV/RESET_GAME resets species
const dirty = { ...s0, species: { ...s0.species,
  discovered: { ...s0.species.discovered, wheat: true, meadow_grass: true },
  freeMoves: 7 } };
const reset = rootReducer(dirty, { type: "DEV/RESET_GAME" });
assert(!reset.species.discovered.wheat,        "reset clears wheat");
assert(!reset.species.discovered.meadow_grass, "reset clears meadow_grass");
assert(reset.species.freeMoves === 0,          "reset clears freeMoves");
```
Run — confirm: `state.species is undefined` or
`mergeLoadedState is not exported from './state.js'`.

*Gameplay simulation (returning player on session 4 with an old pre-Phase-5 save):*
The player loads. Their `localStorage` save was written before Phase 5 shipped — it
has no `species` field. The load path runs `mergeLoadedState`, sees the missing
slice, fills it with the default shape: hay/log/berry/egg discovered, all four
defaults toggled active in their categories, grain category empty, every
`researchProgress` counter 0, `freeMoves` 0. The player resumes mid-game without
losing progress and without seeing a fresh "discovered Wheat" floater for a chain
they made three sessions ago — discovery only fires on *new* chain commits (5.4),
not on load.

Designer reflection: *Does the migration silently preserve the player's place, or
does it nudge them with a "Welcome back — your species records have been updated"
modal? For Phase 5 we lean silent; if returning players miss the new panel, 5.7's
HUD nudge is the answer, not a migration toast.*

**Implementation:**
- `src/state.js` — add a `defaultSpeciesSlice()` helper and call it from
  `initialState()`:
  ```js
  import { SPECIES, SPECIES_MAP, CATEGORIES } from "./features/species/data.js";

  function defaultSpeciesSlice() {
    const discovered = {};
    const researchProgress = {};
    const activeByCategory = {};
    for (const c of CATEGORIES) activeByCategory[c] = null;
    for (const s of SPECIES) {
      if (s.discovery.method === "default") {
        discovered[s.id] = true;
        if (activeByCategory[s.category] === null) {
          activeByCategory[s.category] = s.id;
        }
      } else if (s.discovery.method === "research") {
        researchProgress[s.id] = 0;
      }
    }
    return { discovered, researchProgress, activeByCategory, freeMoves: 0 };
  }

  // initialState:
  //   ...,
  //   species: defaultSpeciesSlice(),
  ```
- `mergeLoadedState(saved)` — extend the existing load merger so that if
  `saved.species` is missing or malformed, it's replaced wholesale by
  `defaultSpeciesSlice()`; if it exists, deep-merge each sub-key against the default
  shape so any new species id introduced after the save was written gets a default
  entry. The merger is idempotent: calling it twice on the same input yields the
  same output.
- `DEV/RESET_GAME` reducer — set `state.species = defaultSpeciesSlice()` alongside
  the other slice resets.
- Save schema — `state.species` is non-volatile; the existing `persistState` write
  loop picks it up automatically.

**Manual Verify Walk-through:**
1. New session. Console: `gameState.species` shows the default shape. Confirm
   `discovered.hay === true`, `discovered.meadow_grass === undefined`,
   `activeByCategory.grain === null`, `freeMoves === 0`.
2. Set `gameState.species.discovered.wheat = true`. Save (refresh page). Confirm
   `gameState.species.discovered.wheat` survives.
3. In console: `localStorage.setItem(STORAGE_KEYS.save,
   JSON.stringify({ ...JSON.parse(localStorage.getItem(STORAGE_KEYS.save)),
   species: undefined }))`. Refresh. Confirm `gameState.species` is back to defaults
   (no crash).
4. `DEV/RESET_GAME`. Confirm species resets to defaults.
5. `runSelfTests()` passes all 5.2 assertions.

---

### 5.3 — One-active-per-category toggle

**What this delivers:** A single reducer action — `SET_ACTIVE_SPECIES` — that
enforces the locked §18 rule "1 active species per category at session start" as a
strict invariant. Toggling species B in a category that already had species A active
deactivates A and sets B; setting a category to `null` clears the slot entirely (the
player has chosen to leave that category empty for the session, and that resource
simply doesn't spawn). The reducer is a strict no-op for invalid inputs: undiscovered
species ids, ids not in the named category, unknown categories. Other categories
are never disturbed.

**Completion Criteria:**
- [ ] `rootReducer` handles `{ type: "SET_ACTIVE_SPECIES", payload: { category, speciesId } }`
- [ ] Validates: `category` is in `CATEGORIES`, `speciesId` is either `null` or a
  discovered species id whose `category` matches the payload `category`
- [ ] Toggling species B in a category that holds A: result has
  `activeByCategory[category] === b.id`, A is no longer the active value (singleton
  invariant — the slot holds exactly one id or null)
- [ ] Setting `speciesId: null` clears the slot — `activeByCategory[category] === null`
- [ ] Undiscovered species id → strict no-op (returns the same state reference)
- [ ] Cross-category mismatch (e.g. `category: "grass", speciesId: "wheat"`) →
  strict no-op
- [ ] Unknown category (e.g. `category: "fish"`) → strict no-op
- [ ] Setting the *same* species that was already active → strict no-op (don't
  churn the reference)
- [ ] Other categories' active values are never modified by a `SET_ACTIVE_SPECIES`
  for one category

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { initialState, rootReducer } from "./state.js";

const base = initialState();
// Pre-discover meadow_grass and wheat for replacement tests
const seeded = { ...base, species: { ...base.species,
  discovered: { ...base.species.discovered,
    meadow_grass: true, wheat: true } } };

// A: replace within category — singleton invariant
const a1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "meadow_grass" } });
assert(a1.species.activeByCategory.grass === "meadow_grass",
       "grass slot now holds meadow_grass");
assert(a1.species.activeByCategory.wood === "log",
       "wood slot untouched");
assert(a1.species.activeByCategory.berry === "berry",
       "berry slot untouched");

// Toggle back to hay — slot still holds exactly one id
const a2 = rootReducer(a1, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "hay" } });
assert(a2.species.activeByCategory.grass === "hay", "hay re-activated");

// B: null clears the slot
const b1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: null } });
assert(b1.species.activeByCategory.grass === null,
       "null clears the grass slot");

// C: undiscovered → strict no-op (same reference)
const c1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "spiky_grass" } });
assert(c1 === seeded, "undiscovered species → strict no-op (same ref)");

// D: cross-category mismatch — strict no-op
const d1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "wheat" } });
assert(d1 === seeded, "wheat is not in grass category → strict no-op");

// E: unknown category — strict no-op
const e1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "fish", speciesId: "hay" } });
assert(e1 === seeded, "unknown category → strict no-op");

// F: setting the same active species → strict no-op (no ref churn)
const f1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "hay" } });
assert(f1 === seeded, "no-op when already active (preserves reference)");

// G: filling a previously-null slot — grain has no default
const grainSeed = { ...seeded, species: { ...seeded.species,
  discovered: { ...seeded.species.discovered, wheat: true } } };
const g1 = rootReducer(grainSeed, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grain", speciesId: "wheat" } });
assert(g1.species.activeByCategory.grain === "wheat",
       "previously-null grain slot now holds wheat");

// H: cross-category isolation — toggling grass does not touch wood/berry/bird/grain
const h1 = rootReducer(seeded, { type: "SET_ACTIVE_SPECIES",
  payload: { category: "grass", speciesId: "meadow_grass" } });
for (const c of ["wood","berry","bird","grain"]) {
  assert(h1.species.activeByCategory[c] === seeded.species.activeByCategory[c],
         `${c} slot untouched`);
}
```
Run — confirm: `unknown action SET_ACTIVE_SPECIES` or grass replacement does not happen.

*Gameplay simulation (player on session 5, just discovered Meadow Grass):*
The player taps the new Species panel. Grass column shows two cards: Hay (active,
ringed in gold) and Meadow Grass (newly discovered, grey ring). They tap Meadow
Grass. The gold ring leaves Hay and lands on Meadow Grass; Hay's ring drops to grey;
the toast at the bottom of the panel reads "Active grass: Meadow Grass". They drag a
hay-coloured tile (still on the board from before the swap) and it commits as Meadow
Grass. They tap Meadow Grass *again* expecting to deactivate — nothing happens
(setting the same species → no-op). They tap Hay's grey card and the active ring
returns to Hay. Across all of this, the wood/berry/bird/grain slots never blink.

Designer reflection: *Does the toggle feel like a player-facing choice or like a
hidden submenu? Is the "set the same active species" no-op the right call, or
should tapping the active card clear the slot? Phase 5 ships the no-op rule because
"undefined behaviour from a re-tap" is worse than "needs a separate clear button" —
the panel adds an explicit "Leave empty" affordance for the null case.*

**Implementation:**
- `src/state.js` — extend `rootReducer`:
  ```js
  import { CATEGORIES, SPECIES_MAP } from "./features/species/data.js";

  if (action.type === "SET_ACTIVE_SPECIES") {
    const { category, speciesId } = action.payload ?? {};
    if (!CATEGORIES.includes(category)) return state;            // unknown category
    const current = state.species.activeByCategory[category];
    if (current === speciesId) return state;                     // no-op (already active)

    if (speciesId !== null) {
      const sp = SPECIES_MAP[speciesId];
      if (!sp) return state;                                     // unknown species
      if (sp.category !== category) return state;                // cross-category
      if (!state.species.discovered[speciesId]) return state;    // undiscovered
    }

    return { ...state, species: { ...state.species,
      activeByCategory: { ...state.species.activeByCategory, [category]: speciesId } } };
  }
  ```
- The reducer never touches `state.species.discovered`, `researchProgress`, or
  `freeMoves`; it is the single writer for `activeByCategory`.
- The Species panel UI (5.7) dispatches this action on card-tap and on a dedicated
  "Leave empty" button (which dispatches with `speciesId: null`).
- Note: the singleton invariant is *expressed* by the data shape — `activeByCategory`
  is a flat `{ category: id }` map, so there's no way to hold two species in one
  category. The reducer doesn't have to "deactivate" anything; the previous id is
  simply overwritten. Tests assert this property on the read side.

**Manual Verify Walk-through:**
1. Console: `gameState.species.discovered.meadow_grass = true`. Dispatch
   `{ type: "SET_ACTIVE_SPECIES", payload: { category: "grass", speciesId: "meadow_grass" } }`.
   Confirm `gameState.species.activeByCategory.grass === "meadow_grass"`.
2. Dispatch with `speciesId: "spiky_grass"` (still undiscovered). Confirm grass slot
   unchanged.
3. Dispatch with `category: "grass", speciesId: "wheat"`. Confirm grass slot
   unchanged (cross-category guard).
4. Dispatch with `category: "grass", speciesId: null`. Confirm grass slot is `null`.
5. Confirm wood/berry/bird/grain slots never changed across steps 1–4.
6. `runSelfTests()` passes all 5.3 assertions.

---

### 5.4 — Chain-length discovery

**What this delivers:** When the player commits a chain in `commitChain` (after the
inventory has been credited and Phase 4's bonus yields applied), the game checks
*every undiscovered chain-method species* whose `chainLengthOf` matches the resource
that was chained, and discovers each one whose `chainLength` threshold was met. A
"New species: <displayName>" floater rises off the chain endpoint for each new
discovery. Discovery is idempotent — chaining 20 hay a second time after Meadow
Grass is already discovered does not re-fire the floater. Multiple discoveries from
a single chain (e.g. 20 hay discovers both Wheat *and* Meadow Grass simultaneously)
are surfaced as separate floaters in deterministic order (lowest tier first).

**Completion Criteria:**
- [ ] `src/features/species/effects.js` exports
  `discoverSpeciesFromChain(state, { resourceKey, chainLength })`, returning
  `{ discoveredIds, newDiscoveredMap }` (pure)
- [ ] `discoveredIds` is sorted by tier ascending, then by species id alphabetically
  for stable ordering
- [ ] Returns `{ discoveredIds: [], newDiscoveredMap: state.species.discovered }`
  (same reference) when no new discovery fires — no allocation when nothing changes
- [ ] `commitChain` (in `GameScene.js`) calls `discoverSpeciesFromChain` after Phase
  4's bonus-yield apply step, dispatches `{ type: "SPECIES_DISCOVERED", payload: { ids } }`
  if the array is non-empty, and queues one floater per discovered species
- [ ] `SPECIES_DISCOVERED` reducer marks each id as `discovered: true`; safe to call
  with already-discovered ids (idempotent at the reducer level too, defence in depth)
- [ ] Chaining a *different* resource than the prerequisite does NOT discover —
  chaining 20 log does not discover Meadow Grass
- [ ] A 2nd chain at the same threshold after discovery does NOT re-fire the
  floater (state already marked, evaluator returns empty array)
- [ ] Tier-1 chain thresholds use `UPGRADE_THRESHOLDS` from Phase 1 (wheat at 6
  hay, plank at 5 log, jam at 7 berry); Meadow Grass uses the literal §13 number 20
- [ ] Discovery floater uses the `displayName` from `SPECIES_MAP`, not the id

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { initialState, rootReducer } from "./state.js";
import { discoverSpeciesFromChain } from "./features/species/effects.js";
import { UPGRADE_THRESHOLDS } from "./constants.js";

const base = initialState();

// A: 19 hay → no discovery (under both thresholds — wheat=6 hay, meadow_grass=20)
const a = discoverSpeciesFromChain(base,
  { resourceKey: "hay", chainLength: 19 });
// Wait — 19 ≥ UPGRADE_THRESHOLDS.hay (6), so wheat WOULD discover. Use a state
// that has already discovered wheat to isolate meadow_grass behaviour.
const wheatKnown = { ...base, species: { ...base.species,
  discovered: { ...base.species.discovered, wheat: true } } };
const a1 = discoverSpeciesFromChain(wheatKnown,
  { resourceKey: "hay", chainLength: 19 });
assert(a1.discoveredIds.length === 0,
       "19 hay (wheat already known) → no new discovery");
assert(a1.newDiscoveredMap === wheatKnown.species.discovered,
       "no-allocation path: same reference back when nothing changes");

// B: 20 hay → meadow_grass discovered (wheat already known)
const b1 = discoverSpeciesFromChain(wheatKnown,
  { resourceKey: "hay", chainLength: 20 });
assert(b1.discoveredIds.includes("meadow_grass"),
       "20 hay discovers meadow_grass");
assert(b1.discoveredIds.length === 1,
       "only meadow_grass — wheat was already known");

// C: from fresh state, 20 hay → BOTH wheat AND meadow_grass discovered
const c1 = discoverSpeciesFromChain(base,
  { resourceKey: "hay", chainLength: 20 });
assert(c1.discoveredIds.includes("wheat") &&
       c1.discoveredIds.includes("meadow_grass"),
       "fresh state + 20 hay discovers wheat AND meadow_grass");
// Order is tier-ascending: wheat (tier 0 in grain) before meadow_grass (tier 1 in grass)
assert(c1.discoveredIds[0] === "wheat",
       "discovery order: wheat (tier 0) before meadow_grass (tier 1)");

// D: from fresh state, exactly UPGRADE_THRESHOLDS.hay (=6) → wheat only
const d1 = discoverSpeciesFromChain(base,
  { resourceKey: "hay", chainLength: UPGRADE_THRESHOLDS.hay });
assert(d1.discoveredIds.length === 1 && d1.discoveredIds[0] === "wheat",
       "6 hay discovers wheat only — chain didn't reach 20 for meadow_grass");

// E: idempotent — second chain of 20 hay after both known → empty
const afterDiscovery = rootReducer(base,
  { type: "SPECIES_DISCOVERED", payload: { ids: ["wheat","meadow_grass"] } });
const e1 = discoverSpeciesFromChain(afterDiscovery,
  { resourceKey: "hay", chainLength: 20 });
assert(e1.discoveredIds.length === 0,
       "second 20-hay chain does NOT re-fire (already discovered)");

// F: chaining 20 log does NOT discover meadow_grass (wrong prerequisite)
const f1 = discoverSpeciesFromChain(base,
  { resourceKey: "log", chainLength: 20 });
assert(!f1.discoveredIds.includes("meadow_grass"),
       "20 log does NOT discover meadow_grass (wrong prereq)");
// (It does discover plank, since UPGRADE_THRESHOLDS.log is satisfied)
assert(f1.discoveredIds.includes("plank"),
       "20 log discovers plank (chainLengthOf: log)");

// G: tier-1 thresholds match UPGRADE_THRESHOLDS exactly — no UPGRADE_EVERY=3
assert(UPGRADE_THRESHOLDS.berry !== undefined,
       "UPGRADE_THRESHOLDS.berry is defined (not magic 3)");
const g1 = discoverSpeciesFromChain(base,
  { resourceKey: "berry", chainLength: UPGRADE_THRESHOLDS.berry });
assert(g1.discoveredIds.includes("jam"),
       "berry chain at UPGRADE_THRESHOLDS.berry discovers jam");
const g2 = discoverSpeciesFromChain(base,
  { resourceKey: "berry", chainLength: UPGRADE_THRESHOLDS.berry - 1 });
assert(!g2.discoveredIds.includes("jam"),
       "berry chain one short → no jam discovery");

// H: SPECIES_DISCOVERED reducer is idempotent
const h1 = rootReducer(afterDiscovery,
  { type: "SPECIES_DISCOVERED", payload: { ids: ["wheat"] } });
assert(h1.species.discovered.wheat === true,
       "double-discover wheat stays true");
assert(h1 === afterDiscovery || JSON.stringify(h1.species) === JSON.stringify(afterDiscovery.species),
       "idempotent reducer either returns same ref or equivalent state");

// I: purity
const before = JSON.stringify(base);
discoverSpeciesFromChain(base, { resourceKey: "hay", chainLength: 20 });
assert(JSON.stringify(base) === before,
       "discoverSpeciesFromChain does not mutate state");
```
Run — confirm: `Cannot find module './features/species/effects.js'`.

*Gameplay simulation (player session 1, turn 4):*
The player has just chained 6 hay for the first time. As the chain pop animation
finishes, a soft chime plays and a parchment-yellow floater rises off the endpoint
tile: "New species: Wheat". 1.5 seconds later they see the new Species panel button
pulse once in the HUD. They open it: Wheat now sits in the Grain column with a "Tap
to activate" badge. Two sessions later they string together a 22-hay megachain.
*Two* floaters fire — "New species: Wheat" (already known, skipped) doesn't appear,
but "New species: Meadow Grass" does. The floaters are stacked vertically, 200ms
apart, so neither overlaps. The next time they hit a 20-hay chain, *no* floater
fires — discovery is one-time-per-species, locked at the state level.

Designer reflection: *Does the discovery moment land as a reward, or as a
notification? Is the floater enough, or does it need a brief modal "Wheat unlocked
— tap to activate" with the speciess card art? Phase 5 ships the floater-only
version; if playtests show players miss the discovery in 60% of cases, 5.7's
panel-pulse will be promoted to a one-shot modal.*

**Implementation:**
- New file `src/features/species/effects.js`:
  ```js
  import { SPECIES, SPECIES_MAP } from "./data.js";

  export function discoverSpeciesFromChain(state, { resourceKey, chainLength }) {
    const known = state.species?.discovered ?? {};
    const ids = [];
    for (const sp of SPECIES) {
      if (sp.discovery.method !== "chain") continue;
      if (sp.discovery.chainLengthOf !== resourceKey) continue;
      if (chainLength < sp.discovery.chainLength) continue;
      if (known[sp.id]) continue;
      ids.push(sp.id);
    }
    if (ids.length === 0) {
      return { discoveredIds: [], newDiscoveredMap: known };
    }
    // Stable order: tier ascending, then id alphabetical
    ids.sort((a, b) => {
      const sa = SPECIES_MAP[a], sb = SPECIES_MAP[b];
      return (sa.tier - sb.tier) || (a < b ? -1 : a > b ? 1 : 0);
    });
    const newDiscoveredMap = { ...known };
    for (const id of ids) newDiscoveredMap[id] = true;
    return { discoveredIds: ids, newDiscoveredMap };
  }
  ```
- `src/state.js` — add reducer for `SPECIES_DISCOVERED`:
  ```js
  if (action.type === "SPECIES_DISCOVERED") {
    const ids = action.payload?.ids ?? [];
    const known = state.species.discovered;
    let changed = false;
    const next = { ...known };
    for (const id of ids) {
      if (!SPECIES_MAP[id]) continue;
      if (!next[id]) { next[id] = true; changed = true; }
    }
    if (!changed) return state;
    return { ...state, species: { ...state.species, discovered: next } };
  }
  ```
- `src/GameScene.js:commitChain()` — after Phase 4's bonus-yield apply step and
  before the "advance turn" call:
  ```js
  import { discoverSpeciesFromChain } from "./features/species/effects.js";

  const { discoveredIds } = discoverSpeciesFromChain(this._state(),
    { resourceKey: chainResourceKey, chainLength });
  if (discoveredIds.length > 0) {
    this._dispatch({ type: "SPECIES_DISCOVERED", payload: { ids: discoveredIds } });
    discoveredIds.forEach((id, i) => {
      const sp = SPECIES_MAP[id];
      this.time.delayedCall(i * 200, () =>
        this.spawnFloater(`New species: ${sp.displayName}`, endpointX, endpointY,
                          { color: 0xf0d860, sound: "discovery_chime" }));
    });
  }
  ```
- The chain commit loop already knows `chainResourceKey` and `chainLength` — they're
  the inputs to Phase 1's `upgradeCountForChain`. No new tracking is needed.

**Manual Verify Walk-through:**
1. New session. Drag a 6-hay chain. Confirm "New species: Wheat" floater rises;
   confirm `gameState.species.discovered.wheat === true` afterwards.
2. Drag a second 6-hay chain. Confirm NO floater fires (already discovered).
3. Console: rebuild a 20-hay path with the dev tools (`gameState.species.discovered.wheat = false`),
   drag 20 hay. Confirm TWO floaters: Wheat first, Meadow Grass second, 200ms apart.
4. Drag a 20-log chain. Confirm "New species: Plank" fires; confirm Meadow Grass is
   NOT discovered (wrong prerequisite).
5. Drag a 7-berry chain. Confirm "New species: Jam" fires (uses
   `UPGRADE_THRESHOLDS.berry`, not the legacy `UPGRADE_EVERY = 3`).
6. Drag a 6-berry chain on a fresh save. Confirm Jam is NOT discovered (one short).
7. `runSelfTests()` passes all 5.4 assertions.

---
### 5.5 — Research timer (cumulative, global)

**What this delivers:** Some species (Spiky Grass, Grain, Flour, Beam, Turkey) unlock
by **researching** a prerequisite resource — accumulating chain-collected counts of
hay/wheat/grain/plank/egg over time. Every chain commit increments the in-progress
counters by chain length for any undiscovered research target whose `researchOf`
matches the chained resource. The counter is **global**: it survives session resets,
refreshes, and `DEV/RESET_GAME` only resets it via the species slice — never
silently. When the counter crosses `researchAmount`, the species flips to discovered
and a "New species: <name>" floater fires. The species panel (5.8) reads the same
counter to render "Researching grain: 12 / 30".

**Completion Criteria:**
- [ ] `state.species.researchProgress` is an object keyed by species id (e.g.
  `{ grain: 12, flour: 0, spiky_grass: 0, beam: 0, turkey: 0 }`); seeded for every
  species in `SPECIES` whose `discovery.method === "research"`
- [ ] On `CHAIN_COMMIT` with payload `{ key, length }`, every species `s` where
  `s.discovery.method === "research"` AND `s.discovery.researchOf === key` AND
  `!state.species.discovered[s.id]` has its progress incremented by `length`
- [ ] When `researchProgress[id] >= s.discovery.researchAmount`, the reducer sets
  `state.species.discovered[id] = true` AND queues a `bubble` with text
  `"New species: ${s.name}"` for the GameScene floater layer
- [ ] Locked: research progress is **cumulative across sessions** — never zeroed on
  session start, app boot, or save load. The save schema persists
  `state.species.researchProgress` as a non-volatile field
- [ ] Already-discovered species are a strict no-op — `researchProgress[id]` does
  not increment past the threshold (no overflow), and the discovery side-effect
  fires exactly once
- [ ] Chains of an unrelated resource don't touch unrelated counters (a hay chain
  must not move the grain or turkey counter)
- [ ] `DEV/RESET_GAME` zeroes `researchProgress` only as part of resetting the
  whole `state.species` slice — not silently from any other code path

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { SPECIES, SPECIES_MAP } from "./features/species/data.js";

const base = initialState();

// A: research seeded for every research-method species
const researchIds = SPECIES.filter(s => s.discovery?.method === "research").map(s => s.id);
assert(researchIds.includes("grain"),   "grain is research-discoverable");
assert(researchIds.includes("turkey"),  "turkey is research-discoverable");
for (const id of researchIds) {
  assert(typeof base.species.researchProgress[id] === "number",
         `researchProgress.${id} seeded`);
  assert(base.species.researchProgress[id] === 0, `researchProgress.${id} starts at 0`);
}

// B: chain of the prerequisite increments progress
const a1 = rootReducer(base, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 8 } });
assert(a1.species.researchProgress.grain === 8, "8 wheat → grain progress 8");
const a2 = rootReducer(a1, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } });
assert(a2.species.researchProgress.grain === 13, "progress accumulates across chains (8 + 5)");

// C: unrelated chain does not move unrelated counters
const cBefore = a2.species.researchProgress.turkey;
const c1 = rootReducer(a2, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 12 } });
assert(c1.species.researchProgress.turkey === cBefore, "hay chain does not move turkey");
assert(c1.species.researchProgress.grain  === 13,      "hay chain does not move grain");

// D: reaching threshold flips discovered + queues bubble
const wheatThresh = SPECIES_MAP.grain.discovery.researchAmount; // 30 per spec §13
const d0 = { ...base, species: { ...base.species,
  researchProgress: { ...base.species.researchProgress, grain: wheatThresh - 1 } } };
const d1 = rootReducer(d0, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 5 } });
assert(d1.species.discovered.grain === true, "crossing threshold flips discovered");
assert(d1.bubble && /New species: Grain/.test(d1.bubble.text), "discovery floater queued");

// E: already-discovered species is a no-op (no progress drift, no re-fire)
const e1 = rootReducer(d1, { type: "CHAIN_COMMIT", payload: { key: "wheat", length: 9 } });
assert(e1.species.researchProgress.grain === d1.species.researchProgress.grain,
       "discovered species ignores further progress");
assert(!e1.bubble || !/New species: Grain/.test(e1.bubble.text ?? ""),
       "no double-discovery floater");

// F: LOCKED — research is GLOBAL. Save/reload does not zero it.
const saved = JSON.stringify(a2);                 // 13 wheat in
const rehydrated = JSON.parse(saved);
assert(rehydrated.species.researchProgress.grain === 13,
       "save/reload preserves cumulative grain progress");

// G: starting a new "session" (a no-op session_start action) must not reset progress
const g1 = rootReducer(a2, { type: "SESSION_START" });
assert(g1.species.researchProgress.grain === 13, "SESSION_START never zeroes research");
```
Run — confirm: `state.species.researchProgress is undefined` (or — if seeded but
unwired — `species.researchProgress.grain stays at 0 after a wheat chain`).

*Gameplay simulation (returning player on session 4, mid-Act-2):*
The player has been chaining wheat all week. Last session they hit 22 cumulative
wheat-chained; the species panel showed "Researching grain: 22 / 30". They close
the browser, come back two days later, and the panel still reads 22 / 30 — not
zeroed, not "Day 1 of research" reset. They drag a 6-wheat chain on their first
turn back. The counter ticks 22 → 28 with a soft progress-bar fill animation, no
unlock yet. Two turns later they chain 4 more wheat. The bar fills, a "New species:
Grain" floater drifts up over the board, and Grain becomes selectable as the active
grain-category species. The whole arc — start of research, abandonment, return,
unlock — stretches across real calendar days. That's only honest if the counter is
actually global.

Designer reflection: *Does cumulative research feel like patient stewardship of the
vale, or like a grindy XP bar wearing a different hat? Would a player who plays for
20 minutes once a week ever cross a 30-research threshold inside their lifespan as
a player — or do the numbers need to come down?*

**Implementation:**
- `src/state.js:initialState()` — seed the slice. The species slice's `researchProgress`
  field is initialised by walking `SPECIES` and zeroing every research-method id:
  ```js
  import { SPECIES } from "./features/species/data.js";

  function initialResearchProgress() {
    const out = {};
    for (const s of SPECIES) {
      if (s.discovery?.method === "research") out[s.id] = 0;
    }
    return out;
  }
  // inside initialState():
  species: {
    discovered: { /* defaults from 5.1 */ },
    activeByCategory: { /* defaults from 5.1 */ },
    researchProgress: initialResearchProgress(),
  }
  ```
- `src/state.js` — extend the `CHAIN_COMMIT` reducer (or species slice handler):
  ```js
  if (action.type === "CHAIN_COMMIT") {
    const { key, length } = action.payload;
    let progress = state.species.researchProgress;
    let discovered = state.species.discovered;
    let bubble = state.bubble;
    for (const s of SPECIES) {
      if (s.discovery?.method !== "research") continue;
      if (s.discovery.researchOf !== key)      continue;
      if (discovered[s.id])                    continue; // no-op once unlocked
      const cur  = progress[s.id] ?? 0;
      const next = cur + length;
      progress = { ...progress, [s.id]: Math.min(next, s.discovery.researchAmount) };
      if (next >= s.discovery.researchAmount && !discovered[s.id]) {
        discovered = { ...discovered, [s.id]: true };
        bubble = { id: Date.now() + s.id.length, npc: "wren",
                   text: `New species: ${s.name}`, ms: 2200 };
      }
    }
    return { ...state, species: { ...state.species,
      researchProgress: progress, discovered }, bubble };
  }
  ```
- Save schema — `state.species` is already non-volatile (5.1); the existing
  `persistState` walk picks `researchProgress` up automatically. On load, merge
  with `initialResearchProgress()` so older saves get any newly-added research
  species seeded at 0 without losing in-progress counters.
- `src/GameScene.js:commitChain()` — already dispatches `CHAIN_COMMIT`. No change
  needed beyond ensuring the dispatch fires *after* upgrade resolution so `length`
  reflects the full collected chain (consistent with 5.7's free-move trigger).

**Manual Verify Walk-through:**
1. Console: `gameState.species.researchProgress.grain` is 0 on a fresh save.
2. Drag a 5-wheat chain. Confirm `researchProgress.grain === 5`. Drag another
   3-wheat chain. Confirm 8.
3. Refresh the page. Confirm `researchProgress.grain` still reads 8 (cumulative).
4. Drag a 12-hay chain. Confirm `researchProgress.grain` stays at 8 (untouched).
5. Console: `gameState.species.researchProgress.grain = 29`. Drag a 2-wheat chain.
   Confirm a "New species: Grain" floater appears and
   `gameState.species.discovered.grain === true`.
6. Drag another 5-wheat chain. Confirm no second floater fires.
7. `DEV/RESET_GAME` — confirm `researchProgress` resets to all zeros.
8. `runSelfTests()` passes all 5.5 assertions.

---

### 5.6 — Board pool wiring

**What this delivers:** The active species in each category — not the hard-coded
`FARM_TILE_POOL` — controls what tiles spawn on the board. A pure helper
`getActivePool(state)` returns a weighted array matching the Phase 1 base pool when
defaults are active, swaps in the active variant when the player swaps (e.g. wheat
replacing the wheat-position spawns when `activeByCategory.grain = "wheat"` is the
only grain), and removes a category entirely when `activeByCategory[cat] === null`.
Worker `pool_weight` boosts from Phase 4 stack additively *on top of* the active
pool — but **only** when the boosted resource matches the active species in its
category. Setting bird = null and then hiring 2 Pip (berry +2) still gives berry
weight, because berry is in a different category. Setting berry = null kills
berry tiles entirely — Pip's boost can't resurrect them.

**Completion Criteria:**
- [ ] `src/features/species/effects.js` exports `getActivePool(state, biomeKey = "farm")`
- [ ] Returns a flat array of resource keys with multiplicities — same shape as the
  Phase 1 `BIOMES.farm.pool` (`["hay","hay","hay","log","log","wheat","berry","berry","egg"]`)
- [ ] With default `activeByCategory` (every category set to its tier-0 default), the
  returned pool is **exactly** `BIOMES[biomeKey].pool` (same keys, same multiplicities)
- [ ] Setting `activeByCategory.grain = "wheat"` keeps the lone wheat copy from the
  base pool (does not double); setting `activeByCategory.grain = "grain"` (after
  Grain is discovered) replaces every wheat-position copy with `"grain"`
- [ ] Setting `activeByCategory[cat] = null` removes every base-pool copy of any
  resource in that category — that resource cannot spawn at all
- [ ] Worker `effectivePoolWeights` (Phase 4 registry) layered on top: for each
  `[key, n]`, push `Math.round(n)` extra copies — but **only** if `key` matches
  the currently-active species in its category. Mismatch → silently dropped
- [ ] `src/GameScene.js:fillBoard()` calls `getActivePool(this._state(), biomeKey)`
  instead of reading `BIOMES[biomeKey].pool` directly
- [ ] `_syncWorkerEffects()` (Phase 4) calls `_rebuildSpawnPool()` after sync so
  hiring/firing a worker rebuilds the next refill within the same frame

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { getActivePool } from "./features/species/effects.js";
import { SPECIES_MAP } from "./features/species/data.js";
import { BIOMES } from "./constants.js";

const baseDefaults = {
  grass: "hay", grain: "wheat", wood: "log", berry: "berry", bird: "egg",
};
const mkState = (overrides = {}, weights = {}, debt = 0) => ({
  species: {
    activeByCategory: { ...baseDefaults, ...overrides },
    discovered: { hay:true, wheat:true, log:true, berry:true, egg:true,
                  grain:true, plank:true, jam:true, turkey:true,
                  meadow_grass:true, beam:true, spiky_grass:true, flour:true },
    researchProgress: {},
  },
  workers: { hired: {}, debt },
  registry: { effectivePoolWeights: weights },
});

// A: defaults reproduce Phase 1 base pool exactly
const r0 = getActivePool(mkState(), "farm");
assert(r0.join(",") === BIOMES.farm.pool.join(","),
       "default activeByCategory → identical to BIOMES.farm.pool");

// B: swap wheat for grain in the grain category
const r1 = getActivePool(mkState({ grain: "grain" }), "farm");
assert(r1.filter(k => k === "wheat").length === 0, "no wheat tiles when grain active");
assert(r1.filter(k => k === "grain").length === 1, "1 grain copy in the wheat slot");

// C: setting a category to null removes that category's resource
const r2 = getActivePool(mkState({ bird: null }), "farm");
assert(r2.filter(k => k === "egg").length === 0, "bird=null removes egg tiles");
assert(r2.filter(k => k === "hay").length === 3, "other categories untouched");

// D: worker pool_weight stacks ONLY when key is the active species
//    Pip = berry +2, berry IS the active berry-category species → adds 2
const r3 = getActivePool(mkState({}, { berry: 2 }), "farm");
assert(r3.filter(k => k === "berry").length === 4, "base 2 + Pip 2 = 4 berries");

// E: LOCKED — Pip's berry +2 does NOT add berry tiles when berry is not active
const r4 = getActivePool(mkState({ berry: null }, { berry: 2 }), "farm");
assert(r4.filter(k => k === "berry").length === 0,
       "berry=null + Pip berry+2 → 0 berry tiles (worker boost is gated by active species)");

// F: synthetic worker boost on a different-category resource (turkey) only counts
//    if turkey is the active bird species
const r5a = getActivePool(mkState({ bird: "egg" }, { turkey: 3 }), "farm");
assert(r5a.filter(k => k === "turkey").length === 0,
       "turkey weight ignored when egg is the active bird");
const r5b = getActivePool(mkState({ bird: "turkey" }, { turkey: 3 }), "farm");
assert(r5b.filter(k => k === "turkey").length === 4,
       "turkey weight applied when turkey is the active bird (1 base + 3 boost)");

// G: purity
const before = JSON.stringify(mkState());
getActivePool(mkState(), "farm");
assert(JSON.stringify(mkState()) === before, "getActivePool does not mutate");
```
Run — confirm: `Cannot find module './features/species/effects.js'` or
`getActivePool is not a function`.

*Gameplay simulation (player on session 6, just unlocked Grain):*
The player walks into the species panel and toggles Grain on. The next chain
commit triggers a board refill. They watch six tiles drop in: where wheat used to
sometimes appear, grain now appears instead — same frequency, different colour.
Hilda's threshold is still hay 6 → 3, but the wheat → grain upgrade chain has
moved one tier up the tree without changing the *amount* of grain-category tiles.
The player then turns Pip's berry boost back on by hiring 2 Pip; berry weight on
the board jumps from 2 to 4 visibly within one season. Then they experiment:
they toggle berry → null in the panel. The next refill has zero berry tiles —
Pip's boost evaporated, because the boost is keyed to the active species, not the
worker contract.

Designer reflection: *Does the player understand that swapping species reshapes
the board on the next refill (not retroactively)? Is the "pool weight is gated by
active species" rule clear enough that players don't blame Pip when they've
turned berry off?*

**Implementation:**
- New file `src/features/species/effects.js`:
  ```js
  import { SPECIES_MAP, CATEGORY_OF } from "./data.js";
  import { BIOMES } from "../../constants.js";

  // Returns the active species id for the category that contains `key`, or null.
  function activeIdForKey(state, key) {
    const cat = CATEGORY_OF[key];
    if (!cat) return null;
    return state?.species?.activeByCategory?.[cat] ?? null;
  }

  export function getActivePool(state, biomeKey = "farm") {
    const base   = BIOMES[biomeKey]?.pool ?? [];
    const active = state?.species?.activeByCategory ?? {};
    const out    = [];

    for (const baseKey of base) {
      const cat = CATEGORY_OF[baseKey];
      if (!cat) { out.push(baseKey); continue; }
      const a = active[cat];
      if (a === null || a === undefined) continue; // category disabled
      out.push(a);                                  // substitute active variant
    }

    // Worker pool_weight boost — only when key matches the active species.
    const boosts = state?.registry?.effectivePoolWeights ?? {};
    for (const [k, n] of Object.entries(boosts)) {
      if (activeIdForKey(state, k) !== k) continue; // gated by active species
      const copies = Math.max(0, Math.round(n));
      for (let i = 0; i < copies; i++) out.push(k);
    }
    return out;
  }
  ```
- `src/features/species/data.js` — export `CATEGORY_OF` map (id → category) so
  the effects module can resolve a resource key to its species category in O(1).
- `src/GameScene.js:fillBoard()`:
  ```js
  import { getActivePool } from "./features/species/effects.js";
  // ...
  const pool = getActivePool(this._state(), this.currentBiome);
  if (pool.length === 0) {
    // degenerate — every category disabled. Fall back to base pool to avoid empty board.
    pool.push(...BIOMES[this.currentBiome].pool);
  }
  // existing weighted pick logic
  ```
- `src/GameScene.js:_syncWorkerEffects()` — already runs on hire/fire/season-end;
  add a single `this._rebuildSpawnPool()` call at the tail. The pool is rebuilt
  lazily on next `fillBoard()`; explicit call only matters for the inspector HUD.

**Manual Verify Walk-through:**
1. Console: `getActivePool(gameState, "farm").join(",")` matches
   `"hay,hay,hay,log,log,wheat,berry,berry,egg"` exactly.
2. Force-discover and activate grain:
   `gameState.species.discovered.grain = true; gameState.species.activeByCategory.grain = "grain"`.
   Re-run `getActivePool` — confirm `wheat` count is 0, `grain` count is 1.
3. Set `gameState.species.activeByCategory.bird = null`. Re-run. Confirm `egg`
   count is 0.
4. Hire 2 Pip. After `_syncWorkerEffects` runs, `getActivePool` should show 4 berry copies.
5. Set `activeByCategory.berry = null`. Re-run. Confirm 0 berry copies even with
   Pip still hired (locked rule).
6. Trigger a season-end. Confirm next board refill reflects the new pool visibly.
7. `runSelfTests()` passes all 5.6 assertions.

---

### 5.7 — Free moves per season

**What this delivers:** Three Farm species (Turkey +2, Clover +2, Melon +5)
grant **free moves** when they are *chained* — not when they are merely active in
their category. Free moves accumulate in `state.species.freeMoves`; the next
chain commit consumes one before incrementing `turnsUsed`. The counter is per-season:
`CLOSE_SEASON` zeroes it. The locked rule — *the trigger is chaining, not
having active* — is what gives turkey its weight as a tactical pick: a player who
toggles turkey on and then chains nothing but hay all season gets zero benefit.

**Completion Criteria:**
- [ ] `state.species.freeMoves` initialised to `0` in `initialState()`
- [ ] On `CHAIN_COMMIT` with `{ key, length }`, the reducer looks up the species
  whose id matches `key` (NOT the species active in `key`'s category — `key` IS the
  chained id, since the active substitution in 5.6 means the spawned tile carries
  the active species' id) and increments `freeMoves` by `species.effects.freeMoves`
  (default 0). Increment is **once per chain**, NOT once per tile in the chain
- [ ] Increment fires AFTER the chain is collected (so 5.5's research and 5.7's
  free-move both see the same final chain length and key)
- [ ] On `END_TURN` (or wherever `turnsUsed` is incremented), if `freeMoves > 0`,
  decrement `freeMoves` by 1 and skip the `turnsUsed` increment (the chain spent a
  free move instead of a real turn)
- [ ] `CLOSE_SEASON` resets `freeMoves` to 0 (locked: per-season, no carry-over)
- [ ] **LOCKED:** Toggling a species active without chaining it leaves
  `freeMoves` at 0. The species' `effects.freeMoves` field is read on the
  *chained* resource only — never on `activeByCategory[cat]`
- [ ] HUD shows a `"+N"` chip beside the season-turn counter when `freeMoves > 0`,
  with tooltip "Free moves from chained species — next move is free"

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { SPECIES_MAP } from "./features/species/data.js";

const base = initialState();

// A: chaining turkey grants +2, ONCE per chain (not per tile)
const a0 = { ...base,
  species: { ...base.species,
    discovered: { ...base.species.discovered, turkey: true },
    activeByCategory: { ...base.species.activeByCategory, bird: "turkey" } } };
const a1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "turkey", length: 3 } });
assert(a1.species.freeMoves === 2, "3 turkey tiles → +2 freeMoves (once per chain, not 3×2)");

// B: a second turkey chain stacks
const b1 = rootReducer(a1, { type: "CHAIN_COMMIT", payload: { key: "turkey", length: 5 } });
assert(b1.species.freeMoves === 4, "second turkey chain stacks (+2)");

// C: chaining a non-free-move species does NOT increment
const c1 = rootReducer(a0, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 12 } });
assert(c1.species.freeMoves === 0, "hay chain grants no free moves");

// D: LOCKED — activating turkey without chaining it = 0 free moves
//    The trigger is chaining the species, not having it active.
const d0 = { ...base,
  species: { ...base.species,
    discovered: { ...base.species.discovered, turkey: true },
    activeByCategory: { ...base.species.activeByCategory, bird: "turkey" } } };
//    ...but the player only chains hay all session.
let d = d0;
for (let i = 0; i < 5; i++) {
  d = rootReducer(d, { type: "CHAIN_COMMIT", payload: { key: "hay", length: 6 } });
}
assert(d.species.freeMoves === 0,
       "LOCKED: turkey active but never chained → freeMoves stays at 0");

// E: END_TURN consumes a free move before incrementing turnsUsed
const e0 = { ...base, turnsUsed: 0,
  species: { ...base.species, freeMoves: 2 } };
const e1 = rootReducer(e0, { type: "END_TURN" });
assert(e1.species.freeMoves === 1,  "free move consumed");
assert(e1.turnsUsed     === 0,      "turnsUsed unchanged when free move spent");

// F: with no free moves, END_TURN increments turnsUsed normally
const f0 = { ...base, turnsUsed: 3,
  species: { ...base.species, freeMoves: 0 } };
const f1 = rootReducer(f0, { type: "END_TURN" });
assert(f1.species.freeMoves === 0, "freeMoves stays at 0");
assert(f1.turnsUsed     === 4,     "turnsUsed increments when no free move");

// G: CLOSE_SEASON resets to 0
const g0 = { ...base, species: { ...base.species, freeMoves: 4 } };
const g1 = rootReducer(g0, { type: "CLOSE_SEASON" });
assert(g1.species.freeMoves === 0, "season close zeroes free moves");

// H: clover (+2) and melon (+5) have the right per-spec values
assert(SPECIES_MAP.clover.effects.freeMoves === 2, "clover grants +2");
assert(SPECIES_MAP.melon.effects.freeMoves  === 5, "melon grants +5");
```
Run — confirm: `state.species.freeMoves is undefined` or `END_TURN does not
consume free moves`.

*Gameplay simulation (player on session 8, has bought Melon):*
The player paid 200 coins to skip Melon's research and made it the active bird
species. Their first chain on the new board is 4 melon tiles in a row — the bird
slot now drops melons. The chain commits: the floater shows "+5 free moves" and
the HUD's turn counter sprouts a gold "+5" chip. Over the next 5 chains, the
turn counter doesn't tick down — they're spending free moves. On chain 6 the
chip is gone and turnsUsed ticks 0 → 1. They effectively played a 15-turn season
on a 10-turn budget. Then they swap back to egg (default) for the next season.
The +5 chip is gone, freeMoves is 0, and the season plays at normal pace.

Designer reflection: *Does the gold +N chip read as "good thing pending" or as
just decoration? When the player swaps the active bird species mid-season, do
they understand that the new species' freeMoves only land if they chain it —
not from the moment they toggle it? Watch a tester make a turkey chain and check
their face when the chip appears: surprise, or nod?*

**Implementation:**
- `src/state.js:initialState()` — add `freeMoves: 0` to the species slice.
- `src/state.js` species slice handler — extend `CHAIN_COMMIT`:
  ```js
  // After research-progress block from 5.5:
  const chainedSpec = SPECIES_MAP[action.payload.key];
  const grant = chainedSpec?.effects?.freeMoves ?? 0;
  if (grant > 0) {
    nextSpecies = { ...nextSpecies, freeMoves: (nextSpecies.freeMoves ?? 0) + grant };
  }
  ```
- `src/state.js` — extend `END_TURN`:
  ```js
  if (action.type === "END_TURN") {
    const fm = state.species.freeMoves ?? 0;
    if (fm > 0) {
      return { ...state,
        species: { ...state.species, freeMoves: fm - 1 } };
      // turnsUsed NOT incremented
    }
    return { ...state, turnsUsed: (state.turnsUsed ?? 0) + 1 };
  }
  ```
- `src/state.js` — `CLOSE_SEASON` zeroes `state.species.freeMoves` alongside the
  Phase 4 wage step.
- `src/GameScene.js` — render the `+N` chip beside the season turn counter when
  `state.species.freeMoves > 0`. Tween in 200ms ease-out on increment.
- `src/ui.jsx` — also surface the chip in the React HUD (mirrors the canvas chip
  for screen-reader / a11y purposes).

**Manual Verify Walk-through:**
1. Console: `gameState.species.freeMoves` is 0 on a fresh save.
2. Force-discover turkey, set `activeByCategory.bird = "turkey"`. Confirm
   `freeMoves` is still 0 (locked: active ≠ chained).
3. Drag a 3-turkey chain. Confirm `freeMoves === 2` and the gold "+2" chip appears.
4. Drag a 5-turkey chain. Confirm `freeMoves === 4`.
5. End the next 4 turns by chaining hay (no free-move species). Confirm
   `turnsUsed` does NOT advance until `freeMoves` is exhausted.
6. After `freeMoves === 0`, drag a hay chain → confirm `turnsUsed` ticks normally.
7. Force a `CLOSE_SEASON` with `freeMoves === 4`. Confirm it resets to 0.
8. `runSelfTests()` passes all 5.7 assertions.

---

### 5.8 — Species panel UI

**What this delivers:** A tab under the bottom-nav opens the Species panel: 5 tabs
(grass / grain / wood / berry / bird), each rendering all species in that category
— discovered AND undiscovered — as scrollable rows. Each row carries a portrait,
a name, a status line that reads differently depending on discovery state, and
either an Active toggle (if discovered) or an unlock action (if locked behind a
buy-only species). The status line is the player-facing surface for 5.5's research
counter and the 5.1 unlock tree — "Researching grain: 12 / 30" lives here. A pure
`getCategoryViewModel(state, category)` keeps the rendering logic out of JSX so
it can be tested in `runSelfTests()`.

**Completion Criteria:**
- [ ] Bottom-nav has a "Species" entry that toggles `ui.panel = "species"`
- [ ] Panel shows 5 category tabs in fixed order: Grass · Grain · Wood · Berry · Bird
- [ ] `src/features/species/effects.js` exports
  `getCategoryViewModel(state, category)` returning an array of rows
- [ ] Each row has shape `{ id, name, active, locked, status, action }` where
  `action` is one of `"toggle"`, `"buy"`, or `null`
- [ ] Status line strings (LOCKED — exact substrings, used in tests):
  - tier-0 default: `"Default — always available"`
  - discovered chain-method: `"Discovered — chain N <prereq> to find"` (past-tense
    hint preserved for the scrapbook feel)
  - in-progress research: `"Researching <prereq>: P / N"`
  - locked chain-method: `"Locked — chain N <prereq> to discover"`
  - locked buy-only: `"Buy <cost>◉"` and `action: "buy"`
- [ ] Tapping the Active toggle on a discovered, unlocked row dispatches
  `SET_ACTIVE_SPECIES` with `{ category, id }`; the previous active is replaced
- [ ] Locked rows have `active: false` regardless of any dispatch attempt — the
  reducer rejects `SET_ACTIVE_SPECIES` if `!discovered[id]`
- [ ] "Buy" rows dispatch `BUY_SPECIES` which deducts coins, marks discovered,
  and *does not* auto-activate (the player chooses when to swap)
- [ ] Panel re-renders within 1 frame of any species state change

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { rootReducer, initialState } from "./state.js";
import { getCategoryViewModel } from "./features/species/effects.js";

const base = initialState();

// A: defaults — fresh save shows hay as default-active, others locked
const grassRows = getCategoryViewModel(base, "grass");
const hayRow         = grassRows.find(r => r.id === "hay");
const meadowRow      = grassRows.find(r => r.id === "meadow_grass");
const spikyRow       = grassRows.find(r => r.id === "spiky_grass");
assert(hayRow.active === true,                              "hay is active");
assert(hayRow.locked === false,                             "hay is unlocked");
assert(hayRow.status === "Default — always available",     "hay status string");
assert(meadowRow.active === false && meadowRow.locked === true, "meadow locked");
assert(meadowRow.status === "Locked — chain 20 hay to discover",
       "meadow chain-locked status");
assert(spikyRow.status === "Researching hay: 0 / 50",
       "spiky in-progress research line, even at 0");

// B: chain-discovered species shows a discovered status line
const b0 = { ...base, species: { ...base.species,
  discovered: { ...base.species.discovered, meadow_grass: true } } };
const bRows = getCategoryViewModel(b0, "grass");
const meadowB = bRows.find(r => r.id === "meadow_grass");
assert(meadowB.locked === false,                          "meadow unlocked");
assert(meadowB.active === false,                          "but not yet active");
assert(/Discovered — chain 20 hay/.test(meadowB.status),  "discovered status uses chain hint");

// C: in-progress research surfaces the live counter
const c0 = { ...base, species: { ...base.species,
  researchProgress: { ...base.species.researchProgress, grain: 12 } } };
const grainRows = getCategoryViewModel(c0, "grain");
const grainRow  = grainRows.find(r => r.id === "grain");
assert(grainRow.status === "Researching wheat: 12 / 30",
       "live research counter string");

// D: dispatch from panel toggles active
const d0 = { ...base, species: { ...base.species,
  discovered: { ...base.species.discovered, meadow_grass: true } } };
const d1 = rootReducer(d0,
  { type: "SET_ACTIVE_SPECIES", payload: { category: "grass", id: "meadow_grass" } });
assert(d1.species.activeByCategory.grass === "meadow_grass", "active swapped");

// E: LOCKED — dispatch on a locked species is a no-op (same ref)
const e1 = rootReducer(base,
  { type: "SET_ACTIVE_SPECIES", payload: { category: "grass", id: "meadow_grass" } });
assert(e1 === base, "SET_ACTIVE_SPECIES on locked species is a strict no-op");

// F: buy-only row exposes action: "buy" and does NOT auto-activate
const fRows = getCategoryViewModel(base, "bird");
const cloverRow = fRows.find(r => r.id === "clover");
assert(cloverRow.action === "buy",                "clover row is a buy action");
assert(cloverRow.status === "Buy 200◉",          "clover buy status");
const f0 = { ...base, coins: 500 };
const f1 = rootReducer(f0, { type: "BUY_SPECIES", payload: { id: "clover" } });
assert(f1.species.discovered.clover === true,        "buy unlocks clover");
assert(f1.species.activeByCategory.bird !== "clover", "buy does not auto-activate");
assert(f1.coins === 300,                              "200◉ deducted");
```
Run — confirm: `getCategoryViewModel is not exported from './features/species/effects.js'`.

*Gameplay simulation (player on session 7, opening the Species panel for the first time):*
The player taps the Species nav button. The panel slides up. Five tabs run across
the top; Grass is selected by default. They see:
- Hay — portrait, "Default — always available", green Active dot lit
- Meadow Grass — silhouette portrait, "Locked — chain 20 hay to discover", greyed
- Spiky Grass — silhouette portrait, "Researching hay: 47 / 50", a thin progress bar
They flip to the Bird tab. Egg is active. Turkey shows "Researching egg: 18 / 20".
Clover shows a portrait with a coin icon and a "Buy 200◉" button. They go back to
hay-grinding. Two chains later, Spiky Grass tips over 50 — a "New species: Spiky
Grass" floater fires (5.5 wiring), and when they reopen the panel, Spiky Grass'
silhouette has resolved into its portrait and "Researching hay: 47 / 50" has
become "Discovered — chain hay to find" with an Active toggle. The panel feels like
a scrapbook filling in.

Designer reflection: *Does the panel feel like a discovery scrapbook the player
wants to fill in, or a checklist the game makes them grind? Watch a tester open
the panel for the first time — do they read the locked rows with curiosity
(silhouettes, hints), or skip them?*

**Implementation:**
- `src/features/species/effects.js` — append:
  ```js
  import { SPECIES, SPECIES_MAP } from "./data.js";

  function statusFor(state, s) {
    const disc = state.species.discovered[s.id];
    const d    = s.discovery ?? {};
    if (s.tier === 0 || d.method === "default") return "Default — always available";
    if (disc && d.method === "chain")
      return `Discovered — chain ${d.chainAmount} ${d.chainOf} to find`;
    if (disc && d.method === "research")
      return `Discovered — research ${d.researchOf}`;
    if (disc && d.method === "buy")    return "Discovered — purchased";
    if (d.method === "research") {
      const p = state.species.researchProgress[s.id] ?? 0;
      return `Researching ${d.researchOf}: ${p} / ${d.researchAmount}`;
    }
    if (d.method === "chain") return `Locked — chain ${d.chainAmount} ${d.chainOf} to discover`;
    if (d.method === "buy")   return `Buy ${d.cost}◉`;
    return "Locked";
  }

  export function getCategoryViewModel(state, category) {
    return SPECIES.filter(s => s.category === category).map(s => {
      const locked = !state.species.discovered[s.id];
      const active = !locked && state.species.activeByCategory[category] === s.id;
      const action = locked
        ? (s.discovery?.method === "buy" ? "buy" : null)
        : "toggle";
      return { id: s.id, name: s.name, active, locked,
               status: statusFor(state, s), action };
    });
  }
  ```
- `src/state.js` — `SET_ACTIVE_SPECIES` reducer rejects locked ids:
  ```js
  if (action.type === "SET_ACTIVE_SPECIES") {
    const { category, id } = action.payload;
    if (id !== null && !state.species.discovered[id]) return state; // locked → no-op
    return { ...state, species: { ...state.species,
      activeByCategory: { ...state.species.activeByCategory, [category]: id } } };
  }
  ```
- `src/state.js` — `BUY_SPECIES` deducts coins, sets `discovered[id] = true`,
  leaves `activeByCategory` alone.
- `src/ui.jsx` — `SpeciesPanel` reads `getCategoryViewModel(state, activeTab)` and
  renders rows. Active toggle dispatches `SET_ACTIVE_SPECIES`; buy button
  dispatches `BUY_SPECIES`. Locked rows render the silhouette portrait variant
  and a thin progress bar where research is in flight.

**Manual Verify Walk-through:**
1. Open the Species panel from the bottom nav. Confirm 5 tabs, Grass selected.
2. Hay row shows Active dot and "Default — always available".
3. Meadow Grass row reads "Locked — chain 20 hay to discover" with a greyed
   silhouette.
4. Console: `gameState.species.researchProgress.grain = 12`. Reopen the Grain tab.
   Grain row reads "Researching wheat: 12 / 30".
5. Force-discover Meadow Grass. Tap its Active toggle. Confirm `activeByCategory.grass`
   becomes `"meadow_grass"` and the Hay row's Active dot dims.
6. Switch to the Bird tab. Tap "Buy 200◉" on Clover with 500 coins on the wallet.
   Confirm coins drop to 300, Clover unlocks, and Clover is NOT auto-active —
   Egg is still the active bird.
7. `runSelfTests()` passes all 5.8 assertions.

---

## Phase 5 Sign-off Gate

Play 3 multi-session playthroughs from a fresh save covering: a chain-only run
(unlock species exclusively via chain milestones, never via research or buy),
a research-grind run (let cumulative research carry across at least 2 real-world
days), and a buy-everything run (use coins to skip research on Clover and Melon).
Before moving to Phase 6, confirm all:

- [ ] 5.1–5.8 Completion Criteria all checked
- [ ] **First chain of 20 hay shows the "New species: Meadow Grass" discovery
  floater within 200ms of chain commit** — this is the Phase 5 horizontal-slice
  property; if it's silent, the phase is not done
- [ ] After winning Phase 2's Harvest Festival, swapping species categories in
  the panel still reshapes the board on the next refill (sandbox mode does not
  freeze the species system)
- [ ] **LOCKED: Activating turkey but never chaining it leaves the session at
  0 free moves end-to-end** — the +N HUD chip never appears, `state.species.freeMoves`
  stays at 0 through `CLOSE_SEASON`
- [ ] **Research progress for grain survives a refresh and continues across real
  sessions** — close the tab at 12 / 30, reopen, confirm the panel still shows
  12 / 30 (not 0 / 30, not "Locked")
- [ ] **Worker `pool_weight: berry +2` (2 Pip hired) only adds tiles when berry
  is the active species in its category** — set `activeByCategory.berry = null`,
  confirm the spawn pool drops to 0 berry tiles within one refill
- [ ] Setting `activeByCategory[cat] = null` on every category falls back to the
  base biome pool (no empty board) and surfaces a console warning, not a crash
- [ ] Save/reload preserves: `discovered` flags, `activeByCategory` choices,
  `researchProgress` counters, and `freeMoves` (mid-season pause-and-resume case)
- [ ] `DEV/RESET_GAME` zeroes the entire species slice — no stale research
  bleeding into a fresh run
- [ ] `runSelfTests()` passes for all Phase 5 tests
- [ ] Designer gut-check: *Does the species panel feel like a discovery
  scrapbook the player wants to fill in, or a checklist the game makes them grind?*
