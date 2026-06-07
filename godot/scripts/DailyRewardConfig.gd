class_name DailyRewardConfig
extends RefCounted
## The daily login-streak reward LADDER, ported from the React daily-rewards table
## (src/constants.ts DAILY_REWARDS — GAME_SPEC §16, locked). Pure data + the single
## pure helper reward_for_day(day) that applies the React `{ coins: 25 }` default for
## any day NOT listed in the table. The MUTABLE streak state (last-claimed date +
## current streak day) + the grant flow live on GameState (login_tick); this is the
## headless-testable catalog half, mirroring AlmanacConfig / CharterConfig (a
## `class_name` global, no autoload). Stateless.
##
## ── REWARD REMAP — port-reachable grants only (no fake tools / no fake tile) ──────
## React rewards grant `coins`, `runes`, a `tool` (+`amount`), and on day 30 an
## `unlockTile`. The port grants coins + runes DIRECTLY. Two faithfulness deviations,
## both forced by what the port can actually apply:
##
##   1. TOOL-ID REMAP. The React tool ids basic / rare / shuffle DO NOT exist in the
##      port's ToolConfig set (bomb/rake/sickle/auger/blast_charge/axe/scythe/
##      stone_hammer/drill/magnet). Each is REMAPPED onto the SAME real port tool the
##      Almanac/Achievement ports already chose, for consistency:
##          basic   (day 3)  → ToolConfig.SCYTHE ("scythe")  — the real port harvest tool
##          rare    (day 5)  → ToolConfig.BOMB   ("bomb")    — a generic granted reward tool
##          shuffle (day 7)  → ToolConfig.RAKE   ("rake")    — a real port board tool
##      Every tool id below is a real ToolConfig member, so GameState.grant_tool accepts it.
##
##   2. DAY-30 unlockTile DROPPED. React day 30 also unlocks tile "tile_cattle_triceratops",
##      which has NO port tile (the port's cattle category is `tile_cattle_cow` only — there
##      is no triceratops tile in TileCollection / Constants). Granting a discovery for a
##      non-existent tile would be a fake, so the unlockTile grant is DROPPED: day 30 grants
##      just its 1000 coins + 3 runes. (React itself already gates the unlock behind
##      `TILE_TYPES_MAP[reward.unlockTile]` existing, so dropping a missing tile is faithful
##      to React's own guard — it would no-op there too.)
##
## REWARD LADDER (React day → port reward). Days 6 and any day past 30 fall through to
## the {coins:25} default (React leaves day 6 unlisted; the streak caps at 30).

## The explicit reward table: day (int 1..30) → reward Dictionary. A day NOT present
## here defaults to {coins:25} via reward_for_day(). Each reward is a port-reachable
## grant: { coins?:int, runes?:int, tool?:String (a real ToolConfig id), amount?:int }.
## Verbatim from React DAILY_REWARDS except the three tool ids remapped + day-30's
## unlockTile dropped (see the header).
const DAILY_REWARDS: Dictionary = {
	1:  {"coins": 25},
	2:  {"coins": 50},
	3:  {"tool": "scythe", "amount": 1},   # React basic  → scythe
	4:  {"coins": 75},
	5:  {"tool": "bomb",   "amount": 1},   # React rare   → bomb
	# 6 unlisted in React → {coins:25} default (reward_for_day handles it)
	7:  {"coins": 150, "tool": "rake", "amount": 1},   # React shuffle → rake
	8:  {"coins": 60},
	9:  {"coins": 70},
	10: {"coins": 80},
	11: {"coins": 90},
	12: {"coins": 100},
	13: {"coins": 120},
	14: {"coins": 300, "runes": 1},
	15: {"coins": 100},
	16: {"coins": 110},
	17: {"coins": 120},
	18: {"coins": 130},
	19: {"coins": 140},
	20: {"coins": 160},
	21: {"coins": 180},
	22: {"coins": 200},
	23: {"coins": 220},
	24: {"coins": 240},
	25: {"coins": 260},
	26: {"coins": 280},
	27: {"coins": 300},
	28: {"coins": 350},
	29: {"coins": 400},
	30: {"coins": 1000, "runes": 3},   # React unlockTile "tile_cattle_triceratops" DROPPED (no port tile)
}

## The streak caps at this day — login_tick never advances currentDay past it. Mirrors
## React's `Math.min(currentDay + 1, 30)`.
const MAX_DAY: int = 30

## The reward for streak `day`, applying the React `{ coins: 25 }` default for any day
## NOT in DAILY_REWARDS (e.g. day 6, or a defensive out-of-range day). Returns a deep
## COPY so a caller can't mutate the const reward dicts. Mirrors React's
## `rewards[nextDay] ?? { coins: 25 }`.
static func reward_for_day(day: int) -> Dictionary:
	if DAILY_REWARDS.has(day):
		return (DAILY_REWARDS[day] as Dictionary).duplicate(true)
	return {"coins": 25}
