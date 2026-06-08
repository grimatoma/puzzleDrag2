class_name StoryEngine
extends RefCounted
## Story ENGINE (logic core) — pure static functions: the condition evaluator, the
## fact-snapshot builder, beat selection, and the beat/choice appliers. Ports the
## pure slice of src/state/storyEffects.ts + src/config/progression/conditions.ts +
## src/story.ts (applyBeatResult / applyChoiceOutcome). NO state of its own, NO
## Phaser/UI — every function takes its inputs and returns NEW data (story_state is
## a plain Dictionary, mutated copies only). Mirrors StoryConfig (data) the way
## GameState (state) mirrors its Config siblings.
##
## story_state shape (a plain Dictionary; StoryState.gd is the typed mirror):
##   { act:int, flags:Dictionary, choice_log:Array, beat_queue:Array }
## flags carries both author flags ("hearth_lit") AND auto fired-markers ("_fired_<id>").

# ── Fired-marker key for a beat ───────────────────────────────────────────────
## Mirrors src/story.ts firedFlagKey: "act1_arrival" → "_fired_act1_arrival".
static func fired_key(beat_id: String) -> String:
	return "_fired_" + beat_id

## True when `beat` has already fired in `story_state`. A beat is "fired" when its
## auto-marker is set (every fired beat gets the marker in apply_beat, in addition
## to any explicit on_complete flags). Empty/invalid beats read as not-fired.
static func is_beat_fired(story_state: Dictionary, beat: Dictionary) -> bool:
	var id: String = String(beat.get("id", ""))
	if id == "":
		return false
	var flags: Dictionary = story_state.get("flags", {})
	return bool(flags.get(fired_key(id), false))

# ── Condition evaluator ───────────────────────────────────────────────────────
## Evaluates an all/any/not/leaf condition tree against a flat fact `snapshot`.
## Ported from src/config/progression/conditions.ts (evaluate) with the same op set.
##
##   leaf  { fact, op?, value? }   op ∈ eq | ne | gte | lte | gt | lt | truthy
##                                 (op defaults to "truthy" — fact is set/non-false)
##   { all: [Cond] }   — every child true (empty all → true)
##   { any: [Cond] }   — some child true (empty any → false)
##   { not: Cond }     — negation
##
## A MISSING fact reads as sensibly falsey: truthy/eq/ne see it as null/0; the
## numeric comparisons (gte/lte/gt/lt) treat a missing fact as 0.
static func evaluate_condition(cond: Dictionary, snapshot: Dictionary) -> bool:
	if cond == null or cond.is_empty():
		# An empty condition NEVER auto-matches (resolution/choice-queued beats carry
		# {} and must only appear via queue_beat, never fire on an event). Mirrors the
		# React runtime skipping beats with no `when`.
		return false
	if cond.has("all"):
		var all_arr: Array = cond.get("all", [])
		for c in all_arr:
			if not evaluate_condition(c, snapshot):
				return false
		return true
	if cond.has("any"):
		var any_arr: Array = cond.get("any", [])
		for c in any_arr:
			if evaluate_condition(c, snapshot):
				return true
		return false
	if cond.has("not"):
		return not evaluate_condition(cond.get("not", {}), snapshot)
	if cond.has("fact"):
		return _eval_leaf(cond, snapshot)
	# Unknown shape — fail safe (never fires).
	return false

## Evaluate a single leaf `{ fact, op?, value? }` against the snapshot.
static func _eval_leaf(leaf: Dictionary, snapshot: Dictionary) -> bool:
	var fact_key: String = String(leaf.get("fact", ""))
	var op: String = String(leaf.get("op", "truthy"))
	var has_fact: bool = snapshot.has(fact_key)
	var actual: Variant = snapshot.get(fact_key, null)
	var expected: Variant = leaf.get("value", null)
	match op:
		"truthy":
			# Set AND not false-ish (false / 0 / "" / null all read as not-truthy).
			if not has_fact:
				return false
			return _is_truthy(actual)
		"eq":
			return _values_eq(actual, expected)
		"ne":
			return not _values_eq(actual, expected)
		"gte":
			return _as_num(actual) >= _as_num(expected)
		"lte":
			return _as_num(actual) <= _as_num(expected)
		"gt":
			return _as_num(actual) > _as_num(expected)
		"lt":
			return _as_num(actual) < _as_num(expected)
		_:
			return false

## Truthy in the JS sense: false / 0 / "" / null are falsey; everything else true.
static func _is_truthy(v: Variant) -> bool:
	if v == null:
		return false
	match typeof(v):
		TYPE_BOOL:
			return v
		TYPE_INT:
			return int(v) != 0
		TYPE_FLOAT:
			return float(v) != 0.0
		TYPE_STRING, TYPE_STRING_NAME:
			return String(v) != ""
		_:
			return true

## Loose equality. Numbers compare numerically (int 5 == float 5.0); bools/strings
## compare by value; a missing fact (null) only equals an explicit null `value`.
static func _values_eq(a: Variant, b: Variant) -> bool:
	if a == null or b == null:
		return a == b
	var ta := typeof(a)
	var tb := typeof(b)
	var a_num := ta == TYPE_INT or ta == TYPE_FLOAT
	var b_num := tb == TYPE_INT or tb == TYPE_FLOAT
	if a_num and b_num:
		return _as_num(a) == _as_num(b)
	if ta == TYPE_BOOL or tb == TYPE_BOOL:
		return bool(a) == bool(b)
	return String(a) == String(b)

## Coerce a fact/value to a number for the ordered comparisons. A missing/null/non-
## numeric value reads as 0 so a threshold leaf on an un-collected resource is safely
## "below" any positive threshold.
static func _as_num(v: Variant) -> float:
	match typeof(v):
		TYPE_INT:
			return float(v)
		TYPE_FLOAT:
			return float(v)
		TYPE_BOOL:
			return 1.0 if v else 0.0
		TYPE_STRING, TYPE_STRING_NAME:
			var s := String(v)
			return float(s) if s.is_valid_float() else 0.0
		_:
			return 0.0

# ── Fact snapshot ─────────────────────────────────────────────────────────────
## Flatten (event, inventory, tier, flags) into the flat fact map the evaluator
## reads. Ported from src/config/progression/storyBridge.ts buildFactSnapshot,
## adapted to PORT facts (no NPC bonds, no zone inventory):
##   "event.type", "event.<field>"   — every field of the event Dictionary
##   "inventory.<key>"               — current whole-unit count of each resource
##   "tier"                          — settlement tier (int)
##   "flag.<id>"                     — true for every set story flag (incl. _fired_*)
static func build_snapshot(event: Dictionary, inventory: Dictionary, tier: int, flags: Dictionary) -> Dictionary:
	var snap: Dictionary = {}
	# event.* — flatten every key (type, tier, id, resource, units, …).
	if event != null:
		for k in event.keys():
			snap["event." + String(k)] = event[k]
	# inventory.* — current counts (a missing resource simply has no key → reads 0).
	if inventory != null:
		for k in inventory.keys():
			snap["inventory." + String(k)] = int(inventory[k])
	# tier — the settlement rank.
	snap["tier"] = tier
	# flag.* — only SET flags get a key (true). _fired_* markers are flags too, so
	# they're exposed as flag._fired_<id> (harmless; beats gate on author flags).
	if flags != null:
		for k in flags.keys():
			if bool(flags[k]):
				snap["flag." + String(k)] = true
	return snap

# ── Beat selection ────────────────────────────────────────────────────────────
## The first beat (in StoryConfig.all_beats order) that has NOT already fired and
## whose `when` matches the snapshot built from (event, inventory, tier, flags).
## Returns {} when nothing matches. Ported from src/state/storyEffects.ts /
## evaluateStoryTriggers, but WITHOUT the strict "never skip an earlier pending
## beat" rule: the port fires the first MATCHING unfired beat (beats gate on
## discrete events / thresholds, so order is preserved naturally and a later-but-
## ready beat isn't blocked by an earlier beat whose event hasn't happened).
##
## One-time semantics: a fired beat is skipped via its marker. A beat with repeat
## == true is eligible even when its marker is set.
static func next_beat(story_state: Dictionary, event: Dictionary, inventory: Dictionary, tier: int) -> Dictionary:
	var flags: Dictionary = story_state.get("flags", {})
	var snap := build_snapshot(event, inventory, tier, flags)
	for beat in StoryConfig.all_beats():
		var is_repeat: bool = bool(beat.get("repeat", false))
		if not is_repeat and is_beat_fired(story_state, beat):
			continue
		var when: Dictionary = beat.get("when", {})
		# Empty `when` → choice-queued resolution beat; never auto-fires.
		if when == null or when.is_empty():
			continue
		if evaluate_condition(when, snap):
			return beat
	return {}

# ── Appliers (pure: return a NEW story_state) ─────────────────────────────────
## Mark `beat` fired and apply its on_complete. Returns a NEW story_state with:
##   - flags[_fired_<id>] = true            (the one-time marker)
##   - flags[<each on_complete.set_flag>] = true
##   - act advanced to max(current, beat.act)  (a beat never lowers the act)
## Pure — does not mutate the input. Mirrors src/story.ts evaluateStoryTriggers'
## flag-setting + the act-advance in storyEffects.
static func apply_beat(story_state: Dictionary, beat: Dictionary) -> Dictionary:
	var next: Dictionary = _clone_story(story_state)
	var id: String = String(beat.get("id", ""))
	if id == "":
		return next
	var flags: Dictionary = next.get("flags", {})
	# One-time marker (always set, even for repeat beats — harmless, and lets the UI
	# know a repeat beat has fired at least once).
	flags[fired_key(id)] = true
	# Explicit on_complete.set_flag.
	var on_complete: Dictionary = beat.get("on_complete", {})
	for f in _flag_list(on_complete.get("set_flag", [])):
		flags[f] = true
	next["flags"] = flags
	# Advance the act (never lower it).
	var beat_act: int = int(beat.get("act", 0))
	if beat_act > int(next.get("act", 1)):
		next["act"] = beat_act
	return next

## Resolve a player CHOICE on `beat`. Returns:
##   { story_state, grants:{resources:{}, coins:int}, queue_beat:String }
## The chosen outcome's flags (set/clear) are applied to a NEW story_state; the
## choice is appended to choice_log; resources/coins are RETURNED in `grants` for
## GameState to credit (the engine never touches inventory/coins — keeps it pure);
## queue_beat (if any) is BOTH returned and appended to story_state.beat_queue.
## An unknown choice id is a no-op (returns the cloned state, empty grants).
## Mirrors src/story.ts applyChoiceOutcome, stripped to the port's currencies
## (resources + coins — no bonds / embers / core ingots / heirlooms).
static func apply_choice(story_state: Dictionary, beat: Dictionary, choice_id: String) -> Dictionary:
	var next: Dictionary = _clone_story(story_state)
	var empty := {
		"story_state": next,
		"grants": {"resources": {}, "coins": 0},
		"queue_beat": "",
	}
	var choices: Array = beat.get("choices", [])
	var chosen: Dictionary = {}
	for c in choices:
		if String(c.get("id", "")) == choice_id:
			chosen = c
			break
	if chosen.is_empty():
		return empty   # unknown choice — no-op
	var outcome: Dictionary = chosen.get("outcome", {})
	var flags: Dictionary = next.get("flags", {})
	for f in _flag_list(outcome.get("set_flag", [])):
		flags[f] = true
	for f in _flag_list(outcome.get("clear_flag", [])):
		flags[f] = false
	next["flags"] = flags
	# Record the decision (the port's choice_log; ts omitted — no clock in the logic layer).
	var log: Array = next.get("choice_log", [])
	log.append({"beat_id": String(beat.get("id", "")), "choice_id": choice_id})
	next["choice_log"] = log
	# Grants — returned for GameState to credit (resources via the cap path, coins += ).
	var grant_resources: Dictionary = {}
	var raw_res: Dictionary = outcome.get("resources", {})
	for k in raw_res.keys():
		var amt: int = int(raw_res[k])
		if amt != 0:
			grant_resources[String(k)] = amt
	var grant_coins: int = int(outcome.get("coins", 0))
	# queue_beat — chain a follow-up beat into the display queue.
	var queue_beat: String = String(outcome.get("queue_beat", ""))
	if queue_beat != "" and StoryConfig.has_beat(queue_beat):
		var queue: Array = next.get("beat_queue", [])
		if not queue.has(queue_beat):
			queue.append(queue_beat)
		next["beat_queue"] = queue
	else:
		queue_beat = ""   # normalise an unknown id to "no follow-up"
	return {
		"story_state": next,
		"grants": {"resources": grant_resources, "coins": grant_coins},
		"queue_beat": queue_beat,
	}

# ── helpers ───────────────────────────────────────────────────────────────────

## Normalise a set_flag/clear_flag value (String | Array[String] | null) to a clean
## Array of non-empty String flag ids.
static func _flag_list(v: Variant) -> Array:
	var out: Array = []
	if v == null:
		return out
	if v is Array:
		for item in v:
			var s := String(item)
			if s != "":
				out.append(s)
	else:
		var s := String(v)
		if s != "":
			out.append(s)
	return out

## Deep-ish clone of a story_state Dictionary so appliers never mutate their input.
## flags/choice_log/beat_queue are duplicated; scalar `act` copies by value.
static func _clone_story(story_state: Dictionary) -> Dictionary:
	var src: Dictionary = story_state if story_state != null else {}
	return {
		"act": int(src.get("act", 1)),
		"flags": (src.get("flags", {}) as Dictionary).duplicate(true),
		"choice_log": (src.get("choice_log", []) as Array).duplicate(true),
		"beat_queue": (src.get("beat_queue", []) as Array).duplicate(true),
	}
