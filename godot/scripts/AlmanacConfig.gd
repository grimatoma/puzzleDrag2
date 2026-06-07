class_name AlmanacConfig
extends RefCounted
## The Almanac XP/tier TRACK, ported from the React almanac feature
## (src/features/almanac/data.ts). Pure data + pure derivation: the linear XP curve
## (XP_PER_LEVEL), the 10-tier reward catalog (ALMANAC_TIERS), the level computation
## (level_for_xp), and the tier-gate check (can_claim_tier). The MUTABLE almanac
## state (xp / level / claimed set / latched structural flags) + the grant flow live
## on GameState; this is the headless-testable catalog/logic half, mirroring
## QuestConfig / AchievementConfig (a `class_name` global, no autoload). Stateless.
##
## ── §17 LOCKED CURVE (do not redesign) ──────────────────────────────────────────
## 150 XP per level, linear. level = max(1, floor(xp / 150) + 1). Mirrors React
## XP_PER_LEVEL + awardXp exactly (level 1 at 0..149 XP, level 2 at 150..299, …).
##
## ── REWARD REMAP — port-reachable grants only (no fake tools) ────────────────────
## React tier rewards grant `coins`, `runes`, `tools.{basic|rare|shuffle}`, and
## `structural` flags. The port grants coins + runes DIRECTLY. For tools, the React
## ids basic / rare / shuffle DO NOT exist in the port's ToolConfig set
## (bomb/rake/sickle/auger/blast_charge/axe/scythe/stone_hammer/drill/magnet), so each
## is REMAPPED onto the nearest real port tool rather than inventing one:
##     basic  (Seedpack)  → ToolConfig.SCYTHE ("scythe")  — the real port harvest tool
##     rare   (Lockbox)   → ToolConfig.BOMB   ("bomb")    — a generic granted reward tool
##                                                          (same choice AchievementConfig
##                                                          makes for its ex-magic-wand tiers)
##     shuffle (Reshuffle)→ ToolConfig.RAKE   ("rake")    — a real port board tool
## Every tool id below is a real ToolConfig member, so GameState.grant_tool accepts it.
## `structural` flags (startingExtraScythe / extraBlueprintSlot / goldSeal / extraTurn)
## are LATCHED as plain state data on GameState.almanac_structural (faithful to React,
## which also just latches them into state.tools as bool flags). NO fake UI pretends
## these structural flags DO anything — they are recorded honours, nothing more.
##
## REWARD REMAP, tier by tier (React → port):
##   1  {coins:50}                                  → unchanged
##   2  {tools:{basic:1}}                            → {tools:{scythe:1}}
##   3  {coins:75, tools:{rare:1}}                   → {coins:75, tools:{bomb:1}}
##   4  {tools:{shuffle:1}}                          → {tools:{rake:1}}
##   5  {structural:startingExtraScythe}             → latched (unchanged)
##   6  {coins:150, structural:extraBlueprintSlot}   → coins kept + latched
##   7  {structural:goldSeal, coins:250}             → coins kept + latched
##   8  {structural:extraTurn, tools:{rare:2}}       → {structural:extraTurn, tools:{bomb:2}}
##   9  {coins:500, tools:{shuffle:2, rare:1}}       → {coins:500, tools:{rake:2, bomb:1}}
##   10 {coins:1000, runes:1, tools:{basic:5,rare:3,shuffle:1}}
##                                                   → {coins:1000, runes:1, tools:{scythe:5, bomb:3, rake:1}}

## §17 locked: 150 XP per level, linear. Do not redesign.
const XP_PER_LEVEL: int = 150

## The 10-tier reward track. Each entry:
##   tier:        int        — stable 1-based tier number (== display order)
##   level:       int        — almanac level required to claim this tier
##   name:        String     — display name (verbatim React)
##   description: String     — flavour line (verbatim React)
##   reward:      Dictionary — port-reachable grant: {coins?, runes?, tools?:{id:n},
##                             structural?:String}. See the REWARD REMAP header.
const ALMANAC_TIERS: Array = [
	{
		"tier": 1, "level": 1,
		"name": "Seedling",
		"description": "Your first entry in the Almanac — you've started keeping records of the vale.",
		"reward": {"coins": 50},
	},
	{
		"tier": 2, "level": 2,
		"name": "Apprentice Keeper",
		"description": "A seed pack from Mira to help you broaden your harvest.",
		"reward": {"tools": {"scythe": 1}},
	},
	{
		"tier": 3, "level": 3,
		"name": "Field Scholar",
		"description": "A lockbox of coin and a sturdy lock to keep your stores safe.",
		"reward": {"coins": 75, "tools": {"bomb": 1}},
	},
	{
		"tier": 4, "level": 4,
		"name": "Chronicler",
		"description": "A reshuffle token — handy when the board needs a fresh deal.",
		"reward": {"tools": {"rake": 1}},
	},
	{
		"tier": 5, "level": 5,
		"name": "Master Harvester",
		"description": "A legendary scythe that stays in your toolkit at the start of every new season.",
		"reward": {"structural": "startingExtraScythe"},
	},
	{
		"tier": 6, "level": 6,
		"name": "Village Architect",
		"description": "Plans for expanding the village. Unlocks an extra blueprint slot for crafting.",
		"reward": {"coins": 150, "structural": "extraBlueprintSlot"},
	},
	{
		"tier": 7, "level": 7,
		"name": "Merchant Prince",
		"description": "A golden seal for trade. Increases the value of all delivered orders by 10%.",
		"reward": {"coins": 250, "structural": "goldSeal"},
	},
	{
		"tier": 8, "level": 8,
		"name": "Timekeeper",
		"description": "An ancient hourglass that grants an extra turn in every farm and mine session.",
		"reward": {"structural": "extraTurn", "tools": {"bomb": 2}},
	},
	{
		"tier": 9, "level": 9,
		"name": "Vale Guardian",
		"description": "A significant grant from the Capital to honor your stewardship.",
		"reward": {"coins": 500, "tools": {"rake": 2, "bomb": 1}},
	},
	{
		"tier": 10, "level": 10,
		"name": "Keeper of the Hearth",
		"description": "The highest honor. You have mastered the ways of the vale.",
		"reward": {"coins": 1000, "runes": 1, "tools": {"scythe": 5, "bomb": 3, "rake": 1}},
	},
]

# ── Catalog helpers (usable without an instance) ──────────────────────────────────

## Every tier in stable order (a defensive deep copy).
static func all_tiers() -> Array:
	var out: Array = []
	for t in ALMANAC_TIERS:
		out.append((t as Dictionary).duplicate(true))
	return out

## Number of tiers (always 10).
static func tier_count() -> int:
	return ALMANAC_TIERS.size()

## The full tier entry for tier number `tier` (a deep COPY), or {} for an unknown tier.
static func tier_def(tier: int) -> Dictionary:
	for t in ALMANAC_TIERS:
		if int(t.get("tier", 0)) == tier:
			return (t as Dictionary).duplicate(true)
	return {}

## True when `tier` names a real tier.
static func has_tier(tier: int) -> bool:
	for t in ALMANAC_TIERS:
		if int(t.get("tier", 0)) == tier:
			return true
	return false

# ── XP curve (ported EXACTLY from React awardXp) ──────────────────────────────────

## The almanac level for a given XP total: max(1, floor(xp / 150) + 1). Mirrors React.
## Negative xp is floored to level 1 defensively.
static func level_for_xp(xp: int) -> int:
	if xp < 0:
		return 1
	return maxi(1, (xp / XP_PER_LEVEL) + 1)

## True when tier `tier` can be claimed at almanac `level` and isn't already in
## `claimed` (an Array of claimed tier ints). Mirrors React claimAlmanacTier's gates:
## the tier must exist, not already be claimed, and level >= the tier's required level.
static func can_claim_tier(tier: int, level: int, claimed: Array) -> bool:
	if not has_tier(tier):
		return false
	if claimed.has(tier):
		return false
	return level >= int(tier_def(tier).get("level", 1))
