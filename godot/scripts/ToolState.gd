class_name ToolState
extends RefCounted
## Owned tool charges + the armed tap-target state — extracted from GameState as a
## composed domain object (the same pattern as Settlement / StoryState / NpcState).
## GameState owns one of these (var tool_state) and exposes the legacy `tools` Dictionary
## + `pending_tool` String through property accessors so every reader (Main, Inventory
## screen, tests, the portal summon path) keeps working unchanged. Ported half of the
## M8b tool system; the pure board EFFECTS live in ToolEffects / ToolConfig (M8a) and the
## credit/quests ORCHESTRATION stays on GameState.use_tool_on_grid.
##
## DATA
##   tools:   Dict   — tool id:String -> remaining charges:int. A missing key reads as 0;
##                     the key is ERASED at 0 so the dict stays a clean owned-and-usable set.
##   pending: String — the armed TAP-target tool awaiting a board cell, or "" when none.
##                     TRANSIENT: deliberately NOT persisted (a reload starts disarmed).
##
## SAVE SHAPE: only `tools` persists, as the same flat top-level "tools" dict GameState
## emitted before the extraction. `pending` is never written. to_dict()/from_dict() keep
## the on-disk shape byte-identical.

## Owned tool charges, keyed by ToolConfig id (String) → remaining uses (int).
var tools: Dictionary = {}
## The armed TAP-target tool awaiting a board cell, or "" when nothing is armed.
## TRANSIENT — never persisted (a reload always starts disarmed).
var pending: String = ""

## Grant `n` charges of tool `id`. No-op for an unknown id (ToolConfig doesn't know it)
## or a non-positive `n`. Adds to any existing charges so granting the same tool twice
## stacks. A fresh grant creates the key; the count is always kept > 0.
func grant(id: String, n: int = 1) -> void:
	if n <= 0:
		return
	if not ToolConfig.has_tool(id):
		return
	tools[id] = int(tools.get(id, 0)) + n

## Set the charge count for `id` DIRECTLY (bypassing the ToolConfig gate). Used by the
## portal summon path, which credits a magic-tool id that is NOT a ToolConfig member —
## grant() would reject it. Mirrors the React slice writing into the tools dict directly.
func set_count(id: String, n: int) -> void:
	tools[id] = n

## Remaining charges of tool `id` (0 when unowned / never granted).
func count(id: String) -> int:
	return int(tools.get(id, 0))

## True when `id` has at least one charge owned (regardless of whether ToolConfig still
## knows it — a count > 0 means it was validly granted).
func has_charges(id: String) -> bool:
	return count(id) > 0

## True when `id` is a REAL tool (ToolConfig knows it) AND has at least one charge.
func can_use(id: String) -> bool:
	return ToolConfig.has_tool(id) and has_charges(id)

## Arm a TAP-target tool so the next board cell fires it. Returns true on success (the
## tool is a known tap tool with charges → `pending` is set). Returns false WITHOUT arming
## for an unknown tool, a NON-tap (instant) tool, or one with no charges.
func arm(id: String) -> bool:
	if not can_use(id):
		return false
	if not ToolConfig.is_tap_target(id):
		return false
	pending = id
	return true

## True while a tap-target tool is armed and waiting for a board cell.
func is_armed() -> bool:
	return pending != ""

## Disarm any pending tap-target tool (cancel the armed input mode).
func disarm() -> void:
	pending = ""

## Consume one charge of `id`: decrement, erase the key at 0 (so `tools` stays an
## owned-and-usable set), and disarm if `id` was the armed pending tool.
func consume(id: String) -> void:
	var left: int = int(tools.get(id, 0)) - 1
	if left <= 0:
		tools.erase(id)
	else:
		tools[id] = left
	if pending == id:
		pending = ""

## Plain-Dictionary snapshot for persistence — only the owned tool charges. `pending` is
## transient and intentionally NOT included (a reload always starts disarmed). Shallow
## copy (counts are ints), matching the pre-split `tools.duplicate()` emission.
func to_dict() -> Dictionary:
	return tools.duplicate()

## Rebuild from a saved tools dict, defensively. Missing key (any save written before
## tools existed) → {} (no tools). Each value is coerced to int (JSON yields floats) and
## only positive counts are kept — a 0/negative or non-numeric entry is dropped so the
## loaded `tools` is always a clean owned-and-usable set. `pending` is never restored.
static func from_dict(d: Variant) -> ToolState:
	var s := ToolState.new()
	if d is Dictionary:
		for k in d:
			var n: int = int(d[k])
			if n > 0:
				s.tools[String(k)] = n
	return s
