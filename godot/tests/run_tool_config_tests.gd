extends SceneTree
## Batch 2 — headless parity tests for the display-metadata that moved INTO the owning
## *Config catalogs:
##   A. ToolConfig.desc — every tool row now carries a player-facing `desc` (the HUD tool
##      rack tooltip + armed banner read it via ToolConfig.tool_desc). The text is sourced
##      BYTE-IDENTICAL from the React ITEMS[*].desc strings in src/constants.ts. Previously
##      this copy was stranded in Hud._tool_description (now deleted).
##   B. AbilityConfig.phrase — the ability id→phrase TEMPLATE that used to live in
##      TileVariantUi._ability_phrase now lives on the owning ability catalog. The produced
##      strings are unchanged (TileVariantUi._ability_phrase is now a thin wrapper that
##      resolves the pool_weight display name in the UI layer and forwards the rest).
##
## Same dependency-free harness as run_tools_tests.gd / run_resource_config_tests.gd. Run
## from the godot/ project root:
##   godot --headless --script res://tests/run_tool_config_tests.gd
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

func _initialize() -> void:
	print("\n── ToolConfig.desc + AbilityConfig.phrase (Batch 2) ──")
	# A — ToolConfig.desc
	_test_every_tool_has_nonempty_desc()
	_test_tool_desc_react_canonical_spotchecks()
	_test_tool_desc_helper_guards()
	# B — AbilityConfig.phrase
	_test_ability_phrase_strings()
	_test_ability_phrase_unknown_and_pool_weight()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── A. ToolConfig.desc ────────────────────────────────────────────────────────

## Every catalogued tool row carries a non-empty player-facing description, reachable
## via the tool_desc helper.
func _test_every_tool_has_nonempty_desc() -> void:
	for id in ToolConfig.all_ids():
		var via_helper: String = ToolConfig.tool_desc(id)
		_check(via_helper != "", "tool '%s' has a non-empty desc" % id)
		# The helper and the raw row agree.
		var row: Dictionary = ToolConfig.get_tool(id)
		_check(String(row.get("desc", "")) == via_helper,
			"tool '%s' tool_desc matches the row's desc field" % id)

## Spot-check a few descs against the React-canonical text BYTE-IDENTICALLY. The en-dash (—),
## the × glyph, and the curly/straight apostrophes all matter — these are copied verbatim from
## src/constants.ts ITEMS.
func _test_tool_desc_react_canonical_spotchecks() -> void:
	_check(ToolConfig.tool_desc("bomb") == "Tap a tile — destroys a 3×3 area around it.",
		"bomb desc matches React canonical (en-dash + 3×3)")
	_check(ToolConfig.tool_desc("axe") == "Fells all tree tiles on the board instantly — every oak and related tree is swept into inventory.",
		"axe desc matches React canonical (richer than the old HUD string)")
	_check(ToolConfig.tool_desc("rake") == "Tap a tile — sweeps every 4-connected tile of the same type and collects them.",
		"rake desc matches React canonical (4-connected)")
	_check(ToolConfig.tool_desc("sickle") == "Sweeps a single row in one stroke. Tap any tile to harvest that entire row.",
		"sickle desc matches React canonical")
	_check(ToolConfig.tool_desc("auger") == "Tap a column — bores straight down, clearing every tile in it.",
		"auger desc matches React canonical")
	_check(ToolConfig.tool_desc("blast_charge") == "Tap a tile — clears its entire row and column in a cross-shaped blast.",
		"blast_charge desc matches React canonical")
	_check(ToolConfig.tool_desc("magnet") == "Tap a tile — collapses every ore tile (coal/iron/gold/gem) in a 3×3 area into stone rubble for re-chaining.",
		"magnet desc matches React canonical")
	# Godot SCYTHE maps to React `clear` ("Scythe").
	_check(ToolConfig.tool_desc("scythe") == "Clears six random tiles and harvests their basic resources.",
		"scythe desc maps to React `clear` canonical")
	_check(ToolConfig.tool_desc("stone_hammer") == "Smashes every stone tile on the board — a fast way to feed the chain into block tier.",
		"stone_hammer desc matches React canonical")
	_check(ToolConfig.tool_desc("drill") == "A pneumatic drill — converts every special-dirt tile in the mine into rough stone tiles.",
		"drill desc matches React canonical")
	_check(ToolConfig.tool_desc("philosophers_stone") == "The mythic stone — transmutes every stone tile in the mine into gold tiles.",
		"philosophers_stone desc matches React canonical (straight apostrophe in label, none in desc)")
	_check(ToolConfig.tool_desc("herders_crook") == "A shepherd's crook that rounds up every herd animal tile in one motion.",
		"herders_crook desc matches React canonical (apostrophe)")

## tool_desc guards on an unknown id (returns "").
func _test_tool_desc_helper_guards() -> void:
	_check(ToolConfig.tool_desc("not_a_tool") == "", "tool_desc(unknown) returns empty string")

# ── B. AbilityConfig.phrase ───────────────────────────────────────────────────

## Each templated ability id produces the SAME string the old TileVariantUi._ability_phrase did.
func _test_ability_phrase_strings() -> void:
	_check(AbilityConfig.phrase("free_moves", {"count": 2}) == "+2 free moves each run",
		"phrase(free_moves, count=2) == '+2 free moves each run'")
	_check(AbilityConfig.phrase("coin_bonus_flat", {"amount": 3}) == "+3 coins per chain",
		"phrase(coin_bonus_flat, amount=3) == '+3 coins per chain'")
	_check(AbilityConfig.phrase("coin_bonus_per_tile", {"amount": 1}) == "+1 coins per tile chained",
		"phrase(coin_bonus_per_tile, amount=1) == '+1 coins per tile chained'")
	_check(AbilityConfig.phrase("free_turn_if_chain", {"minChain": 5}) == "Free turn on a chain of 5+",
		"phrase(free_turn_if_chain, minChain=5) == 'Free turn on a chain of 5+'")

## pool_weight interpolates the (pre-resolved, UI-layer) target label; an unknown / untemplated
## ability id yields "".
func _test_ability_phrase_unknown_and_pool_weight() -> void:
	_check(AbilityConfig.phrase("pool_weight", {"amount": 2}, "Grass") == "+2 Grass tiles on the board",
		"phrase(pool_weight, amount=2, 'Grass') interpolates the resolved label")
	_check(AbilityConfig.phrase("threshold_reduce", {"amount": 1}) == "",
		"phrase(untemplated ability) yields '' (no summary line)")
	_check(AbilityConfig.phrase("not_an_ability", {}) == "",
		"phrase(unknown id) yields ''")
