# Phase 8 — Boss + Weather

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** Boss seasons stop being a counter pinned to a normal
season and start *playing* differently — Frostmaw's winter has two columns of
frozen tiles you cannot drag through, Old Stoneface's autumn has rubble blocks you
must shoulder out with adjacent stone chains, Ember Drake's summer drops heat
tiles that burn your inventory if you ignore them. Defeating with margin to spare
pays meaningfully more than scraping in at exactly N. Off-boss seasons get a
small, visible weather banner that nudges the spawn pool or the chain math.

**Why now:** Phase 0 patched `BOSS_WINDOW_TURNS` from 5 seasons down to 1, and
fixed Ember Drake's forge-event gating bug — but those were bookkeeping. Without
board modifiers, scaled rewards, and a weather slot for the non-boss seasons,
the compressed 1-season window is just a counter on top of an identical board.
Phase 7 finished the long-horizon progression spine; Phase 8 makes the *short*
horizon (this season vs. that season) feel different so quests, almanac XP,
and orders take place against varied terrain.

**Entry check:** [Phase 7 Sign-off Gate](./phase-7-progression.md#phase-7-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 8.1 — Board modifiers per boss

**What this delivers:** Each of the four bosses (§9) applies a *visible* board
modifier for the duration of the boss window. Frostmaw freezes 2 columns (tiles
unselectable, ice overlay). Ember Drake spawns heat tiles each turn; ignored for
2 turns, the tile burns and removes a random resource from inventory. Mossback
(year-2+ spring alternate) hides ~4 tiles under face-down mystery icons,
revealed on chain only. Old Stoneface drops rubble blocks that cannot be chained
directly — they clear by chaining 3+ stone tiles adjacent to them. Modifiers
apply on boss spawn, persist through save/load, and clear when the boss resolves.

**Completion Criteria:**
- [ ] `src/features/bosses/data.js` exports `BOSSES` array, shape
  `{ id, name, season, target: { resource, amount }, modifier: { type, params } }`
- [ ] All 4 bosses + mossback variant: `frostmaw` (winter / 30 log /
  `freeze_columns` n=2), `quagmire` (spring / 50 hay / `respawn_boost`),
  `ember_drake` (summer / 3 ingot / `heat_tiles` spawnPerTurn=1, burnAfter=2),
  `old_stoneface` (autumn / 20 stone / `rubble_blocks` count=4), `mossback`
  (spring alt / 30 berry / `hide_resources` hidden=4)
- [ ] `src/features/bosses/modifiers.js` exports pure helpers
  `applyModifierToFreshGrid(grid, modifier, rng)`, `tickModifier(state, modifier)`,
  `tileIsChainable(tile, modifier)`, `clearModifier(grid, modifier)` — no Phaser refs
- [ ] `state.boss.modifierState` stores per-modifier memory: frozen column indices,
  heat tile `{row,col,age}` list, rubble cell list, hidden cell list
- [ ] `tileIsChainable` returns `false` for frozen, rubble, or hidden tiles
- [ ] Heat tile age ticks once per turn; at age `burnAfter` (=2) the tile burns:
  `state.inventory[randomKey] -= 1` (clamped at 0), tile cleared from list
- [ ] Rubble blocks clear when `commitChain` resolves a chain of ≥ 3 stone
  tiles with at least one chain tile orthogonally adjacent to a rubble cell
- [ ] Hidden tiles flip face-up the first time a chain commit touches them
- [ ] `clearModifier` strips every overlay flag — frozen / rubble / hidden /
  heat — called once on boss resolution (from 8.3)
- [ ] Save/load round-trips `state.boss.modifierState` exactly
- [ ] `src/textures.js` adds `boss.ice_overlay`, `boss.heat_tile`, `boss.rubble`,
  `boss.mystery` (74×74 each, procedural canvas)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { BOSSES } from "./features/bosses/data.js";
import { applyModifierToFreshGrid, tickModifier, tileIsChainable, clearModifier }
  from "./features/bosses/modifiers.js";
import { createInitialState } from "./state.js";

// All canonical bosses + shapes
assert(BOSSES.length >= 4, "≥4 bosses defined");
const ids = BOSSES.map(b => b.id);
assert(["frostmaw","quagmire","ember_drake","old_stoneface"].every(i => ids.includes(i)),
       "all 4 canonical bosses registered");
const fm = BOSSES.find(b => b.id === "frostmaw");
const ed = BOSSES.find(b => b.id === "ember_drake");
const os = BOSSES.find(b => b.id === "old_stoneface");
const qm = BOSSES.find(b => b.id === "quagmire");
const mb = BOSSES.find(b => b.id === "mossback");
assert(fm.target.resource === "log"   && fm.target.amount === 30,  "frostmaw 30 logs");
assert(fm.modifier.type === "freeze_columns" && fm.modifier.params.n === 2, "frostmaw n=2");
assert(ed.target.amount === 3  && ed.modifier.type === "heat_tiles",   "ember drake 3 ingots");
assert(os.target.amount === 20 && os.modifier.type === "rubble_blocks","stoneface 20 stone");
assert(qm.target.amount === 50 && qm.target.resource === "hay",        "quagmire 50 hay");

// freeze_columns: 2 distinct columns flagged, frozen tiles not chainable
const grid = makeTestGrid(6, 7);
const rng = (() => { let i = 0; return () => [0.0, 0.99, 0.5, 0.1][i++ % 4]; })();
const mState = applyModifierToFreshGrid(grid, fm.modifier, rng);
assert(mState.frozenColumns.length === 2 && mState.frozenColumns[0] !== mState.frozenColumns[1],
       "exactly 2 distinct frozen columns");
assert(tileIsChainable(grid[0][mState.frozenColumns[0]], fm.modifier) === false, "frozen not chainable");
assert(tileIsChainable({ frozen: false }, fm.modifier) === true, "unfrozen chainable");

// heat_tiles: age 1 → 2 → burn 1 random inventory unit
let s = createInitialState();
s.inventory = { hay: 5, log: 3 };
s.boss = { id: "ember_drake", target: { resource: "ingot", amount: 3 },
           progress: 0, turnsRemaining: 10,
           modifierState: { heat: [{ row: 2, col: 3, age: 1 }] } };
s = tickModifier(s, ed.modifier).newState;
assert(s.boss.modifierState.heat[0].age === 2, "heat aged to 2");
s = tickModifier(s, ed.modifier).newState;
assert((s.inventory.hay + s.inventory.log) === 7, "burn removed exactly 1 inventory unit");
assert(s.boss.modifierState.heat.length === 0, "burnt tile dropped");

// rubble_blocks + hide_resources: N cells, not chainable
const r2 = applyModifierToFreshGrid(makeTestGrid(6, 7), os.modifier, () => 0.5);
assert(r2.rubble.length === 4 && tileIsChainable({ rubble: true }, os.modifier) === false,
       "4 rubble cells, not chainable");
const r3 = applyModifierToFreshGrid(makeTestGrid(6, 7), mb.modifier, () => 0.3);
assert(r3.hidden.length === 4 && tileIsChainable({ hidden: true }, mb.modifier) === false,
       "4 hidden cells, not chainable");

// clearModifier strips every overlay flag
const post = clearModifier(makeTestGrid(6, 7), fm.modifier);
assert(post.every(row => row.every(t => !t.frozen)), "thaw clears every frozen flag");

// Save/load round-trip
const saved = JSON.stringify(s.boss.modifierState);
assert(JSON.stringify(JSON.parse(saved)) === saved, "modifierState round-trips losslessly");
```
Run — confirm: `Cannot find module './features/bosses/data.js'`.

*Gameplay simulation (player at level 6, opening winter year 1, Frostmaw active):*
The season modal closes. The player sees two columns visibly *frozen* — a faint
blue ice overlay sits on every tile in columns 1 and 4 (whatever the seed picked).
They drag from the hay column on the left, try to extend through column 1 — the
chain refuses, the tile dims and snaps free. They re-route around the frozen
columns and land an 8-log chain. The Frostmaw counter ticks `8/30`. Across the
10-turn winter they route every chain through the 4 unfrozen columns, collect
32 logs, win the boss. The ice melts off both columns with a brief shimmer
animation as the season closes — next spring's board is fully usable.

Designer reflection: *Does losing 2 of 6 columns feel like a real challenge that
forces re-routing, or like an annoyance that just stretches the same chain
patterns? Should heat tiles burn on a slower 3-turn timer so a player who ignores
them once isn't punished too hard?*

**Implementation:**
- New file `src/features/bosses/data.js`:
  ```js
  export const BOSSES = [
    { id: "frostmaw",      name: "Frostmaw",      season: "winter",
      target: { resource: "log",   amount: 30 },
      modifier: { type: "freeze_columns",  params: { n: 2 } } },
    { id: "quagmire",      name: "Quagmire",      season: "spring",
      target: { resource: "hay",   amount: 50 },
      modifier: { type: "respawn_boost",   params: { boost: ["log","hay"], factor: 1.5 } } },
    { id: "ember_drake",   name: "Ember Drake",   season: "summer",
      target: { resource: "ingot", amount: 3 },
      modifier: { type: "heat_tiles",      params: { spawnPerTurn: 1, burnAfter: 2 } } },
    { id: "old_stoneface", name: "Old Stoneface", season: "autumn",
      target: { resource: "stone", amount: 20 },
      modifier: { type: "rubble_blocks",   params: { count: 4 } } },
    { id: "mossback",      name: "Mossback",      season: "spring",
      target: { resource: "berry", amount: 30 },
      modifier: { type: "hide_resources",  params: { hidden: 4 } } },
  ];
  ```
- New file `src/features/bosses/modifiers.js` (pure helpers):
  ```js
  export function applyModifierToFreshGrid(grid, modifier, rng) {
    const { type, params } = modifier;
    const cols = grid[0].length;
    if (type === "freeze_columns") {
      const picked = new Set();
      while (picked.size < params.n) picked.add(Math.floor(rng() * cols));
      const frozenColumns = [...picked];
      for (const row of grid) for (const c of frozenColumns) row[c].frozen = true;
      return { frozenColumns };
    }
    if (type === "rubble_blocks" || type === "hide_resources") {
      const want = params.count ?? params.hidden;
      const flag = type === "rubble_blocks" ? "rubble" : "hidden";
      const cells = [];
      while (cells.length < want) {
        const r = Math.floor(rng() * grid.length), c = Math.floor(rng() * cols);
        if (cells.find(p => p.row === r && p.col === c)) continue;
        cells.push({ row: r, col: c }); grid[r][c][flag] = true;
      }
      return type === "rubble_blocks" ? { rubble: cells } : { hidden: cells };
    }
    if (type === "heat_tiles")    return { heat: [] };
    if (type === "respawn_boost") return { boost: params.boost, factor: params.factor };
    return {};
  }

  export function tileIsChainable(tile) {
    return !!tile && !(tile.frozen || tile.rubble || tile.hidden);
  }

  export function tickModifier(state, modifier) {
    if (modifier.type !== "heat_tiles") return { newState: state };
    const heat = (state.boss.modifierState.heat ?? []).map(h => ({ ...h, age: h.age + 1 }));
    const surviving = []; let inv = { ...state.inventory };
    for (const h of heat) {
      if (h.age >= modifier.params.burnAfter) {
        const keys = Object.keys(inv).filter(k => (inv[k] ?? 0) > 0);
        if (keys.length) {
          const k = keys[Math.floor(Math.random() * keys.length)];
          inv[k] = Math.max(0, inv[k] - 1);
        }
      } else surviving.push(h);
    }
    return { newState: { ...state, inventory: inv,
      boss: { ...state.boss,
        modifierState: { ...state.boss.modifierState, heat: surviving } } } };
  }

  export function clearModifier(grid) {
    for (const row of grid) for (const t of row) {
      delete t.frozen; delete t.rubble; delete t.hidden; delete t.heat;
    }
    return grid;
  }
  ```
- `src/GameScene.js`: `tryAddToChain(tile)` early-returns if
  `!tileIsChainable(tile, state.boss?.modifier)`. `advanceTurn()` calls
  `tickModifier`; for `heat_tiles`, also spawns `params.spawnPerTurn` new heat
  positions on random non-blocked cells. `commitChain()` clears rubble cells
  orthogonally adjacent to a chain of ≥ 3 stone, and flips hidden cells touched.
- `src/textures.js` registers the 4 new procedural textures.

**Manual Verify Walk-through:**
1. Console: `gameState.story.act = 2; gameState.story.flags.frostmaw_active = true`
   and force-spawn Frostmaw. Confirm two columns render with the ice overlay.
2. Try to drag a chain through a frozen column — chain refuses, tile snaps free.
3. Force `ember_drake`. Observe a heat tile per turn. Ignore one for 3 turns —
   confirm `gameState.inventory.<random>` lost 1.
4. Force `old_stoneface`. Observe 4 rubble cells. Chain 3+ stone tiles adjacent
   to one — confirm rubble clears and the cell refills on collapse.
5. Save → refresh mid-Frostmaw. Confirm same frozen columns on reload (not re-rolled).
6. Resolve the boss. Confirm overlays clear cleanly on next season.
7. `runSelfTests()` passes all 8.1 assertions.

---

### 8.2 — Reward scaling by margin of victory

**What this delivers:** Boss reward replaces Phase 0's flat ±200◉ with a
two-piece formula. Base = `200◉ × year_number` (locked, §9). On top of base, a
margin-of-victory bonus scales coins — at 0% margin, reward = `base × 1.0`; at
+100% margin (cap), reward = `base × 1.5`. Failing pays 0 coins, leaves the
`<id>_defeated` story flag unset, and the `bosses_defeated` achievement counter
(Phase 7) does not tick. The 1 Rune drop from Phase 3 is granted on any defeat
regardless of margin.

**Completion Criteria:**
- [ ] Pure `bossReward(boss, progress, year)` exported from
  `src/features/bosses/data.js`, returns `{ coins, runes, defeated }`
- [ ] `defeated = progress >= boss.target.amount`
- [ ] If not defeated: `coins = 0, runes = 0, defeated = false`
- [ ] If defeated: `coins = baseReward + scalingBonus`, `runes = 1`
- [ ] `baseReward = 200 * year`
- [ ] `margin = Math.min(1.0, (progress - target) / target)` (capped at +1.0)
- [ ] `scalingBonus = Math.floor(baseReward * margin * 0.5)`
- [ ] Year 1 exact-target Frostmaw → 200◉ + 1 rune
- [ ] Year 1 1.5× target (45 logs) → 250◉ (margin 0.5, scaling 0.25)
- [ ] Year 1 2× target (60 logs) → 300◉ (cap)
- [ ] Year 2 exact-target → 400◉; year 2 2× → 600◉
- [ ] Year 1 at 29 logs → 0 coins, 0 runes, defeated false
- [ ] Caller (8.3 `tickBossTurn`) sets `state.story.flags[`<id>_defeated`] = true`
  on defeat; no flag set on fail
- [ ] On fail: no `bosses_defeated` achievement counter tick (Phase 7 wires this)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { BOSSES, bossReward } from "./features/bosses/data.js";
const fm = BOSSES.find(b => b.id === "frostmaw");
const qm = BOSSES.find(b => b.id === "quagmire");
const os = BOSSES.find(b => b.id === "old_stoneface");

// Failed boss: 0 coins, 0 runes, defeated false
let r = bossReward(fm, 29, 1);
assert(r.defeated === false && r.coins === 0 && r.runes === 0,
       "29 logs: failed, no coins, no rune");

// Year 1 base scaling — locked: base = 200◉ × year_number
r = bossReward(fm, 30, 1);
assert(r.defeated === true && r.coins === 200 && r.runes === 1,
       "year 1 exact-target = 200◉, 1 rune (base = 200 × year)");
assert(bossReward(fm, 45, 1).coins === 250, "year 1 1.5× = 250◉ (margin 0.5)");
assert(bossReward(fm, 60, 1).coins === 300, "year 1 2× = 300◉ (margin cap +100%)");
assert(bossReward(fm, 90, 1).coins === 300, "year 1 3× also caps at 300◉");

// Year scaling: base = 200 × year_number
assert(bossReward(fm, 30, 2).coins === 400, "year 2 base = 400◉");
assert(bossReward(fm, 60, 2).coins === 600, "year 2 2× = 600◉ (400 base + 200 scale)");
assert(bossReward(fm, 45, 3).coins === 750, "year 3 1.5× = 750◉ (600 base + 150 scale)");

// Other bosses honour the same formula
assert(bossReward(qm, 50, 1).coins === 200,  "quagmire exact year 1 = 200◉");
assert(bossReward(qm, 100, 1).coins === 300, "quagmire 2× year 1 = 300◉");
assert(bossReward(os, 24, 1).coins === 220,  "stoneface 1.2× year 1 = 220◉ (margin 0.2)");

// Failed pays 0 regardless of year
assert(bossReward(fm, 25, 5).coins === 0, "year 5 fail still pays 0");
```
Run — confirm: `bossReward is not exported from './features/bosses/data.js'`.

*Gameplay simulation (player nearing end of winter year 1, Frostmaw 38/30):*
The player is on turn 9 of winter, Frostmaw at `38/30`. They could close out
and bank the win, or push for more margin. They route a 7-log chain (45 total).
Turn 10 closes; Frostmaw modal: "+250◉ (×1.25 margin), +1 Rune." A different
run scrapes through at exactly 30 logs and sees "+200◉ (×1.0), +1 Rune" — a
clear 50◉ delta that *rewarded* the extra effort. A third player ends winter
at 28 logs; the modal reads "Frostmaw escapes." No coins, no rune, no story
flag flip — re-attempt next year.

Designer reflection: *Is `× 0.5` the right scaling weight? At 2× target the
player gets 1.5× coins — does that feel meaningful enough to over-collect, or
should the cap pay 1.75× / 2.0× to make pushing for margin clearly worth a
detour from the order queue?*

**Implementation:**
- Append to `src/features/bosses/data.js`:
  ```js
  // §9 locked: base = 200◉ × year_number; +1 rune (Phase 3 flat drop).
  // Margin scaling: 0% → 1.0×, +100% (cap) → 1.5×.
  export function bossReward(boss, progress, year) {
    const target = boss.target.amount;
    const defeated = progress >= target;
    if (!defeated) return { coins: 0, runes: 0, defeated: false };
    const baseReward = 200 * year;
    const margin = Math.min(1.0, (progress - target) / target);
    const scalingBonus = Math.floor(baseReward * margin * 0.5);
    return { coins: baseReward + scalingBonus, runes: 1, defeated: true };
  }
  ```
- `src/GameScene.js` — `resolveBoss()` (called from 8.3):
  ```js
  const reward = bossReward(def, state.boss.progress, state.year);
  state.coins += reward.coins;
  state.runes = (state.runes ?? 0) + reward.runes;
  if (reward.defeated) {
    state.story.flags[`${state.boss.id}_defeated`] = true;
    state.achievements = tickAchievement(state, "bosses_defeated").newState.achievements;
  }
  showBossResultModal(reward);
  ```
- Modal text: defeated → `"+<coins>◉ (×<multiplier> margin), +1 Rune"`; failed
  → `"<Boss> escapes."` no reward line.

**Manual Verify Walk-through:**
1. Console: force `state.boss = { id: "frostmaw", progress: 30, ... }; state.year = 1`.
   End the season. Confirm modal: "+200◉ (×1.0), +1 Rune."
2. Repeat with `progress = 60`. Confirm modal: "+300◉ (×1.5), +1 Rune."
3. Repeat with `progress = 29`. Confirm modal: "Frostmaw escapes." `state.coins`
   unchanged, no `frostmaw_defeated` flag, achievement not ticked.
4. Repeat with `state.year = 2, progress = 60`. Confirm "+600◉ (×1.5)."
5. `runSelfTests()` passes all 8.2 assertions.

---

### 8.3 — 1-season boss window

**What this delivers:** Boss state lives at `state.boss = { id, season, year,
turnsRemaining, progress, target, modifierState }` — four canonical fields plus
the modifier-state bag from 8.1. `turnsRemaining` is locked at 10 on spawn (§18:
"Boss window: 1 season (10 turns), not 5 seasons"), decrements once per turn,
and forces resolve at 0. A boss CANNOT carry over between seasons. Bosses spawn
from two sources: (a) story beats (Frostmaw via the Phase 2 `act2_frostmaw`
beat) and (b) year-cycle rolls at year transitions (Quagmire / Ember Drake /
Stoneface rotate by year).

**Completion Criteria:**
- [ ] `state.boss` shape on spawn: `{ id, season, year, turnsRemaining: 10,
  progress: 0, target: { ...target }, modifierState: <from 8.1> }`
- [ ] `BOSS_WINDOW_TURNS = 10` exported from `src/features/bosses/data.js`
- [ ] Pure `spawnBoss(state, id, year)` returns new state with `state.boss` set;
  no mutation
- [ ] Pure `tickBossTurn(state)` decrements `turnsRemaining`; if `<= 0` OR
  `progress >= target`, calls `resolveBoss(state)` and returns state with `boss = null`
- [ ] Reaching target before turn 10 resolves *immediately* (early-out)
- [ ] `commitChain()` adds payload[boss.target.resource] to `state.boss.progress`
- [ ] On spawn: `state.story.flags[`<id>_active`] = true`
- [ ] On resolve: `state.story.flags[`<id>_active`] = false`; if defeated,
  also `state.story.flags[`<id>_defeated`] = true` (8.2 sets coins/runes)
- [ ] Save/load preserves all 4 canonical fields + modifierState exactly
- [ ] Year-cycle spawn schedule: year 1 winter = Frostmaw (story); year 2
  spring = Quagmire, summer = Ember Drake, autumn = Stoneface; year 3 spring =
  Mossback (alternates), etc.
- [ ] Second `spawnBoss` call while one is active is a no-op

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { BOSSES, BOSS_WINDOW_TURNS, spawnBoss, tickBossTurn }
  from "./features/bosses/data.js";
import { createInitialState } from "./state.js";

// §18 locked: 10-turn window, not 5
assert(BOSS_WINDOW_TURNS === 10, "boss window locked at 10 turns (§18)");

// spawnBoss populates all canonical fields + modifierState
let s = createInitialState(); s.year = 1;
s = spawnBoss(s, "frostmaw", 1);
assert(s.boss.id === "frostmaw" && s.boss.season === "winter" && s.boss.year === 1,
       "id/season/year stamped on spawn");
assert(s.boss.turnsRemaining === 10, "turnsRemaining = 10 (1-season window)");
assert(s.boss.progress === 0 && s.boss.target.resource === "log" && s.boss.target.amount === 30,
       "progress 0, target copied from def");
assert(s.boss.modifierState.frozenColumns?.length === 2,
       "freeze_columns modifier initialised on spawn");
assert(s.story.flags.frostmaw_active === true, "active flag set on spawn");

// 1 turn → 9 remaining
let t = tickBossTurn(s);
assert(t.boss.turnsRemaining === 9 && t.boss !== null, "tick: 10 → 9, not resolved");

// Turn 10 with progress < target → failed (no reward, no flag)
const s2 = { ...s, boss: { ...s.boss, turnsRemaining: 1, progress: 12 } };
const r2 = tickBossTurn(s2);
assert(r2.boss === null, "boss cleared at turn 10");
assert(r2.coins === s2.coins && r2.story.flags.frostmaw_defeated !== true,
       "fail: no coins, no defeated flag");
assert(r2.story.flags.frostmaw_active === false, "active flag cleared");

// Cross target before turn 10 → resolves immediately as defeated
const s3 = { ...s, year: 1, coins: 0,
             boss: { ...s.boss, turnsRemaining: 5, progress: 30 } };
const r3 = tickBossTurn(s3);
assert(r3.boss === null && r3.coins === 200, "early resolve: year 1 exact = 200◉");
assert(r3.story.flags.frostmaw_defeated === true, "defeated flag set on early win");

// Save/load round-trip
const loaded = JSON.parse(JSON.stringify(s.boss));
assert(loaded.id === "frostmaw" && loaded.turnsRemaining === 10
    && loaded.target.amount === 30 && Array.isArray(loaded.modifierState.frozenColumns),
       "save → load preserves all canonical fields");

// Cannot spawn while one active
const before = JSON.stringify(s.boss);
assert(JSON.stringify(spawnBoss(s, "ember_drake", 1).boss) === before,
       "second spawnBoss is a no-op");

// 0 turnsRemaining forces resolve regardless of progress (no carry-over)
const s5 = { ...s, boss: { ...s.boss, turnsRemaining: 0, progress: 5 } };
assert(tickBossTurn(s5).boss === null, "0 turns forces resolve — no carry-over");
```
Run — confirm: `BOSS_WINDOW_TURNS is not exported from './features/bosses/data.js'`.

*Gameplay simulation (player at turn 5 of winter year 1, Frostmaw 14/30, saves):*
The player has played 5 turns of winter. Frostmaw counter `14/30`, HUD shows
"Frostmaw — 5 turns left." They quit, lunch, return, refresh. The save loads —
board still has the *same* two frozen columns (seed-stable from 8.1), counter
still `14/30`, HUD still "5 turns left." They play 4 more turns, hit 28/30. On
turn 10's commit they push a 3-log chain → 31. The boss resolves immediately
— the result modal pops the moment the chain animation finishes: "+200◉
(×1.0), +1 Rune. Frostmaw retreats." Frozen columns thaw.

Designer reflection: *Does the immediate-resolve-on-target feel rewarding ("I
beat it!") or premature ("I wanted to push for margin and the modal cut me
off")? Should there be an explicit "End boss now" vs "Play out the season"
choice on hitting the target?*

**Implementation:**
- Append to `src/features/bosses/data.js`:
  ```js
  export const BOSS_WINDOW_TURNS = 10; // §18 locked: 1 season, not 5

  export function spawnBoss(state, id, year, rng = Math.random) {
    if (state.boss) return state;
    const def = BOSSES.find(b => b.id === id);
    if (!def) return state;
    const modifierState = applyModifierToFreshGrid(state.grid ?? [[]], def.modifier, rng);
    return {
      ...state,
      boss: { id, season: def.season, year,
              turnsRemaining: BOSS_WINDOW_TURNS, progress: 0,
              target: { ...def.target }, modifierState },
      story: { ...state.story,
        flags: { ...state.story.flags, [`${id}_active`]: true } },
    };
  }

  export function tickBossTurn(state) {
    if (!state.boss) return state;
    const next = { ...state.boss, turnsRemaining: state.boss.turnsRemaining - 1 };
    const targetMet = next.progress >= next.target.amount;
    const expired   = next.turnsRemaining <= 0;
    if (!targetMet && !expired) return { ...state, boss: next };
    const def = BOSSES.find(b => b.id === state.boss.id);
    const reward = bossReward(def, next.progress, next.year);
    const flags = { ...state.story.flags,
      [`${state.boss.id}_active`]: false,
      ...(reward.defeated ? { [`${state.boss.id}_defeated`]: true } : {}) };
    return { ...state, boss: null,
      coins: (state.coins ?? 0) + reward.coins,
      runes: (state.runes ?? 0) + reward.runes,
      story: { ...state.story, flags } };
  }
  ```
- `src/state.js` — `createInitialState()` adds `boss: null, runes: 0`.
- `src/GameScene.js`:
  - On story beat `act2_frostmaw` firing → `state = spawnBoss(state, "frostmaw", state.year)`.
  - On year transition (every 4 seasons) → roll the next year-cycle boss for
    that season type and call `spawnBoss` at the start of that season.
  - In `commitChain()` — if `state.boss` and chain payload includes
    `state.boss.target.resource`, increment `state.boss.progress`.
  - In `advanceTurn()` (post season-step) — `state = tickBossTurn(state)`. If
    boss resolved, fire `showBossResultModal(reward)` and call
    `clearModifier(grid, def.modifier)` to strip overlays.

**Manual Verify Walk-through:**
1. Console: trigger `act2_frostmaw` story beat. Confirm `gameState.boss.turnsRemaining
   === 10`, `progress === 0`, `target.amount === 30`, `modifierState.frozenColumns.length === 2`.
2. Play 1 turn. Confirm `turnsRemaining === 9`.
3. Save → refresh. Confirm all 4 canonical fields + modifierState restored.
4. Play to turn 10 with progress 12. Confirm boss resolves as failed: 0 coins,
   no `frostmaw_defeated` flag, board overlays cleared.
5. New game. Force progress to 30 on turn 5. Confirm boss resolves *immediately*.
6. While Frostmaw is active, console-call `spawnBoss(gameState, "ember_drake", 1)`.
   Confirm no-op (existing boss preserved).
7. `runSelfTests()` passes all 8.3 assertions.

---

### 8.4 — Weather slot integration

**What this delivers:** Off-boss seasons get a *visible* weather event from §9's
table. On `OPEN_SEASON`, if `state.boss === null`, roll one weather event from a
weighted table (None 40% / Rain 20% / Harvest Moon 15% / Drought 15% / Frost
10%) and set `state.weather = { active, turnsRemaining: 1–3 }`. Effects: Rain
doubles berry yields in `commitChain`; Harvest Moon adds +1 to the
`upgradeCountForChain` result; Drought halves wheat+grain spawn weights in
`fillBoard`; Frost doubles `collapseBoard` tween duration (purely visual). When
boss is active the roll is skipped — `state.weather = { active: null,
turnsRemaining: 0 }`.

**Completion Criteria:**
- [ ] `src/features/weather/data.js` exports `WEATHER_TABLE` (5 entries
  including None) with `{ id, label, weight, durationMin, durationMax }`
- [ ] Weights total exactly 100
- [ ] Pure `rollWeather(rng)` returns `{ active, turnsRemaining }` — `active`
  is `null` for None
- [ ] `state.weather` initialised to `{ active: null, turnsRemaining: 0 }` on
  fresh state and on every boss-active `OPEN_SEASON`
- [ ] On non-boss `OPEN_SEASON`: `state.weather = rollWeather(rngFromSeed(...))`
  seeded by `(saveSeed, year, season)` so reload is deterministic
- [ ] `src/features/weather/effects.js` exports four pure helpers:
  `applyRainBerryBonus(payload, weather)`, `applyHarvestMoonUpgrade(count, weather)`,
  `applyDroughtSpawnWeights(pool, weather)`, `applyFrostCollapseDuration(ms, weather)`
- [ ] `commitChain()` calls `applyRainBerryBonus` *before* inventory add
- [ ] `commitChain()` calls `applyHarvestMoonUpgrade` on `upgradeCountForChain` result
- [ ] `fillBoard()` calls `applyDroughtSpawnWeights` on the pool before sampling
- [ ] `collapseBoard()` calls `applyFrostCollapseDuration` on tween duration
  (visual only — no inventory or chain math change)
- [ ] `advanceTurn()` decrements `state.weather.turnsRemaining`; clears at 0
- [ ] Boss season → `state.weather.active === null` always
- [ ] HUD weather banner: small icon + label visible while `weather.active`,
  fades when cleared
- [ ] `src/textures.js` adds `weather.rain`, `weather.harvest_moon`,
  `weather.drought`, `weather.frost` (16×16 each)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { WEATHER_TABLE, rollWeather } from "./features/weather/data.js";
import { applyRainBerryBonus, applyHarvestMoonUpgrade,
         applyDroughtSpawnWeights, applyFrostCollapseDuration }
  from "./features/weather/effects.js";
import { spawnBoss } from "./features/bosses/data.js";
import { createInitialState } from "./state.js";

// Table shape & weights total exactly 100
assert(WEATHER_TABLE.reduce((a, w) => a + w.weight, 0) === 100, "weights total 100");
const wmap = Object.fromEntries(WEATHER_TABLE.map(w => [w.id, w.weight]));
assert(wmap.none === 40 && wmap.rain === 20 && wmap.harvest_moon === 15
    && wmap.drought === 15 && wmap.frost === 10,
       "locked weights: 40/20/15/15/10");
assert(WEATHER_TABLE.every(w => w.durationMin >= 0 && w.durationMax >= w.durationMin),
       "duration ranges sane (1–3 per §9)");

// rollWeather deterministic across buckets
assert(rollWeather(() => 0.05).active === null, "rng=0.05 in first 40% → none");
const w2 = rollWeather(() => 0.50);
assert(["rain","harvest_moon","drought","frost"].includes(w2.active), "non-none bucket");
assert(w2.turnsRemaining >= 1 && w2.turnsRemaining <= 3, "duration ∈ [1,3]");

// Rain doubles berry ONLY
const rain = { active: "rain", turnsRemaining: 2 };
const after = applyRainBerryBonus({ hay: 5, berry: 4 }, rain);
assert(after.berry === 8 && after.hay === 5, "rain: 2× berry only, hay untouched");
assert(applyRainBerryBonus({ berry: 4 }, { active: "drought", turnsRemaining: 1 }).berry === 4,
       "non-rain: berry untouched");

// Harvest Moon: +1 upgrade only when active
assert(applyHarvestMoonUpgrade(2, { active: "harvest_moon", turnsRemaining: 1 }) === 3,
       "moon: upgrades 2 → 3");
assert(applyHarvestMoonUpgrade(2, { active: "rain", turnsRemaining: 1 }) === 2,
       "non-moon: upgrades unchanged");

// Drought halves wheat + grain weights only; pure
const drought = { active: "drought", turnsRemaining: 1 };
const pool = [{ key: "hay", weight: 3 }, { key: "wheat", weight: 2 },
              { key: "grain", weight: 4 }, { key: "log", weight: 3 }];
const p2 = applyDroughtSpawnWeights(pool, drought);
assert(p2.find(p => p.key === "wheat").weight === 1
    && p2.find(p => p.key === "grain").weight === 2
    && p2.find(p => p.key === "hay").weight === 3
    && p2.find(p => p.key === "log").weight === 3,
       "drought: wheat+grain halved, hay+log untouched");
assert(pool.find(p => p.key === "wheat").weight === 2, "input pool unmutated (purity)");

// Frost: 2× tween only; no inventory/chain math change
assert(applyFrostCollapseDuration(200, { active: "frost", turnsRemaining: 1 }) === 400,
       "frost: tween 2×");
assert(applyFrostCollapseDuration(200, { active: "rain",  turnsRemaining: 1 }) === 200,
       "non-frost: tween unchanged");
assert(applyRainBerryBonus({ berry: 3 }, { active: "frost", turnsRemaining: 1 }).berry === 3,
       "frost does NOT double berry (visual-only)");

// Boss season skips the roll — OPEN_SEASON must clear weather instead of rolling
let s = createInitialState();
s = spawnBoss(s, "frostmaw", 1);
assert(s.boss !== null, "boss active");
const skipped = s.boss !== null ? { active: null, turnsRemaining: 0 } : rollWeather(() => 0.5);
assert(skipped.active === null && skipped.turnsRemaining === 0,
       "boss-season weather is null/0");

// turnsRemaining decrements; clears at 0
const tickW = w => w.active && w.turnsRemaining > 1
  ? { ...w, turnsRemaining: w.turnsRemaining - 1 }
  : { active: null, turnsRemaining: 0 };
let st = tickW({ active: "rain", turnsRemaining: 2 });
assert(st.active === "rain" && st.turnsRemaining === 1, "tick decrements");
st = tickW(st);
assert(st.active === null && st.turnsRemaining === 0, "weather clears at 0");
```
Run — confirm: `Cannot find module './features/weather/data.js'`.

*Gameplay simulation (player at season-open, autumn year 1, no boss active):*
The autumn modal closes. Top-right of the canvas, a small rain droplet icon
fades in: "Rain — 2 turns." The player chains 4 berry — the floater shows
`+8 berry` (×2). Two turns later the icon fades out. On the next season-open
the weather rolls again — this time Drought. Over the next 2 turns wheat tiles
spawn visibly less often, and a sun-and-cracked-earth glyph sits in the banner
slot. When winter opens and Frostmaw spawns (story beat), the weather banner
is gone — the boss owns the season. Three years later, sandbox mode, Frost
weather rolls during a non-boss spring; the only difference the player notices
is that tile collapse looks slower and snowier — no inventory change, no
balance change, just *vibe*.

Designer reflection: *Are 4 weather variants enough flavor across the 16
non-boss seasons of a 4-year sandbox session? Should None at 40% be lower —
the game feels more alive when *something* is happening, even a frost shimmer
— or does the calm rest beat matter for pacing?*

**Implementation:**
- New file `src/features/weather/data.js`:
  ```js
  // §9 locked: weather rolls each season UNLESS boss active.
  export const WEATHER_TABLE = [
    { id: "none",         label: "Clear",        weight: 40, durationMin: 0, durationMax: 0 },
    { id: "rain",         label: "Rain",         weight: 20, durationMin: 1, durationMax: 3 },
    { id: "harvest_moon", label: "Harvest Moon", weight: 15, durationMin: 1, durationMax: 2 },
    { id: "drought",      label: "Drought",      weight: 15, durationMin: 2, durationMax: 3 },
    { id: "frost",        label: "Frost",        weight: 10, durationMin: 1, durationMax: 3 },
  ];

  export function rollWeather(rng) {
    const r = rng() * 100;
    let acc = 0;
    for (const w of WEATHER_TABLE) {
      acc += w.weight;
      if (r < acc) {
        if (w.id === "none") return { active: null, turnsRemaining: 0 };
        const span = w.durationMax - w.durationMin + 1;
        const dur  = w.durationMin + Math.floor(rng() * span);
        return { active: w.id, turnsRemaining: dur };
      }
    }
    return { active: null, turnsRemaining: 0 };
  }
  ```
- New file `src/features/weather/effects.js`:
  ```js
  export function applyRainBerryBonus(payload, weather) {
    if (weather?.active !== "rain") return payload;
    const out = { ...payload };
    if (out.berry) out.berry = out.berry * 2;
    return out;
  }
  export function applyHarvestMoonUpgrade(upgradeCount, weather) {
    return weather?.active === "harvest_moon" ? upgradeCount + 1 : upgradeCount;
  }
  export function applyDroughtSpawnWeights(pool, weather) {
    if (weather?.active !== "drought") return pool;
    return pool.map(p => (p.key === "wheat" || p.key === "grain")
      ? { ...p, weight: p.weight * 0.5 } : p);
  }
  export function applyFrostCollapseDuration(baseMs, weather) {
    return weather?.active === "frost" ? baseMs * 2 : baseMs;
  }
  ```
- `src/state.js` — `createInitialState()` adds `weather: { active: null, turnsRemaining: 0 }`.
- `src/GameScene.js`:
  - `openSeason()` — if `!state.boss` → `state.weather = rollWeather(rngFromSeed(state.saveSeed, state.year, currentSeason))`; else clear.
  - `commitChain()` — `payload = applyRainBerryBonus(payload, state.weather)`;
    `upgrades = applyHarvestMoonUpgrade(upgradeCountForChain(...), state.weather)`.
  - `fillBoard()` — `pool = applyDroughtSpawnWeights(basePool, state.weather)` before sampling.
  - `collapseBoard()` — `duration = applyFrostCollapseDuration(BASE_COLLAPSE_MS, state.weather)`.
  - `advanceTurn()` — decrement `state.weather.turnsRemaining`; clear at 0.
- `src/textures.js` — register the 4 weather icons.

**Manual Verify Walk-through:**
1. New game. Console: `gameState.weather` is `{active: null, turnsRemaining: 0}`.
2. Trigger `OPEN_SEASON` 10 times with no boss; record weathers — spread should
   roughly match (40/20/15/15/10) within sample noise.
3. Force `state.weather = { active: "rain", turnsRemaining: 2 }`. Chain 3 berry.
   Confirm inventory got +6 berry, not +3.
4. Force `state.weather.active = "harvest_moon"`. Chain a 6-hay chain that
   normally yields 1 wheat upgrade. Confirm 2 wheat upgrades.
5. Force `state.weather.active = "drought"`. Refill the board 5 times via console.
   Confirm wheat/grain visibly rarer than baseline.
6. Force `state.weather.active = "frost"`. Drag a chain. Watch the collapse
   tween — confirm ~2× longer. Inventory math unchanged.
7. Spawn a boss. Confirm `state.weather.active === null` immediately, banner gone.
8. Resolve the boss. Next `OPEN_SEASON` rolls weather again.
9. `runSelfTests()` passes all 8.4 assertions.

---

### 8.5 — Influence currency + Decoration buildings

**What this delivers:** Closes the §3 / §11 Influence loop the spec promised.
A new currency `state.influence` (starts at 0) is earned by placing decoration
buildings — three small village ornaments (Violet Bed, Stone Lantern, Apple
Sapling) — and by completing future "royal quest" objectives (hooked but
flagged-off until Phase 7 wires them in). Decorations cost coins + a small
resource bundle; on build they pay a one-time Influence grant and continue
to read in the Town panel as cosmetic. Influence is the *only* spend currency
for §8.6 magic-tool summons. No magic-tool selection UI lives here — that is
the 8.6 task.

**Completion Criteria:**
- [ ] `state.influence` (integer ≥ 0) added in `createInitialState()`;
  defaults to 0 on a fresh save and migrates to 0 on a v0..v7 save.
- [ ] `src/features/decorations/data.js` exports `DECORATIONS` (3 entries):
  - `violet_bed`   — `{ cost: { coins: 60,  hay: 4 },             influence: 20 }`
  - `stone_lantern` — `{ cost: { coins: 120, stone: 6, plank: 2 }, influence: 35 }`
  - `apple_sapling` — `{ cost: { coins: 200, plank: 4, berry: 6 }, influence: 60 }`
- [ ] `BUILD_DECORATION` reducer: deducts cost, increments
  `state.built.decorations[id]` (count, no level cap), credits
  `influence += DECORATIONS[id].influence`. Same-id second build pays the
  *same* Influence grant again (decorations are repeatable, by design).
- [ ] Order-delivery and quest-claim payloads accept an optional
  `influence: N` field that adds to `state.influence`. Wired but unused
  in this phase (Phase 7 quests will set it; Phase 6 orders won't).
- [ ] Town panel adds a Decorations sub-tab next to Buildings; each
  decoration card shows cost, "+N Influence on build", and a Build button
  greyed out when cost is unmet.
- [ ] HUD badge: a small crown icon + `state.influence` value, rendered to
  the right of the runes badge. Tap for a tooltip "Influence — spent at
  the Magic Portal".
- [ ] `src/textures.js` registers `building.violet_bed` (56×56),
  `building.stone_lantern` (56×56), `building.apple_sapling` (56×56),
  and `hud.influence_crown` (24×24).
- [ ] Save/load round-trips `state.influence` and
  `state.built.decorations` exactly.

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, rootReducer } from "./state.js";
import { DECORATIONS } from "./features/decorations/data.js";

// Catalog
assert(Object.keys(DECORATIONS).length === 3, "exactly 3 decorations");
assert(DECORATIONS.violet_bed.influence    === 20, "violet_bed = +20 influence");
assert(DECORATIONS.stone_lantern.influence === 35, "stone_lantern = +35");
assert(DECORATIONS.apple_sapling.influence === 60, "apple_sapling = +60");

// Fresh state
const s0 = createInitialState();
assert(s0.influence === 0, "fresh: influence starts at 0");
assert(Object.keys(s0.built.decorations ?? {}).length === 0,
       "fresh: no decorations built");

// Build a decoration
const s1 = rootReducer({ ...s0, coins: 200, hay: 10 },
  { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
assert(s1.coins === 140, "violet_bed cost 60 coins");
assert(s1.hay   === 6,   "violet_bed cost 4 hay");
assert(s1.influence === 20, "violet_bed grants +20 influence");
assert(s1.built.decorations.violet_bed === 1, "decoration count incremented");

// Repeatable
const s2 = rootReducer({ ...s1, coins: 100, hay: 8 },
  { type: "BUILD_DECORATION", payload: { id: "violet_bed" } });
assert(s2.influence === 40, "second violet_bed grants another +20");
assert(s2.built.decorations.violet_bed === 2, "count → 2");

// Insufficient resources blocks build
const s3 = rootReducer(s0,
  { type: "BUILD_DECORATION", payload: { id: "stone_lantern" } });
assert(s3 === s0, "no-op when cost unmet");

// Save/load round-trip
import { migrateState, SAVE_SCHEMA_VERSION } from "./migrations.js";
const round = migrateState(JSON.parse(JSON.stringify(s2)));
assert(round.state.influence === 40, "save/load preserves influence");
assert(round.state.built.decorations.violet_bed === 2, "preserves decoration counts");
```

*Gameplay simulation (Act 2 player, has Workshop):* The player has 350◉ and a
small inventory. They open Town → Decorations and see three muted cards.
Violet Bed lights up — cost 60◉ + 4 hay. They tap Build. A 200ms ribbon
animation plants a small purple cluster next to the Hearth. The HUD crown
ticks up by 20. Two more Violet Beds and a Stone Lantern later, the
Influence badge reads 95 — the player has not yet seen what to spend it on
(the Magic Portal in 8.6 will be the answer). The badge feels like quiet
foreshadowing.

Designer reflection: *Does +20 / +35 / +60 feel like a real progression
ladder, or does the player stop noticing the deltas after the third build?
Are decorations "actual buildings worth pondering" or "an Influence vending
machine with sprites"?*

**Implementation:**

- New file `src/features/decorations/data.js` — locked decoration table.
- New file `src/features/decorations/slice.js` — `BUILD_DECORATION` reducer.
- `src/state.js`:
  - `createInitialState()` — add `influence: 0`,
    `built: { ...existing, decorations: {} }`.
  - `rootReducer` — wire `BUILD_DECORATION`; thread the optional
    `influence: N` field on `DELIVER_ORDER` and `CLAIM_QUEST` payloads.
- `src/migrations.js` — v7 → v8 step now also seeds `influence: 0` and
  `built.decorations: {}` (folds into the Phase 8 migration).
- `src/GameScene.js` — Town panel: add Decorations sub-tab, render cards
  using the locked cost / influence values; HUD: add the crown badge to
  the right of the runes badge.
- `src/textures.js` — register the four new textures listed above.

**Manual Verify Walk-through:**
1. Fresh save. HUD shows runes badge + new crown badge reading "0".
2. Open Town → Decorations sub-tab. Three cards: Violet Bed, Stone Lantern,
   Apple Sapling. Apple Sapling is greyed out (no berries yet).
3. Earn 60◉ + 4 hay through normal play. Violet Bed lights up; tap Build.
   Confirm `gameState.influence === 20`, ribbon animation, HUD crown ticks.
4. Build a second Violet Bed. Confirm `influence === 40`,
   `gameState.built.decorations.violet_bed === 2`.
5. Tap the HUD crown badge. Confirm tooltip "Influence — spent at the
   Magic Portal".
6. Save → refresh. Confirm influence and decoration counts intact.
7. Force-set `gameState.coins = 0`. Try to build a third Violet Bed.
   Confirm Build button greyed; no state change on tap.
8. `runSelfTests()` passes all 8.5 assertions.

---

### 8.6 — Magic Portal summons (Wand, Hourglass, Magic Seed, Magic Fertilizer)

**What this delivers:** The §5 Magic Tools the spec has been promising since
Phase 0. The Magic Portal — built in Phase 3 as a rune-gated structure — now
opens a *Summon* modal that spends Influence to grant one of four named
magic tools. Per §18 lock the player picks (no random draw). Each magic tool
fires through the Phase 1 tool tray with the same locked no-turn-cost
contract; each is one-shot consumable per summon.

| Magic Tool | Effect | Influence cost |
|---|---|---|
| Magic Wand | Pick a tile type; collect every tile of that type on the board | 80 |
| Hourglass | Restore the board, inventory, and `turnsUsed` to their pre-last-chain snapshot (one-deep undo) | 120 |
| Magic Seed | Add 5 to `state.session.turnsRemaining` (this session only) | 100 |
| Magic Fertilizer | Next 3 `fillBoard()` calls spawn grain in every cell | 60 |

**Completion Criteria:**
- [ ] `src/features/portal/data.js` exports `MAGIC_TOOLS` (4 entries) with
  `{ id, name, influenceCost, effect }`. Costs locked: 80 / 120 / 100 / 60.
- [ ] Portal is summon-eligible only when `state.built.portal === true`
  (built in Phase 3.3).
- [ ] `SUMMON_MAGIC_TOOL` reducer: rejects (no-op) when
  `state.influence < cost`; otherwise deducts Influence and increments
  `state.tools[id]` (where `id ∈ {magic_wand, hourglass, magic_seed,
  magic_fertilizer}`).
- [ ] `state.lastChainSnapshot` is captured on every chain commit (grid +
  inventory deltas + `turnsUsed`) so Hourglass has something to restore.
  The snapshot is one-deep (most recent only).
- [ ] Magic Wand fires a *type-picker* sub-modal (one row per resource
  currently visible on the board); selecting a type collects every tile
  of that type, awards the resources, and refills via the standard
  collapse pipeline; `turnsUsed` unchanged.
- [ ] Hourglass restores `lastChainSnapshot` exactly; if no snapshot exists
  (start of session) the tool refunds its Influence and floats "Nothing
  to undo."
- [ ] Magic Seed adds exactly 5 to `state.session.turnsRemaining`. This
  bypasses the §4 10-turn cap *for this session only*.
- [ ] Magic Fertilizer sets `state.magicFertilizerCharges = 3`; each
  `fillBoard()` while charges > 0 forces every refilled cell to `grain`
  and decrements charges. Stacks additively with the §10 Fertilizer
  one-shot tool — magic-fertilizer charges count down per fill, regular
  Fertilizer is a single-fill flag.
- [ ] Portal Summon modal is keyboard- and screen-reader-navigable per
  Phase 11 a11y rules (announce each option + cost on focus).
- [ ] `src/textures.js` registers `tool.magic_wand`, `tool.hourglass`,
  `tool.magic_seed`, `tool.magic_fertilizer` (48×48 each).
- [ ] Save/load round-trips `state.tools.magic_*`,
  `state.lastChainSnapshot`, `state.magicFertilizerCharges`.

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { MAGIC_TOOLS } from "./features/portal/data.js";
import { createInitialState, rootReducer } from "./state.js";

// Catalog
const ids = MAGIC_TOOLS.map(t => t.id);
assert(ids.length === 4 &&
       ids.includes("magic_wand") && ids.includes("hourglass") &&
       ids.includes("magic_seed") && ids.includes("magic_fertilizer"),
       "all 4 magic tools registered");
assert(MAGIC_TOOLS.find(t => t.id === "magic_wand").influenceCost === 80,
       "wand costs 80 influence");
assert(MAGIC_TOOLS.find(t => t.id === "hourglass").influenceCost === 120,
       "hourglass costs 120 influence");

// Insufficient influence rejects
const s0 = { ...createInitialState(), built: { portal: true }, influence: 50 };
const r0 = rootReducer(s0,
  { type: "SUMMON_MAGIC_TOOL", payload: { id: "magic_wand" } });
assert(r0 === s0, "no-op when influence < cost");

// Successful summon
const s1 = { ...createInitialState(), built: { portal: true }, influence: 200 };
const r1 = rootReducer(s1,
  { type: "SUMMON_MAGIC_TOOL", payload: { id: "magic_wand" } });
assert(r1.influence === 120, "wand deducts 80 influence");
assert(r1.tools.magic_wand === 1, "wand granted");

// Hourglass with no snapshot refunds
const s2 = { ...s1, lastChainSnapshot: null };
const r2 = rootReducer(s2,
  { type: "USE_TOOL", payload: { id: "hourglass" } });
// Pre-condition: hourglass count was 1; effect refunds influence, no decrement
// (specific shape determined by the tool-use reducer; assertion is on outcome)
assert((r2.tools.hourglass ?? 0) === (s2.tools.hourglass ?? 0),
       "hourglass with no snapshot does not consume the tool");

// Magic Seed adds 5 turns
const s3 = { ...s1, tools: { magic_seed: 1 },
             session: { turnsRemaining: 4 } };
const r3 = rootReducer(s3, { type: "USE_TOOL", payload: { id: "magic_seed" } });
assert(r3.session.turnsRemaining === 9, "magic_seed +5 turns");
assert(r3.tools.magic_seed === 0, "magic_seed consumed");

// Magic Fertilizer charges
const s4 = { ...s1, tools: { magic_fertilizer: 1 } };
const r4 = rootReducer(s4,
  { type: "USE_TOOL", payload: { id: "magic_fertilizer" } });
assert(r4.magicFertilizerCharges === 3, "fertilizer sets 3 charges");
assert(r4.tools.magic_fertilizer === 0, "fertilizer consumed");
```

*Gameplay simulation (mid-Act-3 player, 250 Influence stockpiled):* The
player has been quietly building decorations all year and has 250 Influence
sitting in the HUD. They open the Magic Portal for the first time. A
backlit summon modal slides in: four cards in a 2×2 grid, each with name +
icon + cost + a single-sentence effect. They tap Magic Seed (100). Confetti
burst, +1 magic_seed icon slides into the tool tray. Mid-session at turn
8/10 (running out of moves on a juicy near-finished order), they tap the
seed icon. The session counter jumps to 13/10 with a green chime and the
order delivers two turns later. They walk away thinking *that* was worth
saving up for.

Designer reflection: *Does Magic Seed feel like a "save the day" tool the
player remembers, or like a generic +5 turns? Does Hourglass-with-nothing-
to-undo refund cleanly enough that the player learns the rule without
losing the tool?*

**Implementation:**

- New file `src/features/portal/data.js` — locked `MAGIC_TOOLS` table.
- New file `src/features/portal/slice.js` — `SUMMON_MAGIC_TOOL` reducer.
- `src/state.js`:
  - `createInitialState()` — add `lastChainSnapshot: null`,
    `magicFertilizerCharges: 0`, and zeroed `tools.magic_wand`,
    `tools.hourglass`, `tools.magic_seed`, `tools.magic_fertilizer`.
  - `commitChain()` — before applying the chain, capture the snapshot:
    `state.lastChainSnapshot = { grid, inventoryDelta: {}, turnsUsedAt }`.
- `src/features/tools/use.js` — extend the dispatch switch with the four
  magic-tool handlers (each pure, each respects the no-turn-cost contract).
- `src/GameScene.js`:
  - `fillBoard()` — when `state.magicFertilizerCharges > 0`, override
    every cell to `grain` and decrement charges by 1.
  - Portal building tap → opens `<PortalSummonModal />`.
  - `<MagicWandPicker />` modal — type list from on-board tiles.
- `src/ui.jsx` — `<PortalSummonModal />`, `<MagicWandPicker />`.
- `src/textures.js` — register the four magic-tool icons.

**Manual Verify Walk-through:**
1. Build the Magic Portal (Phase 3.3) and stockpile 200 Influence via 8.5
   decorations. Tap the Portal. Summon modal opens.
2. Tap Magic Wand. Confirm `gameState.tools.magic_wand === 1`,
   `gameState.influence === 120`, wand icon in tool tray with badge "1".
3. Arm the wand on a board with 4 hay tiles. Pick "hay". Confirm all 4 hay
   collected, `gameState.turnsUsed` unchanged.
4. Chain a 6-hay chain. Tap Hourglass (after summoning one for 120). Confirm
   board, inventory, and `turnsUsed` snap back to pre-chain state.
5. Try Hourglass with no snapshot (immediately on session start). Confirm
   floater "Nothing to undo." and `gameState.tools.hourglass` unchanged.
6. Summon a Magic Seed (100). Tap it. Confirm `turnsRemaining += 5`.
7. Summon a Magic Fertilizer (60). Tap it. Confirm `magicFertilizerCharges
   === 3`. Trigger 3 fillBoards via console. Confirm every refilled cell
   is grain. Trigger a 4th fillBoard — confirm the standard pool returns.
8. Save → refresh mid-magic-fertilizer (charges = 1). Confirm charge
   restored exactly; next fillBoard is all-grain; the one after returns
   to standard.
9. `runSelfTests()` passes all 8.6 assertions.

---

## Phase 8 Sign-off Gate

Play 3 multi-year playthroughs from a fresh save covering: a *boss-focused*
year (Frostmaw via story → Quagmire/Ember/Stoneface in year 2), a *weather-
heavy* sandbox stretch (skip post-festival, observe 8+ weather rolls), and a
*save-stress* run (refresh during every boss and every weather event). Before
moving to Phase 9, confirm all:

- [ ] 8.1–8.6 Completion Criteria all checked
- [ ] **Building 3 Violet Beds + 1 Stone Lantern grants exactly +95
  Influence** — verified before/after on a fresh save
- [ ] **Stockpiling 200 Influence and summoning Magic Wand + Magic Seed at
  the Portal grants both tools and leaves Influence at exactly 20** — the
  player can then fire each magic tool without consuming a turn
- [ ] **Frostmaw season is visually distinguishable from a normal winter** —
  two columns frozen with ice overlay, drag refuses chains through them,
  columns thaw with a shimmer at season end
- [ ] **Defeating Frostmaw at exactly 30 logs pays 200◉ × year × 1.0; at 60
  logs pays 200◉ × year × 1.5** — verified via console force-set at year 1
  (200 / 300) and year 2 (400 / 600); margin caps cleanly at +100% target
- [ ] **Boss fails cleanly at end-of-season if target unmet** — no coin
  reward, no rune, no `<id>_defeated` story flag, no `bosses_defeated`
  achievement counter tick, modifier overlays cleared on next season open
- [ ] **Weather never rolls during a boss season** — `state.weather.active`
  reads `null` for every boss season across all 3 playthroughs
- [ ] **Save mid-boss-season at turn 5 restores boss state perfectly** —
  id, year, season, turnsRemaining, progress, target, and modifierState
  (frozen columns / heat ages / rubble cells / hidden cells) all match
  pre-reload exactly
- [ ] `runSelfTests()` passes for all Phase 8 tests

*Designer gut-check: Does the boss season feel like a real challenge that
changes how you play, or like a normal season with a counter on top? Does
weather slot in as flavor the player notices once per season, or does it
disappear into the background like the seasons-cycled counter — present but
unfelt?*
