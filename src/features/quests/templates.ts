/**
 * Quest template pool for Phase 7.1.
 * 5 categories × multiple keys/items = ≥12 templates.
 * Each template: { id, category, key?, item?, tool?, minLength?,
 *                  label, flavor, targetMin, targetMax, coinBase, coinPerUnit }
 *
 * `flavor` is a short, in-world commission line shown beneath the quest
 * title on the board. It names the folk of the vale (Mira the baker, Old
 * Tomas, Bram the smith, Sister Liss, Wren the carpenter) so the daily
 * tasks read like requests from neighbours rather than chores.
 *
 * REWARDS (optional): besides coins, a template may grant any of the following
 * when the quest is claimed. All are optional and default to nothing; coins are
 * always granted from coinBase/coinPerUnit. Keep a quest to AT MOST FIVE total
 * rewards (incl. coins + XP) so the card's reward manifest never overflows.
 *   rewardTools: { basic: 2, rare: 1 }            // global tool counts
 *   rewardItems: { plank: 5 }                      // resources → active zone inventory
 *   rewardRunes: 1                                 // rune balance
 *   rewardUnlockTile: "tile_cattle_triceratops"    // marks a board tile discovered
 *   rewardUnlockBuilding: "mill"                    // makes a building buildable (cost still paid)
 */
export const QUEST_TEMPLATES = [
  // ── collect-resource ────────────────────────────────────────────────────────
  { id: "collect_hay",   category: "collect", key: "tile_grass_grass",   label: "Collect {n} grass",
    flavor: "Sister Liss needs fresh thatch before the orphanage roof leaks again.",
    targetMin: 20, targetMax: 50, coinBase: 30, coinPerUnit: 1 },
  { id: "collect_wheat", category: "collect", key: "tile_grain_wheat", label: "Collect {n} wheat",
    flavor: "Mira's mill stands quiet. Bring wheat and the whole vale eats.",
    targetMin: 8,  targetMax: 20, coinBase: 40, coinPerUnit: 2 },
  { id: "collect_log",   category: "collect", key: "tile_tree_oak",   label: "Collect {n} logs",
    flavor: "Wren's saw is hungry for timber — fell what the wood can spare.",
    targetMin: 8,  targetMax: 18, coinBase: 30, coinPerUnit: 2 },
  { id: "collect_berry", category: "collect", key: "tile_fruit_blackberry", label: "Collect {n} berries",
    flavor: "Old Tomas won't make his famous jam without a basket of berries.",
    targetMin: 6,  targetMax: 14, coinBase: 30, coinPerUnit: 3 },
  { id: "collect_flour", category: "collect", key: "flour", label: "Collect {n} flour",
    flavor: "The hearth bakes nothing from empty sacks. Grind some flour.",
    targetMin: 4,  targetMax: 10, coinBase: 50, coinPerUnit: 4 },
  // ── Milestone / build-out commissions (rich reward bundles) ───────────────────
  // These showcase the full reward range: a building unlock, a tile unlock, and a
  // five-reward "full manifest" order. Each stays within the five-reward cap.
  { id: "raise_the_mill", category: "order", label: "Raise the Mill",
    flavor: "Grind the first sacks — the village wants bread.",
    targetMin: 3, targetMax: 5, coinBase: 250, coinPerUnit: 0,
    rewardTools: { basic: 2 }, rewardUnlockBuilding: "mill" },
  { id: "bones_back_forty", category: "chain", minLength: 8, label: "Bones in the Back Forty",
    flavor: "Something old stirs beneath the pasture…",
    targetMin: 2, targetMax: 3, coinBase: 500, coinPerUnit: 0,
    rewardRunes: 1, rewardTools: { rare: 1 }, rewardUnlockTile: "tile_cattle_triceratops" },
  { id: "quartermasters_tally", category: "order", biome: "mine", label: "The Quartermaster's Tally",
    flavor: "Everything on the manifest, by sundown.",
    targetMin: 4, targetMax: 6, coinBase: 180, coinPerUnit: 0,
    rewardItems: { plank: 5, iron_bar: 3 }, rewardTools: { shuffle: 1 } },
  // ── craft-item ──────────────────────────────────────────────────────────────
  { id: "craft_bread",   category: "craft",   item: "bread",   label: "Bake {n} bread",
    flavor: "A village runs on its bread. Mira will trade dearly for warm loaves.",
    targetMin: 2, targetMax: 5,  coinBase: 50, coinPerUnit: 15 },
  { id: "craft_jam",     category: "craft",   item: "jam",     label: "Cook {n} jam",
    flavor: "Old Tomas swaps his best stories for a jar of sweet jam.",
    targetMin: 2, targetMax: 4,  coinBase: 50, coinPerUnit: 20 },
  { id: "craft_plank",   category: "craft",   item: "plank",   label: "Mill {n} planks",
    flavor: "Wren can't raise a wall from raw logs — mill them into planks.",
    targetMin: 3, targetMax: 8,  coinBase: 40, coinPerUnit: 10 },
  // ── fulfil-orders ───────────────────────────────────────────────────────────
  { id: "orders_any",    category: "order",                    label: "Deliver {n} orders",
    flavor: "The road traders won't wait. Fill their carts before they roll on.",
    targetMin: 3, targetMax: 6,  coinBase: 60, coinPerUnit: 15 },
  // ── use-tool ────────────────────────────────────────────────────────────────
  { id: "tool_scythe",   category: "tool",    tool: "clear",    label: "Use the Scythe {n} times",
    flavor: "A keen blade keeps the fields in order. Put the scythe to work.",
    targetMin: 2, targetMax: 5,  coinBase: 30, coinPerUnit: 10 },
  { id: "tool_seedpack", category: "tool",    tool: "basic",    label: "Use the Seedpack {n} times",
    flavor: "Every empty furrow is a wasted season. Scatter the seed pack wide.",
    targetMin: 2, targetMax: 4,  coinBase: 30, coinPerUnit: 15 },
  { id: "tool_lockbox",  category: "tool",    tool: "rare",     label: "Use the Lockbox {n} times",
    flavor: "What's locked away is worth the trouble. Crack the lockboxes open.",
    targetMin: 1, targetMax: 3,  coinBase: 30, coinPerUnit: 20 },
  // ── chain-length ────────────────────────────────────────────────────────────
  { id: "chain_8",       category: "chain",   minLength: 8,     label: "Make a chain of 8+",
    flavor: "The old hands say a long harvest sings. String eight in a row.",
    targetMin: 1, targetMax: 3,  coinBase: 50, coinPerUnit: 25 },
  { id: "chain_12",      category: "chain",   minLength: 12,    label: "Make a chain of 12+",
    flavor: "A chain of twelve is the stuff of vale legend. Make one and be remembered.",
    targetMin: 1, targetMax: 2,  coinBase: 80, coinPerUnit: 40 },
  // ── fish-biome collect templates ────────────────────────────────────────────
  // Coin bases echo the farm collect-quests; targets sized for the harbor pool.
  { id: "collect_sardine",  category: "collect", biome: "fish", key: "tile_fish_sardine",  label: "Collect {n} sardines",
    flavor: "The harbor cats are circling. Haul in a catch of sardines.",
    targetMin: 12, targetMax: 30, coinBase: 35, coinPerUnit: 2 },
  { id: "collect_mackerel", category: "collect", biome: "fish", key: "tile_fish_mackerel", label: "Collect {n} mackerel",
    flavor: "Smoked mackerel keeps a fisher fed through winter. Land a few.",
    targetMin: 8,  targetMax: 20, coinBase: 40, coinPerUnit: 3 },
  { id: "collect_clam",     category: "collect", biome: "fish", key: "tile_fish_clam",     label: "Gather {n} clams",
    flavor: "Low tide won't last — gather clams from the cold flats.",
    targetMin: 6,  targetMax: 14, coinBase: 40, coinPerUnit: 4 },
  { id: "collect_kelp",     category: "collect", biome: "fish", key: "tile_fish_kelp",     label: "Cut {n} kelp",
    flavor: "The dye-makers pay well for good kelp. Cut a bundle.",
    targetMin: 10, targetMax: 22, coinBase: 30, coinPerUnit: 2 },
  // ── fish-biome craft templates ──────────────────────────────────────────────
  { id: "craft_chowder",    category: "craft",   biome: "fish", item: "chowder",      label: "Cook {n} chowder",
    flavor: "Cold nights call for hot chowder. Cook a pot for the docks.",
    targetMin: 1, targetMax: 3, coinBase: 80, coinPerUnit: 40 },
  { id: "craft_fish_oil",   category: "craft",   biome: "fish", item: "fish_oil_bottled", label: "Bottle {n} fish oil",
    flavor: "Lanterns burn long on good fish oil. Bottle a batch.",
    targetMin: 2, targetMax: 5, coinBase: 50, coinPerUnit: 25 },
  // ── mine-biome collect templates ────────────────────────────────────────────
  { id: "collect_stone",  category: "collect", biome: "mine", key: "tile_mine_stone",  label: "Quarry {n} stone",
    flavor: "Bram needs cut stone to shore up the deep tunnels.",
    targetMin: 12, targetMax: 30, coinBase: 35, coinPerUnit: 2 },
  { id: "collect_ore",    category: "collect", biome: "mine", key: "tile_mine_iron_ore",    label: "Mine {n} ore",
    flavor: "No bar without ore. Bram's forge waits on your pick.",
    targetMin: 8,  targetMax: 20, coinBase: 45, coinPerUnit: 3 },
  { id: "collect_coal",   category: "collect", biome: "mine", key: "tile_mine_coal",   label: "Haul {n} coal",
    flavor: "The forge runs cold without coal. Haul it up from the seam.",
    targetMin: 8,  targetMax: 18, coinBase: 40, coinPerUnit: 3 },
  { id: "collect_gem",    category: "collect", biome: "mine", key: "tile_mine_gem",    label: "Find {n} gems",
    flavor: "A gem or two would gladden any deep-dweller's heart.",
    targetMin: 4,  targetMax: 10, coinBase: 60, coinPerUnit: 6 },
  { id: "collect_dirt",   category: "collect", biome: "mine", key: "tile_special_dirt",   label: "Shovel {n} dirt",
    flavor: "Even spoil has its use. Shovel out the loose dirt.",
    targetMin: 12, targetMax: 30, coinBase: 25, coinPerUnit: 1 },
  // ── mine-biome craft templates ──────────────────────────────────────────────
  { id: "craft_lantern",  category: "craft",   biome: "mine", item: "lantern",    label: "Forge {n} lanterns",
    flavor: "The deep tunnels swallow light. Forge lanterns to push back the dark.",
    targetMin: 1, targetMax: 3, coinBase: 50, coinPerUnit: 25 },
  { id: "craft_goldring", category: "craft",   biome: "mine", item: "goldring",   label: "Forge {n} gold rings",
    flavor: "A goldsmith's commission — forge rings worthy of a wedding.",
    targetMin: 1, targetMax: 2, coinBase: 80, coinPerUnit: 50 },
  { id: "craft_cobblepath", category: "craft", biome: "mine", item: "cobblepath", label: "Lay {n} cobble paths",
    flavor: "Muddy lanes vex the whole vale. Lay down a proper cobble path.",
    targetMin: 1, targetMax: 3, coinBase: 60, coinPerUnit: 30 },
  // ── Animal-category collect templates ───────────────────────────────────────
  { id: "collect_pig",     category: "collect", key: "tile_herd_pig",      label: "Drive {n} pigs",
    flavor: "The pigs have wandered the lower field again. Drive them home.",
    targetMin: 5,  targetMax: 12, coinBase: 35, coinPerUnit: 4 },
  { id: "collect_sheep",   category: "collect", key: "tile_herd_sheep",    label: "Lead {n} sheep",
    flavor: "Shearing day looms — lead the flock down from the hills.",
    targetMin: 5,  targetMax: 12, coinBase: 35, coinPerUnit: 4 },
  { id: "collect_cow",     category: "collect", key: "tile_cattle_cow",    label: "Milk {n} cows",
    flavor: "The dairy can't churn what isn't milked. See to the cows.",
    targetMin: 4,  targetMax: 10, coinBase: 50, coinPerUnit: 6 },
  { id: "collect_horse",   category: "collect", key: "tile_mount_horse",   label: "Saddle {n} horses",
    flavor: "Travelers need mounts. Saddle the horses for the road.",
    targetMin: 3,  targetMax: 8,  coinBase: 60, coinPerUnit: 8 },
  { id: "collect_oak",     category: "collect", key: "tile_tree_oak",      label: "Fell {n} oaks",
    flavor: "The old grove is overgrown. Fell a few oaks for the lumber yard.",
    targetMin: 6,  targetMax: 14, coinBase: 30, coinPerUnit: 3 },
  // ── Animal-product craft templates (upgrade chain end-products) ─────────────
  { id: "craft_pie",       category: "craft",   item: "pie",          label: "Bake {n} pies",
    flavor: "Sister Liss promised the children pie. Don't let her down.",
    targetMin: 1, targetMax: 3, coinBase: 80, coinPerUnit: 50 },
  { id: "craft_meat",      category: "craft",   item: "meat",         label: "Stockpile {n} meat",
    flavor: "The larder looks thin for winter. Stockpile salted meat.",
    targetMin: 2, targetMax: 5, coinBase: 50, coinPerUnit: 30 },
  { id: "craft_milk",      category: "craft",   item: "milk",         label: "Bottle {n} milk",
    flavor: "Bottled milk by morning, says the dairy. Best get bottling.",
    targetMin: 2, targetMax: 5, coinBase: 60, coinPerUnit: 35 },
];
