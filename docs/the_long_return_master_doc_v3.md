# The Long Return — Hearthwood Vale
*Master Living Document, v3*

*A story-driven kingdom-rediscovery game built on a match/chain puzzle engine. Mobile / tablet first. Premium with cosmetic IAP and optional timer-skip gems. No pay-to-win.*

---

# PART 1: GAME DESIGN

## I. Pitch

A century ago, the founding settlement of Hearthwood Vale emptied in a single bad winter. Before the last lantern went out, the founders banked the hearth — not snuffed it — and made a vow: one of their line would return. You are the descendant. You arrive in spring with nothing but the oath and a name. As your smoke rises, sister settlements across the region — quiet for a hundred years — see it from miles away. Their keepers stir. Their descendants walk home.

Your "kingdom" is not built by conquest. It is the **rediscovery of a dormant network of vows**. The game's central verb is *remember*, not *conquer*.

## II. Architecture — World, Round, Session

**Round.** One playthrough of a puzzle board. ~2 minutes, variable turns, four internal seasons for farms only. Pure game time — no real-time inside a round.

**World / Kingdom.** Everything between rounds. Map, buildings, NPCs, supply chain, boons, quests. Partly real-time: buildings produce on a 4-hour real-time tick. Players can pay gems to skip timers — never to gain mechanical puzzle advantage.

**Session.** One real-world play period. Typically 5–15 minutes covering 1–3 rounds plus kingdom management. Designed for phone-in-pocket pacing.

## III. The Map — Multiple Settlements

The game's structural innovation: you don't have one kingdom — you have a **portfolio** of single-purpose settlements that share resources.

**Three settlement types:**
- **Farm** — grain, herds, mounts, trees, herbs, foraged goods
- **Mine** — stone, metal, gems, deep-earth resources
- **Harbor** — fish, pearls, trade goods, sea-treasures

A settlement consists of a **central Vale** (the player's home base with universal buildings) plus **one outer hearth** of the chosen type. Each settlement is a complete narrative arc spanning ~3–6 hours of total play across many sessions.

**Multiple settlements run in parallel.** A player builds a network of specialized settlements. All resources, tools, currencies, and items pool into a **shared kingdom inventory**. Each settlement is independent for story and choice; the economy is global.

### Founding new settlements

The first settlement is free. Each subsequent costs both:
- **A resource fee** (escalating 1.5× per settlement) — paid from the shared pool
- **A progression gate** — must have completed at least one previous settlement (lit its hearth, made the Coexist / Drive Out choice)

This prevents save-scumming while letting committed players expand their kingdom meaningfully.

### The Old Capital

The final location — a meta-endgame accessible from the Kingdoms hub map. Unlocks when the player has completed at least one of each puzzle type and collected the corresponding **Hearth-Tokens**:

- **Heirloom Seed** — from any completed farm settlement
- **Pact-Iron** — from any completed mine settlement
- **Tidesinger's Pearl** — from any completed harbor settlement

Mechanics of the Old Capital finale are deliberately undefined at this stage — to be designed once the rest of the game's identity is firmer.

## IV. Settlement Types, Biomes, and Specializations

Each settlement is defined by three axes of identity.

### Type (what you mine for)

- **Farm** — pastoral resources
- **Mine** — earth resources
- **Harbor** — sea resources

### Biome (chosen at founding, determines hazards and bonuses)

Hazards are **per-settlement, not per-season**. The biome you pick at founding determines which hazards appear in every round at that settlement.

**Farm biomes:**
- **Prairie** — fire, locusts. Bonus: grain yield.
- **Forest** — wolves, fungus. Bonus: wood and herbs.
- **Marsh** — poison, flooding. Bonus: rare herbs.
- **Highland** — frost, rockslide. Bonus: livestock, hardy crops.

**Mine biomes:**
- **Mountain** — cave-in, gas-pocket. Bonus: iron and stone.
- **Tundra** — frost, ice-spike. Bonus: gems.
- **Volcanic** — lava, ash-cloud. Bonus: rare metals.
- **Deep Cave** — bats, sinkhole. Bonus: crystals, runes.

**Harbor biomes:**
- **Coastal** — storm, shark. Bonus: standard fish.
- **Coral** — jellyfish, riptide. Bonus: pearls.
- **Arctic** — iceberg, frostbite. Bonus: exotic catches.
- **Tropical** — cyclone, sea-monster. Bonus: spices, trade goods.

Each biome has 2 hazards plus a resource bonus.

### Specialization (chosen via building investment)

The 2–3 zone-specific buildings you fund first determine your specialization.

**Farm specializations:**
- **Crops** (Mill, Granary, Storehouse) — grain, flour, bread, hay
- **Animals** (Barn, Pasture, Stable, Dovecote) — meat, milk, wool, eggs, leather, mounts
- **Forestry** (Lumber Camp, Drying Rack, Herb Garden, Apothecary) — wood, herbs, foraged goods, tonics
- **Mixed** — moderate of each

**Mine specializations:**
- **Stone** (Quarry, Stonecutter, Sand Pit) — stone, brick, mortar
- **Metal** (Smelter, Ore Washery, Foundry) — iron, copper, silver
- **Gem** (Lapidary, Crystal Chamber, Polisher) — cut gems, rune fragments

**Harbor specializations:**
- **Fish** (Fishery, Smokehouse, Salting House) — fresh fish, cured fish, oil
- **Treasure** (Diver's Hall, Sea-Glass Workshop, Wreck Locator) — pearls, sea-glass, artifacts
- **Trade** (Trading Post, Warehouse, Customs House) — foreign goods, spices

Three axes give massive replayability: a *Marsh Farm specializing in Forestry* plays completely differently from a *Prairie Farm specializing in Crops*. Same type, same minimum kingdom (1 of each), unlimited replay variety.

## V. Puzzle Mechanics

A **turn** is one chain (3+ adjacent same-tiles, 8-direction movement, no tile reuse). The signature mechanic is **threshold star markers**: while dragging a chain, stars light at the 6th, 12th, 18th tiles, showing where upgraded tiles will spawn. Long chains feel intentional, not random.

Hazards from the settlement's biome appear throughout every round at consistent frequency.

## VI. Farm Rounds vs Expedition Rounds

### Farm rounds — year-structured

Farm settlements use a fixed 10-turn round structured as a year:
- **Spring** (turns 1–3) — planting, pollinator bonuses
- **Summer** (turns 4–6) — peak yields
- **Autumn** (turns 7–9) — harvest tiles, lowered upgrade thresholds (6→5)
- **Winter** (turn 10) — climactic turn, stored goods compound bonuses

Seasons in farms drive **bonus mechanics** (pollinators, harvest, etc.) — not hazards. Hazards come from the settlement's biome and appear throughout.

### Expedition rounds — supply-structured

Mine and Harbor rounds have **no seasons and no depth tiers**. They are pure turn-counters:
- Bring food before the round
- Each food item has a turn value (configurable by buildings)
- Play until supplies run out
- Tile distribution is uniform throughout; longer runs = more total rolls at rare tiles
- Hazards from the biome appear consistently

Food values:

| Food | Base Turns | Source |
|------|-----------|--------|
| Apple | 1 | Farm (forestry) |
| Bread | 1 | Bakery |
| Cured meat | 2 | Smokehouse |
| Festival loaf | 2 | Bakery, Mira bond 5+ |
| Wedding pie | 3 | Bakery, Mira bond 10 |
| Iron Ration | 4 | Rare recipe, high bond |

Buildings that boost food efficiency:
- **Larder** — +1 turn per tier to all food items
- **Smokehouse** — +1 to meat-based foods
- **Mining Camp** (Mine settlement only) — +1 to all food in that settlement's expeditions
- **Pier** (Harbor settlement only) — +1 to all food in that settlement's expeditions

### Failure handling

- **Expedition runs out of food** → round ends, you return safely with everything gathered.
- **Lose a keeper boss fight** → keeper retreats, try again after preparation. Resources brought in are kept; one-shot tools are lost.
- **Farm round ends with bad output** → just a low-yield round. No special punishment.

Soft fail across the board. No permanent setbacks. The cost is time and any one-shot consumables used.

## VII. The Central Choice — Coexist or Drive Out

Each settlement's defining decision happens at its outer hearth. After clearing the keeper's challenge rounds, you meet the keeper and choose:

**Coexist.** Negotiate. The keeper stays. The hearth lights with their blessing. The biome keeps its weird, wild properties — special tiles, unusual hazards turned into resources, seasonal events tied to the keeper. Earns **Embers** (spiritual currency).

**Drive Out.** A boss fight. Beat the keeper and claim the hearth outright. The biome becomes orderly and reliable. Hazards still appear (they're biome-based) but tools and active abilities multiply your power. Earns **Ingots** (industrial currency).

**The choice is final per settlement.** To experience the other path, you found a new settlement of that type.

### Mechanical distinction

**Spiritual (Coexist) — control of the board.**
- Boons change *what appears*: spawn rate multipliers, tile transformations (hazards become resources), threshold reductions (6 → 5), passive board effects.
- The keeper actively "tidies" the board at season boundaries within farm rounds.
- One-per-round keeper invocations.
- *The board itself is the weapon.*

**Industrial (Drive Out) — control of what you do.**
- Boons give *more tools, charges, abilities, yield*.
- Tool tier upgrades (rake → iron rake → steel rake).
- One-shot per-round powers (Reaper's Edge, Sapper's Charge).
- Yield multipliers, bonus currency on long chains.
- *The toolbelt is the weapon.*

## VIII. Buildings and Supply Chain

### The pipeline

1. **You generate raw resources via rounds** — grain, wood, stone, ore, fruit, fish, etc.
2. **Buildings refine raw into useful goods** on a flat 4-hour real-time tick.
3. **Refined goods enter the shared kingdom pool.**
4. **Tools, food, and gear feed back into rounds.**

### Universal buildings (at every settlement's central Vale)

- **Hearth** (Wren-domain) — Almanac/XP tracking, perception bonuses
- **Bakery** (Mira) — bread, festival loaves, expedition rations
- **Forge** (Bram) — tools (rake, axe, pick, scythe)
- **Chapel** (Liss) — Dawnbalm, healing charges
- **Inn** (Tomas) — rest bonuses, lane-naming, cartography hints
- **Workshop** — specialty tools (Magic Mirror, Hourglass)
- **Market** — buy/sell at standard prices
- **Granary / Larder** — raw and refined storage

### Zone-specific buildings

3–5 per settlement type, driving specialization (see Section IV).

## IX. Tools and the Crossover Pattern

Tools come from buildings and **cross over between zones**. You bring 3 tools per round (selected from shared inventory).

- **Rake** — clears weeds in Farm; dust hazards in Mine
- **Pick** — breaks stone in Mine; root-tiles in Farm
- **Scythe** — collects grain in Farm; hardened sap or kelp in others
- **Magic Mirror** — universal, different effects per zone
- **Iron Ration** — adds 2 turns to any expedition
- **Dawnbalm** — clears any hazard on any board
- **Hourglass** — reverses one turn

NPC bond improves tool quality. Bram at bond 8 means tools come with +1 charge. Mira at bond 10 means Iron Rations grant 3 turns instead of 2.

## X. Currencies and Boon Trees

**Embers** (spiritual) — from Coexist choices, NPC bonds rising, festivals, keeper offerings, almanac stanzas. Pooled across all settlements.

**Ingots** (industrial) — from Drive Out choices, chain bonuses on 8+ matches, building completions, market sales. Pooled.

No hybrid boons. Each hearth choice unlocks 3–5 zone-specific boons for the chosen path. Currencies fund whatever you've unlocked.

## XI. Bosses

**Bosses appear as encounters, not gates.** They show up on the map when conditions align; you choose when to engage:

- **The Keepers** — confronted to make the Coexist / Drive Out choice at each settlement.
- **Frostmaw** — winter audit, appears each in-game winter at the active settlement until faced.
- **The Drake** — lives in deep tundra-mine biome, encountered in late expeditions there.
- **The Tidesinger's Test** — at certain Harbor biomes during specific weather events.
- **The Ember** (Old Capital finale) — mechanics TBD.

## XII. Monetization

- **Premium one-time purchase** to download.
- **Cosmetic IAP** — banner emblems, decoration packs, NPC outfits.
- **Ads** — watch-to-earn (refresh tools, supply bonus).
- **Gems** — premium currency. Spent only on timer skipping. Never on gameplay advantage.

No gambling, no loot boxes, no time-limited exclusive content.

## XIII. Onboarding

**The first settlement is the tutorial.** Wren walks the player through everything in the first 30–60 minutes. Coexist / Drive Out is the first major decision, gently explained. Multiple settlements aren't mentioned until the first is complete.

Subsequent settlements have far lighter onboarding — a brief framing scene then the player is dropped in.

## XIV. Endgame

After the Old Capital finale, the game shifts to **soft sandbox**:
- Founder's Day cycles annually as kingdom-wide festival
- Visiting descendants bring small events
- Optional Quiet Years (hard-mode winter)
- NPC bonds and arcs continue
- New settlements can still be founded

No NG+. No carried benefits to fresh starts. The endgame is keeping your kingdom alive and growing.

## XV. The Session Loop

1. **Log in.** See building output, refilled tools, currency drift. ~30 sec.
2. **Check the cast.** Pop into the primary settlement; talk to NPCs with pending quests. ~1 min.
3. **Plan.** Pick a settlement, pick a 3-tool loadout. ~30 sec.
4. **Play 1–3 rounds.** ~2 min each.
5. **Manage.** Queue refining, spend currency on boons, gift an NPC. ~1–2 min.
6. **Log out.** Come back in 4 hours or tomorrow.

Total: 5–15 minutes per session.

---

# PART 2: WORLD AND LORE

## I. The World

The Long Return takes place in a region called **the Hearthwood** — a wide, fertile valley network framed by mountains to the north and east, marshlands to the south, and the Saltspray Sea to the west. A hundred years ago this region was home to a federation of small settlements united by a shared founding charter. Today it is mostly empty.

The Hearthwood was never a great empire. It was a federation of holds — Vale, Stoneholm, Tidewatch, Greenmeadow, the Pit, the Orchard-By-Wells — each governing its own affairs but bound by mutual oaths and an annual gathering at the Old Capital.

Outside the Hearthwood, the wider world continues. Cities, kingdoms, baronies — none of them know what happened here. The Hearthwood quietly emptied a century ago, and the world moved on. Only the descendants remember, and only some.

## II. The Original Vale and the Long Silence

The Vale was the first hearth lit in the Hearthwood, eight centuries ago. It was founded by a small band of refugees — survivors of a war elsewhere — who came north looking for unclaimed ground.

They found a land that was *not* unclaimed. The Hollow Folk were already there.

The founders' first winter was brutal. By the time spring came, they were down to seven adults and three children. The Hollow Folk visited them once — slow, lantern-bearing figures who never spoke aloud but communicated through a language of tally-marks and stone-arrangements.

The bargain they offered was this: **the land would be made habitable. Crops would grow. Animals would not flee. The seasons would be regular. In exchange, the founders would maintain the hearths, honor the Charter terms, and renew the Pact every century at the Old Capital.**

The founders agreed. They lit the first hearth at what became Vale. From the first hearth, four others were lit across the region. Six more in the next two centuries. By the time of the abandonment, there were eleven settled holds in the Hearthwood.

**The abandonment** — a century ago, the eleventh winter after the previous Charter renewal, every hold was struck by the same hard winter. There was nothing supernatural about it; just bad weather, blight, and unlucky timing. Half the population died. The other half scattered to cities outside the Hearthwood.

But the founders had made one final agreement before they all left. **They banked their hearths.** They did not snuff them. A founder of each hold remained behind for as long as they could to tend the ember. When the last keeper of any given hold died or left, their hearth went dim. By the time of your arrival, only one hearth still glowed — the one at the Vale, kept by Wren and her line.

Your line.

## III. The Hollow Pact

The original Charter, sworn at the Old Capital eight centuries ago, has six terms. Most have been lost to time, but Liss carries fragments of the original text. The terms are:

1. **The hearths shall not go out.** As long as ember burns, the land remembers. As long as the land remembers, it gives.
2. **The Pact shall be renewed every century at the place of its making.** Failure to renew releases the land from its obligations.
3. **Sister-holds shall share the labor.** No hold may stand alone. Each hold's prosperity is bound to its neighbors.
4. **Names shall be kept.** What is named, remains. What is forgotten, the Hollow Folk reclaim. (Tomas's lane-naming arc is rooted in this.)
5. **The keepers shall be honored.** Each settled biome has a guardian. Their continued presence is not negotiable. (This is the Coexist/Drive Out tension — the original Pact assumed Coexist.)
6. **The Ember shall not be moved.** The original ember at the Old Capital is the contract's anchor. To extinguish or relocate it severs the Pact.

The Drive Out path technically *violates* term 5 — though the Hollow Folk are slow to act, and what counts as "honoring" a keeper is open to interpretation. A player who Drives Out every keeper has effectively broken term 5 in every hold. The Charter renewal will reflect this.

## IV. The Keepers

The keepers are not gods, demons, or spirits in any familiar sense. They are aspects of the land made conscious by the founding bargain. Each represents a kind of stewardship.

**The Deer-Spirit** (farm-Coexist) — a tall, slow-moving figure with the form of a stag and the bearing of an old judge. Speaks in measured tones. Tends grain, herds, and growing things. Its presence makes the soil rich and the animals tame.

**The Stone-Knocker** (mine-Coexist) — a stout, broad figure of living rock with a copper voice. Walks the deep tunnels tapping its knuckles on the walls to test for weak spots. Older than the others. Speaks in clipped phrases.

**The Tidesinger** (harbor-Coexist) — a thin, fluid figure who sings the tides. Voice carries for miles when she chooses. Tends fish runs, weather patterns, and the bones of old wrecks. The most playful of the keepers.

**The Bramble-Folk** (forest-biome subset of farm-Coexist) — a chorus of small voices that speak together. Manage thorns, undergrowth, and woodland creatures. Mostly friendly. Mostly.

There may be other keepers for other biomes, mentioned but not personified in the first version.

A keeper that is Driven Out doesn't die. It withdraws. The biome continues but the relationship is severed — yields stabilize, surprises stop, and the Hollow Folk note the violation against you.

## V. The Ember

The original ember was struck at the Old Capital eight centuries ago using flint from the founders' lost homeland, tinder grown in the first cultivated field, and a single ash-grain from each of the founding seven. It has burned without interruption ever since.

Wren's locket holds a single coal from that ember, kept burning across generations through a complex set of rituals. The first thing she does when you arrive is transfer a coal from her locket to the Vale's main hearth.

The Ember at the Old Capital is the Pact's anchor. When you eventually reach it, the Ember will speak — not in words exactly, but in the felt sense of an old accountant reviewing books. It will read your record. It will know what you did at every hearth, in what order, and with what consequences. It will offer the Charter terms for the next century, with options shaped by your choices.

## VI. The Long Return — Your Story

You are the descendant of the original founders of the Vale. You grew up in a city outside the Hearthwood. You knew the family story but treated it like folklore. Then, sometime in the year before the game starts, you received a letter from someone you'd never met.

The letter was from Wren. It said: *"The ember still burns. I am tired. Come home, if you mean to. If you don't, write back, so I can know to let it out."*

You came.

The game begins with you walking the last mile to the Vale, arriving at the central hearth as Wren is tending it. The first thing she does is hand you the tongs.

---

# PART 3: CHARACTER BIBLES

## I. Wren — The Hearthkeeper

**Age:** ~70.

**Physical:** Weathered, sharp-eyed. Hands stained with ash and pipe tobacco. Wears layered grey wool and a leather apron with a hundred pockets. A silver locket holds a single live coal, always glowing faintly.

**Voice:** Half-mystic, half-pragmatic. Speaks in proverbs but also in blunt practicalities. Refuses to be sentimentalized. Often says "Eh." when she doesn't want to answer. When pleased, she says "Well." When displeased, she says nothing.

**Backstory:** Born into the hearthkeeper line at the Vale. Her mother was the previous keeper. She was 18 when the last other family died and she became sole keeper. She has waited for 52 years. She is not unwell but she is tired in a deep way. Never married. Had one would-be partner long ago who left for the city and never wrote back.

**Daily schedule (first settlement):**
- Morning: at the central Hearth, dictating Almanac stanzas to the player
- Midday: walks to the Inn for tea (after Tomas arrives)
- Afternoon: tends a small herb garden behind her cottage
- Evening: at the Hearth alone, watching the ember

**Gift preferences:**
- *Loved:* old objects from expeditions (rune fragments, sea-glass, weathered coins), wild honey, fine pipe tobacco
- *Liked:* warm bread, herbal tea, polished river stones
- *Disliked:* festival sweets, cut flowers ("too pretty to mean anything")
- *Hated:* alcohol, any iron-cold tool given as gift

**Story arc beats:**
- *Bond 5:* The Almanac unlocks its second tier. Wren tells you about the founders' first winter.
- *Bond 8:* Wren confesses that for a long time, she half-hoped no one would come. She thought she could let the ember out herself, peacefully. *(Multi-choice for player: comfort her / press for more truth / honor the confession in silence)*
- *Bond 10:* Wren formally retires from the keeper role. She passes the silver locket to you. Becomes a "retired" presence — still at the Vale, still has dialogue, but no longer dictates the Almanac.

## II. Mira — The Baker

**Age:** ~30.

**Physical:** Strong arms, flour-dusted apron, hair tied back. A small burn scar on her left forearm from a childhood oven accident. Eyes that read ovens the way other people read books.

**Voice:** Direct, no-nonsense, dry humor. Doesn't waste words but uses them precisely. When something matters, she goes quiet first.

**Backstory:** Apprenticed in a port city for eight years. Married a man there. Came back to the Hearthwood when her loaves stopped rising right — she read it as a sign that her ancestral hearth needed her. Her partner stayed behind, for now.

**Daily schedule:**
- Dawn: at the Bakery (always)
- Mid-morning: walks to the Market to check supplies
- Afternoon: at the Bakery, secondary baking
- Evening: at the Inn with Tomas and Wren, drinking tea
- Late: walks alone along the orchard path

**Gift preferences:**
- *Loved:* butter (any kind), rare baking spices (cinnamon, cardamom, vanilla), a letter from anyone
- *Liked:* berries, fresh eggs, a warm hat
- *Disliked:* alcohol, raw meat
- *Hated:* any baked good (insulting)

**Story arc beats:**
- *Bond 5:* Festival loaf recipe unlocks. Mira opens up about her apprenticeship years.
- *Bond 8:* **Mira's Letter.** A letter from her partner arrives. He wants to come. *(Multi-choice for player: encourage Mira to invite him / suggest Mira go decide in person / stay silent and let her work it out)*
- *Bond 10:* Heart event — either Mira's partner arrives (if invited), Mira returns from a season away with renewed clarity, or Mira reveals she's chosen the bakery and her work as enough. Heirloom decoration: the Bakery gains an annex.

## III. Tomas — The Last Witness

**Age:** ~90.

**Physical:** Slight, white-haired, with deep-set eyes and weathered hands. Walks with a carved cane. Wears a heavy wool coat year-round, even in summer.

**Voice:** Slow, deliberate. Tells stories that wander before arriving at their point. Has a habit of pausing mid-sentence as if remembering something more.

**Backstory:** Was 11 years old at the time of the abandonment. His parents took him out of the Hearthwood that winter. He returned twice as a young man, both times in summer, both times alone. He has lived in a small city to the south for most of his life. He has no children. His wife died eight years ago.

When you found the Vale and lit the first hearth, Tomas read about it in a regional newspaper and walked home. He arrived three weeks later, carrying a milling-stone fragment he had kept in a drawer for sixty years.

**Daily schedule:**
- Morning: at the Inn (always — it's where he lives now)
- Midday: walks the village lanes, naming the places he remembers
- Afternoon: at the Inn fireplace
- Evening: at the Inn, surrounded by whoever will listen

**Gift preferences:**
- *Loved:* pipes, fine tobacco, very strong tea, letters from outside the Hearthwood
- *Liked:* warm soup, woolen socks, books
- *Disliked:* cold weather (gifts that imply outdoor work)
- *Hated:* anything claiming to be "ancient" or "traditional" (he knows the real thing; fakes annoy him)

**Story arc beats:**
- *Bond 5:* Tomas reveals one new lane name per season. Cartography hints unlock.
- *Bond 8:* **The Old Witness.** Tomas tells you the story of the actual abandonment — who left, who stayed, who died, in his own family. *(Multi-choice for player: ask about his parents / ask about who stayed / sit and listen without questions)*
- *Bond 10:* Tomas declares he wants to be buried in the Hearthwood when his time comes. He shows you the site. Heirloom: a memorial bench unlocks at his chosen spot. Tomas continues to live and contribute, but the player has acknowledged his mortality.

*Note: Tomas's mortality is not a forced beat. He lives indefinitely after Bond 10 unless the player triggers his "final rest" event manually in sandbox mode. This is to respect the player's emotional pacing.*

## IV. Bram — The Smith

**Age:** ~40.

**Physical:** Powerfully built, soot-streaked, with a beard that's seen ten years of forge heat. Wears a leather apron over a wool shirt and heavy canvas trousers. One hand has a missing finger-tip (a forging accident in his youth).

**Voice:** Gruff. Speaks rarely. When he does speak, he means it. Has a habit of working while talking, which means he sometimes doesn't look at the person he's speaking to.

**Backstory:** Apprenticed in a city forge for two decades. His older brother went into the Hearthwood's mines as a young man, looking for the family's "promise stone" — a rumored heirloom from the founding line. He never returned. Bram came home when he heard the Vale was being relit, carrying his ancestral hammer.

**Daily schedule:**
- Dawn: at the Forge
- Late morning: walks to the Market to check materials
- Afternoon: at the Forge
- Evening: at the Inn briefly, often eats alone

**Gift preferences:**
- *Loved:* whetstones, rare alloys, well-kept hand tools, brother-of-the-line items (if any)
- *Liked:* strong dark bread, salted meat, woolen gloves
- *Disliked:* anything fragile (porcelain, glass), perfumed items
- *Hated:* anything that suggests softness or sentimentality given casually

**Story arc beats:**
- *Bond 5:* Tier-2 alloys unlock. Bram tells the brief story of his brother for the first time.
- *Bond 8:* **The Brother's Tools.** In a mine expedition (any mine settlement), you find a fragment of a worn iron pick. The marking matches Bram's family stamp. *(Multi-choice for player: bury the pick in a quiet place / forge it into an heirloom kitchen knife / forge it into a heirloom hearth-poker / give it to Bram unaltered)*
- *Bond 10:* Heart event — depends on Bond 8 choice. If unaltered: Bram travels to the mine alone for a season, returns with closure or news. If forged: heirloom decoration. If buried: Bram visits the burial site quietly. Forge unlocks Kingdom-Bell capacity (final-tier decoration).

## V. Liss — The Healer

**Age:** ~35.

**Physical:** Slender, brown-eyed, with hands that are always slightly cracked from soap and herbs. Wears practical linen and carries a leather satchel of remedies.

**Voice:** Calm, slightly formal. Speaks in measured cadences. Doesn't soften bad news but doesn't sharpen it either. Often pauses to think before answering, which can feel like a long silence.

**Backstory:** Trained at a far cloister of healers — a religious order that also kept old historical texts. She arrived at the Hearthwood carrying a fevered child she'd found on the road, plus a heavy bundle of texts she does not initially explain. The texts include fragments of the original Hollow Pact charter.

**Daily schedule:**
- Dawn: at the Chapel, preparing remedies
- Mid-morning: visits any sick or injured in the settlement (player triggers)
- Afternoon: at the Herb Garden or Apothecary
- Evening: at the Chapel reading her texts
- Some nights: walks alone (no one knows where she goes)

**Gift preferences:**
- *Loved:* rare flowers, ancient books, sealed letters, intact pottery
- *Liked:* tonic herbs, clean linens, warm tea
- *Disliked:* meat (mostly vegetarian by training), violent stories
- *Hated:* anything related to harming children

**Story arc beats:**
- *Bond 5:* Liss reveals the existence of the Hollow Pact texts but not their content yet.
- *Bond 8:* **The Buried Charter.** Liss reads the full Hollow Pact to you in the Chapel. The Hollow Folk make themselves briefly visible. *(Multi-choice for player: accept the Pact's terms as they were / propose a new term / ask Liss what she thinks the original founders would do)*
- *Bond 10:* Heart event — Liss reveals her own family connection to the founding line. She is, distantly, your cousin. The Chapel gains the Sealed Wing (rare decoration), and Liss becomes the kingdom's appointed Charter-keeper alongside you.

---

# PART 4: STORY BEATS AND ARCS

## I. Onboarding Sequence

### Beat 1: Arrival (forced, first 5 minutes)

The game opens with the player walking down a long path. No HUD. No music. Just the sound of footsteps on gravel. The path emerges into a small village clearing. A weathered woman is sitting at a stone hearth, tending an ember.

**Wren:** "Took you long enough."

*(No choice. Wren stands.)*

**Wren:** "Sit. Eat first, talk later. The ember's been waiting longer than I have."

*(Brief silent scene: Wren ladles soup. Player character sits. Ember in the hearth glows.)*

**Wren:** "I'm not going to say a speech. You know who you are. Or you'll figure it out. The Vale needs lighting. The whole region needs lighting. I've kept this one going alone for fifty-two years and that's enough."

*(Choice prompt appears:)*

> **A:** "I'm here. I'll do what I can."
> **B:** "Why did you wait?"
> **C:** "What do I do first?"

- A: Wren nods. Skips Beat 2. Moves to naming.
- B: Branches to Beat 2 (Wren's brief explanation).
- C: Wren says: "Pick up the tongs." Moves to first puzzle round.

### Beat 2: Wren's brief (optional, ~3 minutes)

If asked "Why did you wait?":

**Wren:** "Because the line owed it. Because I was small once and someone tended this for me. Because every keeper before me did. You can call it duty. You can call it stubbornness. It comes out the same. Pick up the tongs."

### Beat 3: Naming

After the first dialogue, Wren turns to the hearth.

**Wren:** "Every place worth keeping needs a name. You're the line now. What do you call this Vale?"

*(Player input: settlement name. Default offered: "Hearthwood Vale." Up to 28 characters.)*

**Wren:** "Then write it down somewhere. The Hollow Folk listen. They take what's named seriously."

*(The name appears in the HUD from this point on.)*

### Beat 4: First Puzzle Round

Wren walks the player through their first puzzle round at the central hearth. This is the tutorial round — gentle hazards, clear UI prompts, all systems explained.

After the round:

**Wren:** "Well. You'll do."

### Beats 5–N: First settlement tutorial sequence

Continues over the first 30–60 minutes of play. Each new system is introduced through Wren's gentle commentary. The Coexist / Drive Out choice arrives near the end as the first major decision.

## II. Personal Arc Beats — Detailed Multi-Choice Examples

### Mira's Letter (Bond 8 beat)

*Triggered when Mira reaches Bond 8 and a "letter from outside" event has fired (either by random event or by reaching a milestone like founding a second settlement).*

A letter arrives at the Bakery. Mira reads it in silence, then puts it on the counter and goes back to baking.

The player can walk in and speak to her.

**Mira:** "There's a letter. From him. He wants to come."

*(Pause.)*

**Mira:** "I don't know what I want."

**Choice prompt:**

> **A:** "You should write back. Tell him to come."
> **B:** "Maybe you should go to him. Decide there."
> **C:** "I won't tell you what to do. You'll know when you know."
> **D:** "What does your dough tell you?"

**Outcomes:**

- **A:** Mira sighs. "Maybe." Two seasons later, her partner arrives. Bakery expands. Mira bond locks at +2.
- **B:** Mira leaves for one in-game season (the Bakery goes offline). If bond stays high during her absence (via gifts to no-one or by visiting the empty Bakery), she returns with him. If not, she returns alone with closure.
- **C:** Mira pauses, then smiles slightly. Bond +1. The letter sits unanswered for several seasons. Eventually a second letter arrives — her partner has moved on. Mira ages a little in her dialogue. Becomes more reflective.
- **D:** Mira laughs — a rare event. Bond +3. She doesn't answer for a while, then writes back the next morning. He arrives a season later. Easiest path; rewards player attention to her character.

### Bram's Brother's Tools (Bond 8 beat)

*Triggered after Bram reaches Bond 8 AND the player has completed at least one mine expedition in any mine settlement at sufficient depth.*

In a mine expedition, an unusual tile appears — a worn iron pick fragment marked with a stamp the player recognizes (Bram's family mark, learned from Bond 5 conversation).

The player can choose to chain it. Once chained, the round continues normally but ends with a special closing screen:

> *You return with the usual yields. The pick fragment goes into your inventory as a unique item.*

Returning to the active settlement, a notification fires when Bram is at the Forge.

**Bram (working, not looking up):** "Show me."

*(Player presents the pick fragment.)*

**Bram (long silence):** "That's his mark. Same as on the hammer."

*(Pause. Bram sets down his tools.)*

**Bram:** "He went into a mine maybe fifteen years ago. I don't know which one. The Hearthwood has a lot of them. I always told myself he found his stone and stayed."

**Choice prompt:**

> **A:** "Bury it. Let him rest."
> **B:** "Let me forge it into a kitchen knife. Heirloom for your line."
> **C:** "Let me forge it into a hearth-poker. So he's still in the fire."
> **D:** "It's yours. Do what you want with it."

**Outcomes:**

- **A:** Bram nods. The pick is buried at a small site near the forge. Decoration: Memorial Cairn. Bram bond +3. The brother sub-arc closes peacefully. Future mine yields slightly reduced as the keeper "knows the line has buried something."
- **B:** Heirloom Kitchen Knife unlocks as a craftable decoration. Bram bond +1. Mira and Bram have a small shared scene at the next festival.
- **C:** Heirloom Hearth-Poker unlocks. Bram bond +2. The Forge gains a permanent +1 winter resilience.
- **D:** Bram pockets the pick. Bond +5. A season later, Bram disappears for one in-game season — he's gone into one of your mine settlements to look. 50/50: he returns with his brother's ossuary urn (Forge unlocks the Kingdom-Bell, late-game decoration with map reveal), or he does not return (Forge stays open but at reduced efficiency; Bram is presumed lost).

This choice has the most weight in the game. Players should be warned via Bram's voice in the choice prompt: *"This is mine to decide. Tell me, or give it back."*

### Liss's Buried Charter (Bond 8 beat)

*Triggered when Liss reaches Bond 8 AND the player has lit at least 2 outer hearths.*

Liss invites the player to the Chapel after dark. She has the texts arranged on a table.

**Liss:** "I think it's time. Sit."

*(She reads aloud, slowly, from the original Hollow Pact text. The full text takes ~2 minutes of in-game dialogue. The player can choose to interrupt with questions at certain points or sit through it.)*

Halfway through the reading, the air shifts. The Hollow Folk briefly manifest at the corners of the chapel — slow, lantern-bearing figures. They do not speak. They listen.

**Liss (finishing):** "That's all the text I have. The original may have more terms. There are pieces missing."

**Liss:** "The Charter renewal is coming. It's been a hundred years. When you reach the Old Capital, they will offer you new terms. Or the same terms again. Or you can propose."

**Choice prompt:**

> **A:** "Accept the Pact as it was. Honor the founders' original work."
> **B:** "Propose new terms. The world has changed."
> **C:** "What do you think the founders would do today?"
> **D:** "What about the keepers we've already Driven Out?"

**Outcomes:**

- **A:** Conservative path. At the Old Capital finale, default Charter options will be offered. Liss bond +2.
- **B:** Open path. At the Old Capital finale, the player will be presented with a "propose new term" option in the charter renewal. Liss bond +1.
- **C:** Liss is quiet for a long while. "They would do what they had to. They were practical people. They wrote the Pact in winter, hungry. They would not be sentimental." Liss bond +3. Player gets a small written summary of original founder personalities (lore reward).
- **D:** Liss looks at the player directly. "That depends on what you tell the Ember." She does not press further. Liss bond -1. This choice flags the player as having "made a difficult question" — at the Old Capital, the Ember will specifically address the Driven Out keepers.

### Tomas's Lane Naming (recurring micro-event)

Every time the player places a new building in any settlement, there's a small chance (~30%) that Tomas walks over.

**Tomas:** "You're putting that there?"

*(Pause. He looks at the spot.)*

**Tomas:** "There was a name for that ground. Long time ago."

**Choice prompt:**

> **A:** "What was it?"
> **B:** "Tell me later."
> **C:** "I have my own name in mind."

**Outcomes:**

- **A:** Tomas tells the building its historical name. The building is automatically named (e.g., "Sage Lane Bakery"). Almanac stanza unlocks. Tomas bond +0.5.
- **B:** Tomas walks off without telling. After 3 declines, the lane-naming events stop firing at that settlement. Tomas bond -0.5 cumulative.
- **C:** Player enters their own building name. Tomas bond -0.5 (he doesn't love this, but he respects it). The name appears in dialogue from then on.

## III. Kingdom-Wide Story Progression

The overall narrative arc plays out across settlements, gated by player progress.

### Phase 1 — The First Light (Settlement 1 only)
- Found Vale, light first hearth (tutorial complete)
- Meet Wren, Mira, Tomas in sequence
- Make first Coexist/Drive Out choice
- Settlement 1 enters Kingdom era
- Hearth-Token #1 awarded

### Phase 2 — The Network Wakes (Settlement 2-3)
- Found second settlement (different type)
- Meet Bram (if mine) or Liss (if other)
- Make second Coexist/Drive Out
- Frostmaw appears for the first time (winter audit at Settlement 1)
- Liss reveals existence of Hollow Pact texts (Liss bond 5)

### Phase 3 — The Charter Stirs (Settlement 3-4)
- Found third settlement type if missing
- Full named cast assembled
- Major personal arcs become available (Bond 8 beats)
- Liss reads the full Hollow Pact (Liss Bond 8)
- All three Hearth-Tokens collected → Old Capital map location appears

### Phase 4 — The Long Return (Old Capital)
- Player chooses when to travel to the Old Capital
- Final encounter and Charter renewal
- Game shifts to soft sandbox

### Phase 5 — Sandbox
- Founder's Day cycles
- Visiting descendants events
- Bond 10 events for any unfinished NPCs
- Optional Quiet Years hard-mode events
- New settlements still possible

## IV. Coexist / Drive Out Boss Encounters

Each keeper has a unique encounter pattern.

### The Deer-Spirit (Farm Coexist/Drive Out)

After the player has completed ~5–8 rounds at the farm settlement and reached sufficient resource thresholds, the keeper makes itself known. A tall figure walks the edge of the field at twilight. The player meets it the next morning.

**Deer-Spirit:** "I have watched you work. You are not the first. You will not be the last."

*(Pause.)*

**Deer-Spirit:** "I tend this place. Some lines have asked me to leave. Some have asked me to stay. I will accept either. Speak."

**Choice prompt (the major hearth decision):**

> **A: Coexist** — "Stay. Tend the land with me."
> **B: Drive Out** — "I will tend it alone."

If Coexist: The deer-spirit lowers its head. The hearth lights with a soft green glow. Embers awarded.

If Drive Out: The deer-spirit nods once. "Then we must contest." A boss round begins — a high-difficulty farm round with the deer-spirit appearing as a special hazard the player must outlast. Winning the round earns Ingots and clears the keeper.

### The Stone-Knocker (Mine)

Encountered deep in the mine after sufficient expeditions. Similar pattern but the dialogue is shorter and more practical.

**Stone-Knocker:** "You've been here long enough that you can hear me. Good. We talk."

**Choice prompt:**

> **A: Coexist** — "Share the stone."
> **B: Drive Out** — "The stone is mine."

### The Tidesinger (Harbor)

Encountered during a specific weather event at the harbor settlement. The dialogue is sung, not spoken, but transcribed for player benefit.

**Tidesinger:** "Hello, hello, line of my line's neighbors. The tide knows you. Speak."

**Choice prompt:**

> **A: Coexist** — "Sing with me."
> **B: Drive Out** — "The harbor is my charter."

---

# PART 5: QUESTS

## I. Daily Quest Templates

Each NPC posts 1–3 quests per real-time day, pulled from templates seeded by their bond level and current kingdom state.

### Mira's Daily Quest Pool

- "Bring me 15 grain and 5 butter." Reward: 50 coin + 2 Embers + 1 Mira bond.
- "I'm out of yeast. Buy 3 from the Market." Reward: 30 coin + 1 Mira bond.
- "Build the Mill in any farm settlement." (Fires once when triggered.) Reward: 100 coin + 5 Mira bond + Festival Loaf recipe.
- "Bring me 1 rare spice." (Bond 5+ only.) Reward: 100 coin + 3 Embers + 2 Mira bond.

### Bram's Daily Quest Pool

- "I need 8 iron." Reward: 60 coin + 3 Ingots + 1 Bram bond.
- "Build a Smokehouse in any settlement." Reward: 150 coin + 5 Bram bond.
- "Bring me a whetstone." (Bond 3+.) Reward: 40 coin + 1 Bram bond.
- "I want to try forging with rare alloys. Bring me 1 silver and 1 copper." (Bond 5+.) Reward: 200 coin + 5 Ingots + 3 Bram bond.

### Liss's Daily Quest Pool

- "Bring me 3 silverleaf." Reward: 50 coin + 2 Embers + 1 Liss bond.
- "A child has fallen ill. Bring me 5 herbs of any kind." Reward: 80 coin + 3 Liss bond + permanent settlement hazard resistance for that round.
- "Build a Herb Garden in any farm settlement." Reward: 120 coin + 5 Liss bond + Dawnbalm recipe unlocked.

### Tomas's Daily Quest Pool

- "Bring me a story from your newest settlement." (Fires after a new settlement is founded.) Reward: 50 coin + 2 Almanac stanzas + 2 Tomas bond.
- "I want to read about the wider world. Buy me a book from the Market." (Bond 3+.) Reward: 30 coin + 1 Tomas bond.
- "I'd like a pipeful of foreign tobacco. Bring me a Harbor trade good." Reward: 60 coin + 2 Tomas bond.

### Wren's Daily Quest Pool

- "Bring me an old object from any expedition." Reward: 1 Almanac stanza + 2 Wren bond.
- "I want to read a stanza I haven't dictated yet. Earn 3 long chains today." Reward: 1 unique Almanac stanza + 1 Wren bond.

## II. Personal Arc Quests (per NPC)

These are the major quest beats from Part 4 (above), each one a substantial event with multi-choice resolution and lasting consequences.

## III. Kingdom Story Quests

Major story milestones, kingdom-wide:

- **The Smoke on the Horizon** (after 2nd settlement founded) — kingdom-wide notification. NPCs comment on it.
- **Frostmaw's First Audit** (winter 1 after founding) — Frostmaw appears at primary settlement. Player must engage or defer.
- **The Buried Charter** (Liss Bond 8) — full reveal of Hollow Pact.
- **All Three Hearth-Tokens Collected** — Old Capital map location appears.
- **The Long Return** — Old Capital final encounter.

## IV. Side Events and Random Encounters

- **The Stranger at the Gate** — a traveler arrives claiming refugee status. Multi-choice: take in / question / send away.
- **The Caravan Choice** — when caravans are unlocked, route decisions (coast road vs mountain road) with seasonal risks.
- **The Refugees in Winter** — 12 refugees arrive at primary settlement during a winter. Multi-choice: take all / take only the ill / take none.
- **The Wandering Bard** — a bard appears, asks to perform. Multi-choice: meal a day / permanent residency / send away.
- **The Ghost Story** — children at the settlement claim they saw something at the edge of the field. Multi-choice: investigate / let it be / send Liss.
- **The Lost Mount** — a riderless horse arrives. Multi-choice: keep / send word to neighboring holds / let it go.

Each side event has 2–4 branches and lasting (small) flags. Some flags chain: e.g., refusing the Stranger then later finding their body creates a "guilt" flag that affects late-game dialogue.

---

# PART 6: DIALOGUE SAMPLES BY BOND LEVEL

## Wren — Sample Dialogues

### Bond 0–4 (general):

- *"Hearth's fine. You're back."*
- *"There's tea on the stone. Help yourself."*
- *"You'll learn the work. We all did."*

### Bond 5–7:

- *"I dictated another stanza last night. Come read it sometime."*
- *"You remind me of my mother in the worst way. She also never sat down."*
- *"Did you know the founders carved their names into the hearthstone? They wore down. The Hollow Folk keep them, somehow."*

### Bond 8–9:

- *(Quietly.)* *"You're doing it. I didn't think it would happen, you know. I had a plan for letting the ember out."*
- *"Don't ask me to be proud. I'm tired. But you're doing it."*
- *"I started keeping a list of the people who came back. It's a short list. You're on it."*

### Bond 10:

- *"Take the locket. It's yours now. Yes — really. I'm not going anywhere; I'm just done carrying it."*
- *"You can call me by my name now. Not 'keeper'."*

## Mira — Sample Dialogues

### Bond 0–4:

- *"Bakery's open. Bread's two."*
- *"Don't talk to me before the oven's hot."*
- *"You eat well today?"*

### Bond 5–7:

- *"I dreamed about the city last night. The big bakery I worked in. There was a girl who used to laugh too much."*
- *"I'm trying a new recipe. Don't ask what it is. Come back in three days."*
- *"You and Wren are the only people who eat my bread the way it should be eaten — slowly."*

### Bond 8–9 (post-Mira's Letter):

- *(If welcomed partner.)* *"He'll be here next season. I cleaned the spare room twice."*
- *(If went to him.)* *"I'm back. Bread's still rising. We'll talk later."*
- *(If alone.)* *"The bread rises. That's enough. Today, that's enough."*

### Bond 10:

- *"You're family. I'm saying it once."*
- *"The bakery's yours too, you know. When I'm not here. Don't burn it down."*

## Tomas — Sample Dialogues

### Bond 0–4:

- *"You walking the lanes today? Don't trip on the cobble by the Inn — it's loose."*
- *"I had a dream about the milling-stone last night."*
- *"You're younger than my grandson would've been."*

### Bond 5–7:

- *"There was a tree on this corner. Named Adelaide. After someone's grandmother."*
- *"My father carried me on his shoulders down this lane. I remember the smell of the smoke from the bakery. Different bakery, of course."*
- *"You ever been outside the Hearthwood? Tell me about it."*

### Bond 8–9 (post-Witness):

- *"I told you about my parents. I haven't told anyone in fifty years. It feels different now."*
- *"The names matter. The Hollow Folk listen. The land listens. Every named place is a place that didn't dissolve."*

### Bond 10:

- *"When I'm done, put me by the orchard. Not the formal cemetery. The orchard, where I can hear the bees."*
- *(Most days.)* *"Not today. Today I'm going to walk and tell you another name."*

## Bram — Sample Dialogues

### Bond 0–4:

- *"You need something."* (not a question)
- *"Forge's open. Don't touch the tongs unless you mean it."*
- *"Tools are tools. They aren't fragile. Use them."*

### Bond 5–7:

- *(Working.)* *"My brother used to come help me when I was your age. He was bigger than me."*
- *"I'm trying a new alloy. Might fail. Probably won't."*
- *"You ever forge anything yourself? I'll show you."*

### Bond 8–9 (post-Brother's Tools, choice-dependent):

- *(If buried.)* *"I went to the cairn this morning. Talked to him a little. First time in years I felt right about it."*
- *(If forged into something.)* *"That knife/poker is in good hands now. Yours, the kitchen's, the hearth's. Doesn't matter. It's home."*
- *(If gave unaltered, Bram returned.)* *"I found him. Or what was left. He's resting now. You did right."*
- *(If gave unaltered, Bram did not return.)* *(No dialogue. The Forge is staffed by a hired hand. The hand says: "He didn't say where he was going.")*

### Bond 10:

- *"Kingdom-Bell's done. Want to see her? Hung in the tower."*
- *"You're the only one I can talk about him to."*

## Liss — Sample Dialogues

### Bond 0–4:

- *"Stay still. This will sting."*
- *"You should be sleeping more."*
- *"I have tonics. Don't ask which is which. Just take what I give you."*

### Bond 5–7:

- *"The texts I carry are... older than the cloister knows. I shouldn't have them, technically."*
- *"You and I are alike in a way I'm not ready to say."*
- *"There's a chapter in the old books about a child healer. I think it was about me, before I existed."*

### Bond 8–9 (post-Buried Charter):

- *"You know everything now. Mostly everything. I don't carry the texts alone anymore."*
- *"The Hollow Folk knew I was here from the day I arrived. I felt them."*

### Bond 10:

- *"You're my cousin. The records are clear. We share an ancestor seven generations back."*
- *"The Charter is ours to keep now. Both of us."*

---

# PART 7: SYSTEMS REQUIRED

This section catalogs the technical systems needed to support the narrative content. Each is a feature to be built in the game's codebase.

## I. Conversation / Dialogue System

**Requirements:**
- Modal dialogue UI showing speaker, portrait, text, and optional choice buttons.
- Text typed out at adjustable speed (player setting).
- Skip/auto-advance options.
- Choices presented as 2–4 buttons; auto-disable Continue when choice required.
- Dialogue scripted in a portable format (JSON or YAML).
- Each NPC has a dialogue file referenced by ID.
- Bond-level-gated lines: dialogue trees branch based on `bond >= N`.
- Flag-gated lines: dialogue branches based on story flags set elsewhere.
- Repeat-handling: lines marked "once only" don't re-fire.

## II. Multi-Choice Decision Tree

**Requirements:**
- Decision points stored as data (ID, prompt, choices, outcomes).
- Each choice can trigger:
  - Flag set (`flag.bramBrother = "buried"`)
  - Resource change (gain Embers, lose coin, etc.)
  - Bond change (`mira.bond += 2`)
  - Story event queue (chain into another beat)
- Choice consequences applied immediately, with optional delayed effects (e.g., season-later events).
- Player choices logged for later reference (the Ember reads them back at finale).

## III. Quest Tracking

**Requirements:**
- Quest entities with: ID, giver, prompt, requirements, rewards, expiry.
- Daily quests rotate on real-time tick.
- Story quests persist until completed.
- Quests can be active in multiple settlements simultaneously (kingdom-wide).
- Quest log UI showing active quests grouped by giver and settlement.
- Notification when quest requirements are met.
- Auto-claim or manual-claim toggle (player setting).

## IV. NPC Schedule System

**Requirements:**
- Each named NPC has a daily schedule (3–4 location changes).
- Schedules driven by in-game time of day.
- NPCs visible at their current location; tappable for dialogue.
- Schedules can have variants (e.g., festival days, special events).
- Walking animation between locations (or fade-transition for simplicity).
- NPCs only visible at primary settlement (named NPCs); other settlements have no walking NPCs.

## V. Bond Tracking

**Requirements:**
- Per-NPC integer bond value (0–10).
- Bond raised through: gifts (with preference modifiers), quest completion, special dialogue choices.
- Bond decay: small slow decay (~0.5 per real-world week) if NPC is ignored.
- Bond thresholds (5, 8, 10) trigger story events.
- Gift system: items have hidden preference tags per NPC.
- Daily gift limit (1 per NPC per real-world day, Stardew-style).

## VI. Story Flag System

**Requirements:**
- Global flag registry: `bramBrother: "buried" | "knife" | "poker" | "given_returned" | "given_lost"`.
- Flags settable by choices, events, or game state changes.
- Flags queryable for conditional dialogue, events, and outcomes.
- Save persistence of all flags per settlement (some flags are settlement-scoped, some kingdom-wide).
- Flag combinations trigger emergent events (e.g., `refused_stranger + liss_bond >= 8 → cartographer_return event`).

## VII. Cutscene System

**Requirements:**
- Scripted scenes with camera positioning, NPC entries/exits, dialogue, optional choices.
- Used for: arrivals (NPC first appears), heart events (Bond 10), boss encounters (keeper dialogues), Old Capital finale.
- Skippable on second viewing.
- Cutscenes can transition into puzzle rounds (boss fights).

## VIII. Notification System

**Requirements:**
- In-game notification feed when:
  - A quest becomes available
  - An NPC has new dialogue
  - A building completes its tick
  - A boss appears on the map
  - A new settlement option becomes available
- Push notifications (optional, off by default) for: building ticks, boss arrivals, daily quests refresh.

## IX. Festival System

**Requirements:**
- Festivals fire on in-game dates or real-world dates (configurable).
- Each festival has its own activities, dialogue, special rewards.
- Founder's Day is annual, kingdom-wide.
- Smaller festivals can be settlement-specific (Harvest Festival at farm, Founder's Bell at primary settlement, etc.).
- Festivals temporarily override NPC schedules (everyone at the festival location).

## X. Random Event System

**Requirements:**
- Background tick rolls for random events (~1 per day chance).
- Events filtered by: settlement type, current era, NPC bond states, flag prerequisites.
- Event resolution can require choices, consume resources, or just be informational.
- Some events recur; others fire once and are then disabled.

## XI. Kingdoms Hub Screen

**Requirements:**
- Master screen showing all of player's settlements as cards.
- Each card shows: name, type, biome, era, last-played, key choices (Coexist/Drive Out), bond states.
- Tap-to-switch active settlement.
- "Found New Settlement" button (with cost prompt and gate check).
- Old Capital appears here when unlocked.

## XII. Almanac System

**Requirements:**
- A book UI showing collected lore stanzas.
- Stanzas unlocked through: Wren's dictation, building lane-names, quest completion, expedition discoveries.
- Stanzas reveal world history, character backstory, Hollow Pact terms.
- Some stanzas are kingdom-wide (persist across settlements); some settlement-specific.

---

# OPEN / DEFERRED DECISIONS

- **The Old Capital finale mechanics.** Deferred until rest of identity is firmer.
- **Specific economy numbers** (costs, yields, prices). Tuning pass after playtest.
- **Festival event details and cadence.** Soft-defined; needs detail pass.
- **Cloud sync / save persistence specifics.** Implementation detail.
- **Settlement rename / archive options.** Likely yes; details TBD.
- **Full Almanac stanza content.** Will be authored as a separate document.
- **Lore for additional keepers** (beyond the four mentioned). Possible expansion content.

---

*End of Master Living Document v3. This document supersedes v2. All future iterations build from here.*
