# TODO — The Long Return

A living roadmap for what's left to build, the gaps in the current implementation,
and things worth adding. Pairs with the design doc in
[`the_long_return_master_doc_v3.md`](./the_long_return_master_doc_v3.md) — section
references below (`§…`, `Part N §…`) point into it.

Status legend: **[ ]** not started · **[~]** partial · **[deferred]** there's a
`DEFERRED:` note in the code marking the gap.

---

## Done so far (high level)

- **Cleanup** — removed the apprentices feature, season-of-the-year effects, weather rolls, the shovel resource, a11y/quality settings, dead achievements, etc.
- **Story system** — multi-line dialogue + choices schema; `STORY_BEATS`/`SIDE_BEATS`; the rewritten Wren opening + settlement naming; cutscene scenes; the Frostmaw Coexist/Drive-Out fork; side-beat infra + Mira's Letter Bond-8 arc. A full-page **visual decision-tree story editor at `/story/`** (edit titles/scenes/lines/choices + outcomes, author new branches & side beats) + a Simulate tab.
- **Currencies & bonds** — `embers` / `coreIngots` / `gems` / `heirlooms`; multi-tier gift prefs (`loves`/`likes`) + bond bands.
- **Keepers** — Deer-Spirit / Stone-Knocker / Tidesinger encounter config (`src/keepers.js`), `KEEPER/CONFRONT`, a "Face the keeper" affordance on the map.
- **Settlements** — founding (`FOUND_SETTLEMENT`, escalating cost), biomes (`SETTLEMENT_BIOMES` + a shared biome picker reused by map + Town), Hearth-Tokens → the Old-Capital map gate. Founding is now **enforced** reducer-side: `BUILD` / `FARM/ENTER` / `EXPEDITION/DEPART` refuse at unfounded zones, and `FOUND_SETTLEMENT` requires a prior completed settlement (skips `home`). Town view shows a centered "🏗 Found this settlement · N◉" CTA at unfounded zones, with an explanatory chip when the gate blocks.
- **Keeper → settlement completion** — `settlementCompleted` now requires both ≥half buildings AND a keeper choice (`coexist` / `driveout`). `KEEPER/CONFRONT` mints the type's Hearth-Token when it flips a settlement complete, and overrides its own bubble with the Old-Capital unlock message when the third token lands.
- **Boon trees** (Part 1 §X) — six catalogs (3 zone types × 2 paths, 3 boons each) in `src/features/boons/`. `BOON/PURCHASE` deducts Embers (Coexist) or Core Ingots (Drive Out), is gated by the corresponding `keeper_<zone>_<path>` flag, and stacks multiplicatively. Three effect types live: `coin_gain_mult` (chains), `bond_gain_mult` (gifts + order turn-ins), `chain_yield_mult` (resource amount per chain). Full-screen view at `state.view = "boons"` with a ✨ Boons shortcut in the Town header once any keeper has been faced; read-only BM Boons tab in the Story section.
- **Economy** — real-time crafting queue + gem-skip; the Items registry (`ITEMS`); expedition-supply model for mine/harbor (`EXPEDITION/DEPART` + a "Pack provisions" packer) + the `EXPEDITION_FOOD_TURNS` table.
- **Audit cadence** — day-cooldown audit-boss trigger (replaced the seasonal climax).
- **Town redesign** — a procedural town plan (plaza + streets + a planned lot grid + street furniture); walking villagers on the street graph; the farm/mine/harbor entrances moved onto town lots.
- **Balance Manager** — config tabs for every shipped data table: Tiles, Zones, Settlement Biomes, Resources, Items, Recipes, Buildings, Expedition Rations, Story·Dialogue (→ `/story/`), NPCs, Keepers, Boons (read-only), Workers, Tuning, Bosses, Achievements, Daily Rewards (+ Icons / Export / Simulate).
- **Tech-debt sweep (Wave H)** — queued-craft `CLAIM_CRAFT` / `SKIP_CRAFT` now fire `craft_made` from coreReducer and bump `totalCrafted` from the crafting slice (achievements, story beats, `ember_drake` boss progress all advance for queued completions); pruned the 18 unused `char_*` apprentice portrait textures + their `draw*` functions (≈900 lines); collapsed the legacy `applyResourceOverrides` into `applyItemOverrides` (tests migrated, function deleted).

---

## 1. The metaplot — the biggest gap

"The Long Return" as a *multi-settlement metaplot* barely exists yet; the story is still essentially the single home-Vale arc (act 1/2/3).

- [ ] **Hollow Pact / Charter** (Part 2 §III, Part 4 §III, Part 2 §V) — the six pact terms; violation tracking (every Drive-Out breaks term 5); charter audits; the finale's "Ember reads your record" → offers the next century's Charter terms shaped by your choices (order, currency proportions, who you drove out). *Today: `keeper_<zone>_<path>` flags + Embers/Ingots are recorded; boons spend them, but the Charter itself doesn't read them yet.*
- [ ] **Kingdom story phases** (Part 4 §III: First Light → Network Wakes → Charter Stirs → Old Capital → Sandbox) + cross-settlement NPC-arrival timing / order consequences (Part 4 §XVIII).
- [ ] **More Bond-8 arcs** (Part 4 §II) — Bram's Brother's Tools, Liss's Buried Charter, Tomas's recurring Lane-Naming. *(Only Mira's Letter exists.)*
- [ ] **Banner Emblem** (Part 4 §V) — post-finale sandbox lock-in (5 emblem choices).
- [ ] **Old Capital finale** — the map node is a locked stub (PR #360); no travel-to-capital flow; the finale itself is "TBD" per the doc.
- [ ] **Choice-log viewer** — `choiceLog` is persisted; no player-facing UI.
- [~] **Onboarding sequence** (Part 4 §I) — Beat 1 (Wren opening) + Beat 3 (naming) done; Beat 2 (Wren's brief), Beat 4 (first puzzle round), Beats 5–N (first-settlement tutorial) not.

## 2. Settlement & world systems

- [~] **Keeper iteration** — Drive Out should be a high-difficulty round with the keeper as a hazard to outlast (currently a direct claim); encounters should *appear/trigger* (a side-beat or map prompt) rather than only being reachable via the "Face the keeper" button. *(Bramble-Folk forest-biome keeper variant is out of scope for now — sticking to three keepers / three Hearth-Tokens.)*
- [deferred] **Biome hazards → GameScene** — `SETTLEMENT_BIOMES` exist but the chosen biome's hazards aren't fed to the board's hazard spawning (still reads the static `ZONES[].dangers`); the biome `bonus` is descriptive, not a real spawn multiplier. *(Skipped for now by request.)*
- [~] **Expedition flow loose ends** — remove the dead tier-entry actions (`MINE/ENTER` / `HARBOR/ENTER` / `ENTER_MINE`) + their tests now `EXPEDITION/DEPART` superseded them; NPC-bond food modifiers (Mira bond 10 → Iron Rations +1) + building-tier modifiers (Larder +1/tier) aren't applied; the forward-declared food recipes (`cured_meat`, `festival_loaf`, `wedding_pie`, `iron_ration`) don't exist in the resource pipeline yet.
- [ ] **Tool crossover matrix** (Part 1 §IX) — tools doing different things per zone (rake → weeds in farm / dust in mine, etc.) is only partially there.
- [ ] **Specialization-from-buildings** (Part 1 §IV §89–109) — *lower priority / changed scope: all buildings are kept available everywhere for now.*

## 3. Phase-6 content (onboarding · townsfolk · side events · festival)

- [~] **Walking townsfolk** — done (they walk the streets), but: no goal-driven errands (Mira carrying bread bakery→inn); clicking a villager doesn't open dialogue; depth-sorting with buildings is missing (see §6).
- [~] **Modular tutorial framework** — there's a tutorial slice + a "Welcome" modal; the doc wants a framework where any feature can register steps.
- [ ] **Random side events / wayside encounters** (Part 4 §IV, Part 5 §IV) — the `SIDE_BEATS` infra exists (bond arcs); the `crossroads` (event) and `fairground` (festival) map nodes have no content/mechanics.
- [ ] **Recurring festival** — currently the one-time "Harvest Festival" *is* the act-3 win condition; the doc wants it recurring on a cadence (reuse the audit-boss day-cooldown pattern).

## 4. Quests

- [~] **Daily quest pools per NPC** (Part 5 §I — Mira's/Bram's/Liss's/Tomas's/Wren's templates) — there's an `orders` system (`makeOrder`) but not the structured per-NPC pools from the doc.
- [ ] **Personal-arc + kingdom story quests** (Part 5 §II–III).
- [ ] **A Quests tab in the Balance Manager.**

## 5. Bosses

- [ ] **Keeper boss rounds** (Part 4 §IV — Deer-Spirit/Stone-Knocker/Tidesinger as hazard-to-outlast rounds for the Drive-Out path).
- [ ] **The Drake** (deep tundra-mine), **the Tidesinger's Test** (harbor weather event), **the Ember** (Old-Capital finale boss).
- [ ] Decide how the **"phase 39 boss season overhaul" design doc** (omen / pressure / aftermath) fits with the current model.
- [ ] BM Bosses tab → expose `modifier.type` / `params`.

## 6. Town UX polish (the redesign — open items)

- [ ] **Depth-sort the walking villagers *with* the buildings** (they always render on top now — a back-lane villager draws over a mid-row building).
- [ ] **Drop the farm/mine/harbor board tiles to main-street level + short spur roads** connecting them (a cart-track to the mine, a pier to the harbor).
- [ ] Richer plaza/ground textures; day-night lamp glow; spread the villager spawn so they don't bunch at a waypoint; occasional building-doorstep visits.
- [ ] **Remove the now-hidden legacy foreground `roadPath`** in `Town.jsx`.
- [ ] Tighten the perspective so tall buildings (silo/portal) sit right on their square lots.

## 7. Balance Manager polish

- [ ] **Bosses** → modifier params · **Achievements** → the `counter` · **Daily Rewards** → tool/tile-unlock drops · **NPCs** → order-line templates + `GIFT_DELTAS` · **Boons** → editable name/desc/cost/effect params (the tab ships read-only; needs an `applyBoonOverrides` paralleling `applyKeeperOverrides`).
- [ ] Maybe a **Map/cartography** tab (zone positions, edges, regions) and an **Abilities-catalog** viewer.

## 8. Cleanup / tech debt (`DEFERRED:` notes in the code)

- [deferred] Remove the dead tier-entry actions (`MINE/ENTER` / `HARBOR/ENTER` / `ENTER_MINE`) + their tests.
- [ ] A handful of lint errors remain in code merged after Wave A — setState-in-effect in `FlagsTab.jsx` / `Inspector.jsx` / `Modals.jsx`, refs-during-render in `storyEditor/index.jsx`, and a `prototype.jsx` exhaustive-deps warning. The original Icon.jsx + RichText.jsx unused-`React` issues are gone (the perf-pass commits cleaned them up). Decide per case whether each warrants a refactor vs. a documented disable.

---

## Recommended next 4–5

Wave A (the playable spine) and Wave H (tech-debt sweep — queued-craft event hookup, prune unused char_* portraits, converge `applyResourceOverrides` → `applyItemOverrides`) have landed. The dead tier-entry actions (`MINE/ENTER` / `HARBOR/ENTER` / `ENTER_MINE`) remain — they're harmless until the expedition flow gets revisited. Next:

1. **Keeper iteration** — Drive Out as a hazard-to-outlast round (reuses the boss machinery), and a side-beat / map auto-prompt for the encounter so players don't have to seek out the "Face the keeper" button. Pays off the boon trees with more interesting paths.
2. **Recurring festival** — turn the one-shot act-3 "Harvest Festival" into a day-cooldown event that grants small rewards. Reuses the audit-boss cadence pattern.
3. **Daily quest pools per NPC** — extend `makeOrder` with Mira/Bram/Liss/Tomas/Wren templates from Part 5 §I, plus a Quests BM tab. Gives the per-NPC bonds something narrative to do alongside boons.
4. **Expedition flow loose ends** — remove the dead tier-entry actions + their tests now `EXPEDITION/DEPART` fully supersedes them; wire the NPC-bond / building-tier food modifiers; add the forward-declared recipes (`cured_meat`, `festival_loaf`, `wedding_pie`, `iron_ration`).

Heavier / needs design input — hold for a dedicated session: the **Hollow Pact / Charter metaplot** + the **Old Capital finale**, and reconciling the **phase-39 boss overhaul**.
