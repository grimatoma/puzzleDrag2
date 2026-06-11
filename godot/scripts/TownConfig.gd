class_name TownConfig
extends RefCounted
## Town-1 (Farm) tier ladder — the Camp→City rank progression every town climbs.
## Mirrors the locked "Direction" spec table: a single town-center upgrade that
## costs escalating local resources and (a) raises a storage cap, (b) adds
## building plots, (c) unlocks the next batch of buildings (description-only for
## now — the actual building system lands in a later milestone).
##
## Direction spec table (authoritative):
##   Tier  Name     Cap  Plots  Unlocks
##   1     Camp     200  25     Farm board (staple tiles), Orders, the Market
##   2     Hamlet   300  27     Lumber Camp (trees → plank), Granary, first Worker
##   3     Village  400  29     Coop (birds → eggs), Garden (veg → soup), Mill & Bakery
##   4     Town     500  31     Workshop + farm tools, more workers, Caravan Post
##   5     City     600  33     Top farm buildings; the expedition → Town 2
##
## PLOTS (2026-06-10, owner directive): the first town starts ROOMY — 25 plots at Camp
## (it should hold ~25 buildings from the start), each tier adding +2. This deliberately
## diverges from the old cramped 3/5/7/9/11 ladder (and from React); the village map's
## growth stage scales with plot_count (VillageLayout.stage_for_plot_count), so the
## town simply renders denser.
##
## Tier-up COSTS are PC2-aligned FIRST-PASS values — escalating and pulling in
## cross-category goods, all expressed in resources the port can already produce
## (Farm tiles), so the ladder is playable today. They are tunable: edit TIERS.
##
## GATING RATIONALE (M3b). Once the board refill pool is building-gated, a tier-up
## cost may only reference resources producible AT or BELOW the prior tier — any
## category tile requires its spawner, and a spawner only unlocks AT a tier. The
## M3a costs deadlocked here: reaching Hamlet needed `plank`, but plank needs the
## Lumber Camp, which only unlocks AT Hamlet. The revised ladder breaks the cycle:
##   → Hamlet  : staples only (hay_bundle + flour)            — payable at Camp
##   → Village : adds plank (Lumber Camp unlocked at Hamlet)
##   → Town    : adds eggs + soup (Coop + Garden at Village)
##   → City    : more of the same
##
## Registered as a `class_name` global (like Constants) so its consts/helpers are
## reachable WITHOUT a live autoload — headless tests run before the scene tree.

# ── Tier ids ────────────────────────────────────────────────────────────────
const TIER_CAMP: int = 1
const TIER_HAMLET: int = 2
const TIER_VILLAGE: int = 3
const TIER_TOWN: int = 4
const TIER_CITY: int = 5
const MAX_TIER: int = 5

## Tier data indexed by tier int. Index 0 is an empty sentinel so `TIERS[t]`
## reads directly for a valid tier `t` in [1, MAX_TIER]. Each entry:
##   name:    String  — display name
##   cap:     int     — per-resource storage cap at this tier
##   plots:   int     — building plots available at this tier
##   unlocks: String  — description of what reaching this tier unlocks
##   cost:    Dictionary — resources to pay to REACH this tier (Camp's is {})
const TIERS: Array = [
	{},  # index 0 — unused sentinel
	{
		"name": "Camp",
		"cap": 200,
		"plots": 25,
		"unlocks": "Farm board (staple tiles), Orders, the Market",
		"cost": {},
	},
	{
		"name": "Hamlet",
		"cap": 300,
		"plots": 27,
		"unlocks": "Lumber Camp (trees → plank), Granary, first Worker",
		"cost": {"hay_bundle": 12, "flour": 6},
	},
	{
		"name": "Village",
		"cap": 400,
		"plots": 29,
		"unlocks": "Coop (birds → eggs), Garden (veg → soup), Mill & Bakery",
		"cost": {"plank": 8, "hay_bundle": 16, "flour": 8},
	},
	{
		"name": "Town",
		"cap": 500,
		"plots": 31,
		"unlocks": "Workshop + farm tools, more workers, Caravan Post",
		"cost": {"eggs": 8, "soup": 6, "plank": 10},
	},
	{
		"name": "City",
		"cap": 600,
		"plots": 33,
		"unlocks": "Top farm buildings; the expedition → Town 2",
		"cost": {"soup": 10, "eggs": 12, "plank": 14},
	},
]

# ── Static helpers (usable without an instance) ─────────────────────────────

## True when `t` names a real tier in [1, MAX_TIER].
static func _is_valid_tier(t: int) -> bool:
	return t >= TIER_CAMP and t <= MAX_TIER

## Clamp an arbitrary int into the valid tier range [1, MAX_TIER].
static func clamp_tier(t: int) -> int:
	return clampi(t, TIER_CAMP, MAX_TIER)

static func tier_name(t: int) -> String:
	if not _is_valid_tier(t):
		return ""
	return String(TIERS[t].get("name", ""))

static func tier_cap(t: int) -> int:
	if not _is_valid_tier(t):
		return 0
	return int(TIERS[t].get("cap", 0))

static func tier_plots(t: int) -> int:
	if not _is_valid_tier(t):
		return 0
	return int(TIERS[t].get("plots", 0))

static func tier_unlocks(t: int) -> String:
	if not _is_valid_tier(t):
		return ""
	return String(TIERS[t].get("unlocks", ""))

## Resources required to REACH `target_tier` from the previous tier. Returns an
## empty Dictionary for tier 1 (Camp — the starting tier) or any out-of-range
## tier (a copy, so callers can't mutate the const).
static func tier_up_cost(target_tier: int) -> Dictionary:
	if not _is_valid_tier(target_tier):
		return {}
	var cost: Dictionary = TIERS[target_tier].get("cost", {})
	return cost.duplicate()

static func is_max_tier(t: int) -> bool:
	return t >= MAX_TIER
