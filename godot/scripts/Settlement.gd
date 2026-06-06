class_name Settlement
extends RefCounted
## Per-town progression state on the Camp→City tier ladder. Every town (Town 1
## farm, Town 2, …) owns one Settlement that tracks which rank it has reached.
## Attributes (cap / plots / unlocks / costs) live in TownConfig; this class is
## just the mutable `tier` cursor plus convenience delegates.
##
## See TownConfig for the Direction spec table and the PC2-aligned first-pass
## tier-up costs (tunable).

var tier: int = TownConfig.TIER_CAMP

## Display name of the current tier (e.g. "Camp", "Hamlet").
func tier_name() -> String:
	return TownConfig.tier_name(tier)

## Per-resource storage cap at the current tier.
func cap() -> int:
	return TownConfig.tier_cap(tier)

## Building plots available at the current tier.
func plots() -> int:
	return TownConfig.tier_plots(tier)

## Description of what the current tier unlocks.
func unlocks() -> String:
	return TownConfig.tier_unlocks(tier)

## True when this settlement has reached the top of the ladder (City).
func is_max_tier() -> bool:
	return TownConfig.is_max_tier(tier)

## Resources required to advance to the NEXT tier. Empty Dictionary when maxed.
func next_tier_cost() -> Dictionary:
	return TownConfig.tier_up_cost(tier + 1)

## Plain-Dictionary snapshot for persistence.
func to_dict() -> Dictionary:
	return {"tier": tier}

## Rebuild from a snapshot, defensively: a missing/out-of-range tier clamps into
## [1, MAX_TIER] so a corrupt save can never desync the ladder.
static func from_dict(d: Dictionary) -> Settlement:
	var s := Settlement.new()
	s.tier = TownConfig.clamp_tier(int(d.get("tier", TownConfig.TIER_CAMP)))
	return s
