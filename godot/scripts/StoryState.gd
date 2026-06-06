class_name StoryState
extends RefCounted
## Persisted story state — the typed mirror of the plain Dictionary StoryEngine
## operates on. GameState owns one of these (var story) and threads it through the
## pure StoryEngine, persisting it in to_dict/from_dict. Mirrors src/story.ts
## INITIAL_STORY_STATE / StoryState, scoped to the port's logic layer (no NPC bonds,
## no repeat cooldowns, no per-zone state — the port's beats don't use them).
##
## FIELDS
##   act:        int   — current narrative act (1..3); advanced by StoryEngine.apply_beat
##                       to the max act of any fired beat. Never lowered.
##   flags:      Dict  — story flags. Carries BOTH author flags ("hearth_lit",
##                       "frostmaw_felled") AND the auto fired-markers ("_fired_<id>")
##                       so a one-time beat never re-fires after load.
##   choice_log: Array — ordered record of decisions: [{beat_id, choice_id}].
##   beat_queue: Array — ids of fired/queued beats awaiting display by the (later) UI
##                       slice. The logic layer enqueues; the UI drains.

var act: int = 1
var flags: Dictionary = {}
var choice_log: Array = []
var beat_queue: Array = []

## Convert to the plain Dictionary StoryEngine's pure functions consume (and that
## GameState applies back via from_engine_dict). A live view of the same fields —
## NOT a defensive copy; callers that need isolation duplicate themselves.
func to_engine_dict() -> Dictionary:
	return {
		"act": act,
		"flags": flags,
		"choice_log": choice_log,
		"beat_queue": beat_queue,
	}

## Adopt the result of a StoryEngine call (a plain story_state Dictionary) back into
## this typed instance. Defensive: missing keys keep current values; types coerced.
func apply_engine_dict(d: Dictionary) -> void:
	if d == null:
		return
	act = int(d.get("act", act))
	var f: Variant = d.get("flags", null)
	if f is Dictionary:
		flags = f
	var cl: Variant = d.get("choice_log", null)
	if cl is Array:
		choice_log = cl
	var bq: Variant = d.get("beat_queue", null)
	if bq is Array:
		beat_queue = bq

## True when story flag `id` is set (default-false when absent). _fired_* markers are
## flags too, so this also answers "has beat X fired" via StoryEngine.fired_key.
func has_flag(id: String) -> bool:
	return bool(flags.get(id, false))

## True when beat `id` has fired (its auto-marker is set).
func is_fired(beat_id: String) -> bool:
	return bool(flags.get(StoryEngine.fired_key(beat_id), false))

## Plain-Dictionary snapshot for persistence (a detached deep copy).
func to_dict() -> Dictionary:
	return {
		"act": act,
		"flags": flags.duplicate(true),
		"choice_log": choice_log.duplicate(true),
		"beat_queue": beat_queue.duplicate(true),
	}

## Rebuild from a snapshot, defensively: missing keys fall back to defaults; the act
## is floored at 1; flags keep only truthy entries (so a stale false flag doesn't
## linger); choice_log keeps well-formed {beat_id, choice_id} rows; beat_queue keeps
## only String ids. A missing/empty dict yields a fresh act-1 state.
static func from_dict(d: Dictionary) -> StoryState:
	var s := StoryState.new()
	if d == null or d.is_empty():
		return s
	s.act = maxi(1, int(d.get("act", 1)))
	var f: Variant = d.get("flags", {})
	if f is Dictionary:
		for k in f:
			if bool(f[k]):
				s.flags[String(k)] = true
	var cl: Variant = d.get("choice_log", [])
	if cl is Array:
		for row in cl:
			if not (row is Dictionary):
				continue
			if not (row.has("beat_id") and row.has("choice_id")):
				continue
			s.choice_log.append({
				"beat_id": String(row["beat_id"]),
				"choice_id": String(row["choice_id"]),
			})
	var bq: Variant = d.get("beat_queue", [])
	if bq is Array:
		for id in bq:
			var sid := String(id)
			if sid != "" and not s.beat_queue.has(sid):
				s.beat_queue.append(sid)
	return s
