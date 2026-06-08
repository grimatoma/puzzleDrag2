class_name BossConfig
extends RefCounted
## Capstone boss catalog — the Direction spec's dramatic close of Town 2. Frostmaw,
## the frost-wyrm at the mine's heart, is "the gate that proves you have mastered
## farm + mine before the slice opens up": an active boss RAISES the board's minimum
## chain length (boss.min_chain) and is defeated by landing chains against its HP.
## Beating it marks Town 2 complete (town2_complete), which a later milestone uses to
## unlock Town 3.
##
## Direction spec — "capstone boss" (Town 2 close):
##   Boss      HP   Min chain   Reward   Notes
##   Frostmaw  40   4           500c     frost-wyrm gate; demands chains of 4+
##
## Values are FIRST-PASS / tunable — chosen so a City-tier, mine-mastered player can
## grind the wyrm down over a handful of stiff chains. Edit BOSSES to retune.
##
## Registered as a `class_name` global (like Constants / BuildingConfig) so its
## consts and helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists.

# ── Boss ids ──────────────────────────────────────────────────────────────────
const FROSTMAW: String = "frostmaw"

## Boss catalog keyed by id. Each entry:
##   name:         String — display name
##   hp:           int    — starting / max HP (damaged by chain length)
##   min_chain:    int    — minimum chain length the board demands while this boss
##                          is active (>= Constants.MIN_CHAIN)
##   reward_coins: int    — coins granted on defeat
##   desc:         String — one-line player-facing description
const BOSSES: Dictionary = {
	FROSTMAW: {
		"name": "Frostmaw",
		"hp": 40,
		"min_chain": 4,
		"reward_coins": 500,
		"desc": "The frost-wyrm at the mine's heart — chain hard to break it. Demands chains of 4+.",
	},
}

## Stable display / iteration order for every boss id.
const BOSS_IDS: Array = [FROSTMAW]

# ── Static helpers (usable without an instance) ──────────────────────────────

## True when `id` names a real boss.
static func is_boss(id: String) -> bool:
	return BOSSES.has(id)

static func boss_name(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("name", ""))

## Starting / max HP of `id` (0 for unknown ids).
static func boss_hp(id: String) -> int:
	if not is_boss(id):
		return 0
	return int(BOSSES[id].get("hp", 0))

## Minimum chain length `id` demands while active. Falls back to the base
## Constants.MIN_CHAIN for unknown ids so a stale id never DROPS the bar.
static func boss_min_chain(id: String) -> int:
	if not is_boss(id):
		return Constants.MIN_CHAIN
	return int(BOSSES[id].get("min_chain", Constants.MIN_CHAIN))

## Coins granted on defeating `id` (0 for unknown ids).
static func boss_reward(id: String) -> int:
	if not is_boss(id):
		return 0
	return int(BOSSES[id].get("reward_coins", 0))

static func boss_desc(id: String) -> String:
	if not is_boss(id):
		return ""
	return String(BOSSES[id].get("desc", ""))
