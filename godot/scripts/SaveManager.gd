class_name SaveManager
extends RefCounted
## JSON save/load for the run economy (GameState), all static. Mirrors the React
## persistence layer (src/state/persistence.js): a single versioned blob in
## local storage, with mismatched versions discarded rather than migrated
## (exactly the React SAVE_SCHEMA_VERSION policy — bump SAVE_VERSION when the
## persisted shape changes and old saves start fresh).

const SAVE_PATH := "user://save.json"
const SAVE_VERSION := 1

## Serialise `state` to SAVE_PATH. Returns true on success; on failure pushes a
## warning and returns false.
static func save(state: GameState) -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_warning("SaveManager: could not open %s for writing (err %d)"
			% [SAVE_PATH, FileAccess.get_open_error()])
		return false
	var blob := {"version": SAVE_VERSION, "state": state.to_dict()}
	f.store_string(JSON.stringify(blob))
	f.close()
	return true

## Load the saved run economy. Returns a fresh GameState when no save exists,
## the file can't be read/parsed, or the version doesn't match (mismatched saves
## are discarded — the React SAVE_SCHEMA_VERSION policy).
static func load_state() -> GameState:
	if not FileAccess.file_exists(SAVE_PATH):
		return GameState.new()
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		push_warning("SaveManager: could not open %s for reading (err %d)"
			% [SAVE_PATH, FileAccess.get_open_error()])
		return GameState.new()
	var text := f.get_as_text()
	f.close()
	var parsed: Variant = JSON.parse_string(text)
	if not (parsed is Dictionary):
		return GameState.new()
	if int(parsed.get("version", -1)) != SAVE_VERSION:
		return GameState.new()
	var state_dict: Variant = parsed.get("state", {})
	if not (state_dict is Dictionary):
		return GameState.new()
	return GameState.from_dict(state_dict)

## Delete the save file if present. No-op when there is nothing to remove.
static func clear() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var dir := DirAccess.open("user://")
		if dir != null:
			dir.remove("save.json")
