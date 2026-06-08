class_name AchievementState
extends RefCounted
## The trophy system's persisted DATA + pure counter/threshold logic — extracted from
## GameState as a composed domain object (the same pattern as Settlement / NpcState /
## ToolState). GameState owns one of these (var achievement_state) and exposes the legacy
## achievement_counters / achievements_unlocked / _distinct_seen Dictionaries through live
## property getters so every reader (AchievementsScreen, tests) keeps working unchanged.
## Ported from the React achievements slice (src/features/achievements/data.ts).
##
## DATA
##   counters: Dict  — counter_name:String -> int running total. A missing key reads as 0.
##   unlocked: Dict  — achievement_id:String -> true for every UNLOCKED trophy.
##   distinct: Dict  — counter_name:String -> {distinct_key:String -> true}. Backs the
##                     DISTINCT counters (a key bumps its counter the FIRST time it is seen
##                     for that counter and never again).
##
## REWARD SPLIT: this class owns the COUNTING + the UNLOCK detection (it marks an id
## unlocked the moment its threshold is crossed, so idempotence — "never re-grant" — lives
## with the persisted unlocked set). It does NOT grant rewards: bump() RETURNS the list of
## newly-unlocked achievement dicts and GameState credits their coins/tools side-effects.
## This keeps the side-effecting glue (coins +=, grant_tool) on GameState, exactly as the
## use_tool_on_grid orchestration stays there.
##
## SAVE SHAPE: the three maps persist as the same flat top-level keys GameState emitted
## before the extraction ("achievement_counters", "achievements_unlocked", "_distinct_seen").

var counters: Dictionary = {}
var unlocked: Dictionary = {}
var distinct: Dictionary = {}

## Bump counter `counter` and mark (but do NOT reward) any trophies it just crossed.
##
##   amount       how much to add (default 1). Quantity counters pass chain_len;
##                chain/order/boss counters pass 1.
##   distinct_key when non-null, this is a DISTINCT counter: the counter only increments
##                the FIRST time `distinct_key` is seen for `counter` (subsequent same-key
##                calls are a no-op). A null key (the default) is a plain increment.
##
## After incrementing, every AchievementConfig.for_counter(counter) NOT already unlocked
## whose threshold was just CROSSED (prev < threshold <= new) is marked unlocked here and
## appended to the returned Array. The CALLER (GameState.bump_counter) grants each returned
## achievement's reward exactly once. Returns an empty Array when nothing crossed.
## Crossing-not-polling keeps load idempotent: from_dict restores `unlocked`, so a later
## bump skips already-unlocked rows and returns nothing for them.
func bump(counter: String, amount: int = 1, distinct_key = null) -> Array:
	var prev: int = int(counters.get(counter, 0))
	if distinct_key != null:
		# Distinct counter: only the first sighting of this key bumps the count.
		var seen: Dictionary = distinct.get(counter, {})
		var key: String = String(distinct_key)
		if key == "" or seen.has(key):
			return []   # empty key or already counted → no change, nothing unlocks
		seen[key] = true
		distinct[counter] = seen
		counters[counter] = prev + 1
	else:
		if amount == 0:
			return []   # a zero bump can't cross a threshold
		counters[counter] = prev + amount
	var new_total: int = int(counters[counter])

	# Mark every achievement on this counter that just crossed its threshold (the CALLER
	# grants the reward).
	var newly: Array = []
	for a in AchievementConfig.for_counter(counter):
		var id: String = String(a.get("id", ""))
		if bool(unlocked.get(id, false)):
			continue   # already earned — idempotent, never re-grant
		var threshold: int = int(a.get("threshold", 0))
		if prev < threshold and new_total >= threshold:
			unlocked[id] = true
			newly.append(a)
	return newly

## Current progress on `counter`, as a plain int the AchievementsScreen renders against the
## threshold. DISTINCT counters report the number of distinct keys seen so far
## (`distinct[counter].size()`); every other counter reports its running total from
## `counters`. Matching distinct against `distinct` keeps a distinct-only counter correct
## even if `counters` were absent.
func progress(counter: String) -> int:
	if distinct.has(counter):
		return int((distinct[counter] as Dictionary).size())
	return int(counters.get(counter, 0))

## The set of distinct keys seen so far for a DISTINCT counter, as a {key:String -> true}
## Dictionary (a defensive COPY; empty for a counter never bumped via the distinct path).
func distinct_seen(counter: String) -> Dictionary:
	return (distinct.get(counter, {}) as Dictionary).duplicate()

## Plain-Dictionary snapshot for persistence — the three maps, deep-copied where nested.
## Matches the pre-split per-key emission (counters/unlocked shallow, distinct deep).
func to_dict() -> Dictionary:
	return {
		"counters": counters.duplicate(),
		"unlocked": unlocked.duplicate(),
		"distinct": distinct.duplicate(true),
	}

## Rebuild from the three flat saved maps, defensively. Missing keys (any pre-M10 save) →
## empty maps, so old saves load with zero progress. Counters coerce values to int (JSON
## yields floats); the unlocked map keeps only truthy entries; distinct rebuilds a
## {counter -> {key -> true}} shape, dropping malformed rows. Because the unlocked set is
## restored, a subsequent bump() sees the id as already-unlocked and never re-marks it.
##
## Takes the three raw sub-dicts (counters/unlocked/distinct) rather than the whole save so
## GameState can pass the original flat keys verbatim.
static func from_flat(counters_d: Variant, unlocked_d: Variant, distinct_d: Variant) -> AchievementState:
	var s := AchievementState.new()
	if counters_d is Dictionary:
		for k in counters_d:
			s.counters[String(k)] = int(counters_d[k])
	if unlocked_d is Dictionary:
		for k in unlocked_d:
			if bool(unlocked_d[k]):
				s.unlocked[String(k)] = true
	if distinct_d is Dictionary:
		for ckey in distinct_d:
			var inner: Variant = distinct_d[ckey]
			if not (inner is Dictionary):
				continue
			var seen: Dictionary = {}
			for sk in inner:
				if bool(inner[sk]):
					seen[String(sk)] = true
			if not seen.is_empty():
				s.distinct[String(ckey)] = seen
	return s
