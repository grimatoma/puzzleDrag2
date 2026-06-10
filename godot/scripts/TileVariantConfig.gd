class_name TileVariantConfig
extends RefCounted
## The Tile Collection catalog — the GDScript port of src/features/tileCollection/data.ts
## (TILE_TYPES + TILE_TYPES_MAP + CATEGORY_OF) and the pure discovery helpers from
## src/features/tileCollection/effects.ts (discoverTileTypesFromChain /
## discoverTileTypesFromBuilding). Pure data + static helpers, instantiable in tests.
##
## ── What this layer owns (ported faithfully) ──────────────────────────────────────
##   • The 75 board-tile VARIANTS, each {category, tile, tier, discovery, abilities}.
##     React authors 79 tile-type entries; the 4 mine UPGRADE-tier entries whose React
##     `id` is a RESOURCE key (block / iron_bar / coke / cut_gem — inventory goods, not
##     board tiles) have NO Godot board Tile enum, so they are DELIBERATELY OMITTED here
##     (they are inventory resources produced by chains, never placed on the board — the
##     same disjoint tile/resource invariant the React app keeps; see CLAUDE.md
##     "Tiles vs Resources"). Every remaining React tile id maps 1:1 to a Constants.Tile.
##   • The ACTIVE-VARIANT-per-category model: every category's DEFAULT active variant is
##     its base tile (the `default`-method entry, or the existing FARM_CATEGORY base tile).
##   • DISCOVERY: default (always known), chain (chainLengthOf + chainLength), research
##     (researchOf + researchAmount), buy (coinCost), building (buildingId), daily (day).
##   • ABILITIES (data only): free_moves / coin_bonus_flat / coin_bonus_per_tile /
##     free_turn_if_chain / pool_weight. The accrual + consumption lives in GameState
##     (credit_chain / note_farm_turn) — see those methods for the WHEN, cited to React.
##
## ── Category id bridge ────────────────────────────────────────────────────────────
## React uses category ids like "bird"/"vegetables"/"fruits"/"flowers"/"herd_animals"/
## "mounts"/"mine_stone"/"mine_iron_ore"/"mine_coal"/"mine_gem"/"mine_gold"/"special_dirt"/
## "treasure". The Godot port (Constants.CATEGORY) uses the SHORT ids "birds"/"veg"/"fruit"/
## "flower"/"herd"/"mount"/"stone"/"iron"/"coal"/"gem"/"gold"/"dirt"/"coin". This catalog is
## keyed by the GODOT category id (so GameState.active_tile_pool / upgrade_spawn can read it
## directly), with REACT_CATEGORY_OF documenting the source mapping. Every variant's
## `category` here equals Constants.category_of(its tile).
##
## React source refs are cited inline (data.ts line ranges) at each port site.

# ── React category id → Godot category id bridge (data.ts CATEGORIES, ~line 4-16) ──
## Documentation + the conversion used when porting. Keys are the React ids; values are
## the Godot Constants.CATEGORY ids. Identity entries (grass/grain/trees/cattle/fish) are
## listed for completeness.
const REACT_TO_GODOT_CATEGORY := {
	"grass": "grass",
	"grain": "grain",
	"bird": "birds",
	"vegetables": "veg",
	"fruits": "fruit",
	"flowers": "flower",
	"trees": "trees",
	"herd_animals": "herd",
	"cattle": "cattle",
	"mounts": "mount",
	"fish": "fish",
	"mine_stone": "stone",
	"mine_iron_ore": "iron",
	"mine_coal": "coal",
	"mine_gem": "gem",
	"mine_gold": "gold",
	"special_dirt": "dirt",
	"treasure": "coin",
}

# ── The catalog: tile string id → variant def (ported from data.ts TILE_TYPES) ──────
## Each value: {
##   tile:        int (Constants.Tile enum — the canonical board id),
##   category:    String (Godot category id, == Constants.category_of(tile)),
##   tier:        int,
##   discovery:   { method, ...params }  (see header),
##   abilities:   Array[Dictionary]      ({ id, params } — may be empty),
## }
## Keyed by the React tile id (== Constants.string_key(tile)) so the data agrees with
## Constants and the (later) UI can address a variant by its canonical string id.
const T := Constants.Tile

const CATALOG := {
	# ── Grass (data.ts:75-100, 217-223) ────────────────────────────────────────────
	"tile_grass_grass":   {"tile": T.GRASS, "category": "grass", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Grass", "description": "The common meadow grass of the vale — chain it to dry and bundle into hay for livestock and thatch."},
	"tile_grass_meadow":  {"tile": T.GRASS_MEADOW, "category": "grass", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_grass_grass", "chainLength": 20}, "abilities": [{"id": "pool_weight", "params": {"target": "tile_grass_grass", "amount": 1}}], "display_name": "Meadow Grass", "description": "A lush grass variety that grows in dense clumps, boosting base grass tile spawn frequency on the board."},
	"tile_grass_spiky":   {"tile": T.GRASS_SPIKY, "category": "grass", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_grass_grass", "researchAmount": 50}, "abilities": [{"id": "pool_weight", "params": {"target": "tile_grass_grass", "amount": 2}}], "display_name": "Spiky Grass", "description": "A hardy, drought-tolerant grass that spreads quickly, adding two extra grass tiles to every board fill."},
	"tile_grass_heather": {"tile": T.GRASS_HEATHER, "category": "grass", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_grass_meadow", "chainLength": 6}, "abilities": [], "display_name": "Heather", "description": "Eaten by rats. Grows on wuthering heights."},

	# ── Grain (data.ts:103-108, 226-253). Wheat is the port's base grain tile; React
	# authors wheat as a CHAIN-method discovery off grass (threshold 6) but the port has
	# always BASE-SPAWNED wheat (FARM_CATEGORY_TILE["grain"] == WHEAT) — so wheat's port
	# default-active stays WHEAT and it is seeded discovered as a base tile (see
	# default_discovered). The chain discovery metadata is preserved for the UI/status. ──
	"tile_grain_wheat":     {"tile": T.WHEAT, "category": "grain", "tier": 0, "discovery": {"method": "chain", "chainLengthOf": "tile_grass_grass", "chainLength": 6}, "abilities": [], "display_name": "Wheat", "description": "Golden stalks of grain unlocked when grass chains grow long enough to harvest properly."},
	"tile_grain_corn":      {"tile": T.GRAIN_CORN, "category": "grain", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Corn", "description": "Tall corn stalks. Can be collected with grass. Popcorn is yummy."},
	"tile_grain_buckwheat": {"tile": T.GRAIN_BUCKWHEAT, "category": "grain", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Buckwheat", "description": "Some do like it. Really."},
	"tile_grain_manna":     {"tile": T.GRAIN_MANNA, "category": "grain", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_grain_wheat", "researchAmount": 200}, "abilities": [], "display_name": "Manna", "description": "Attracts rats. Extremely nutritious."},
	"tile_grain_rice":      {"tile": T.GRAIN_RICE, "category": "grain", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Rice", "description": "Resistant to swamp. Responsible for the rice of an empire."},

	# ── Vegetables (data.ts:144-207) ────────────────────────────────────────────────
	"tile_veg_carrot":   {"tile": T.CARROT, "category": "veg", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Carrot", "description": "Easy to collect. Good for your eyes."},
	"tile_veg_eggplant": {"tile": T.VEG_EGGPLANT, "category": "veg", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Eggplant", "description": "A long chain gives vegetables. Tastes great with scrambled eggs."},
	"tile_veg_turnip":   {"tile": T.VEG_TURNIP, "category": "veg", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Turnip", "description": "Great to produce soup, slow to get bonus fruits. You cannot squeeze blood from it."},
	"tile_veg_beet":     {"tile": T.VEG_BEET, "category": "veg", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_veg_turnip", "chainLength": 6}, "abilities": [], "display_name": "Beet", "description": "Deadly to pests. Are you ready for borscht?"},
	"tile_veg_cucumber": {"tile": T.VEG_CUCUMBER, "category": "veg", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Cucumber", "description": "Avoided by rats. It is cool."},
	"tile_veg_squash":   {"tile": T.VEG_SQUASH, "category": "veg", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_veg_cucumber", "chainLength": 6}, "abilities": [], "display_name": "Squash", "description": "Can be collected with grain. Loves playing racquet."},
	"tile_veg_mushroom": {"tile": T.VEG_MUSHROOM, "category": "veg", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_veg_carrot", "researchAmount": 50}, "abilities": [], "display_name": "Mushroom", "description": "Resistant to swamp. Can be collected with rambutans. Everybody likes him. He's a fungi."},
	"tile_veg_pepper":   {"tile": T.VEG_PEPPER, "category": "veg", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_veg_eggplant", "researchAmount": 80}, "abilities": [], "display_name": "Pepper", "description": "A peppery silhouette unlocked only by completing a special collection challenge."},
	"tile_veg_broccoli": {"tile": T.VEG_BROCCOLI, "category": "veg", "tier": 3, "discovery": {"method": "building", "buildingId": "kitchen"}, "abilities": [], "display_name": "Broccoli", "description": "A hearty brassica that earns its place once you own a Kitchen — build one to add broccoli to the board."},

	# ── Fruits (data.ts:135-142, 256-319). Clover/Melon carry a legacy tile_bird_ id but
	# React authors them as flower/fruit (data.ts:126,135) — re-filed below to the right
	# Godot category (matches Constants.CATEGORY). ───────────────────────────────────
	"tile_fruit_apple":        {"tile": T.APPLE, "category": "fruit", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Apple", "description": "Great to produce pies. One a day keeps the doctor away."},
	"tile_fruit_pear":         {"tile": T.FRUIT_PEAR, "category": "fruit", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_fruit_apple", "chainLength": 6}, "abilities": [], "display_name": "Pear", "description": "Avoided by rats. It is pear-shaped."},
	"tile_fruit_golden_apple": {"tile": T.FRUIT_GOLDEN_APPLE, "category": "fruit", "tier": 2, "discovery": {"method": "default"}, "abilities": [{"id": "coin_bonus_flat", "params": {"amount": 5}}], "display_name": "Golden Apple", "description": "Five coins per harvest. For the most beautiful."},
	"tile_fruit_blackberry":   {"tile": T.FRUIT_BLACKBERRY, "category": "fruit", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Blackberry", "description": "Easy to collect. It's ironic that it replaces the apple."},
	"tile_fruit_rambutan":     {"tile": T.FRUIT_RAMBUTAN, "category": "fruit", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_fruit_blackberry", "chainLength": 6}, "abilities": [], "display_name": "Rambutan", "description": "Resistant to swamp. Can be collected with mushrooms. Badly needs a haircut."},
	"tile_fruit_starfruit":    {"tile": T.FRUIT_STARFRUIT, "category": "fruit", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_fruit_rambutan", "researchAmount": 100}, "abilities": [], "display_name": "Starfruit", "description": "Locked behind Rambutan research. Stars on the inside."},
	"tile_fruit_coconut":      {"tile": T.FRUIT_COCONUT, "category": "fruit", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Coconut", "description": "Avoided by rats. Can be collected with palms. Often mistaken for a horse."},
	"tile_fruit_lemon":        {"tile": T.FRUIT_LEMON, "category": "fruit", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Lemon", "description": "Great to get bonus flowers, slow to produce pie. Easily obtained from life."},
	"tile_fruit_jackfruit":    {"tile": T.FRUIT_JACKFRUIT, "category": "fruit", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_fruit_lemon", "chainLength": 6}, "abilities": [], "display_name": "Jackfruit", "description": "A long chain attracts rats. Doesn't know jack."},
	"tile_bird_melon":         {"tile": T.BIRD_MELON, "category": "fruit", "tier": 3, "discovery": {"method": "buy", "coinCost": 500}, "abilities": [{"id": "free_moves", "params": {"count": 5}}], "display_name": "Melon", "description": "Plump summer melons that attract whole flocks of birds, granting 5 free moves per season."},

	# ── Flowers (data.ts:126-133, 322-335) ──────────────────────────────────────────
	"tile_flower_pansy":      {"tile": T.PANSY, "category": "flower", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Pansy", "description": "Great to produce honey. Actually a very manly flower."},
	"tile_flower_water_lily": {"tile": T.FLOWER_WATER_LILY, "category": "flower", "tier": 1, "discovery": {"method": "research", "researchOf": "tile_flower_pansy", "researchAmount": 15}, "abilities": [], "display_name": "Water Lily", "description": "Resistant to swamp. Leaves a lasting impression."},
	"tile_bird_clover":       {"tile": T.BIRD_CLOVER, "category": "flower", "tier": 1, "discovery": {"method": "buy", "coinCost": 200}, "abilities": [{"id": "free_moves", "params": {"count": 2}}], "display_name": "Clover", "description": "A flowering clover patch that draws bees by the dozen — chains feed the honey pot and grant 2 extra free moves per season."},

	# ── Trees (data.ts:338-382) ─────────────────────────────────────────────────────
	"tile_tree_oak":     {"tile": T.OAK, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Oak", "description": "Great to produce wood, slow to bonus birds. Grows from little acorns."},
	"tile_tree_birch":   {"tile": T.TREE_BIRCH, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Birch", "description": "Great for bonus birds, slow to produce wood. Tall and flexible."},
	"tile_tree_willow":  {"tile": T.TREE_WILLOW, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Willow", "description": "Listen to the wind in its boughs."},
	"tile_tree_fir":     {"tile": T.TREE_FIR, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Fir", "description": "Can be collected with sheep. Perfect for the winter holidays."},
	"tile_tree_cypress": {"tile": T.TREE_CYPRESS, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Cypress", "description": "Deadly to pests. Eaten by wolves. Can be a bit prickly."},
	"tile_tree_palm":    {"tile": T.TREE_PALM, "category": "trees", "tier": 0, "discovery": {"method": "default"}, "abilities": [{"id": "free_moves", "params": {"count": 2}}], "display_name": "Palm Tree", "description": "Can be collected with coconuts. Two free moves. A tree in the palm of your hand."},

	# ── Birds (data.ts:116-124, 384-454). Pheasant is the port's base bird tile. React
	# authors pheasant as a `default` discovery; the port base-spawns it. ─────────────
	"tile_bird_pheasant":       {"tile": T.PHEASANT, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Pheasant", "description": "Can be collected with grass. Pleasant."},
	"tile_bird_turkey":         {"tile": T.BIRD_TURKEY, "category": "birds", "tier": 1, "discovery": {"method": "research", "researchOf": "eggs", "researchAmount": 20}, "abilities": [{"id": "free_moves", "params": {"count": 2}}], "display_name": "Turkey", "description": "Broad-winged turkeys that startle and shuffle the board — each active turkey grants 2 free moves per season."},
	"tile_bird_chicken":        {"tile": T.BIRD_CHICKEN, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Chicken", "description": "Great to produce eggs, slow for bonus herd animals. Not very courageous."},
	"tile_bird_hen":            {"tile": T.BIRD_HEN, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Hen", "description": "Great for bonus herd animals, slow to produce eggs. Not always wet."},
	"tile_bird_rooster":        {"tile": T.BIRD_ROOSTER, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Rooster", "description": "Avoided by wolves. Can spell cock-a-doodle-doo."},
	"tile_bird_wild_goose":     {"tile": T.BIRD_WILD_GOOSE, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Wild Goose", "description": "Attracts wolves. Prone to wanderlust."},
	"tile_bird_goose":          {"tile": T.BIRD_GOOSE, "category": "birds", "tier": 2, "discovery": {"method": "research", "researchOf": "tile_bird_chicken", "researchAmount": 200}, "abilities": [], "display_name": "Goose", "description": "Its quill is said to be quite dangerous."},
	"tile_bird_parrot":         {"tile": T.BIRD_PARROT, "category": "birds", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Parrot", "description": "Can be collected with trees. Polly wants a cracker."},
	"tile_bird_phoenix":        {"tile": T.BIRD_PHOENIX, "category": "birds", "tier": 2, "discovery": {"method": "default"}, "abilities": [], "display_name": "Phoenix", "description": "Attracts wolves. Deadly to pests. Can light your fire."},
	"tile_bird_dodo":           {"tile": T.BIRD_DODO, "category": "birds", "tier": 3, "discovery": {"method": "buy", "coinCost": 250}, "abilities": [], "display_name": "Dodo", "description": "A proactive bird, always says \"do, do!\". Buy-only."},
	"tile_bird_pig_in_disguise": {"tile": T.BIRD_PIG_IN_DISGUISE, "category": "birds", "tier": 3, "discovery": {"method": "buy", "coinCost": 100000}, "abilities": [], "display_name": "Pig in Disguise", "description": "\"Day 236: They still think I'm a bird.\" Buy-only."},

	# ── Herd animals (data.ts:456-513) ──────────────────────────────────────────────
	"tile_herd_pig":     {"tile": T.PIG, "category": "herd", "tier": 0, "discovery": {"method": "default"}, "abilities": [{"id": "free_turn_if_chain", "params": {"minChain": 6}}], "display_name": "Pig", "description": "Chains of 6 or more grant a free move. Surprisingly tidy."},
	"tile_herd_hog":     {"tile": T.HERD_HOG, "category": "herd", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Hog", "description": "Great to produce meat, slow to bonus cattle. Not into healthy food."},
	"tile_herd_boar":    {"tile": T.HERD_BOAR, "category": "herd", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_herd_hog", "chainLength": 6}, "abilities": [], "display_name": "Boar", "description": "Can be collected with vegetables. Works hard not to appear a bore."},
	"tile_herd_warthog": {"tile": T.HERD_WARTHOG, "category": "herd", "tier": 2, "discovery": {"method": "buy", "coinCost": 250}, "abilities": [], "display_name": "Warthog", "description": "Avoided by wolves. A savage pig from a savage age. Buy-only."},
	"tile_herd_sheep":   {"tile": T.HERD_SHEEP, "category": "herd", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Sheep", "description": "Avoided by wolves. Very silent."},
	"tile_herd_alpaca":  {"tile": T.HERD_ALPACA, "category": "herd", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_herd_sheep", "chainLength": 6}, "abilities": [], "display_name": "Alpaca", "description": "Avoided by wolves. It's never cold."},
	"tile_herd_goat":    {"tile": T.HERD_GOAT, "category": "herd", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Goat", "description": "Can be collected with rats. Stubborn, eats everything."},
	"tile_herd_ram":     {"tile": T.HERD_RAM, "category": "herd", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_herd_goat", "chainLength": 6}, "abilities": [], "display_name": "Ram", "description": "Can be collected with carrots. Sports a fashionable beard."},

	# ── Cattle (data.ts:515-536) ────────────────────────────────────────────────────
	"tile_cattle_cow":         {"tile": T.COW, "category": "cattle", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Cow", "description": "Easy to collect. Sorry for the lactose intolerance."},
	"tile_cattle_longhorn":    {"tile": T.CATTLE_LONGHORN, "category": "cattle", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Longhorn", "description": "Hardcore vegan."},
	"tile_cattle_triceratops": {"tile": T.CATTLE_TRICERATOPS, "category": "cattle", "tier": 3, "discovery": {"method": "daily", "day": 30}, "abilities": [], "display_name": "Triceratops", "description": "Avoided by wolves. Granted by the Day-30 daily login reward."},

	# ── Mounts (data.ts:538-566) ────────────────────────────────────────────────────
	"tile_mount_horse":   {"tile": T.HORSE, "category": "mount", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Horse", "description": "Easy to collect. Look at it. It's amazing."},
	"tile_mount_donkey":  {"tile": T.MOUNT_DONKEY, "category": "mount", "tier": 1, "discovery": {"method": "chain", "chainLengthOf": "tile_mount_horse", "chainLength": 6}, "abilities": [], "display_name": "Donkey", "description": "Can be collected with vegetables. After his PhD, a real smart ass."},
	"tile_mount_moose":   {"tile": T.MOUNT_MOOSE, "category": "mount", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Moose", "description": "Resistant to swamp. Loves chocolate mousse."},
	"tile_mount_mammoth": {"tile": T.MOUNT_MAMMOTH, "category": "mount", "tier": 3, "discovery": {"method": "buy", "coinCost": 300}, "abilities": [], "display_name": "Mammoth", "description": "A mean mammoth is just a woolly bully. Buy-only."},

	# ── Fish (data.ts:567-602) ──────────────────────────────────────────────────────
	"tile_fish_sardine":  {"tile": T.FISH_SARDINE, "category": "fish", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Sardine", "description": "A common shoaling fish, easy to net at high tide."},
	"tile_fish_mackerel": {"tile": T.FISH_MACKEREL, "category": "fish", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Mackerel", "description": "A fast pelagic fish that runs in summer."},
	"tile_fish_clam":     {"tile": T.FISH_CLAM, "category": "fish", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Clam", "description": "A tide-pool shellfish gathered at low tide."},
	"tile_fish_oyster":   {"tile": T.FISH_OYSTER, "category": "fish", "tier": 1, "discovery": {"method": "default"}, "abilities": [], "display_name": "Oyster", "description": "A rare shellfish that occasionally hides a pearl."},
	"tile_fish_kelp":     {"tile": T.FISH_KELP, "category": "fish", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Kelp", "description": "A leafy seaweed — the chain feeds into fish oil."},

	# ── Mine + treasure (data.ts:603-683). The mine UPGRADE-tier entries (block / iron_bar
	# / coke / cut_gem) are inventory RESOURCES in React, not board tiles → OMITTED (see
	# header). The base mine tiles + gold + dirt + golden coin are the board variants. The
	# port has a COPPER_ORE tile under category "copper" with no React analogue — it is
	# NOT in this catalog (React has no copper tile-type), so its category has no variants
	# and active_tile_pool/upgrade_spawn fall back to its base tile (see GameState). ──────
	"tile_mine_stone":    {"tile": T.STONE, "category": "stone", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Stone", "description": "Common rock chipped from the cavern walls — the staple of every mining run."},
	"tile_mine_iron_ore": {"tile": T.IRON_ORE, "category": "iron", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Ore", "description": "Raw metallic ore prised from a vein — smelt in the forge for ingots."},
	"tile_mine_coal":     {"tile": T.COAL, "category": "coal", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Coal", "description": "Sooty fuel for the forge — long coal chains promote it to coke."},
	"tile_mine_gem":      {"tile": T.GEM, "category": "gem", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Gem", "description": "A rough gemstone glittering in the rock — chain enough to cut a polished stone."},
	"tile_mine_gold":     {"tile": T.GOLD, "category": "gold", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Gold", "description": "A nugget of pure gold pulled from the deeper seams."},
	"tile_special_dirt":  {"tile": T.DIRT, "category": "dirt", "tier": 0, "discovery": {"method": "default"}, "abilities": [], "display_name": "Dirt", "description": "Crumbly dirt that backfills tunnels — needed to clear mysterious ore."},
	"tile_coin_golden":   {"tile": T.COIN_GOLDEN, "category": "coin", "tier": 0, "discovery": {"method": "default"}, "abilities": [{"id": "coin_bonus_per_tile", "params": {"amount": 20}}], "display_name": "Golden Coin", "description": "A struck gold coin. Chaining it pays out coins directly — it produces no resource of its own."},
}

# ── Reverse lookups (built once, lazily) ───────────────────────────────────────────
static var _by_category: Dictionary = {}        ## category -> Array[String id]
static var _id_for_tile: Dictionary = {}        ## Constants.Tile int -> String id
static var _built: bool = false

static func _ensure_built() -> void:
	if _built:
		return
	for id in CATALOG.keys():
		var def: Dictionary = CATALOG[id]
		var cat: String = String(def["category"])
		if not _by_category.has(cat):
			_by_category[cat] = []
		(_by_category[cat] as Array).append(id)
		_id_for_tile[int(def["tile"])] = id
	_built = true

# ── Catalog accessors ──────────────────────────────────────────────────────────────

## Every catalog tile string id (insertion order of CATALOG). Mirrors data.ts TILE_TYPES.
static func all() -> Array:
	return CATALOG.keys()

## The variant def for `id`, or {} if unknown. Mirrors TILE_TYPES_MAP[id].
static func by_id(id: String) -> Dictionary:
	return CATALOG.get(id, {})

## True when `id` is a real catalog tile string id.
static func is_tile(id: String) -> bool:
	return CATALOG.has(id)

## The Constants.Tile enum for catalog `id` (Constants.EMPTY if unknown).
static func tile_for(id: String) -> int:
	var def: Dictionary = CATALOG.get(id, {})
	return int(def.get("tile", Constants.EMPTY))

## The catalog string id for a Constants.Tile enum ("" if the tile has no variant entry —
## e.g. RAT/RUBBLE/FISH_PEARL hazards, or COPPER_ORE which has no React analogue).
static func id_for_tile(tile: int) -> String:
	_ensure_built()
	return String(_id_for_tile.get(tile, ""))

## The catalog variant string ids in a category (in catalog order), or [] for none.
## Mirrors TILE_TYPES filtered by category.
static func for_category(cat: String) -> Array:
	_ensure_built()
	return (_by_category.get(cat, []) as Array).duplicate()

## The discovery dict for catalog `id` ({} if unknown).
static func discovery_of(id: String) -> Dictionary:
	return CATALOG.get(id, {}).get("discovery", {})

## The discovery method for catalog `id` ("" if unknown).
static func discovery_method(id: String) -> String:
	return String(discovery_of(id).get("method", ""))

## The abilities array for catalog `id` ([] if none). Each entry { id, params }.
static func abilities_of(id: String) -> Array:
	return (CATALOG.get(id, {}).get("abilities", []) as Array).duplicate(true)

## The tier (0..3) for catalog `id` (0 if unknown).
static func tier_of(id: String) -> int:
	return int(CATALOG.get(id, {}).get("tier", 0))

## The player-facing display name for catalog `id`. Returns the catalog `display_name` when
## present; otherwise falls back to the SHARED TileCategoryConfig.display_name_from_key derivation
## (strips "tile_" + a leading category segment, then title-cases) so non-catalog ids (hazards)
## still get a readable name. The fallback is the SINGLE shared tile-key derivation — the former
## inline `_DROP`/title-case copy (the 4th duplicate) was folded into the helper, dropping the
## stray "coin" prefix the shared list deliberately excludes. (No live caller reaches the fallback:
## the only consumer, TileVariantUi.display_name, guards on is_tile() and so always hits the
## catalog branch above.) Mirrors React displayName.
static func display_name(id: String) -> String:
	if id == "":
		return ""
	var def: Dictionary = CATALOG.get(id, {})
	if def.has("display_name"):
		var dn: String = String(def["display_name"])
		if dn != "":
			return dn
	# Fallback (non-catalog ids only): the one shared title-case derivation.
	return TileCategoryConfig.display_name_from_key(id)

## The player-facing description for catalog `id`. Returns the catalog `description` string when
## present, or "" for non-catalog ids. Mirrors React description.
static func description(id: String) -> String:
	if id == "":
		return ""
	return String(CATALOG.get(id, {}).get("description", ""))

# ── Defaults (the seed for GameState.new() / new_game) ─────────────────────────────

## The DEFAULT active variant per category: the base tile id for each category.
## Mirrors the React defaultTileCollectionSlice (state/helpers.ts:104-119): for each
## category, the FIRST `default`-method tile becomes the active variant. Returns a
## { category:String -> tile_id:String } map covering every category that has at least
## one catalog variant.
##
## The port additionally guarantees the SIX home base-spawn categories
## (FARM_CATEGORY_TILE) resolve to their existing base tile, so the default board is
## byte-identical to the pre-active-variant pool — see GameState.active_tile_for_category.
static func default_active_by_category() -> Dictionary:
	_ensure_built()
	var out: Dictionary = {}
	for cat in _by_category.keys():
		for id in (_by_category[cat] as Array):
			if discovery_method(id) == "default":
				out[cat] = id
				break
	# Grain + Birds: React authors wheat/pheasant as chain/default but the PORT base-spawns
	# them (FARM_CATEGORY_TILE). Pin their default active to the port's base tile so the
	# default board never drops the grain/birds slot. (Pheasant IS already "default" so it
	# is set above; wheat is "chain", so set it explicitly here.)
	out["grain"] = "tile_grain_wheat"
	out["birds"] = "tile_bird_pheasant"
	return out

## The ids that start DISCOVERED on a fresh game: every `default`-method tile PLUS the
## port's base-spawn tiles (wheat/pheasant) that React authors as non-default but the port
## always provides. Mirrors defaultTileCollectionSlice (helpers.ts:109-114) + the port's
## base-tile guarantee. Returns an Array[String id] (catalog order, deterministic).
static func default_discovered() -> Array:
	_ensure_built()
	var out: Array = []
	for id in CATALOG.keys():
		if discovery_method(id) == "default":
			out.append(id)
	# Port base tiles authored as non-default in React but always present on the port board.
	for base in ["tile_grain_wheat", "tile_bird_pheasant"]:
		if not out.has(base):
			out.append(base)
	return out

# ── Discovery helpers (pure — ported from effects.ts) ───────────────────────────────

## Sort an Array of catalog ids by tier ASC then id alphabetical — the stable discovery
## order from effects.ts (discoverTileTypesFromChain, ~line 61-65).
static func _sort_discovery_ids(ids: Array) -> void:
	ids.sort_custom(func(a: String, b: String) -> bool:
		var ta: int = tier_of(a)
		var tb: int = tier_of(b)
		if ta != tb:
			return ta < tb
		return a < b)

## Pure: every `chain`-method variant whose chainLengthOf == `resource_key` and whose
## chainLength <= `chain_length`, that is NOT already in `known`. Mirrors
## discoverTileTypesFromChain (effects.ts:46-68). `known` is a { id -> true } set; only
## ids NOT already known are returned. Sorted tier ASC then id.
##
## NOTE the React `resourceKey` is the chained TILE'S key (the CHAIN_COLLECTED `key`),
## which is the variant's own id (baseResource == id for board tiles). So a chain of
## tile_grass_grass passes resource_key = "tile_grass_grass".
static func discover_from_chain(known: Dictionary, resource_key: String, chain_length: int) -> Array:
	var out: Array = []
	for id in CATALOG.keys():
		var d: Dictionary = discovery_of(id)
		if String(d.get("method", "")) != "chain":
			continue
		if String(d.get("chainLengthOf", "")) != resource_key:
			continue
		if chain_length < int(d.get("chainLength", 0)):
			continue
		if bool(known.get(id, false)):
			continue
		out.append(id)
	_sort_discovery_ids(out)
	return out

## Pure: every `building`-method variant whose buildingId == `building_id`, not already
## known. Mirrors discoverTileTypesFromBuilding (effects.ts:78-101). Sorted tier ASC then id.
static func discover_from_building(known: Dictionary, building_id: String) -> Array:
	var out: Array = []
	if building_id == "":
		return out
	for id in CATALOG.keys():
		var d: Dictionary = discovery_of(id)
		if String(d.get("method", "")) != "building":
			continue
		if String(d.get("buildingId", "")) != building_id:
			continue
		if bool(known.get(id, false)):
			continue
		out.append(id)
	_sort_discovery_ids(out)
	return out
