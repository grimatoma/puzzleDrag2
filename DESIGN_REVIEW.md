# Hearthlands — Design Review (Round 2)

*Reviewed 2026-05-05 on `claude/update-design-review-R2nJk` against `c911013`. Prior review (`YMCfJ`, 2026-05-04) audited connectivity — does each system do anything? This review audits the **fun**: now that everything is wired, does it feel good to play?*

---

## TL;DR

Round 1 connected the wires. Round 2 has to admit some of the wires are connected to broken outlets.

The core loop — drag, chain, upgrade, deliver, build — is **legible and rhythmic**. The visual chain juice (Tier C polish in `GameScene.collectPath`) is genuinely satisfying, the season effect badge in the HUD finally communicates the seasonal rule, and Townsfolk-modal-as-hub is a clean information architecture.

But the supporting systems that should layer texture on top of that loop are silently failing the player in three ways:

1. **The game opens with a hidden 30% tax on every order, paid for the first ~14 deliveries to each NPC.** Every NPC starts at bond `1` ("Sour", `×0.70` reward). No one tells you. ~7–9 hours of wall-time penalty before bonds saturate.
2. **Apprentices are a *negative*-ROI hire for 5 of 6 characters.** The math is upside-down. Hiring punishes you.
3. **Three of four boss climaxes have no board modifier**, the boss reward never scales (flat `+200◉` from year 1 to year ∞), and Ember Drake's win condition can be satisfied by crafting *bread*. The "year capstone" doesn't capstone anything.

These aren't connectivity bugs. They're tuning bugs and design-intent bugs, which means a second-round of polish, not a rewrite. The chassis is solid. The dial settings are wrong.

> A new player today will: drag tiles for 8 satisfying turns, hit a season summary, glance at Townsfolk and see a "Sour" face on every villager, hire Hilda for 200◉ to "help out", watch her bleed 18◉/season net, never learn that Mira loves flour because flour requires building the Mill, and decide the simulation parts of this game are fake.

---

## Part 1 — The 30% Tax: Mood Is Hostile By Default

`src/features/mood/slice.js:4` initializes every NPC at `bond: 1`. `src/features/mood/data.js:9-14` then puts that bond in the **Sour** band, which multiplies every order reward by `×0.70`.

A delivery grants `+0.3` bond (`mood/slice.js:59`). A non-favorite gift grants `+0.2` (`mood/slice.js:26`). To reach **Warm** (`bond ≥ 5`, the neutral `×1.00` band) for one NPC requires:

- **14 deliveries** to that specific NPC (`(5 − 1) / 0.3 = 13.3`), or
- a mix of deliveries and favorite gifts.

Favorite gifts are themselves gated:

| NPC | Favorite | Earliest in-game access |
|-----|----------|--------------------------|
| Mira | `flour` | requires Mill (200◉ + 30 plank) → 4 hay→wheat→grain→flour upgrade chain |
| Tomas | `jam` | requires berry chain-upgrade (or larder crafting) |
| Bram | `ingot` | requires Forge (1200◉ + 60 stone + 20 ingot — circular) |
| Liss | `jam` | same as Tomas |
| Wren | `plank` | log chain-upgrade |

So during the first 30+ minutes of play, **the player cannot give a favorite gift to any of the five NPCs**, and is paying a stealth `0.70×` modifier on every order they fill. The HUD does not show the modifier. The Townsfolk modal shows "Sour" with no plain-English explanation that this means "I am paying you 30% less".

**Decay is also asymmetric.** Above 5 hearts, bond decays `−0.1` per season (`mood/slice.js:78`). Below 5, no decay. So once you escape the Sour trap, the system also gently nudges you back toward neutral — a treadmill for the late game.

### The fix

Pick one. Two are cheap:

1. **Start at bond 5 ("Warm", ×1.00). Decay below 5 if neglected. Reward bond → ×1.10/×1.25 only.** Mood becomes a *bonus* layer rather than a default penalty. The player never feels "I'm being punished for not yet knowing this exists." (~10 lines: change `initial` to `{ npc: 5, ... }` and flip the band semantics; remove the `>5` guard on decay.)
2. **Surface the modifier in the order card.** Each compact order (`ui.jsx:CompactOrders`) already knows the NPC. Show the next-payment number — `+135◉ (×0.7)` instead of just `+135◉`. The player makes peace with the system because they can *see* it.

Either alone helps. Both is correct.

---

## Part 2 — The Math Doesn't Work

### 2.1 Apprentices have negative ROI for 5 of 6 hires

Pulled from `src/features/apprentices/data.js`. Resource value taken from `BIOMES.*.resources[].value`. "Net" = season payout in raw resource value − wage:

| Apprentice | Hire | Wage | Produces | Raw value | **Net per season** |
|------------|------|------|----------|-----------|---------------------|
| Hilda      | 200◉ | 30   | hay×8 + log×4 | 8·1 + 4·2 = **16** | **−14◉** |
| Pip        | 150◉ | 25   | berry×5 + egg×2 | 5·3 + 2·3 = **21** | **−4◉** |
| Tuck       | 100◉ | 20   | coins×25 | **25** | **+5◉** |
| Wila       | 300◉ | 40   | jam×2 + flour×3 | 2·5 + 3·6 = **28** | **−12◉** |
| Dren       | 350◉ | 50   | stone×6 + ore×3 | 6·1 + 3·3 = **15** | **−35◉** |
| Osric      | 500◉ | 80   | ingot×1 + plank×4 | 1·6 + 4·4 = **22** | **−58◉** |

Tuck is the only positive-ROI hire, and his payback period is **20 seasons** (`100◉ / 5◉ ≈ 20`), which at 8 turns × ~30 sec/turn ≈ 80 minutes of play before he breaks even.

The *intent* is presumably "the resources are worth more than their list value because they fulfill orders / save building costs / feed crafting." That's a reasonable spreadsheet model — but it's invisible. The UI (`apprentices/index.jsx`) shows hire cost and produced resources, not expected return. So a player who reads the numbers in good faith concludes the system is broken (because mathematically, it is).

There's also a **harsh failure mode** in `apprentices/slice.js:82`: if `coins < wage` at season end, the apprentice is auto-fired with no refund. New players hovering near 0 coins will lose hires they can't afford to replace, which feels like a soft-lock rather than a meaningful loss.

**Fix priorities:**
- **Rebalance wages so resource value alone covers wage at fair-market rate**, then let the order/building/craft demand make the hire feel like profit. Roughly: halve every wage. (One-line per row in `data.js`.)
- **Replace auto-fire with debt** (wages roll over, NPC produces nothing until paid). Or: half-wage at half-output. Anything but ejection.
- **Show projected weekly income in the hire card.** Turn the spreadsheet into UI.

### 2.2 The boss climax doesn't climax

`src/features/boss/slice.js:166-178`. Every boss victory pays **flat `+200◉`**. By year 4, the player is earning 200◉ in roughly 3 orders. The capstone of an entire year is a tip.

Worse, three of the four bosses have **no mechanical effect on the board at all**:

| Boss | `minChain` | Special |
|------|-----------|---------|
| Frostmaw    | 5 | None besides the chain wall |
| Quagmire    | null | Nothing — just "harvest 50 hay" |
| Ember Drake | null | Nothing — and see below |
| Old Stoneface | null | Nothing — just "quarry 20 stone" |

So three of four bosses are functionally identical to a quest. Frostmaw is the only one that meaningfully changes how the board plays.

**Ember Drake is broken.** Lines 246–254:

```js
case "CRAFTING/CRAFT_RECIPE": {
  if (!state.boss || state.boss.resource !== "ingot") return state;
  const newProgress = ...(state.boss.progress || 0) + 1;
  ...
}
```

Any crafted recipe — bread, honey roll, cobble path, lantern — counts `+1` toward the Drake's "Forge 3 ingots" target. The Drake can be defeated by crafting three loaves of bread.

**Boss-turn confusion.** `meta.turns: 5` is the deadline (`boss/slice.js:115`), decremented in `CLOSE_SEASON` (`:264-269`). So bosses run for **5 full seasons (40 board turns)**, not 5 board turns. Frostmaw's "30 logs in 5 turns" → really 30 logs in 40 turns, with `minChain: 5`. Old Stoneface's "20 stone in 5 turns" → 20 stone in 40 turns of mine biome, with no modifier. Mathematically trivial.

**Weather rolls during a boss are silently suppressed** (`:278: "No weather roll this season — the boss is the event"`), which is correct — but during the 5-season boss the game's only ambient flavor system is silenced for an in-game year, leaving long stretches that are *more* mechanically empty than non-boss play, not less.

**Fix priorities:**
- **Each boss gets a board modifier**, even a small one. Quagmire spawns extra log/hay (already its theme). Drake heat-ignites tiles after N turns. Stoneface adds rubble tiles that block. Frostmaw's `minChain: 5` is the model.
- **Boss reward scales with year** (year-2 Quagmire pays 400◉, year-3 Drake 600◉, etc.) — or pays a recipe blueprint, an apprentice unlock token, or a permanent +1 turn-per-season buff. Currently the only thing that goes "up" over a long run is your inventory clutter.
- **Fix Ember Drake.** Either count only ingot-output recipes, or rename to "craft any 3 metalworks" and gate to forge.
- **Reduce boss-window from 5 seasons to 1.** A climax that gives you two real-time hours to clear is not a climax.

### 2.3 The almanac is a slow drip

`ALMANAC_TIERS` has 10 tiers (`constants.js:183-194`). Tier `N` costs `N × 100` almanacXp (`quests/index.jsx:46`). Quests pay 20–40 XP each (`constants.js:174-181`); 3 dailies/season, all-claimed run ≈ **90 XP/season**.

- Tier 1 (50◉): claimable around season 2.
- Tier 10 (100◉ + rare tool): claimable around **season 60** — roughly 15 in-game years.

The reward curve is also flat: `[50◉, shuffle, 75◉, basic, 100◉, rare, 150◉, 2× shuffle, 200◉, 100◉ + rare]`. Tiers 7–10 are coin trickles plus a handful of tools the player can never run out of. There's no "almanac unlocks the X system" payoff at any milestone — the entire track is consumables.

**Fix:** Either (a) compress to 5 tiers with bigger jumps and a cosmetic/structural reward at tier 5 (a permanent +1 starting tool, a recipe scroll, a boss intel preview, etc.), or (b) speed up XP gain so the back half of the track is actually reachable in a normal run.

---

## Part 3 — Flow Problems

### 3.1 Turn time-scales are mixed and confusing

The game has at least four "turn" concepts:

| What ticks | Counter | Resets when |
|-----------|---------|-------------|
| Match-3 board turn | `state.turnsUsed` (0–7) | season end |
| Season effect | `seasonsCycled % 4` | every 8 board turns |
| Boss "turns left" | `state.boss.turnsLeft` (5→0) | season end |
| Weather "turns left" | `state.weatherTurnsLeft` (2-3→0) | board turn (`CHAIN_COLLECTED`) |

So the player is asked to internalize: "Spring +20% (8 board turns) → Frostmaw deadline (5 *seasons*) → Rain (3 *board turns*) → Daily quest (1 *season*)". These overlap inscrutably. A player budgeting "I'll use rain to double my berries" can't tell from the UI whether rain ends this turn or next season.

**Fix:** Pick one canonical clock — board turns — and re-express the others in it. Frostmaw should say "30 logs in 40 turns". The boss panel should count down board turns. Weather already does this (good), but doesn't surface the count anywhere.

### 3.2 The 8-turn season is still too short for real strategy

The previous review flagged this. It hasn't changed. `MAX_TURNS = 8`. Add the *new* season effects on top:

- **Winter** (`seasonsCycled % 4 === 3`): chains < 4 forfeit the turn (`state.js:175-189`). Combined with an 8-turn budget, a single rough Winter board can wipe your harvest year. The Winter penalty is **discoverability hostile** — a new player drags a 3-chain in Winter, gets a "❄️ Winter: chains need 4+!" bubble *once*, watches their turn count tick up, and learns the rule by losing.
- **Summer** (`×2 order pay`): great, but order replacement is `makeOrder` with no guarantee that the next order is fillable from current inventory. Often Summer ends with you holding the *next* fillable order, and the bonus is wasted.

**Fix options (ranked):**
1. Extend to 12 turns. Doubles the strategic surface area without doubling session length (chains compound, so a 12-turn season is ≈1.5× 8-turn play time).
2. Let the player choose to bank turns ("rest a turn for +1 next season") so Winter's penalty has counter-play.
3. Telegraph the next order before delivering the current one, so Summer can be planned.

### 3.3 Drought and Frost weather are placeholders

`boss/slice.js:65-83` declares four weather kinds. The reducer (`:218-231`) implements only `rain` (berry double) and `harvest_moon` (+1 upgrade). `drought` ("wheat and grain spawn 50% rarer") and `frost` ("tile drops slow") have descriptions and emoji but **no implementation in the spawn pipeline** (`GameScene.randomResource()` doesn't read weather state).

A 50% chance per season to roll one of four weathers, half of which do nothing. Players who get drought/frost three runs in a row will conclude the system is decoration — and they'll be right.

**Fix:** Either implement them in `GameScene.randomResource()` (read `registry.get("weather")`, bias the pool), or remove them from the weather table. Don't ship dead-weight RNG.

### 3.4 "Excess" inventory tag has no verb

`InventoryGrid` (`ui.jsx:232-283`) tags resource cells as `ready / needed / excess / idle`. "Excess" is shown when the player holds a resource no open order asks for. There is no action attached to "excess" — no sell, no convert, no gift shortcut. The label diagnoses without prescribing.

A grain (value 4) that nobody ordered just sits there. No "sell for 8◉" button, no "gift to a Sour NPC" shortcut. The only sink is to chain it forward (if it has a `next`) or hope an order eventually asks for it.

**Fix (cheap):** Click an "Excess" cell → modal that offers (a) sell for ½ value, (b) gift to an NPC who likes it (auto-routes to favorite-mood NPCs first). Both already have backing logic; this is a UI re-route.

### 3.5 The starting-pool tilts toward dead-end resources

`BIOMES.farm.pool = ["hay","hay","hay","log","log","wheat","berry","berry","egg"]` (9 entries):

| Tile | Spawn rate | Has `next`? | Used by orders L1? |
|------|-----------|-------------|---------------------|
| hay  | 33% | wheat | ✓ |
| log  | 22% | plank | ✓ |
| wheat| 11% | grain | rare |
| berry| 22% | jam | ✓ |
| egg  | 11% | none | ✓ |

So **44% of spawns go to "starter" tiers (hay, log) the player wants to upgrade away from**, while wheat (the only path to flour, the only path to bread, the only path to Mira's favorite) spawns 11%. The player's first 2 hours feel like swimming in straw waiting for wheat to arrive in clusters of 3+.

**Fix:** Either rebalance the pool toward mid-tier resources, or add a **deck-builder seed** mechanic where each season the player picks 1 of 3 "this season's pool tilts" cards. That converts the most boring part of the loop (RNG patience) into a decision.

### 3.6 Tools are forgettable

Starting tools `{ clear: 2, basic: 1, rare: 1, shuffle: 0 }` (`state.js:108`) — refilled +1 shuffle per season (`state.js:351`) and via almanac. The four tools collapse into two functions:

- **Scythe** (clear): clears tiles, gives +5 basic
- **Seedpack** (basic): gives +5 basic
- **Lockbox** (rare): gives +2 of `biome.resources[4]`
- **Reshuffle Horn**: re-rolls all tiles

Scythe and Seedpack are mechanically identical from the inventory's perspective. Lockbox grants 2 of a hardcoded slot — `mine.resources[4]` is `ingot`, which the player desperately wants late-game; `farm.resources[4]` is `log`, which the player has too much of. The tool's value swings wildly by biome with no signaling.

**Fix:** Differentiate the tools mechanically — Scythe should *clear an area* (board manipulation), Seedpack should *salt-add* a resource of player choice. Lockbox should grant a player-picked resource from a 3-tier menu, not a hardcoded index.

---

## Part 4 — Smaller Smells

These are individually minor but each erodes trust:

- **Cartography is a dressed-up biome switcher.** `cartography/slice.js:60-75` translates `CARTO/TRAVEL` into either `biomeKey: "farm"`, `biomeKey: "mine"`, `view: "town"`, or a modal route. The map's 9 nodes and adjacency rules add UI cost but no mechanical depth — they could be deleted in favor of a 2-button biome toggle without losing gameplay. Verdict: keep only if you intend to add per-node modifiers (resource bonuses, unique encounters, stat dice).
- **Tutorial leaves no trail.** `_hintsShown` flags fire bubbles once each (`state.js:222, 228, 331, 334, 181`). If the player dismisses or misses one, there's no retrieval — no `?` icon, no Almanac entry, no help screen. New players who alt-tab during the level-2 bubble never learn the mine biome exists.
- **Recipe-order display is bilingual.** When an order asks for a crafted item, it shows the recipe's `glyph` + `name` (`ui.jsx:144`). When it asks for a raw resource, it shows the resource's `glyph` + `label`. Subtle — but a new player can't tell "Bread Loaf" from "Flour" at a glance because the visual treatment is identical (same card, same colors).
- **`SeasonModal` ends a season without a stats history.** The summary shows current-season counts and disappears on click. There's no "year so far" view anywhere. Achievements track totals, but the season-by-season experience evaporates.
- **The dev-only menu is exposed in the HUD's hamburger.** `Hud` opens `modal: "menu"`, which the prior review didn't catch. If `DEV/ADD_GOLD` and `DEV/FILL_STORAGE` are debug actions (`state.js:365-376`), they shouldn't be reachable from the production menu. Either gate behind `import.meta.env.DEV` or remove.
- **"Lockbox" tooltip lies.** Lockbox is `+2 rare resources` (`ui.jsx:20`). It actually grants `+2` of `biome.resources[4]`, which is `wheat` on farm and `ingot` on mine. Wheat is not a "rare resource". Either rename or fix the index.

---

## Part 5 — Suggestions, Ranked by ROI

### Tier 1 — Tuning. Half a day's work each.

1. **Start every NPC at bond 5 (Warm, ×1.00).** Reword bands as bonus-only (Warm 1.0, Liked 1.15, Beloved 1.25). Remove decay below 5. *Files:* `mood/slice.js:4`, `mood/data.js:9-14`. **Eliminates the 30% stealth tax.**
2. **Halve apprentice wages.** *Files:* `apprentices/data.js:8,19,30,41,52,63`. Re-test ROI. Bonus: replace auto-fire (`apprentices/slice.js:82-87`) with "no production this season; debt rolls over".
3. **Show the modifier on order cards.** `CompactOrders` (`ui.jsx:136-163`) already has the NPC; surface `(×0.7)` / `(×1.25)` next to the reward.
4. **Either implement drought/frost in `GameScene.randomResource()`, or delete them from `WEATHER_KEYS`.** No half-systems.
5. **Fix Ember Drake.** `boss/slice.js:246` should check the recipe's *output* resource (`RECIPES[key].output === "ingot"`), or — easier — change Drake's win condition to "smelt 3 ingots" and credit ingot inventory rather than craft events.
6. **Gate the dev menu behind `import.meta.env.DEV`.** *File:* wherever the menu modal lives.

### Tier 2 — Feature polish. A sprint each.

7. **Boss reward scales by year, and every boss has a board modifier.** Pick three new modifiers (Quagmire: vine tiles that re-spawn over chains, Drake: heat tiles, Stoneface: rubble that breaks after 2 chains). +`200 × year` coins on victory.
8. **Compress almanac to 5 tiers with one structural reward in the middle.** Tier 3 unlocks something: a permanent extra starting tool, a "see next season's effect a turn early" perk, or a fifth daily quest slot. Currently almanac is 100% consumables; it should buy *progression*.
9. **Inventory "Excess" gets a verb.** Click excess cell → sell-for-half / gift-to-NPC menu.
10. **Extend season to 12 turns.** Re-check tuning on Winter chain-min (raise to 5? halve to 2?).
11. **Telegraph next order.** When you turn in an order, show the next one *before* claiming the reward — gives Summer ×2 actual purchase.

### Tier 3 — Strategic depth. A real feature.

12. **Per-season pool draft.** Each new season, present 3 cards: "Wheaten Spring" (wheat 2× weight), "Berry Glut" (berry +2 to pool), "Coalsmoke Autumn" (ore +2). Pick one. Converts pool RNG into a decision and makes seasons mechanically distinct beyond the existing 4-effect rotation.
13. **Recipe-output orders only at L4+, and they pay enough to justify the building chain.** Currently recipes pay `coins × 1.5 × need` (`state.js:73`). A bread order asks for 1–3 breads at 125◉/each × 1.5 ≈ 188–562◉. Sounds OK — but the *cost* of building the bakery (500◉ + 40 plank + 10 stone), unlocking flour (mill + chain progression), and crafting bread is 30+ minutes of investment. The first few crafted orders should pay 2.0× to compensate, then settle.
14. **A real tutorial overlay**, even a 5-step interactive one. Replaces or backs up the milestone-bubbles with something the player can re-open from the hamburger menu.

### Tier 4 — Existential. Optional.

15. **Decide what cartography is for.** If the answer is "biome switcher with extra steps", delete it and ship the headcount-saved as a per-biome pool tilt or per-node encounter system. If the answer is "future dungeon-runs", leave it and seed one node with a unique reward as a teaser.

---

## Part 6 — What's Working

Worth saying so the takedown above doesn't read as a verdict on the whole game:

- **The drag-chain feel is excellent.** Tier C juice (`shakeForChain`, `radialFlash`, `upgradeBurst`, pitch-shifted audio) does what match-3 juice should do — bigger chains feel disproportionately better, and the tier-3 tile preview during the drag (`GameScene.redrawPath:359-391`) is a thoughtful affordance.
- **The HUD season effect badge** (`SeasonBar`, `ui.jsx:79-106`) is the single best information-architecture choice in the game. One glance tells you what rule is active. This pattern should propagate — the same treatment for active weather, active boss, active mood-modifier.
- **The Townsfolk modal as social hub** (`TownsfolkModal`, `ui.jsx:545-579`) consolidates mood / apprentices / orders cleanly. Top tabs are the right shape. Don't fragment this.
- **The auto-claim achievements + NPC bubble** (`achievements/slice.js`) feels good. Reward, voice, vanish — no extra clicks. This pattern (reward → NPC reaction → dismiss) should be the default, and the almanac claim button is the outlier that should match it.
- **Procedural texture pipeline** (`textures.js`) gives the game a coherent look without an asset pipeline. This is undervalued — preserving this constraint will keep the game's identity intact through future feature additions.

---

## Closing

Round 1 was about presence: does the system exist, does it read state, does it write state. Round 2 is about magnitude: does the system pay enough, take enough, mean enough.

Hearthlands now has the right *list* of systems. What it needs is for the systems' numbers to mean what the systems' words promise. Mood should reward, not tax. Apprentices should help, not bleed. Bosses should crescendo, not equal-tip. Weather should affect, not decorate.

These are dial twists, not rewrites. A focused tuning pass — Tier 1 above — would shift the player's opening hour from "the simulation feels fake" to "the simulation feels generous, and I want to keep poking it." That's the difference between a prototype and a thing that gets played twice.
