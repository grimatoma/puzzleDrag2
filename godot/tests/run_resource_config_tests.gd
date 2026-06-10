extends SceneTree
## Batch 1 — headless parity tests for the ResourceConfig catalog (the single source of truth for
## inventory RESOURCE keys + the runes/influence currency items) and the consumers rewired to
## derive from it (UiKit.pretty_name / resource_icon, InventoryScreen family grouping + ITEM_DEFS,
## RecipeConfig.recipe_desc forwarding).
##
## Layers:
##   1. Coverage — every NON-TILE resource key referenced by Constants.PRODUCES, RecipeConfig GOOD
##      outputs, and MarketConfig.SELL has a ResourceConfig row.
##   2. React-ported spot-checks — label/value/desc match the React ITEMS values byte-identically
##      (e.g. bread "Bread Loaf"/125, iron_bar "Iron Bar"/8, fish_fillet "Fillet", jam family "farm").
##   3. Catalog integrity — every row's family ∈ {farm,refined,mine,other}; runes/influence are
##      kind "item" with a non-empty glyph + value 0; resources are kind "resource".
##   4. UiKit wiring — pretty_name returns the canonical resource label ("bread" → "Bread Loaf"),
##      while a tile key still strips correctly ("tile_grass_grass" → "Grass") and tools/unknowns
##      keep capitalize().
##   5. RecipeConfig forwarding — a GOOD recipe's recipe_desc reads from ResourceConfig; a TOOL
##      recipe keeps its own action desc.
##   6. InventoryScreen grouping — group_of derives from family (incl. the jam Other→Farm move).
##
## Same dependency-free harness as run_recipes_tests.gd. Run from the godot/ project root:
##   godot --headless --script res://tests/run_resource_config_tests.gd
## Exits 0 when every check passes, 1 on any failure.

var Rcfg := ResourceConfig
var RC := RecipeConfig
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
	print("\n── ResourceConfig (Batch 1) tests ─────────────────")
	_test_coverage_produces()
	_test_coverage_recipe_goods()
	_test_coverage_market_sell()
	_test_react_ported_values()
	_test_family_validity()
	_test_currency_items()
	_test_uikit_pretty_name()
	_test_uikit_icon_basename()
	_test_recipe_desc_forwarding()
	_test_inventory_grouping()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. Coverage ────────────────────────────────────────────────────────────────

## Every non-empty Constants.PRODUCES value (a tile's chain output) is a catalogued resource.
func _test_coverage_produces() -> void:
	var missing: Array = []
	for tile in Constants.PRODUCES.keys():
		var res: String = String(Constants.PRODUCES[tile])
		if res == "":
			continue   # hazards / capture tiles produce nothing
		if not Rcfg.has(res):
			missing.append(res)
	_check(missing.is_empty(), "every Constants.PRODUCES output has a ResourceConfig row (missing: %s)" % str(missing))

## Every GOOD recipe output (output_kind "good") is a catalogued resource. (TOOL outputs are
## ToolConfig ids, NOT resources — deliberately excluded.)
func _test_coverage_recipe_goods() -> void:
	var missing: Array = []
	for id in RC.RECIPE_IDS:
		if RC.recipe_output_kind(id) != RC.KIND_GOOD:
			continue
		var out_key: String = RC.recipe_output(id)
		if not Rcfg.has(out_key):
			missing.append(out_key)
	_check(missing.is_empty(), "every GOOD recipe output has a ResourceConfig row (missing: %s)" % str(missing))

## Every MarketConfig.SELL key is a catalogued resource (the port sells resources, not tiles).
func _test_coverage_market_sell() -> void:
	var missing: Array = []
	for k in MC.SELL.keys():
		if not Rcfg.has(String(k)):
			missing.append(String(k))
	_check(missing.is_empty(), "every MarketConfig.SELL key has a ResourceConfig row (missing: %s)" % str(missing))

# ── 2. React-ported spot-checks ──────────────────────────────────────────────────

func _test_react_ported_values() -> void:
	# bread — React label "Bread Loaf", value 125 (NOT "Bread").
	_check(Rcfg.label("bread") == "Bread Loaf", "bread label is 'Bread Loaf' (React)")
	_check(Rcfg.value("bread") == 125, "bread value is 125 (React)")
	# fish_fillet — React label "Fillet" (NOT "Fish Fillet").
	_check(Rcfg.label("fish_fillet") == "Fillet", "fish_fillet label is 'Fillet' (React)")
	# iron_bar / iron_bar value.
	_check(Rcfg.label("iron_bar") == "Iron Bar", "iron_bar label is 'Iron Bar'")
	_check(Rcfg.value("iron_bar") == 8, "iron_bar value is 8 (React)")
	# A handful of values across families.
	_check(Rcfg.value("flour") == 8, "flour value is 8")
	_check(Rcfg.value("plank") == 6, "plank value is 6")
	_check(Rcfg.value("honey") == 300, "honey value is 300")
	_check(Rcfg.value("horseshoe") == 400, "horseshoe value is 400")
	_check(Rcfg.value("cut_gem") == 14, "cut_gem value is 14")
	_check(Rcfg.value("chowder") == 280, "chowder value is 280")
	# desc spot-checks (byte-identical to React ITEMS).
	_check(Rcfg.desc("dirt") == "Fertile soil hauled up from the special dirt tiles. Used in fertilizer, explosives, and animal pens.",
		"dirt desc matches React")
	_check(Rcfg.desc("bread") == "A wholesome loaf baked from flour and eggs, sold for 125 coins at the Bakery.",
		"bread desc matches React")
	_check(Rcfg.desc("iron_hinge") == "A forged iron hinge used in building construction. Story note: Bram requests these for the Caravan Post.",
		"iron_hinge desc matches React (the canonical Caravan-Post note)")
	# Resources with no React desc carry "".
	_check(Rcfg.desc("flour") == "", "flour has no desc")
	_check(Rcfg.desc("block") == "", "block has no desc")

# ── 3. Catalog integrity ──────────────────────────────────────────────────────────

func _test_family_validity() -> void:
	var valid := [ResourceConfig.FAMILY_FARM, ResourceConfig.FAMILY_REFINED, ResourceConfig.FAMILY_MINE, ResourceConfig.FAMILY_OTHER]
	var bad: Array = []
	for key in Rcfg.all_keys():
		if not valid.has(Rcfg.family(String(key))):
			bad.append(String(key))
	_check(bad.is_empty(), "every catalog row's family ∈ {farm,refined,mine,other} (bad: %s)" % str(bad))
	# jam is the deliberate reconciliation → "farm".
	_check(Rcfg.family("jam") == ResourceConfig.FAMILY_FARM, "jam family is 'farm' (Other→Farm reconciliation)")
	# Spot-check the original group buckets.
	_check(Rcfg.family("hay_bundle") == ResourceConfig.FAMILY_FARM, "hay_bundle family is 'farm'")
	_check(Rcfg.family("bread") == ResourceConfig.FAMILY_REFINED, "bread family is 'refined'")
	_check(Rcfg.family("supplies") == ResourceConfig.FAMILY_REFINED, "supplies family is 'refined'")
	_check(Rcfg.family("block") == ResourceConfig.FAMILY_MINE, "block family is 'mine'")
	_check(Rcfg.family("dirt") == ResourceConfig.FAMILY_MINE, "dirt family is 'mine'")
	_check(Rcfg.family("chowder") == ResourceConfig.FAMILY_OTHER, "chowder family is 'other'")
	# keys_in_family returns members.
	_check(Rcfg.keys_in_family(ResourceConfig.FAMILY_REFINED).has("bread"), "keys_in_family('refined') has bread")

func _test_currency_items() -> void:
	for id in ["runes", "influence"]:
		_check(Rcfg.kind(id) == ResourceConfig.KIND_ITEM, "%s kind is 'item'" % id)
		_check(Rcfg.glyph(id) != "", "%s has a non-empty glyph" % id)
		_check(Rcfg.value(id) == 0, "%s has value 0 (a currency, not a market good)" % id)
	_check(Rcfg.glyph("runes") == "🔮", "runes glyph is 🔮")
	_check(Rcfg.glyph("influence") == "◈", "influence glyph is ◈")
	# Resources are kind "resource" with NO glyph.
	_check(Rcfg.kind("flour") == ResourceConfig.KIND_RESOURCE, "flour kind is 'resource'")
	_check(Rcfg.glyph("flour") == "", "flour has no glyph")

# ── 4. UiKit wiring ────────────────────────────────────────────────────────────

func _test_uikit_pretty_name() -> void:
	# Catalogued resources get their canonical label.
	_check(UiKit.pretty_name("bread") == "Bread Loaf", "UiKit.pretty_name('bread') == 'Bread Loaf'")
	_check(UiKit.pretty_name("fish_fillet") == "Fillet", "UiKit.pretty_name('fish_fillet') == 'Fillet'")
	_check(UiKit.pretty_name("hay_bundle") == "Hay Bundle", "UiKit.pretty_name('hay_bundle') == 'Hay Bundle'")
	# Tile keys still strip the tile_/category prefix + capitalize (UNCHANGED path).
	_check(UiKit.pretty_name("tile_grass_grass") == "Grass", "UiKit.pretty_name('tile_grass_grass') == 'Grass'")
	_check(UiKit.pretty_name("tile_mine_stone") == "Stone", "UiKit.pretty_name('tile_mine_stone') == 'Stone'")
	# A tool id (not a resource) keeps capitalize().
	_check(UiKit.pretty_name("stone_hammer") == "Stone Hammer", "UiKit.pretty_name('stone_hammer') == 'Stone Hammer' (tool, capitalize path)")
	# An unknown key keeps capitalize().
	_check(UiKit.pretty_name("widget_xyz") == "Widget Xyz", "UiKit.pretty_name(unknown) keeps capitalize()")

func _test_uikit_icon_basename() -> void:
	# icon_basename defaults to the key for every current row (no overrides), so the asset path is
	# unchanged from before the catalog.
	_check(Rcfg.icon_basename("flour") == "flour", "icon_basename('flour') defaults to 'flour'")
	_check(Rcfg.icon_basename("bread") == "bread", "icon_basename('bread') defaults to 'bread'")
	# An uncatalogued key passes through unchanged (so tool/board-only icons still resolve).
	_check(Rcfg.icon_basename("bomb") == "bomb", "icon_basename passes through an uncatalogued key")

# ── 5. RecipeConfig.recipe_desc forwarding ──────────────────────────────────────

func _test_recipe_desc_forwarding() -> void:
	# A GOOD recipe's desc now comes from ResourceConfig (the resource's canonical React copy).
	_check(RC.recipe_desc("bread") == Rcfg.desc("bread"), "recipe_desc('bread') forwards to ResourceConfig")
	_check(RC.recipe_desc("chowder") == Rcfg.desc("chowder"), "recipe_desc('chowder') forwards to ResourceConfig")
	_check(RC.recipe_desc("bread") != "", "recipe_desc('bread') is non-empty")
	# A TOOL recipe keeps its own action desc (output is a ToolConfig id, no ResourceConfig row).
	_check(not Rcfg.has("axe"), "tool 'axe' is NOT a ResourceConfig row")
	_check(RC.recipe_desc("axe") == "Fells every tree tile on the board.",
		"recipe_desc('axe') keeps the TOOL action desc (not forwarded)")

# ── 6. InventoryScreen grouping ──────────────────────────────────────────────────

func _test_inventory_grouping() -> void:
	var ScreenScript = load("res://scenes/InventoryScreen.gd")
	var inv = ScreenScript.new()
	# group_of derives from ResourceConfig.family; the original buckets are preserved.
	_check(inv.group_of("hay_bundle") == "Farm Goods", "group_of(hay_bundle) == 'Farm Goods'")
	_check(inv.group_of("bread") == "Refined", "group_of(bread) == 'Refined'")
	_check(inv.group_of("block") == "Mine", "group_of(block) == 'Mine'")
	_check(inv.group_of("chowder") == "Other", "group_of(chowder) == 'Other'")
	_check(inv.group_of("widget_xyz") == "Other", "group_of(unknown) == 'Other'")
	# jam moved Other → Farm (the deliberate reconciliation).
	_check(inv.group_of("jam") == "Farm Goods", "group_of(jam) == 'Farm Goods' (Other→Farm reconciliation)")
	inv.free()
