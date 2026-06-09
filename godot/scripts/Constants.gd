class_name Constants
extends RefCounted
## Game constants — mirrors the relevant slice of src/constants.ts (PC2 baseline).
##
## M1 scope: board dimensions, the Farm starting tile set, upgrade thresholds,
## and Stage-1 placeholder colors. Registered as a `class_name` global so its
## consts / enums / static helpers are reachable WITHOUT a live autoload — this
## matters for headless tests, which run before the scene tree exists.
##
## Source references are to the Phaser codebase this is ported from; see
## docs/godot-migration-plan.html (strategy) and
## docs/godot-migration-progress.html (status).

# ── Board dimensions (src/constants.ts:151-153) ────────────────────────────
const COLS: int = 6
const ROWS: int = 6
const TILE_SIZE: int = 74          ## base tile size in px (responsive at runtime)
const MIN_CHAIN: int = 3           ## default minimum chain length (a boss may raise it)

## Sentinel for an empty grid cell.
const EMPTY: int = -1

# ── Tile types — Farm biome starting set (src/constants.ts FARM pool) ───────
## GDScript enums are int-backed. STRING_KEYS maps each value back to the
## canonical Phaser tile key, used for save serialisation and (asset-pipeline
## Stage 2) PNG filename lookup: res://assets/tiles/<key>.png.
enum Tile {
	GRASS,
	WHEAT,
	PHEASANT,
	CARROT,
	APPLE,
	PANSY,
	OAK,
	PIG,
	COW,
	HORSE,
	# ── Mine biome (M3f, Town 2) — APPENDED so the farm ordinals 0..9 above are
	# unchanged (save keys + tests depend on GRASS==0 … HORSE==9). These tiles
	# only enter the board during a mine expedition (GameState.active_biome_pool).
	STONE,
	IRON_ORE,
	COAL,
	DIRT,
	GEM,
	# ── Rats hazard (M3h, Town 3) — APPENDED (ordinal 15) so every farm/mine
	# ordinal above is unchanged (GRASS==0 … HORSE==9, STONE==10 … GEM==14). RAT is
	# a board-only HAZARD tile: it produces NOTHING (chaining rats wastes a move) and
	# only seeds into the FARM pool once Town 2 is complete (GameState.rats_enabled).
	RAT,
	# ── Rubble mine hazard (M3i, Town 2 expedition) — APPENDED (ordinal 16) so every
	# farm/mine/rat ordinal above is unchanged (GRASS==0 … RAT==15). RUBBLE is the
	# mine's cave-in clutter: a board-only HAZARD tile that produces NOTHING (chaining
	# rubble wastes a precious mine turn) and only seeds into the MINE pool while on an
	# expedition (GameState.active_biome_pool). You clear it by MINING THROUGH it — a
	# resolved STONE chain clears every rubble 8-adjacent to it (Board.clear_rubble_on_stone),
	# the built-in mine analogue of the Master Ratcatcher's grass→rats sweep.
	RUBBLE,
	# ── Fish / Harbor biome (M3j, Town 3 expedition — ported from src/features/fish) —
	# APPENDED (ordinals 17..22) so every farm/mine/rat/rubble ordinal above is unchanged
	# (GRASS==0 … RUBBLE==16; saves use STRING_KEYS, so appending is the safe way to add
	# tiles). These tiles only enter the board during a HARBOR expedition (the fish biome —
	# GameState.active_biome_pool). The harbor mirrors the mine expedition: the farm packs
	# food into supplies, supplies are spent as HARBOR TURNS, and the catch lands in the
	# SAME shared inventory. The board has a TIDE cycle (high↔low every TIDE_PERIOD turns)
	# that the next (board) slice uses to mutate the bottom row from HIGH_TIDE_POOL /
	# LOW_TIDE_POOL.
	FISH_SARDINE,
	FISH_MACKEREL,
	FISH_CLAM,
	FISH_OYSTER,
	FISH_KELP,
	# FISH_PEARL (the "giant pearl") is the harbor's rune-capture tile — the analogue of
	# the mine's Mysterious Ore. It produces NOTHING on its own (deliberately ABSENT from
	# PRODUCES/THRESHOLDS, so produced_resource is "" and threshold_for returns the
	# NO_THRESHOLD sentinel, exactly like RAT/RUBBLE). It is captured by chaining it with
	# >= REQUIRED_FISH_IN_CHAIN other fish-category tiles before its PEARL_TURNS countdown
	# expires → +1 Rune (GameState.try_capture_pearl). Its own "fish_pearl" category keeps
	# it out of the fish-spawn pools (it is conditionally seeded by the board slice, not
	# weighted into FISH_POOL / the tide pools).
	FISH_PEARL,
	# ── Full tile-catalog parity (all 77 web tiles) — APPENDED (ordinals 23..78) so every
	# existing farm/mine/hazard/fish ordinal above is UNCHANGED (GRASS==0 … FISH_PEARL==22;
	# saves serialise via STRING_KEYS, so appending is the safe way to grow the catalog).
	# These are CATALOG-ONLY variants: each shares its family's threshold + produced resource
	# and only differs in art (res://assets/tiles/<key>.png). They appear in the Tile Collection
	# screen (the full 77-tile catalog) but are NOT seeded into any board refill pool here — the
	# BOARD keeps using the current default representative per category (active-variant selection
	# is a separate follow-up). Grouped by category to mirror src/features/tileCollection/data.ts.
	# Grass (→ hay_bundle, thr 6)
	GRASS_MEADOW,
	GRASS_SPIKY,
	GRASS_HEATHER,
	# Grain (→ flour, thr 6)
	GRAIN_CORN,
	GRAIN_BUCKWHEAT,
	GRAIN_MANNA,
	GRAIN_RICE,
	# Vegetables (→ soup, thr 6)
	VEG_EGGPLANT,
	VEG_TURNIP,
	VEG_BEET,
	VEG_CUCUMBER,
	VEG_SQUASH,
	VEG_MUSHROOM,
	VEG_PEPPER,
	VEG_BROCCOLI,
	# Fruit (→ pie, thr 7; blackberry → jam)
	FRUIT_PEAR,
	FRUIT_GOLDEN_APPLE,
	FRUIT_BLACKBERRY,
	FRUIT_RAMBUTAN,
	FRUIT_STARFRUIT,
	FRUIT_COCONUT,
	FRUIT_LEMON,
	FRUIT_JACKFRUIT,
	# Flowers (→ honey, thr 10)
	FLOWER_WATER_LILY,
	# Trees (→ plank, thr 6)
	TREE_BIRCH,
	TREE_WILLOW,
	TREE_FIR,
	TREE_CYPRESS,
	TREE_PALM,
	# Birds (→ eggs, thr 6)
	BIRD_TURKEY,
	BIRD_CLOVER,
	BIRD_MELON,
	BIRD_CHICKEN,
	BIRD_HEN,
	BIRD_ROOSTER,
	BIRD_WILD_GOOSE,
	BIRD_GOOSE,
	BIRD_PARROT,
	BIRD_PHOENIX,
	BIRD_DODO,
	BIRD_PIG_IN_DISGUISE,
	# Herd animals (→ meat, thr 5)
	HERD_HOG,
	HERD_BOAR,
	HERD_WARTHOG,
	HERD_SHEEP,
	HERD_ALPACA,
	HERD_GOAT,
	HERD_RAM,
	# Cattle (→ milk, thr 6)
	CATTLE_LONGHORN,
	CATTLE_TRICERATOPS,
	# Mounts (→ horseshoe, thr 10)
	MOUNT_DONKEY,
	MOUNT_MOOSE,
	MOUNT_MAMMOTH,
	# Mine — copper (→ copper_bar, thr 6) + gold (→ gold_bar, thr 6).
	COPPER_ORE,
	GOLD,
	# Treasure — golden coin tile. Like a hazard it produces NOTHING through the chain pipeline
	# (the web pays coins directly via a tile ability not ported here), so it is deliberately
	# ABSENT from PRODUCES/THRESHOLDS (threshold_for → NO_THRESHOLD, produced_resource → "").
	COIN_GOLDEN,
	# ── Fire farm hazard (T7, ported from src/features/farm/hazards.ts) — APPENDED so every
	# existing ordinal above is UNCHANGED (saves serialise via STRING_KEYS). FIRE is a board-only
	# HAZARD tile (like RAT/RUBBLE): it produces NOTHING (deliberately ABSENT from PRODUCES/
	# THRESHOLDS → produced_resource "" + threshold_for NO_THRESHOLD). Fire SPREADS to an
	# adjacent free cell each turn (HazardLogic.tick_fire) and is cleared by chaining FIRE tiles
	# (HazardLogic.try_extinguish_fire → +2 coins/tile). GATED OFF by default to match the live
	# React game (FIRE_HAZARD_ENABLED false; isFireHazardEnabled() reads a tuning override).
	FIRE,
	# ── Mine hazards (T11, ported from src/features/mine/hazards.ts) — APPENDED so every existing
	# ordinal above is UNCHANGED (saves serialise via STRING_KEYS). Three new board-only HAZARD/special
	# tiles for the Town-2 mine expedition:
	#   LAVA  — the Lava Flow hazard cell (MineHazardLogic.tick_mine_hazards spreads it to one random
	#           orthogonal free cell each turn). BLOCKS chaining (MineHazardLogic.tile_blocked_by_hazard,
	#           like RUBBLE) and produces NOTHING (deliberately ABSENT from PRODUCES/THRESHOLDS →
	#           produced_resource "" + threshold_for NO_THRESHOLD). Cleared by the Water Pump tool
	#           (turns lava → rubble). React key "lava" (hazards.ts:240 `key: "lava"`).
	#   GAS   — the Gas Vent cloud cell. UNLIKE lava/rubble it is CHAINABLE (chaining through gas is
	#           the counter — disperse_gas), so it is NOT in tile_blocked_by_hazard. Produces NOTHING.
	#           A 3-turn countdown lives on GameState.mine_hazards.gas_vent; chaining the gas cell before
	#           it expires disperses the vent, else it costs a turn on expiry. React models gas as a
	#           per-cell `gas` overlay flag; the port models it as a single board GAS tile at the vent
	#           cell (documented adaptation — the port has no per-cell overlay-flag layer).
	#   MYSTERIOUS_ORE — the rune-capture tile (the mine's analogue of the harbor's FISH_PEARL). It is
	#           CHAINABLE and produces NOTHING via the normal chain path (ABSENT from PRODUCES/THRESHOLDS);
	#           a 5-turn countdown lives on GameState.mysterious_ore. Chaining it together with >= 2 DIRT
	#           tiles before it expires grants +1 Rune (MineHazardLogic.is_mysterious_chain_valid); on
	#           countdown expiry it degrades to plain DIRT (tile_special_dirt). React key "mysterious_ore"
	#           (mysterious_ore.ts:58).
	LAVA,
	GAS,
	MYSTERIOUS_ORE,
}

const STRING_KEYS := {
	Tile.GRASS:    "tile_grass_grass",
	Tile.WHEAT:    "tile_grain_wheat",
	Tile.PHEASANT: "tile_bird_pheasant",
	Tile.CARROT:   "tile_veg_carrot",
	Tile.APPLE:    "tile_fruit_apple",
	Tile.PANSY:    "tile_flower_pansy",
	Tile.OAK:      "tile_tree_oak",
	Tile.PIG:      "tile_herd_pig",
	Tile.COW:      "tile_cattle_cow",
	Tile.HORSE:    "tile_mount_horse",
	# Mine biome (M3f).
	Tile.STONE:    "tile_mine_stone",
	Tile.IRON_ORE: "tile_mine_iron_ore",
	Tile.COAL:     "tile_mine_coal",
	Tile.DIRT:     "tile_special_dirt",
	Tile.GEM:      "tile_mine_gem",
	# Rats hazard (M3h).
	Tile.RAT:      "rat",
	# Rubble mine hazard (M3i).
	Tile.RUBBLE:   "rubble",
	# Fish / Harbor biome (M3j). The five catchable fish tiles use their canonical
	# Phaser tile keys (res://assets/tiles/<key>.png exists for all five). The giant
	# pearl reuses the special key the React port assigns it (PEARL_KEY).
	Tile.FISH_SARDINE:  "tile_fish_sardine",
	Tile.FISH_MACKEREL: "tile_fish_mackerel",
	Tile.FISH_CLAM:     "tile_fish_clam",
	Tile.FISH_OYSTER:   "tile_fish_oyster",
	Tile.FISH_KELP:     "tile_fish_kelp",
	Tile.FISH_PEARL:    "tile_special_giant_pearl",
	# ── Full tile-catalog parity (all 77 web tiles). Each key matches its committed PNG
	# under res://assets/tiles/<key>.png (verified against assets/tiles/manifest.json).
	# Grass
	Tile.GRASS_MEADOW:       "tile_grass_meadow",
	Tile.GRASS_SPIKY:        "tile_grass_spiky",
	Tile.GRASS_HEATHER:      "tile_grass_heather",
	# Grain
	Tile.GRAIN_CORN:         "tile_grain_corn",
	Tile.GRAIN_BUCKWHEAT:    "tile_grain_buckwheat",
	Tile.GRAIN_MANNA:        "tile_grain_manna",
	Tile.GRAIN_RICE:         "tile_grain_rice",
	# Vegetables
	Tile.VEG_EGGPLANT:       "tile_veg_eggplant",
	Tile.VEG_TURNIP:         "tile_veg_turnip",
	Tile.VEG_BEET:           "tile_veg_beet",
	Tile.VEG_CUCUMBER:       "tile_veg_cucumber",
	Tile.VEG_SQUASH:         "tile_veg_squash",
	Tile.VEG_MUSHROOM:       "tile_veg_mushroom",
	Tile.VEG_PEPPER:         "tile_veg_pepper",
	Tile.VEG_BROCCOLI:       "tile_veg_broccoli",
	# Fruit
	Tile.FRUIT_PEAR:         "tile_fruit_pear",
	Tile.FRUIT_GOLDEN_APPLE: "tile_fruit_golden_apple",
	Tile.FRUIT_BLACKBERRY:   "tile_fruit_blackberry",
	Tile.FRUIT_RAMBUTAN:     "tile_fruit_rambutan",
	Tile.FRUIT_STARFRUIT:    "tile_fruit_starfruit",
	Tile.FRUIT_COCONUT:      "tile_fruit_coconut",
	Tile.FRUIT_LEMON:        "tile_fruit_lemon",
	Tile.FRUIT_JACKFRUIT:    "tile_fruit_jackfruit",
	# Flowers
	Tile.FLOWER_WATER_LILY:  "tile_flower_water_lily",
	# Trees
	Tile.TREE_BIRCH:         "tile_tree_birch",
	Tile.TREE_WILLOW:        "tile_tree_willow",
	Tile.TREE_FIR:           "tile_tree_fir",
	Tile.TREE_CYPRESS:       "tile_tree_cypress",
	Tile.TREE_PALM:          "tile_tree_palm",
	# Birds
	Tile.BIRD_TURKEY:        "tile_bird_turkey",
	Tile.BIRD_CLOVER:        "tile_bird_clover",
	Tile.BIRD_MELON:         "tile_bird_melon",
	Tile.BIRD_CHICKEN:       "tile_bird_chicken",
	Tile.BIRD_HEN:           "tile_bird_hen",
	Tile.BIRD_ROOSTER:       "tile_bird_rooster",
	Tile.BIRD_WILD_GOOSE:    "tile_bird_wild_goose",
	Tile.BIRD_GOOSE:         "tile_bird_goose",
	Tile.BIRD_PARROT:        "tile_bird_parrot",
	Tile.BIRD_PHOENIX:       "tile_bird_phoenix",
	Tile.BIRD_DODO:          "tile_bird_dodo",
	Tile.BIRD_PIG_IN_DISGUISE: "tile_bird_pig_in_disguise",
	# Herd animals
	Tile.HERD_HOG:           "tile_herd_hog",
	Tile.HERD_BOAR:          "tile_herd_boar",
	Tile.HERD_WARTHOG:       "tile_herd_warthog",
	Tile.HERD_SHEEP:         "tile_herd_sheep",
	Tile.HERD_ALPACA:        "tile_herd_alpaca",
	Tile.HERD_GOAT:          "tile_herd_goat",
	Tile.HERD_RAM:           "tile_herd_ram",
	# Cattle
	Tile.CATTLE_LONGHORN:    "tile_cattle_longhorn",
	Tile.CATTLE_TRICERATOPS: "tile_cattle_triceratops",
	# Mounts
	Tile.MOUNT_DONKEY:       "tile_mount_donkey",
	Tile.MOUNT_MOOSE:        "tile_mount_moose",
	Tile.MOUNT_MAMMOTH:      "tile_mount_mammoth",
	# Mine — copper + gold
	Tile.COPPER_ORE:         "tile_mine_copper_ore",
	Tile.GOLD:               "tile_mine_gold",
	# Treasure
	Tile.COIN_GOLDEN:        "tile_coin_golden",
	# Fire farm hazard (T7) — its own "fire" string key (mirrors the React board cell key
	# "fire" that try_extinguish_fire matches on). No PNG ships; flat fallback fill.
	Tile.FIRE:               "fire",
	# Mine hazards (T11) — their own string keys, mirroring the React board-cell keys the
	# mine-hazard logic matches on ("lava" hazards.ts:240, "mysterious_ore" mysterious_ore.ts:58).
	# GAS has no React board-key (React uses a per-cell overlay flag); the port keys it "gas" for
	# the single GAS tile it stamps at the vent cell. No PNGs ship; flat fallback fills.
	Tile.LAVA:               "lava",
	Tile.GAS:                "gas",
	Tile.MYSTERIOUS_ORE:     "mysterious_ore",
}

## Resource each tile family produces (src/constants.ts:298-319).
const PRODUCES := {
	Tile.GRASS:    "hay_bundle",
	Tile.WHEAT:    "flour",
	Tile.PHEASANT: "eggs",
	Tile.CARROT:   "soup",
	Tile.APPLE:    "pie",
	Tile.PANSY:    "honey",
	Tile.OAK:      "plank",
	Tile.PIG:      "meat",
	Tile.COW:      "milk",
	Tile.HORSE:    "horseshoe",
	# Mine biome (M3f): stone→block, iron_ore→iron_bar, coal→coke, dirt→dirt,
	# gem→cut_gem. credit_chain is biome-agnostic and routes these through the
	# SAME shared inventory as farm goods (see GameState M3f SIMPLIFICATION note).
	Tile.STONE:    "block",
	Tile.IRON_ORE: "iron_bar",
	Tile.COAL:     "coke",
	Tile.DIRT:     "dirt",
	Tile.GEM:      "cut_gem",
	# Rats hazard (M3h): RAT produces NOTHING. Chaining rats is a wasted move — the
	# point of the hazard. Deliberately absent from THRESHOLDS too, so
	# threshold_for(RAT) returns the NO_THRESHOLD sentinel and produced_resource is "".
	Tile.RAT:      "",
	# Rubble mine hazard (M3i): RUBBLE produces NOTHING — chaining it wastes a mine
	# turn (the food/supplies gate makes turns scarce, so the clutter bites). Like RAT
	# it is deliberately ABSENT from THRESHOLDS, so threshold_for(RUBBLE) returns the
	# NO_THRESHOLD sentinel and produced_resource is "".
	Tile.RUBBLE:   "",
	# Fish / Harbor biome (M3j): the catch lands in the SAME shared inventory as farm +
	# mine goods (credit_chain is biome-agnostic). sardine/mackerel → fish_fillet,
	# clam → sea_shells, oyster → pearls, kelp → fish_oil.
	Tile.FISH_SARDINE:  "fish_fillet",
	Tile.FISH_MACKEREL: "fish_fillet",
	Tile.FISH_CLAM:     "sea_shells",
	Tile.FISH_OYSTER:   "pearls",
	Tile.FISH_KELP:     "fish_oil",
	# FISH_PEARL produces NOTHING via the normal chain path — it is the rune-capture
	# tile, deliberately ABSENT from THRESHOLDS (threshold_for → NO_THRESHOLD,
	# produced_resource → ""), captured via GameState.try_capture_pearl for +1 Rune.
	Tile.FISH_PEARL:    "",
	# ── Full tile-catalog parity. Each catalog variant produces its family's resource,
	# matching src/constants.ts TILE_FAMILY_RESOURCE (+ the blackberry → jam per-tile override).
	Tile.GRASS_MEADOW:       "hay_bundle",
	Tile.GRASS_SPIKY:        "hay_bundle",
	Tile.GRASS_HEATHER:      "hay_bundle",
	Tile.GRAIN_CORN:         "flour",
	Tile.GRAIN_BUCKWHEAT:    "flour",
	Tile.GRAIN_MANNA:        "flour",
	Tile.GRAIN_RICE:         "flour",
	Tile.VEG_EGGPLANT:       "soup",
	Tile.VEG_TURNIP:         "soup",
	Tile.VEG_BEET:           "soup",
	Tile.VEG_CUCUMBER:       "soup",
	Tile.VEG_SQUASH:         "soup",
	Tile.VEG_MUSHROOM:       "soup",
	Tile.VEG_PEPPER:         "soup",
	Tile.VEG_BROCCOLI:       "soup",
	Tile.FRUIT_PEAR:         "pie",
	Tile.FRUIT_GOLDEN_APPLE: "pie",
	# Blackberry → jam (the web sets tile_fruit_blackberry.next = "jam", a per-tile override
	# off the fruit-family default of pie).
	Tile.FRUIT_BLACKBERRY:   "jam",
	Tile.FRUIT_RAMBUTAN:     "pie",
	Tile.FRUIT_STARFRUIT:    "pie",
	Tile.FRUIT_COCONUT:      "pie",
	Tile.FRUIT_LEMON:        "pie",
	Tile.FRUIT_JACKFRUIT:    "pie",
	Tile.FLOWER_WATER_LILY:  "honey",
	Tile.TREE_BIRCH:         "plank",
	Tile.TREE_WILLOW:        "plank",
	Tile.TREE_FIR:           "plank",
	Tile.TREE_CYPRESS:       "plank",
	Tile.TREE_PALM:          "plank",
	Tile.BIRD_TURKEY:        "eggs",
	# Clover/Melon carry a legacy tile_bird_ id prefix but the web authors them as
	# flowers/fruits (tileCollection/data.ts:126,135) → they produce the FLOWER/FRUIT
	# family resource (honey/pie), NOT eggs. Re-filed to category flower/fruit below.
	Tile.BIRD_CLOVER:        "honey",
	Tile.BIRD_MELON:         "pie",
	Tile.BIRD_CHICKEN:       "eggs",
	Tile.BIRD_HEN:           "eggs",
	Tile.BIRD_ROOSTER:       "eggs",
	Tile.BIRD_WILD_GOOSE:    "eggs",
	Tile.BIRD_GOOSE:         "eggs",
	Tile.BIRD_PARROT:        "eggs",
	Tile.BIRD_PHOENIX:       "eggs",
	Tile.BIRD_DODO:          "eggs",
	Tile.BIRD_PIG_IN_DISGUISE: "eggs",
	Tile.HERD_HOG:           "meat",
	Tile.HERD_BOAR:          "meat",
	Tile.HERD_WARTHOG:       "meat",
	Tile.HERD_SHEEP:         "meat",
	Tile.HERD_ALPACA:        "meat",
	Tile.HERD_GOAT:          "meat",
	Tile.HERD_RAM:           "meat",
	Tile.CATTLE_LONGHORN:    "milk",
	Tile.CATTLE_TRICERATOPS: "milk",
	Tile.MOUNT_DONKEY:       "horseshoe",
	Tile.MOUNT_MOOSE:        "horseshoe",
	Tile.MOUNT_MAMMOTH:      "horseshoe",
	Tile.COPPER_ORE:         "copper_bar",
	Tile.GOLD:               "gold_bar",
	# COIN_GOLDEN produces NOTHING through the chain pipeline — deliberately ABSENT (like
	# RAT/RUBBLE/FISH_PEARL): produced_resource → "" and threshold_for → NO_THRESHOLD.
	Tile.COIN_GOLDEN:        "",
	# Mine hazards (T11): LAVA / GAS / MYSTERIOUS_ORE all produce NOTHING via the normal chain
	# pipeline (like RAT/RUBBLE/FIRE/FISH_PEARL). LAVA/GAS are pure hazards; MYSTERIOUS_ORE is the
	# rune-capture tile (captured via GameState.try_capture_mysterious_ore, not credited as a chain).
	# Deliberately absent from THRESHOLDS too (threshold_for → NO_THRESHOLD).
	Tile.LAVA:               "",
	Tile.GAS:                "",
	Tile.MYSTERIOUS_ORE:     "",
}

## Chain length that yields ONE unit of the produced resource
## (UPGRADE_THRESHOLDS, src/constants.ts:222-254).
const THRESHOLDS := {
	Tile.GRASS:    6,
	Tile.WHEAT:    5,
	Tile.PHEASANT: 6,
	Tile.CARROT:   6,
	Tile.APPLE:    7,
	Tile.PANSY:    10,
	Tile.OAK:      6,
	Tile.PIG:      5,
	Tile.COW:      6,
	Tile.HORSE:    10,
	# Mine biome (M3f) — first-pass, tunable. Stone is the cheap staple; gem rare.
	Tile.STONE:    6,
	Tile.IRON_ORE: 6,
	Tile.COAL:     8,
	Tile.DIRT:     5,
	Tile.GEM:      10,
	# Fish / Harbor biome (M3j) — sardine/mackerel/clam/oyster at 5, kelp the cheap
	# filler at 6. FISH_PEARL is deliberately ABSENT (threshold_for → NO_THRESHOLD): it
	# is never credited through the normal chain path; capture grants a Rune instead.
	Tile.FISH_SARDINE:  5,
	Tile.FISH_MACKEREL: 5,
	Tile.FISH_CLAM:     5,
	Tile.FISH_OYSTER:   5,
	Tile.FISH_KELP:     6,
	# ── Full tile-catalog parity. Per-family thresholds match src/constants.ts
	# UPGRADE_THRESHOLDS: grass/grain/veg/trees/birds/cattle/copper/gold = 6, fruit = 7,
	# flowers/mounts = 10, herd = 5. COIN_GOLDEN is deliberately ABSENT (no chain yield).
	Tile.GRASS_MEADOW:       6,
	Tile.GRASS_SPIKY:        6,
	Tile.GRASS_HEATHER:      6,
	Tile.GRAIN_CORN:         6,
	Tile.GRAIN_BUCKWHEAT:    6,
	Tile.GRAIN_MANNA:        6,
	Tile.GRAIN_RICE:         6,
	Tile.VEG_EGGPLANT:       6,
	Tile.VEG_TURNIP:         6,
	Tile.VEG_BEET:           6,
	Tile.VEG_CUCUMBER:       6,
	Tile.VEG_SQUASH:         6,
	Tile.VEG_MUSHROOM:       6,
	Tile.VEG_PEPPER:         6,
	Tile.VEG_BROCCOLI:       6,
	Tile.FRUIT_PEAR:         7,
	Tile.FRUIT_GOLDEN_APPLE: 7,
	Tile.FRUIT_BLACKBERRY:   7,
	Tile.FRUIT_RAMBUTAN:     7,
	Tile.FRUIT_STARFRUIT:    7,
	Tile.FRUIT_COCONUT:      7,
	Tile.FRUIT_LEMON:        7,
	Tile.FRUIT_JACKFRUIT:    7,
	Tile.FLOWER_WATER_LILY:  10,
	Tile.TREE_BIRCH:         6,
	Tile.TREE_WILLOW:        6,
	Tile.TREE_FIR:           6,
	Tile.TREE_CYPRESS:       6,
	Tile.TREE_PALM:          6,
	Tile.BIRD_TURKEY:        6,
	# Clover = flower family (threshold 10), Melon = fruit family (threshold 7) — see
	# the produced-resource + category re-file (web authors them flowers/fruits).
	Tile.BIRD_CLOVER:        10,
	Tile.BIRD_MELON:         7,
	Tile.BIRD_CHICKEN:       6,
	Tile.BIRD_HEN:           6,
	Tile.BIRD_ROOSTER:       6,
	Tile.BIRD_WILD_GOOSE:    6,
	Tile.BIRD_GOOSE:         6,
	Tile.BIRD_PARROT:        6,
	Tile.BIRD_PHOENIX:       6,
	Tile.BIRD_DODO:          6,
	Tile.BIRD_PIG_IN_DISGUISE: 6,
	Tile.HERD_HOG:           5,
	Tile.HERD_BOAR:          5,
	Tile.HERD_WARTHOG:       5,
	Tile.HERD_SHEEP:         5,
	Tile.HERD_ALPACA:        5,
	Tile.HERD_GOAT:          5,
	Tile.HERD_RAM:           5,
	Tile.CATTLE_LONGHORN:    6,
	Tile.CATTLE_TRICERATOPS: 6,
	Tile.MOUNT_DONKEY:       10,
	Tile.MOUNT_MOOSE:        10,
	Tile.MOUNT_MAMMOTH:      10,
	Tile.COPPER_ORE:         6,
	Tile.GOLD:               6,
}

## Weighted spawn pool for the Farm biome (src/constants.ts:268-281).
## Grass is weighted 3x so a fresh board always has a common matchable type.
## Retained as the DEFAULT fallback for BoardLogic.refill and existing tests; the
## live game (M3b+) builds its refill pool dynamically from STAPLE_POOL plus the
## tiles unlocked by placed spawner buildings (see GameState.active_tile_pool).
const FARM_POOL: Array = [
	Tile.GRASS, Tile.GRASS, Tile.GRASS,
	Tile.WHEAT, Tile.PHEASANT, Tile.CARROT, Tile.APPLE,
	Tile.PANSY, Tile.OAK, Tile.PIG, Tile.COW, Tile.HORSE,
]

# ── Staples + categories (M3b building-gated spawners) ──────────────────────
## The two staple tiles every Town-1 board always provides, regardless of which
## spawner buildings are placed: grass (→hay_bundle) and wheat/grain (→flour).
const STAPLE_TILES: Array = [Tile.GRASS, Tile.WHEAT]

## Refill pool for a fresh, building-less board: staples only, with grass weighted
## heavier so a starting board always has a common, chainable staple. Spawner
## buildings append their tiles to this at runtime (GameState.active_tile_pool).
const STAPLE_POOL: Array = [
	Tile.GRASS, Tile.GRASS, Tile.GRASS,
	Tile.WHEAT, Tile.WHEAT,
]

## Weighted refill pool for the MINE biome (M3f, Town 2). Stone is the common
## staple (×3); iron + coal are mid-weight (×2 each); dirt fills (×2); gem is rare
## (×1). Used by GameState.active_biome_pool() while on a mine expedition — the
## mine board is NOT building-gated this milestone (no mine spawners yet).
const MINE_POOL: Array = [
	Tile.STONE, Tile.STONE, Tile.STONE,
	Tile.IRON_ORE, Tile.IRON_ORE,
	Tile.COAL, Tile.COAL,
	Tile.DIRT, Tile.DIRT,
	Tile.GEM,
]

## ── Fish / Harbor biome pools (M3j, ported from src/features/fish) ──────────────
## The GENERAL weighted refill pool for the harbor board: sardine ×3 (the common
## staple catch), mackerel ×2, clam ×2, kelp ×2, oyster ×1 (rare). Used by
## GameState.active_biome_pool() while on a harbor expedition — the harbor board is
## NOT building-gated this milestone (no harbor spawners yet), mirroring the mine.
## The giant pearl is NOT in any pool — the board slice seeds it conditionally.
const FISH_POOL: Array = [
	Tile.FISH_SARDINE, Tile.FISH_SARDINE, Tile.FISH_SARDINE,
	Tile.FISH_MACKEREL, Tile.FISH_MACKEREL,
	Tile.FISH_CLAM, Tile.FISH_CLAM,
	Tile.FISH_KELP, Tile.FISH_KELP,
	Tile.FISH_OYSTER,
]

## The HIGH-tide bottom-row pool: surface/pelagic fish. Mirrors React HIGH_TIDE_POOL
## (sardine ×2, mackerel ×2, kelp). The board slice mutates the board's bottom row
## from this pool when the tide rises (see GameState.note_harbor_turn tide tick).
const HIGH_TIDE_POOL: Array = [
	Tile.FISH_SARDINE, Tile.FISH_SARDINE,
	Tile.FISH_MACKEREL, Tile.FISH_MACKEREL,
	Tile.FISH_KELP,
]

## The LOW-tide bottom-row pool: shellfish + kelp exposed at low water. Mirrors React
## LOW_TIDE_POOL (clam ×2, kelp ×2, oyster).
const LOW_TIDE_POOL: Array = [
	Tile.FISH_CLAM, Tile.FISH_CLAM,
	Tile.FISH_KELP, Tile.FISH_KELP,
	Tile.FISH_OYSTER,
]

## Spent harbor turns between tide flips (high↔low). Mirrors React TIDE_PERIOD.
const TIDE_PERIOD: int = 3

## Countdown (in harbor turns) on a freshly-seeded giant pearl before it expires.
## Mirrors React PEARL_TURNS — chain it within this window to capture the Rune.
const PEARL_TURNS: int = 5

## How many OTHER fish-category tiles a pearl chain must also contain to be a valid
## capture (the pearl itself does not count). Mirrors React REQUIRED_FISH_IN_CHAIN.
const REQUIRED_FISH_IN_CHAIN: int = 2

## The giant-pearl tile's string key (the rune-capture tile). Mirrors React PEARL_KEY
## (src/features/fish/pearl.ts) — kept as a named const so FishConfig and the board
## slice agree on the same key without re-deriving it from STRING_KEYS.
const PEARL_KEY: String = "tile_special_giant_pearl"

## Tile -> category id. Staples are "grass"/"grain"; every other family belongs to
## a category gated by a spawner building (BuildingConfig).
const CATEGORY := {
	Tile.GRASS:    "grass",
	Tile.WHEAT:    "grain",
	Tile.OAK:      "trees",
	Tile.PHEASANT: "birds",
	Tile.CARROT:   "veg",
	Tile.APPLE:    "fruit",
	Tile.PANSY:    "flower",
	Tile.PIG:      "herd",
	Tile.COW:      "cattle",
	Tile.HORSE:    "mount",
	# Mine biome (M3f).
	Tile.STONE:    "stone",
	Tile.IRON_ORE: "iron",
	Tile.COAL:     "coal",
	Tile.DIRT:     "dirt",
	Tile.GEM:      "gem",
	# Rats hazard (M3h) — its own "rat" category; it is neither a spawner-gated farm
	# category nor a mine category, so no building adds it to the pool.
	Tile.RAT:      "rat",
	# Rubble mine hazard (M3i) — its own "rubble" category; it is seeded directly into
	# the mine pool (active_biome_pool), not via any building/category gate.
	Tile.RUBBLE:   "rubble",
	# Fish / Harbor biome (M3j) — the five catchable tiles share the "fish" category,
	# which is what FishConfig.is_fish_tile and the pearl-chain rule key off (a valid
	# pearl chain needs the pearl PLUS >= REQUIRED_FISH_IN_CHAIN tiles in this category).
	Tile.FISH_SARDINE:  "fish",
	Tile.FISH_MACKEREL: "fish",
	Tile.FISH_CLAM:     "fish",
	Tile.FISH_OYSTER:   "fish",
	Tile.FISH_KELP:     "fish",
	# FISH_PEARL gets its OWN "fish_pearl" category so it is NOT counted as one of the
	# required fish tiles in its own capture chain, and so it never seeds into the fish
	# spawn pools (the board slice conditionally places it instead).
	Tile.FISH_PEARL:    "fish_pearl",
	# ── Full tile-catalog parity. Catalog variants reuse the port's existing short category
	# ids (the web's bird/vegetables/fruits/flowers/herd_animals/mounts map to the port's
	# birds/veg/fruit/flower/herd/mount). Mine copper + gold get their OWN categories ("copper",
	# "gold") and the golden coin a "coin" category — none seed into any board pool here.
	Tile.GRASS_MEADOW:       "grass",
	Tile.GRASS_SPIKY:        "grass",
	Tile.GRASS_HEATHER:      "grass",
	Tile.GRAIN_CORN:         "grain",
	Tile.GRAIN_BUCKWHEAT:    "grain",
	Tile.GRAIN_MANNA:        "grain",
	Tile.GRAIN_RICE:         "grain",
	Tile.VEG_EGGPLANT:       "veg",
	Tile.VEG_TURNIP:         "veg",
	Tile.VEG_BEET:           "veg",
	Tile.VEG_CUCUMBER:       "veg",
	Tile.VEG_SQUASH:         "veg",
	Tile.VEG_MUSHROOM:       "veg",
	Tile.VEG_PEPPER:         "veg",
	Tile.VEG_BROCCOLI:       "veg",
	Tile.FRUIT_PEAR:         "fruit",
	Tile.FRUIT_GOLDEN_APPLE: "fruit",
	Tile.FRUIT_BLACKBERRY:   "fruit",
	Tile.FRUIT_RAMBUTAN:     "fruit",
	Tile.FRUIT_STARFRUIT:    "fruit",
	Tile.FRUIT_COCONUT:      "fruit",
	Tile.FRUIT_LEMON:        "fruit",
	Tile.FRUIT_JACKFRUIT:    "fruit",
	Tile.FLOWER_WATER_LILY:  "flower",
	Tile.TREE_BIRCH:         "trees",
	Tile.TREE_WILLOW:        "trees",
	Tile.TREE_FIR:           "trees",
	Tile.TREE_CYPRESS:       "trees",
	Tile.TREE_PALM:          "trees",
	Tile.BIRD_TURKEY:        "birds",
	# Re-filed: the web authors Clover as a flower and Melon as a fruit
	# (tileCollection/data.ts:126,135); only the legacy id keeps the bird_ prefix.
	Tile.BIRD_CLOVER:        "flower",
	Tile.BIRD_MELON:         "fruit",
	Tile.BIRD_CHICKEN:       "birds",
	Tile.BIRD_HEN:           "birds",
	Tile.BIRD_ROOSTER:       "birds",
	Tile.BIRD_WILD_GOOSE:    "birds",
	Tile.BIRD_GOOSE:         "birds",
	Tile.BIRD_PARROT:        "birds",
	Tile.BIRD_PHOENIX:       "birds",
	Tile.BIRD_DODO:          "birds",
	Tile.BIRD_PIG_IN_DISGUISE: "birds",
	Tile.HERD_HOG:           "herd",
	Tile.HERD_BOAR:          "herd",
	Tile.HERD_WARTHOG:       "herd",
	Tile.HERD_SHEEP:         "herd",
	Tile.HERD_ALPACA:        "herd",
	Tile.HERD_GOAT:          "herd",
	Tile.HERD_RAM:           "herd",
	Tile.CATTLE_LONGHORN:    "cattle",
	Tile.CATTLE_TRICERATOPS: "cattle",
	Tile.MOUNT_DONKEY:       "mount",
	Tile.MOUNT_MOOSE:        "mount",
	Tile.MOUNT_MAMMOTH:      "mount",
	Tile.COPPER_ORE:         "copper",
	Tile.GOLD:               "gold",
	Tile.COIN_GOLDEN:        "coin",
	# Fire farm hazard (T7) — its own "fire" category; never seeded into any board pool
	# (HazardLogic places it positionally via the spawn roll, like rats/wolves).
	Tile.FIRE:               "fire",
	# Mine hazards (T11) — their own categories; none seed into any board pool (MineHazardLogic
	# places them positionally via the spawn roll / countdown, like rats/wolves/fire). "dirt" is
	# deliberately NOT reused for MYSTERIOUS_ORE — it is its own capture tile, kept out of the
	# dirt-count its capture chain requires (mirrors FISH_PEARL's own "fish_pearl" category).
	Tile.LAVA:               "lava",
	Tile.GAS:                "gas",
	Tile.MYSTERIOUS_ORE:     "mysterious_ore",
}

## A very large int that stands in for "no threshold" without needing INF.
const NO_THRESHOLD: int = 1 << 30

## Rats hazard (M3h, Town 3). LEGACY pool-seed count — retained as a NAMED constant only
## for back-compat (run_rats_tests references it). The faithful T9 rat model (HazardLogic)
## NO LONGER seeds rats into the refill pool: rats spawn POSITIONALLY via roll_rat_spawn and
## eat plants each turn (src/features/farm/rats.ts). active_tile_pool() no longer reads this.
const RAT_POOL_SLOTS: int = 2

# ── Farm hazards (T7/T8/T9, ported from src/features/farm/rats.ts + hazards.ts +
# attractsRats.ts) ──────────────────────────────────────────────────────────────
## Rat spawn gate: react inv.tile_grass_grass / tile_grain_wheat > 50. The Godot
## inventory is RESOURCE-keyed (no tile-key counts), so the faithful analogue uses the
## grass/wheat PRODUCE staples: qty("hay_bundle") > 50 AND qty("flour") > 50 (documented
## adaptation). 10% spawn chance per board fill, cap 4 active. (rats.ts:54-83 / RAT_SPAWN_THRESHOLDS)
const RAT_SPAWN_HAY_THRESHOLD: int = 50
const RAT_SPAWN_FLOUR_THRESHOLD: int = 50
const RAT_SPAWN_RATE: float = 0.10
const RAT_MAX_ACTIVE: int = 4
## +5 coins per rat cleared by a chain-3 (rats.ts RAT_CLEAR_REWARD_PER).
const RAT_CLEAR_REWARD_PER: int = 5
## attracts_rats per-tile spawn-rate bump (Manna/Jackfruit), capped at 1.0 (attractsRats.ts).
const ATTRACT_RATE_BONUS: float = 0.05

## Fire hazard (hazards.ts): 4% spawn/fill, 50% spread/turn, cap 3 cells, +2 coins/tile extinguished.
const FIRE_SPAWN_RATE: float = 0.04
const FIRE_SPREAD_RATE: float = 0.50
const FIRE_MAX_CELLS: int = 3
const FIRE_EXTINGUISH_REWARD_PER: int = 2
## Fire is GATED OFF by default to match the live React game (FIRE_HAZARD_ENABLED false +
## isFireHazardEnabled() tuning override, default off). GameState.fire_hazard_enabled() reads
## this; tests force-enable it on a GameState instance via fire_hazard_force.
const FIRE_HAZARD_ENABLED: bool = false

## Wolves hazard (hazards.ts): 6% spawn/fill when birds-rich (eggs > 30 OR turkey > 5), cap 2.
## Scattered wolves stay scared for 5 turns; non-scared wolves eat one adjacent bird tile/turn.
const WOLF_SPAWN_RATE: float = 0.06
const WOLF_MAX_ACTIVE: int = 2
const WOLF_SPAWN_EGGS_THRESHOLD: int = 30
const WOLF_SPAWN_TURKEY_THRESHOLD: int = 5
const WOLF_SCARED_TURNS: int = 5

## Rubble mine hazard (M3i, Town 2 expedition). How many RUBBLE tiles seed into the
## MINE refill pool while on an expedition (GameState.active_biome_pool). Kept low so
## rubble is a recurring nuisance the player mines through, not a board takeover — with
## only 2 slots in a 10-slot MINE_POOL it never dominates the board.
const RUBBLE_POOL_SLOTS: int = 2

# ── Mine hazards (T11, ported from src/features/mine/hazards.ts) ─────────────────
## The mine-hazard SPAWN gate: a hazard rolls at MINE_HAZARD_BASE_RATE per board fill, ONLY in
## the mine, NEVER with a boss active, and NEVER when another mine hazard is already active
## (single-active cap). Mirrors React HAZARD_BASE_RATE (hazards.ts:13).
const MINE_HAZARD_BASE_RATE: float = 0.05

## Weighted pick over the four mine hazards (total 100). Mirrors the React HAZARDS pool weights
## (hazards.ts: cave_in 25, gas_vent 40, lava 20, mole 15). Used by MineHazardLogic.roll_mine_hazard.
const MINE_HAZARD_WEIGHTS: Dictionary = {
	"cave_in":  25,
	"gas_vent": 40,
	"lava":     20,
	"mole":     15,
}

## Stable iteration order for the mine-hazard weighted pick (so the seeded roll is deterministic —
## a Dictionary's key order is insertion order in GDScript, but an explicit list is unambiguous).
const MINE_HAZARD_IDS: Array = ["cave_in", "gas_vent", "lava", "mole"]

## Gas Vent countdown (in mine turns) before the cloud expires. On expiry it COSTS A TURN and
## clears (the "You cough through it." floater). Chaining the gas cell disperses it early. Mirrors
## the React gas_vent durationTurns (hazards.ts:71 / spawn turnsRemaining 3).
const GAS_VENT_TURNS: int = 3

## Giant Mole cycle (in mine turns): while turnsRemaining > 0 the mole consumes one adjacent
## non-consumed/non-rubble tile each turn; at 0 it HOPS to a random free adjacent cell and resets
## to this. Mirrors the React mole turnsRemaining 3 (hazards.ts:101 / _tickMole).
const MOLE_TURNS: int = 3

# ── Mysterious Ore → Rune (T23, ported from src/features/mine/mysterious_ore.ts) ─
## Countdown (in mine turns) on a freshly-spawned Mysterious Ore before it degrades to plain DIRT.
## Chain it (with >= REQUIRED_DIRT_IN_CHAIN dirt) within this window to capture the Rune. Mirrors
## React MYSTERIOUS_ORE_TURNS (mysterious_ore.ts:11).
const MYSTERIOUS_ORE_TURNS: int = 5

## How many DIRT tiles a Mysterious-Ore capture chain must ALSO contain (the ore itself does not
## count) to grant a Rune. Mirrors React REQUIRED_DIRT_IN_CHAIN (mysterious_ore.ts:12).
const REQUIRED_DIRT_IN_CHAIN: int = 2

# ── Seasons (src/constants.ts:256 SEASONS + zones/data.ts seasonIndexInSession) ──
## The farm board cycles four seasons over its turn budget (see GameState.farm_turns_used
## + ZoneConfig.base_turns). Each season has a NAME and a LOOK palette (bg / fill / accent),
## ported VERBATIM from the React SEASONS array as 0xRRGGBB ints. The look is consumed by the
## season-bar UI (a later PR); this layer owns the palette, the names, and the index math.
const SEASON_NAMES: Array = ["Spring", "Summer", "Autumn", "Winter"]

## Coins granted when a bounded farm run's season is closed out (GameState.close_season).
## Mirrors React's SEASON_END_BONUS_COINS (src/state.ts).
const SEASON_END_BONUS_COINS: int = 25

## The four seasons, indexed 0..3 by season_index(). `bg`/`fill`/`accent` are 0xRRGGBB ints
## (matching the React SEASONS.look hex values exactly) — convert with
## Color.hex(0xFF000000 | v) when a Color is needed. `name` mirrors SEASON_NAMES[i].
const SEASONS: Array = [
	{"name": "Spring", "bg": 0x7dbd48, "fill": 0x8fd85a, "accent": 0x5daa35},
	{"name": "Summer", "bg": 0x8fca45, "fill": 0xf6c342, "accent": 0xe3a92f},
	{"name": "Autumn", "bg": 0xb77b3a, "fill": 0xd9792d, "accent": 0xa65722},
	{"name": "Winter", "bg": 0x78aaca, "fill": 0x91d9ff, "accent": 0xd9f6ff},
]

# ── Static helpers (usable without an instance) ────────────────────────────

## The season index (0=Spring … 3=Winter) for `turns_used` of a `turn_budget`-turn session.
## Ported VERBATIM from src/features/zones/data.ts `seasonIndexInSession`: the budget is split
## evenly across four seasons by REMAINING turns. A non-positive budget pins Spring (0).
static func season_index(turns_used: int, turn_budget: int) -> int:
	if turn_budget <= 0:
		return 0
	var remaining: int = maxi(0, turn_budget - turns_used)
	if remaining > turn_budget * 0.75:
		return 0   # Spring
	if remaining > turn_budget * 0.50:
		return 1   # Summer
	if remaining > turn_budget * 0.25:
		return 2   # Autumn
	return 3       # Winter

## The season NAME ("Spring"…"Winter") for `turns_used` of a `turn_budget`-turn session.
static func season_name(turns_used: int, turn_budget: int) -> String:
	return String(SEASON_NAMES[season_index(turns_used, turn_budget)])

# ── Season STRIP palette (src/ui/seasonStrip.tsx SEASON_PALETTES) ──────────────
## The season-BAR look, ported VERBATIM from src/ui/seasonStrip.tsx `SEASON_PALETTES`.
## DISTINCT from `SEASONS` above (that is the board-FIELD look; this is the HUD strip's
## per-segment vertical gradient + its name-label colour). Each entry: `bg_top`/`bg_bot`
## are the gradient stops (top→bottom) and `label` the uppercase season-name colour.
const SEASON_STRIP_PALETTES: Array = [
	{"name": "Spring", "bg_top": Color8(0xfd, 0xe7, 0xf0), "bg_bot": Color8(0xbf, 0xe3, 0xb3), "label": Color8(0x9a, 0x33, 0x58)},
	{"name": "Summer", "bg_top": Color8(0xff, 0xe9, 0xa8), "bg_bot": Color8(0xf3, 0xb8, 0x50), "label": Color8(0x7a, 0x53, 0x20)},
	{"name": "Autumn", "bg_top": Color8(0xff, 0xd9, 0xa8), "bg_bot": Color8(0xcd, 0x86, 0x4a), "label": Color8(0x8a, 0x3a, 0x14)},
	{"name": "Winter", "bg_top": Color8(0xe5, 0xf0, 0xfa), "bg_bot": Color8(0x90, 0xb0, 0xc6), "label": Color8(0x1f, 0x3a, 0x5a)},
]

## The board-FIELD gradient colours per season (src/ui/puzzleBoard.tsx). Each entry is the
## two-stop field tint the board card uses while that season is active. Subtle on purpose —
## the board tiles' own pastel backgrounds should still read over it. `top`/`bot` mirror the
## React field gradient stops; the port tints the board card's border/edge with these.
const SEASON_FIELD_COLORS: Array = [
	{"name": "Spring", "top": Color8(0xdb, 0xe6, 0xb5), "bot": Color8(0xb8, 0xcf, 0x8a)},
	{"name": "Summer", "top": Color8(0xec, 0xdf, 0xb0), "bot": Color8(0xc7, 0xb8, 0x7a)},
	{"name": "Autumn", "top": Color8(0xe8, 0xc8, 0x90), "bot": Color8(0xc8, 0xa4, 0x5a)},
	{"name": "Winter", "top": Color8(0xdd, 0xe4, 0xea), "bot": Color8(0xb6, 0xc2, 0xcc)},
]

# ── Chain-stage palette (src/ui/puzzleBoard.tsx CHAIN_STAGES) ──────────────────
## The escalating chain-tier palette, ported VERBATIM from src/ui/puzzleBoard.tsx
## `CHAIN_STAGES`. Index = upgrades EARNED (floor(chain_len / threshold)), clamped to
## 0..4 by chain_stage_index(). Each entry: `top`/`bot` are the fill gradient stops
## (top→bottom), `accent` the bar's glow/dot colour, and `label` the all-caps banner
## ("BONUS!"/"DOUBLE!"/"TRIPLE!"/"FRENZY!") shown once earned >= 1 ("" at stage 0).
## The hex strings match the React verbatim; convert with Color(hex) at the call site.
const CHAIN_STAGES: Array = [
	{"top": "#f0c14b", "bot": "#d97a2a", "accent": "#e07a3a", "label": ""},
	{"top": "#a3d65a", "bot": "#6d9928", "accent": "#5e9a2a", "label": "BONUS!"},
	{"top": "#7dc2e4", "bot": "#3a7eae", "accent": "#4082b5", "label": "DOUBLE!"},
	{"top": "#d8a4f0", "bot": "#8a4ec9", "accent": "#9648c6", "label": "TRIPLE!"},
	{"top": "#ffb04a", "bot": "#d62828", "accent": "#e62828", "label": "FRENZY!"},
]

## Split a turn `budget` across the four seasons by FLOOR math so the per-season counts sum
## EXACTLY to the budget. Ported VERBATIM from src/ui/seasonStrip.tsx `seasonTurnRanges`:
## ends = [floor(S/4), floor(2S/4), floor(3S/4), S]; each season count = end - prevEnd.
## Returns an Array of 4 Dictionaries { start:int, end:int, count:int } (one per season).
## For S=10 → counts [2,3,2,3]; S=12 → [3,3,3,3]. A non-positive budget is clamped to 1.
static func season_turn_ranges(turn_budget: int) -> Array:
	var s: int = maxi(1, turn_budget)
	var ends: Array = [
		int(floor(float(s) / 4.0)),
		int(floor(2.0 * float(s) / 4.0)),
		int(floor(3.0 * float(s) / 4.0)),
		s,
	]
	var out: Array = []
	var prev: int = 0
	for i in 4:
		var end: int = int(ends[i])
		out.append({"start": prev, "end": end, "count": end - prev})
		prev = end
	return out

static func produced_resource(tile: int) -> String:
	return PRODUCES.get(tile, "")

static func threshold_for(tile: int) -> int:
	return THRESHOLDS.get(tile, NO_THRESHOLD)

## The chain STAGE index (0..4) for a live chain of `chain_len` tiles against `threshold`,
## ported from src/ui/puzzleBoard.tsx: `earned = floor(chain_len / threshold)`, then
## `CHAIN_STAGES[min(earned, len-1)]`. A non-positive threshold (a hazard tile like RAT/
## RUBBLE, threshold_for → NO_THRESHOLD won't hit this — callers pass a real producer's
## threshold) or non-positive chain pins stage 0. Clamped to the last stage so a very long
## chain caps at FRENZY!. Pure + headless-testable (no node construction).
static func chain_stage_index(chain_len: int, threshold: int) -> int:
	if threshold <= 0 or chain_len <= 0:
		return 0
	var earned: int = int(floor(float(chain_len) / float(threshold)))
	return clampi(earned, 0, CHAIN_STAGES.size() - 1)

## The CHAIN_STAGES entry (Dictionary {top, bot, accent, label}) for a chain of `chain_len`
## against `threshold`. Convenience wrapper over chain_stage_index so the HUD can read the
## stage's palette + label in one call.
static func chain_stage(chain_len: int, threshold: int) -> Dictionary:
	return CHAIN_STAGES[chain_stage_index(chain_len, threshold)]

static func string_key(tile: int) -> String:
	return STRING_KEYS.get(tile, "")

## Category id for a tile ("grass", "grain", "trees", …); "" for unknown tiles.
static func category_of(tile: int) -> String:
	return CATEGORY.get(tile, "")

## Stage-1 placeholder fill color. Replaced wholesale by PNG textures in
## asset-pipeline Stage 2 without touching surrounding code. Kept as a match
## (not a const dict) so Color construction stays out of constant evaluation.
static func color_for(tile: int) -> Color:
	match tile:
		Tile.GRASS:    return Color(0.42, 0.68, 0.32)
		Tile.WHEAT:    return Color(0.89, 0.76, 0.29)
		Tile.PHEASANT: return Color(0.61, 0.42, 0.25)
		Tile.CARROT:   return Color(0.91, 0.54, 0.23)
		Tile.APPLE:    return Color(0.78, 0.26, 0.23)
		Tile.PANSY:    return Color(0.54, 0.36, 0.76)
		Tile.OAK:      return Color(0.25, 0.42, 0.23)
		Tile.PIG:      return Color(0.90, 0.56, 0.63)
		Tile.COW:      return Color(0.92, 0.89, 0.82)
		Tile.HORSE:    return Color(0.35, 0.26, 0.20)
		# Mine biome (M3f) — cool greys/earths against the warm farm palette.
		Tile.STONE:    return Color(0.55, 0.55, 0.58)
		Tile.IRON_ORE: return Color(0.72, 0.45, 0.34)
		Tile.COAL:     return Color(0.18, 0.18, 0.20)
		Tile.DIRT:     return Color(0.45, 0.34, 0.24)
		Tile.GEM:      return Color(0.40, 0.78, 0.85)
		# Rats hazard (M3h) — a drab vermin grey. No PNG ships this milestone; the
		# Stage-1 fallback renders this flat color.
		Tile.RAT:      return Color(0.36, 0.34, 0.38)
		# Rubble mine hazard (M3i) — a dark cave-rock grey-brown that reads as inert
		# cave-in stone against the cooler mine ores. No PNG ships; flat fallback fill.
		Tile.RUBBLE:   return Color(0.34, 0.30, 0.27)
		# Fish / Harbor biome (M3j) — cool sea blues/greens. PNGs ship for the five
		# catchable tiles (res://assets/tiles/tile_fish_*.png); these flat fallbacks
		# only render if a texture is missing. The giant pearl is a pearlescent white.
		Tile.FISH_SARDINE:  return Color(0.55, 0.66, 0.74)
		Tile.FISH_MACKEREL: return Color(0.36, 0.52, 0.62)
		Tile.FISH_CLAM:     return Color(0.78, 0.72, 0.62)
		Tile.FISH_OYSTER:   return Color(0.62, 0.60, 0.56)
		Tile.FISH_KELP:     return Color(0.24, 0.46, 0.36)
		Tile.FISH_PEARL:    return Color(0.94, 0.93, 0.97)
		# ── Full tile-catalog parity. Stage-1 fallback fills (the v1 PNGs ship for all of
		# these, so these flat colors only render if a texture is missing). Hex values lifted
		# from the web ITEMS `look.color` (src/constants.ts), converted to 0..1 RGB.
		Tile.GRASS_MEADOW:       return Color8(0x7f, 0xb2, 0x4a)
		Tile.GRASS_SPIKY:        return Color8(0x9b, 0xb5, 0x5a)
		Tile.GRASS_HEATHER:      return Color8(0x7a, 0x4f, 0x8a)
		Tile.GRAIN_CORN:         return Color8(0xf4, 0xc8, 0x4a)
		Tile.GRAIN_BUCKWHEAT:    return Color8(0x9a, 0xb5, 0x48)
		Tile.GRAIN_MANNA:        return Color8(0xf8, 0xe8, 0xc0)
		Tile.GRAIN_RICE:         return Color8(0xc8, 0xd8, 0x78)
		Tile.VEG_EGGPLANT:       return Color8(0x6b, 0x3a, 0x8a)
		Tile.VEG_TURNIP:         return Color8(0xd8, 0x7a, 0xa0)
		Tile.VEG_BEET:           return Color8(0x6b, 0x1a, 0x3a)
		Tile.VEG_CUCUMBER:       return Color8(0x4f, 0x8c, 0x3a)
		Tile.VEG_SQUASH:         return Color8(0xe6, 0xc1, 0x4a)
		Tile.VEG_MUSHROOM:       return Color8(0xc6, 0x3a, 0x3a)
		Tile.VEG_PEPPER:         return Color8(0xd8, 0x3a, 0x3a)
		Tile.VEG_BROCCOLI:       return Color8(0x4a, 0x8a, 0x3a)
		Tile.FRUIT_PEAR:         return Color8(0xbc, 0xc4, 0x36)
		Tile.FRUIT_GOLDEN_APPLE: return Color8(0xf4, 0xc4, 0x30)
		Tile.FRUIT_BLACKBERRY:   return Color8(0x3a, 0x1a, 0x4a)
		Tile.FRUIT_RAMBUTAN:     return Color8(0xd8, 0x34, 0x4a)
		Tile.FRUIT_STARFRUIT:    return Color8(0xe8, 0xc8, 0x3c)
		Tile.FRUIT_COCONUT:      return Color8(0x5e, 0x3a, 0x14)
		Tile.FRUIT_LEMON:        return Color8(0xf4, 0xd0, 0x30)
		Tile.FRUIT_JACKFRUIT:    return Color8(0xa8, 0xa0, 0x40)
		Tile.FLOWER_WATER_LILY:  return Color8(0xe8, 0x90, 0xc0)
		Tile.TREE_BIRCH:         return Color8(0xa8, 0xc0, 0x38)
		Tile.TREE_WILLOW:        return Color8(0x5a, 0x8a, 0x18)
		Tile.TREE_FIR:           return Color8(0x2a, 0x50, 0x08)
		Tile.TREE_CYPRESS:       return Color8(0x1a, 0x3a, 0x08)
		Tile.TREE_PALM:          return Color8(0x5a, 0x8a, 0x18)
		Tile.BIRD_TURKEY:        return Color8(0xb8, 0x74, 0x3a)
		Tile.BIRD_CLOVER:        return Color8(0x6f, 0xa4, 0x50)
		Tile.BIRD_MELON:         return Color8(0xb3, 0xd7, 0x70)
		Tile.BIRD_CHICKEN:       return Color8(0xf0, 0xd8, 0xa0)
		Tile.BIRD_HEN:           return Color8(0xa8, 0x68, 0x38)
		Tile.BIRD_ROOSTER:       return Color8(0xd8, 0x18, 0x18)
		Tile.BIRD_WILD_GOOSE:    return Color8(0xa8, 0x98, 0x78)
		Tile.BIRD_GOOSE:         return Color8(0xff, 0xfc, 0xe8)
		Tile.BIRD_PARROT:        return Color8(0xd8, 0x18, 0x18)
		Tile.BIRD_PHOENIX:       return Color8(0xf8, 0xa0, 0x20)
		Tile.BIRD_DODO:          return Color8(0xa8, 0x98, 0x78)
		Tile.BIRD_PIG_IN_DISGUISE: return Color8(0xe8, 0x8a, 0x98)
		Tile.HERD_HOG:           return Color8(0xa8, 0x78, 0x38)
		Tile.HERD_BOAR:          return Color8(0x24, 0x14, 0x08)
		Tile.HERD_WARTHOG:       return Color8(0x5a, 0x48, 0x28)
		Tile.HERD_SHEEP:         return Color8(0xff, 0xfc, 0xe8)
		Tile.HERD_ALPACA:        return Color8(0xf8, 0xe8, 0xc8)
		Tile.HERD_GOAT:          return Color8(0xd8, 0xc0, 0x98)
		Tile.HERD_RAM:           return Color8(0xa8, 0x78, 0x38)
		Tile.CATTLE_LONGHORN:    return Color8(0xd8, 0x90, 0x48)
		Tile.CATTLE_TRICERATOPS: return Color8(0x5a, 0x8a, 0x28)
		Tile.MOUNT_DONKEY:       return Color8(0x8a, 0x84, 0x78)
		Tile.MOUNT_MOOSE:        return Color8(0x5a, 0x38, 0x14)
		Tile.MOUNT_MAMMOTH:      return Color8(0xa8, 0x78, 0x38)
		Tile.COPPER_ORE:         return Color8(0xc9, 0x7f, 0x4f)
		Tile.GOLD:               return Color8(0xff, 0xd3, 0x4c)
		Tile.COIN_GOLDEN:        return Color8(0xff, 0xd3, 0x4c)
		# Fire farm hazard (T7) — a hot orange-red flame fill. No PNG ships; flat fallback.
		Tile.FIRE:               return Color8(0xe2, 0x5a, 0x1e)
		# Mine hazards (T11) — flat fallback fills (no PNGs ship). LAVA a molten red-orange,
		# GAS a sickly noxious green, MYSTERIOUS_ORE a glowing violet that reads as "special".
		Tile.LAVA:               return Color8(0xd8, 0x3a, 0x12)
		Tile.GAS:                return Color8(0x86, 0xb8, 0x4a)
		Tile.MYSTERIOUS_ORE:     return Color8(0x9a, 0x5c, 0xd6)
		_:             return Color.MAGENTA
