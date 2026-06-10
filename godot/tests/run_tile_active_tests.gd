extends SceneTree
## Headless tests for the Tile Collection active-variant + discovery/unlock + per-tile
## abilities system (T2/T3/T5) — the GDScript port of src/features/tileCollection
## (data.ts + effects.ts + the state.ts SET_ACTIVE_TILE / BUY_TILE / chain-discovery /
## free-moves reducer). Pure-state assertions on TileVariantConfig + GameState (no nodes).
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_tile_active_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI auto-discovers + gates on it.
##
## Coverage:
##   1. TileVariantConfig catalog: every catalog id maps to a real Constants.Tile; the four
##      mine upgrade-resource entries are OMITTED; default_active_by_category == base tiles;
##      default_discovered holds the default-method tiles + port base tiles.
##   2. Default active == base tiles per category; active_tile_pool unchanged for a fresh game.
##   3. set_active_tile substitutes the variant in active_tile_pool (and is gated on discovery).
##   4. Chain discovery (chain + research method); upgrade_spawn_active uses the active variant.
##   5. buy_tile spends coins + discovers; research_tile accrues + discovers.
##   6. Per-tile abilities: free_moves accrual (per chain) + consumption (note_farm_turn);
##      free_turn_if_chain gating; coin_bonus_flat / coin_bonus_per_tile in credit_chain.
##   7. Save/load round-trip of the whole slice.

const T := Constants.Tile

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

func _count_pool(pool: Array, tile: int) -> int:
	var n: int = 0
	for t in pool:
		if int(t) == tile:
			n += 1
	return n

func _initialize() -> void:
	print("\n── Tile active-variant / discovery / abilities tests ──")
	_test_catalog()
	_test_defaults()
	_test_set_active_substitutes_pool()
	_test_chain_discovery()
	_test_upgrade_spawn_active()
	_test_buy_tile()
	_test_research_tile()
	_test_free_moves_accrual_and_consumption()
	_test_free_turn_if_chain()
	_test_coin_bonus_abilities()
	_test_building_discovery()
	_test_round_trip()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. Catalog integrity ───────────────────────────────────────────────────────

func _test_catalog() -> void:
	var ids: Array = TileVariantConfig.all()
	_check(ids.size() == 75, "catalog has 75 board-tile variants (79 React tiles − 4 mine upgrade resources), got %d" % ids.size())
	# Every catalog id maps to a real Constants.Tile, and its category matches Constants.
	var all_map := true
	var all_cat := true
	for id in ids:
		var tile: int = TileVariantConfig.tile_for(id)
		if not Constants.STRING_KEYS.has(tile):
			all_map = false
		if String(TileVariantConfig.by_id(id).get("category", "")) != Constants.category_of(tile):
			all_cat = false
	_check(all_map, "every catalog id maps to a real Constants.Tile enum")
	_check(all_cat, "every catalog variant's category == Constants.category_of(its tile)")
	# The four mine upgrade-RESOURCE entries are deliberately omitted (no board tile).
	for resid in ["block", "iron_bar", "coke", "cut_gem"]:
		_check(not TileVariantConfig.is_tile(resid),
			"mine upgrade-resource '%s' is OMITTED (it's an inventory resource, not a board tile)" % resid)
	# Clover = flower, Melon = fruit (re-filed off their legacy tile_bird_ id).
	_check(String(TileVariantConfig.by_id("tile_bird_clover").get("category", "")) == "flower",
		"Clover re-filed to category 'flower'")
	_check(String(TileVariantConfig.by_id("tile_bird_melon").get("category", "")) == "fruit",
		"Melon re-filed to category 'fruit'")
	# id_for_tile is the inverse of tile_for; hazards/copper have no entry.
	_check(TileVariantConfig.id_for_tile(T.GRASS) == "tile_grass_grass", "id_for_tile(GRASS) round-trips")
	_check(TileVariantConfig.id_for_tile(T.RAT) == "", "RAT (hazard) has no catalog id")
	_check(TileVariantConfig.id_for_tile(T.COPPER_ORE) == "", "COPPER_ORE (no React analogue) has no catalog id")

# ── 2. Defaults (active == base; pool unchanged) ────────────────────────────────

func _test_defaults() -> void:
	var defaults: Dictionary = TileVariantConfig.default_active_by_category()
	# The six home base-spawn categories default to their base tiles.
	_check(TileVariantConfig.tile_for(String(defaults["grass"])) == T.GRASS, "default grass variant == GRASS")
	_check(TileVariantConfig.tile_for(String(defaults["grain"])) == T.WHEAT, "default grain variant == WHEAT")
	_check(TileVariantConfig.tile_for(String(defaults["trees"])) == T.OAK, "default trees variant == OAK")
	_check(TileVariantConfig.tile_for(String(defaults["birds"])) == T.PHEASANT, "default birds variant == PHEASANT")
	_check(TileVariantConfig.tile_for(String(defaults["veg"])) == T.CARROT, "default veg variant == CARROT")
	_check(TileVariantConfig.tile_for(String(defaults["fruit"])) == T.APPLE, "default fruit variant == APPLE")
	# default_discovered holds every default-method tile + the port base tiles.
	var disc: Array = TileVariantConfig.default_discovered()
	_check(disc.has("tile_grass_grass"), "default_discovered holds the base grass")
	_check(disc.has("tile_grain_wheat"), "default_discovered holds wheat (port base tile, authored chain in React)")
	_check(disc.has("tile_bird_pheasant"), "default_discovered holds pheasant (port base bird)")
	_check(not disc.has("tile_grass_meadow"), "default_discovered does NOT hold meadow (chain-locked)")

	# A fresh GameState: active variants are the base tiles; the pool is byte-identical to
	# what it was before the active-variant system (defaults substitute the same base tiles).
	var g := GameState.new()
	_check(g.active_tile_for_category("grass") == T.GRASS, "fresh game: active grass == GRASS")
	_check(g.active_tile_for_category("birds") == T.PHEASANT, "fresh game: active birds == PHEASANT")
	_check(g.is_tile_discovered("tile_grass_grass"), "fresh game: base grass discovered")
	_check(not g.is_tile_discovered("tile_grass_meadow"), "fresh game: meadow NOT discovered")
	# Spring pool contains the base tiles (substitution is a no-op at defaults).
	g.farm_turns_used = 0
	var pool := g.active_tile_pool()
	_check(_count_pool(pool, T.GRASS) > 0, "fresh Spring pool still contains GRASS")
	_check(_count_pool(pool, T.PHEASANT) > 0, "fresh Spring pool still contains PHEASANT")
	_check(_count_pool(pool, T.GRASS_MEADOW) == 0, "fresh pool has NO meadow (not active)")

# ── 3. set_active_tile substitutes the variant in the pool ──────────────────────

func _test_set_active_substitutes_pool() -> void:
	var g := GameState.new()
	g.farm_turns_used = 0
	var grass_base := _count_pool(g.active_tile_pool(), T.GRASS)
	_check(grass_base > 0, "(setup) Spring pool has GRASS slots")
	# Undiscovered → can't activate (guard).
	_check(not g.set_active_tile("grass", "tile_grass_meadow"),
		"set_active_tile rejects an UNDISCOVERED variant")
	_check(g.active_tile_for_category("grass") == T.GRASS, "grass still GRASS after rejected activate")
	# Cross-category → rejected.
	g.discover_tile("tile_grass_meadow")
	_check(not g.set_active_tile("birds", "tile_grass_meadow"),
		"set_active_tile rejects a cross-category variant")
	# Discovered + same category → activates, substitutes in the pool.
	_check(g.set_active_tile("grass", "tile_grass_meadow"), "set_active_tile('grass', meadow) succeeds once discovered")
	_check(g.active_tile_for_category("grass") == T.GRASS_MEADOW, "grass active variant is now MEADOW")
	var pool := g.active_tile_pool()
	_check(_count_pool(pool, T.GRASS_MEADOW) == grass_base,
		"pool now spawns GRASS_MEADOW in place of GRASS (same slot count, %d)" % grass_base)
	_check(_count_pool(pool, T.GRASS) == 0, "no plain GRASS left in the pool (substituted)")

# ── 4. Chain discovery ──────────────────────────────────────────────────────────

func _test_chain_discovery() -> void:
	var g := GameState.new()
	# Meadow needs a chain of 20 grass. A chain of 19 must NOT discover it; 20 must.
	g.credit_chain(T.GRASS, 19)
	_check(not g.is_tile_discovered("tile_grass_meadow"), "19-grass chain does NOT discover meadow (needs 20)")
	g.credit_chain(T.GRASS, 20)
	_check(g.is_tile_discovered("tile_grass_meadow"), "20-grass chain DISCOVERS meadow (chain method)")
	# Heather needs a chain of 6 meadow (off the meadow tile). Use the pure helper too.
	var newly := TileVariantConfig.discover_from_chain({}, "tile_fruit_apple", 6)
	_check(newly.has("tile_fruit_pear"), "pure discover_from_chain(apple, 6) finds pear")
	_check(not newly.has("tile_grass_meadow"), "discover_from_chain(apple) does not find a grass variant")

	# Research-method accrual via credit_chain: grass spiky needs 50 research off grass.
	var g2 := GameState.new()
	g2.credit_chain(T.GRASS, 30)
	_check(not g2.is_tile_discovered("tile_grass_spiky"), "30 grass research progress (<50) → spiky not yet discovered")
	g2.credit_chain(T.GRASS, 30)   # 60 >= 50
	_check(g2.is_tile_discovered("tile_grass_spiky"), "60 grass research (>=50) → spiky DISCOVERED via credit_chain")

# ── 5. upgrade_spawn_active uses the active variant ─────────────────────────────

func _test_upgrade_spawn_active() -> void:
	var H := ZoneConfig.HOME_ZONE
	var g := GameState.new()
	# Default: birds→PIG (herd) upgrade tile is the base PIG (active herd == PIG).
	var up := g.upgrade_spawn_active(H, T.PHEASANT, 12)
	_check(int(up["count"]) == 2 and int(up["tile"]) == T.PIG,
		"default upgrade: 12 birds → 2 PIG (base herd variant)")
	# Activate a different herd variant (Hog, a default-method herd tile), re-check.
	_check(g.is_tile_discovered("tile_herd_hog"), "(setup) hog is a default-discovered herd tile")
	_check(g.set_active_tile("herd", "tile_herd_hog"), "activate Hog as the herd variant")
	var up2 := g.upgrade_spawn_active(H, T.PHEASANT, 12)
	_check(int(up2["count"]) == 2 and int(up2["tile"]) == T.HERD_HOG,
		"after activating Hog: 12 birds → 2 HERD_HOG (active herd variant substituted)")
	# The static helper still returns the BASE tile (unchanged — tests rely on it).
	var stat := GameState.upgrade_spawn(H, T.PHEASANT, 12)
	_check(int(stat["tile"]) == T.PIG, "static upgrade_spawn still returns the BASE PIG")
	# fruit→GOLD: no tile to substitute either way.
	_check(int(g.upgrade_spawn_active(H, T.APPLE, 7)["count"]) == 0, "fruit→GOLD still spawns no tile via active path")

# ── 6. buy_tile ─────────────────────────────────────────────────────────────────

func _test_buy_tile() -> void:
	var g := GameState.new()
	g.coins = 100
	# Clover costs 200 — can't afford.
	_check(not g.buy_tile("tile_bird_clover"), "buy_tile(clover) fails when coins < 200")
	_check(not g.is_tile_discovered("tile_bird_clover"), "clover not discovered after failed buy")
	_check(g.coins == 100, "no coins spent on a failed buy")
	# Afford it.
	g.coins = 250
	_check(g.buy_tile("tile_bird_clover"), "buy_tile(clover) succeeds at 250 coins")
	_check(g.coins == 50, "buy_tile spent 200 coins (250 → 50)")
	_check(g.is_tile_discovered("tile_bird_clover"), "clover discovered after buy")
	# Already discovered → no-op.
	g.coins = 1000
	_check(not g.buy_tile("tile_bird_clover"), "buy_tile is a no-op once discovered")
	_check(g.coins == 1000, "no coins spent buying an already-discovered tile")
	# A non-buy-method tile is rejected.
	_check(not g.buy_tile("tile_grass_meadow"), "buy_tile rejects a non-buy-method tile (meadow is chain)")

# ── 7. research_tile (direct accrual API) ──────────────────────────────────────

func _test_research_tile() -> void:
	var g := GameState.new()
	# water_lily: research 15 off pansy.
	_check(not g.research_tile("tile_flower_water_lily", 10), "research_tile(+10) does NOT discover (10 < 15)")
	_check(not g.is_tile_discovered("tile_flower_water_lily"), "water_lily not yet discovered at 10")
	_check(g.research_tile("tile_flower_water_lily", 10), "research_tile(+10 → 20 >= 15) DISCOVERS water_lily")
	_check(g.is_tile_discovered("tile_flower_water_lily"), "water_lily discovered after crossing the goal")
	# Non-research-method tile rejected.
	_check(not g.research_tile("tile_grass_meadow", 100), "research_tile rejects a non-research tile")

# ── 8. free_moves accrual (per chain) + consumption (note_farm_turn) ───────────

func _test_free_moves_accrual_and_consumption() -> void:
	var g := GameState.new()
	g.coins = 250
	# Discover + activate Clover (free_moves count 2) as the flower variant.
	_check(g.buy_tile("tile_bird_clover"), "(setup) buy Clover")
	_check(g.set_active_tile("flower", "tile_bird_clover"), "(setup) activate Clover for the flower category")
	_check(g.free_moves() == 0, "no free moves banked before a clover chain")
	# A chain of the Clover tile grants its 2 free moves (per chain).
	g.credit_chain(T.BIRD_CLOVER, 3)
	_check(g.free_moves() == 2, "one clover chain banks 2 free moves (free_moves ability)")
	# A second clover chain banks 2 more (per-chain accrual, NOT once-per-season).
	g.credit_chain(T.BIRD_CLOVER, 3)
	_check(g.free_moves() == 4, "a second clover chain banks 2 more (4 total)")
	# Consumption: note_farm_turn spends a banked free move INSTEAD of a real turn.
	g.farm_turns_used = 0
	var r := g.note_farm_turn()
	_check(bool(r.get("free_move", false)), "note_farm_turn reports a free move was spent")
	_check(g.free_moves() == 3, "a free move was consumed (4 → 3)")
	_check(g.farm_turns_used == 0, "no real farm turn was spent while a free move was banked")
	# Spend the rest, then the next turn is a REAL turn.
	g.note_farm_turn(); g.note_farm_turn(); g.note_farm_turn()
	_check(g.free_moves() == 0, "all free moves drained")
	var real := g.note_farm_turn()
	_check(not bool(real.get("free_move", false)), "with no free moves the turn is a real farm turn")
	_check(g.farm_turns_used == 1, "a real farm turn was finally spent")

# ── 9. free_turn_if_chain (Pig: +1 free move when chain >= 6) ───────────────────

func _test_free_turn_if_chain() -> void:
	var g := GameState.new()
	# Pig is the default herd variant (free_turn_if_chain minChain 6). Active by default.
	_check(g.active_tile_for_category("herd") == T.PIG, "(setup) PIG is the default herd variant")
	# A short pig chain (< 6) grants nothing.
	g.credit_chain(T.PIG, 5)
	_check(g.free_moves() == 0, "a 5-pig chain (< minChain 6) grants NO free move")
	# A pig chain >= 6 grants exactly 1 free move.
	g.credit_chain(T.PIG, 6)
	_check(g.free_moves() == 1, "a 6-pig chain (>= minChain 6) grants exactly 1 free move")

# ── 10. coin abilities (golden apple flat, golden coin per-tile) ────────────────

func _test_coin_bonus_abilities() -> void:
	# golden coin: coin_bonus_per_tile 20. chain_coin_bonus == 20 * chain_len.
	var g := GameState.new()
	_check(g.chain_coin_bonus(T.COIN_GOLDEN, 4) == 80, "golden coin per-tile bonus == 20 × 4 == 80")
	# The bonus lands in credit_chain's coins_gain (base maxi(1, len/2) + bonus). We assert
	# on coins_gain (the chain's OWN reward, which this layer controls) rather than the
	# absolute coins delta — credit_chain also fires orthogonal story-beat coin rewards on a
	# fresh game that are not part of the chain reward.
	var before := g.coins
	var res := g.credit_chain(T.COIN_GOLDEN, 4)
	# COIN_GOLDEN produces nothing; base coin = maxi(1, 4/2) = 2; +80 bonus = 82.
	_check(int(res["coins_gain"]) == 2 + 80, "golden coin chain coins_gain == base 2 + 80 bonus")
	_check(g.coins >= before + 2 + 80, "coins credited include the per-tile bonus (coins_gain folded in)")
	# golden apple: coin_bonus_flat 5 (regardless of length).
	var g2 := GameState.new()
	_check(g2.chain_coin_bonus(T.FRUIT_GOLDEN_APPLE, 7) == 5, "golden apple flat bonus == 5 (length-independent)")
	var r2 := g2.credit_chain(T.FRUIT_GOLDEN_APPLE, 7)
	# golden apple is fruit (threshold 7) → 1 pie; base coin maxi(1, 7/2)=3; +5 flat = 8.
	_check(int(r2["coins_gain"]) == 3 + 5, "golden apple chain coins_gain == base 3 + 5 flat bonus")
	# A plain tile with no coin ability earns no bonus.
	_check(g2.chain_coin_bonus(T.GRASS, 6) == 0, "plain GRASS earns no coin bonus")

# ── 11. building discovery (Kitchen → Broccoli) ────────────────────────────────

func _test_building_discovery() -> void:
	# Pure helper: building 'kitchen' discovers broccoli.
	var newly := TileVariantConfig.discover_from_building({}, "kitchen")
	_check(newly.has("tile_veg_broccoli"), "discover_from_building('kitchen') finds broccoli")
	_check(newly.size() == 1, "only broccoli is kitchen-gated")
	# Via the real GameState.build path: build the Kitchen, broccoli becomes discovered.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_TOWN
	# Cover the Kitchen cost so the build commits.
	for k in BuildingConfig.building_cost(BuildingConfig.KITCHEN).keys():
		g.inventory[k] = 999
	var b := g.build(BuildingConfig.KITCHEN)
	_check(bool(b.get("ok", false)), "(setup) built the Kitchen")
	_check(g.is_tile_discovered("tile_veg_broccoli"), "building the Kitchen DISCOVERS broccoli (T3 building method)")

# ── 12. save/load round-trip ────────────────────────────────────────────────────

func _test_round_trip() -> void:
	var g := GameState.new()
	g.coins = 1000
	# Mutate the whole slice: discover + activate a variant, accrue research + free moves.
	g.buy_tile("tile_bird_clover")
	g.set_active_tile("flower", "tile_bird_clover")
	g.credit_chain(T.GRASS, 30)            # research toward spiky
	g.credit_chain(T.BIRD_CLOVER, 3)       # bank free moves
	var fm := g.free_moves()
	var d := g.to_dict()
	# Top-level keys present.
	_check(d.has("tile_active_by_category"), "to_dict emits tile_active_by_category")
	_check(d.has("tile_discovered"), "to_dict emits tile_discovered")
	_check(d.has("tile_research_progress"), "to_dict emits tile_research_progress")
	_check(d.has("tile_free_moves"), "to_dict emits tile_free_moves")
	var g2 := GameState.from_dict(d)
	_check(g2.active_tile_for_category("flower") == T.BIRD_CLOVER, "round-trip preserves the active flower variant (Clover)")
	_check(g2.is_tile_discovered("tile_bird_clover"), "round-trip preserves a discovered (bought) variant")
	_check(g2.tile_research_progress.get("tile_grass_spiky", 0) == g.tile_research_progress.get("tile_grass_spiky", 0),
		"round-trip preserves research progress")
	_check(g2.free_moves() == fm, "round-trip preserves banked free moves (%d)" % fm)
	# Byte-for-byte: re-snapshotting the rebuilt state yields the identical slice keys.
	var d2 := g2.to_dict()
	_check(d["tile_active_by_category"] == d2["tile_active_by_category"], "active_by_category round-trips byte-for-byte")
	_check(d["tile_discovered"] == d2["tile_discovered"], "discovered round-trips byte-for-byte")
	_check(d["tile_research_progress"] == d2["tile_research_progress"], "research_progress round-trips byte-for-byte")
	_check(int(d["tile_free_moves"]) == int(d2["tile_free_moves"]), "free_moves round-trips")
