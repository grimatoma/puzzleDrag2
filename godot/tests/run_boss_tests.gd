extends SceneTree
## Headless unit-test runner for the M3g capstone boss (Frostmaw). Covers the
## BossConfig catalog + its unknown-id safe defaults, the GameState boss API
## (can_challenge_boss gating, start_boss guards, boss_min_chain, damage_boss to
## defeat), and save/load round-tripping + sanitisation of the boss state. Run from
## the godot/ project root:
##   godot --headless --script res://tests/run_boss_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_mine_tests.gd. `class_name`
## globals are aliased with `var` (not const) because a class_name ref is not a
## constant expression in 4.6.

const T := Constants.Tile
# class_name globals → plain member vars (not const; see header note).
var BOSS := BossConfig
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Capstone boss tests ────────────────────────────")
	_test_boss_config()
	_test_can_challenge_gating()
	_test_start_boss()
	_test_damage_boss()
	_test_post_defeat()
	_test_save_load()
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

## Add `amount` of `resource` to a GameState inventory directly (test helper).
func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## A GameState parked at City tier (where the boss unlocks) with `extra` resources.
func _city_state(extra: Dictionary = {}) -> GameState:
	var g := GameState.new()
	g.settlement.tier = TC.TIER_CITY
	for k in extra.keys():
		_give(g, k, int(extra[k]))
	return g

## A ready-to-fight state: City tier with 12 combined mine goods (block 6 + iron_bar 6).
func _ready_state() -> GameState:
	return _city_state({"block": 6, "iron_bar": 6})

# ── BossConfig catalog ────────────────────────────────────────────────────────

func _test_boss_config() -> void:
	_check(BOSS.is_boss(BOSS.FROSTMAW), "frostmaw is a real boss")
	_check(BOSS.boss_name(BOSS.FROSTMAW) == "Frostmaw", "frostmaw name")
	_check(BOSS.boss_hp(BOSS.FROSTMAW) == 40, "frostmaw hp is 40")
	_check(BOSS.boss_min_chain(BOSS.FROSTMAW) == 4, "frostmaw min_chain is 4")
	_check(BOSS.boss_reward(BOSS.FROSTMAW) == 500, "frostmaw reward is 500")
	_check(BOSS.boss_desc(BOSS.FROSTMAW) != "", "frostmaw has a description")
	_check(BOSS.BOSS_IDS == [BOSS.FROSTMAW], "BOSS_IDS lists frostmaw only")

	# Unknown ids return safe defaults.
	_check(not BOSS.is_boss("nope"), "is_boss('nope') is false")
	_check(BOSS.boss_name("x") == "", "unknown boss_name is ''")
	_check(BOSS.boss_hp("x") == 0, "unknown boss_hp is 0")
	_check(BOSS.boss_min_chain("x") == Constants.MIN_CHAIN,
		"unknown boss_min_chain falls back to Constants.MIN_CHAIN")
	_check(BOSS.boss_reward("x") == 0, "unknown boss_reward is 0")
	_check(BOSS.boss_desc("x") == "", "unknown boss_desc is ''")

# ── can_challenge_boss gating ─────────────────────────────────────────────────

func _test_can_challenge_gating() -> void:
	# Fresh GameState (Camp tier, no mine goods) → can't challenge.
	var fresh := GameState.new()
	_check(not fresh.can_challenge_boss(), "fresh state (Camp, no goods) can't challenge")

	# City tier but 0 mine resources → can't challenge.
	var no_goods := _city_state()
	_check(not no_goods.can_challenge_boss(), "City with 0 mine goods can't challenge")

	# City tier with block 6 + iron_bar 6 (sum 12) → can challenge.
	var ready := _ready_state()
	_check(ready.can_challenge_boss(), "City + 12 mine goods CAN challenge")

	# Below City WITH the resources → can't (tier gate).
	var low := GameState.new()
	low.settlement.tier = TC.TIER_TOWN
	_give(low, "block", 6)
	_give(low, "iron_bar", 6)
	_check(not low.can_challenge_boss(), "Town tier with the goods still can't challenge (needs City)")

	# After Town 2 is complete → can't challenge again.
	var done := _ready_state()
	done.town2_complete = true
	_check(not done.can_challenge_boss(), "town2_complete state can't challenge")

# ── start_boss ────────────────────────────────────────────────────────────────

func _test_start_boss() -> void:
	# Non-City state → locked, no mutation.
	var low := GameState.new()
	low.settlement.tier = TC.TIER_TOWN
	_give(low, "block", 6)
	_give(low, "iron_bar", 6)
	var locked := low.start_boss()
	_check(locked.get("ok", true) == false, "start_boss below City → ok false")
	_check(locked.get("reason", "") == "locked", "start_boss below City → reason 'locked'")
	_check(not low.is_boss_active(), "no boss armed after a locked start")
	_check(low.boss_hp == 0, "boss_hp untouched after a locked start")

	# Ready state → ok, boss armed at full HP, raised chain bar.
	var g := _ready_state()
	_check(g.boss_min_chain() == Constants.MIN_CHAIN, "(pre) boss_min_chain is base before the fight")
	var res := g.start_boss()
	_check(bool(res.get("ok", false)), "start_boss succeeds from a ready state")
	_check(g.is_boss_active(), "is_boss_active() true after start")
	_check(g.boss_active == BOSS.FROSTMAW, "boss_active is frostmaw")
	_check(g.boss_hp == 40, "boss_hp == 40 after start")
	_check(g.boss_min_chain() == 4, "boss_min_chain() == 4 while fighting")
	_check(int(res.get("min_chain", -1)) == 4, "start_boss result carries min_chain 4")

	# Starting again while active → in_fight, no mutation.
	var again := g.start_boss()
	_check(again.get("reason", "") == "in_fight", "re-start while active → reason 'in_fight'")
	_check(g.boss_hp == 40, "boss_hp unchanged by the blocked re-start")

# ── damage_boss ───────────────────────────────────────────────────────────────

func _test_damage_boss() -> void:
	var g := _ready_state()
	_check(g.start_boss()["ok"], "(setup) armed the boss for damage tests")
	var coins_before: int = g.coins

	# First chain of 4: not defeated, hp 40 → 36.
	var r1 := g.damage_boss(4)
	_check(bool(r1.get("active", false)), "damage_boss reports active")
	_check(not bool(r1.get("defeated", true)), "chain of 4 does NOT defeat (hp 36)")
	_check(int(r1.get("hp", -1)) == 36, "damage_boss returns remaining hp 36")
	_check(g.boss_hp == 36, "boss_hp is 36 after a 4-chain")

	# Accumulate several chains down toward the kill. 36 → 8 over chains of 8,8,8,4.
	for d in [8, 8, 8, 4]:
		g.damage_boss(d)
	_check(g.boss_hp == 8, "boss_hp is 8 after accumulated chains")
	_check(g.is_boss_active(), "still fighting at 8 hp")
	_check(g.coins == coins_before, "no coins credited before defeat")

	# The killing blow OVERSHOOTS (chain of 10 vs 8 hp) → hp clamps to 0 and defeats.
	var kill := g.damage_boss(10)
	_check(bool(kill.get("defeated", false)), "overshoot chain defeats the boss")
	_check(int(kill.get("reward", -1)) == 500, "defeat returns reward 500")
	_check(kill.get("name", "") == "Frostmaw", "defeat returns the boss name")
	_check(g.town2_complete, "town2_complete set on defeat")
	_check(g.coins == coins_before + 500, "500 reward coins credited on defeat")
	_check(not g.is_boss_active(), "boss cleared after defeat")
	_check(g.boss_active == "", "boss_active back to '' after defeat")
	_check(g.boss_min_chain() == Constants.MIN_CHAIN,
		"boss_min_chain() back to base after defeat")

	# damage_boss with no boss active → {active:false}, no coin change.
	var coins_now: int = g.coins
	var none := g.damage_boss(6)
	_check(none.get("active", true) == false, "damage_boss with no boss → active false")
	_check(g.coins == coins_now, "no coin change when damaging with no boss")

# ── post-defeat ───────────────────────────────────────────────────────────────

func _test_post_defeat() -> void:
	var g := _ready_state()
	_check(g.start_boss()["ok"], "(setup) armed the boss")
	g.damage_boss(40)              # one big chain kills it outright
	_check(g.town2_complete, "(setup) boss defeated, town2_complete true")

	# Even fully re-stocked, the fight can't be re-challenged.
	_give(g, "block", 6)
	_give(g, "iron_bar", 6)
	_check(not g.can_challenge_boss(), "can_challenge_boss() false after defeat (already done)")
	var re := g.start_boss()
	_check(re.get("ok", true) == false, "start_boss after defeat → ok false")
	_check(re.get("reason", "") == "already_done", "start_boss after defeat → reason 'already_done'")

# ── save / load of the boss state ─────────────────────────────────────────────

func _test_save_load() -> void:
	# Start a fight, damage it to hp 28, round-trip → preserved, town2 still false.
	var g := _ready_state()
	_check(g.start_boss()["ok"], "(setup) armed the boss for save test")
	g.damage_boss(12)             # 40 → 28
	_check(g.boss_hp == 28, "(setup) boss at 28 hp before save")
	var d := g.to_dict()
	_check(d.get("boss_active", "") == "frostmaw", "to_dict carries boss_active 'frostmaw'")
	_check(int(d.get("boss_hp", -1)) == 28, "to_dict carries boss_hp 28")
	_check(d.get("town2_complete", true) == false, "to_dict carries town2_complete false")
	var loaded := GameState.from_dict(d)
	_check(loaded.boss_active == "frostmaw", "from_dict restores boss_active 'frostmaw'")
	_check(loaded.boss_hp == 28, "from_dict restores boss_hp 28")
	_check(loaded.town2_complete == false, "from_dict restores town2_complete false")
	_check(loaded.is_boss_active(), "loaded mid-fight state reports is_boss_active() true")
	_check(loaded.boss_min_chain() == 4, "loaded mid-fight state keeps the raised chain bar")

	# A corrupt save with a bogus boss id → sanitised to "" (no fight), hp snaps to 0.
	var bad_id := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "dragon", "boss_hp": 30, "town2_complete": false,
	}
	var b := GameState.from_dict(bad_id)
	_check(b.boss_active == "", "bogus boss id sanitises to '' (no fight)")
	_check(b.boss_hp == 0, "no-fight save snaps boss_hp to 0")
	_check(not b.is_boss_active(), "sanitised save reports no active boss")

	# A real boss id but a NEGATIVE hp clamps to 0.
	var neg := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "frostmaw", "boss_hp": -5, "town2_complete": false,
	}
	var n := GameState.from_dict(neg)
	_check(n.boss_hp == 0, "negative boss_hp clamps to 0")

	# Defeat the boss, save, load → town2_complete preserved true, boss_active "".
	var won := _ready_state()
	_check(won.start_boss()["ok"], "(setup) armed the boss to defeat + save")
	won.damage_boss(40)
	_check(won.town2_complete, "(setup) boss defeated before save")
	var wd := won.to_dict()
	var wl := GameState.from_dict(wd)
	_check(wl.town2_complete == true, "from_dict preserves town2_complete true after a win")
	_check(wl.boss_active == "", "from_dict keeps boss_active '' after a win")
	_check(wl.boss_hp == 0, "from_dict keeps boss_hp 0 after a win")
