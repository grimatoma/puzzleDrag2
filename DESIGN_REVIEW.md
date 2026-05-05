# Hearthlands — Design Review

*Reviewed 2026-05-04, branch `claude/game-design-review-YMCfJ`. Played a full season cycle via Playwright + audited all 18 feature slices.*
*Tier S/A/B/C all closed 2026-05-05. See "Scope cuts" callout below for the six feature slices removed to focus the loop.*

---

## TL;DR

You've built the chassis for at least three different games and bolted them onto one screen. The match‑3 + orders + town‑build core works. **Almost everything else is invisible to the player or has no mechanical effect on the loop.** Six of your eighteen feature slices are either unreachable from the UI or they read state and do nothing with it. The remaining "wired" features mostly fire at season‑end so the player never sees cause and effect.

> **Scope cuts (2026-05-05).** Six of the eighteen original slices were *deleted entirely* rather than connected, cutting ~3,135 lines of dead code: **heirlooms, beasts, festivals, glyphs, longnight, memoryweave**. They had no path to the loop without rewriting their consumers, and the cost of dragging them along outweighed the design value. The remaining twelve slices below are all wired, surfaced, and load‑bearing.

If you ship today, a new player will:

1. Drag tiles for ~8 turns.
2. Hit a season summary with 4 stat numbers.
3. Open Town and discover they can't build anything they care about because every interesting building needs **stone** (mine) and **plank** (chain upgrades), but the mine is gated by Lv 2 and there's no signal that chains upgrade tiles.
4. Notice the bottom nav has 8 items and 90% of those screens are empty.
5. Close the tab.

The good news: the core feel is decent, the art direction is consistent, and you can fix most of this without writing new systems — you mostly need to **delete, connect, and surface what's already there.**

---

## Part 1 — What's actually wired vs. what's pretending

I traced every action type, every state field, and every consumer. Original verdict per feature, then what we did with it:

| Feature       | Reachable? | Reads loop events? | Writes affect loop? | Verdict |
|---------------|------------|--------------------|--------------------|---------|
| crafting      | nav        | ✅ inv/coin        | ✅ produces items + fills orders *(Tier A)* | **WIRED** |
| orders        | nav + side panel + dock | ✅ TURN_IN_ORDER | ✅ coin + xp        | **WIRED** (the actual game) |
| quests        | nav        | ✅ chains/orders/build/coins | ✅ coin + almanacXp + tools | **WIRED** |
| mood          | BottomNav → Townsfolk *(PR #50)* | ✅ TURN_IN_ORDER | ✅ ×0.7–×1.5 reward modifier | **WIRED** |
| cartography   | nav        | ✅ map node data   | ✅ feeds heirlooms (now removed); biome/encounter unlocks remain | **WIRED** (thin) |
| tutorial      | milestone bubbles *(Tier A)* | n/a              | n/a                 | **WIRED** |
| achievements  | nav        | ✅ stats           | ✅ rewards auto-granted on unlock *(PR #50)* | **WIRED** |
| inventory     | nav        | ✅ orders state    | ✅ surfaces ready/needed/excess per resource *(Tier C)* | **WIRED** |
| settings      | menu       | ✅ sfx/music/haptics | ✅ flags drive `useAudio` / `navigator.vibrate` *(PR #50)* | **WIRED** |
| almanac       | quests tab | ✅ tracks tier     | ✅ Claim button grants tier rewards | **WIRED** |
| boss          | always‑mounted overlay | ✅ year-boundary trigger *(Tier B)* | ✅ rain/harvest_moon yield bonuses + Frostmaw `minChain: 5` board modifier | **WIRED** |
| apprentices   | BottomNav → Townsfolk *(PR #50)* | ✅ CLOSE_SEASON | ✅ idle income; Inn-gated *(Tier B)* | **WIRED** |

**Removed (2026-05-05) — six slices deleted to cut scope:**

| Feature | Reason removed | Footprint cut |
|---------|----------------|---------------|
| heirlooms     | Achievement → heirloom unlock map already trained players to read achievement bubbles; the heirloom modal added another surface for the same payoff. Bonuses re-folded into achievement reward grants. | ~600 lines (data, slice, modal, achievement coupling) |
| beasts        | Town-header offer fired only at season boundary, drowned by season summary. Resource bonuses too small to redirect play. | ~520 lines |
| longnight     | Year-boundary modal that destroyed a building — punishing without any clear way to play around it, hit once per ~32 turns of play. | ~440 lines |
| festivals     | Buried in a settings tab, fired on season events with market items that duplicated tools. | ~485 lines |
| glyphs        | 12% chain proc with chain bonuses — but unreachable from any nav. Players never knew the system existed. | ~565 lines |
| memoryweave   | Prestige perks (`quickfingers` etc.) declared but never read by `GameScene`. Tier B briefly wired a few; net design cost still exceeded benefit. | ~625 lines |

The achievements slice no longer ships an `ACHIEVEMENT_HEIRLOOM_UNLOCK` map; cartography still exists but its unlocks are biome/encounter‑centric, not heirloom‑centric.

### What this means in plain English *(historical — kept for context)*

These were the original findings. All have been resolved either by wiring (Tier S/A/B/C) or by deletion (the six removed slices).

- ~~**Apprentices is dead code.**~~ → Surfaced via Townsfolk → Apprentices tab; gated behind building the Inn.
- ~~**Heirlooms, Mood, and Glyphs have real mechanical effects but no entry point.**~~ → **Heirlooms and Glyphs deleted.** Mood lives in the Townsfolk modal and modifies order rewards.
- ~~**Achievements show 20 trophies with reward amounts you never receive.**~~ → `checkTrophies` auto-grants `coins+xp` on unlock with an NPC bubble.
- ~~**Almanac tier rewards are the same.**~~ → Claim button in `quests/index.jsx` dispatches `QUESTS/CLAIM_ALMANAC`.
- ~~**Boss tracks weather but never applies it.**~~ → `rain` doubles berry-chain yield, `harvest_moon` grants +1 upgrade per chain. Boss climax (Tier B) replaces the unread `drought`/`frost` modifiers with a Frostmaw `minChain: 5` board rule.
- ~~**Settings flags don't do anything.**~~ → `sfxOn` / `musicOn` / `hapticsOn` all wired through `useAudio` / `navigator.vibrate`.
- ~~**Memoryweave perks are listed but never applied.**~~ → **Memoryweave deleted.** A subset of perks were wired in Tier B before the slice was retired in 2026-05-05; the loop now relies on direct rewards instead of meta-progression.

---

## Part 2 — Brutal critiques of the core loop

### 2.1 The first 3 minutes are a confused funnel

A new player lands in **Town view** with 7 buildings visible, 5 of them locked behind levels they don't understand, and the only one they can afford (the Mill, 200◉ + 30 plank) requires **planks** which don't exist on the starting board. Planks are only produced as upgrades from chaining 3+ logs (which is itself never explained outside the first tutorial bubble).

The progression chain a new player must intuit:
> Drag logs → chain of 3+ produces planks → chain of 3+ planks produces beams → save 30 planks → afford mill → bakery (needs 10 stone) → mine biome (needs Lv 2) → grind stone → return to farm → build bakery → unlock crafting → craft bread → fill bread orders.

Currently *zero of these dependencies are surfaced.* Bakery just shows "200◉ · 30 plank" with no hint that you need stone, no hint that stone is in the mine, no hint that mine is at L2, no hint that orders care about crafted goods.

**Fix:** Add a "what unlocks next" panel — one line: "Need 10 stone → unlock the Mine at Level 2". Use the existing NPC bubble system to drop one hint per real milestone (level up, first plank, first stone in inventory).

### 2.2 The board feels too small and the mechanic too quiet

Screenshots `board-clean.png` and `board-mine.png` show the canvas rendering at roughly 640×360 inside a 1280×800 viewport. The Phaser scene's responsive logic isn't expanding to fill the available container. **The single most important visual element in your game is rendering at ~25% of the available area on desktop.**

Beyond size: the chain visuals (orange line, gold ring) are tasteful but **the moment of harvest is tiny.** A 6‑chain rains the same little `+6 Hay ★ 2` floater as a 3‑chain. Match‑3s live or die on the juice of "the big one." Suggested:

- Screen shake scaling with chain length.
- A bigger flash / radial wipe when an upgrade tile lands (currently a small star icon).
- Chain‑length combo counter that survives between matches (decays over 2–3 seconds) → multiplier on the next chain.

### 2.3 The 8‑turn season is too short for real decision‑making

`MAX_TURNS = 8` and you get one chain per turn. That's eight decisions per season, and 6/8 are just "find the longest chain on the board." Then a forced summary modal interrupts whatever you wanted to do. At present, a single play session feels like a tutorial that never ends.

**Two options:**
1. Lengthen the season to 12–15 turns so chains compound and you can actually deplete a resource type.
2. Make turns *cost* something (stamina, daylight) and let players choose when to end them (tools, building actions).

### 2.4 Leaving the board ends the season — without warning

The reducer does this:
```js
if (state.view === "board" && next !== "board" && state.turnsUsed > 0 && !state.modal) {
  return { ...state, modal: "season", pendingView: next, ... };
}
```
A player tapping "Orders" mid‑session to remember what Tomas wanted **immediately gets a season‑end summary.** This is bad. Two safer patterns:

- Allow free navigation; only end a season when turns are actually exhausted, **or** when the player presses a clear "End Season" button.
- If you *want* leaving the board to be costly, gate it behind a confirm: "End your season early? You'll forfeit unused turns."

I confirmed this bug in screenshots: every single "nav" screenshot I tried after one chain showed the season modal instead of the screen I asked for.

### 2.5 The town view is mostly sky

Look at any town screenshot — `nav-town.png` or `town-with-buildings.png`. The buildings are crammed into the bottom 30%, the sky/hills are 60% empty real estate, and there's no NPC activity, no road traffic, no animation. The screen does nothing visually. Consider:

- Walking NPCs along the road, idling in front of their relevant building.
- Smoke from the hearth/forge when active.
- Day/night cycle tied to season turns (you already track turns).

### 2.6 Resources outnumber consumers

You have 20 resource tiers across two biomes. Of those:

- **Used by orders:** hay, log, wheat, berry, egg, stone, ore, gold, gem (the `pool` arrays).
- **Used by crafting:** flour, egg, jam, ingot, coke, plank, stone, gold, cutgem.
- **Used only by buildings:** plank, stone, jam, ingot.

That leaves **beam, grain, cobble, block, coke (only via chains), coal, cutgem** as either "you have to chain to unlock this but it's rarely consumed" or "produced but no consumer." Beam is the standout: it has `value: 7`, lovely art, and literally nothing in the game asks for it.

**Fix:** Either delete the dead resource tiers or add late‑game buildings/recipes/orders that demand them. Right now every tile a player upgrades to a tier‑3 resource feels like progress, then sits in inventory rotting.

---

## Part 3 — Suggestions, ranked by ROI

I'd do these in order. Each builds on the last.

### Tier S — Do this week. Cheap, big payoff. ✅ *Done 2026-05-04 (PR #50)*

1. ✅ **Connect the achievement rewards.** `checkTrophies` in `achievements/slice.js` now auto-grants `coins+xp` and marks trophies as `"claimed"` the moment the target is crossed. A Wren/Mira bubble fires on each unlock. Manual CLAIM button removed from the UI.
2. ✅ **Surface heirlooms and mood.** `BottomNav` now includes `✨ Heirlooms`, `💞 Townsfolk`, and `🧑‍🌾 Helpers` buttons that dispatch `OPEN_MODAL` directly. The component now accepts `dispatch` instead of `onChange` so modal and view items are handled uniformly.
3. ✅ **Stop the season modal from ambushing navigation.** The `SET_VIEW` reducer no longer intercepts mid-session navigation. Players may freely browse Orders/Town/Quests; the season summary only fires when all 8 turns are exhausted via `CHAIN_COLLECTED`.
4. ✅ **Wire achievement → heirloom unlocks.** `ACHIEVEMENT_HEIRLOOM_UNLOCK` map in `achievements/slice.js` wires 10 achievements to specific heirlooms (e.g. chain_6 → Ember Shard, orders_5 → Chimes, build_7 → Pale Crown). Unlock fires alongside the reward grant and announces via NPC bubble.
5. ✅ **Delete or use (per-item resolution):**
   - *Apprentices* — surfaced via `🧑‍🌾 Helpers` in BottomNav; the existing modal now has a door.
   - *Settings flags* — `sfxOn`/`musicOn` already wired via `useAudio.js`; `hapticsOn` now calls `navigator.vibrate(40)` on chain collect.
   - *Almanac unclaimable rewards* — Claim button was already wired in `quests/index.jsx` / `QUESTS/CLAIM_ALMANAC`; no change needed.
   - *Boss weather* — `rain` doubles berry-chain yield and `harvest_moon` grants +1 upgraded resource in `boss/slice.js` `CHAIN_COLLECTED`; `drought`/`frost` are board-level spawn-rate changes, deferred to Tier A.

### Tier A — Next sprint. The "actually a game" tier. ✅ *Done 2026-05-04 (PR #52)*

6. ✅ **Crafted items satisfy orders.** `makeOrder` at level 3+ has a 30% chance to pick from `CRAFTED_FARM_POOL`/`CRAFTED_MINE_POOL`. Orders display shows recipe glyph and purple card styling. `TURN_IN_ORDER` deducts by key so no extra work needed for fulfillment.
7. ✅ **Tutorial flow rewrite.** Old 6-step upfront tutorial replaced with milestone-triggered NPC bubbles: level 2 → mine unlock hint; first upgrade → "chain 6+ to snowball" tip; first craft station built → crafting recipe hint; winter first chain under 4 → winter rule reminder. `_hintsShown` flags prevent repeat.
8. ✅ **Visible loop signaling.** `SeasonBar` now shows a two-line label (season name + mechanic effect). `SidePanel` shows a `CompactOrders` strip with glyph, have/need, and ✓ tap to deliver. `SeasonModal` previews the next season's effect badge.
9. ✅ **Make seasons feel different.** Spring = +20% harvest (rounded up); Summer = orders pay 2×; Autumn = double upgrade tiles; Winter = chains require 4+ or turn is wasted. Calendar season = `(seasonsCycled || 0) % 4`.

### Tier B — When the loop is solid. ✅ *Done 2026-05-04*

10. ✅ **Apprentices as offline catch‑up.** Pip (Forager) and Tuck (Lookout) — the previously no-requirement apprentices — now require `{ building: "inn" }`. Inn build fires a "You can now hire Helpers" NPC bubble. The Inn has a gameplay purpose.
11. ✅ **Boss = season climax.** Boss now triggers deterministically at the end of every 4th season (year boundary) using a rotating seasonal lineup: Frostmaw (yr 1) → Quagmire (yr 2) → Ember Drake (yr 3) → Old Stoneface (yr 4). Frostmaw adds a board modifier (`minChain: 5`) enforced in `coreReducer`. Boss victories drop a random unowned heirloom from a curated legendary pool.
12. ✅ **Memoryweave is your meta‑progression.** All 8 perks are wired: `fertileworld`/`richveins` add bonus resources per chain; `keenedge` 50%-refunds tool uses; `eternalforge` refunds 10% build cost; `silvertongue` +5 coins/delivery; `ancestor_call` starts at L2; `coinkin` +50 start coins; `quickfingers` reduces min-chain from 3 to 2 (read from Phaser registry in `GameScene.endPath`).
13. ✅ **Resource pruning.** Added two tier-3 forge recipes that consume the previously dead resources: `ironframe` (2 beam + 1 ingot → 275◉) and `stonework` (2 block + 1 coke → 300◉). Both appear in the mine crafted-order pool at level 3+. Beam and block now have a clear endgame purpose without disrupting the upgrade chain progression.

### Tier C — Polish. ✅ *Done 2026-05-05*

14. ✅ **Bigger board canvas on desktop.** `layoutDims()` in `GameScene.js` now caps tile size at `TILE_BASE * 3.2 * dpr` (was `* 2`), and the desktop game container changed from `aspect-[16/10]` to `aspect-[5/4] max-h-[100dvh]` in `prototype.jsx`. Combined effect: tiles grow from ~96 CSS px to ~135 CSS px on a typical 1080p display, with the 6×7 grid count unchanged (board balance preserved).
15. ✅ **Town animation.** `TownView` in `ui.jsx` now renders four `TownWalker` divs drifting across the road with a head/body silhouette and ground shadow, plus `BuildingSmoke` puffs from any built `hearth`/`bakery`/`forge`. Three slow-drifting cloud divs (`townCloudA`/`townCloudB` keyframes) replace the static cloud blobs.
16. ✅ **Chain‑length juice.** `GameScene.collectPath` now calls `shakeForChain` (`cameras.main.shake`, intensity scales 3-tile → 10+-tile), `radialFlash` (expanding ring at the last tile, peak radius scales with chain length), and `upgradeBurst` (extra flash at every 3rd tile). Audio escalates via `play('chainCollect', { pitch })` — 3-chain at 1×, 10-chain at 1.7×, capped at 2×. Haptics double from 40 ms → 80 ms on chain ≥ 6.
17. ✅ **Clearer inventory panel.** `InventoryGrid` now accepts `orders` and tags each cell as `ready` (green ring + ✓ Order N), `needed` (amber ring + Need N), or `excess` (subtle ring) using `orderStatusByKey`. A legend strip explains the three states.

---

## Part 4 — A proposed cohesion strategy *(updated for the post-cut roster)*

Originally every feature was added in parallel and none of them knew about each other. After the Tier S → C work and the six-slice removal, the remaining systems share a single "season is a small story" pillar:

> **Each season is a small story.** You start with 3 NPC requests (orders), 1 daily challenge (quest), and 1 seasonal modifier (Spring +20% / Summer ×2 / Autumn 2× upgrade / Winter 4+ chain). You play 8 turns, juggling chains to fill those needs while building toward the next building or biome. At season end, the consequences land: stats, mood shifts, apprentice idle income. Every fourth season, a boss climax fires.

The season‑end summary should — and now mostly does — surface:

- ✅ **Stats** (harvests / upgrades / orders / coins).
- ✅ **Next-season effect badge** (`SeasonModal` in `ui.jsx`).
- ✅ **Mood deltas** (Townsfolk modal, accessible from BottomNav).
- ✅ **Apprentice idle income** (paid out at `CLOSE_SEASON`).
- ✅ **Boss climax every 4th season** (rotating lineup; victory drops a curated reward).
- ✅ **Almanac tier rewards** (Claim button in Quests).

Six original moments folded into the same screen, minus the four that depended on removed systems (heirloom drop, festival event, longnight choice, memoryweave gain). The cuts didn't lose content — they removed *failed-to-land* content.

---

## Part 5 — Files touched

### Tier S (PR #50)
1. ✅ `src/features/achievements/slice.js` — auto-grants rewards in `checkTrophies`. The `ACHIEVEMENT_HEIRLOOM_UNLOCK` map shipped here was later removed when heirlooms were deleted.
2. ✅ `src/ui.jsx` — `BottomNav` refactored to accept `dispatch`; modal-opening items wired.
3. ✅ `src/state.js` — navigation trap removed; `SET_VIEW` is now a straight state swap.
4. ✅ `src/features/apprentices/index.jsx` — surfaced via Townsfolk modal.
5. ✅ `src/features/almanac/index.jsx` — Claim button confirmed wired.
6. ✅ `src/features/boss/slice.js` — applies `rain` / `harvest_moon` bonuses in `CHAIN_COLLECTED`.
7. ✅ `src/audio/useAudio.js` — `hapticsOn` wired to `navigator.vibrate(40)` on chain collect.

### Tier A (PR #52)
8. ✅ `src/state.js` `makeOrder` — 30% chance of crafted-item orders at level 3+.
9. ✅ `src/ui.jsx` `SeasonBar` / `SeasonModal` — mechanic effect badges.
10. ✅ `src/state.js` `coreReducer` — Spring/Summer/Autumn/Winter season effects in `CHAIN_COLLECTED` and `TURN_IN_ORDER`.
11. ✅ Tutorial replaced with milestone bubbles via `_hintsShown` flags.

### Tier B (commit 645d7b4)
12. ✅ `src/features/boss/slice.js` — year-boundary climax with rotating lineup; Frostmaw `minChain: 5` enforced in `coreReducer`.
13. ✅ `src/features/apprentices/data.js` — Pip / Tuck gated behind `{ building: "inn" }`; build hint added in `state.js` `BUILD`.
14. ✅ `src/constants.js` `RECIPES` — `ironframe` and `stonework` consume `beam` / `block`.

### Tier C (this branch)
15. ✅ `src/GameScene.js` `layoutDims()` — tile-size ceiling raised from `× 2` to `× 3.2 * dpr`.
16. ✅ `prototype.jsx` — desktop container `aspect-[16/10]` → `aspect-[5/4] max-h-[100dvh]`.
17. ✅ `src/ui.jsx` `TownView` — `TownWalker`, `BuildingSmoke`, drifting clouds. CSS keyframes added in `index.html`.
18. ✅ `src/GameScene.js` `collectPath` — `shakeForChain`, `radialFlash`, `upgradeBurst`. Camera shake intensity and ring radius scale with chain length.
19. ✅ `src/audio/index.js` `play(name, { pitch })` — pitch shifts `chainCollect`. `src/audio/useAudio.js` reads `state.lastChainLength` and computes pitch per chain.
20. ✅ `src/state.js` — adds `lastChainLength` on `CHAIN_COLLECTED`.
21. ✅ `src/ui.jsx` `InventoryGrid` — accepts `orders`, classifies each cell as ready/needed/excess. `src/features/inventory/index.jsx` threads `state.orders` through.

### Scope cut (commits 26418bc, 88a0600)
22. 🗑 Deleted: `src/features/heirlooms/`, `beasts/`, `festivals/`, `glyphs/`, `longnight/`, `memoryweave/`. Slice imports removed from `state.js`. `BottomNav` and `Settings` cleaned of dead nav items. Tests in `tests/e2e/navigation.spec.js` updated for the trimmed nav.

---

## Closing

You had an over‑built game with an under‑connected loop. The fix wasn't more features — it was wiring the ones that mattered, deleting the ones that didn't, and surfacing the ones that already worked. Twelve slices that all do something beat eighteen where six are decoration.

The bones are good. The game now is one game.
