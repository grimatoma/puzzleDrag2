extends SceneTree
## Headless tests for the Magic Portal feature: the PortalConfig data layer, the GameState
## build_portal / summon_magic_tool path (+ the build gate + persistence), the ViewRouter.PORTAL
## modal, the PortalScreen rendering (both states), and its wiring into scenes/Main.gd. Five layers:
##
##   1. PortalConfig data — the 11-magic-tool catalog with the correct ids/names/influence costs
##      carried VERBATIM from src/features/portal/data.ts, plus the static helpers.
##   2. GameState.build_portal — gated on coins (>=2000) AND runes (>=5); an unaffordable build is
##      a no-op; a second build is rejected; can_build_portal truth table. GameState.summon_magic_tool
##      — gated on portal_built AND influence >= cost; writes DIRECTLY into the tools dict (the magic
##      tool id is NOT a ToolConfig member, the whole point); can_summon_magic_tool truth table.
##   3. to_dict/from_dict round-trip of portal_built + a summoned tool + the missing-key default.
##   4. ViewRouter — the new PORTAL modal: open_modal/current_modal/resolve("portal")/modal_id
##      round-trip / known_ids() completeness.
##   5. Main integration — _open_portal() lazily creates + reuses the screen + sets the router modal;
##      apply_deeplink("portal") shows it (and a real build flips portal_built); apply_deeplink("board")
##      hides it + resets the router to NONE.
##
## Same dependency-free harness as run_decorations_tests.gd / run_router_tests.gd.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_portal_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const PortalScreenScript := preload("res://scenes/PortalScreen.gd")

var _checks: int = 0
var _failures: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(screen, key: String) -> bool:
	var btn: Variant = screen._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Portal tests ───────────────────────────────────")

	# ── 1. PortalConfig data ──────────────────────────────────────────────────────
	# The React MAGIC_TOOLS catalog (src/features/portal/data.ts) has exactly 10 magic tools.
	_check(PortalConfig.all().size() == 10, "PortalConfig.all() has 10 magic tools")
	_check(PortalConfig.count() == 10, "PortalConfig.count() == 10")
	_check(PortalConfig.MAGIC_TOOL_IDS.size() == 10, "PortalConfig.MAGIC_TOOL_IDS has 10 ids")
	_check(not PortalConfig.all().is_empty(), "PortalConfig.all() non-empty")

	_check(PortalConfig.has_tool("magic_wand"), "has_tool('magic_wand') true")
	_check(PortalConfig.has_tool("philosophers_stone"), "has_tool('philosophers_stone') true")
	_check(not PortalConfig.has_tool("bogus"), "has_tool('bogus') false")

	# Names carried verbatim from data.ts.
	_check(PortalConfig.tool_name("magic_wand") == "Magic Wand", "magic_wand name 'Magic Wand'")
	_check(PortalConfig.tool_name("hourglass") == "Hourglass", "hourglass name 'Hourglass'")
	_check(PortalConfig.tool_name("philosophers_stone") == "Philosopher's Stone", "philosophers_stone name")
	_check(PortalConfig.tool_name("bogus") == "", "unknown name == ''")

	# Influence costs carried VERBATIM (spot-check every one per the brief).
	_check(PortalConfig.influence_cost("magic_wand") == 80, "magic_wand cost 80")
	_check(PortalConfig.influence_cost("hourglass") == 120, "hourglass cost 120")
	_check(PortalConfig.influence_cost("magic_seed") == 100, "magic_seed cost 100")
	_check(PortalConfig.influence_cost("magic_fertilizer") == 60, "magic_fertilizer cost 60")
	_check(PortalConfig.influence_cost("golden_apple") == 140, "golden_apple cost 140")
	_check(PortalConfig.influence_cost("golden_carrot") == 90, "golden_carrot cost 90")
	_check(PortalConfig.influence_cost("golden_idol") == 110, "golden_idol cost 110")
	_check(PortalConfig.influence_cost("golden_sheep") == 110, "golden_sheep cost 110")
	_check(PortalConfig.influence_cost("philosophers_stone") == 200, "philosophers_stone cost 200")
	_check(PortalConfig.influence_cost("miners_hat") == 50, "miners_hat cost 50")
	_check(PortalConfig.influence_cost("bogus") == 0, "unknown cost == 0")

	# get_tool returns a copy with all fields incl. captured power metadata + effect.
	var mw := PortalConfig.get_tool("magic_wand")
	_check(mw.get("id") == "magic_wand" and int(mw.get("influence_cost")) == 80,
		"get_tool('magic_wand') has id + influence_cost")
	_check(not PortalConfig.effect("magic_wand").is_empty(), "magic_wand has effect text")
	_check(String(PortalConfig.power("magic_wand").get("id", "")) == "tap_clear_type",
		"power('magic_wand').id == 'tap_clear_type' (captured React metadata)")
	_check(String(PortalConfig.power("philosophers_stone").get("id", "")) == "transform_tiles",
		"power('philosophers_stone').id == 'transform_tiles'")
	_check(PortalConfig.get_tool("bogus").is_empty(), "get_tool('bogus') == {}")

	# ── 2a. GameState.build_portal / can_build_portal ──────────────────────────────
	var g := GameState.new()
	# Fresh state: portal not built.
	_check(not g.portal_built, "fresh: portal_built == false")
	_check(not g.can_build_portal(), "fresh (0 coins / 0 runes): can_build_portal false")

	# Short on coins → cant_afford even with runes present.
	g.coins = 1999
	g.runes = 10
	_check(not g.can_build_portal(), "can_build_portal false when short on coins")
	var rc: Dictionary = g.build_portal()
	_check(not bool(rc.get("ok", true)), "build_portal with too few coins → not ok")
	_check(String(rc.get("reason", "")) == "cant_afford", "reason == 'cant_afford' (coins)")
	_check(g.coins == 1999 and g.runes == 10, "coins/runes untouched after unaffordable build")
	_check(not g.portal_built, "portal_built still false after unaffordable build")

	# Short on runes → cant_afford even with coins present.
	g.coins = 5000
	g.runes = 4
	_check(not g.can_build_portal(), "can_build_portal false when short on runes")
	var rr: Dictionary = g.build_portal()
	_check(String(rr.get("reason", "")) == "cant_afford", "reason == 'cant_afford' (runes)")
	_check(g.coins == 5000 and g.runes == 4, "coins/runes untouched (short on runes)")

	# Exactly 2000 coins + 5 runes → builds, deducts EXACTLY, sets the flag.
	var gb := GameState.new()
	gb.coins = 2000
	gb.runes = 5
	_check(gb.can_build_portal(), "can_build_portal true at exactly 2000 coins + 5 runes")
	var rb: Dictionary = gb.build_portal()
	_check(bool(rb.get("ok", false)), "build_portal at exact cost ok")
	_check(gb.coins == 0, "coins deducted 2000 (2000 - 2000 = 0)")
	_check(gb.runes == 0, "runes deducted 5 (5 - 5 = 0)")
	_check(gb.portal_built, "portal_built == true after build")

	# Second build rejected (already built, no further deduction).
	gb.coins = 5000
	gb.runes = 20
	_check(not gb.can_build_portal(), "can_build_portal false once already built")
	var r2: Dictionary = gb.build_portal()
	_check(not bool(r2.get("ok", true)), "second build → not ok")
	_check(String(r2.get("reason", "")) == "already_built", "reason == 'already_built'")
	_check(gb.coins == 5000 and gb.runes == 20, "coins/runes untouched on second build")

	# ── 2b. GameState.summon_magic_tool / can_summon_magic_tool ────────────────────
	var gs := GameState.new()
	gs.influence = 1000

	# Portal NOT built → summon rejected (no mutation), even with plenty of influence.
	_check(not gs.can_summon_magic_tool("magic_wand"), "can_summon false when portal not built")
	var sn: Dictionary = gs.summon_magic_tool("magic_wand")
	_check(not bool(sn.get("ok", true)), "summon without portal → not ok")
	_check(String(sn.get("reason", "")) == "no_portal", "reason == 'no_portal'")
	_check(gs.influence == 1000, "influence untouched (no portal)")
	_check(gs.tool_count("magic_wand") == 0, "tool count untouched (no portal)")

	# Build the portal so summons can proceed.
	gs.portal_built = true

	# Unknown magic tool → unknown (no mutation).
	var su: Dictionary = gs.summon_magic_tool("bogus")
	_check(String(su.get("reason", "")) == "unknown", "summon unknown tool → reason 'unknown'")
	_check(not gs.can_summon_magic_tool("bogus"), "can_summon_magic_tool('bogus') false")

	# Too little influence → cant_afford (no mutation).
	gs.influence = 79                            # magic_wand costs 80
	_check(not gs.can_summon_magic_tool("magic_wand"), "can_summon false when influence < cost")
	var sc: Dictionary = gs.summon_magic_tool("magic_wand")
	_check(String(sc.get("reason", "")) == "cant_afford", "reason == 'cant_afford' (influence)")
	_check(gs.influence == 79, "influence untouched (cant afford)")
	_check(gs.tool_count("magic_wand") == 0, "tool count untouched (cant afford)")

	# Built + affordable → influence deducted by EXACT cost, count becomes 1.
	gs.influence = 250
	_check(gs.can_summon_magic_tool("magic_wand"), "can_summon true when built + affordable")
	var so: Dictionary = gs.summon_magic_tool("magic_wand")
	_check(bool(so.get("ok", false)), "summon magic_wand ok")
	_check(gs.influence == 170, "influence deducted 80 (250 - 80)")
	_check(gs.tool_count("magic_wand") == 1, "magic_wand count == 1 after summon")
	_check(int(so.get("count", -1)) == 1, "summon result reports count 1")
	_check(int(so.get("influence", -1)) == 170, "summon result reports remaining influence 170")

	# Second summon of the same tool → count 2 (the tools-dict write stacks).
	var so2: Dictionary = gs.summon_magic_tool("magic_wand")
	_check(bool(so2.get("ok", false)), "second summon magic_wand ok")
	_check(gs.tool_count("magic_wand") == 2, "second summon → magic_wand count 2")
	_check(gs.influence == 90, "influence deducted again (170 - 80 = 90)")

	# The whole point: a magic-tool id is NOT a ToolConfig member, so grant_tool would reject
	# it — summon_magic_tool must write DIRECTLY into the tools dict and tool_count must read it.
	_check(not ToolConfig.has_tool("magic_wand"), "ToolConfig does NOT know 'magic_wand' (magic tools aren't ToolConfig)")
	var gt := GameState.new()
	gt.portal_built = true
	gt.influence = 100
	gt.grant_tool("magic_wand")                  # grant_tool REJECTS a non-ToolConfig id
	_check(gt.tool_count("magic_wand") == 0, "grant_tool('magic_wand') is a no-op (not a ToolConfig tool)")
	gt.summon_magic_tool("magic_wand")           # summon writes directly → works
	_check(gt.tool_count("magic_wand") == 1, "summon_magic_tool writes the count directly (bypasses grant_tool)")
	_check(int(gt.tools.get("magic_wand", -1)) == 1, "tools dict holds the magic tool count directly")

	# ── 3. to_dict / from_dict round-trip + missing-key default ───────────────────
	var snap: Dictionary = gs.to_dict()
	_check(snap.has("portal_built"), "to_dict includes 'portal_built'")
	_check(bool(snap.get("portal_built", false)), "to_dict portal_built == true")
	var restored := GameState.from_dict(snap)
	_check(restored.portal_built, "round-trip: portal_built true")
	_check(restored.tool_count("magic_wand") == 2, "round-trip: magic_wand count 2 survives (tools dict)")

	# Missing key (a save written before the portal existed) → portal_built default false.
	var legacy := GameState.from_dict({"coins": 5})
	_check(not legacy.portal_built, "missing 'portal_built' key → default false (back-compat / old saves)")

	# Defensive restore: a truthy non-bool coerces to true.
	var coerced := GameState.from_dict({"portal_built": 1})
	_check(coerced.portal_built, "portal_built coerced from truthy value")

	# ── 4. ViewRouter — PORTAL modal (pure-state assertions) ──────────────────────
	var rt := ViewRouter.new()
	rt.open_modal(ViewRouter.Modal.PORTAL)
	_check(rt.current_modal() == ViewRouter.Modal.PORTAL, "current_modal() == PORTAL after open_modal")
	_check(rt.is_open(ViewRouter.Modal.PORTAL), "is_open(PORTAL) == true")
	rt.close_modal()
	_check(rt.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")

	var d_portal := ViewRouter.resolve("portal")
	_check(bool(d_portal.get("ok", false)), "resolve('portal') ok")
	_check(int(d_portal.get("modal", -1)) == ViewRouter.Modal.PORTAL, "resolve('portal') modal == PORTAL")
	_check(int(d_portal.get("view", -1)) == ViewRouter.View.BOARD, "resolve('portal') view == BOARD")

	var d_alias := ViewRouter.resolve("summon")
	_check(bool(d_alias.get("ok", false)), "resolve('summon') ok (alias)")
	_check(int(d_alias.get("modal", -1)) == ViewRouter.Modal.PORTAL, "resolve('summon') modal == PORTAL")

	_check(ViewRouter.modal_id(ViewRouter.Modal.PORTAL) == "portal", "modal_id(PORTAL) == 'portal'")

	var ids := ViewRouter.known_ids()
	_check(ids.has("portal"), "known_ids() contains 'portal'")
	_check(ids.has("summon"), "known_ids() contains 'summon'")

	# ── 5a. PortalScreen rendering — NOT-built state ──────────────────────────────
	var sg := GameState.new()                     # fresh: portal not built
	var screen = PortalScreenScript.new()
	root.add_child(screen)
	screen.setup(sg)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))

	_check(screen.visible, "portal screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.total_count() == 10, "screen.total_count() == 10")
	# NOT built: a Build button is present; no summon cards rendered.
	_check(screen._action_buttons.has("build"), "NOT-built: _action_buttons has 'build'")
	_check(screen._cards.is_empty(), "NOT-built: no summon cards rendered")
	_check(screen._header_label == null, "NOT-built: no influence header")
	# 0 coins / 0 runes → Build disabled.
	_check(screen._action_buttons["build"].disabled, "Build disabled when unaffordable")

	# Seed coins + runes so the Build path is exercised through the screen → real GameState.
	sg.coins = 2000
	sg.runes = 5
	screen.refresh()
	_check(not screen._action_buttons["build"].disabled, "Build enabled once coins + runes covered")
	screen._action_buttons["build"].emit_signal("pressed")
	_check(sg.portal_built, "screen Build flipped portal_built true")
	_check(sg.coins == 0 and sg.runes == 0, "screen Build deducted coins + runes")

	# ── 5b. PortalScreen rendering — BUILT (summon) state ─────────────────────────
	# After the build, refresh() flips into the summon state.
	_check(screen._header_label != null, "BUILT: influence header present")
	_check(screen._cards.size() == 10, "BUILT: one card per magic tool (_cards.size() == 10)")
	for tid in PortalConfig.MAGIC_TOOL_IDS:
		_check(screen._cards.has(String(tid)), "card rendered for magic tool '%s'" % String(tid))
	_check(screen._summon_buttons.has("magic_wand"), "_summon_buttons has 'magic_wand'")
	_check(not screen._action_buttons.has("build"), "BUILT: build button removed")
	# 0 influence after the build → every Summon disabled.
	_check(screen._summon_buttons["magic_wand"].disabled, "magic_wand Summon disabled (0 influence)")
	_check(screen._header_label.text.contains("0"), "header shows 0 influence after build")

	# Seed influence → an affordable Summon enables + a real summon mutates GameState.
	sg.influence = 100
	screen.refresh()
	_check(not screen._summon_buttons["magic_wand"].disabled, "magic_wand Summon enabled (100 influence)")
	_check(screen._summon_buttons["philosophers_stone"].disabled, "philosophers_stone Summon disabled (cost 200 > 100)")
	screen._summon_buttons["magic_wand"].emit_signal("pressed")
	_check(sg.tool_count("magic_wand") == 1, "screen Summon bumped magic_wand to 1")
	_check(sg.influence == 20, "screen Summon deducted 80 influence (100 - 80)")
	_check(screen._header_label.text.contains("20"), "header re-rendered to 20 influence after summon")
	# Card now shows the ×1 owned badge (re-rendered).
	_check(screen._cards.has("magic_wand"), "magic_wand card still rendered after summon")

	# Close fires `closed` + hides.
	var before_closed := _closed_count
	_check(_press(screen, "close"), "pressed close button")
	_check(_closed_count == before_closed + 1, "closed signal fired once")
	_check(not screen.visible, "portal screen hidden after close")

	# ── 5c. Main integration ───────────────────────────────────────────────────────
	SaveManager.clear()                          # fresh start so the loaded state is clean
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame                          # let the deferred _ready run

	_check(main.has_method("_open_portal"), "Main has _open_portal()")
	_check(main.has_method("_on_portal_closed"), "Main has _on_portal_closed()")
	_check(main._portal_screen == null, "portal screen lazily created (null before open)")

	# Seed coins + runes so a real build path is exercised through Main's live game.
	main.game.coins = 2000
	main.game.runes = 5

	# Opening lazily creates + shows the screen + sets the router modal.
	main._open_portal()
	_check(main._portal_screen != null, "_open_portal() lazily created the screen")
	_check(main._portal_screen.visible, "portal screen visible after _open_portal()")
	_check(main._router.current_modal() == ViewRouter.Modal.PORTAL,
		"_router.current_modal() == PORTAL after _open_portal()")

	# A second open reuses the SAME screen (no duplicate child).
	var first_ref = main._portal_screen
	main._open_portal()
	_check(main._portal_screen == first_ref, "_open_portal() reuses the one screen")

	# Exercise a real build path through the live screen → live GameState; portal_built flips.
	_check(not main.game.portal_built, "Main game portal not built before screen Build")
	main._portal_screen._action_buttons["build"].emit_signal("pressed")
	_check(main.game.portal_built, "Main build path flipped portal_built")
	_check(int(main.game.coins) == 0 and int(main.game.runes) == 0, "Main build path deducted coins + runes")

	# Now summon through the live screen (seed influence first).
	main.game.influence = 100
	main._portal_screen.refresh()
	main._portal_screen._summon_buttons["magic_wand"].emit_signal("pressed")
	_check(main.game.tool_count("magic_wand") == 1, "Main summon path bumped magic_wand")
	_check(main.game.influence == 20, "Main summon path deducted influence to 20")

	# apply_deeplink("portal") shows it + sets the router modal.
	main.apply_deeplink("board")                 # close first to start from a clean modal state
	var ok_portal: bool = main.apply_deeplink("portal")
	_check(ok_portal, "apply_deeplink('portal') returns true")
	_check(main._portal_screen != null and main._portal_screen.visible,
		"apply_deeplink('portal') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.PORTAL,
		"_router.current_modal() == PORTAL after apply_deeplink('portal')")

	# apply_deeplink("board") closes it; router resets to NONE.
	var ok_board: bool = main.apply_deeplink("board")
	_check(ok_board, "apply_deeplink('board') returns true")
	_check(not main._portal_screen.visible, "portal screen hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
