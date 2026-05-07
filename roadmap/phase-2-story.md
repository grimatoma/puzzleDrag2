# Phase 2 — Story System & Win Condition

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** The game has a beginning, middle, and end. The first
session opens with Wren narrating the player's arrival at the abandoned vale and asking
for 20 hay to light the Hearth. Each major milestone is a story beat with a modal —
not a silent flag flip. The Harvest Festival in Act 3 is the win state. After winning,
the game continues in sandbox mode.

**Why now:** Phase 1 made the chain mechanic feel good. Without a story, that mechanic
is unanchored — the player has no reason to keep playing past session 2. Story beats
give every Phase 3+ system (market, workers, species) a narrative reason to exist.

**Entry check:** [Phase 1 Sign-off Gate](./phase-1-chain-mechanic.md#phase-1-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 2.1 — Story state slice

**What this delivers:** A single source of truth for story progression. `storyAct`
(1–3), `storyBeat` (string id of the current open beat), and `storyFlags` (object of
booleans). Persisted to `localStorage`. All other story tasks read from this slice.

**Completion Criteria:**
- [ ] `src/story.js` module exists, exports `INITIAL_STORY_STATE`, `STORY_BEATS` array,
  and pure helpers `isBeatComplete(state, beatId)` and `nextPendingBeat(state)`
- [ ] Story state lives at `gameState.story = { act, beat, flags }`
- [ ] State is persisted via existing `localStorage` save path (added to save schema)
- [ ] `DEV/RESET_GAME` clears story state back to `INITIAL_STORY_STATE`
- [ ] All beats in `STORY_BEATS` have `{ id, act, title, body, trigger, onComplete }`
  matching the GAME_SPEC §15 arc

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { INITIAL_STORY_STATE, STORY_BEATS, isBeatComplete, nextPendingBeat } from "./story.js";

assert(INITIAL_STORY_STATE.act === 1, "story starts at act 1");
assert(INITIAL_STORY_STATE.beat === "act1_arrival", "first beat is arrival");
assert(Object.keys(INITIAL_STORY_STATE.flags).length === 0, "no flags set initially");

// Beat list shape
assert(STORY_BEATS.length >= 9, "at least 9 beats across 3 acts");
assert(STORY_BEATS.every(b => b.id && b.act && b.title && b.body && b.trigger),
       "every beat has required fields");
assert(STORY_BEATS.filter(b => b.act === 1).length >= 3, "act 1 has ≥3 beats");
assert(STORY_BEATS.filter(b => b.act === 3).length >= 3, "act 3 has ≥3 beats");

// Helpers
const s = { ...INITIAL_STORY_STATE, flags: { hearth_lit: true } };
assert(isBeatComplete(s, "act1_light_hearth") === true, "completed beat detected");
assert(nextPendingBeat(s).id !== "act1_light_hearth", "next pending skips completed");
```
Run — confirm: `Cannot find module './story.js'`.

*Gameplay simulation (new player, first 60 seconds):*
The new player opens the game for the first time. They expect to be told *who they
are* and *what they're doing here* within 10 seconds. They should not see a generic
"Match 3+ tiles" tutorial — they should see Wren say "The Hearth is cold. Bring me 20
hay and I'll light it." Story state must be ready to drive that opening modal before
any tile is rendered.

Designer reflection: *Does the player understand within 30 seconds why they're
collecting hay specifically, and not just farming for points?*

**Implementation:**
- New file `src/story.js`:
  ```js
  export const INITIAL_STORY_STATE = {
    act: 1,
    beat: "act1_arrival",
    flags: {},
  };

  export const STORY_BEATS = [
    // Act 1
    { id: "act1_arrival",       act: 1, title: "A Cold Hearth",
      body: "Wren: 'The vale was abandoned years ago. Bring me 20 hay — we'll light the Hearth.'",
      trigger: { type: "session_start" }, onComplete: { setFlag: "intro_seen" } },
    { id: "act1_light_hearth",  act: 1, title: "First Light",
      body: "Wren: 'The Hearth is alive again. Mira will be here soon.'",
      trigger: { type: "resource_total", key: "hay", amount: 20 },
      onComplete: { setFlag: "hearth_lit", spawnNPC: "mira" } },
    { id: "act1_first_bread",   act: 1, title: "Bread for the Vale",
      body: "Mira: 'Bake a loaf with me — I'll show you the oven.'",
      trigger: { type: "craft_made", item: "bread", count: 1 },
      onComplete: { setFlag: "first_craft", spawnNPC: "tomas" } },
    { id: "act1_build_mill",    act: 1, title: "The Mill Stands",
      body: "Tomas: 'A mill! Now we won't starve come winter.'",
      trigger: { type: "building_built", id: "mill" },
      onComplete: { setFlag: "mill_built", advanceAct: 2 } },
    // Act 2
    { id: "act2_bram_arrives",  act: 2, title: "The Smith",
      body: "Bram: 'I need a forge. The vale needs iron.'",
      trigger: { type: "act_entered", act: 2 }, onComplete: { spawnNPC: "bram" } },
    { id: "act2_first_hinge",   act: 2, title: "Iron in the Vale",
      body: "Bram: 'A hinge! Small thing — but it begins.'",
      trigger: { type: "craft_made", item: "iron_hinge", count: 1 },
      onComplete: { setFlag: "first_iron" } },
    { id: "act2_frostmaw",      act: 2, title: "Frostmaw Wakes",
      body: "Bram: 'The cold is a creature. Gather 30 logs this season or we burn the rafters.'",
      trigger: { type: "season_entered", season: "winter" },
      onComplete: { setFlag: "frostmaw_active", spawnBoss: "frostmaw" } },
    { id: "act2_liss_arrives",  act: 2, title: "The Healer",
      body: "Sister Liss: 'A child has fever. I need berries.'",
      trigger: { type: "boss_defeated", id: "frostmaw" },
      onComplete: { spawnNPC: "liss", advanceAct: 3 } },
    // Act 3
    { id: "act3_mine_found",    act: 3, title: "The Mine",
      body: "Wren: 'I found a sealed mine. Stone and coal will open it.'",
      trigger: { type: "act_entered", act: 3 },
      onComplete: { setFlag: "mine_revealed" } },
    { id: "act3_mine_opened",   act: 3, title: "Into the Dark",
      body: "Wren: 'The seal is broken. The mine is yours.'",
      trigger: { type: "resource_total_multi", req: { stone: 20, coal: 10 } },
      onComplete: { setFlag: "mine_unlocked", unlockBiome: "mine" } },
    { id: "act3_caravan",       act: 3, title: "The Caravan Post",
      body: "Tomas: 'Far traders are coming. The vale is on the map again.'",
      trigger: { type: "building_built", id: "caravan_post" },
      onComplete: { setFlag: "caravan_open" } },
    { id: "act3_festival",      act: 3, title: "The Harvest Festival",
      body: "Mira: 'Fill the larder — 50 each of hay, wheat, grain, berry, log. The vale will feast.'",
      trigger: { type: "all_buildings_built" },
      onComplete: { setFlag: "festival_announced" } },
    { id: "act3_win",           act: 3, title: "The Vale Lives",
      body: "The festival larder is full. Hearthwood Vale lives again. (Sandbox mode continues.)",
      trigger: { type: "resource_total_multi",
                 req: { hay: 50, wheat: 50, grain: 50, berry: 50, log: 50 } },
      onComplete: { setFlag: "isWon" } },
  ];

  export function isBeatComplete(state, beatId) {
    const beat = STORY_BEATS.find(b => b.id === beatId);
    if (!beat) return false;
    const flagKey = beat.onComplete?.setFlag;
    return flagKey ? !!state.flags[flagKey] : false;
  }

  export function nextPendingBeat(state) {
    return STORY_BEATS.find(b => b.act <= state.act && !isBeatComplete(state, b.id));
  }
  ```
- `src/GameScene.js` — add `gameState.story = { ...INITIAL_STORY_STATE }` in `createInitialState()`.
- Save/load: extend the save schema to include `story`. On load, merge with
  `INITIAL_STORY_STATE` so older saves keep the rest of their state.
- `DEV/RESET_GAME` handler — reset `gameState.story` to a fresh clone of `INITIAL_STORY_STATE`.

**Manual Verify Walk-through:**
1. Open browser console. `window.gameState.story` shows `{act:1, beat:"act1_arrival", flags:{}}`.
2. Set `gameState.story.flags.hearth_lit = true`. Save (refresh page). Confirm flag persists.
3. Run `DEV/RESET_GAME`. Confirm story state resets to act 1, no flags.
4. `runSelfTests()` passes all 2.1 assertions.

---

### 2.2 — Story trigger evaluator

**What this delivers:** A single function that runs after every game event and fires
the next pending beat if its trigger condition is met. The game emits events
(`resource_total`, `craft_made`, `building_built`, `season_entered`, `boss_defeated`,
`act_entered`, `session_start`, `all_buildings_built`); the evaluator matches them.

**Completion Criteria:**
- [ ] `evaluateStoryTriggers(state, event)` exported from `src/story.js`
- [ ] Returns `{ firedBeat, newFlags, sideEffects }` or `null` if nothing fires
- [ ] All 8 trigger `type` values from §2.1 are handled
- [ ] Pure function — does not mutate `state`
- [ ] `GameScene` calls `evaluateStoryTriggers` in: `commitChain()`, `bake()`, `build()`,
  `advanceTurn()`, `defeatBoss()`, `init()` (once with `session_start`)
- [ ] Beats fire in order — never skip a pending beat even if a later trigger is met first

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { INITIAL_STORY_STATE, evaluateStoryTriggers } from "./story.js";

// Wrong event → nothing fires
let r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "craft_made", item: "bread" });
assert(r === null, "non-matching event returns null");

// session_start fires the arrival beat
r = evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
assert(r && r.firedBeat.id === "act1_arrival", "session_start fires arrival");
assert(r.newFlags.intro_seen === true, "arrival sets intro_seen");

// resource_total fires the hearth beat after arrival
const afterArrival = { ...INITIAL_STORY_STATE,
  flags: { intro_seen: true }, beat: "act1_light_hearth" };
r = evaluateStoryTriggers(afterArrival, { type: "resource_total", key: "hay", amount: 20 });
assert(r && r.firedBeat.id === "act1_light_hearth", "20 hay fires hearth beat");
assert(r.sideEffects.spawnNPC === "mira", "spawns mira");

// Below threshold does NOT fire
r = evaluateStoryTriggers(afterArrival, { type: "resource_total", key: "hay", amount: 19 });
assert(r === null, "19 hay does not fire");

// Out-of-order: a later beat's trigger fires before earlier beat → ignored
const stillEarly = { ...INITIAL_STORY_STATE, beat: "act1_light_hearth" };
r = evaluateStoryTriggers(stillEarly, { type: "building_built", id: "mill" });
assert(r === null, "later beat does not fire while earlier beat pending");

// Purity
const before = JSON.stringify(INITIAL_STORY_STATE);
evaluateStoryTriggers(INITIAL_STORY_STATE, { type: "session_start" });
assert(JSON.stringify(INITIAL_STORY_STATE) === before, "evaluator does not mutate state");
```
Run — confirm: `evaluateStoryTriggers is not exported from './story.js'`.

*Gameplay simulation (player session 1, turns 1–6):*
Player opens game. Modal: "A Cold Hearth — Wren: bring me 20 hay." They start chaining.
At turn 4, hay total reaches 22. The next chain commit should fire the `act1_light_hearth`
beat — Wren returns, modal opens, Mira spawns. Player must NOT see the bread beat fire
even though they happen to bake bread immediately after — the bread trigger is only
relevant after Mira arrives.

Designer reflection: *Does each beat feel like a reward for an action the player just
took? Does the order of beats match the order of natural play (don't ask for a forge
before the player has any iron)?*

**Implementation:**
- Append to `src/story.js`:
  ```js
  function triggerMatches(beat, event, state, totals) {
    const t = beat.trigger;
    if (t.type !== event.type && !(t.type === "act_entered" && event.type === "act_entered")) {
      return false;
    }
    switch (t.type) {
      case "session_start":     return true;
      case "act_entered":       return event.act === t.act;
      case "season_entered":    return event.season === t.season;
      case "resource_total":    return (totals[t.key] ?? 0) >= t.amount;
      case "resource_total_multi":
        return Object.entries(t.req).every(([k, v]) => (totals[k] ?? 0) >= v);
      case "craft_made":        return event.item === t.item && event.count >= (t.count ?? 1);
      case "building_built":    return event.id === t.id;
      case "boss_defeated":     return event.id === t.id;
      case "all_buildings_built": return event.allBuilt === true;
      default: return false;
    }
  }

  export function evaluateStoryTriggers(state, event, totals = {}) {
    const next = nextPendingBeat(state);
    if (!next) return null;
    if (!triggerMatches(next, event, state, totals)) return null;
    const newFlags = { ...state.flags };
    if (next.onComplete?.setFlag) newFlags[next.onComplete.setFlag] = true;
    return { firedBeat: next, newFlags, sideEffects: next.onComplete ?? {} };
  }
  ```
- `src/GameScene.js` event-emit points (each one calls `evaluateStoryTriggers` and, if
  non-null, calls `applyBeatResult(result)` which sets flags, spawns NPC/boss, advances
  act, and queues the modal for 2.3):
  - `init()` → emit `{ type: "session_start" }` if `!flags.intro_seen`
  - `collectPath()` → after inventory updated, emit `{ type: "resource_total", key, amount }`
    for each resource changed; also emit `resource_total_multi` with the full inventory snapshot
  - `bake()` → emit `{ type: "craft_made", item, count }`
  - `build()` → emit `{ type: "building_built", id }`, then if every id in
    `STORY_BUILDING_IDS` (imported from `src/features/story/data.js` —
    `["hearth","mill","bakery","inn","granary","larder","forge","caravan_post"]`)
    is in `state.builtBuildings`, also emit
    `{ type: "all_buildings_built", allBuilt: true }`. The other 5 §11 buildings
    (`kitchen`, `housing`, `powder_store`, `portal`, `workshop`) are NOT required.
  - `advanceTurn()` → on season change, emit `{ type: "season_entered", season }`
  - `defeatBoss()` → emit `{ type: "boss_defeated", id }`
  - `applyBeatResult` with `advanceAct: N` → emit `{ type: "act_entered", act: N }` recursively

**Manual Verify Walk-through:**
1. New session. Console: `gameState.story.flags.intro_seen` is true after init.
2. Play to 20 total hay. Confirm `act1_light_hearth` fires (flag set, Mira added to NPC list).
3. Save inventory `gameState.inventory.hay = 100` via console — confirm only the
   *next* pending beat fires, not all beats whose triggers are now met.
4. Build mill before hearth lit (force via console). Confirm beat does NOT fire.
5. `runSelfTests()` passes all 2.2 assertions.

---

### 2.3 — Story modal UI

**What this delivers:** When a beat fires, a modal opens with the beat title, body
text, the speaking NPC's portrait, and a single "Continue" button. The game pauses
input behind the modal. Modal art uses the existing portrait textures.

**Completion Criteria:**
- [ ] `showStoryModal(beat)` method on `GameScene` queues a modal
- [ ] If a modal is already open, new beats queue and open in order on dismiss
- [ ] Modal blocks tile drag, tool use, and turn advance until dismissed
- [ ] ESC and Continue button both dismiss
- [ ] Modal width 480px, centered, semi-transparent black backdrop covering the canvas
- [ ] First-line speaker name parsed from beat body (e.g. `"Wren: ..."` → portrait = wren)
- [ ] Modals open within 200ms of the triggering event (no jarring delay)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
// Headless logic only — DOM/Phaser objects mocked
const queue = [];
const scene = { _modalQueue: queue, _modalOpen: false,
                showStoryModal(b) { queue.push(b); if (!this._modalOpen) this._modalOpen = true; } };

scene.showStoryModal({ id: "a", title: "A", body: "Wren: hi" });
assert(scene._modalOpen === true, "first modal opens immediately");
assert(queue.length === 1, "first modal queued");

scene.showStoryModal({ id: "b", title: "B", body: "Mira: hi" });
assert(queue.length === 2, "second modal queued behind first");

// Speaker parser
import { parseSpeaker } from "./story.js";
assert(parseSpeaker("Wren: bring me hay") === "wren", "parses Wren");
assert(parseSpeaker("Sister Liss: a child is sick") === "liss", "parses Sister Liss");
assert(parseSpeaker("The festival larder is full.") === null, "no speaker → null");
```
Run — confirm: `parseSpeaker is not exported from './story.js'`.

*Gameplay simulation (player on turn 4 of session 1):*
Player drags a chain of 8 hay; total reaches 22. As the floater animation finishes,
the modal opens within ~200ms with Wren's portrait on the left and "First Light —
Wren: 'The Hearth is alive again. Mira will be here soon.'" The player taps Continue,
the modal closes, and they see Mira's portrait now in the NPC strip. The game does
not advance the turn while the modal is open.

Designer reflection: *Does the modal feel like a story beat or like a popup ad? Is
the portrait large enough to recognize? Is the body text readable in 5 seconds?*

**Implementation:**
- Append to `src/story.js`:
  ```js
  const SPEAKER_MAP = {
    "Wren": "wren", "Mira": "mira", "Old Tomas": "tomas", "Tomas": "tomas",
    "Bram": "bram", "Sister Liss": "liss", "Liss": "liss",
  };
  export function parseSpeaker(body) {
    const m = body.match(/^([A-Z][a-zA-Z ]+?):/);
    return m ? (SPEAKER_MAP[m[1]] ?? null) : null;
  }
  ```
- `src/GameScene.js`:
  - Fields: `this._modalQueue = []`, `this._modalOpen = false`, `this._modalContainer = null`.
  - `showStoryModal(beat)` — push to queue; if `!_modalOpen`, call `_renderModal()`.
  - `_renderModal()` — pull next beat off queue. Build a Phaser container at scene depth
    9999: full-screen rect (`0x000000`, alpha 0.6), 480×320 panel (`0x1f1610`), title text
    (24px gold), body text (16px cream, word-wrapped 420px), portrait sprite (96×96) on
    left, "Continue" button (gold pill) bottom-right. Set `_modalOpen = true`.
  - `_dismissModal()` — destroy container, set `_modalOpen = false`, if queue non-empty
    call `_renderModal()` again.
  - Input gating: in `dragStart`, `useTool`, `endTurn`, etc., early-return if `_modalOpen`.
  - Keyboard: `this.input.keyboard.on("keydown-ESC", () => this._modalOpen && this._dismissModal())`.

**Manual Verify Walk-through:**
1. New session. Modal opens within ~1s of game ready: "A Cold Hearth — Wren: bring me 20 hay."
2. Try to drag a tile while modal open — drag does nothing.
3. Dismiss with ESC. Modal closes. Drag now works.
4. Force two beats simultaneously via console (`evaluateStoryTriggers` twice → push both).
   Confirm modals open one at a time — second opens after dismissing first.
5. Trigger `act1_light_hearth` by chaining hay. Confirm Mira's portrait shows (not Wren's).
6. `runSelfTests()` passes all 2.3 assertions.

---

### 2.4 — NPC arrival from story beats

**What this delivers:** The `spawnNPC` side effect from a beat actually adds the NPC
to the active roster. They get an order slot, a portrait in the NPC strip, and start
giving orders next season. Mira, Tomas, Bram, and Liss arrive via story beats; Wren
is present from session start.

**Completion Criteria:**
- [ ] Roster starts with `["wren"]` only — Mira/Tomas/Bram/Liss are NOT pre-spawned
- [ ] `applyBeatResult({spawnNPC: "mira"})` adds `"mira"` to roster
- [ ] Adding an NPC to roster gives them an order slot at next `assignOrders()` call
- [ ] An NPC already in roster is not duplicated if the beat fires twice (defensive)
- [ ] NPC strip in HUD updates to show new portraits within 1 frame
- [ ] If max active orders (3) is already filled, new NPC waits until a slot opens

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
// Roster shape after fresh init
const fresh = createInitialState();
assert(fresh.npcs.roster.length === 1, "roster starts with 1 NPC");
assert(fresh.npcs.roster[0] === "wren", "wren is the starting NPC");

// applyBeatResult adds NPC
const s1 = applyBeatResult(fresh, { spawnNPC: "mira" });
assert(s1.npcs.roster.includes("mira"), "mira added");
assert(s1.npcs.roster.length === 2, "roster has 2");

// Idempotent
const s2 = applyBeatResult(s1, { spawnNPC: "mira" });
assert(s2.npcs.roster.length === 2, "duplicate spawn ignored");

// Order assignment respects 3-slot cap
const s3 = { ...fresh, npcs: { roster: ["wren","mira","tomas","bram"], orders: [
  {npc:"wren"},{npc:"mira"},{npc:"tomas"}] } };
const s4 = assignOrders(s3);
assert(s4.npcs.orders.length === 3, "still 3 orders");
assert(!s4.npcs.orders.find(o => o.npc === "bram"), "bram waits — no slot open");
```
Run — confirm: `applyBeatResult is not defined` or roster starts with all 5 NPCs.

*Gameplay simulation (session 1 → 2):*
Session 1: Player sees only Wren in the NPC strip. No order slots show portraits of
other NPCs. After hitting 20 hay, Mira appears with a fanfare and her portrait slides
into the strip. Her first order shows up at the start of next season. The player
should *feel* the village growing — not see all 5 portraits greyed out from minute one.

Designer reflection: *Does the village feel like it's being built, or does it feel
like NPCs were always here and just got "unlocked"?*

**Implementation:**
- `src/GameScene.js:createInitialState()`:
  ```js
  npcs: { roster: ["wren"], orders: [], bonds: { wren: 5 } },
  ```
- `applyBeatResult(state, sideEffects)` (new method on scene, or pure helper):
  - If `sideEffects.spawnNPC` and not in roster: push to roster, set bond to 5.
  - If `sideEffects.advanceAct`: set `state.story.act` and recursively emit `act_entered` event.
  - If `sideEffects.unlockBiome`: set `state.unlockedBiomes[id] = true`.
  - If `sideEffects.spawnBoss`: set `state.boss = { id, season: currentSeason, progress: 0 }`.
  - If `sideEffects.setFlag`: set the flag (idempotent).
- `assignOrders()` — iterate roster, fill slots up to 3, skip NPCs already holding a slot.
- HUD redraw — `redrawNpcStrip()` reads `roster` and renders portraits in roster order.
- NPC arrival animation: portrait slides in from right, 300ms ease-out, with a soft
  chime sfx (use existing `playPing()` if no chime asset).

**Manual Verify Walk-through:**
1. New session. NPC strip shows only Wren.
2. Reach 20 hay. Modal fires. Dismiss. Mira's portrait slides in from the right.
3. Advance one season. Mira's first order appears in the orders panel.
4. Console: `applyBeatResult(gameState, {spawnNPC: "mira"})` again — confirm no duplicate.
5. Force-spawn a 4th NPC while 3 orders are active. Confirm new NPC's portrait shows
   but no order yet. Fulfil one order. Next assignment, new NPC gets the freed slot.
6. `runSelfTests()` passes all 2.4 assertions.

---

### 2.5 — Harvest Festival win condition

**What this delivers:** The `act3_win` beat fires when the player has collected 50
each of hay, wheat, grain, berry, and log *after* the festival was announced. A win
modal plays a brief celebration sequence, sets `isWon: true`, and the game continues
in sandbox mode (no progression locked, no further story beats).

**Completion Criteria:**
- [ ] Win beat only checks resources after `flags.festival_announced === true`
- [ ] Win modal is visually distinct (gold border, larger panel 600×400, slow fade-in
  over 800ms, ambient particles)
- [ ] On dismiss: `flags.isWon = true`, sandbox banner appears at top of HUD ("Sandbox Mode")
- [ ] After winning, no further story beats fire (all are completed)
- [ ] Save file persists `isWon` — reloading the won game keeps the banner
- [ ] Larder progress widget visible in HUD once festival announced (5 progress bars)
- [ ] `STORY_BUILDING_IDS` exported from `src/features/story/data.js` with exactly
  these 8 IDs: `["hearth","mill","bakery","inn","granary","larder","forge","caravan_post"]`

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { evaluateStoryTriggers, INITIAL_STORY_STATE } from "./story.js";

// Pre-announcement: even with 50/50/50/50/50, win does NOT fire
const preAnnounce = { ...INITIAL_STORY_STATE, act: 3, beat: "act3_win", flags: {
  intro_seen: true, hearth_lit: true, first_craft: true, mill_built: true,
  first_iron: true, frostmaw_active: true, mine_revealed: true,
  mine_unlocked: true, caravan_open: true,
  /* festival_announced: false */
} };
const totals = { hay:50, wheat:50, grain:50, berry:50, log:50 };
let r = evaluateStoryTriggers(preAnnounce,
  { type: "resource_total_multi" }, totals);
assert(r === null, "win does not fire before festival announced");

// Post-announcement: same totals → win fires
const postAnnounce = { ...preAnnounce, flags: { ...preAnnounce.flags, festival_announced: true } };
r = evaluateStoryTriggers(postAnnounce,
  { type: "resource_total_multi" }, totals);
assert(r && r.firedBeat.id === "act3_win", "win fires");
assert(r.newFlags.isWon === true, "isWon set");

// 49 of one resource → no win
const short = { ...totals, log: 49 };
r = evaluateStoryTriggers(postAnnounce,
  { type: "resource_total_multi" }, short);
assert(r === null, "49 log does not win");
```
Run — confirm: tests fail because the gating check on `festival_announced` is missing.

*Gameplay simulation (player nearing the end, ~level 12):*
Player has all 8 *story-required* buildings built — `hearth` (pre-built), `mill`,
`bakery`, `inn`, `granary`, `larder`, `forge`, `caravan_post` — out of the 13 §11
buildings (the remaining 5 — `kitchen`, `housing`, `powder_store`, `portal`,
`workshop` — are unlocked via Phases 3, 4, 8, 10 and NOT required for the festival
trigger). Festival modal fires: "Mira: Fill the larder — 50
each of hay, wheat, grain, berry, log." A 5-bar progress widget appears in the HUD.
Each chain that adds to a larder resource pulses the matching bar. When the last bar
fills, a slow gold fade washes the screen, particles drift, and the win modal opens.
"The Vale Lives." Dismissed → sandbox banner; the game still plays normally, orders
still come, but no new beats fire.

Designer reflection: *Does winning feel earned (the festival was announced ~3 sessions
ago, the bars filled gradually) or like a cliff edge? Does sandbox feel like reward
or like an empty room with the lights off?*

**Implementation:**
- `evaluateStoryTriggers` — for the `act3_win` beat specifically, additionally require
  `state.flags.festival_announced === true` before matching. (Already gated by
  `nextPendingBeat` ordering, but defensive double-check in the trigger handler.)
- `src/GameScene.js`:
  - Larder widget: `_renderLarderHud()` called when `flags.festival_announced`. 5 horizontal
    bars, each labeled with resource icon + `current/50`. Update on inventory change.
  - Win modal: extend `_renderModal()` to detect `beat.id === "act3_win"` and render
    gold-bordered 600×400 panel with particle emitter (Phaser `add.particles`) and
    800ms fade-in tween.
  - Sandbox banner: top of HUD, gold text "Sandbox Mode", visible if `flags.isWon`.
  - Save schema already includes `story` (from 2.1); `isWon` is just a flag.

**Manual Verify Walk-through:**
1. Console: set up state to be 1 hay short of win with festival announced.
   Chain that last hay. Confirm win modal opens with gold border + particles.
2. Confirm `gameState.story.flags.isWon === true` after dismiss.
3. Confirm sandbox banner shows at top of HUD.
4. Refresh the page. Confirm save persists `isWon` and banner still shows.
5. Continue playing — confirm orders still assign, market still works, no new modals.
6. Console: clear `festival_announced`, set inventory to 60 of each. Confirm win does
   NOT fire (gate works in reverse).
7. `runSelfTests()` passes all 2.5 assertions.

---

## Phase 2 Sign-off Gate

Play 3 full playthroughs from a fresh save to win condition (use console acceleration
to skip grind, but follow real beat order). Before moving to Phase 3, confirm all:

- [ ] 2.1–2.5 Completion Criteria all checked
- [ ] First-time player sees the arrival modal within 2 seconds of game ready
- [ ] All 13 beats fire in order in a real playthrough — none skipped, none out of order
- [ ] Each beat that spawns an NPC actually shows that NPC's arrival animation
- [ ] Frostmaw beat fires only when winter starts in act 2 — not act 1's winter
- [ ] Win modal feels celebratory, not abrupt; sandbox banner is clear
- [ ] Save/reload at every act boundary preserves story state correctly
- [ ] `runSelfTests()` passes for all Phase 2 tests
- [ ] Designer gut-check: *After session 1, does the player know who Wren and Mira are
  and why the Hearth matters? After winning, do they feel the vale grew under their care?*
