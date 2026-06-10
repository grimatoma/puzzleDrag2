extends SceneTree
## Headless unit-test runner for T22 — multi-settlement founding + per-zone inventory + Hearth-
## Tokens (the ACTIVE-ZONE-VIEW + ARCHIVE model). Run from the godot/ project root:
##   godot --headless --script res://tests/run_settlements_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_town_tests.gd. Covers (per the T22 brief):
##   • home auto-founded; a fresh game has NO archives (byte-identical to pre-T22)
##   • found_settlement gating (cost / prior-complete / discovered) + payment
##   • per-zone inventory isolation (resources at zone A don't appear at zone B)
##   • _activate_zone swaps the live fields + round-trips
##   • founding cost grows with the founded count
##   • settlement completion grants the right Hearth-Token ONCE; 3 tokens → Old Capital unlocked
##   • build / farm founding-gate
##   • save/load the full multi-settlement model
##   • a home-only game round-trips with empty archives

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Multi-settlement (T22) tests ───────────────────")
	# Settlement completion resolves the home keeper via give_keeper_reward (in _complete_home and
	# _test_completion_grants_token_once), which is gated by the keeper feature flag (shipped default
	# OFF). Force it ON for this run so those completion paths work (mirrors fire_hazard_force usage).
	KeeperConfig.enabled = true
	_test_home_auto_founded()
	_test_fresh_game_no_archives()
	_test_config_settlement_types()
	_test_config_biomes()
	_test_founding_cost_growth()
	_test_found_gate_needs_prior()
	_test_found_gate_not_settlement()
	_test_found_gate_cant_afford()
	_test_found_success_pays_and_records()
	_test_activate_zone_swaps_live_fields()
	_test_per_zone_inventory_isolation()
	_test_activate_zone_roundtrip()
	_test_zone_board_template_is_live()
	_test_completion_grants_token_once()
	_test_three_tokens_unlock_old_capital()
	_test_old_capital_gate_blocks_until_tokens()
	_test_build_founding_gate()
	_test_farm_founding_gate()
	_test_travel_founding_gate_board_node()
	_test_save_load_full_model()
	_test_save_load_home_only_byte_identical()
	# UI integration (FounderModal + CartographyScreen founding affordance) — needs a scene tree.
	await _test_founder_modal_founds()
	await _test_cartography_found_button_gating()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

# ── test helpers ──────────────────────────────────────────────────────────────

## Complete the HOME farm settlement: 4 placed buildings (the farm keeper's
## appears_after_buildings) + the keeper resolved (Coexist). After this,
## settlement_completed("home") is true and grant_earned_hearth_tokens grants heirloomSeed.
func _complete_home(g: GameState) -> void:
	g.buildings = ["lumber_camp", "granary", "coop", "garden"]
	# give_keeper_reward sets the keeper_farm_coexist flag (requires buildings.size() >= 4).
	g.give_keeper_reward("farm", "coexist")

# ── tests ───────────────────────────────────────────────────────────────────

func _test_home_auto_founded() -> void:
	var g := GameState.new()
	_check(g.is_settlement_founded("home"), "home is auto-founded on a fresh game")
	_check(not g.is_settlement_founded("meadow"), "meadow is NOT founded on a fresh game")
	_check(g.map_current == "home", "fresh game's active zone is home")
	_check(g.founded_settlement_count() == 1, "founded count is 1 (home, implicit) on a fresh game")

func _test_fresh_game_no_archives() -> void:
	var g := GameState.new()
	_check(g.zone_archives.is_empty(), "fresh game has NO zone archives (home is the live zone)")
	_check(g.settlements.is_empty(), "fresh game's settlements map is empty (home never recorded)")
	_check(g.heirlooms.is_empty(), "fresh game holds no Hearth-Tokens")

func _test_config_settlement_types() -> void:
	_check(CartographyConfig.settlement_type_for_zone("home") == "farm", "home → farm type")
	_check(CartographyConfig.settlement_type_for_zone("meadow") == "farm", "meadow → farm type")
	_check(CartographyConfig.settlement_type_for_zone("orchard") == "farm", "orchard → farm type")
	_check(CartographyConfig.settlement_type_for_zone("quarry") == "mine", "quarry → mine type")
	_check(CartographyConfig.settlement_type_for_zone("caves") == "mine", "caves → mine type")
	_check(CartographyConfig.settlement_type_for_zone("harbor") == "harbor", "harbor → harbor type")
	_check(CartographyConfig.settlement_type_for_zone("crossroads") == "", "crossroads (event) → no type")
	_check(CartographyConfig.settlement_type_for_zone("pit") == "", "pit (boss) → no type")

func _test_config_biomes() -> void:
	_check(CartographyConfig.biomes_for_type("farm").size() == 4, "farm has 4 biome options")
	_check(CartographyConfig.biomes_for_type("mine").size() == 4, "mine has 4 biome options")
	_check(CartographyConfig.biomes_for_type("harbor").size() == 4, "harbor has 4 biome options")
	# resolve_biome_choice picks the wanted id, else the first.
	var b := CartographyConfig.resolve_biome_choice("farm", "forest")
	_check(String(b.get("id", "")) == "forest", "resolve_biome_choice honours the wanted id")
	var b2 := CartographyConfig.resolve_biome_choice("farm", "bogus")
	_check(String(b2.get("id", "")) == "prairie", "resolve_biome_choice falls back to the first option")
	_check(CartographyConfig.HEARTH_TOKEN_FOR_TYPE["farm"] == "heirloomSeed", "farm token = heirloomSeed")
	_check(CartographyConfig.HEARTH_TOKEN_FOR_TYPE["mine"] == "pactIron", "mine token = pactIron")
	_check(CartographyConfig.HEARTH_TOKEN_FOR_TYPE["harbor"] == "tidesingerPearl", "harbor token = tidesingerPearl")

func _test_founding_cost_growth() -> void:
	var g := GameState.new()
	# With home counted (k=1), the FIRST paid founding costs base (300).
	_check(g.settlement_founding_cost() == 300, "first paid founding costs the base 300 coins")
	# After founding meadow (count → 2, k=2), the next costs base × 1.7 = 510.
	g.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	_check(g.founded_settlement_count() == 2, "founded count is 2 after recording meadow")
	_check(g.settlement_founding_cost() == int(round(300.0 * 1.7)), "third paid founding costs base × growth (510)")

func _test_found_gate_needs_prior() -> void:
	var g := GameState.new()
	g.coins = 100000
	# Discover meadow so the "discovered" precondition is met (travel to it requires home complete?
	# No — travel only needs adjacency. But found_settlement gates on a PRIOR completed settlement).
	var res := g.found_settlement("meadow", "prairie")
	_check(not res.get("ok", false), "founding #2 blocked before any settlement is complete")
	_check(res.get("reason", "") == "needs_prior", "block reason is needs_prior")

func _test_found_gate_not_settlement() -> void:
	var g := GameState.new()
	g.coins = 100000
	_complete_home(g)   # clears the needs_prior gate
	var res := g.found_settlement("crossroads", "")   # event node, no settlement type
	_check(not res.get("ok", false), "founding a non-settlement node is blocked")
	_check(res.get("reason", "") == "not_settlement", "block reason is not_settlement")

func _test_found_gate_cant_afford() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 10   # below the 300 base cost
	var res := g.found_settlement("meadow", "prairie")
	_check(not res.get("ok", false), "founding blocked when coins < cost")
	_check(res.get("reason", "") == "cant_afford", "block reason is cant_afford")
	_check(g.coins == 10, "coins untouched on a blocked founding")

func _test_found_success_pays_and_records() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 500
	var res := g.found_settlement("meadow", "forest")
	_check(res.get("ok", false), "founding meadow succeeds when affordable + prior complete")
	_check(int(res.get("cost", 0)) == 300, "founding paid the 300 base cost")
	_check(g.coins == 200, "coins deducted by the cost (500 - 300)")
	_check(g.is_settlement_founded("meadow"), "meadow is now founded")
	_check(g.settlement_biome_id("meadow") == "forest", "meadow records the chosen Forest biome")
	_check(g.zone_archives.has("meadow"), "founding seeds a fresh archive for meadow")
	# Re-founding is a no-op.
	var res2 := g.found_settlement("meadow", "prairie")
	_check(res2.get("reason", "") == "founded", "re-founding an existing settlement is blocked")

func _test_activate_zone_swaps_live_fields() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 500
	# Home's live inventory has some grain.
	g.inventory = {"flour": 9}
	g.found_settlement("meadow", "prairie")
	var changed := g._activate_zone("meadow")
	_check(changed, "_activate_zone returns true when the active zone changes")
	_check(g.map_current == "meadow", "active zone is now meadow")
	_check(int(g.inventory.get("flour", 0)) == 0, "meadow's fresh live inventory has no flour")
	_check(g.buildings.is_empty(), "meadow's fresh live buildings are empty")
	_check(g.zone_archives.has("home"), "home's state is archived while meadow is active")
	# The home archive kept home's flour + buildings.
	var home_arc: Dictionary = g.zone_archives["home"]
	_check(int(home_arc.get("inventory", {}).get("flour", 0)) == 9, "home archive preserved its 9 flour")
	_check((home_arc.get("buildings", []) as Array).size() == 4, "home archive preserved its 4 buildings")
	# Activating the already-active zone is a no-op.
	_check(not g._activate_zone("meadow"), "_activate_zone is a no-op for the already-active zone")

func _test_per_zone_inventory_isolation() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 5000
	g.inventory = {"flour": 12}        # home stockpile
	g.found_settlement("meadow", "prairie")
	g._activate_zone("meadow")
	g.inventory["plank"] = 7           # meadow-only resource
	_check(int(g.inventory.get("flour", 0)) == 0, "meadow does not see home's flour")
	_check(int(g.inventory.get("plank", 0)) == 7, "meadow has its own plank")
	# Back to home — home keeps its flour, sees no plank.
	g._activate_zone("home")
	_check(int(g.inventory.get("flour", 0)) == 12, "home still has its 12 flour after the round-trip")
	_check(int(g.inventory.get("plank", 0)) == 0, "home does not see meadow's plank")

func _test_activate_zone_roundtrip() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 5000
	g.inventory = {"flour": 3}
	g.settlement.tier = TownConfig.TIER_VILLAGE
	g.farm_turns_used = 4
	g.found_settlement("orchard", "prairie")
	g._activate_zone("orchard")
	g.inventory["soup"] = 2
	g.settlement.tier = TownConfig.TIER_CAMP
	g.farm_turns_used = 1
	g._activate_zone("home")
	_check(int(g.inventory.get("flour", 0)) == 3 and not g.inventory.has("soup"), "home inventory round-trips intact")
	_check(g.settlement.tier == TownConfig.TIER_VILLAGE, "home settlement tier round-trips (Village)")
	_check(g.farm_turns_used == 4, "home farm_turns_used round-trips (4)")
	g._activate_zone("orchard")
	_check(int(g.inventory.get("soup", 0)) == 2, "orchard inventory round-trips intact")
	_check(g.settlement.tier == TownConfig.TIER_CAMP, "orchard settlement tier round-trips (Camp)")
	_check(g.farm_turns_used == 1, "orchard farm_turns_used round-trips (1)")

## The live farm board follows the ACTIVE farm node (config dedup + per-zone board wiring): with no
## explicit zone the board is home's TEMPERATE_FARM (budget 10, lean fruit), and travelling to the
## orchard makes the live board ORCHARD_FARM (budget 12, fruit-heavy). Proves ZoneConfig is now a thin
## forwarder over CartographyConfig AND that _active_farm_zone() drives the season pool + budget.
## (_activate_zone does not gate on founding, so it's called directly here.)
func _test_zone_board_template_is_live() -> void:
	# Config forwarders resolve each node's own board template (home 10, orchard 12).
	_check(ZoneConfig.base_turns("home") == 10, "ZoneConfig.base_turns('home') forwards to 10")
	_check(ZoneConfig.base_turns("orchard") == 12, "ZoneConfig.base_turns('orchard') forwards to 12")
	# Fresh game: home is the active zone, no run → home's TEMPERATE_FARM is live.
	var g := GameState.new()
	_check(g.map_current == "home", "fresh game's active zone is home")
	_check(g.farm_turn_budget() == 10, "home farm_turn_budget == 10 (TEMPERATE_FARM)")
	var home_fruit_tile: int = g._category_pool_tile("fruit")
	var home_fruit: int = _count_tile(g.active_tile_pool(), home_fruit_tile)
	# Travel to the orchard → the live board becomes ORCHARD_FARM (budget 12, Spring fruit 0.40).
	g._activate_zone("orchard")
	_check(g.farm_turn_budget() == 12, "orchard farm_turn_budget == 12 (ORCHARD_FARM)")
	var orchard_fruit: int = _count_tile(g.active_tile_pool(), g._category_pool_tile("fruit"))
	_check(orchard_fruit > home_fruit,
		"orchard fruit-tile count (%d) > home (%d) — ORCHARD_FARM Spring fruit 0.40 vs home 0.04" % [orchard_fruit, home_fruit])
	# Travel back home → the default-to-home budget is restored.
	g._activate_zone("home")
	_check(g.farm_turn_budget() == 10, "farm_turn_budget back to 10 after returning home (default-to-home)")

## Count entries in `pool` equal to tile int `tile`.
func _count_tile(pool: Array, tile: int) -> int:
	var n: int = 0
	for t in pool:
		if int(t) == tile:
			n += 1
	return n

func _test_completion_grants_token_once() -> void:
	var g := GameState.new()
	# Not complete yet → no token.
	_check(not g.settlement_completed("home"), "home is not complete before buildings + keeper")
	g.buildings = ["lumber_camp", "granary", "coop", "garden"]
	_check(not g.settlement_completed("home"), "home not complete with buildings but unresolved keeper")
	# Resolve the keeper → complete → token granted on the fold inside give_keeper_reward.
	g.give_keeper_reward("farm", "coexist")
	_check(g.settlement_completed("home"), "home is complete once built up + keeper resolved")
	_check(int(g.heirlooms.get("heirloomSeed", 0)) == 1, "completing the home farm grants heirloomSeed once")
	_check(g.hearth_token_count() == 1, "hearth_token_count is 1")
	# Re-granting is idempotent (no duplicate / no second token type).
	var newly := g.grant_earned_hearth_tokens()
	_check(newly.is_empty(), "re-granting earns no NEW token (idempotent)")
	_check(g.hearth_token_count() == 1, "hearth_token_count stays 1")

func _test_three_tokens_unlock_old_capital() -> void:
	var g := GameState.new()
	_check(not g.is_old_capital_unlocked(), "Old Capital locked with 0 tokens")
	g.heirlooms["heirloomSeed"] = 1
	_check(not g.is_old_capital_unlocked(), "Old Capital locked with 1 token")
	g.heirlooms["pactIron"] = 1
	_check(not g.is_old_capital_unlocked(), "Old Capital locked with 2 tokens")
	g.heirlooms["tidesingerPearl"] = 1
	_check(g.is_old_capital_unlocked(), "Old Capital UNLOCKED with all 3 tokens")
	_check(g.hearth_token_count() == 3, "hearth_token_count is 3")

func _test_old_capital_gate_blocks_until_tokens() -> void:
	var g := GameState.new()
	# Travel-block reason for the Old Capital is "needs_tokens" until all 3 are held.
	_check(g.travel_block_reason("oldcapital") == "needs_tokens", "oldcapital blocked needs_tokens with 0 tokens")
	g.heirlooms = {"heirloomSeed": 1, "pactIron": 1, "tidesingerPearl": 1}
	# With all tokens, the token gate clears; the node falls through to the normal adjacency gate
	# (it is not adjacent to home, so it is "unreachable" — but NOT "needs_tokens").
	_check(g.travel_block_reason("oldcapital") != "needs_tokens", "oldcapital token gate clears with 3 tokens")

func _test_build_founding_gate() -> void:
	var g := GameState.new()
	# Pretend the player is AT an unfounded zone (orchard) — the founding gate reads map_current.
	g.map_current = "orchard"
	g.settlement.tier = TownConfig.TIER_CITY   # clear the tier gate so only the founding gate trips
	g.inventory = {"plank": 999, "hay_bundle": 999, "flour": 999, "eggs": 999, "soup": 999}
	_check(not g.is_settlement_founded("orchard"), "orchard is unfounded for this test")
	_check(not g.can_build("lumber_camp"), "can_build is false at an unfounded active zone")
	var res := g.build("lumber_camp")
	_check(res.get("reason", "") == "unfounded", "build at an unfounded zone reports 'unfounded'")
	# Record orchard as founded (the founding-flow guards are exercised separately) → the gate clears.
	g.settlements["orchard"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	_check(g.can_build("lumber_camp"), "can_build clears once the zone is founded")

func _test_farm_founding_gate() -> void:
	var g := GameState.new()
	g.coins = 5000
	# An unfounded active zone blocks start_farm_run.
	g.map_current = "meadow"
	var res := g.start_farm_run([], false)
	_check(res.get("reason", "") == "unfounded", "start_farm_run at an unfounded zone reports 'unfounded'")
	# home (founded) does not trip the gate (it fails later on coins/etc., but NOT unfounded).
	g.map_current = "home"
	var res2 := g.start_farm_run([], false)
	_check(res2.get("reason", "") != "unfounded", "start_farm_run at founded home does not trip the founding gate")

func _test_travel_founding_gate_board_node() -> void:
	var g := GameState.new()
	g.coins = 5000
	# You can't TRAVEL to a board zone you haven't unlocked (founded) yet. Meadow is adjacent,
	# level-1, and affordable, but UNFOUNDED — so the gate refuses the trip: the marker stays put
	# and no entry cost is charged (this is what stops the player stranding on an un-settled node).
	_check(not g.can_travel_to("meadow"), "can't travel to an UNFOUNDED board node (meadow)")
	_check(g.travel_block_reason("meadow") == "unfounded", "meadow blocked: unfounded")
	var before_coins := g.coins
	var res := g.travel_to("meadow")
	_check(not res.get("ok", false), "travel_to an unfounded board node is REFUSED (ok:false)")
	_check(String(res.get("reason", "")) == "unfounded", "refused travel reports reason 'unfounded'")
	_check(g.map_current == "home", "the marker did NOT move (still home) — no stranding")
	_check(g.coins == before_coins, "no entry cost charged for a refused travel (coins unchanged)")
	# Founding meadow (the unlock / discovery action) opens travel to it. The founding-flow guards
	# (needs_prior, cost) are covered by the founding tests; here we just record the founding.
	g.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	_check(g.can_travel_to("meadow"), "founding meadow UNLOCKS travel to it")
	var res2 := g.travel_to("meadow")
	_check(bool(res2.get("ok", false)), "travel_to a FOUNDED board node succeeds")
	_check(bool(res2.get("entered", false)) and g.active_biome == "farm", "founded farm node enters its board")
	_check(g.map_current == "meadow", "marker moved to the founded meadow")
	_check(g.coins == before_coins - CartographyConfig.entry_cost("meadow"), "founded travel charges the entry cost")

	# A pre-fix save stranded ON an unfounded board node is recovered on load: the active node snaps
	# back to home (always founded) so the player can farm again instead of being stuck off-grid.
	var stranded := GameState.new()
	stranded._seed_map_state()
	stranded.map_current = "orchard"                  # an unfounded farm node (pre-fix could land here)
	stranded.map_node_state["orchard"] = "visited"
	var loaded := GameState.from_dict(stranded.to_dict())
	_check(loaded.map_current == "home", "a save stranded on an unfounded board node loads back at home")

func _test_save_load_full_model() -> void:
	var g := GameState.new()
	_complete_home(g)
	g.coins = 5000
	g.inventory = {"flour": 11}
	g.found_settlement("meadow", "forest")
	g._activate_zone("meadow")
	g.inventory["plank"] = 6
	g.heirlooms["heirloomSeed"] = 1
	var d := g.to_dict()
	var g2 := GameState.from_dict(d)
	_check(g2.map_current == "meadow", "save/load preserves the active zone (meadow)")
	_check(int(g2.inventory.get("plank", 0)) == 6, "save/load preserves meadow's live inventory (plank 6)")
	_check(not g2.inventory.has("flour"), "meadow's live inventory has no flour after load")
	_check(g2.is_settlement_founded("meadow"), "save/load preserves the founding")
	_check(g2.settlement_biome_id("meadow") == "forest", "save/load preserves the chosen biome")
	_check(g2.zone_archives.has("home"), "save/load preserves the home archive")
	_check(int((g2.zone_archives["home"] as Dictionary).get("inventory", {}).get("flour", 0)) == 11,
		"save/load preserves home's archived flour (11)")
	_check(int(g2.heirlooms.get("heirloomSeed", 0)) == 1, "save/load preserves the Hearth-Token")
	# Round-trip back to home recovers home's flour.
	g2._activate_zone("home")
	_check(int(g2.inventory.get("flour", 0)) == 11, "post-load activation recovers home's flour")

func _test_save_load_home_only_byte_identical() -> void:
	# A home-only game (never founded / travelled) must round-trip with NO archives — proving the
	# additive model leaves the pre-T22 save shape unchanged.
	var g := GameState.new()
	g.coins = 150
	g.inventory = {"flour": 4, "hay_bundle": 7}
	g.buildings = []
	var d := g.to_dict()
	var g2 := GameState.from_dict(d)
	_check(g2.zone_archives.is_empty(), "home-only save loads with NO archives")
	_check(g2.settlements.is_empty(), "home-only save loads with an empty settlements map")
	_check(g2.heirlooms.is_empty(), "home-only save loads with no Hearth-Tokens")
	_check(g2.map_current == "home", "home-only save loads with home active")
	_check(int(g2.inventory.get("flour", 0)) == 4 and int(g2.inventory.get("hay_bundle", 0)) == 7,
		"home-only save preserves the flat live inventory exactly")
	# A pre-T22 save dict (no T22 keys at all) loads home-only with the live fields intact.
	d.erase("settlements")
	d.erase("zone_archives")
	d.erase("heirlooms")
	var g3 := GameState.from_dict(d)
	_check(g3.zone_archives.is_empty() and g3.settlements.is_empty() and g3.heirlooms.is_empty(),
		"a pre-T22 save (no T22 keys) loads home-only with empty archives/settlements/tokens")
	_check(int(g3.inventory.get("flour", 0)) == 4, "pre-T22 save preserves the live inventory")

# ── UI integration (FounderModal + CartographyScreen) ────────────────────────────

## The FounderModal presents biome options for an unfounded settlement node and, on a biome pick,
## founds it the REAL way (game.found_settlement) + emits `founded`.
func _test_founder_modal_founds() -> void:
	var FounderModalScript = load("res://scenes/FounderModal.gd")
	var modal = FounderModalScript.new()
	root.add_child(modal)
	var g := GameState.new()
	_complete_home(g)            # clears the needs_prior gate
	g.coins = 1000
	modal.setup(g)
	modal.open_for("meadow")
	await process_frame
	_check(modal.current_zone() == "meadow", "founder modal targets meadow")
	# All four farm biomes are offered as enabled buttons (player can afford + prior complete).
	_check(modal._action_buttons.has("biome:prairie"), "founder offers the Prairie biome")
	_check(modal._action_buttons.has("biome:forest"), "founder offers the Forest biome")
	_check(not modal._action_buttons["biome:forest"].disabled, "biome button is enabled when affordable")
	# Capture the `founded` signal, then pick Forest.
	var captured := {"zone": "", "biome": ""}
	modal.founded.connect(func(z, b): captured["zone"] = z; captured["biome"] = b)
	modal._action_buttons["biome:forest"].emit_signal("pressed")
	await process_frame
	_check(modal.is_founded(), "founder modal reports founded after a pick")
	_check(g.is_settlement_founded("meadow"), "meadow is founded via the modal")
	_check(g.settlement_biome_id("meadow") == "forest", "the chosen Forest biome is recorded")
	_check(g.coins == 700, "the 300 founding cost was paid (1000 - 300)")
	_check(captured["zone"] == "meadow" and captured["biome"] == "forest", "the `founded` signal carried {meadow, forest}")
	modal.queue_free()

## The CartographyScreen detail panel shows an ENABLED "Found Settlement" button for a discovered,
## unfounded settlement node only when a prior settlement is complete AND the player can afford it.
func _test_cartography_found_button_gating() -> void:
	var ScreenScript = load("res://scenes/CartographyScreen.gd")
	var screen = ScreenScript.new()
	root.add_child(screen)
	var g := GameState.new()
	g.coins = 1000
	screen.setup(g)
	screen.open()
	# Before any settlement is complete, founding is blocked → NO enabled found button on meadow.
	screen.select_node("meadow")
	await process_frame
	_check(not screen._action_buttons.has("found:meadow"), "no enabled Found button before a prior settlement is complete")
	# Complete home → the found button appears on meadow.
	_complete_home(g)
	screen.select_node("home")   # force a detail re-render
	screen.select_node("meadow")
	await process_frame
	_check(screen._action_buttons.has("found:meadow"), "Found button appears once a prior settlement is complete + affordable")
	# Capture `found_requested` and press it.
	var requested := {"id": ""}
	screen.found_requested.connect(func(id): requested["id"] = id)
	screen._action_buttons["found:meadow"].emit_signal("pressed")
	await process_frame
	_check(requested["id"] == "meadow", "pressing Found emits found_requested('meadow')")
	# A FOUNDED settlement shows no Found button (founding it directly, then re-render).
	g.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	screen.select_node("home")
	screen.select_node("meadow")
	await process_frame
	_check(not screen._action_buttons.has("found:meadow"), "no Found button on an already-founded settlement")
	screen.queue_free()
