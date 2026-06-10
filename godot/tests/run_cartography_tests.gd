extends SceneTree
## Headless tests for the T26 CARTOGRAPHY world map — the FULL 11-node illustrated parchment
## map + the travel state machine. Run from the godot/ project root:
##   godot --headless --script res://tests/run_cartography_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Layers:
##   1. CartographyConfig pure data — 11 nodes / 14 edges / 7 regions / node colours / kind
##      labels / lore, per-node board kinds + board templates (farm upgradeMap/seasonDrops/
##      baseTurns), adjacency + neighbour helpers, the board_biome rename (fish→harbor).
##   2. GameState travel state machine — default seed (home visited, neighbours discovered),
##      adjacency-from-visited + level + cost gating, discovery on travel, fast-travel to any
##      visited node, per-node board-kind entry (farm/mine/fish), the Old Capital token gate,
##      and save/load round-trip of the travel state.
##   3. ViewRouter pure-state — the CARTOGRAPHY modal + resolve("cartography"/"world").
##   4. Main integration — _open_cartography lazily creates + reuses the screen; the deeplink
##      shows/hides it; the screen reads the current node + node states; pressing an enabled
##      Travel button enters the node's board (pool swapped).

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
	print("\n── Cartography world map tests (T26) ───────────────")
	await _run()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

func _run() -> void:
	# ── 1. CartographyConfig pure data ────────────────────────────────────────
	var nodes := CartographyConfig.all()
	_check(nodes.size() == 11, "CartographyConfig.all() has 11 nodes (got %d)" % nodes.size())
	var ids: Array = []
	for n in nodes:
		ids.append(String(n.get("id", "")))
	for want in ["home", "meadow", "orchard", "crossroads", "quarry", "caves",
			"fairground", "forge", "pit", "harbor", "oldcapital"]:
		_check(ids.has(want), "nodes include '%s'" % want)
	_check(CartographyConfig.EDGES.size() == 14, "EDGES has 14 roads (got %d)" % CartographyConfig.EDGES.size())
	_check(CartographyConfig.REGIONS.size() == 7, "REGIONS has 7 regions (got %d)" % CartographyConfig.REGIONS.size())
	for rid in ["hearth", "farm", "wilds", "mine", "coast", "boss", "capital"]:
		_check(not CartographyConfig.region_by_id(rid).is_empty(), "region '%s' present" % rid)
	_check(CartographyConfig.by_id("nope").is_empty(), "by_id('nope') returns an empty dict")

	# Sample edges (faithful to MAP_EDGES).
	_check(CartographyConfig.is_adjacent("home", "meadow"), "edge home–meadow")
	_check(CartographyConfig.is_adjacent("home", "harbor"), "edge home–harbor")
	_check(CartographyConfig.is_adjacent("pit", "oldcapital"), "edge pit–oldcapital")
	_check(not CartographyConfig.is_adjacent("home", "pit"), "no direct home–pit edge")
	var home_nb := CartographyConfig.neighbors_of("home")
	_check(home_nb.has("meadow") and home_nb.has("orchard") and home_nb.has("harbor") and home_nb.size() == 3,
		"neighbors_of('home') == [meadow, orchard, harbor] (got %s)" % str(home_nb))

	# Node colours + kind labels present for every kind.
	for kind in ["home", "farm", "mine", "fish", "festival", "boss", "event", "capital"]:
		_check(CartographyConfig.NODE_COLORS.has(kind), "NODE_COLORS has '%s'" % kind)
		_check(CartographyConfig.KIND_LABELS.has(kind), "KIND_LABELS has '%s'" % kind)

	# Lore ported for every node.
	for nid in ids:
		var lore := CartographyConfig.lore_for(nid)
		_check(not lore.is_empty() and String(lore.get("epitaph", "")) != "",
			"lore_for('%s') has a flavour quote" % nid)
	_check(String(CartographyConfig.lore_for("home").get("speaker", "")) == "Wren",
		"home lore speaker is Wren")

	# Board kind + board-biome rename + per-node templates.
	_check(CartographyConfig.board_biome("home") == "farm", "home board_biome == farm")
	_check(CartographyConfig.board_biome("quarry") == "mine", "quarry board_biome == mine")
	_check(CartographyConfig.board_biome("harbor") == "harbor", "harbor board_biome == harbor (fish→harbor rename)")
	_check(CartographyConfig.board_biome("crossroads") == "", "crossroads (event) has no board biome")
	_check(CartographyConfig.is_board_node("meadow"), "meadow is a board node")
	_check(not CartographyConfig.is_board_node("pit"), "pit (boss) is NOT a board node")
	# Farm templates: home/meadow share TEMPERATE (base 10); orchard is ORCHARD (base 12).
	_check(CartographyConfig.base_turns("home") == 10, "home farm baseTurns == 10")
	_check(CartographyConfig.base_turns("orchard") == 12, "orchard farm baseTurns == 12 (ORCHARD template)")
	_check(CartographyConfig.base_turns("caves") == 12, "caves mine baseTurns == 12 (MINE_EXTENDED)")
	_check(CartographyConfig.base_turns("quarry") == 10, "quarry mine baseTurns == 10 (MINE_STANDARD)")
	_check(CartographyConfig.base_turns("harbor") == 12, "harbor fish baseTurns == 12 (FISH_HARBOR)")
	# upgradeMap differs between the two farm templates (orchard trees→fruit; temperate trees→birds).
	_check(CartographyConfig.upgrade_target("home", "trees") == "birds", "temperate farm: trees→birds")
	_check(CartographyConfig.upgrade_target("orchard", "trees") == "fruit", "orchard farm: trees→fruit")
	_check(CartographyConfig.upgrade_target("home", "fruit") == CartographyConfig.GOLD, "temperate farm: fruit→GOLD")
	# Season drops are present + season-weighted for a farm node.
	var sd := CartographyConfig.season_drops("orchard", "Spring")
	_check(float(sd.get("fruit", 0.0)) > 0.3, "orchard Spring drops are fruit-heavy (got %.2f)" % float(sd.get("fruit", 0.0)))
	# Entry costs + level gates (faithful to MAP_NODES).
	_check(CartographyConfig.entry_cost("quarry") == 100, "quarry entry cost 100 coins")
	_check(CartographyConfig.entry_cost("forge") == 200, "forge entry cost 200 coins")
	_check(CartographyConfig.entry_cost("crossroads") == 0, "crossroads entry cost 0 (free)")
	_check(CartographyConfig.level_req("forge") == 5, "forge level req 5")
	_check(CartographyConfig.level_req("pit") == 6, "pit level req 6")
	_check(CartographyConfig.requires_hearth_tokens("oldcapital"), "oldcapital requires Hearth-Tokens")
	_check(not CartographyConfig.requires_hearth_tokens("home"), "home does NOT require tokens")

	# ── 2. GameState travel state machine ──────────────────────────────────────
	var g := GameState.new()
	# Default seed: home VISITED, its neighbours DISCOVERED, everything else hidden.
	_check(g.map_current == "home", "fresh GameState map_current == 'home'")
	_check(g.map_status("home") == "visited", "home starts VISITED")
	_check(g.map_status("meadow") == "discovered", "meadow (home neighbour) starts DISCOVERED")
	_check(g.map_status("orchard") == "discovered", "orchard (home neighbour) starts DISCOVERED")
	_check(g.map_status("harbor") == "discovered", "harbor (home neighbour) starts DISCOVERED")
	_check(g.map_status("quarry") == "hidden", "quarry (2 hops away) starts HIDDEN")
	_check(g.map_status("oldcapital") == "hidden", "oldcapital starts HIDDEN")

	# Gating: can't travel to a hidden, non-adjacent node.
	_check(not g.can_travel_to("quarry"), "can't travel to quarry from home (not adjacent)")
	_check(g.travel_block_reason("quarry") == "unreachable", "quarry blocked: unreachable")
	_check(g.travel_block_reason("home") == "here", "home blocked: here (already current)")

	# Level gate: meadow is level 1 (reachable); make sure a level-gated first-visit blocks.
	# crossroads is level 2 and adjacent to meadow (after we visit meadow). First visit meadow.
	g.coins = 1000
	g.almanac_level = 1
	# T22: a board node must be FOUNDED before its board can be entered. Mark meadow founded here
	# (the founding-flow guards are covered by run_settlements_tests.gd); without this, travel moves
	# the marker but the founding gate blocks board entry.
	g.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	var r_meadow := g.travel_to("meadow")
	_check(bool(r_meadow.get("ok", false)), "travel_to('meadow') ok (adjacent, level 1, affordable)")
	_check(g.map_current == "meadow", "map_current == meadow after travel")
	_check(g.map_status("meadow") == "visited", "meadow now VISITED")
	_check(g.map_status("crossroads") == "discovered", "crossroads discovered on arriving at meadow")
	_check(bool(r_meadow.get("entered", false)) and g.active_biome == "farm", "meadow is a farm board → active_biome farm")
	# Entry cost charged (meadow costs 50).
	_check(g.coins == 950, "meadow entry cost 50 charged (coins 1000→950, got %d)" % g.coins)

	# Level gate now: crossroads (level 2) adjacent to meadow but player level 1 → "level".
	_check(g.travel_block_reason("crossroads") == "level", "crossroads (lvl2) blocked by level when player lvl1")
	g.almanac_level = 5
	_check(g.can_travel_to("crossroads"), "crossroads travelable once player level >= 2")

	# Cost gate: travel to crossroads (free), then quarry (cost 100). Empty the wallet.
	var r_cross := g.travel_to("crossroads")
	_check(bool(r_cross.get("ok", false)), "travel_to('crossroads') ok")
	_check(String(r_cross.get("kind", "")) == "event", "crossroads kind == event (non-board)")
	_check(not bool(r_cross.get("entered", false)), "event node did NOT enter a board")
	_check(g.map_status("quarry") == "discovered", "quarry discovered on arriving at crossroads")
	g.coins = 50   # below quarry's 100
	_check(g.travel_block_reason("quarry") == "cost", "quarry blocked by cost when coins < 100")
	g.coins = 500

	# Per-node board entry: quarry is a MINE node → enter_mine path. Needs City tier + supplies.
	# T22: also found it first (board entry is founding-gated; founding flow covered elsewhere).
	g.settlements["quarry"] = {"founded": true, "biome": "mountain", "keeper_path": ""}
	g.settlement.tier = TownConfig.TIER_CITY
	g.inventory = {"supplies": 6}
	var r_quarry := g.travel_to("quarry")
	_check(bool(r_quarry.get("ok", false)), "travel_to('quarry') ok")
	_check(g.is_in_mine(), "active_biome == mine after travelling to the quarry (board-kind entry)")
	_check(int(r_quarry.get("launch", {}).get("turns", 0)) == 6, "mine launch converted 6 supplies → 6 turns")
	_check(g.map_status("fairground") == "discovered", "fairground discovered on arriving at quarry")

	# Fast-travel: meadow is visited; from the mine we can hop straight back (no adjacency needed).
	# (Return to the farm first so enter_* guards don't block a farm fast-travel.)
	_check(g.map_visited("meadow"), "meadow is visited")
	_check(g.can_travel_to("meadow"), "fast-travel to a visited node allowed from anywhere")
	g.leave_mine()   # back to the farm so the farm fast-travel is clean
	var r_fast := g.travel_to("meadow")
	_check(bool(r_fast.get("ok", false)), "fast-travel to meadow ok")
	_check(not bool(r_fast.get("first_visit", true)), "fast-travel reports first_visit == false")
	_check(g.map_current == "meadow", "map_current == meadow after fast-travel")

	# Old Capital token gate: always blocked (no token currency in the port).
	_check(g.travel_block_reason("oldcapital") == "needs_tokens", "oldcapital blocked: needs_tokens")
	_check(not g.can_travel_to("oldcapital"), "oldcapital NOT travelable (token gate)")

	# Harbor (fish) board entry from home: travel home → harbor (adjacent, visited? no — discovered).
	g.leave_mine()
	g.travel_to("meadow")          # ensure we're somewhere; then fast-travel home (visited)
	g.travel_to("home")            # home is visited → fast-travel
	_check(g.map_current == "home", "fast-travelled home")
	g.inventory = {"supplies": 4}
	g.active_biome = "farm"
	# T22: found the harbor first (board entry is founding-gated; founding flow covered elsewhere).
	g.settlements["harbor"] = {"founded": true, "biome": "coastal", "keeper_path": ""}
	var r_harbor := g.travel_to("harbor")
	_check(bool(r_harbor.get("ok", false)), "travel_to('harbor') ok (adjacent to home)")
	_check(g.is_in_harbor(), "active_biome == harbor after travelling to the harbor (fish board entry)")

	# ── 2b. save/load round-trip of the travel state ───────────────────────────
	g.leave_harbor()
	var snap := g.to_dict()
	_check(snap.has("map_current") and snap.has("map_node_state"), "to_dict emits map_current + map_node_state")
	var g2 := GameState.from_dict(snap)
	_check(g2.map_current == g.map_current, "map_current round-trips (got %s)" % g2.map_current)
	_check(g2.map_status("quarry") == "visited", "quarry stays VISITED across save/load")
	_check(g2.map_status("meadow") == "visited", "meadow stays VISITED across save/load")
	_check(g2.map_status("fairground") == "discovered", "fairground stays DISCOVERED across save/load")
	_check(g2.map_status("oldcapital") == "hidden", "oldcapital stays HIDDEN across save/load")
	# A pre-T26 save (no map keys) re-seeds the default.
	var g3 := GameState.from_dict({})
	_check(g3.map_current == "home", "pre-T26 save re-seeds map_current home")
	_check(g3.map_status("home") == "visited" and g3.map_status("meadow") == "discovered",
		"pre-T26 save re-seeds the home-visited/neighbours-discovered default")

	# ── 3. ViewRouter pure-state for the CARTOGRAPHY modal ─────────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.CARTOGRAPHY)
	_check(r.current_modal() == ViewRouter.Modal.CARTOGRAPHY, "open_modal(CARTOGRAPHY) sticks")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() → NONE")
	_check(int(ViewRouter.resolve("cartography").get("modal", -1)) == ViewRouter.Modal.CARTOGRAPHY,
		"resolve('cartography') → CARTOGRAPHY")
	_check(int(ViewRouter.resolve("world").get("modal", -1)) == ViewRouter.Modal.CARTOGRAPHY,
		"resolve('world') → CARTOGRAPHY")
	_check(ViewRouter.modal_id(ViewRouter.Modal.CARTOGRAPHY) == "cartography", "modal_id(CARTOGRAPHY) == 'cartography'")
	_check(ViewRouter.known_ids().has("cartography") and ViewRouter.known_ids().has("world"),
		"known_ids includes cartography + world")
	_check(int(ViewRouter.resolve("map").get("modal", -1)) == ViewRouter.Modal.TOWNMAP,
		"resolve('map') still → TOWNMAP (town building map untouched)")

	# ── 4. Main integration ────────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	main.game.farm_run_active = true   # board run-gate so an apply_deeplink('board') hides the overlay

	_check(main.has_method("_open_cartography"), "Main has _open_cartography()")
	_check(main.has_method("_on_cartography_travel"), "Main has _on_cartography_travel()")
	_check(main._cartography_screen == null, "cartography screen lazily created (null before open)")

	main._open_cartography()
	await process_frame
	_check(main._cartography_screen != null, "_open_cartography() created the screen")
	_check(main._cartography_screen.visible, "screen visible after _open_cartography()")
	_check(main._router.current_modal() == ViewRouter.Modal.CARTOGRAPHY, "router in CARTOGRAPHY")
	var first_ref = main._cartography_screen
	main._open_cartography()
	_check(main._cartography_screen == first_ref, "_open_cartography() reuses the one screen")

	# Deeplink show/hide.
	main._cartography_screen.visible = false
	_check(main.apply_deeplink("cartography"), "apply_deeplink('cartography') true")
	_check(main._cartography_screen.visible, "screen visible after deeplink")
	_check(main.apply_deeplink("board"), "apply_deeplink('board') true")
	_check(not main._cartography_screen.visible, "screen hidden after deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE, "router NONE after board deeplink")

	# Screen reads the current node + node states from the live GameState.
	var screen = main._cartography_screen
	main.game.active_biome = "farm"
	# Reset the travel state to a known seed for the screen checks.
	main.game.map_current = "home"
	main.game.map_node_state = {}
	main.game._seed_map_state()
	screen.open()
	await process_frame
	_check(screen.current_node_id() == "home", "screen current_node_id() == home")
	_check(screen.is_current("home"), "is_current('home') true")
	_check(screen.node_state("home") == "current", "node_state('home') == current")
	_check(screen.node_state("meadow") == "discovered", "node_state('meadow') == discovered")
	_check(screen.node_state("quarry") == "hidden", "node_state('quarry') == hidden")
	# The map drew → _node_centers populated for all 11 nodes.
	_check(screen._node_centers.size() == 11, "_node_centers has 11 drawn centres (got %d)" % screen._node_centers.size())

	# Select meadow → its detail panel + an enabled Travel button (adjacent, level1, affordable).
	# Travel to a board node is founding-gated, so found meadow first to enable its Travel button.
	main.game.coins = 1000
	main.game.almanac_level = 5
	main.game.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	screen.select_node("meadow")
	await process_frame
	_check(screen.selected_node_id() == "meadow", "select_node('meadow') sticks")
	_check(screen.node_is_travelable("meadow"), "founded meadow travelable from home")
	_check(screen._action_buttons.has("travel:meadow"), "enabled travel:meadow button registered")
	_check(not screen._action_buttons["travel:meadow"].disabled, "travel:meadow button enabled")
	# An UNFOUNDED neighbour (orchard) is NOT travelable — its Travel button is disabled (found first).
	screen.select_node("orchard")
	await process_frame
	_check(not screen.node_is_travelable("orchard"), "unfounded orchard NOT travelable")
	_check(not screen._action_buttons.has("travel:orchard"), "no enabled travel button for unfounded orchard")

	# Selecting the Old Capital → NO enabled travel button (token gate); the screen shows it locked.
	screen.select_node("oldcapital")
	await process_frame
	_check(not screen.node_is_travelable("oldcapital"), "oldcapital NOT travelable")
	_check(not screen._action_buttons.has("travel:oldcapital"), "no enabled travel:oldcapital button")

	# Pressing an enabled mine Travel button enters the mine board.
	# Get to a state where the quarry is reachable + launchable: visit meadow→crossroads first.
	main.game.map_current = "home"
	main.game.map_node_state = {}
	main.game._seed_map_state()
	main.game.coins = 1000
	main.game.almanac_level = 5
	main.game.active_biome = "farm"
	# T22: found the board nodes we'll enter (board entry is founding-gated). Travelling to the
	# founded farm node `meadow` ACTIVATES it (the live fields become meadow's), so set the
	# supplies + City tier AFTER arriving — they belong to the zone the expedition launches from.
	main.game.settlements["meadow"] = {"founded": true, "biome": "prairie", "keeper_path": ""}
	main.game.settlements["quarry"] = {"founded": true, "biome": "mountain", "keeper_path": ""}
	main.game.travel_to("meadow")
	main.game.travel_to("crossroads")
	main.game.active_biome = "farm"   # back on the farm so enter_mine's guard passes
	main.game.settlement.tier = TownConfig.TIER_CITY
	main.game.inventory = {"supplies": 5}
	screen.open()
	screen.select_node("quarry")
	await process_frame
	_check(screen.node_is_travelable("quarry"), "quarry travelable after discovering it (adjacent to crossroads)")
	_check(screen._action_buttons.has("travel:quarry"), "enabled travel:quarry button registered")
	_check(not main.game.is_in_mine(), "not in the mine before pressing Travel")
	screen._action_buttons["travel:quarry"].emit_signal("pressed")
	await process_frame
	_check(main.game.is_in_mine(), "game.is_in_mine() true after pressing travel:quarry")
	_check(main.board.tile_pool == main.game.active_biome_pool(), "board pool swapped to the mine pool")
	_check(main.board.tile_pool != Constants.FARM_POOL, "board pool no longer the farm pool")
	_check(not main._cartography_screen.visible, "the world map closed itself on a board travel")

	SaveManager.clear()
