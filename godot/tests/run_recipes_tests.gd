extends SceneTree
## T15 — headless tests for the FULL crafting catalog (RecipeConfig) + GameState.craft()
## output-kind routing + station/tier gating + MarketConfig sellability of the new goods.
##
## Layers:
##   1. Catalog integrity — every recipe has a real station (BuildingConfig refiner), a
##      non-empty inputs dict (all positive ints), a non-empty output, qty 1, a valid
##      output_kind, and a sane tier→settlement-tier mapping.
##   2. Tool recipes — output is a real ToolConfig member; crafting GRANTS the tool
##      (tool_count +qty) and does NOT add a resource to inventory.
##   3. Good recipes — crafting BANKS the good (inventory +qty), grants no tool.
##   4. Gating — craft is blocked without the station ("no_station"), blocked by the
##      tier gate at too-low a settlement tier ("locked"), blocked by short inputs
##      ("insufficient"); none of the failure paths mutate state.
##   5. BREAD/SUPPLIES regression — unchanged behaviour (tier-1 GOOD recipes craftable
##      at the default Camp tier; bread inputs flour3+eggs1, supplies inputs bread1+flour2).
##   6. Market — every NEW craftable GOOD sells for > 0 (and buys for more than it sells,
##      keeping the Market a sink).
##
## Same dependency-free harness as run_economy_tests.gd. Run from the godot/ project root:
##   godot --headless --script res://tests/run_recipes_tests.gd
## Exits 0 when every check passes, 1 on any failure.

var RC := RecipeConfig
var BC := BuildingConfig
var TC := TownConfig
var MC := MarketConfig

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

func _initialize() -> void:
	print("\n── Crafting catalog (T15) tests ─────────────────────")
	_test_catalog_integrity()
	_test_tool_recipes_grant_tools()
	_test_good_recipes_bank_goods()
	_test_gating()
	_test_bread_supplies_regression()
	_test_market_sellable()
	_test_stations_are_buildings()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. Catalog integrity ─────────────────────────────────────────────────────

func _test_catalog_integrity() -> void:
	# The full React six-station catalog: ~46 recipes.
	_check(RC.RECIPE_IDS.size() >= 46, "catalog has >= 46 recipes (got %d)" % RC.RECIPE_IDS.size())
	# RECIPE_IDS and RECIPES keys agree (no orphan ids / no unreferenced rows).
	_check(RC.RECIPE_IDS.size() == RC.RECIPES.size(),
		"RECIPE_IDS (%d) matches RECIPES key count (%d)" % [RC.RECIPE_IDS.size(), RC.RECIPES.size()])

	var seen_ids: Dictionary = {}
	var tool_count: int = 0
	var good_count: int = 0
	for id in RC.RECIPE_IDS:
		var sid := String(id)
		_check(not seen_ids.has(sid), "recipe id '%s' appears once in RECIPE_IDS" % sid)
		seen_ids[sid] = true
		_check(RC.is_recipe(sid), "'%s' is a real recipe" % sid)

		# Station must be a real refiner building.
		var station := RC.recipe_station(sid)
		_check(BC.is_building(station), "'%s' station '%s' is a real building" % [sid, station])
		_check(BC.is_refiner(station), "'%s' station '%s' is a refiner" % [sid, station])

		# Inputs: non-empty, every value a positive int, every key a non-empty string.
		var inputs := RC.recipe_inputs(sid)
		_check(not inputs.is_empty(), "'%s' has at least one input" % sid)
		var inputs_ok := true
		for k in inputs.keys():
			if String(k) == "" or int(inputs[k]) <= 0:
				inputs_ok = false
		_check(inputs_ok, "'%s' inputs are all positive (key, qty)" % sid)

		# Output non-empty, qty == 1.
		_check(RC.recipe_output(sid) != "", "'%s' has a non-empty output" % sid)
		_check(RC.recipe_qty(sid) == 1, "'%s' qty == 1" % sid)

		# Output kind is one of the two discriminants.
		var kind := RC.recipe_output_kind(sid)
		_check(kind == RC.KIND_GOOD or kind == RC.KIND_TOOL,
			"'%s' output_kind is good|tool (got '%s')" % [sid, kind])
		if kind == RC.KIND_TOOL:
			tool_count += 1
		else:
			good_count += 1

		# Tier maps to a valid settlement tier.
		var min_tier := RC.recipe_min_settlement_tier(sid)
		_check(min_tier >= TC.TIER_CAMP and min_tier <= TC.TIER_CITY,
			"'%s' min settlement tier in [Camp, City] (got %d)" % [sid, min_tier])

	# The Workshop contributes the bulk of the TOOL recipes; the other five stations are GOODs.
	_check(tool_count >= 30, "catalog has >= 30 TOOL recipes (the Workshop set), got %d" % tool_count)
	_check(good_count >= 14, "catalog has >= 14 GOOD recipes, got %d" % good_count)

	# Every station present is a refiner; the six expected stations all carry recipes.
	for st in [BC.BAKERY, BC.KITCHEN, BC.WORKSHOP, BC.LARDER, BC.FORGE, BC.SMOKEHOUSE]:
		_check(not RC.recipes_for_station(st).is_empty(),
			"station '%s' has at least one recipe" % BC.building_name(st))

# ── 2. Tool recipes grant tools ───────────────────────────────────────────────

func _test_tool_recipes_grant_tools() -> void:
	# EVERY tool recipe's output must be a real ToolConfig member, else craft() would
	# grant a phantom tool id (a fake). This is the hard "Workshop crafts real tools" gate.
	var all_tool_outputs_real := true
	for id in RC.RECIPE_IDS:
		if RC.is_tool_recipe(String(id)):
			var out := RC.recipe_output(String(id))
			if not ToolConfig.has_tool(out):
				all_tool_outputs_real = false
				print("    (tool recipe '%s' → '%s' is NOT a ToolConfig member)" % [String(id), out])
	_check(all_tool_outputs_real, "every TOOL recipe output is a real ToolConfig member")

	# Concrete craft: build the Workshop, stock the Rake's inputs, craft it. The tool count
	# rises by qty and NO resource named 'rake' lands in inventory.
	var g := GameState.new()
	g.settlement.tier = TC.TIER_TOWN          # Workshop unlocks at Town; rake is tier 1
	g.buildings.append(BC.WORKSHOP)
	g.inventory["plank"] = 5                   # rake needs plank 1
	var tools_before := g.tool_count("rake")
	var inv_keys_before := g.inventory.size()
	_check(g.can_craft(RC.RAKE), "can_craft(rake) with Workshop + plank")
	var res := g.craft(RC.RAKE)
	_check(bool(res.get("ok", false)), "craft(rake) succeeds")
	_check(String(res.get("kind", "")) == RC.KIND_TOOL, "craft(rake) result kind == tool")
	_check(g.tool_count("rake") == tools_before + 1, "craft(rake) granted +1 rake tool charge")
	_check(int(g.inventory.get("rake", 0)) == 0, "craft(rake) did NOT add a 'rake' resource to inventory")
	_check(int(g.inventory.get("plank", 0)) == 4, "craft(rake) consumed 1 plank (5 → 4)")
	# Net inventory keys unchanged (no new resource row appeared).
	_check(g.inventory.size() <= inv_keys_before, "craft(rake) added no new inventory resource key")

	# A heavier tool recipe (Rifle: plank+block+iron_bar) also routes to the tool rack.
	g.inventory["plank"] = 2
	g.inventory["block"] = 2
	g.inventory["iron_bar"] = 2
	var rifle_before := g.tool_count("rifle")
	var rifle_res := g.craft(RC.RIFLE)
	_check(bool(rifle_res.get("ok", false)), "craft(rifle) succeeds")
	_check(g.tool_count("rifle") == rifle_before + 1, "craft(rifle) granted +1 rifle charge")
	_check(int(g.inventory.get("rifle", 0)) == 0, "craft(rifle) added no 'rifle' resource")

# ── 3. Good recipes bank goods ────────────────────────────────────────────────

func _test_good_recipes_bank_goods() -> void:
	# Forge's Cobble Path (block 5 + plank 2 → cobblepath), a tier-1 GOOD recipe. Building
	# the Forge + stocking inputs banks the good into inventory and grants no tool.
	var g := GameState.new()
	g.settlement.tier = TC.TIER_TOWN          # Forge unlocks at Town; cobblepath is tier 1
	g.buildings.append(BC.FORGE)
	g.inventory["block"] = 5
	g.inventory["plank"] = 2
	_check(g.can_craft(RC.COBBLEPATH), "can_craft(cobblepath) with Forge + inputs")
	var before := int(g.inventory.get("cobblepath", 0))
	var res := g.craft(RC.COBBLEPATH)
	_check(bool(res.get("ok", false)), "craft(cobblepath) succeeds")
	_check(String(res.get("kind", "")) == RC.KIND_GOOD, "craft(cobblepath) result kind == good")
	_check(int(g.inventory.get("cobblepath", 0)) == before + 1, "craft(cobblepath) banked +1 cobblepath")
	_check(g.tool_count("cobblepath") == 0, "craft(cobblepath) granted NO tool")
	_check(int(g.inventory.get("block", 0)) == 0, "craft(cobblepath) consumed 5 block")
	_check(int(g.inventory.get("plank", 0)) == 0, "craft(cobblepath) consumed 2 plank")

	# Larder Preserve (jam 2 + eggs 1 → preserve), a tier-1 GOOD recipe.
	var g2 := GameState.new()
	g2.buildings.append(BC.LARDER)            # Larder unlocks at Village; preserve is tier 1
	g2.settlement.tier = TC.TIER_VILLAGE
	g2.inventory["jam"] = 2
	g2.inventory["eggs"] = 1
	var pres := g2.craft(RC.PRESERVE)
	_check(bool(pres.get("ok", false)), "craft(preserve) succeeds")
	_check(int(g2.inventory.get("preserve", 0)) == 1, "craft(preserve) banked +1 preserve")

# ── 4. Gating ─────────────────────────────────────────────────────────────────

func _test_gating() -> void:
	# (a) No station → "no_station", no mutation.
	var g := GameState.new()
	g.settlement.tier = TC.TIER_CITY          # tier is high; only the station is missing
	g.inventory["iron_bar"] = 4
	g.inventory["coke"] = 2
	var no_station := g.craft(RC.IRON_HINGE)
	_check(not bool(no_station.get("ok", false)), "craft(iron_hinge) fails without the Forge")
	_check(no_station.get("reason", "") == "no_station", "reason 'no_station' without the Forge")
	_check(int(g.inventory.get("iron_bar", 0)) == 4, "no mutation on no_station (iron_bar)")

	# (b) Station built but settlement tier too low for a TIER-3 recipe → "locked", no mutation.
	# ironframe is a tier-3 Forge recipe → needs City (5). Build the Forge (unlocks at Town=4)
	# but keep the settlement at Town (4) < City (5).
	var g2 := GameState.new()
	g2.settlement.tier = TC.TIER_TOWN
	g2.buildings.append(BC.FORGE)
	g2.inventory["plank"] = 2
	g2.inventory["iron_bar"] = 1
	_check(RC.recipe_min_settlement_tier(RC.IRONFRAME) == TC.TIER_CITY,
		"ironframe (tier 3) requires City")
	_check(not g2.can_craft(RC.IRONFRAME), "can_craft(ironframe) false at Town (tier-locked)")
	var locked := g2.craft(RC.IRONFRAME)
	_check(not bool(locked.get("ok", false)), "craft(ironframe) fails when tier-locked")
	_check(locked.get("reason", "") == "locked", "reason 'locked' when tier-locked")
	_check(int(g2.inventory.get("plank", 0)) == 2, "no mutation on locked (plank)")
	# Advancing to City unlocks it.
	g2.settlement.tier = TC.TIER_CITY
	_check(g2.can_craft(RC.IRONFRAME), "can_craft(ironframe) true once at City")
	var ok := g2.craft(RC.IRONFRAME)
	_check(bool(ok.get("ok", false)), "craft(ironframe) succeeds at City")
	_check(int(g2.inventory.get("ironframe", 0)) == 1, "ironframe banked at City")

	# (c) Station + tier OK but short inputs → "insufficient", no mutation.
	var g3 := GameState.new()
	g3.settlement.tier = TC.TIER_TOWN
	g3.buildings.append(BC.WORKSHOP)
	# sickle needs plank 1 + iron_bar 1; give only the plank.
	g3.inventory["plank"] = 1
	_check(not g3.can_craft(RC.SICKLE), "can_craft(sickle) false missing iron_bar")
	var short := g3.craft(RC.SICKLE)
	_check(short.get("reason", "") == "insufficient", "reason 'insufficient' missing an input")
	_check(int(g3.inventory.get("plank", 0)) == 1, "no mutation on insufficient (plank kept)")
	_check(g3.tool_count("sickle") == 0, "no tool granted on insufficient")

	# (d) Unknown recipe id → "unknown".
	_check(g3.craft("nope").get("reason", "") == "unknown", "craft('nope') → reason 'unknown'")

# ── 5. BREAD / SUPPLIES regression ────────────────────────────────────────────

func _test_bread_supplies_regression() -> void:
	# BREAD is a tier-1 GOOD recipe craftable at the DEFAULT Camp tier once the Bakery is
	# built (the tier gate must NOT regress its old behaviour).
	var g := GameState.new()
	_check(g.settlement.tier == TC.TIER_CAMP, "fresh game starts at Camp (default)")
	g.buildings.append(BC.BAKERY)
	g.inventory["flour"] = 3
	g.inventory["eggs"] = 1
	_check(RC.recipe_inputs(RC.BREAD) == {"flour": 3, "eggs": 1}, "bread inputs unchanged")
	_check(RC.recipe_min_settlement_tier(RC.BREAD) == TC.TIER_CAMP, "bread requires only Camp")
	_check(g.can_craft(RC.BREAD), "can_craft(bread) at Camp with Bakery + inputs (unchanged)")
	var res := g.craft(RC.BREAD)
	_check(bool(res.get("ok", false)), "craft(bread) succeeds at Camp")
	_check(int(g.inventory.get("bread", 0)) == 1, "craft(bread) banked +1 bread (GOOD path unchanged)")
	_check(int(g.inventory.get("flour", 0)) == 0 and not g.inventory.has("eggs"),
		"craft(bread) consumed flour 3 + eggs 1 (unchanged)")

	# SUPPLIES keeps its PORT inputs ({bread:1, flour:2}), NOT React's {flour:5}.
	_check(RC.recipe_inputs(RC.SUPPLIES) == {"bread": 1, "flour": 2}, "supplies port inputs unchanged")
	var g2 := GameState.new()
	g2.buildings.append(BC.KITCHEN)
	g2.settlement.tier = TC.TIER_TOWN          # Kitchen unlocks at Town; supplies is tier 1
	g2.inventory["bread"] = 1
	g2.inventory["flour"] = 2
	var sup := g2.craft(RC.SUPPLIES)
	_check(bool(sup.get("ok", false)), "craft(supplies) succeeds (unchanged)")
	_check(int(g2.inventory.get("supplies", 0)) == 1, "craft(supplies) banked +1 supplies (unchanged)")

# ── 6. Market sellability of the NEW crafted goods ────────────────────────────

func _test_market_sellable() -> void:
	# Every NEW craftable GOOD must sell for > 0 (a craftable good you can't sell is half-real).
	# Walk every GOOD recipe; its output must be sellable at a positive price, and the buy price
	# must exceed the sell price (the Market stays a sink). EXCEPTION: supplies is a Kitchen-only
	# intermediate (deliberately unsellable — never market-traded), so it's exempt.
	for id in RC.RECIPE_IDS:
		var sid := String(id)
		if RC.is_tool_recipe(sid):
			continue                            # tools aren't market goods
		var out := RC.recipe_output(sid)
		if out == "supplies":
			continue                            # intentional: Kitchen-only intermediate
		_check(MC.can_sell(out), "good '%s' is sellable" % out)
		_check(MC.sell_price(out) > 0, "good '%s' sells for > 0 (%d)" % [out, MC.sell_price(out)])
		_check(MC.buy_price(out) > MC.sell_price(out),
			"good '%s' buy (%d) > sell (%d) — Market is a sink" % [out, MC.buy_price(out), MC.sell_price(out)])

	# A concrete sell: craft a Forge cobblepath, sell it, gain coins.
	var g := GameState.new()
	g.settlement.tier = TC.TIER_TOWN
	g.buildings.append(BC.FORGE)
	g.inventory["block"] = 5
	g.inventory["plank"] = 2
	_check(g.craft(RC.COBBLEPATH).get("ok", false), "(setup) craft a cobblepath to sell")
	var coins_before := g.coins
	var sale := g.sell("cobblepath", 1)
	_check(bool(sale.get("ok", false)), "sell(cobblepath) succeeds")
	_check(g.coins == coins_before + MC.sell_price("cobblepath"),
		"selling cobblepath credited its sell price")

# ── 7. Stations are real refiner buildings ────────────────────────────────────

func _test_stations_are_buildings() -> void:
	# The four NEW stations are refiner buildings (no board category, no tile) gated at a
	# sensible tier with a deadlock-free cost.
	for st in [BC.WORKSHOP, BC.LARDER, BC.FORGE, BC.SMOKEHOUSE]:
		_check(BC.is_refiner(st), "%s is a refiner" % BC.building_name(st))
		_check(not BC.is_spawner(st), "%s is NOT a spawner (adds no board category)" % BC.building_name(st))
		_check(BC.building_category(st) == "", "%s has no board category" % BC.building_name(st))
		_check(BC.building_tile(st) == Constants.EMPTY, "%s spawns no tile" % BC.building_name(st))
		_check(BC.unlock_tier(st) >= TC.TIER_HAMLET, "%s unlocks above Camp (deadlock guard)" % BC.building_name(st))
		_check(not BC.building_cost(st).is_empty(), "%s has a build cost" % BC.building_name(st))
	# Workshop unlocks at Town (Direction: "Workshop + farm tools").
	_check(BC.unlock_tier(BC.WORKSHOP) == TC.TIER_TOWN, "Workshop unlocks at Town")
	# Each station appears in the build picker (ALL_BUILD_IDS).
	for st in [BC.WORKSHOP, BC.LARDER, BC.FORGE, BC.SMOKEHOUSE]:
		_check(BC.ALL_BUILD_IDS.has(st), "%s is in the build picker (ALL_BUILD_IDS)" % BC.building_name(st))
