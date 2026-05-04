# Hearthlands — Design Review

*Reviewed 2026-05-04, branch `claude/game-design-review-YMCfJ`. Played a full season cycle via Playwright + audited all 18 feature slices.*

---

## TL;DR

You've built the chassis for at least three different games and bolted them onto one screen. The match‑3 + orders + town‑build core works. **Almost everything else is invisible to the player or has no mechanical effect on the loop.** Six of your eighteen feature slices are either unreachable from the UI or they read state and do nothing with it. The remaining "wired" features mostly fire at season‑end so the player never sees cause and effect.

If you ship today, a new player will:

1. Drag tiles for ~8 turns.
2. Hit a season summary with 4 stat numbers.
3. Open Town and discover they can't build anything they care about because every interesting building needs **stone** (mine) and **plank** (chain upgrades), but the mine is gated by Lv 2 and there's no signal that chains upgrade tiles.
4. Notice the bottom nav has 8 items and 90% of those screens are empty.
5. Close the tab.

The good news: the core feel is decent, the art direction is consistent, and you can fix most of this without writing new systems — you mostly need to **delete, connect, and surface what's already there.**

---

## Part 1 — What's actually wired vs. what's pretending

I traced every action type, every state field, and every consumer. Verdict per feature:

| Feature       | Reachable? | Reads loop events? | Writes affect loop? | Verdict |
|---------------|------------|--------------------|--------------------|---------|
| crafting      | nav        | ✅ inv/coin        | ✅ produces items   | **WIRED** (but items don't fill orders) |
| orders        | nav + side panel | ✅ TURN_IN_ORDER | ✅ coin + xp        | **WIRED** (the actual game) |
| quests        | nav        | ✅ chains/orders/build/coins | ✅ coin + almanacXp + tools | **WIRED** |
| heirlooms     | BottomNav *(PR #50)* | ✅ many hooks  | ✅ +10% coin, +5 hay/season etc. | **WIRED** *(PR #50)* |
| mood          | BottomNav *(PR #50)* | ✅ TURN_IN_ORDER | ✅ ×0.7–×1.5 reward modifier | **WIRED** *(PR #50)* |
| beasts        | town header button | ✅ CLOSE_SEASON | ✅ resource bonus   | **WIRED** (but offers come at seasons only) |
| longnight     | auto‑modal at year boundary | ✅ winter trigger | ✅ can destroy a building | **WIRED but rarely seen** |
| cartography   | nav        | ✅ map node data   | ✅ unlocks feed heirloom slots | **WIRED** (thin) |
| festivals     | settings tab | ✅ season events  | ✅ market items     | **WIRED but buried** |
| glyphs        | **unreachable** | ✅ 12% chain proc | ✅ chain bonuses    | **WIRED but invisible** |
| tutorial      | auto on first board | —          | n/a (UI only)       | WIRED |
| achievements  | nav        | ✅ stats           | ✅ rewards auto-granted on unlock | **WIRED** *(PR #50)* |
| inventory     | nav        | —                  | n/a                 | VISIBLE‑ONLY (read‑only mirror) |
| settings      | menu       | —                  | ❌ flags do nothing | **VISIBLE‑ONLY** |
| almanac       | quests tab | ✅ tracks tier     | ❌ tier rewards never trigger | **VISIBLE‑ONLY** |
| memoryweave   | **unreachable** | ✅ on prestige | ❌ perks declared but none read | **VISIBLE‑ONLY** (cosmetic perk list) |
| boss          | always‑mounted overlay | ✅ tracks pending | ✅ rain/harvest_moon bonuses applied in CHAIN_COLLECTED *(PR #50)*; drought/frost (board-level) still pending | **PARTIAL** *(PR #50)* |
| apprentices   | BottomNav *(PR #50)* | ✅ CLOSE_SEASON | ✅ idle income      | **WIRED** *(PR #50)* |

### What this means in plain English

- **Apprentices is dead code.** The slice runs, the modal renders fine when force‑opened, but nothing in `ui.jsx` ever dispatches `OPEN_MODAL: apprentices`. Delete or surface it.
- **Heirlooms, Mood, and Glyphs have real mechanical effects but no entry point.** I had to call `dispatch({type:'OPEN_MODAL', modal:'heirlooms'})` from devtools to see them. Old Coin (+10% coins on orders) was sitting in the collection unequipped during my entire playthrough.
- **Achievements show 20 trophies with reward amounts you never receive.** The slice tracks the counters but never grants `coins/xp` when targets hit. This is the single most disappointing thing in the game right now — every progress bar is a lie.
- **Almanac tier rewards are the same.** You can earn almanac XP from quests, climb tiers, and… nothing happens. No "claim" button anywhere I could find.
- **Boss tracks weather but never applies it.** `state.weather` and `state.weatherTurnsLeft` get set, but `CHAIN_COLLECTED` doesn't read either field, so a "rainy season" is purely flavor text.
- **Settings flags don't do anything.** Volume, reduce‑motion, etc. are persisted; no consumer.
- **Memoryweave perks are listed but never applied.** "Quickfingers: drag chains 10% faster" — `GameScene.js` has no reference to a multiplier on drag speed.

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

### Tier C — Polish.

14. Bigger board canvas on desktop (the current responsive logic clamps too aggressively — see `layoutDims()` in `GameScene.js:73`).
15. Town animation (smoke, NPCs walking).
16. Chain‑length juice (screen shake, radial flash, escalating SFX).
17. A clearer inventory panel — show *which* resources have unmet orders vs. which are excess.

---

## Part 4 — A proposed cohesion strategy

Right now, every feature was added in parallel. None of them know about each other. Here's a one‑paragraph "design pillar" that would tie things together without writing more systems:

> **Each season is a small story.** You start with 3 NPC requests (orders), 1 daily challenge (quest), and 1 environmental modifier (weather/season). You play 12 turns, juggling chains to fill those needs while building toward a long‑term goal (next building, next heirloom, next biome unlock). At season end, you see the consequences: NPC moods shift, a heirloom is offered, an apprentice hires on, the map advances. **Every system already exists for this.** They just need to fire on the same turn boundary so the player feels them in concert instead of one at a time.

Concretely: the season‑end summary should show **all** of these in one screen:

- Stats (already there)
- Mood deltas per NPC (mood data exists, never surfaced)
- Heirloom drop (heirlooms exist, never auto‑offered)
- Apprentice idle income (apprentices exist, unreachable)
- Map node available (cartography exists, no obvious link)
- Almanac tier reward (almanac exists, never claimed)
- Memoryweave gain (memoryweave exists, abstract)

That's six existing systems unified into one moment of "the world responded to my play." Nothing new. Just connect the wires.

---

## Part 5 — Files I'd touch first ✅ *All done (PR #50)*

1. ✅ `src/features/achievements/slice.js` — auto-grants rewards in `checkTrophies`; `ACHIEVEMENT_HEIRLOOM_UNLOCK` map fires heirloom unlocks.
2. ✅ `src/ui.jsx` — `BottomNav` refactored to accept `dispatch`; added `heirlooms`, `mood`, and `apprentices` modal-opening items.
3. ✅ `src/state.js:241` — navigation trap removed; `SET_VIEW` is now a straight state swap.
4. ✅ `src/features/apprentices/index.jsx` — exposed via `🧑‍🌾 Helpers` nav item; no code deleted.
5. ✅ `src/features/almanac/index.jsx` — Claim button was already wired; confirmed no change needed.
6. ✅ `src/features/boss/slice.js` — imports `BIOMES`; applies `rain` (×2 berry) and `harvest_moon` (+1 upgrade) bonuses in `CHAIN_COLLECTED`.
7. ✅ `src/audio/useAudio.js` — `hapticsOn` wired to `navigator.vibrate(40)` on chain collect.

---

## Closing

You have an over‑built game with an under‑connected loop. The features aren't bad — many are genuinely interesting design ideas — but a feature the player never sees doesn't exist. The ROI of *connecting and surfacing* is dramatically higher than building anything new right now. Cut what you can't connect, surface what you can, and make the season summary the moment everything pays off in one big satisfying screen.

The bones are good. The game is six wires away from being one.
