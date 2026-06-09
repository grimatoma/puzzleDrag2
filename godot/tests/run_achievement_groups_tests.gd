extends SceneTree
## Headless tests for Batch 10 — AchievementConfig TROPHY-GROUPING migration. Batch 10 moved the
## trophy-section classification (the ordered [label, [counters]] list + the "More" catch-all)
## OUT of scenes/AchievementsScreen.gd and INTO scripts/AchievementConfig.gd (GROUP_ORDER /
## group_order() / group_for()), since the grouping tracks the catalog's counter set.
##
## This suite is the guard that the move is BEHAVIOR-PRESERVING: the labels, the exact
## counter→group assignments, the ORDER, and the trailing "More" catch-all are byte-identical
## to the former AchievementsScreen.GROUP_ORDER local table.
##
## The expected grouping is HARDCODED below from the OLD AchievementsScreen.GROUP_ORDER /
## GROUP_MORE, so the assertions are independent of the new AchievementConfig table.
##
## Same dependency-free harness as run_achievements_tests.gd. `class_name` globals are referenced
## directly. Run from the godot/ project root:
##   godot --headless --script res://tests/run_achievement_groups_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

var AC := AchievementConfig

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

## The EXACT legacy AchievementsScreen.GROUP_ORDER (ordered [label, [counters]]).
func _legacy_group_order() -> Array:
	return [
		["Chains",      ["chains_committed"]],
		["Orders",      ["orders_fulfilled"]],
		["Boss",        ["bosses_defeated"]],
		["Collections", ["distinct_resources_chained", "distinct_buildings_built"]],
		["Mine",        ["mine_chained"]],
		["Harvest",     ["veg_chained", "fruit_chained", "flower_chained", "herd_chained",
						 "cattle_chained", "mount_chained", "tree_chained"]],
	]

const LEGACY_GROUP_MORE := "More"

func _initialize() -> void:
	print("\n── Batch 10 achievement-grouping tests ─────────────")
	_test_group_more()
	_test_group_order_byte_identical()
	_test_group_for_every_counter()
	_test_group_for_unlisted_counter()
	_test_every_catalog_counter_classified()
	_test_group_order_is_defensive_copy()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _test_group_more() -> void:
	_check(AC.GROUP_MORE == LEGACY_GROUP_MORE,
		"AchievementConfig.GROUP_MORE == 'More' (legacy catch-all label)")

func _test_group_order_byte_identical() -> void:
	var got: Array = AC.group_order()
	var legacy: Array = _legacy_group_order()
	_check(got.size() == legacy.size(),
		"group_order() has %d sections (legacy size)" % legacy.size())
	var identical := got.size() == legacy.size()
	for i in mini(got.size(), legacy.size()):
		var g_label: String = String((got[i] as Array)[0])
		var l_label: String = String((legacy[i] as Array)[0])
		if g_label != l_label:
			identical = false
			print("    (label mismatch at %d: got '%s', legacy '%s')" % [i, g_label, l_label])
		var g_counters: Array = (got[i] as Array)[1]
		var l_counters: Array = (legacy[i] as Array)[1]
		if g_counters.size() != l_counters.size():
			identical = false
			print("    (counter-count mismatch in '%s')" % l_label)
		else:
			for j in l_counters.size():
				if String(g_counters[j]) != String(l_counters[j]):
					identical = false
					print("    (counter mismatch in '%s' at %d: got '%s', legacy '%s')" % [
						l_label, j, g_counters[j], l_counters[j]])
	_check(identical, "group_order() label/counter/order is byte-identical to legacy GROUP_ORDER")

func _test_group_for_every_counter() -> void:
	# group_for() must agree with the legacy table for EVERY listed counter.
	for spec in _legacy_group_order():
		var label: String = String(spec[0])
		for counter in (spec[1] as Array):
			_check(AC.group_for(String(counter)) == label,
				"group_for('%s') == '%s' (legacy assignment)" % [counter, label])

func _test_group_for_unlisted_counter() -> void:
	# A counter in NO listed group → the "More" catch-all (the screen never drops a trophy).
	_check(AC.group_for("totally_unlisted_counter") == AC.GROUP_MORE,
		"group_for(unlisted) == GROUP_MORE ('More' catch-all)")
	_check(AC.group_for("") == AC.GROUP_MORE,
		"group_for('') == GROUP_MORE (empty counter falls into More)")
	# bird_chained + fish_chained exist as REAL catalog counters but are in NO group family,
	# so they (correctly) classify as "More" — exactly as the old local table did.
	_check(AC.group_for("fish_chained") == AC.GROUP_MORE,
		"group_for('fish_chained') == 'More' (real counter, no group family — legacy behavior)")
	_check(AC.group_for("bird_chained") == AC.GROUP_MORE,
		"group_for('bird_chained') == 'More' (real counter, no group family — legacy behavior)")

func _test_every_catalog_counter_classified() -> void:
	# Every catalog entry's counter resolves to SOME section (a listed group or "More"),
	# so the trophy screen renders one card per entry with no silent drops.
	var sections: Dictionary = {}
	for entry in AC.all():
		var counter: String = String((entry as Dictionary).get("counter", ""))
		var grp: String = AC.group_for(counter)
		_check(grp != "", "group_for('%s') is non-empty (entry '%s' is classified)" % [
			counter, String((entry as Dictionary).get("id", ""))])
		sections[grp] = true
	# Sanity: the catalog should populate the named groups AND the "More" bucket (fish/bird).
	_check(sections.has(AC.GROUP_MORE),
		"the live catalog DOES land some entry in 'More' (fish/bird counters)")

func _test_group_order_is_defensive_copy() -> void:
	# group_order() returns a deep copy — mutating it must not corrupt the catalog table.
	var a: Array = AC.group_order()
	(a[0] as Array)[0] = "MUTATED"
	((a[0] as Array)[1] as Array).append("garbage")
	var b: Array = AC.group_order()
	_check(String((b[0] as Array)[0]) == "Chains",
		"group_order() is a defensive copy (label unchanged after mutation)")
	_check((b[0] as Array)[1].size() == 1,
		"group_order() is a defensive copy (counter list unchanged after mutation)")
