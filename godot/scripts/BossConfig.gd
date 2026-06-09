class_name BossConfig
extends RefCounted
## Seasonal-boss catalog — the GDScript port of src/features/bosses/data.ts. The boss is no
## longer a single HP-attrition Frostmaw fight; it is a TIMED RESOURCE-TARGET challenge: each
## of the SIX bosses asks for a target quantity of a specific resource/tile within a fixed
## window (BOSS_WINDOW_TURNS turns), under a board MODIFIER that complicates the gather. Beat
## the target before the window expires to win the reward (coins scaled by the year + the
## overshoot margin, plus a Rune). The CAPSTONE boss (storm) still gates Town 2: defeating it
## marks town2_complete, which a later milestone consumes to unlock Town 3.
##
## CATALOG (carried VERBATIM from data.ts BOSSES — ids / names / seasons / targets / modifiers /
## descriptions):
##   id            season  target                       modifier
##   frostmaw      winter  tile_tree_oak ×30            freeze_columns {n:2}
##   quagmire      spring  tile_grass_grass ×50         respawn_boost {boost:[oak,grass], factor:1.5}
##   ember_drake   summer  iron_bar ×3                  heat_tiles {spawnPerTurn:1, burnAfter:2}
##   old_stoneface autumn  tile_mine_stone ×20          rubble_blocks {count:4}
##   mossback      spring  tile_fruit_blackberry ×30    hide_resources {hidden:4}
##   storm         summer  fish_fillet ×6               min_chain {length:4}
##
## REWARD (bossReward, data.ts:88-96): defeated when progress >= target; on a win
##   base    = 200 * year
##   margin  = min(1.0, (progress - target) / target)
##   bonus   = floor(base * margin * 0.5)
##   coins   = base + bonus ; runes = 1
## A loss (window expired before the target) yields nothing.
##
## WINDOW: BOSS_WINDOW_TURNS = 10 (one season — data.ts:98). Each boss turn decrements the
## remaining window; resolve when the target is met OR the window expires.
##
## CAPSTONE: `storm` is the capstone (the dramatic Town-2 close). The whole 6-boss rotation is
## reachable (the challenge spawns the CURRENT farm-season's boss; see GameState.start_boss),
## and defeating the capstone sets town2_complete (preserving the old M3g progression gate).
##
## Registered as a `class_name` global so its consts + static helpers are reachable WITHOUT a
## live autoload — headless tests run before the scene tree exists. Stateless: never instantiated.

# ── Boss ids ──────────────────────────────────────────────────────────────────
const FROSTMAW: String = "frostmaw"
const QUAGMIRE: String = "quagmire"
const EMBER_DRAKE: String = "ember_drake"
const OLD_STONEFACE: String = "old_stoneface"
const MOSSBACK: String = "mossback"
const STORM: String = "storm"

## The capstone boss id — defeating it sets town2_complete (the Town-2 → Town-3 gate). Kept as a
## named const so the gate reads `id == BossConfig.CAPSTONE` rather than a bare literal.
const CAPSTONE: String = STORM

## How many turns a boss challenge runs (one season). Ported from BOSS_WINDOW_TURNS (data.ts:98).
const BOSS_WINDOW_TURNS: int = 10

## Boss catalog keyed by id. Each entry:
##   name:                 String     — display name
##   season:               String     — the farm season this boss belongs to ("winter"/"spring"/…)
##   target:               Dictionary — { "resource": String, "amount": int }
##   modifier:             Dictionary — { "type": String, "params": Dictionary }
##   desc:                 String     — flavour description
##   modifier_desc:        String     — player-facing modifier explanation
const BOSSES: Dictionary = {
	FROSTMAW: {
		"name": "Frostmaw",
		"season": "winter",
		"target": {"resource": "tile_tree_oak", "amount": 30},
		"modifier": {"type": "freeze_columns", "params": {"n": 2}},
		"desc": "A frozen titan stirs in the deep winter wood, its icy breath threatening to snuff out every hearth in the vale. Gather logs quickly before the cold claims the village.",
		"modifier_desc": "Two columns on the board are frozen solid and cannot be chained until thawed.",
	},
	QUAGMIRE: {
		"name": "Quagmire",
		"season": "spring",
		"target": {"resource": "tile_grass_grass", "amount": 50},
		"modifier": {"type": "respawn_boost", "params": {"boost": ["tile_tree_oak", "tile_grass_grass"], "factor": 1.5}},
		"desc": "A boggy creature has swallowed the lower fields, turning fertile soil to mud. Only a bountiful hay harvest can drain its hold on the spring meadows.",
		"modifier_desc": "Log and hay tiles respawn at 1.5× their normal rate, flooding the board with resources.",
	},
	EMBER_DRAKE: {
		"name": "Ember Drake",
		"season": "summer",
		"target": {"resource": "iron_bar", "amount": 3},
		"modifier": {"type": "heat_tiles", "params": {"spawnPerTurn": 1, "burnAfter": 2}},
		"desc": "Scales of cinder and breath of smelting flame — the Ember Drake demands a tribute of forged iron before the summer heat destroys your crops. Prove your craft at the forge.",
		"modifier_desc": "One heat tile spawns each turn; any resource left on a heat tile for 2 turns is burned away.",
	},
	OLD_STONEFACE: {
		"name": "Old Stoneface",
		"season": "autumn",
		"target": {"resource": "tile_mine_stone", "amount": 20},
		"modifier": {"type": "rubble_blocks", "params": {"count": 4}},
		"desc": "An ancient golem has sealed the mountain pass with its bulk, blocking the autumn trade caravans. Quarry enough stone to prove your worth and earn passage through.",
		"modifier_desc": "Four rubble tiles block random board positions; they cannot be chained and must be cleared by adjacent stone chains.",
	},
	MOSSBACK: {
		"name": "Mossback",
		"season": "spring",
		"target": {"resource": "tile_fruit_blackberry", "amount": 30},
		"modifier": {"type": "hide_resources", "params": {"hidden": 4}},
		"desc": "A mossy titan lurks in the spring glades, concealing its weakness beneath layers of overgrowth. Harvest enough blackberries to expose it and drive it from the vale.",
		"modifier_desc": "Four resource tiles are hidden face-down on the board and only reveal themselves when included in a chain.",
	},
	STORM: {
		"name": "The Storm",
		"season": "summer",
		"target": {"resource": "fish_fillet", "amount": 6},
		"modifier": {"type": "min_chain", "params": {"length": 4}},
		"desc": "A black squall rolls in over Saltspray Harbor — every short cast tears free of the line. Only steady, deliberate pulls bring fillets through the chop.",
		"modifier_desc": "Chains of fewer than 4 fish tiles slip the line: they consume a turn but yield nothing.",
	},
}

## Stable display / iteration order for every boss id (matches data.ts BOSSES order).
const BOSS_IDS: Array = [FROSTMAW, QUAGMIRE, EMBER_DRAKE, OLD_STONEFACE, MOSSBACK, STORM]

# ── Static helpers (usable without an instance) ──────────────────────────────

## True when `id` names a real boss.
static func is_boss(id: String) -> bool:
	return BOSSES.has(id)

static func boss_name(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("name", ""))

## The farm season this boss belongs to ("winter"/"spring"/"summer"/"autumn"). "" for unknown.
static func boss_season(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("season", ""))

## The boss `id` for a given farm-season name, or "" when no boss belongs to that season. When two
## bosses share a season (quagmire/mossback in spring; ember_drake/storm in summer) the FIRST in
## BOSS_IDS order is returned — `season_roster` exposes the full per-season list.
static func boss_for_season(season: String) -> String:
	for id in BOSS_IDS:
		if boss_season(id) == season:
			return id
	return ""

## Every boss id belonging to `season`, in BOSS_IDS order (spring → [quagmire, mossback];
## summer → [ember_drake, storm]; winter → [frostmaw]; autumn → [old_stoneface]).
static func season_roster(season: String) -> Array:
	var out: Array = []
	for id in BOSS_IDS:
		if boss_season(id) == season:
			out.append(id)
	return out

## The target { "resource": String, "amount": int } for `id` (a COPY), or {} for an unknown id.
static func boss_target(id: String) -> Dictionary:
	if not is_boss(id):
		return {}
	return (BOSSES[id].get("target", {}) as Dictionary).duplicate(true)

## The target RESOURCE/TILE key for `id` ("" for unknown). May be a TILE key (tile_tree_oak,
## tile_grass_grass, tile_mine_stone, tile_fruit_blackberry) or a RESOURCE key (iron_bar,
## fish_fillet) — see GameState boss progress counting.
static func target_resource(id: String) -> String:
	return String(boss_target(id).get("resource", ""))

## The target AMOUNT for `id` (0 for unknown).
static func target_amount(id: String) -> int:
	return int(boss_target(id).get("amount", 0))

## The modifier { "type": String, "params": Dictionary } for `id` (a COPY), or {} for unknown.
static func boss_modifier(id: String) -> Dictionary:
	if not is_boss(id):
		return {}
	return (BOSSES[id].get("modifier", {}) as Dictionary).duplicate(true)

## The modifier TYPE string for `id` ("" for unknown).
static func modifier_type(id: String) -> String:
	return String(boss_modifier(id).get("type", ""))

static func boss_desc(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("desc", ""))

static func modifier_desc(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("modifier_desc", ""))

## The board minimum-chain length this boss demands while active (Constants.MIN_CHAIN unless the
## boss carries a min_chain modifier — storm raises it to 4). Falls back to Constants.MIN_CHAIN for
## any unknown id so a stale id never DROPS the bar (mirrors the old boss_min_chain contract).
static func boss_min_chain(id: String) -> int:
	if not is_boss(id):
		return Constants.MIN_CHAIN
	var mod: Dictionary = boss_modifier(id)
	if String(mod.get("type", "")) == BossModifierLogic.MIN_CHAIN:
		return int((mod.get("params", {}) as Dictionary).get("length", Constants.MIN_CHAIN))
	return Constants.MIN_CHAIN

## REWARD on resolution — the GDScript port of bossReward (data.ts:88-96). `progress` is the units
## gathered in the window; `year` is the run year (>=1). Returns { coins, runes, defeated }:
##   defeated = progress >= target_amount
##   on a LOSS  → { coins:0, runes:0, defeated:false }
##   on a WIN   → base = 200*year ; margin = min(1, (progress-target)/target) ;
##                bonus = floor(base*margin*0.5) ; { coins: base+bonus, runes:1, defeated:true }
static func boss_reward(id: String, progress: int, year: int) -> Dictionary:
	var target: int = target_amount(id)
	var defeated: bool = target > 0 and progress >= target
	if not defeated:
		return {"coins": 0, "runes": 0, "defeated": false}
	var base_reward: int = 200 * year
	var margin: float = minf(1.0, float(progress - target) / float(target))
	var bonus: int = int(floor(float(base_reward) * margin * 0.5))
	return {"coins": base_reward + bonus, "runes": 1, "defeated": true}
