// docs/zones — The ten zone specs (single source of truth).
// Each is a complete design: environment + palette, growth topology, tier ladder (rungs/plots/unlocks/cost),
// themed buildings, hazards (reused + new), a boss, a signature play mechanic, and a starter tile set.
// build.mjs renders the atlas and per-zone docs from this. Pixel art is generated only once layouts lock.

/** @typedef {{coins:number,res?:Record<string,number>}} Cost */

export const ZONES = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1 · MIREFEN HOLLOW — drowned wetlands, a town on stilts over black water
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mirefen",
    name: "Mirefen Hollow",
    tagline: "A stilt-town strung across black water on golden boardwalks.",
    order: 1, level: 3, region: "fen", emoji: "🪷",
    env: {
      mood: "Hushed, misty, golden-hour still. Frogs and fireflies; reeds whispering.",
      biome: "marsh / fen", frontier: "open black water & reed beds, planked into buildable hummocks",
      palette: {
        sky: ["#cdb98a", "#9fae8c"], ground: "#5f6e4a", ground2: "#6f7a52",
        surface: "#2c4a47", surface2: "#365a52", path: "#b88a52", accent: "#7a9c5a",
        roof: "#5a7a52", wall: "#cdb98a", glow: "#ffd66a", dark: "#1c2a2a",
      },
      ambient: ["fireflies", "mist", "dragonflies", "lilypads"],
    },
    topology: "ribbon-stilt",
    landmarkStages: ["Reed shrine", "Stilt fountain (cistern)", "Bog-lantern beacon", "The Heron Gate"],
    tiers: [
      { id: "stilt", name: "Fishing Stilt", plots: 3, change: "Three stilt-huts on one boardwalk over the water; a single reed shrine. Mist all around.",
        unlocks: ["hearth", "housing", "fishmonger"], cost: null },
      { id: "bogwalk", name: "Bogwalk Hamlet", plots: 6, change: "The boardwalk forks to a second hummock; a drying-dock and larder; lanterns strung along the planks.",
        unlocks: ["larder", "harbor_dock", "watchtower"], cost: { coins: 650, res: { plank: 16, fish_fillet: 8 } } },
      { id: "village", name: "Mire Village", plots: 10, change: "A cistern fountain rises on the central platform; an apiary on a flowered islet, a brewery for fenmead. Reed beds drained into garden hummocks.",
        unlocks: ["apiary", "brewery", "apothecary", "smokehouse"], cost: { coins: 1700, res: { plank: 22, fish_fillet: 14 } } },
      { id: "town", name: "Fen Town", plots: 15, change: "The Heron Gate beacon crowns the deepwater channel; a chapel of reeds, an inn for fen-traders. Boardwalks knit into a raised plaza.",
        unlocks: ["inn", "chapel", "caravan_post", "granary", "observatory"], cost: { coins: 3600, res: { plank: 30, fenmead: 10 } } },
    ],
    buildings: [
      { id: "hearth", name: "Stilt Hearth", role: "anchor" },
      { id: "housing", name: "Reed Stilt-house", role: "housing" },
      { id: "fishmonger", name: "Bog Fishmonger", role: "craft · eels & catfish" },
      { id: "harbor_dock", name: "Drying Dock", role: "coastal" },
      { id: "apiary", name: "Marsh Apiary", role: "craft · bog-honey" },
      { id: "brewery", name: "Fenmead Brewery", role: "craft · new resource: fenmead" },
      { id: "apothecary", name: "Mirewife's Apothecary", role: "rare bog-herbs" },
      { id: "chapel", name: "Reed Shrine", role: "landmark · +coins/season" },
    ],
    hazards: [
      { name: "Tidewater flood", src: "reuse", effect: "Water rises each in-run season, submerging the lowest board rows (tiles become unchainable).", counter: "Chain to drain — clearing tiles on a flooded row pumps it back; bogwalk pylons protect adjacent rows." },
      { name: "Miasma fog", src: "reuse", effect: "A poison cloud blooms from a vent and spreads; tiles caught in it spoil after 3 turns.", counter: "Chain any tiles in the cloud before the timer to disperse it (gas-vent rules)." },
      { name: "Leech bloom", src: "new", effect: "Leeches latch onto a cluster of tiles and multiply, eating 1 plant/fish tile each per turn.", counter: "Salt-chain: a 4+ chain of any kind purges leeches in its footprint for coins." },
      { name: "Will-o'-wisp lure", src: "new", effect: "A wisp marks a high-value tile and drags it one cell toward the deep water each turn; lost if it reaches the edge.", counter: "Chain the marked tile to break the lure (bonus coins if you do)." },
    ],
    boss: { name: "Quagmire", emoji: "🌿", src: "reuse",
      mechanic: "Reimagined for the fen — the bog floods and reed tiles respawn at 1.5×, but the surge only comes at high tide: ride each high tide to out-harvest the mire before low tide strands you short of the target (respawn_boost × the tide cycle).",
      newAlt: "The Fenmother — a colossal heron-witch who steals a column into the fog each turn unless fed a fish chain." },
    signature: "The tide cycle IS the game: at high tide only the upper boardwalk rows are workable; at low tide the harbour opens below. You bank every build and chain around the rising and falling water — reading the tide, not the board, is the skill.",
    newResources: [{ name: "Fenmead", source: "brewed at the Fenmead Brewery (unlocked at Mire Village) — an end-good you sell or spend, gating the final rung once you can make it" }],
    tiles: {
      ramps: [
        { name: "Bog water", cols: ["#1c2a2a", "#2c4a47", "#365a52", "#4a7068"] },
        { name: "Reed & sedge", cols: ["#3a4a2a", "#5f6e4a", "#7a9c5a", "#a8bf78"] },
        { name: "Boardwalk plank", cols: ["#6a4a28", "#8a6438", "#b88a52", "#d6a868"] },
        { name: "Mist & glow", cols: ["#cdb98a", "#e8dcb0", "#ffd66a", "#fff4c8"] },
      ],
      signature: [
        { name: "Stilt platform + pylons", desc: "The buildable hummock — a planked deck on driven pylons over water." },
        { name: "Boardwalk (autotile)", desc: "Raised plank walkway with straight / corner / T / branch / rail pieces." },
        { name: "Lily-pad & cattail clusters", desc: "Open-water dressing; firefly perches at dusk." },
        { name: "Heron Gate beacon", desc: "Staged landmark — reed shrine → cistern fountain → bog-lantern → heron arch." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2 · CINDERHOLD — a switchback town terraced up an active volcano
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "cinderhold",
    name: "Cinderhold",
    tagline: "Hammers and lava-light — a forge-town climbing a living volcano in switchbacks.",
    order: 2, level: 5, region: "emberwastes", emoji: "🌋",
    env: {
      mood: "Dramatic, hot, dangerous-beautiful. Ember-glow on black rock; a red sky.",
      biome: "volcanic", frontier: "glowing lava fields that cool into buildable obsidian terraces",
      palette: {
        sky: ["#3a1a1e", "#7a3320"], ground: "#2a2226", ground2: "#3a2e30",
        surface: "#ff6a1a", surface2: "#c43a10", path: "#4a3e3e", accent: "#e8702a",
        roof: "#8a3320", wall: "#3e3236", glow: "#ff9a3a", dark: "#120c10",
      },
      ambient: ["embers", "ash", "heat-shimmer", "smoke"],
    },
    topology: "switchback-terrace",
    landmarkStages: ["Ash camp brazier", "Tap-furnace", "Great forge", "Magma Crown"],
    tiers: [
      { id: "camp", name: "Ashfall Camp", plots: 3, change: "Three heat-shielded tents on the lowest cooled shelf, a brazier, a single switchback up the black slope.",
        unlocks: ["hearth", "housing", "smokehouse"], cost: null },
      { id: "terrace", name: "Emberforge Terrace", plots: 6, change: "A second terrace and a tap-furnace; a workshop and watchtower scan for eruptions. The road hairpins higher.",
        unlocks: ["workshop", "watchtower", "powder_store"], cost: { coins: 800, res: { block: 18, obsidian: 8 } } },
      { id: "hold", name: "Cinderhold", plots: 10, change: "The great forge roars on the third terrace; an observatory reads the mountain, a caravan post trades obsidian and steel.",
        unlocks: ["forge", "observatory", "caravan_post", "housing2"], cost: { coins: 2200, res: { iron_bar: 14, obsidian: 16 } } },
      { id: "crown", name: "Magma Crown", plots: 14, change: "Terraces ring the caldera lip; a magma-fed crown-furnace and a basalt chapel. The whole road is paved in fitted obsidian.",
        unlocks: ["chapel", "inn", "housing3", "apothecary"], cost: { coins: 4500, res: { gold_bar: 8, obsidian: 28 } } },
    ],
    buildings: [
      { id: "hearth", name: "Brazier Hearth", role: "anchor" },
      { id: "forge", name: "Great Forge", role: "craft · the heart of the zone" },
      { id: "powder_store", name: "Powder Store", role: "grants bombs/season" },
      { id: "workshop", name: "Toolwright", role: "craft · tools" },
      { id: "smokehouse", name: "Cinder Smokehouse", role: "craft · cured rations" },
      { id: "observatory", name: "Mountain Watch", role: "reads eruptions · gem upgrade" },
      { id: "caravan_post", name: "Obsidian Caravan", role: "trade" },
      { id: "watchtower", name: "Eruption Watchtower", role: "landmark · lookout" },
    ],
    hazards: [
      { name: "Lava flow", src: "reuse", effect: "A molten tongue spreads to a random adjacent cell each turn, destroying resources in its path.", counter: "No direct clear — route your mining away from the channel; obsidian dikes (built) pin its direction." },
      { name: "Ash cloud", src: "reuse", effect: "Falling ash dims a region of the board; dimmed tiles read face-grey and can't be targeted until cleared around.", counter: "Chain at the cloud's edge to thin it; the watchtower shortens its duration." },
      { name: "Ember rain", src: "new", effect: "Cinders ignite 1–2 random tiles per turn (fire rules); fire spreads to neighbours if left.", counter: "Chain burning tiles to snuff them (coins per tile), as with wildfire." },
      { name: "Tremor", src: "new", effect: "A quake jolts the board: one row shuffles its tiles sideways, scrambling near-complete chains.", counter: "The observatory predicts the tremor row a turn ahead so you can cash chains early." },
    ],
    boss: { name: "Ember Drake", emoji: "🔥", src: "reuse",
      mechanic: "Reimagined on the slope — a heat tile spawns each turn and pools on the LOWEST terrace first, so build high and mine low: anything left on heat 2+ turns burns away. Land 3 iron bars before the heat climbs the whole mountain (heat_tiles × the terraces).",
      newAlt: "Magmaw — a lava-worm that surfaces through a terrace, turning a 2×2 block molten until quenched by a stone chain." },
    signature: "A rising heat meter and live lava channels you physically route mining around. Each new terrace is cooled lava you cleared at the frontier — the mountain hands you the next shelf to build on — and obsidian, the premium currency, is only won by clearing that cooled lava.",
    newResources: [{ name: "Obsidian", source: "mined from cooled lava at the frontier (a board resource, not a craft good) — the zone's premium currency, used to gate the higher terraces" }],
    tiles: {
      ramps: [
        { name: "Basalt & obsidian", cols: ["#120c10", "#2a2226", "#3e3236", "#5a4a4e"] },
        { name: "Lava & ember", cols: ["#7a1a08", "#c43a10", "#ff6a1a", "#ffb04a"] },
        { name: "Ash & smoke", cols: ["#4a4044", "#6a5e60", "#8a7e80", "#c8bcbe"] },
        { name: "Forge metal", cols: ["#3a2e30", "#8a5a2a", "#d6922c", "#ffd24d"] },
      ],
      signature: [
        { name: "Terrace shelf + retaining wall", desc: "The buildable cooled-obsidian step cut into the slope, with a basalt retaining edge." },
        { name: "Switchback road (autotile)", desc: "Hairpin road pieces: straight, hairpin-left, hairpin-right, ramp-up." },
        { name: "Lava channel (animated)", desc: "Flowing molten surface with crust crackle; the live hazard + obsidian frontier." },
        { name: "Magma Crown furnace", desc: "Staged landmark — brazier → tap-furnace → great forge → caldera crown." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3 · HOARFROST HOLD — an alpine town huddled around a steaming hot-spring
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "hoarfrost",
    name: "Hoarfrost Hold",
    tagline: "Warm light against the cold — a hollow-town gathered around a steaming spring under the aurora.",
    order: 3, level: 4, region: "frostpeak", emoji: "❄️",
    env: {
      mood: "Serene, cold, cozy-against-the-dark. Snow hush; aurora ribbons; hearths glowing amber.",
      biome: "tundra / alpine", frontier: "deep snow & glacier ice, thawed into warm buildable ground",
      palette: {
        sky: ["#1c2a4a", "#3a5a7a"], ground: "#dfe9f2", ground2: "#c4d6e6",
        surface: "#7fb8d6", surface2: "#a8d4e8", path: "#9aa8b6", accent: "#e8a44a",
        roof: "#6a4a52", wall: "#e8dcc8", glow: "#9affc8", dark: "#16203a",
      },
      ambient: ["snow", "aurora", "steam", "hearthsmoke"],
    },
    topology: "sheltered-hollow",
    landmarkStages: ["Cairn & firepit", "Spring shrine", "Aurora bell", "The Warm Hall"],
    tiers: [
      { id: "ward", name: "Frostward Camp", plots: 3, change: "Three turf-roofed longhuts ringing the steaming spring; a cairn firepit; a wall of snow all around.",
        unlocks: ["hearth", "housing", "smokehouse"], cost: null },
      { id: "hollow", name: "Snowhollow Hamlet", plots: 6, change: "The clearing widens; a larder and a warm inn; the first windbreak palisade. Snow thaws to mud along the paths.",
        unlocks: ["larder", "inn", "watchtower"], cost: { coins: 650, res: { plank: 16, cured_meat: 6 } } },
      { id: "village", name: "Hoarfrost Village", plots: 10, change: "A spring shrine and a reindeer stable; an aurora bell tolls. Insulated longhouses on the outer ring behind a stout windbreak.",
        unlocks: ["stable", "chapel", "observatory", "housing2"], cost: { coins: 1800, res: { plank: 24, hide: 10 } } },
      { id: "hold", name: "Auroral Hold", plots: 15, change: "The Warm Hall crowns the spring; a caravan post for furs and amber, a sky-watch observatory. Bonfire-lit cobble holds the cold at bay.",
        unlocks: ["caravan_post", "apothecary", "housing3", "granary", "clock_tower"], cost: { coins: 3700, res: { plank: 32, amber: 8 } } },
    ],
    buildings: [
      { id: "hearth", name: "Spring Hearth", role: "anchor · radiates warmth" },
      { id: "inn", name: "Warm Lodge", role: "community" },
      { id: "smokehouse", name: "Frost Smokehouse", role: "craft · cured meat" },
      { id: "stable", name: "Reindeer Stable", role: "craft · hardy mounts" },
      { id: "chapel", name: "Aurora Shrine", role: "landmark · +coins/season" },
      { id: "observatory", name: "Aurora Watch", role: "reads the lights · gem upgrade" },
      { id: "housing", name: "Insulated Longhouse", role: "housing" },
      { id: "caravan_post", name: "Fur & Amber Caravan", role: "trade" },
    ],
    hazards: [
      { name: "Hard freeze", src: "reuse", effect: "Two columns freeze solid and can't be chained until thawed — worse the farther from the spring (freeze rules).", counter: "Drop a bonfire on the board edge nearest a frozen column; anything inside its warmth radius thaws within a turn. The hearth keeps the central columns permanently warm." },
      { name: "Blizzard whiteout", src: "new", effect: "A whiteout hides a patch of tiles face-blank for a few turns; you chain blind.", counter: "Tiles inside the warmth radius stay visible; the watchtower narrows the whiteout." },
      { name: "Ice spike", src: "reuse", effect: "Spikes erupt and block 3–4 board cells like rubble.", counter: "Clear via an adjacent grain/log chain (warm produce shatters the ice)." },
      { name: "Avalanche", src: "new", effect: "Snow sweeps a full row from the top edge downward, carrying tiles off unless braced.", counter: "Watchtower + windbreak walls (built) brace the threatened row; chain it out before the sweep lands." },
    ],
    boss: { name: "Frostmaw", emoji: "❄️", src: "reuse",
      mechanic: "Reimagined around the warmth — columns freeze from the OUTSIDE in (farthest from the spring first), so the warm heart is your safe zone; thaw outward with bonfires and harvest 30 oak logs before the ice closes over the spring itself (freeze_columns × warmth).",
      newAlt: "The Wendigo — a starving frost-spirit that snuffs your outermost bonfire each turn, shrinking the warm zone." },
    signature: "Warmth is a resource: the spring projects a warmth radius and tiles outside it freeze faster. You expand the hold by extending bonfires — drop one beside a frozen column to thaw it within a turn. Heat, not space, is the real frontier against the snow.",
    newResources: [{ name: "Hide & amber", source: "board resources — hide from the highland herds, amber foraged from the glacier ice — so they're producible before the rung that spends them" }],
    tiles: {
      ramps: [
        { name: "Snow & ice", cols: ["#a8c0d4", "#c4d6e6", "#dfe9f2", "#ffffff"] },
        { name: "Hot-spring water", cols: ["#3a7a9a", "#5a9ab8", "#7fb8d6", "#bfe4f2"] },
        { name: "Timber & turf", cols: ["#4a3a32", "#6a4a3a", "#8a6a4a", "#b89a72"] },
        { name: "Hearth & aurora", cols: ["#e8a44a", "#ffd07a", "#9affc8", "#b0a0ff"] },
      ],
      signature: [
        { name: "Thawed ground patch", desc: "The buildable cleared ground — warm mud ringed by snowmelt within the spring's reach." },
        { name: "Windbreak palisade (autotile)", desc: "Snow-laden log wall sheltering the outer rings; straight / corner / gate pieces." },
        { name: "Steaming hot-spring", desc: "Animated turquoise spring with rising steam — the warm heart and central landmark base." },
        { name: "Bonfire (warmth emitter)", desc: "Built prop that projects a thaw radius; flickering light, melt-ring underneath." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4 · SUNSPIRE OASIS — a caravan city growing in rings around a desert spring
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "sunspire",
    name: "Sunspire Oasis",
    tagline: "Bells, spice and water in the dunes — a caravan city ringing an oasis under a great sundial.",
    order: 4, level: 4, region: "sands", emoji: "🏜️",
    env: {
      mood: "Warm, exotic, bustling. Heat-haze by day, lantern-bazaar by night; a sky of brass and rose.",
      biome: "desert", frontier: "encroaching dunes, pushed back and irrigated into green oasis rings",
      palette: {
        sky: ["#e8b46a", "#d98a4a"], ground: "#e0c088", ground2: "#d6b074",
        surface: "#3a9a8a", surface2: "#52b8a4", path: "#c49a5a", accent: "#c45a3a",
        roof: "#b85a30", wall: "#e8d4a8", glow: "#ffd24d", dark: "#5a3a1a",
      },
      ambient: ["dust", "heat-haze", "palm-sway", "lanterns"],
    },
    topology: "oasis-rings",
    landmarkStages: ["Wellhead", "Palm cistern", "Sundial spire", "Grand sundial", "The Sunspire"],
    tiers: [
      { id: "camp", name: "Wellspring Camp", plots: 3, change: "Three tents and a stone wellhead at the water's edge; a single date-palm; dunes pressing in on every side.",
        unlocks: ["hearth", "housing", "granary"], cost: null },
      { id: "halt", name: "Caravan Halt", plots: 6, change: "The first ring wraps the oasis with a low wall and a gate; a caravanserai inn and an apiary among the palms.",
        unlocks: ["inn", "caravan_post", "apiary"], cost: { coins: 700, res: { block: 16, dates: 8 } } },
      { id: "market", name: "Oasis Market", plots: 10, change: "A second ring and a sundial spire; a spice apothecary and a bakery-bazaar. Irrigation greens the inner ring.",
        unlocks: ["apothecary", "bakery", "kitchen", "housing2"], cost: { coins: 1900, res: { block: 24, dates: 12 } } },
      { id: "town", name: "Sunspire Town", plots: 14, change: "A grand sundial crowns the plaza; a sun-temple chapel and a star-navigation observatory. Three rings, all walled.",
        unlocks: ["chapel", "observatory", "clock_tower", "housing3"], cost: { coins: 3400, res: { block: 30, spice: 16, gold_bar: 4 } } },
      { id: "capital", name: "Spice Capital", plots: 20, change: "The Sunspire itself — a brass gnomon visible across the dunes; the outer ring is a sprawling bazaar with a forge and full caravan exchange.",
        unlocks: ["forge", "smokehouse", "brewery", "stable", "watchtower"], cost: { coins: 6000, res: { gold_bar: 10, spice: 28 } } },
    ],
    buildings: [
      { id: "caravan_post", name: "Caravan Exchange", role: "trade · the heart of the zone" },
      { id: "bakery", name: "Spice Bazaar", role: "craft · breads & spice goods" },
      { id: "inn", name: "Caravanserai", role: "community · lodging" },
      { id: "apothecary", name: "Spice Apothecary", role: "remedies · new resource: spice" },
      { id: "apiary", name: "Date-Palm Apiary", role: "craft · oasis honey" },
      { id: "clock_tower", name: "Sundial Spire", role: "landmark · the Sunspire" },
      { id: "observatory", name: "Star-Navigator's Tower", role: "navigation · gem upgrade" },
      { id: "chapel", name: "Sun Temple", role: "landmark · +coins/season" },
    ],
    hazards: [
      { name: "Sandstorm", src: "new", effect: "A wall of dust sweeps across the board over 2–3 turns, burying tiles it passes (face-sand) and relocating a few.", counter: "Walls (built) on the windward side break the storm; chain ahead of the front to bank resources." },
      { name: "Drought", src: "new", effect: "The spring runs low: yields drop and your stockpile drains faster until water is restored.", counter: "Chain water/oasis tiles to refill the cistern; irrigation buildings soften the penalty." },
      { name: "Scorpion swarm", src: "new", effect: "Scorpions surface in a cluster and creep outward, stinging (locking) tiles they cover.", counter: "A 4+ chain over the cluster scatters them for coins (rat/locust rules)." },
      { name: "Quicksand", src: "new", effect: "Patches turn sticky — tiles on them take two chains to clear, eating turns.", counter: "Plank causeways (built) firm up routes; a tool can solidify a patch." },
      { name: "Mirage", src: "new", effect: "Heat-shimmer disguises a cluster of tiles as the wrong resource; a chain built on a misread mirage fails and wastes the turn.", counter: "Chain a single tile at the mirage's edge to dispel the shimmer and reveal the true tiles before you commit a big chain." },
    ],
    boss: { name: "The Sandwyrm", emoji: "🐉", src: "new",
      mechanic: "The wyrm tunnels beneath the board: each turn it surfaces and buries a moving 2×3 block (rubble that drifts). Mine the target before it swallows the oasis.",
      newAlt: "The Dust Djinn — swaps two random tiles each turn, sabotaging set-ups; banished by a long single-colour chain." },
    signature: "Two live systems pull against each other: bank stockpile into caravans for big coin multipliers when a route is open, while mirage tiles (the hazard) disguise one resource as another — so the safest big chain and the most profitable one are rarely the same tiles. Greed vs. certainty, every turn.",
    newResources: [{ name: "Spice", source: "milled at the Spice Apothecary (unlocked at Oasis Market) — gates the upper rungs only once you can produce it" }, { name: "Dates", source: "a board fruit (date-palm tiles), producible from tier 0 — so the early rungs that spend it never softlock" }],
    tiles: {
      ramps: [
        { name: "Sand & dune", cols: ["#c49a5a", "#d6b074", "#e0c088", "#f2dca8"] },
        { name: "Oasis water & green", cols: ["#2a6a5a", "#3a9a8a", "#52b8a4", "#7fd6c0"] },
        { name: "Sandstone & adobe", cols: ["#8a5a2a", "#b88a52", "#e8d4a8", "#f4e8c8"] },
        { name: "Spice & lantern", cols: ["#b83a1a", "#e85a2a", "#ffd24d", "#ff8a3a"] },
      ],
      signature: [
        { name: "Ring wall + gate (autotile)", desc: "The concentric oasis wall — straight / corner / gate / tower pieces that wrap each new ring." },
        { name: "Caravan road spoke", desc: "Packed-sand road radiating from the gate into the dunes, with wheel-rut detail." },
        { name: "Date-palm & oasis pool", desc: "Animated palm sway over the turquoise spring — the green heart in the gold." },
        { name: "Sunspire gnomon", desc: "Staged landmark — wellhead → sundial spire → grand sundial → the brass Sunspire." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5 · GULLCLIFF — a fishing town stacked up a sheer sea-cliff
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "gullcliff",
    name: "Gullcliff",
    tagline: "Stacked up the chalk cliff over a crashing sea — stairs, lifts, lighthouses and gulls.",
    order: 5, level: 3, region: "coast", emoji: "🪺",
    env: {
      mood: "Windswept, briny, vertiginous. Surf-thunder; wheeling gulls; a beacon sweeping the dusk.",
      biome: "coastal cliff", frontier: "bare cliff rock, carved into railed terraces and harbour shelves",
      palette: {
        sky: ["#bcd2dc", "#8fb4c4"], ground: "#cfc8ba", ground2: "#b8b0a0",
        surface: "#3a7a9a", surface2: "#52a0bc", path: "#9a9286", accent: "#c4502a",
        roof: "#3a6a7a", wall: "#e8e0d0", glow: "#ffe08a", dark: "#2a3a44",
      },
      ambient: ["gulls", "sea-spray", "foam", "beacon-sweep"],
    },
    topology: "vertical-cliff",
    landmarkStages: ["Tide-watch post", "Stone beacon", "Lighthouse", "Beaconhead"],
    tiers: [
      { id: "landing", name: "Tidewatch Landing", plots: 3, change: "Three cottages on the lowest shelf above the tide-pools; a watch-post lantern; a rope stair to the rock above.",
        unlocks: ["hearth", "housing", "harbor_dock"], cost: null },
      { id: "stair", name: "Cliffstair Hamlet", plots: 6, change: "A second shelf and a cargo lift; a fishmonger and a smokehouse over the drying-racks; switchback stairs climb on.",
        unlocks: ["fishmonger", "smokehouse", "watchtower"], cost: { coins: 700, res: { plank: 16, fish_fillet: 10 } } },
      { id: "town", name: "Gullcliff Town", plots: 10, change: "A stone lighthouse rises mid-cliff; a sailors' inn and a sea-shrine chapel; railed terraces and lantern-strung stairs.",
        unlocks: ["lighthouse", "inn", "chapel", "larder"], cost: { coins: 1800, res: { plank: 24, pearls: 6 } } },
      { id: "head", name: "Beaconhead", plots: 15, change: "The great beacon crowns the headland, sweeping the sea; an observatory and caravan post on the top shelf, the harbour doubled below.",
        unlocks: ["observatory", "caravan_post", "housing2", "granary", "apothecary"], cost: { coins: 3700, res: { plank: 32, pearls: 12 } } },
    ],
    buildings: [
      { id: "lighthouse", name: "Great Beacon", role: "landmark · the heart of the zone" },
      { id: "fishmonger", name: "Cliff Fishmonger", role: "craft · fish & pearls" },
      { id: "harbor_dock", name: "Tide Harbour", role: "coastal · the fishing board" },
      { id: "smokehouse", name: "Drying Smokehouse", role: "craft · smoked fish" },
      { id: "inn", name: "Sailors' Rest", role: "community" },
      { id: "chapel", name: "Sea Shrine", role: "landmark · +coins/season" },
      { id: "watchtower", name: "Storm Watch", role: "lookout · storm warning" },
      { id: "housing", name: "Cliff Cottage", role: "housing" },
    ],
    hazards: [
      { name: "Squall (min-chain)", src: "reuse", effect: "In rough weather, fish chains under length 4 fail and waste the turn (storm rules).", counter: "The storm-watch flags the squall a turn early; bank short chains before it hits." },
      { name: "Riptide", src: "new", effect: "The undertow drags the bottom harbour row one cell seaward each turn; tiles lost off the edge are gone.", counter: "Chain the bottom row to land the catch before it's pulled out; the harbour wall (built) slows the drag." },
      { name: "Rogue wave", src: "new", effect: "Every few turns a wave floods the lowest two rows, washing loose tiles away.", counter: "The lighthouse predicts the wave; a sea-wall building shields one row." },
      { name: "Gull raid", src: "new", effect: "Gulls dive on fish/egg tiles and carry them off, like wolves but from above and faster.", counter: "A scare-chain (any 3 adjacent) near the flock drives them off for a turn." },
    ],
    boss: { name: "The Storm", emoji: "🌩", src: "reuse",
      mechanic: "Reimagined with the beacon — the squall demands fish chains of 4+, but the lighthouse sweep briefly calms ONE column each pass, so you time your big chains to the rotating light. Land 6 fillets before the window closes (min_chain × the beacon sweep).",
      newAlt: "The Kraken — a tentacle rises each turn and yanks a column down into the sea unless a pearl chain severs it." },
    signature: "A vertical logistics puzzle no flat zone has: the cargo lift physically carries resource tiles between shelves, so where you mine (low) and where you craft (high) sit on different levels — and the harbour rows at the base flood and drain with the tide. You play up and down, not just across.",
    newResources: [{ name: "Pearls", source: "a board resource (oyster tiles on the fishing board), producible from tier 0 — so the rungs that spend it never softlock" }],
    tiles: {
      ramps: [
        { name: "Chalk & slate", cols: ["#8a8276", "#b8b0a0", "#cfc8ba", "#ece4d4"] },
        { name: "Sea & foam", cols: ["#1c4a5e", "#3a7a9a", "#52a0bc", "#bfe0ec"] },
        { name: "Weathered timber", cols: ["#3a4a50", "#5a6a6e", "#7a8a8a", "#a8b4b2"] },
        { name: "Beacon & gull", cols: ["#c4502a", "#ffe08a", "#fff6e0", "#e8e0d0"] },
      ],
      signature: [
        { name: "Cliff terrace shelf", desc: "The buildable carved shelf with a safety rail and a stair landing." },
        { name: "Switchback stair + cargo lift", desc: "Vertical connectors between shelves; the lift is the tier-gated growth piece." },
        { name: "Tide-pool harbour (animated)", desc: "Rock pools and surf at the cliff base that flood/drain with the tide — the fishing board." },
        { name: "Sweeping beacon", desc: "Staged landmark — watch-lantern → stone beacon → lighthouse → great headland beacon." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6 · THORNWILD CANOPY — a village in the boughs of colossal trees
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "thornwild",
    name: "Thornwild Canopy",
    tagline: "A village in the treetops — platforms and rope bridges strung through colossal ancient boughs.",
    order: 6, level: 5, region: "deepwood", emoji: "🌳",
    env: {
      mood: "Enchanted, hidden, verdant. Dappled sun-shafts; drifting spores; birdsong far below.",
      biome: "giant forest / canopy", frontier: "thornvine undergrowth, cleared to reveal buildable boughs",
      palette: {
        sky: ["#bfe0a8", "#7aae6a"], ground: "#3a5a32", ground2: "#4a6e3a",
        surface: "#2a4226", surface2: "#365a2e", path: "#8a6a3a", accent: "#d6a83a",
        roof: "#6a8a3a", wall: "#c4a874", glow: "#ffe27a", dark: "#16240f",
      },
      ambient: ["spores", "sun-shafts", "fireflies", "leaf-fall"],
    },
    topology: "canopy-platforms",
    landmarkStages: ["Hearth-hollow", "Grove totem", "Sunlight loom", "Highcrown tree"],
    tiers: [
      { id: "root", name: "Root Camp", plots: 3, change: "Three platforms low on a great trunk, joined by one rope bridge; a hearth in a burl-hollow; thornvine all around.",
        unlocks: ["hearth", "housing", "larder"], cost: null },
      { id: "bough", name: "Bough Hamlet", plots: 6, change: "Bridges span to a second tree; a sustainable sawmill and a canopy apiary; the undergrowth pulls back from the trunks.",
        unlocks: ["sawmill", "apiary", "watchtower"], cost: { coins: 650, res: { plank: 18, amber_sap: 4 } } },
      { id: "village", name: "Canopy Village", plots: 10, change: "A grove totem and a herbalist's apothecary; an inn-treehouse and a grove shrine. Platforms climb to the mid-canopy where sun-shafts break through.",
        unlocks: ["apothecary", "inn", "chapel", "housing2"], cost: { coins: 1700, res: { plank: 26, honey: 8 } } },
      { id: "highcrown", name: "Highcrown", plots: 15, change: "The Highcrown tree breaks the canopy with a sunlight loom and an observatory above the leaves; a caravan post for amber sap and rare herbs.",
        unlocks: ["observatory", "caravan_post", "housing3", "granary", "brewery"], cost: { coins: 3600, res: { plank: 34, amber_sap: 8 } } },
    ],
    buildings: [
      { id: "sawmill", name: "Bough Sawmill", role: "craft · sustainable timber" },
      { id: "apiary", name: "Canopy Apiary", role: "craft · treetop honey" },
      { id: "apothecary", name: "Herbalist's Hollow", role: "rare herbs · new resource: herbs" },
      { id: "inn", name: "Treehouse Lodge", role: "community" },
      { id: "chapel", name: "Grove Shrine", role: "landmark · +coins/season" },
      { id: "observatory", name: "Above-Canopy Watch", role: "gem upgrade · sun-reading" },
      { id: "housing", name: "Bough Treehouse", role: "housing" },
      { id: "caravan_post", name: "Sap & Herb Caravan", role: "trade" },
    ],
    hazards: [
      { name: "Spore bloom", src: "reuse", effect: "Fungus spreads across the platforms, fouling tiles it covers (fungus rules).", counter: "Chain through the spread to cut it back; the herbalist halves the spread rate." },
      { name: "Canopy prowlers", src: "reuse", effect: "Big cats stalk the bird/egg tiles along the bridges, eating them each turn (wolf rules, reflavoured).", counter: "A scare-chain or a built watchtower drives them off (scared state)." },
      { name: "Thornvine overgrowth", src: "new", effect: "Vines creep back over cleared tiles, blocking them; they advance like a slow fire if ignored.", counter: "Chain the vine tiles to cut them (coins per cut); the sawmill keeps adjacent boughs clear." },
      { name: "Beetle infestation", src: "new", effect: "Wood-borers cluster on a platform and chew plank/tree tiles outward.", counter: "A 4+ chain over the cluster smokes them out (rat/locust rules)." },
    ],
    boss: { name: "Mossback", emoji: "🌱", src: "reuse",
      mechanic: "Reimagined in the canopy — four tiles hide face-down under moss, but a roaming sun-shaft reveals any hidden tile it crosses, so you chase the light to expose the moss and gather 30 berries before the canopy swallows them (hide_resources × the sun-shaft).",
      newAlt: "The Elder Bramble — a waking treant that ensnares a bridge each turn, cutting one platform off until freed by an axe chain." },
    signature: "You grow UP, not out: each rung climbs to a higher layer — understory → mid-canopy → emergent crown — and roaming sun-shafts super-charge any plant tile they cross. The brighter (higher) you build, the richer the harvest, so the town reaches for the light.",
    newResources: [{ name: "Herbs", source: "distilled at the Herbalist's Hollow (unlocked at Canopy Village) — gates the upper rung only once producible" }, { name: "Amber sap", source: "a board resource (tapped from the great trunks), producible from tier 0" }],
    tiles: {
      ramps: [
        { name: "Leaf & moss", cols: ["#16240f", "#2a4226", "#4a6e3a", "#7aae6a"] },
        { name: "Bark & bough", cols: ["#3a2a1a", "#5a4228", "#8a6a3a", "#b89860"] },
        { name: "Mushroom & spore", cols: ["#7a3a3a", "#c45a4a", "#e8c0a0", "#fff0d8"] },
        { name: "Sun-shaft & amber", cols: ["#d6a83a", "#ffe27a", "#fff6c8", "#9affb0"] },
      ],
      signature: [
        { name: "Bough platform + railing", desc: "The buildable deck lashed around a great trunk at a set height." },
        { name: "Rope / vine bridge (autotile)", desc: "Sagging plank-and-rope spans between platforms; straight / fork / anchor pieces." },
        { name: "Giant trunk & sun-shaft", desc: "Colossal tree base with a roaming light-shaft beam — the vertical anchor and signature mechanic." },
        { name: "Highcrown loom", desc: "Staged landmark — burl hearth → grove totem → sunlight loom → emergent crown." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7 · GLIMMERDEEP — an underground city of linked crystal caverns
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "glimmerdeep",
    name: "Glimmerdeep",
    tagline: "A city in the dark below — glowing caverns strung together by mine-cart tunnels.",
    order: 7, level: 6, region: "underdeep", emoji: "💎",
    env: {
      mood: "Awe, glittering dark, subterranean wonder. Crystal-light on still water; glowworm constellations.",
      biome: "deep cave / crystal", frontier: "unlit rock & rubble, cleared to open the next glowing chamber",
      palette: {
        sky: ["#1a1430", "#2a1f48"], ground: "#2a2440", ground2: "#352e52",
        surface: "#2a3a6a", surface2: "#3a5a9a", path: "#4a4060", accent: "#46d6e0",
        roof: "#5a3a7a", wall: "#3e3658", glow: "#5af0ff", dark: "#0e0a1c",
      },
      ambient: ["glowworms", "crystal-sparkle", "dripwater", "dust-motes"],
    },
    topology: "linked-chambers",
    landmarkStages: ["Lantern post", "Crystal cairn", "Geode shrine", "Resonant spire", "The Heart Geode"],
    tiers: [
      { id: "camp", name: "Lantern Camp", plots: 3, change: "Three carved dwellings in the first lit cavern around a lantern post; a single dark tunnel-mouth leading on.",
        unlocks: ["hearth", "housing", "workshop"], cost: null },
      { id: "dig", name: "Crystal Dig", plots: 6, change: "A cart-tunnel opens a second chamber; a forge and a powder store; rails thread between the caverns.",
        unlocks: ["forge", "powder_store", "watchtower"], cost: { coins: 800, res: { block: 18, cut_gem: 6 } } },
      { id: "town", name: "Glimmer Town", plots: 10, change: "A geode shrine and a resonant observatory read the crystal-song; an apothecary distils crystal essence. Three caverns lit and linked.",
        unlocks: ["observatory", "apothecary", "caravan_post", "housing2"], cost: { coins: 2200, res: { cut_gem: 12, crystal: 8 } } },
      { id: "deephold", name: "Deephold", plots: 14, change: "A fourth, deeper chamber and a crystal chapel; cart-lines run ore between districts. Bridges cross an underground lake.",
        unlocks: ["chapel", "inn", "housing3", "granary"], cost: { coins: 4200, res: { crystal: 16, gold_bar: 6 } } },
      { id: "geode", name: "Geode City", plots: 20, change: "The Heart Geode blazes at the city's core, a cathedral of light; the outer chambers hold a full forge-district and exchange.",
        unlocks: ["smokehouse", "brewery", "stable", "clock_tower", "barn"], cost: { coins: 6500, res: { crystal: 30, gold_bar: 12 } } },
    ],
    buildings: [
      { id: "forge", name: "Deep Forge", role: "craft · metalwork" },
      { id: "observatory", name: "Resonance Spire", role: "the heart · reads crystal-song · gem upgrade" },
      { id: "apothecary", name: "Crystal Distillery", role: "essence · new resource: crystal" },
      { id: "powder_store", name: "Blasting Store", role: "grants bombs/season" },
      { id: "caravan_post", name: "Cart-Line Exchange", role: "trade · ore carts" },
      { id: "chapel", name: "Crystal Shrine", role: "landmark · +coins/season" },
      { id: "housing", name: "Carved Dwelling", role: "housing" },
      { id: "workshop", name: "Lapidary", role: "craft · gem-cutting tools" },
    ],
    hazards: [
      { name: "Cave-in", src: "reuse", effect: "Rubble buries an entire row, making it unchainable (cave-in rules).", counter: "Clear with a stone chain adjacent to the buried row; a sapper (worker) cuts the spawn rate." },
      { name: "Gas vent", src: "reuse", effect: "A pocket of choke-damp blooms and spreads; tiles in it spoil after 3 turns.", counter: "Chain through the cloud before the timer; a canary (worker) warns early." },
      { name: "Sinkhole", src: "new", effect: "The floor gives way: a 2×2 hole opens and any tiles over it drop and are lost.", counter: "Bridge the hole with a plank chain, or simply mine the threatened tiles before it opens." },
      { name: "Resonance quake", src: "new", effect: "A crystal hum shakes a chamber, shuffling one column and dimming the lanterns for a turn.", counter: "The resonance spire predicts the quake column; relit lanterns steady it." },
    ],
    boss: { name: "Old Stoneface", emoji: "🪨", src: "reuse",
      mechanic: "Reimagined in the dark — each time the golem drops one of its four rubble blocks it also snuffs the nearest lantern, so you fight to keep the chamber LIT while you clear 20 stone tiles before it seals the cavern (rubble_blocks × the light system).",
      newAlt: "The Crystal Colossus — a living geode that drains the light from one lantern each turn; relight the cavern by chaining gems." },
    signature: "Light is life: unlit tiles can't be chained until a lantern or crystal reaches them. You expand by carrying light into the dark — and cart-rails ferry mined resources between chambers, so a rich chamber can feed a poor one.",
    newResources: [{ name: "Crystal", source: "mined from glowing crystal seams (a board resource), producible from the first dig — so the rungs that spend it never softlock" }],
    tiles: {
      ramps: [
        { name: "Cave rock", cols: ["#0e0a1c", "#2a2440", "#3e3658", "#5a5278"] },
        { name: "Crystal glow", cols: ["#1a6a8a", "#2aa8c4", "#5af0ff", "#c0fbff"] },
        { name: "Geode vein", cols: ["#5a2a7a", "#9a3ab0", "#d65ae0", "#f0a8ff"] },
        { name: "Lantern & ore", cols: ["#3a2a1a", "#c4902c", "#ffd24d", "#fff0b0"] },
      ],
      signature: [
        { name: "Carved cavern floor", desc: "The buildable lit ground — smoothed rock ringed by glowing crystal seams." },
        { name: "Cart-rail tunnel (autotile)", desc: "The connector between chambers: rail straight / curve / junction / cart pieces." },
        { name: "Bioluminescent crystal cluster", desc: "Animated glow-crystals that light the chamber — the light-source the whole zone runs on." },
        { name: "Heart Geode", desc: "Staged landmark — lantern post → geode shrine → resonant spire → blazing heart geode." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8 · AETHERREACH — a sky-port on floating islands above the clouds
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "aetherreach",
    name: "Aetherreach",
    tagline: "A sky-port adrift above the clouds — islets tethered by bridges, airships at the docks.",
    order: 8, level: 7, region: "skyrealm", emoji: "☁️",
    env: {
      mood: "Lofty, dreamlike, adventurous. Sunlit cloud-sea; waterfalls into the void; airship sails.",
      biome: "floating sky-isles", frontier: "open sky & drifting loose rock, anchored into built islets",
      palette: {
        sky: ["#8fc4e8", "#cfe6f4"], ground: "#c8b894", ground2: "#b8a47e",
        surface: "#e8f2fa", surface2: "#ffffff", path: "#a89878", accent: "#7a5ac4",
        roof: "#5a6ab0", wall: "#ece2cc", glow: "#b89aff", dark: "#3a4a6a", frontierFill: "#9fc8ea",
      },
      ambient: ["clouds", "airships", "drifting-petals", "lens-flare"],
    },
    topology: "sky-archipelago",
    landmarkStages: ["Mooring mast", "Sky-beacon", "Wind shrine", "Aether spire", "The Sky Citadel"],
    tiers: [
      { id: "anchor", name: "Anchor Platform", plots: 3, change: "Three cottages on one tethered islet around a mooring mast; a single rope sky-bridge to a drifting rock.",
        unlocks: ["hearth", "housing", "workshop"], cost: null },
      { id: "skydock", name: "Skydock Hamlet", plots: 6, change: "A second islet anchored; an airship caravan-dock and a skyport inn; zip-lines link the platforms.",
        unlocks: ["caravan_post", "inn", "watchtower"], cost: { coins: 750, res: { plank: 16, aether: 6 } } },
      { id: "village", name: "Aether Village", plots: 10, change: "A sky-beacon and an above-cloud observatory; a wind-shrine chapel. Sky-bridges arch between four islets.",
        unlocks: ["observatory", "chapel", "portal", "housing2"], cost: { coins: 1900, res: { plank: 24, aether: 12 } } },
      { id: "town", name: "Cloudreach Town", plots: 14, change: "An aether spire crowns the central isle; a sky-spire clock and a second airship dock. A drifting market-isle joins the archipelago.",
        unlocks: ["clock_tower", "housing3", "granary", "apothecary"], cost: { coins: 3600, res: { aether: 20, gold_bar: 6 } } },
      { id: "citadel", name: "Sky Citadel", plots: 18, change: "The Sky Citadel anchors the realm — a ringed cluster of isles around the great spire, with a forge-isle and a full aether exchange.",
        unlocks: ["forge", "smokehouse", "brewery", "stable"], cost: { coins: 5800, res: { aether: 32, gold_bar: 12 } } },
    ],
    buildings: [
      { id: "caravan_post", name: "Airship Dock", role: "trade · the heart of the zone" },
      { id: "portal", name: "Aether Portal", role: "arcane · sky-gate" },
      { id: "observatory", name: "Above-Cloud Observatory", role: "gem upgrade · star-reading" },
      { id: "workshop", name: "Airship Works", role: "craft · sky-gear" },
      { id: "inn", name: "Skyport Inn", role: "community" },
      { id: "chapel", name: "Wind Shrine", role: "landmark · +coins/season" },
      { id: "clock_tower", name: "Sky Spire", role: "landmark · the Citadel" },
      { id: "housing", name: "Sky Cottage", role: "housing" },
    ],
    hazards: [
      { name: "Gale", src: "new", effect: "A crosswind shoves every tile in a column one cell sideways each turn, drifting your set-ups apart.", counter: "Windbreak sails (built) on an isle still the gale within their reach; chain with the wind, not against it." },
      { name: "Lightning", src: "new", effect: "A bolt strikes a random tile and destroys it (and sometimes a neighbour).", counter: "The sky-spire's rod draws strikes to itself; the observatory marks the next strike cell." },
      { name: "Island-drift", src: "new", effect: "A loose islet drifts out of reach for a few turns — its tiles are NOT destroyed, just temporarily unreachable, shrinking your workable board until it floats back.", counter: "Anchor chains (built) keep an isle from drifting at all; otherwise just work the rest of the board until it returns — nothing is ever lost." },
      { name: "Cloud-leech swarm", src: "new", effect: "Sky-jellies drift onto the board in a cluster and sap charge from tiles they touch.", counter: "A 4+ chain pops the swarm for coins (rat/locust rules)." },
    ],
    boss: { name: "The Sky Leviathan", emoji: "🐋", src: "new",
      mechanic: "A vast sky-whale circles the archipelago; each pass its wake tilts the board, sliding a whole edge of tiles toward the void. Deliver the cargo target before three passes.",
      newAlt: "The Storm Roc — a thunderbird that snatches your highest islet each turn unless warded by a wind chain." },
    signature: "Everything floats — from tier 0, untethered tiles drift one cell with the prevailing wind each turn (the wind rotates per season), so anchoring and chain-direction always matter; the Gale hazard just turns the wind up. Airships ferry stockpile between isles.",
    newResources: [{ name: "Aether", source: "mined from the floating rock itself (a board resource), producible from the first islet — so the rungs that spend it never softlock" }],
    tiles: {
      ramps: [
        { name: "Cloud & sky", cols: ["#8fc4e8", "#bcdcf0", "#e8f2fa", "#ffffff"] },
        { name: "Floating rock", cols: ["#7a6a4a", "#a89878", "#c8b894", "#e4d6b4"] },
        { name: "Aether & glow", cols: ["#5a3ab0", "#7a5ac4", "#b89aff", "#e0d0ff"] },
        { name: "Sail & brass", cols: ["#3a4a6a", "#7088b0", "#d6b86a", "#ffe8a8"] },
      ],
      signature: [
        { name: "Floating islet (anchored)", desc: "The buildable platform — a grassy floating rock with a glowing aether underside and tether rings." },
        { name: "Sky-bridge / zip-line (autotile)", desc: "Arched rope-and-plank spans and cable lines between islets; anchor / span / dock pieces." },
        { name: "Cloud sea & waterfall", desc: "The drifting cloud floor with rock-edge waterfalls pouring into the void — the frontier." },
        { name: "Aether Spire", desc: "Staged landmark — mooring mast → sky-beacon → aether spire → the ringed Sky Citadel." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9 · GRAVEMOOR — reclaiming a cursed ruin-grid on a haunted moor
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "gravemoor",
    name: "Gravemoor",
    tagline: "Lantern by lantern, reclaim a cursed ruin from the fog — rebuild the old kingdom's bones.",
    order: 9, level: 6, region: "blightmoor", emoji: "🕯️",
    env: {
      mood: "Eerie, melancholic turning hopeful, gothic. Fog over broken stone; wisps adrift; bells warding the dark.",
      biome: "haunted moor / ruins", frontier: "blight-fog & bramble over ruins, cleansed into hallowed cobble",
      palette: {
        sky: ["#3a3450", "#5a5470"], ground: "#6a6678", ground2: "#7a7488",
        surface: "#3a4a3a", surface2: "#4a5a48", path: "#9a96a8", cobble: "#b4b0c2", accent: "#e88a3a",
        roof: "#4a3a5a", wall: "#b8b0bc", glow: "#7adcff", dark: "#1e1a2c", frontierFill: "#2c2840",
      },
      ambient: ["fog", "wisps", "bats", "embers"],
    },
    topology: "reclaimed-grid",
    landmarkStages: ["Warding fire", "Broken shrine", "Consecrated bell", "The Dawnlight"],
    tiers: [
      { id: "camp", name: "Wardens' Camp", plots: 3, change: "Three tents pitched on a cleared crossroads of the old grid; a warding fire; ruined foundations and fog stretching off into the dark.",
        unlocks: ["hearth", "housing", "watchtower"], cost: null },
      { id: "hamlet", name: "Hallowed Hamlet", plots: 6, change: "The bell-shrine is re-raised; an apothecary of curse-remedies and a larder. The blight recedes one old street, cobble laid back over the ruins.",
        unlocks: ["chapel", "apothecary", "larder"], cost: { coins: 700, res: { block: 18 } } },
      { id: "village", name: "Reclaimed Village", plots: 10, change: "A consecrated bell tolls; restored manors on ancient footings, a wayfarers' inn, a smokehouse. Lantern-light pushes the fog back two more blocks.",
        unlocks: ["inn", "smokehouse", "clock_tower", "housing2"], cost: { coins: 1800, res: { block: 24, warding_salt: 12 } } },
      { id: "dawn", name: "Dawnhold", plots: 15, change: "The Dawnlight crowns the old keep — the curse broken; an observatory of omens and a caravan post. The reclaimed grid glows with warded cobble and street-lamps.",
        unlocks: ["observatory", "caravan_post", "housing3", "granary", "forge"], cost: { coins: 3700, res: { block: 30, blessed_oil: 8 } } },
    ],
    buildings: [
      { id: "chapel", name: "Consecrated Chapel", role: "the heart · wards spirits · brews blessed oil · +coins/season" },
      { id: "watchtower", name: "Wardens' Vigil", role: "lookout · holds the fog line" },
      { id: "apothecary", name: "Curse-ward Apothecary", role: "remedies · new resource: warding salt" },
      { id: "clock_tower", name: "Warding Bell", role: "landmark · tolls back the dark" },
      { id: "inn", name: "Wayfarers' Rest", role: "community" },
      { id: "smokehouse", name: "Moor Smokehouse", role: "craft · rations" },
      { id: "observatory", name: "Omen Tower", role: "reads portents · gem upgrade" },
      { id: "housing", name: "Restored Manor", role: "housing" },
    ],
    hazards: [
      { name: "Blight spread", src: "new", effect: "A creeping rot advances across the board like a slow fire, blocking every tile it covers.", counter: "Chain the blighted tiles to cleanse them (coins per cleanse); consecrated ground (built) halts its advance." },
      { name: "Restless wisp", src: "new", effect: "A wisp possesses a tile, flipping it spectral (face-blank); the curse-meter ticks up while it's loose.", counter: "Chain the possessed tile to banish the wisp and drop the curse-meter." },
      { name: "Bramble", src: "new", effect: "Thorns knot over a cluster of ruins, locking those cells (rubble-like) until cut.", counter: "An axe/grain chain over the bramble clears it; the warden's vigil slows regrowth." },
      { name: "Miasma", src: "reuse", effect: "Grave-mist seeps from a vent and spreads, spoiling tiles after 3 turns (gas-vent rules).", counter: "Chain through the mist before the timer; the bell disperses it within its toll-radius." },
    ],
    boss: { name: "The Barrow-Lich", emoji: "💀", src: "new",
      mechanic: "The lich raises the dead grid: each turn it haunts a fresh tile (face-down) and the curse-meter climbs; banish enough hauntings by chaining them and break the lich before the meter fills.",
      newAlt: "The Risen Statue — a reskinned stone colossus that walls the old plaza with rubble until cleared by stone chains." },
    signature: "Reclamation, not conquest: you uncover a pre-built ancient grid and cleanse it — the only zone that grows by UNCOVERING rather than pushing outward. The Chapel projects a consecration radius (hallowed ground spirits can't enter), and night is far more dangerous than day, so you race the dark.",
    newResources: [{ name: "Warding salt", source: "ground at the Curse-ward Apothecary (unlocked at Hallowed Hamlet) — gates the mid rungs once producible" }, { name: "Blessed oil", source: "consecrated at the Chapel (unlocked at Hallowed Hamlet) — gates the final rung; both producers exist well before the rungs that spend them" }],
    tiles: {
      ramps: [
        { name: "Moor & fog", cols: ["#3a3450", "#5a5660", "#7a7686", "#aaa6b6"] },
        { name: "Ruined stone", cols: ["#4a4650", "#6a6470", "#9a96a4", "#cfcbd6"] },
        { name: "Blight & bramble", cols: ["#2a3a24", "#3a4a3a", "#5a6a48", "#7a8a58"] },
        { name: "Wisp & lantern", cols: ["#7adcff", "#bff0ff", "#e88a3a", "#ffd07a"] },
      ],
      signature: [
        { name: "Ancient foundation (buildable)", desc: "A pre-existing ruined footing on the old grid — cleansed, it becomes a buildable lot in place." },
        { name: "Reclaimed cobble street (autotile)", desc: "The orthogonal old-grid streets re-laid as warded cobble; blight-edge transition pieces." },
        { name: "Wisp & gravestone dressing", desc: "Standing stones, broken columns, drifting wisps — the eerie frontier and the wisp hazard." },
        { name: "Dawnlight bell", desc: "Staged landmark — warding fire → broken shrine → consecrated bell → the Dawnlight keep." },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10 · GOLDGRASS REACH — the grand breadbasket capital on the golden plains
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "goldgrass",
    name: "Goldgrass Reach",
    tagline: "The journey's capstone — a grand capital of grand boulevards rising from an endless golden harvest.",
    order: 10, level: 8, region: "goldlands", emoji: "🌾",
    env: {
      mood: "Triumphant, abundant, sunlit. Wind through wheat to the horizon; windmill sails; a great avenue.",
      biome: "golden plains", frontier: "open prairie farmland, urbanised into grand civic districts (ringed by permanent fields)",
      palette: {
        sky: ["#bfe0f4", "#e8d89a"], ground: "#d6b84a", ground2: "#c4a63a",
        surface: "#4a8ad6", surface2: "#6aa8e8", path: "#b0a892", accent: "#c46a2a",
        roof: "#a8502a", wall: "#f0e4c0", glow: "#ffe27a", dark: "#5a4a1a",
      },
      ambient: ["wheat-sway", "pollen", "swallows", "windmill-turn"],
    },
    topology: "axial-boulevard",
    landmarkStages: ["Waystone cross", "Market cross", "Civic fountain", "Grand plaza", "The Golden Monument"],
    tiers: [
      { id: "way", name: "Crossroads Waystation", plots: 4, change: "Four buildings at a prairie crossroads around a waystone; the first stretch of the great avenue, wheat to every horizon.",
        unlocks: ["hearth", "mill", "granary", "housing"], cost: null },
      { id: "town", name: "Granary Town", plots: 8, change: "The avenue lengthens with a market cross; a bakery, a silo, a brewery and a stable line the street. A perpendicular trade-road opens.",
        unlocks: ["bakery", "silo", "brewery", "stable", "watchtower"], cost: { coins: 900, res: { flour: 20, plank: 18 } } },
      { id: "city", name: "Market City", plots: 14, change: "A civic fountain anchors a true plaza; a caravan post, kitchen, apiary and sawmill fill the quadrants. The ring road begins to close.",
        unlocks: ["caravan_post", "kitchen", "apiary", "sawmill", "chapel"], cost: { coins: 2400, res: { flour: 32, plank: 26, block: 16 } } },
      { id: "reach", name: "Goldgrass Reach", plots: 20, change: "Grand boulevards quarter the city behind a closed ring road; a forge, an observatory, a clock tower and a cathedral. Districts, all cobbled.",
        unlocks: ["forge", "observatory", "clock_tower", "housing2", "apothecary"], cost: { coins: 4500, res: { flour: 44, gold_bar: 8 } } },
      { id: "capital", name: "The Golden Capital", plots: 26, change: "The Golden Monument crowns the plaza; the capital sprawls in grand districts ringed by working farmland — the breadbasket of the realm.",
        unlocks: ["housing3", "barn", "smokehouse", "harbor_dock", "fishmonger", "portal"], cost: { coins: 8000, res: { gold_bar: 16, flour: 60 } } },
    ],
    buildings: [
      { id: "mill", name: "Grand Mill", role: "craft · flour" },
      { id: "bakery", name: "Capital Bakery", role: "craft · breads & pies" },
      { id: "caravan_post", name: "Trade Exchange", role: "trade · realm-wide routes" },
      { id: "clock_tower", name: "Capital Clock Tower", role: "landmark · civic spire" },
      { id: "chapel", name: "Grand Cathedral", role: "landmark · +coins/season" },
      { id: "observatory", name: "Royal Observatory", role: "gem upgrade" },
      { id: "forge", name: "City Forge", role: "craft · metalwork" },
      { id: "silo", name: "Great Silo", role: "storage · preserves the field" },
    ],
    hazards: [
      { name: "Locust swarm", src: "reuse", effect: "Locusts descend on a band of grain tiles and devour them outward each turn.", counter: "A 4+ chain through the swarm scatters it (locust rules); the watchtower spots it early." },
      { name: "Wildfire", src: "reuse", effect: "Dry wheat catches and fire spreads to neighbours each turn, destroying resources (fire rules).", counter: "Chain the burning tiles to beat it out (coins per tile); ploughed firebreaks (built) stop the spread." },
      { name: "Drought", src: "new", effect: "A dry spell cuts grain yields and drains the granary faster until rain returns.", counter: "Chain water/well tiles to irrigate; the great silo cushions the shortfall." },
      { name: "Stampede", src: "new", effect: "A spooked herd charges across the board, trampling a moving band of tiles each turn.", counter: "Fences and the stable (built) turn the herd; chain ahead of the charge to bank the band first." },
    ],
    boss: { name: "Goldhorn", emoji: "🐂", src: "new",
      mechanic: "The great plains-bull charges every few turns, trampling a full band of tiles in its lane; herd 20 of the right resource into the stockpens (the Stable) before it flattens the harvest.",
      newAlt: "The Locust Queen — spawns a swarm-cluster each turn that doubles if not chained; a scaled-up swarm boss." },
    signature: "The capstone of scale and prestige: the grandest layout, the most plots and buildings, civic grandeur (boulevards, ring road, monument) — the agrarian capital the whole journey climbs toward, ringed by the permanent farmland that feeds the realm.",
    tiles: {
      ramps: [
        { name: "Wheat & field", cols: ["#8a6a1a", "#c4a63a", "#d6b84a", "#f2dc8a"] },
        { name: "Boulevard cobble", cols: ["#7a7264", "#9a9486", "#b0a892", "#d4ccb8"] },
        { name: "Civic stone", cols: ["#8a7a5a", "#b8a880", "#e0d4b0", "#f4ecd4"] },
        { name: "Harvest & banner", cols: ["#a8502a", "#c46a2a", "#ffd24d", "#ffe9b0"] },
      ],
      signature: [
        { name: "Grand boulevard (autotile)", desc: "The wide cobbled avenue with a planted median; straight / junction / plaza-edge pieces." },
        { name: "Ring road + district block", desc: "The encircling road and the quartered civic blocks the boulevards define." },
        { name: "Windmill & wheat field", desc: "Turning-sail windmill over rippling golden wheat — the permanent farmland frame." },
        { name: "Golden Monument", desc: "Staged landmark — waystone → market cross → civic fountain → the Golden Monument." },
      ],
    },
  },
];
