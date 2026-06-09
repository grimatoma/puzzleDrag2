class_name AchievementConfig
extends RefCounted
## Achievement CATALOG (M10 logic core) — the ported, port-reachable subset of the
## Phaser achievements (src/features/achievements/data.ts). Pure data + pure
## helpers; the counter-bump / unlock / reward logic lives in GameState
## (bump_counter) wired into the existing event sites (credit_chain / fill_order /
## build / damage_boss). NO UI — this is a headless-testable data layer mirroring
## BuildingConfig / BossConfig / ToolConfig.
##
## PORTING NOTES (what we KEPT, REMAPPED, and OMITTED vs React data.ts)
##   The Godot port is the farm + mine + one-boss slice. An achievement is only
##   included if the EVENT that drives its counter can actually fire in the port —
##   no fakes, no unreachable trophies. Every omission is listed at the bottom.
##
##   COUNTERS we wire (and where they bump in GameState):
##     chains_committed            credit_chain  (every resolved chain → +1)
##     orders_fulfilled           fill_order    (every successful fill → +1)
##     bosses_defeated            damage_boss   (only on a DEFEAT → +1)
##     distinct_buildings_built   build         (distinct id → +1, first time only)
##     distinct_resources_chained credit_chain  (distinct produced resource → +1)
##     <category>_chained         credit_chain  (Constants.category_of(tile) → +chain_len)
##     mine_chained               credit_chain  (stone/iron/coal/gold/gem categories → +chain_len)
##
##   PER-COUNTER BUMP SEMANTICS (matches React data.ts intent):
##     - "complete N chains"  → counts CHAINS, bump by 1   (chains_committed)
##     - "fill N orders"      → counts ORDERS, bump by 1   (orders_fulfilled)
##     - "defeat N bosses"    → counts BOSSES, bump by 1   (bosses_defeated)
##     - distinct counters    → bump by 1, ONLY on a newly-seen key (handled in GameState)
##     - "harvest N <things>" → counts TILES, bump by chain_len  (every <category>_chained
##       + mine_chained — React "Harvest 50 fish / Pull 50 stone" count tiles, so the
##       Godot category/quantity counters bump by the chain length, not by 1).
##
##   REWARD REMAP (no fake tools). React grants `magic_wand` / `magic_seed`, which do
##   NOT exist in the Godot ToolConfig set (bomb/rake/sickle/auger/blast_charge/axe/
##   scythe/stone_hammer/drill/magnet). Rather than invent a tool, the two React
##   tool-reward tiers grant a REAL port tool — the Bomb — via the M8b grant_tool path.
##   Coin rewards are carried over verbatim.
##
##   OMITTED as UNREACHABLE in the port (no event can complete them):
##     - champion (defeat 4 bosses): the port has ONE boss (Frostmaw). bosses_defeated
##       tops out at 1, so a threshold-4 trophy would never complete → omitted.
##     - supply_chain (convert 10 grain → supplies): there is no "supplies_converted"
##       event site — supplies are produced by the Kitchen RecipeConfig output, not a
##       distinct counter the port tracks → omitted.
##     - powerful_keep / ability_artisan (building/ability triggers): the port has no
##       unified abilities pipeline / ability-trigger event → omitted.
##
##   RE-ADDED (the older "omitted" reasons were STALE — these ARE reachable in the port):
##     - first_catch / tide_runner / master_angler (fish_chained): the port HAS a working
##       harbor / fish biome; fish_chained bumps at credit_chain via counter_for_category.
##       master_angler grants magic_wand (a real ToolConfig member, summonable elsewhere).
##     - fowler (bird_chained): the port has a "birds" category (pheasant/turkey/…);
##       bird_chained bumps at credit_chain.

# ── Reward tool used for the two ex-magic-wand/magic-seed tiers ────────────────
## The real port tool granted where React granted magic_wand / magic_seed (which
## don't exist here). Bomb is a known ToolConfig id, so grant_tool accepts it.
const REWARD_TOOL: String = "bomb"

## The ported, port-reachable achievement catalog. Each entry:
##   id:        String     — stable id (matches React where the achievement survives)
##   name:      String     — display name
##   desc:      String     — one-line player-facing description
##   counter:   String     — the GameState counter that drives it
##   threshold: int        — counter value at which it unlocks (crossing, not >=-poll)
##   reward:    Dictionary — {"coins": N} or {"tools": {id: n}} granted ON unlock
const ACHIEVEMENTS: Array = [
	# ── chains_committed (every credit_chain → +1) ─────────────────────────────
	{"id": "first_steps",   "name": "First Steps",   "desc": "Complete your first chain",            "counter": "chains_committed",           "threshold": 1,   "reward": {"coins": 25}},
	{"id": "patient_hands", "name": "Patient Hands", "desc": "Complete 10 chains",                   "counter": "chains_committed",           "threshold": 10,  "reward": {"coins": 50}},
	{"id": "tireless",      "name": "Tireless",      "desc": "Complete 100 chains",                  "counter": "chains_committed",           "threshold": 100, "reward": {"coins": 100}},

	# ── orders_fulfilled (every successful fill_order → +1) ─────────────────────
	{"id": "trusted_friend", "name": "Trusted Friend", "desc": "Fill 5 villager orders",            "counter": "orders_fulfilled",           "threshold": 5,   "reward": {"coins": 50}},
	{"id": "village_voice",  "name": "Village Voice",  "desc": "Fill 25 villager orders",           "counter": "orders_fulfilled",           "threshold": 25,  "reward": {"coins": 150}},

	# ── bosses_defeated (a damage_boss that DEFEATS → +1) ──────────────────────
	{"id": "first_blood",   "name": "First Blood",   "desc": "Defeat your first seasonal boss",      "counter": "bosses_defeated",            "threshold": 1,   "reward": {"coins": 200}},

	# ── distinct_resources_chained (distinct produced resource → +1) ───────────
	{"id": "naturalist",    "name": "Naturalist",    "desc": "Chain 8 different resource types",      "counter": "distinct_resources_chained", "threshold": 8,   "reward": {"coins": 75}},
	{"id": "polymath",      "name": "Polymath",      "desc": "Chain 15 different resource types",     "counter": "distinct_resources_chained", "threshold": 15,  "reward": {"tools": {REWARD_TOOL: 1}}},

	# ── distinct_buildings_built (distinct id via build → +1) ───────────────────
	{"id": "town_planner",  "name": "Town Planner",  "desc": "Construct 5 different buildings",       "counter": "distinct_buildings_built",   "threshold": 5,   "reward": {"coins": 100}},

	# ── mine_chained (sum of stone/iron/coal/gold/gem categories → +chain_len) ──
	{"id": "first_strike",  "name": "First Strike",  "desc": "Quarry your first mine chain",          "counter": "mine_chained",               "threshold": 1,   "reward": {"coins": 25}},
	{"id": "deep_digger",   "name": "Deep Digger",   "desc": "Pull 50 stone / ore / coal / gems",     "counter": "mine_chained",               "threshold": 50,  "reward": {"coins": 75}},
	{"id": "mine_master",   "name": "Mine Master",   "desc": "Haul 200 mine resources",               "counter": "mine_chained",               "threshold": 200, "reward": {"tools": {REWARD_TOOL: 1}}},

	# ── Per-category harvest milestones (Constants.category_of → +chain_len) ────
	{"id": "veg_patron",    "name": "Vegetable Patron", "desc": "Harvest 50 vegetables of any kind", "counter": "veg_chained",                "threshold": 50,  "reward": {"coins": 75}},
	{"id": "orchard_friend","name": "Orchard Hand",     "desc": "Pick 50 fruits",                    "counter": "fruit_chained",              "threshold": 50,  "reward": {"coins": 75}},
	{"id": "pollinator",    "name": "Pollinator",       "desc": "Cut 30 flowers from the meadows",   "counter": "flower_chained",             "threshold": 30,  "reward": {"coins": 60}},
	{"id": "herder",        "name": "Herder",           "desc": "Drive 30 herd animals",             "counter": "herd_chained",               "threshold": 30,  "reward": {"coins": 60}},
	{"id": "dairyman",      "name": "Dairyman",         "desc": "Drive 30 cattle into the shed",     "counter": "cattle_chained",             "threshold": 30,  "reward": {"coins": 60}},
	{"id": "stable_hand",   "name": "Stable Hand",      "desc": "Lead 30 mounts through the stables", "counter": "mount_chained",             "threshold": 30,  "reward": {"coins": 60}},
	{"id": "forester",      "name": "Forester",         "desc": "Fell 50 trees",                     "counter": "tree_chained",               "threshold": 50,  "reward": {"coins": 75}},

	# ── fish_chained (harbor fish chains → +chain_len) — the port HAS a working harbor ─
	{"id": "first_catch",   "name": "First Catch",      "desc": "Land your first fish chain at the harbor", "counter": "fish_chained",        "threshold": 1,   "reward": {"coins": 25}},
	{"id": "tide_runner",   "name": "Tide Runner",      "desc": "Harvest 50 fish across the harbor", "counter": "fish_chained",               "threshold": 50,  "reward": {"coins": 75}},
	{"id": "master_angler", "name": "Master Angler",    "desc": "Haul in 200 fish across the harbor","counter": "fish_chained",               "threshold": 200, "reward": {"tools": {"magic_wand": 1}}},

	# ── bird_chained (bird-yard chains → +chain_len) — the port HAS birds (pheasant…) ──
	{"id": "fowler",        "name": "Fowler",           "desc": "Gather 50 birds across the yards",  "counter": "bird_chained",               "threshold": 50,  "reward": {"coins": 75}},
]

# ── Static helpers (usable without an instance) ──────────────────────────────

## Every achievement entry in stable catalog order (a defensive copy).
static func all() -> Array:
	return ACHIEVEMENTS.duplicate(true)

## Every achievement whose `counter` matches `counter`, in catalog order (a
## defensive copy of each row). Empty Array for a counter nothing uses.
static func for_counter(counter: String) -> Array:
	var out: Array = []
	for a in ACHIEVEMENTS:
		if String(a.get("counter", "")) == counter:
			out.append((a as Dictionary).duplicate(true))
	return out

## The full achievement entry for `id`, or an empty Dictionary for unknown ids.
static func get_achievement(id: String) -> Dictionary:
	for a in ACHIEVEMENTS:
		if String(a.get("id", "")) == id:
			return (a as Dictionary).duplicate(true)
	return {}

## True when `id` names a real achievement.
static func has_achievement(id: String) -> bool:
	for a in ACHIEVEMENTS:
		if String(a.get("id", "")) == id:
			return true
	return false

## Map a Constants tile CATEGORY id to the counter it bumps at credit_chain, or "" if
## the category drives no achievement counter. The five mine categories all collapse
## onto the single "mine_chained" counter (React groups stone/ore/coal/gem); the farm
## category counters are "<category>_chained". Staples (grass/grain), birds, and the
## hazard categories (rat/rubble) drive no counter → "".
static func counter_for_category(category: String) -> String:
	match category:
		"trees":
			return "tree_chained"
		"veg":
			return "veg_chained"
		"fruit":
			return "fruit_chained"
		"flower":
			return "flower_chained"
		"herd":
			return "herd_chained"
		"cattle":
			return "cattle_chained"
		"mount":
			return "mount_chained"
		"stone", "iron", "coal", "gold", "gem":
			# The five mine categories sum into one "mine_chained" counter.
			return "mine_chained"
		"fish":
			# The five harbor fish categories sum into one "fish_chained" counter
			# (the port has a working harbor — first_catch/tide_runner/master_angler).
			return "fish_chained"
		"birds":
			# Bird-yard chains feed the "bird_chained" counter (fowler). Note Clover/Melon
			# are re-filed to flower/fruit, so only true birds (pheasant/turkey/…) count.
			return "bird_chained"
		_:
			return ""
