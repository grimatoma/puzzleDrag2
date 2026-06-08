extends SceneTree
## Headless tests for FULL tile-catalog parity (all 77 web tiles in the Godot port).
## After this milestone the port's Constants.gd Tile enum + STRING_KEYS + CATEGORY cover
## every web catalog tile (the 77 keys in assets/tiles/manifest.json) PLUS the two
## board-only HAZARD tiles (RAT, RUBBLE) the port already shipped — 79 enum members total.
##
## What this asserts:
##   1. Map coverage — every Tile enum member has a STRING_KEYS + CATEGORY entry, and every
##      NON-hazard / NON-treasure tile additionally has a PRODUCES + THRESHOLDS entry. The
##      yield-less tiles (RAT, RUBBLE, FISH_PEARL, COIN_GOLDEN) are deliberately ABSENT from
##      PRODUCES/THRESHOLDS (produced_resource → "", threshold_for → NO_THRESHOLD).
##   2. Counts — STRING_KEYS has exactly 79 entries (77 manifest art tiles + 2 hazards), of
##      which exactly 77 are art-backed (res://assets/tiles/<key>.png exists).
##   3. No-magenta — color_for() returns a real fallback (not the MAGENTA "unknown" sentinel)
##      for every enum tile.
##   4. Real produced resources — every produced resource is either market-tradable
##      (MarketConfig) or a real Kitchen/expedition intermediate (supplies / fish goods),
##      and the three NEW resources (jam, copper_bar, gold_bar) have real market prices.
##   5. Catalog-only invariant — none of the 56 newly-appended variants leaked into the
##      farm/mine/fish/staple refill pools (the board keeps its default representatives).
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_tile_catalog_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const T := Constants.Tile
var MC := MarketConfig

var _checks: int = 0
var _failures: int = 0

## Tiles that produce NOTHING via the chain pipeline — deliberately absent from
## PRODUCES/THRESHOLDS (hazards + the rune-capture pearl + the treasure coin).
const NO_YIELD_TILES: Array = [T.RAT, T.RUBBLE, T.FISH_PEARL, T.COIN_GOLDEN]

## Produced resources that are intentionally NOT market-traded but are still real
## (Kitchen-only intermediate + the harbor catch, which lands in shared inventory).
const NON_MARKET_REAL_RESOURCES: Array = [
	"supplies", "fish_fillet", "fish_oil", "sea_shells", "pearls",
]

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── Full tile-catalog parity tests ─────────────────")
	_test_enum_string_keys()
	_test_map_coverage()
	_test_counts()
	_test_color_fallbacks()
	_test_produced_resources_real()
	_test_new_resources_have_prices()
	_test_catalog_only_not_in_pools()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. enum ↔ STRING_KEYS one-to-one ──────────────────────────────────────────

func _test_enum_string_keys() -> void:
	# Every enum VALUE has a STRING_KEYS entry, and every STRING_KEYS key is a real enum value.
	var enum_values: Array = Constants.Tile.values()
	var missing := 0
	for v in enum_values:
		if not Constants.STRING_KEYS.has(v):
			missing += 1
			push_error("enum value %d has no STRING_KEYS entry" % v)
	_check(missing == 0, "every Tile enum member has a STRING_KEYS entry")
	_check(Constants.STRING_KEYS.size() == enum_values.size(),
		"STRING_KEYS covers exactly the enum (%d == %d)" % [Constants.STRING_KEYS.size(), enum_values.size()])

	# String keys are unique (no two tiles share a key).
	var seen: Dictionary = {}
	var dupes := 0
	for v in Constants.STRING_KEYS.keys():
		var k: String = String(Constants.STRING_KEYS[v])
		if seen.has(k):
			dupes += 1
			push_error("duplicate STRING_KEY: %s" % k)
		seen[k] = true
	_check(dupes == 0, "no duplicate string keys")

# ── 2. PRODUCES / THRESHOLDS / CATEGORY coverage ──────────────────────────────

func _test_map_coverage() -> void:
	var cat_missing := 0
	var prod_missing := 0
	var thr_missing := 0
	var no_yield_leaked := 0
	for v in Constants.STRING_KEYS.keys():
		# CATEGORY: every tile must have one.
		if Constants.category_of(int(v)) == "":
			cat_missing += 1
			push_error("tile %s has no CATEGORY" % Constants.string_key(int(v)))
		var is_no_yield: bool = NO_YIELD_TILES.has(int(v))
		if is_no_yield:
			# No-yield tiles must be ABSENT from PRODUCES/THRESHOLDS.
			if Constants.produced_resource(int(v)) != "":
				no_yield_leaked += 1
				push_error("no-yield tile %s unexpectedly produces a resource" % Constants.string_key(int(v)))
			if Constants.threshold_for(int(v)) != Constants.NO_THRESHOLD:
				no_yield_leaked += 1
				push_error("no-yield tile %s unexpectedly has a threshold" % Constants.string_key(int(v)))
		else:
			# Producing tiles must have BOTH a produced resource and a threshold.
			if Constants.produced_resource(int(v)) == "":
				prod_missing += 1
				push_error("producing tile %s has no PRODUCES entry" % Constants.string_key(int(v)))
			if Constants.threshold_for(int(v)) == Constants.NO_THRESHOLD:
				thr_missing += 1
				push_error("producing tile %s has no THRESHOLDS entry" % Constants.string_key(int(v)))
	_check(cat_missing == 0, "every tile has a CATEGORY entry")
	_check(prod_missing == 0, "every producing tile has a PRODUCES entry")
	_check(thr_missing == 0, "every producing tile has a THRESHOLDS entry")
	_check(no_yield_leaked == 0, "no-yield tiles (RAT/RUBBLE/FISH_PEARL/COIN_GOLDEN) stay absent from PRODUCES/THRESHOLDS")

	# Spot-check a few of the newly-added catalog tiles end-to-end.
	_check(Constants.category_of(T.GRASS_MEADOW) == "grass" and Constants.produced_resource(T.GRASS_MEADOW) == "hay_bundle" and Constants.threshold_for(T.GRASS_MEADOW) == 6,
		"GRASS_MEADOW → grass / hay_bundle / 6")
	_check(Constants.category_of(T.FRUIT_BLACKBERRY) == "fruit" and Constants.produced_resource(T.FRUIT_BLACKBERRY) == "jam" and Constants.threshold_for(T.FRUIT_BLACKBERRY) == 7,
		"FRUIT_BLACKBERRY → fruit / jam / 7 (per-tile override)")
	_check(Constants.category_of(T.COPPER_ORE) == "copper" and Constants.produced_resource(T.COPPER_ORE) == "copper_bar" and Constants.threshold_for(T.COPPER_ORE) == 6,
		"COPPER_ORE → copper / copper_bar / 6")
	_check(Constants.category_of(T.GOLD) == "gold" and Constants.produced_resource(T.GOLD) == "gold_bar" and Constants.threshold_for(T.GOLD) == 6,
		"GOLD → gold / gold_bar / 6")
	_check(Constants.category_of(T.COIN_GOLDEN) == "coin" and Constants.produced_resource(T.COIN_GOLDEN) == "",
		"COIN_GOLDEN → coin / no yield (treasure)")
	_check(Constants.produced_resource(T.MOUNT_MAMMOTH) == "horseshoe" and Constants.threshold_for(T.MOUNT_MAMMOTH) == 10,
		"MOUNT_MAMMOTH → horseshoe / 10")

# ── 3. counts: 79 total, 77 art-backed (== manifest) ──────────────────────────

func _test_counts() -> void:
	var total: int = Constants.STRING_KEYS.size()
	_check(total == 79, "exactly 79 catalog tiles (77 web art tiles + RAT + RUBBLE hazards); got %d" % total)

	var art_backed := 0
	var art_missing := 0
	for v in Constants.STRING_KEYS.keys():
		var key: String = Constants.string_key(int(v))
		var path: String = "res://assets/tiles/%s.png" % key
		if ResourceLoader.exists(path):
			art_backed += 1
		else:
			art_missing += 1
			push_error("tile %s has no committed PNG at %s" % [key, path])
	# RAT + RUBBLE use 'rat'/'rubble' PNGs too, so EVERY tile is art-backed in the port.
	_check(art_backed == 79, "all 79 tiles are art-backed (PNG exists); got %d" % art_backed)
	_check(art_missing == 0, "no tile is missing its PNG")

	# Of the 79, exactly 77 use a canonical "tile_*"/special web art key (the manifest set);
	# the 2 remaining are the board-only hazards (keys 'rat'/'rubble', not in the manifest).
	var manifest_keys := 0
	var hazard_keys := 0
	for v in Constants.STRING_KEYS.keys():
		var key: String = Constants.string_key(int(v))
		if key == "rat" or key == "rubble":
			hazard_keys += 1
		else:
			manifest_keys += 1
	_check(manifest_keys == 77, "exactly 77 web-manifest art tiles in the catalog; got %d" % manifest_keys)
	_check(hazard_keys == 2, "exactly 2 board-only hazard tiles (rat, rubble); got %d" % hazard_keys)

# ── 4. color_for never returns the MAGENTA 'unknown' sentinel ─────────────────

func _test_color_fallbacks() -> void:
	var magenta_count := 0
	for v in Constants.STRING_KEYS.keys():
		if Constants.color_for(int(v)).is_equal_approx(Color.MAGENTA):
			magenta_count += 1
			push_error("tile %s falls through to MAGENTA in color_for()" % Constants.string_key(int(v)))
	_check(magenta_count == 0, "color_for() has a real fallback for every catalog tile (no MAGENTA)")

# ── 5. every produced resource is REAL (tradable or a known intermediate) ─────

func _test_produced_resources_real() -> void:
	var unreal := 0
	for v in Constants.STRING_KEYS.keys():
		var res: String = Constants.produced_resource(int(v))
		if res == "":
			continue   # no-yield tile
		var is_real: bool = MC.can_sell(res) or NON_MARKET_REAL_RESOURCES.has(res)
		if not is_real:
			unreal += 1
			push_error("tile %s produces '%s' which is neither market-tradable nor a known intermediate" % [Constants.string_key(int(v)), res])
	_check(unreal == 0, "every produced resource is REAL (market-tradable or a known intermediate)")

func _test_new_resources_have_prices() -> void:
	# The three NEW produced resources must be real market goods (no fakes).
	for res in ["jam", "copper_bar", "gold_bar"]:
		_check(MC.can_sell(res), "%s is sellable at the Market" % res)
		_check(MC.can_buy(res), "%s is buyable at the Market" % res)
		_check(MC.sell_price(res) > 0, "%s has a positive sell price (%d)" % [res, MC.sell_price(res)])
	# Spot-check the exact prices lifted from the web MARKET table.
	_check(MC.sell_price("jam") == 5, "jam sell price is 5 (web parity)")
	_check(MC.sell_price("copper_bar") == 8, "copper_bar sell price is 8 (web parity)")
	_check(MC.sell_price("gold_bar") == 16, "gold_bar sell price is 16 (web parity)")
	_check(MC.buy_price("jam") == 90, "jam buy price is 90 (web parity)")
	_check(MC.buy_price("copper_bar") == 120, "copper_bar buy price is 120 (web parity)")
	_check(MC.buy_price("gold_bar") == 240, "gold_bar buy price is 240 (web parity)")

# ── 6. the 56 catalog-only variants never leaked into a board refill pool ─────

func _test_catalog_only_not_in_pools() -> void:
	# The board keeps its current default representative per category — none of the newly
	# appended variants should appear in any of the refill pools. We assert by checking the
	# pools never grew beyond their pre-parity tiles (the default representatives only).
	var allowed_farm := [T.GRASS, T.WHEAT, T.PHEASANT, T.CARROT, T.APPLE, T.PANSY, T.OAK, T.PIG, T.COW, T.HORSE]
	var allowed_mine := [T.STONE, T.IRON_ORE, T.COAL, T.DIRT, T.GEM]
	var allowed_fish := [T.FISH_SARDINE, T.FISH_MACKEREL, T.FISH_CLAM, T.FISH_OYSTER, T.FISH_KELP]
	_check(_pool_subset_of(Constants.FARM_POOL, allowed_farm), "FARM_POOL has only the default farm representatives (no new variants)")
	_check(_pool_subset_of(Constants.STAPLE_POOL, [T.GRASS, T.WHEAT]), "STAPLE_POOL has only grass + wheat (no new variants)")
	_check(_pool_subset_of(Constants.MINE_POOL, allowed_mine), "MINE_POOL has only the default mine representatives (no new variants)")
	_check(_pool_subset_of(Constants.FISH_POOL, allowed_fish), "FISH_POOL has only the default fish representatives (no new variants)")

func _pool_subset_of(pool: Array, allowed: Array) -> bool:
	for t in pool:
		if not allowed.has(t):
			push_error("pool contains unexpected tile %d (%s)" % [int(t), Constants.string_key(int(t))])
			return false
	return true
