extends SceneTree
## Headless tests for Batch 10 — ViewRouter id↔Modal DEDUP. Batch 10 consolidated the three
## hand-maintained id↔Modal structures (resolve() / modal_id() / known_ids()) into ONE table
## (MODAL_IDS) and derives all three from it. This suite is the guard that the refactor is
## BEHAVIOR-PRESERVING: every id resolves to the same intent, every Modal maps to the same
## canonical id, and known_ids() is the SAME SET (and same ORDER) as before.
##
## The expected values below are HARDCODED from the LEGACY hand-written resolve()/modal_id()/
## known_ids() (pre-Batch-10), so the assertions are independent of the new MODAL_IDS table —
## they catch any drift the refactor might have introduced.
##
## Same dependency-free harness as the other tests/run_*.gd. `class_name` globals are referenced
## directly. Run from the godot/ project root:
##   godot --headless --script res://tests/run_viewrouter_config_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# ── LEGACY expected data (hardcoded from the pre-Batch-10 ViewRouter) ──────────

## id → Modal enum value, for EVERY id the old resolve() accepted (canonical + alias +
## "" + "board"). This is the full enumeration from the old `match` statement.
func _legacy_id_to_modal() -> Dictionary:
	return {
		"": ViewRouter.Modal.NONE,
		"board": ViewRouter.Modal.NONE,
		"town": ViewRouter.Modal.TOWN,
		"ledger": ViewRouter.Modal.TOWN,
		"menu": ViewRouter.Modal.MENU,
		"inventory": ViewRouter.Modal.INVENTORY,
		"items": ViewRouter.Modal.INVENTORY,
		"map": ViewRouter.Modal.TOWNMAP,
		"townmap": ViewRouter.Modal.TOWNMAP,
		"achievements": ViewRouter.Modal.ACHIEVEMENTS,
		"trophies": ViewRouter.Modal.ACHIEVEMENTS,
		"tiles": ViewRouter.Modal.TILES,
		"collection": ViewRouter.Modal.TILES,
		"chronicle": ViewRouter.Modal.CHRONICLE,
		"story": ViewRouter.Modal.CHRONICLE,
		"townsfolk": ViewRouter.Modal.TOWNSFOLK,
		"folk": ViewRouter.Modal.TOWNSFOLK,
		"cartography": ViewRouter.Modal.CARTOGRAPHY,
		"world": ViewRouter.Modal.CARTOGRAPHY,
		"recipes": ViewRouter.Modal.RECIPES,
		"recipewiki": ViewRouter.Modal.RECIPES,
		"craft": ViewRouter.Modal.RECIPES,
		"crafting": ViewRouter.Modal.RECIPES,
		"tutorial": ViewRouter.Modal.TUTORIAL,
		"castle": ViewRouter.Modal.CASTLE,
		"keep": ViewRouter.Modal.CASTLE,
		"decorations": ViewRouter.Modal.DECORATIONS,
		"decor": ViewRouter.Modal.DECORATIONS,
		"portal": ViewRouter.Modal.PORTAL,
		"summon": ViewRouter.Modal.PORTAL,
		"charter": ViewRouter.Modal.CHARTER,
		"pact": ViewRouter.Modal.CHARTER,
		"quests": ViewRouter.Modal.QUESTS,
		"almanac": ViewRouter.Modal.QUESTS,
		"daily": ViewRouter.Modal.DAILY,
		"streak": ViewRouter.Modal.DAILY,
		"leaveboard": ViewRouter.Modal.LEAVEBOARD,
		"leave": ViewRouter.Modal.LEAVEBOARD,
		"debug": ViewRouter.Modal.DEBUG,
		"startfarming": ViewRouter.Modal.STARTFARMING,
		"farm": ViewRouter.Modal.STARTFARMING,
		"boons": ViewRouter.Modal.BOONS,
		"boon": ViewRouter.Modal.BOONS,
		"keeper": ViewRouter.Modal.KEEPER,
	}

## Modal enum value → canonical id string, hardcoded from the old modal_id() match
## (NONE → "board"; every other modal → its canonical id; an unmapped value → "").
func _legacy_modal_to_id() -> Dictionary:
	return {
		ViewRouter.Modal.NONE: "board",
		ViewRouter.Modal.TOWN: "town",
		ViewRouter.Modal.MENU: "menu",
		ViewRouter.Modal.INVENTORY: "inventory",
		ViewRouter.Modal.TOWNMAP: "map",
		ViewRouter.Modal.ACHIEVEMENTS: "achievements",
		ViewRouter.Modal.TILES: "tiles",
		ViewRouter.Modal.CHRONICLE: "chronicle",
		ViewRouter.Modal.TOWNSFOLK: "townsfolk",
		ViewRouter.Modal.CARTOGRAPHY: "cartography",
		ViewRouter.Modal.RECIPES: "recipes",
		ViewRouter.Modal.TUTORIAL: "tutorial",
		ViewRouter.Modal.CASTLE: "castle",
		ViewRouter.Modal.DECORATIONS: "decorations",
		ViewRouter.Modal.PORTAL: "portal",
		ViewRouter.Modal.CHARTER: "charter",
		ViewRouter.Modal.QUESTS: "quests",
		ViewRouter.Modal.DAILY: "daily",
		ViewRouter.Modal.LEAVEBOARD: "leaveboard",
		ViewRouter.Modal.DEBUG: "debug",
		ViewRouter.Modal.STARTFARMING: "startfarming",
		ViewRouter.Modal.BOONS: "boons",
		ViewRouter.Modal.KEEPER: "keeper",
	}

## The EXACT legacy known_ids() list, in order (hardcoded from the old PackedStringArray).
func _legacy_known_ids() -> Array:
	return ["", "board", "town", "ledger", "menu", "inventory", "items", "map", "townmap",
		"achievements", "trophies", "tiles", "collection", "chronicle", "story", "townsfolk",
		"folk", "cartography", "world", "recipes", "recipewiki", "craft", "crafting", "tutorial",
		"castle", "keep", "decorations", "decor", "portal", "summon", "charter", "pact", "quests",
		"almanac", "daily", "streak", "leaveboard", "leave", "debug", "startfarming", "farm",
		"boons", "boon", "keeper"]

func _initialize() -> void:
	print("\n── Batch 10 ViewRouter dedup tests ─────────────────")
	_test_resolve_every_id()
	_test_resolve_unknown()
	_test_modal_id_every_modal()
	_test_known_ids_set()
	_test_known_ids_order()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── resolve() — every legacy id maps to the same { ok, view, modal } ───────────

func _test_resolve_every_id() -> void:
	for id in _legacy_id_to_modal():
		var expected_modal: int = int(_legacy_id_to_modal()[id])
		var d: Dictionary = ViewRouter.resolve(id)
		_check(bool(d.get("ok", false)), "resolve('%s') ok == true" % id)
		_check(int(d.get("view", -1)) == ViewRouter.View.BOARD,
			"resolve('%s') view == BOARD" % id)
		_check(int(d.get("modal", -99)) == expected_modal,
			"resolve('%s') modal == %d (legacy)" % [id, expected_modal])

func _test_resolve_unknown() -> void:
	# An unknown id returns exactly { "ok": false } — no view/modal keys, ok absent reads false.
	var d: Dictionary = ViewRouter.resolve("nonsense")
	_check(not bool(d.get("ok", false)), "resolve('nonsense') ok == false (unknown id)")
	_check(d.size() == 1 and d.has("ok"),
		"resolve('nonsense') returns exactly { ok: false } (no stray keys)")
	# A couple more never-valid ids for good measure.
	_check(not bool(ViewRouter.resolve("totally_unknown").get("ok", false)),
		"resolve('totally_unknown') ok == false")
	_check(not bool(ViewRouter.resolve("BOARD").get("ok", false)),
		"resolve('BOARD') ok == false (ids are case-sensitive, exactly as before)")

# ── modal_id() — every Modal maps to the same canonical id ─────────────────────

func _test_modal_id_every_modal() -> void:
	for m in _legacy_modal_to_id():
		var expected_id: String = String(_legacy_modal_to_id()[m])
		_check(ViewRouter.modal_id(int(m)) == expected_id,
			"modal_id(%d) == '%s' (legacy canonical)" % [m, expected_id])
	# An out-of-range modal value still maps to "" (the legacy default branch).
	_check(ViewRouter.modal_id(9999) == "", "modal_id(9999) == '' (unmapped → empty, legacy default)")

# ── known_ids() — same SET and same ORDER as the legacy hand-written list ───────

func _test_known_ids_set() -> void:
	var got: PackedStringArray = ViewRouter.known_ids()
	var legacy: Array = _legacy_known_ids()
	# Same membership in BOTH directions (no missing, no extra ids).
	var all_present := true
	for id in legacy:
		if not got.has(id):
			all_present = false
			print("    (missing legacy id: '%s')" % id)
	_check(all_present, "known_ids() contains every legacy id (no id dropped)")
	var no_extra := true
	for id in got:
		if not legacy.has(id):
			no_extra = false
			print("    (unexpected new id: '%s')" % id)
	_check(no_extra, "known_ids() introduces no NEW id beyond the legacy set")
	_check(got.size() == legacy.size(),
		"known_ids() size == legacy size (%d, no dupes introduced)" % legacy.size())

func _test_known_ids_order() -> void:
	# Order is load-bearing (DebugModal.jump_targets walks it keeping the first id per modal),
	# so it must match the legacy list element-for-element.
	var got: PackedStringArray = ViewRouter.known_ids()
	var legacy: Array = _legacy_known_ids()
	var ordered := got.size() == legacy.size()
	if ordered:
		for i in legacy.size():
			if got[i] != String(legacy[i]):
				ordered = false
				print("    (order mismatch at %d: got '%s', legacy '%s')" % [i, got[i], legacy[i]])
				break
	_check(ordered, "known_ids() order is byte-identical to the legacy list")
