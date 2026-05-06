# Tech Debt Report — puzzleDrag2
_Generated 2026-05-06 (deep pass)_

This report goes beyond style and structure. Section A lists **latent bugs and correctness issues** discovered while reading the code. Section B covers **architecture and structural debt**. Section C covers code-smell items. Section D is the prioritised refactor roadmap.

---

## A. Latent Bugs and Correctness Issues

### A1. The two "season" sources don't agree (architectural confusion, likely UX bug)

The codebase has **two independent season concepts**:

- `seasonIndexForTurns(turnsUsed)` in `src/utils.js:8-13` — derives a season label from `turnsUsed` within the current 8-turn run (Spring 0–1, Summer 2–3, Autumn 4–5, Winter 6+).
- `seasonsCycled % 4` — a counter incremented in `src/features/achievements/slice.js:104-107` on every `CLOSE_SEASON`. State.js uses this for the actual gameplay effects.

The **visual** uses the first (`src/ui.jsx:113`, `src/GameScene.js:128`).
The **mechanics** (Spring +20% harvest, Summer 2× orders, Autumn 2× upgrades, Winter 4+ chain min) use the second (`src/state.js:158`, `src/state.js:258`).

Result: the season label flips Spring→Summer→Autumn→Winter as the player burns through 8 turns, but the active effect stays the same the whole time. `SeasonBar` even renders both at once (`src/ui.jsx:167-168`). Pick one model.

### A2. `MAX_TURNS = 8` contradicts CLAUDE.md and breaks apprentices' season counter

`CLAUDE.md` says "10 turns per season, 4 seasons" but `src/constants.js:10` has `MAX_TURNS = 8`. Either the docs are stale or the code drifted. Multiple downstream sites assume 10:

- `src/features/apprentices/slice.js:42` and `:74`: `const season = Math.floor((state.turnsUsed || 0) / 10);` — with `MAX_TURNS=8`, `turnsUsed` never reaches 10, so this is **always 0**. `hire.since` and `idleHistory[].season` are dead values.

### A3. Mood bond bonus on order delivery never fires

`src/features/mood/slice.js:49-71` handles `TURN_IN_ORDER` and grants a bond bonus, but slice ordering is core → … → mood (`src/state.js:12`). By the time mood sees the action:

1. `coreReducer` (state.js:246-274) has already **decremented inventory** and **replaced the order** with a new one bearing a new id.
2. `mood/slice.js:52-56` does `const order = orders.find((o) => o.id === id)` against the post-core state — the original id no longer exists. Returns early.

Even if it found the order, `(state.inventory || {})[order.key] < order.need` would now compare the **post-decrement** inventory to the requirement, often failing.

The bond bump and `extraCoins` mood-modifier-on-order code path is therefore dead.

### A4. `useAudio` plays "coin spend" SFX on a successful order with bad mood

`src/audio/useAudio.js:42` triggers `coinSpend` whenever coins decrease. But `mood` slice's `extraCoins = Math.floor(order.reward * (mood.modifier - 1))` (`src/features/mood/slice.js:64`) can be **negative** when `modifier < 1`. So delivering an order to a grumpy NPC can make `coins` go down on net, which triggers a spend sound on a positive event. (Compounded by A3: mood is dead anyway, but if/when fixed this surfaces.)

### A5. Achievement bubble overwrites in-game tutorial/warning bubbles

Slices run in order `core → crafting → quests → achievements → tutorial → settings → boss → cartography → apprentices → mood`. In `CHAIN_COLLECTED`, `core` may set `bubble` (winter warning, level-up, upgrade hint) and `achievements` may unconditionally overwrite it with a trophy bubble (`src/features/achievements/slice.js:47`). Whoever runs last wins, with no priority logic.

### A6. `SETTINGS/RESET_SAVE` mutates the world from inside a reducer

`src/features/settings/slice.js:44-51` calls `localStorage.removeItem(...)` and `setTimeout(() => window.location.reload(), 400)` inside the reducer. Reducers must be pure — impurity here means React's strict-mode double-invoke could trigger two reloads, time-travel debugging is broken, and it's inconsistent with the rest of the codebase.

### A7. `boss/slice.js` only implements 2 of 4 weather effects

`WEATHER_META` defines `rain`, `drought`, `frost`, `harvest_moon` (`src/features/boss/slice.js:58-83`). `CHAIN_COLLECTED` only handles `rain` and `harvest_moon` (`:219-230`). `drought` and `frost` are picked, displayed, decremented, and do nothing. Half-implemented feature.

### A8. `BOSS_META.season` field is dead

`src/features/boss/slice.js:14, 26, 36, 47` define a `season` field on every boss but nothing reads it. Either implement seasonal gating or remove the field.

### A9. Quagmire boss progress doesn't reset per season

The Quagmire boss text says "harvest 50 hay this season" (`src/features/boss/slice.js:33`) but `boss.progress` is only reset on `BOSS/RESOLVE`, not on `CLOSE_SEASON`. Progress persists across seasons until win/loss. Either fix the implementation or reword the goal.

### A10. Two boss state changes can occur in the same `CLOSE_SEASON`

`boss/slice.js:264-280`: if a boss is active and its `turnsLeft` hits 0, the slice recurses into `BOSS/RESOLVE` (clearing `state.boss`). Then a few lines later, with `seasonCount % 4 === 0 && !next.boss`, it can immediately spawn a new year-rotation boss. The user sees the old boss resolve and a new boss appear in the same modal beat, with the lose-bubble overwritten by the new-boss modal. Should be exclusive.

### A11. `SWITCH_BIOME` can give all three orders to the same NPC

`src/state.js:305`: `state.orders.map(() => makeOrder(key, state.level))` — each call passes empty `excludeNpcs`, so RNG can hand the same NPC three orders. Compare to `initialState` (`:96-98`) which threads `excludeNpcs` through. Same fix here.

### A12. `loadSavedState` has no migration story

`SAVE_KEY = "hearth.save.v1"` (`src/state.js:16`) implies versioning, but no migration logic exists. `initialState` does `{ ...fresh, ...saved, ... }` (`:136`), so a save written by an older code path with stale `quests`, `boss`, etc. shapes is shallow-merged in and slice-private fields can survive past their slice's schema change. Either drop the `v1` suffix or actually version-check.

### A13. Module-level id sequences vs. persistence

`orderIdSeq` (state.js:60), `hireSeq` (apprentices/slice.js:8), `_questIdSeq` (quests/slice.js:3) all reset to 1 on module load. Only `orderIdSeq` has a recovery path (state.js:128-135). The other two will **collide with persisted ids** after a hot reload or repeat session if those slices ever start reading `state.dailies`/`state.hiredApprentices` and minting new ids. Use a uuid or persist the seq.

### A14. `runSelfTests()` is not a test runner

`src/utils.js:27-37` runs 9 `console.assert` calls on every page load and does not block boot on failure. CLAUDE.md treats this as the test suite. There's also a Playwright e2e suite, but **no unit-test runner** for `gameReducer` and slices — the most logic-dense and bug-prone files in the project.

### A15. Stale closures in `prototype.jsx` mount effect

`prototype.jsx:13-89` is a `useEffect(() => {...}, [])` that captures `dispatch`, `setChainInfo`, `sceneRef`, `biomeKey`, `turnsUsed`, `uiLocked`, `memoryPerks`. Captures from the first render only. Practically OK because `dispatch`/`setChainInfo` are stable refs and the registry-sync effects below cover the others, but ESLint `react-hooks/exhaustive-deps` would (rightly) flag this. There is no ESLint configured.

### A16. `seasonsCycled` is initialised in the achievements slice, not core state

`src/features/achievements/slice.js:12` declares `seasonsCycled: 0`, but `coreReducer` reads `state.seasonsCycled` (state.js:158, 258) for game mechanics. Mechanics depend on a feature slice's state. Move the counter to core state, or make the dependency explicit.

### A17. `DEV/RESET_GAME` doesn't reset feature-slice state

`src/state.js:377-398` resets coins, inventory, orders, etc. but leaves `trophies`, `dailies`, `boss`, `weather`, `mapVisited`, `hiredApprentices`, `npcBond`, etc. untouched. After "reset", a player still has all their achievements claimed and any active boss/weather hanging around. Either ask each slice for a `reset()` or wipe save and reload.

### A18. `endTutorial` persists `seen` but `SETTINGS/SHOW_TUTORIAL` resets `seen: false` only in memory

`src/features/settings/slice.js:71-77` flips `tutorial.seen = false` in state but `loadSeen()` (`src/features/tutorial/slice.js:1-7`) reads from `localStorage`. After reload, the tutorial is "seen" again because the localStorage flag was never cleared. Either clear `hearth.tutorial.seen` here or unify persistence.

### A19. `apprentices/slice.js` line 84-87: dead-code marker leaked into production

```js
const refund = 0;
void refund;
continue;
```
`void refund;` is a hint to a linter to silence "unused variable". The variable is declared, immediately discarded, and the surrounding logic doesn't use a refund. Just delete all three lines.

### A20. `CLAUDE.md` says board is 7×6 but `constants.js` says `COLS=6, ROWS=7`

Minor docs drift: CLAUDE.md says "7×6" (rows×cols implied) while `src/constants.js:6-7` is `COLS=6, ROWS=7`. Same meaning depending on convention but worth aligning.

---

## B. Architecture and Structural Debt

### B1. Three god files account for 45% of source

| File | Lines | Notes |
|---|---|---|
| `src/ui.jsx` | 1,646 | 30+ components. Imports include HUD, side panel, orders, tools, mobile dock, bottom nav, biome modal, town view (with `BuildingIllustration`, `FarmFieldArt`, `MineEntranceArt`), season modal, NPC bubble, and feature mounting. |
| `src/textures.js` | 1,575 | Procedural canvas drawing for every resource icon, season badge, and UI sprite. `drawTileIcon` (line 82) is a giant if/else chain over resource keys. |
| `src/GameScene.js` | 594 | Single Phaser Scene owning layout, background, biome state, board fill/collapse, drag-chain input, path drawing, juice/feedback, and chain badge. |

Recommended splits already covered in earlier roadmap; specific extractions:

- From `ui.jsx`: `Tooltip`/`useTooltip`, `Hud` + `SeasonBar`, `Inventory*`, `ToolsGrid`/`PortraitToolsBar`, `MobileDock`, `BottomNav`, `BiomeEntryModal`, `TownView` + town artwork, `SeasonModal`, `NpcBubble`, `FeatureModals`/`FeatureScreens`.
- From `textures.js`: per-biome icon files, plus a shared `shapes.js` for `rounded`/`rr`/`strokedFill`/`dropShadow`/`highlight`.
- From `GameScene.js`: `BoardLayout`, `BoardRenderer`, `ChainPath`, `Juice`.

### B2. `state.js` mixes pure helpers, reducer logic, and persistence

`xpForLevel`, `resourceByKey`, `pickNpcKey`, `makeOrder`, `applyXp` are pure helpers; `loadSavedState`/`persistState`/`clearSave` are I/O; `coreReducer`/`gameReducer` are the actual reducer; module-level `orderIdSeq` is mutable global state. UI imports `xpForLevel` and `resourceByKey` from `state.js` (`src/ui.jsx:4`) — these belong in `selectors.js` or `utils.js`.

### B3. `window.__phaserScene` global

Used at `prototype.jsx:69, 87` and `src/ui.jsx:209, 468, 548` for `shuffleBoard()` calls. A `useImperativeHandle` ref or a context callback removes the global, the GC retention, and the test concern.

### B4. Tight Phaser ↔ React coupling via `registry`

State changes flow:

1. React reducer updates state → 4 separate `useEffect` hooks (`prototype.jsx:92-95`) write each field into Phaser registry.
2. Phaser scene listens for `registry.events.on("changedata-X")` (`src/GameScene.js:62-68`).
3. Phaser emits `chain-collected` and `chain-update` events (`prototype.jsx:70-71`).

A small "PhaserBridge" module would centralise this and make it testable.

### B5. Cross-cutting CHAIN_COLLECTED is a footgun

`CHAIN_COLLECTED` is handled in `core` + 6 of 9 slices. Each slice reads `action.payload` independently and sometimes overwrites `state.bubble` (see A5). Either:

- Make `CHAIN_COLLECTED` strictly mutate game state in core, then **emit derived events** that slices listen to (e.g. `BUBBLE_REQUESTED`, with a priority queue), or
- Define an explicit slice-priority and "bubble owner" rule.

### B6. No test runner for reducer logic

Reducers in `src/state.js` and 9 slices are pure functions — perfect for unit tests. The repo has Playwright e2e (slow, flaky on touch — see `tests/e2e/chain.spec.js:67-70`) and `runSelfTests()` (9 console asserts). Add Vitest:

```bash
npm i -D vitest @vitest/ui
```

### B7. No ESLint / Prettier

No `.eslintrc*`, no `.prettierrc*`. Hooks-rules violations (A15), unused vars (A19), and inconsistent style across files all stem from no automated linting.

### B8. Dead constants

`src/constants.js:1-21` exports `W`, `H`, `MOBILE_W`, `MOBILE_H`, `BOARD_X`, `BOARD_Y`, `responsiveGameSize`, `renderResolutionForWidth`. **None are imported anywhere outside `constants.js`** (only `TILE`, `COLS`, `ROWS`, `MAX_TURNS`, `UPGRADE_EVERY`, `SEASONS`, `BIOMES`, `NPCS`, `BUILDINGS`, `RECIPES`, `ACHIEVEMENTS`, `QUEST_TEMPLATES`, `ALMANAC_TIERS` are consumed). Delete the unused exports.

### B9. Per-resource sway data is in TileObj.js, separated from resource definitions

`src/TileObj.js:6-18` hard-codes `SWAY` for 11 resource keys. Adding a new resource silently produces no animation. Move `sway` into each resource entry in `BIOMES` so it lives next to `color`, `glyph`, `value`, etc.

---

## C. Code Smells

### C1. Duplicate hex-to-CSS conversions

Three near-identical functions:

- `utils.js:23` `hex(num)` → `#XXXXXX` (`String#padStart`)
- `utils.js:19` `cssColor(num)` → uses Phaser's `IntegerToColor.rgba`, returns `rgba(...)`
- `ui.jsx:192` `cssFromHex(intHex)` → identical to `utils.js#hex` (and used from the same file that imports `utils.js`)

`textures.js:2` already imports `hex` from utils. Drop `cssFromHex` and use `hex`. Rename `cssColor` → `rgbaColor` to make the difference obvious, or merge.

### C2. Duplicate `clamp`

`src/utils.js:4-6` exports `clamp`. `src/features/mood/slice.js:8-10` re-implements it locally. Import from utils.

### C3. 24+ inline bubble object literals

`{ id: Date.now(), npc, text, ms }` constructed at 24 sites (state.js × 18, slices × 6+). Add a factory in `utils.js`:

```js
export const bubble = (npc, text, ms = 1800) => ({ id: Date.now(), npc, text, ms });
```

### C4. Magic numbers without names

| Where | Value | Fix |
|---|---|---|
| `state.js:65` | `Math.random() < 0.30` | `CRAFTED_ORDER_CHANCE` |
| `state.js:79` | `res.value < 3 ? 8 : 4` | `BASE_NEED_LOW` / `BASE_NEED_HIGH` |
| `state.js:80` | `Math.floor(level / 3) * 2` | `LEVEL_NEED_RAMP` |
| `state.js:355` | `coins + 25` (season bonus) | `SEASON_END_BONUS_COINS` |
| `GameScene.js:410` | `const minChain = 3;` | `MIN_CHAIN_LENGTH` (already implicit elsewhere) |
| `GameScene.js:452` | `>= 6 ? 2 : 1` | `DOUBLE_CHAIN_THRESHOLD` |
| `GameScene.js:532-533` | shake intensity formula | inline-named locals + comment |
| `GameScene.js:209` | `y - 500 - random(0,100)` | `INITIAL_DROP_OFFSET` |
| `prototype.jsx:21` | `Math.min(dpr, 3)` | `MAX_DEVICE_PIXEL_RATIO` |
| `ui.jsx:379` | `setTimeout(..., 500)` | `LONG_PRESS_MS` |
| `boss/slice.js:283` | `Math.random() < 0.5` | `WEATHER_ROLL_CHANCE` |
| `apprentices/slice.js:59` | `app.hireCost * 0.25` | `HIRE_REFUND_RATE` |
| `mood/slice.js:26-28` | `0.2 / 0.5 / -0.5` | `BOND_DELTA_*` constants |

### C5. Magic colour hex literals

40+ raw `0xXXXXXX`/`#XXXXXX` literals across `GameScene.js`, `textures.js`, `ui.jsx`, `constants.js`. Centralise in a `theme.js`. The textual side colours (`#f8e7c6`, `#b28b62`, etc.) and the Phaser-side colours (`0xffd248`, `0xff6d00`) need separate tables.

### C6. Long functions

| Function | File | Approx lines | Comment |
|---|---|---|---|
| `drawTileIcon` | textures.js:82 | ~1,200 | Switch over resource keys; one big function |
| `coreReducer` | state.js:154 | ~250 | Switch with deeply nested cases; CHAIN_COLLECTED alone is ~90 lines |
| `redrawPath` | GameScene.js:282 | 113 | Tween bookkeeping + ring burst + node dots + star previews |
| `PhaserMount` effect | prototype.jsx:13 | 76 | Async dynamic import + Phaser config + ResizeObserver wiring + event subscribe |
| `BiomeEntryModal` | ui.jsx:605 | ~134 | Long render block, lots of nested layout |
| `BuildingIllustration` | ui.jsx:739 | ~241 | Per-id branch with hand-drawn divs |
| `TownView` | ui.jsx:1138 | ~345 | Mass of decorative elements + modal trigger logic |
| `boss/slice.js reduce` | 124 | ~180 | Many mutually-nested branches |

### C7. Inline `style={{...}}` everywhere in `ui.jsx`

40+ inline-object style props inside JSX. Each render creates new objects, defeating React reconciliation memoisation. Move to Tailwind classes (the file already uses Tailwind) or static const objects.

### C8. Suspicious / dead local code

- `GameScene.js:65` `_p` parameter never used (ditto `:62` for `prev`).
- `GameScene.js:51-52` and `:57-58` register `pointerup` on both the canvas (via Phaser) and `document` — redundant unless the document handler is the real fallback; the comment helps but the code can be simplified to one mechanism.
- `TileObj.js:67` `if (this.sprite.angle !== 0 && !this._tweenActive())` — the inner branch sets angle=0 even if it was 0; the read+test costs more than the assign.
- `floatText(msg, x, y, color)` in GameScene.js:576 is **always called with `color = 0xffd248`** (`:453`). Dead parameter.
- `state.js:136` `turnsUsed: 0` on hydrate silently discards in-progress board state on every reload — likely intentional but undocumented; document or rename the path.
- `GameScene.js:18-28` constructor pre-initialises a dozen fields that `create()` immediately overwrites or shadows. Fields here are duplicated between constructor and create.
- `apprentices/slice.js:84-87` see A19.

### C9. Inconsistent naming

- Underscore-prefixed fields: `_prevPathLen`, `_prevStarGroups`, `_destroying`, `_phase`, `_tweenActive`, `_hintsShown`, `_questIdSeq`, `_bossSeasonCount` — half are "internal", half are persisted-state booleans. No clear convention.
- Event names: `"chain-collected"`, `"chain-update"`, `"changedata-biomeKey"` — kebab + camel mixed.
- Action types: `"CHAIN_COLLECTED"` (SHOUT_SNAKE), `"BOSS/MINIMIZE"` (SHOUT_SLASH), `"QUESTS/PROGRESS_QUEST"` — fine until you hit `"@@INIT"` (Redux idiom; actually checked in `tutorial/slice.js:51`).

### C10. Save-key inconsistency

- `hearth.save.v1` (state.js)
- `hearth.tutorial.seen` (tutorial slice)
- `hearth.settings` (settings slice)

`SETTINGS/RESET_SAVE` (settings/slice.js:46) does `keys.startsWith('hearth.')` — works only because everyone follows the prefix. Centralise the list of keys (or scope to one root JSON blob).

### C11. Performance smells

- `TileObj.ambient(time)` is called for **every tile every frame** (GameScene.js:584-593). It calls `this.scene.tweens.getTweensOf(this.sprite)` (TileObj.js:80) — internally a linear scan of all tweens. For a 6×7 = 42-tile board at 60fps, that's 2,520 array scans per second when nothing is happening. Cache a flag instead.
- `redrawPath` (GameScene.js:282) does full path redraw on every pointer-enter, including destroying and recreating star sprites. With long chains this becomes O(n) per pointer move.
- `useAudio.js:53-54` does `Object.values(...).reduce(...)` for crafted totals on every state change — cheap individually but it's outside any memo.
- `prototype.jsx:106-113` `DUST_MOTES` array is at module scope (good!), but the 14 `<div>`s each have a fresh inline `style` object on every App render.
- `resourceByKey` in state.js does `Object.values(BIOMES).flatMap(...).find(...)` per call. Cache once into a `Map`.
- `GameScene.resourceByKey` (line 183) does the same scan. Same fix.

### C12. Error handling

- All `localStorage` calls have `try {} catch {}` with **silent empty catch** — a corrupted save returns `null` and silently rebuilds initial state, with no console warning. At minimum, log.
- `prototype.jsx:77-79` only logs on Phaser load failure; the loading text "Loading board…" stays forever. Show a real error UI.
- `textures.js:45` no null check on `tex.getContext()`.
- `boss/slice.js:103` `if (!meta) return state;` — silent. Boss key typos go nowhere.

---

## D. Prioritised Refactor Roadmap

1. **Fix mood TURN_IN_ORDER (A3)** — 5-line bug; biggest gameplay impact.
2. **Reconcile season sources (A1)** — pick `seasonsCycled` as canonical, drop `seasonIndexForTurns` from the visual or align thresholds. While doing this, fix CLAUDE.md to match `MAX_TURNS` (A2) and the apprentices `/10` divisor.
3. **Move `seasonsCycled` to core state (A16)** and update achievements slice to read it.
4. **Remove dead constants (B8)** and dead code in C8 / A19.
5. **Add Vitest + a meaningful reducer test suite (B6, A14)** — covers regressions for A3, A5, A11, A17 going forward.
6. **Add ESLint with `react-hooks` plugin (B7)** — auto-flags A15.
7. **Eliminate `window.__phaserScene` (B3)** with a ref / context handle.
8. **Centralise theme colours (C5) and bubble factory (C3)** — small mechanical refactor, large readability win.
9. **Split `ui.jsx`, `textures.js`, `GameScene.js` (B1)** — biggest structural cleanup; do after tests are in place.
10. **Migrate save data with a real version key (A12)** and centralise `hearth.*` keys (C10).
11. **Implement or remove `drought`/`frost` weather and `BOSS_META.season` (A7, A8)**.
12. **Add a slice-aware bubble priority system (A5, B5)** so achievements/winter/level-up don't clobber each other.
13. **Cache `resourceByKey` lookup tables (C11)** and store sway data on resources (B9).
14. **Replace per-frame `getTweensOf` in `TileObj.ambient` (C11)** with a flag toggled by tween start/complete.
