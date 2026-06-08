extends SceneTree
## Headless unit-test runner for the M3j fish / harbor biome — the THIRD biome,
## ported from src/features/fish (slice.ts tides + pearl.ts rune capture). Covers the
## Constants fish-tile additions, biome-agnostic crediting of fish chains, the tide
## cycle + pearl model on FishConfig, the harbor expedition (enter/turn/leave mirroring
## the mine), the pearl→rune capture, the harbor refill pool, save/load of the harbor
## state, and the ADDITIVE guarantee (farm/mine unaffected). Run from the godot/ root:
##   godot --headless --script res://tests/run_fish_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as run_mine_tests.gd. `class_name` globals are
## aliased with `var` (not const) because a class_name ref is not a constant
## expression in 4.6.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var FC := FishConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Fish / harbor tests ────────────────────────────")
	_test_fish_tiles()
	_test_credit_chain_fish()
	_test_fish_config_pools()
	_test_fish_config_pearl_chain()
	_test_enter_harbor()
	_test_note_harbor_turn_tide()
	_test_note_harbor_turn_pearl()
	_test_note_harbor_turn_exit()
	_test_leave_harbor()
	_test_capture_pearl()
	_test_active_biome_pool()
	_test_save_load()
	_test_additive_farm_regression()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + setup helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## A GameState on the farm with `extra` resources added (the harbor has NO tier gate,
## unlike the mine, so a fresh Camp state can launch with supplies).
func _farm_state(extra: Dictionary = {}) -> GameState:
	var g := GameState.new()
	for k in extra.keys():
		_give(g, k, int(extra[k]))
	return g

## A GameState already on a harbor expedition with `turns` turns.
func _harbor_state(turns: int = 5) -> GameState:
	var g := _farm_state({"supplies": turns})
	g.enter_harbor()
	return g

# ── fish tiles (Constants additions) ───────────────────────────────────────────

func _test_fish_tiles() -> void:
	# Produced resources.
	_check(Constants.produced_resource(T.FISH_SARDINE) == "fish_fillet", "SARDINE produces fish_fillet")
	_check(Constants.produced_resource(T.FISH_MACKEREL) == "fish_fillet", "MACKEREL produces fish_fillet")
	_check(Constants.produced_resource(T.FISH_CLAM) == "sea_shells", "CLAM produces sea_shells")
	_check(Constants.produced_resource(T.FISH_OYSTER) == "pearls", "OYSTER produces pearls")
	_check(Constants.produced_resource(T.FISH_KELP) == "fish_oil", "KELP produces fish_oil")
	_check(Constants.produced_resource(T.FISH_PEARL) == "", "FISH_PEARL produces nothing (capture, not chain)")

	# Thresholds (5/5/5/5/6; pearl absent → NO_THRESHOLD).
	_check(Constants.threshold_for(T.FISH_SARDINE) == 5, "SARDINE threshold 5")
	_check(Constants.threshold_for(T.FISH_MACKEREL) == 5, "MACKEREL threshold 5")
	_check(Constants.threshold_for(T.FISH_CLAM) == 5, "CLAM threshold 5")
	_check(Constants.threshold_for(T.FISH_OYSTER) == 5, "OYSTER threshold 5")
	_check(Constants.threshold_for(T.FISH_KELP) == 6, "KELP threshold 6")
	_check(Constants.threshold_for(T.FISH_PEARL) == Constants.NO_THRESHOLD, "FISH_PEARL has NO_THRESHOLD sentinel")

	# String keys.
	_check(Constants.string_key(T.FISH_SARDINE) == "tile_fish_sardine", "SARDINE string key")
	_check(Constants.string_key(T.FISH_KELP) == "tile_fish_kelp", "KELP string key")
	_check(Constants.string_key(T.FISH_PEARL) == "tile_special_giant_pearl", "PEARL string key")
	_check(Constants.string_key(T.FISH_PEARL) == Constants.PEARL_KEY, "PEARL string key == Constants.PEARL_KEY")

	# Categories.
	_check(Constants.category_of(T.FISH_SARDINE) == "fish", "SARDINE category is 'fish'")
	_check(Constants.category_of(T.FISH_OYSTER) == "fish", "OYSTER category is 'fish'")
	_check(Constants.category_of(T.FISH_PEARL) == "fish_pearl", "PEARL category is its own 'fish_pearl'")

	# Existing enum ordinals are UNCHANGED (appending fish must not shift them).
	_check(int(T.GRASS) == 0, "farm GRASS ordinal still 0")
	_check(int(T.HORSE) == 9, "farm HORSE ordinal still 9")
	_check(int(T.STONE) == 10, "mine STONE ordinal still 10")
	_check(int(T.RAT) == 15, "RAT ordinal still 15")
	_check(int(T.RUBBLE) == 16, "RUBBLE ordinal still 16")
	_check(int(T.FISH_SARDINE) == 17, "FISH_SARDINE appended at ordinal 17")
	_check(int(T.FISH_PEARL) == 22, "FISH_PEARL appended at ordinal 22")

	# Pool consts.
	_check(Constants.FISH_POOL.has(T.FISH_SARDINE), "FISH_POOL contains SARDINE")
	_check(Constants.FISH_POOL.has(T.FISH_OYSTER), "FISH_POOL contains OYSTER (rare)")
	_check(not Constants.FISH_POOL.has(T.FISH_PEARL), "FISH_POOL does NOT contain the giant pearl")
	_check(not Constants.FISH_POOL.has(T.GRASS), "FISH_POOL does NOT contain farm GRASS")
	_check(not Constants.FISH_POOL.has(T.STONE), "FISH_POOL does NOT contain mine STONE")
	_check(Constants.TIDE_PERIOD == 3, "TIDE_PERIOD == 3")
	_check(Constants.PEARL_TURNS == 5, "PEARL_TURNS == 5")
	_check(Constants.REQUIRED_FISH_IN_CHAIN == 2, "REQUIRED_FISH_IN_CHAIN == 2")

# ── credit_chain for fish (biome-agnostic) ─────────────────────────────────────

func _test_credit_chain_fish() -> void:
	# Sardine: chain of 5 (threshold 5) → 1 fish_fillet.
	var g := GameState.new()
	var res := g.credit_chain(T.FISH_SARDINE, 5)
	_check(res.get("resource", "") == "fish_fillet", "credit_chain(SARDINE) resource is fish_fillet")
	_check(int(res.get("units", -1)) == 1, "chain of 5 SARDINE → 1 fish_fillet (threshold 5)")
	_check(g.qty("fish_fillet") == 1, "1 fish_fillet landed in the shared inventory")

	# Kelp threshold 6: chain of 6 → 1 fish_oil, chain of 5 → 0.
	var g2 := GameState.new()
	_check(int(g2.credit_chain(T.FISH_KELP, 5).get("units", -1)) == 0, "chain of 5 KELP → 0 (threshold 6)")
	var r2 := g2.credit_chain(T.FISH_KELP, 6)
	_check(int(r2.get("units", -1)) == 1, "chain of 6 KELP crosses 6 → 1 fish_oil (carry 5)")
	_check(g2.qty("fish_oil") == 1, "1 fish_oil after carry-over")
	_check(int(g2.progress.get("fish_oil", -1)) == 5, "leftover fish_oil progress is 5 (11 % 6)")

	# Oyster → pearls.
	var g3 := GameState.new()
	_check(g3.credit_chain(T.FISH_OYSTER, 5).get("resource", "") == "pearls", "OYSTER chain credits pearls")
	_check(g3.qty("pearls") == 1, "1 pearls (resource) from a 5-oyster chain")

	# The giant pearl tile credits NOTHING through credit_chain (it's captured instead).
	var g4 := GameState.new()
	var pr := g4.credit_chain(T.FISH_PEARL, 5)
	_check(int(pr.get("units", -1)) == 0, "FISH_PEARL chain credits 0 units (no threshold)")
	_check(g4.inventory.is_empty(), "FISH_PEARL chain adds nothing to inventory")

# ── FishConfig pools + is_fish_tile ────────────────────────────────────────────

func _test_fish_config_pools() -> void:
	var high := FC.tide_pool("high")
	_check(high == Constants.HIGH_TIDE_POOL, "tide_pool('high') == HIGH_TIDE_POOL contents")
	_check(high.has(T.FISH_SARDINE) and high.has(T.FISH_MACKEREL) and high.has(T.FISH_KELP),
		"high pool has sardine + mackerel + kelp")
	_check(not high.has(T.FISH_CLAM), "high pool has no clam")
	_check(not high.has(T.FISH_OYSTER), "high pool has no oyster")

	var low := FC.tide_pool("low")
	_check(low == Constants.LOW_TIDE_POOL, "tide_pool('low') == LOW_TIDE_POOL contents")
	_check(low.has(T.FISH_CLAM) and low.has(T.FISH_KELP) and low.has(T.FISH_OYSTER),
		"low pool has clam + kelp + oyster")
	_check(not low.has(T.FISH_SARDINE), "low pool has no sardine")

	# tide_pool returns a fresh duplicate (mutating it must not corrupt the const).
	high.append(T.GRASS)
	_check(not Constants.HIGH_TIDE_POOL.has(T.GRASS), "tide_pool returns a copy (const pool untouched)")

	# flip_tide.
	_check(FC.flip_tide("high") == "low", "flip_tide high → low")
	_check(FC.flip_tide("low") == "high", "flip_tide low → high")

	# is_fish_tile: the five catch tiles true; pearl + non-fish false.
	_check(FC.is_fish_tile(T.FISH_SARDINE), "is_fish_tile(SARDINE) true")
	_check(FC.is_fish_tile(T.FISH_KELP), "is_fish_tile(KELP) true")
	_check(not FC.is_fish_tile(T.FISH_PEARL), "is_fish_tile(PEARL) false (own category)")
	_check(not FC.is_fish_tile(T.GRASS), "is_fish_tile(GRASS) false")
	_check(not FC.is_fish_tile(T.STONE), "is_fish_tile(STONE) false")

# ── FishConfig.is_pearl_chain_valid ────────────────────────────────────────────

func _test_fish_config_pearl_chain() -> void:
	# Accepts STRING keys: pearl + 2 fish → true.
	_check(FC.is_pearl_chain_valid([Constants.PEARL_KEY, "tile_fish_sardine", "tile_fish_mackerel"]),
		"pearl + 2 fish (string keys) → valid")
	# Pearl + exactly the required count (2) → true (boundary).
	_check(FC.is_pearl_chain_valid([Constants.PEARL_KEY, "tile_fish_clam", "tile_fish_kelp"]),
		"pearl + exactly 2 fish → valid (boundary)")
	# Pearl + 1 fish → false (one short).
	_check(not FC.is_pearl_chain_valid([Constants.PEARL_KEY, "tile_fish_sardine"]),
		"pearl + 1 fish → invalid (need 2)")
	# No pearl, plenty of fish → false.
	_check(not FC.is_pearl_chain_valid(["tile_fish_sardine", "tile_fish_mackerel", "tile_fish_clam"]),
		"no pearl, 3 fish → invalid")
	# Empty / null → false.
	_check(not FC.is_pearl_chain_valid([]), "empty chain → invalid")

	# Accepts INT tile ordinals too (board may pass raw grid values).
	_check(FC.is_pearl_chain_valid([T.FISH_PEARL, T.FISH_SARDINE, T.FISH_OYSTER]),
		"pearl + 2 fish (int ordinals) → valid")
	_check(not FC.is_pearl_chain_valid([T.FISH_PEARL, T.FISH_SARDINE]),
		"pearl + 1 fish (int ordinals) → invalid")
	# Mixed ints + strings.
	_check(FC.is_pearl_chain_valid([T.FISH_PEARL, "tile_fish_sardine", T.FISH_KELP]),
		"pearl + 2 fish (mixed int/string) → valid")
	# A second pearl does not count toward the fish quota (own category), so two pearls
	# and one fish is still short.
	_check(not FC.is_pearl_chain_valid([Constants.PEARL_KEY, Constants.PEARL_KEY, "tile_fish_sardine"]),
		"two pearls + 1 fish → invalid (pearl never counts as a fish)")
	# Non-fish filler doesn't count: pearl + grass + grass + 1 fish → invalid.
	_check(not FC.is_pearl_chain_valid([Constants.PEARL_KEY, "tile_grass_grass", "tile_fish_sardine"]),
		"pearl + non-fish + 1 fish → invalid (non-fish ignored)")

# ── enter_harbor ───────────────────────────────────────────────────────────────

func _test_enter_harbor() -> void:
	# Fresh farm state with no supplies → can't enter.
	var fresh := GameState.new()
	_check(not fresh.can_enter_harbor(), "fresh state can't enter the harbor (no supplies)")
	_check(fresh.enter_harbor().get("reason", "") == "no_supplies",
		"enter_harbor with no supplies → reason 'no_supplies'")

	# Farm + supplies (NO tier gate) → can enter; converts supplies → turns, sets biome,
	# seeds the pearl, tide reset to high.
	var g := _farm_state({"supplies": 4})
	_check(g.can_enter_harbor(), "farm + supplies>0 → can_enter_harbor true (no tier gate)")
	_check(not g.is_in_harbor(), "(pre) not in the harbor on the farm")
	var res := g.enter_harbor()
	_check(bool(res["ok"]), "enter_harbor succeeds with 4 supplies")
	_check(int(res.get("turns", -1)) == 4, "enter_harbor grants 4 turns (1 per supplies)")
	_check(g.harbor_turns_left == 4, "harbor_turns_left == 4 after entering")
	_check(g.is_in_harbor(), "is_in_harbor() true after entering")
	_check(g.active_biome == "harbor", "active_biome == 'harbor'")
	_check(g.qty("supplies") == 0, "all supplies consumed into turns")
	_check(not g.inventory.has("supplies"), "supplies key erased from inventory")
	_check(g.fish_tide == "high", "tide reset to 'high' on entry")
	_check(g.fish_tide_turn == 0, "fish_tide_turn reset to 0 on entry")
	_check(g.has_active_pearl(), "a giant pearl is seeded on entry")
	_check(int(g.fish_pearl.get("turns_left", -1)) == Constants.PEARL_TURNS,
		"seeded pearl carries PEARL_TURNS countdown")
	_check(g.fish_pearl.has("row") and g.fish_pearl.has("col"), "seeded pearl records a row/col cell")

	# Re-enter while already out → 'already_out', no mutation.
	_give(g, "supplies", 2)
	var again := g.enter_harbor()
	_check(again.get("reason", "") == "already_out", "re-enter while in harbor → 'already_out'")
	_check(g.harbor_turns_left == 4, "turns unchanged by the blocked re-entry")

	# A mine expedition also blocks a harbor launch (one expedition at a time).
	var m := GameState.new()
	m.active_biome = "mine"
	m.mine_turns_left = 3
	_give(m, "supplies", 2)
	_check(not m.can_enter_harbor(), "can't enter the harbor while in the mine")
	_check(m.enter_harbor().get("reason", "") == "already_out", "harbor launch while mining → 'already_out'")

# ── note_harbor_turn — tide cycle ──────────────────────────────────────────────

func _test_note_harbor_turn_tide() -> void:
	# 8 turns so the run survives 6 ticks; assert high→low→high across 6 ticks
	# (TIDE_PERIOD 3, so a flip every 3rd tick).
	var g := _harbor_state(8)
	_check(g.fish_tide == "high", "(setup) starts at high tide")

	# Ticks 1,2: still high (turn 1,2). Tick 3: flips to LOW.
	g.note_harbor_turn(); g.note_harbor_turn()
	_check(g.fish_tide == "high", "still high after 2 ticks")
	var t3 := g.note_harbor_turn()
	_check(g.fish_tide == "low", "tide flips to LOW on the 3rd tick (TIDE_PERIOD)")
	_check(bool(t3.get("tide_flipped", false)), "3rd tick reports tide_flipped true")
	_check(g.fish_tide_turn == 0, "fish_tide_turn resets to 0 on flip")

	# Ticks 4,5: still low. Tick 6: flips back to HIGH.
	g.note_harbor_turn(); g.note_harbor_turn()
	_check(g.fish_tide == "low", "still low after 5 ticks")
	var t6 := g.note_harbor_turn()
	_check(g.fish_tide == "high", "tide flips back to HIGH on the 6th tick")
	_check(bool(t6.get("tide_flipped", false)), "6th tick reports tide_flipped true")

	# current_tide_pool tracks the live tide.
	_check(g.current_tide_pool() == Constants.HIGH_TIDE_POOL, "current_tide_pool() == high pool while high")

# ── note_harbor_turn — pearl countdown ─────────────────────────────────────────

func _test_note_harbor_turn_pearl() -> void:
	# Enter with plenty of turns; the pearl seeds at PEARL_TURNS (5). It should tick down
	# and clear at 0 (the board slice degrades the tile back to kelp).
	var g := _harbor_state(10)
	_check(int(g.fish_pearl.get("turns_left", -1)) == 5, "(setup) pearl seeds at 5")
	for expected in [4, 3, 2, 1]:
		g.note_harbor_turn()
		_check(int(g.fish_pearl.get("turns_left", -1)) == expected, "pearl ticks down to %d" % expected)
		_check(g.has_active_pearl(), "pearl still active at %d turns" % expected)
	# 5th tick: pearl expires (cleared). The harbor itself is still running (10 turns).
	var r := g.note_harbor_turn()
	_check(g.fish_pearl.is_empty(), "pearl cleared when its countdown hits 0")
	_check(not g.has_active_pearl(), "has_active_pearl() false after expiry")
	_check(bool(r.get("pearl_expired", false)), "note_harbor_turn reports pearl_expired on expiry")
	_check(g.is_in_harbor(), "harbor expedition still running after the pearl expired")

# ── note_harbor_turn — exit (soft-fail) ────────────────────────────────────────

func _test_note_harbor_turn_exit() -> void:
	var g := _harbor_state(5)
	# Catch some fish mid-run to prove they survive the exit.
	g.credit_chain(T.FISH_SARDINE, 5)   # → 1 fish_fillet
	_check(g.qty("fish_fillet") == 1, "(setup) caught 1 fish_fillet during the run")

	# Four turns: exited stays false, turns count down 4 → 1.
	for expected in [4, 3, 2, 1]:
		var r := g.note_harbor_turn()
		_check(not bool(r.get("exited", true)), "turn with %d left does NOT exit" % expected)
		_check(int(r.get("turns_left", -1)) == expected, "harbor turns_left == %d" % expected)
		_check(g.is_in_harbor(), "still on the harbor at %d turns" % expected)

	# Fifth turn: exit. Back to the farm, turns 0, pearl cleared.
	var last := g.note_harbor_turn()
	_check(bool(last.get("exited", false)), "fifth turn EXITS the harbor expedition")
	_check(int(last.get("turns_left", -1)) == 0, "turns_left == 0 on exit")
	_check(not g.is_in_harbor(), "back on the farm after the last turn")
	_check(g.active_biome == "farm", "active_biome reset to 'farm'")
	_check(g.fish_pearl.is_empty(), "pearl cleared on harbor exit")
	# Catch is KEPT (soft-fail).
	_check(g.qty("fish_fillet") == 1, "fish caught during the run survives the exit")

# ── leave_harbor (manual early exit) ───────────────────────────────────────────

func _test_leave_harbor() -> void:
	var g := _harbor_state(4)
	g.credit_chain(T.FISH_CLAM, 5)      # → 1 sea_shells
	g.note_harbor_turn()                # spend one (3 left)
	_check(g.harbor_turns_left == 3, "(setup) 3 turns left mid-run")
	g.leave_harbor()
	_check(not g.is_in_harbor(), "leave_harbor returns to the farm")
	_check(g.harbor_turns_left == 0, "leave_harbor zeroes the remaining turns")
	_check(g.active_biome == "farm", "active_biome is 'farm' after leaving")
	_check(g.fish_pearl.is_empty(), "pearl cleared after leaving")
	_check(g.qty("sea_shells") == 1, "catch gathered before leaving is kept")

# ── try_capture_pearl (pearl → rune) ───────────────────────────────────────────

func _test_capture_pearl() -> void:
	var g := _harbor_state(8)
	_check(g.runes == 0, "(setup) 0 runes before capture")
	_check(g.has_active_pearl(), "(setup) a pearl is live")

	# An INVALID chain (pearl + 1 fish) does NOT capture and does NOT clear the pearl.
	var bad := g.try_capture_pearl([Constants.PEARL_KEY, "tile_fish_sardine"])
	_check(not bool(bad.get("captured", true)), "pearl + 1 fish → not captured")
	_check(g.runes == 0, "no rune granted for an invalid chain")
	_check(g.has_active_pearl(), "pearl still live after an invalid chain")

	# A VALID chain captures: +1 rune, pearl cleared.
	var ok := g.try_capture_pearl([Constants.PEARL_KEY, "tile_fish_sardine", "tile_fish_mackerel"])
	_check(bool(ok.get("captured", false)), "pearl + 2 fish → captured")
	_check(int(ok.get("runes", -1)) == 1, "capture returns runes == 1")
	_check(g.runes == 1, "+1 rune granted on capture")
	_check(g.fish_pearl.is_empty(), "pearl cleared after capture")

	# No DOUBLE-grant: a second valid chain with the pearl gone captures nothing.
	var again := g.try_capture_pearl([Constants.PEARL_KEY, "tile_fish_sardine", "tile_fish_mackerel"])
	_check(not bool(again.get("captured", true)), "no double-grant once the pearl is captured")
	_check(g.runes == 1, "rune count unchanged on the second attempt")

	# Off the harbor, a valid chain captures nothing (guard).
	var farm := GameState.new()
	var off := farm.try_capture_pearl([Constants.PEARL_KEY, "tile_fish_sardine", "tile_fish_mackerel"])
	_check(not bool(off.get("captured", true)), "no capture off the harbor")
	_check(farm.runes == 0, "no rune off the harbor")

# ── active_biome_pool (farm / mine / harbor) ───────────────────────────────────

func _test_active_biome_pool() -> void:
	# On the farm → the farm's season-weighted pool (active_tile_pool), NOT the fish pool.
	# A1: active_biome_pool falls back to active_tile_pool on the farm, which is now the
	# season-weighted base pool rather than the flat FARM_POOL — assert that identity.
	var farm := GameState.new()
	_check(farm.active_biome_pool() == farm.active_tile_pool(), "farm pool is the farm tile pool")
	_check(not farm.active_biome_pool().has(T.FISH_SARDINE), "farm pool has no fish")

	# In the mine → mine pool + rubble (unaffected by fish).
	var mine := GameState.new()
	mine.active_biome = "mine"
	mine.mine_turns_left = 3
	var mpool := mine.active_biome_pool()
	_check(mpool.size() == Constants.MINE_POOL.size() + Constants.RUBBLE_POOL_SLOTS,
		"mine pool == MINE_POOL + rubble (fish did not change it)")
	_check(mpool.has(T.STONE) and not mpool.has(T.FISH_SARDINE), "mine pool has stone, no fish")

	# In the harbor → the FISH_POOL.
	var harbor := _harbor_state(5)
	var hpool := harbor.active_biome_pool()
	_check(hpool == Constants.FISH_POOL, "harbor pool == FISH_POOL")
	_check(hpool.has(T.FISH_SARDINE) and hpool.has(T.FISH_OYSTER), "harbor pool has sardine + oyster")
	_check(not hpool.has(T.GRASS) and not hpool.has(T.STONE), "harbor pool has no farm/mine tiles")
	_check(not hpool.has(T.FISH_PEARL), "harbor pool does NOT include the giant pearl")
	# Returned pool is a copy — mutating it must not corrupt FISH_POOL.
	hpool.append(T.GRASS)
	_check(not Constants.FISH_POOL.has(T.GRASS), "active_biome_pool() returns a copy of FISH_POOL")

# ── save / load of the harbor state ────────────────────────────────────────────

func _test_save_load() -> void:
	# Enter a harbor, tick once (advance the tide turn + pearl), catch a fish, round-trip.
	var g := _harbor_state(6)
	g.note_harbor_turn()                # tide_turn 1, pearl 4
	g.credit_chain(T.FISH_OYSTER, 5)    # → 1 pearls (resource), shared inventory
	g.runes = 2                         # pretend a prior capture
	var d := g.to_dict()
	_check(d.get("active_biome", "") == "harbor", "to_dict carries active_biome 'harbor'")
	_check(int(d.get("harbor_turns_left", -1)) == 5, "to_dict carries harbor_turns_left 5")
	_check(d.get("fish_tide", "") == "high", "to_dict carries fish_tide 'high'")
	_check(int(d.get("fish_tide_turn", -1)) == 1, "to_dict carries fish_tide_turn 1")
	_check(int(d.get("runes", -1)) == 2, "to_dict carries runes 2")
	_check((d.get("fish_pearl", {}) as Dictionary).get("turns_left", -1) == 4, "to_dict carries pearl turns_left 4")

	var loaded := GameState.from_dict(d)
	_check(loaded.active_biome == "harbor", "from_dict restores active_biome 'harbor'")
	_check(loaded.harbor_turns_left == 5, "from_dict restores harbor_turns_left 5")
	_check(loaded.is_in_harbor(), "loaded state reports is_in_harbor() true")
	_check(loaded.fish_tide == "high", "from_dict restores fish_tide 'high'")
	_check(loaded.fish_tide_turn == 1, "from_dict restores fish_tide_turn 1")
	_check(loaded.runes == 2, "from_dict restores runes 2")
	_check(loaded.has_active_pearl(), "from_dict restores the live pearl")
	_check(int(loaded.fish_pearl.get("turns_left", -1)) == 4, "from_dict restores pearl turns_left 4")
	_check(loaded.qty("pearls") == 1, "shared inventory (pearls) round-trips alongside the harbor")

	# Corrupt: harbor with 0 turns snaps back to the farm.
	var corrupt := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "harbor", "harbor_turns_left": 0,
	}
	var c := GameState.from_dict(corrupt)
	_check(c.active_biome == "farm", "corrupt harbor-with-0-turns save loads as 'farm'")
	_check(c.harbor_turns_left == 0, "corrupt save's harbor turns clamp to 0")

	# Unknown tide string falls back to high; a stale pearl on a non-harbor save is dropped.
	var bad_tide := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "harbor", "harbor_turns_left": 2,
		"fish_tide": "tsunami", "fish_pearl": {"row": 1, "col": 1, "turns_left": 3},
	}
	var bt := GameState.from_dict(bad_tide)
	_check(bt.fish_tide == "high", "unknown tide string falls back to 'high'")
	_check(bt.has_active_pearl(), "well-formed pearl on a harbor save is restored")

	# A pearl on a non-harbor (farm) save is dropped, and harbor turns are zeroed.
	var stale_pearl := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "farm", "harbor_turns_left": 4,
		"fish_pearl": {"row": 0, "col": 0, "turns_left": 2},
	}
	var sp := GameState.from_dict(stale_pearl)
	_check(sp.fish_pearl.is_empty(), "pearl on a non-harbor save is dropped")
	_check(sp.harbor_turns_left == 0, "harbor turns zeroed on a non-harbor save")

	# An OLD save (no harbor fields at all) loads with harbor defaults — additive proof.
	var old := {
		"inventory": {"flour": 3}, "progress": {}, "coins": 9, "turn": 5,
		"settlement": {"tier": 2}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
	}
	var o := GameState.from_dict(old)
	_check(o.active_biome == "farm", "old save (no harbor) loads as 'farm'")
	_check(o.harbor_turns_left == 0, "old save defaults harbor_turns_left 0")
	_check(o.fish_tide == "high", "old save defaults fish_tide 'high'")
	_check(o.fish_pearl.is_empty(), "old save has no pearl")
	_check(o.runes == 0, "old save defaults runes 0")
	_check(o.qty("flour") == 3, "old save's existing inventory still loads")

# ── ADDITIVE regression: farm/mine behave exactly as before ────────────────────

func _test_additive_farm_regression() -> void:
	# A fresh GameState is on the farm with every harbor field at its default.
	var g := GameState.new()
	_check(g.active_biome == "farm", "fresh state is on the farm")
	_check(not g.is_in_harbor(), "fresh state is not in the harbor")
	_check(g.harbor_turns_left == 0, "fresh state has 0 harbor turns")
	_check(g.fish_tide == "high", "fresh state defaults tide high")
	_check(g.fish_pearl.is_empty(), "fresh state has no pearl")
	_check(g.runes == 0, "fresh state has 0 runes")

	# Harbor methods are no-ops / guarded off the harbor.
	_check(not g.try_capture_pearl([Constants.PEARL_KEY, "tile_fish_sardine", "tile_fish_mackerel"]).get("captured", true),
		"try_capture_pearl is a no-op on the farm")
	_check(g.runes == 0, "no rune from a farm capture attempt")

	# Farm crediting is byte-identical to the pre-fish economy: a 6-grass chain
	# (threshold 6) → 1 hay_bundle, exactly as before.
	var r := g.credit_chain(T.GRASS, 6)
	_check(r.get("resource", "") == "hay_bundle", "farm GRASS still credits hay_bundle")
	_check(int(r.get("units", -1)) == 1, "6 GRASS → 1 hay_bundle (unchanged)")
	_check(g.qty("hay_bundle") == 1, "hay_bundle landed in inventory (unchanged)")
	# Adding the harbor did not perturb the farm pool (A1: the farm pool is the
	# season-weighted active_tile_pool — the harbor never touches it).
	_check(g.active_biome_pool() == g.active_tile_pool(), "farm pool still the farm tile pool")
