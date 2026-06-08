extends SceneTree
## Headless unit-test runner for the A1 SEASONS system + zone tile-eligibility:
## Constants.season_index / SEASONS palette, the ZoneConfig home-farm template
## (eligible categories + per-season drop weights + the upgrade map), and the
## GameState farm season cycle (current_season_index/name, note_farm_turn, and the
## season-weighted, zone-RESTRICTED active_tile_pool). The headline bug fix asserted
## here: a fresh home farm base-spawns ONLY the six eligible categories (grass/grain/
## trees/birds/veg/fruit) and NEVER PANSY/PIG/COW/HORSE.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_seasons_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_state_tests.gd. `class_name` globals
## (ZoneConfig) are referenced statically (no instance needed).

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Seasons + zone-eligibility tests ───────────────")
	_test_season_index_boundaries()
	_test_seasons_palette()
	_test_zone_config_home()
	_test_game_state_season_cycle()
	_test_note_farm_turn_advances_and_harvests()
	_test_pool_is_zone_restricted_spring()
	_test_pool_season_weighting()
	_test_pool_spawner_boost()
	_test_pool_keeps_rats()
	_test_save_load_round_trip()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + count helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## Count occurrences of `tile` in a pool Array.
func _count(pool: Array, tile: int) -> int:
	var n := 0
	for x in pool:
		if int(x) == tile:
			n += 1
	return n

# ── Constants.season_index boundaries (verbatim from seasonIndexInSession) ─────

func _test_season_index_boundaries() -> void:
	# Budget 10 (the home zone): the four seasons split the budget by REMAINING turns.
	#   Spring while remaining > 7.5, Summer > 5.0, Autumn > 2.5, else Winter.
	_check(Constants.season_index(0, 10) == 0, "budget 10, used 0 → Spring (rem 10 > 7.5)")
	_check(Constants.season_index(2, 10) == 0, "budget 10, used 2 → Spring (rem 8 > 7.5)")
	_check(Constants.season_index(3, 10) == 1, "budget 10, used 3 → Summer (rem 7)")
	_check(Constants.season_index(4, 10) == 1, "budget 10, used 4 → Summer (rem 6 > 5.0)")
	_check(Constants.season_index(5, 10) == 2, "budget 10, used 5 → Autumn (rem 5)")
	_check(Constants.season_index(7, 10) == 2, "budget 10, used 7 → Autumn (rem 3 > 2.5)")
	_check(Constants.season_index(8, 10) == 3, "budget 10, used 8 → Winter (rem 2)")
	_check(Constants.season_index(9, 10) == 3, "budget 10, used 9 → Winter (rem 1)")
	# A non-positive budget pins Spring (the React guard).
	_check(Constants.season_index(5, 0) == 0, "budget 0 → always Spring")
	_check(Constants.season_index(99, -3) == 0, "negative budget → always Spring")
	# The name helper indexes SEASON_NAMES.
	_check(Constants.season_name(0, 10) == "Spring", "season_name(0,10) == Spring")
	_check(Constants.season_name(9, 10) == "Winter", "season_name(9,10) == Winter")
	_check(Constants.SEASON_NAMES == ["Spring", "Summer", "Autumn", "Winter"], "SEASON_NAMES order")

# ── SEASONS palette (verbatim hex from src/constants.ts SEASONS) ───────────────

func _test_seasons_palette() -> void:
	_check(Constants.SEASONS.size() == 4, "four SEASONS")
	var spring: Dictionary = Constants.SEASONS[0]
	_check(spring["name"] == "Spring", "SEASONS[0] is Spring")
	_check(int(spring["bg"]) == 0x7dbd48, "Spring bg hex matches React (0x7dbd48)")
	_check(int(spring["fill"]) == 0x8fd85a, "Spring fill hex matches React (0x8fd85a)")
	_check(int(spring["accent"]) == 0x5daa35, "Spring accent hex matches React (0x5daa35)")
	var winter: Dictionary = Constants.SEASONS[3]
	_check(winter["name"] == "Winter", "SEASONS[3] is Winter")
	_check(int(winter["bg"]) == 0x78aaca, "Winter bg hex matches React (0x78aaca)")
	_check(int(winter["fill"]) == 0x91d9ff, "Winter fill hex matches React (0x91d9ff)")
	_check(int(winter["accent"]) == 0xd9f6ff, "Winter accent hex matches React (0xd9f6ff)")

# ── ZoneConfig home-farm template ──────────────────────────────────────────────

func _test_zone_config_home() -> void:
	_check(ZoneConfig.has_zone("home"), "home is a real zone")
	_check(not ZoneConfig.has_zone("nope"), "'nope' is not a zone")
	_check(ZoneConfig.base_turns("home") == 10, "home base_turns == 10 (React baseTurns)")
	_check(ZoneConfig.base_turns("nope") == 0, "unknown zone base_turns == 0")

	# The eligible base-spawn categories = the upgradeMap KEYS = exactly the six.
	var elig: Array = ZoneConfig.eligible_categories("home")
	_check(elig.size() == 6, "home has exactly 6 eligible categories")
	for cat in ["grass", "grain", "trees", "birds", "veg", "fruit"]:
		_check(elig.has(cat), "eligible categories include '%s'" % cat)
	# The ineligible categories are NOT keys (so their tiles never base-spawn).
	for cat in ["flower", "herd", "cattle", "mount"]:
		_check(not elig.has(cat), "eligible categories EXCLUDE '%s'" % cat)

	# The upgrade map targets (carried for the follow-up upgrade-tile milestone).
	_check(ZoneConfig.upgrade_target("home", "grass") == "birds", "grass upgrades to birds")
	_check(ZoneConfig.upgrade_target("home", "grain") == "veg", "grain upgrades to veg")
	_check(ZoneConfig.upgrade_target("home", "trees") == "birds", "trees upgrades to birds")
	_check(ZoneConfig.upgrade_target("home", "birds") == "herd", "birds upgrades to herd")
	_check(ZoneConfig.upgrade_target("home", "veg") == "fruit", "veg upgrades to fruit")
	_check(ZoneConfig.upgrade_target("home", "fruit") == ZoneConfig.GOLD, "fruit upgrades to GOLD sentinel")
	_check(ZoneConfig.upgrade_target("home", "flower") == "", "ineligible 'flower' has no upgrade target")

	# Per-season drop weights match the React seasonDrops verbatim.
	var spring := ZoneConfig.season_drops("home", "Spring")
	_check(is_equal_approx(float(spring.get("grass", -1.0)), 0.38), "Spring grass weight 0.38")
	_check(is_equal_approx(float(spring.get("trees", -1.0)), 0.20), "Spring trees weight 0.20")
	_check(is_equal_approx(float(spring.get("fruit", -1.0)), 0.04), "Spring fruit weight 0.04")
	_check(is_equal_approx(float(spring.get("flower", -1.0)), 0.0), "Spring flower weight 0 (excluded)")
	var winter := ZoneConfig.season_drops("home", "Winter")
	_check(is_equal_approx(float(winter.get("trees", -1.0)), 0.73), "Winter trees weight 0.73 (dominant)")
	_check(is_equal_approx(float(winter.get("grass", -1.0)), 0.05), "Winter grass weight 0.05")
	# season_drops returns a COPY — mutating it must not corrupt the template.
	spring["grass"] = 999.0
	_check(is_equal_approx(float(ZoneConfig.season_drops("home", "Spring").get("grass", -1.0)), 0.38),
		"season_drops returns a defensive copy")

# ── GameState season-cycle derivation ──────────────────────────────────────────

func _test_game_state_season_cycle() -> void:
	var g := GameState.new()
	_check(g.farm_turn_budget() == 10, "farm_turn_budget == ZoneConfig.base_turns('home') (10)")
	_check(g.farm_turns_used == 0, "fresh farm: 0 turns used")
	_check(g.current_season_index() == 0, "fresh farm is Spring (index 0)")
	_check(g.current_season_name() == "Spring", "fresh farm season name is Spring")
	# Park mid-cycle and confirm the derived season tracks the counter.
	g.farm_turns_used = 5
	_check(g.current_season_index() == 2, "used 5 of 10 → Autumn (index 2)")
	_check(g.current_season_name() == "Autumn", "used 5 of 10 → Autumn name")
	g.farm_turns_used = 9
	_check(g.current_season_name() == "Winter", "used 9 of 10 → Winter")

# ── note_farm_turn advances + harvests at the budget ───────────────────────────

func _test_note_farm_turn_advances_and_harvests() -> void:
	var g := GameState.new()
	# Tick to the brink of the budget; never a harvest until the boundary, and the biome
	# never changes (the farm is the persistent home board, unlike the expeditions).
	for i in 9:
		var r := g.note_farm_turn()
		_check(not bool(r.get("harvest", true)), "farm turn #%d is NOT a harvest" % (i + 1))
		_check(g.active_biome == "farm", "farm biome unchanged after turn #%d" % (i + 1))
	_check(g.farm_turns_used == 9, "9 turns used after 9 ticks")
	_check(g.current_season_name() == "Winter", "in Winter just before the harvest")
	# The 10th turn REACHES the budget → harvest: wrap back to a fresh Spring (0 used).
	var h := g.note_farm_turn()
	_check(bool(h.get("harvest", false)), "10th farm turn IS a harvest (reached the budget)")
	_check(String(h.get("season", "")) == "Winter", "the harvested season was Winter")
	_check(g.farm_turns_used == 0, "harvest wraps farm_turns_used back to 0")
	_check(g.current_season_name() == "Spring", "post-harvest season is Spring again")
	_check(g.active_biome == "farm", "harvest does NOT leave the farm (no return-to-town)")
	# The summary carries the budget + economy snapshot for the later harvest modal.
	_check(int(h.get("budget", -1)) == 10, "harvest summary carries the turn budget")
	_check(h.has("coins") and h.has("runes"), "harvest summary carries coins + runes fields")

# ── the headline bug fix: zone-restricted Spring pool ──────────────────────────

func _test_pool_is_zone_restricted_spring() -> void:
	var g := GameState.new()   # fresh home farm, Spring
	var pool: Array = g.active_tile_pool()
	_check(pool.size() > 0, "fresh Spring farm pool is non-empty")
	# All SIX eligible categories' tiles are present.
	_check(_count(pool, T.GRASS) > 0, "Spring pool contains GRASS")
	_check(_count(pool, T.WHEAT) > 0, "Spring pool contains WHEAT (grain)")
	_check(_count(pool, T.OAK) > 0, "Spring pool contains OAK (trees)")
	_check(_count(pool, T.PHEASANT) > 0, "Spring pool contains PHEASANT (birds)")
	_check(_count(pool, T.CARROT) > 0, "Spring pool contains CARROT (veg)")
	_check(_count(pool, T.APPLE) > 0, "Spring pool contains APPLE (fruit)")
	# The headline regression guard: NONE of the ineligible tiles base-spawn.
	_check(_count(pool, T.PANSY) == 0, "Spring pool has NO PANSY (flower not eligible)")
	_check(_count(pool, T.PIG) == 0, "Spring pool has NO PIG (herd not eligible)")
	_check(_count(pool, T.COW) == 0, "Spring pool has NO COW (cattle not eligible)")
	_check(_count(pool, T.HORSE) == 0, "Spring pool has NO HORSE (mount not eligible)")
	# And no hazards / mine tiles leak into the fresh farm pool.
	_check(_count(pool, T.RAT) == 0, "fresh farm pool has no RAT (rats off)")
	_check(_count(pool, T.STONE) == 0, "farm pool has no mine tiles")

# ── season weighting shifts the dominant tile ──────────────────────────────────

func _test_pool_season_weighting() -> void:
	# Spring: grass dominant (.38), birds rare (.05) → far more grass than birds.
	var spring_g := GameState.new()
	spring_g.farm_turns_used = 0
	var sp := spring_g.active_tile_pool()
	_check(_count(sp, T.GRASS) > _count(sp, T.PHEASANT),
		"Spring: GRASS slots > BIRDS slots (.38 vs .05)")
	_check(_count(sp, T.GRASS) > _count(sp, T.OAK),
		"Spring: GRASS slots > TREES slots (.38 vs .20)")
	# Winter (used 9 of 10): trees dominant (.73) → trees outnumber grass heavily.
	var winter_g := GameState.new()
	winter_g.farm_turns_used = 9
	_check(winter_g.current_season_name() == "Winter", "(setup) winter_g is in Winter")
	var wp := winter_g.active_tile_pool()
	_check(_count(wp, T.OAK) > _count(wp, T.GRASS),
		"Winter: TREES slots > GRASS slots (.73 vs .05)")
	_check(_count(wp, T.OAK) > _count(wp, T.PHEASANT),
		"Winter: TREES slots dominate BIRDS too (.73 vs .10)")
	# Both seasons still EXCLUDE the ineligible tiles.
	_check(_count(wp, T.HORSE) == 0 and _count(wp, T.PIG) == 0,
		"Winter pool still excludes HORSE/PIG")

# ── a spawner BOOSTS its eligible category (does not unlock an ineligible one) ──

func _test_pool_spawner_boost() -> void:
	var g := GameState.new()           # Spring
	var oak_base := _count(g.active_tile_pool(), T.OAK)
	# Place a Lumber Camp (trees spawner). Trees is already eligible — the spawner BOOSTS it.
	g.settlement.tier = TownConfig.TIER_HAMLET
	g.inventory["hay_bundle"] = 50
	g.inventory["flour"] = 50
	_check(g.build(BuildingConfig.LUMBER_CAMP)["ok"], "(setup) built a Lumber Camp")
	var boosted := _count(g.active_tile_pool(), T.OAK)
	_check(boosted == oak_base + GameState.SPAWNER_BOOST_SLOTS,
		"Lumber Camp BOOSTS OAK slots by SPAWNER_BOOST_SLOTS (%d)" % GameState.SPAWNER_BOOST_SLOTS)
	# The boost is a weight bump, not a category unlock: still no ineligible tiles.
	var pool := g.active_tile_pool()
	_check(_count(pool, T.PANSY) == 0 and _count(pool, T.PIG) == 0,
		"a spawner never smuggles an ineligible tile onto the home farm")

# ── rats still seed the farm pool (existing semantics preserved) ───────────────

func _test_pool_keeps_rats() -> void:
	var g := GameState.new()
	g.town2_complete = true            # rats_enabled → true
	_check(g.rats_enabled(), "(setup) rats enabled (Town 2 complete)")
	var pool := g.active_tile_pool()
	_check(_count(pool, T.RAT) == Constants.RAT_POOL_SLOTS,
		"rats still seed the farm pool with RAT_POOL_SLOTS rats")
	# Rats ride ON TOP of the season-restricted base — the eligible tiles are still present and
	# the ineligible ones still absent.
	_check(_count(pool, T.GRASS) > 0, "season base still present alongside rats")
	_check(_count(pool, T.HORSE) == 0, "rats do not re-introduce ineligible tiles")

# ── save / load round-trips the season counter ─────────────────────────────────

func _test_save_load_round_trip() -> void:
	var g := GameState.new()
	g.farm_turns_used = 6              # mid-cycle (Autumn)
	var d := g.to_dict()
	_check(int(d.get("farm_turns_used", -1)) == 6, "to_dict carries farm_turns_used 6")
	var loaded := GameState.from_dict(d)
	_check(loaded.farm_turns_used == 6, "from_dict restores farm_turns_used 6")
	_check(loaded.current_season_name() == "Autumn", "restored mid-cycle season is Autumn")

	# A pre-seasons save (no farm_turns_used key) loads as a fresh Spring cycle.
	var old := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 1}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "", "boss_hp": 0, "town2_complete": false,
	}
	var o := GameState.from_dict(old)
	_check(o.farm_turns_used == 0, "pre-seasons save loads farm_turns_used 0 (fresh Spring)")
	_check(o.current_season_name() == "Spring", "pre-seasons save is Spring")

	# A corrupt AT-or-past-budget value wraps back into a clean Spring cycle.
	var corrupt := old.duplicate(true)
	corrupt["farm_turns_used"] = 50
	var c := GameState.from_dict(corrupt)
	_check(c.farm_turns_used == 0, "an at/past-budget saved value wraps back to 0 on load")
