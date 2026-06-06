class_name TownScreen
extends CanvasLayer
## M3e — the real on-screen Town panel. A full-screen modal, built ENTIRELY in
## code (like Main's HUD — no .tscn editing), that reads and drives a GameState.
## It replaces the temporary dev keyboard affordances (T tier-up, 1/2/3 build,
## 4/5/6 demolish, B bake, G sell, F fill-order) with actual buttons:
##
##   Settlement — tier readout + an "Advance to <next>" tier-up button
##   Buildings  — Build/Demolish each building available at the current tier
##   Refine     — Craft each recipe at its station building (Bakery → bread)
##   Market     — Sell 1 of each owned, sellable resource
##   Orders     — Fill each active NPC order
##   Expedition — (M3f) Enter the Mine (spend supplies as turns) / Leave the mine
##
## All game logic already lives on GameState (build/demolish/craft/sell/
## fill_order/try_tier_up). This screen is purely the UI that calls those and
## re-renders. After any mutation it emits `state_changed` so Main can re-pool the
## board, save, and refresh its HUD; closing emits `closed`.
##
## Headless-test contract. Every actionable button is registered in
## `_action_buttons` under a stable string key so the UI-wiring test can find and
## `pressed.emit()` a specific button, then assert GameState changed — no
## rendering required. `refresh()` rebuilds rows IMMEDIATELY (remove_child + free,
## NOT queue_free) so the dictionary + tree are consistent within one call stack:
## a handler can refresh() and the test reads the NEW buttons in the same frame.

var game: GameState

signal closed
signal state_changed   ## emitted after any action mutates `game`

## Keyed by a string action id → the Button node, rebuilt each refresh() so
## headless tests can locate + press a specific button. Keys:
##   "close", "tierup", "build:<id>", "demolish:<id>", "sell:<res>",
##   "craft:<recipe>", "fill:<index>", "enter_mine", "leave_mine", "challenge_boss".
var _action_buttons: Dictionary = {}

## Static shell (built once in setup()) — the dynamic section bodies hang off the
## per-section VBoxes below and are cleared + repopulated each refresh().
var _root_vbox: VBoxContainer
var _settlement_body: VBoxContainer
var _buildings_body: VBoxContainer
var _refine_body: VBoxContainer
var _market_body: VBoxContainer
var _orders_body: VBoxContainer
var _expedition_body: VBoxContainer   ## M3f — enter/leave the mine
var _boss_body: VBoxContainer         ## M3g — challenge the capstone boss
var _built: bool = false

# ── earthy palette (matches Main's HUD) ───────────────────────────────────────
const COL_TITLE := Color(0.83, 0.90, 0.74)
const COL_HEADER := Color(0.89, 0.76, 0.29)
const COL_BODY := Color(0.93, 0.95, 0.88)
const COL_MUTED := Color(0.62, 0.68, 0.56)
const COL_PANEL := Color(0.10, 0.12, 0.09, 0.98)
const PANEL_MAX_WIDTH := 620.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again
## (the shell is only built the first time).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true
	refresh()

func open() -> void:
	visible = true
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 3                                  # above Main's HUD (layer 1)
	visible = false

	# Full-rect dim backdrop. MOUSE_FILTER_STOP so clicks behind it never reach
	# the board while the menu is open (you're in the menu — that's intended).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0, 0, 0, 0.72)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Centered panel: PanelContainer → MarginContainer → ScrollContainer → VBox.
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	# Comfortable margins around the panel; the ScrollContainer handles overflow.
	panel.offset_left = 24
	panel.offset_right = -24
	panel.offset_top = 48
	panel.offset_bottom = -48
	panel.custom_minimum_size = Vector2(0, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(14)
	style.set_content_margin_all(18)
	style.border_color = Color(0.30, 0.36, 0.24)
	style.set_border_width_all(2)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	width_cap.add_child(scroll)

	_root_vbox = VBoxContainer.new()
	_root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root_vbox.add_theme_constant_override("separation", 14)
	scroll.add_child(_root_vbox)

	# Title row: "🏠 Town" heading + a right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🏠 Town"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Section scaffolds: each is a labelled VBox header + a dynamic body VBox.
	_settlement_body = _add_section("Settlement")
	_buildings_body = _add_section("Buildings")
	_refine_body = _add_section("Refine")
	_market_body = _add_section("Market")
	_orders_body = _add_section("Orders")
	_expedition_body = _add_section("Expedition")
	_boss_body = _add_section("Boss")

## Append a section to the root VBox: a header Label then an (initially empty)
## body VBox that refresh() repopulates. Returns the body VBox.
func _add_section(header_text: String) -> VBoxContainer:
	var header := Label.new()
	header.text = header_text
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	_root_vbox.add_child(header)

	var body := VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 6)
	_root_vbox.add_child(body)
	return body

# ── render ────────────────────────────────────────────────────────────────────

## Clear the dynamic section bodies and repopulate them from `game`. The
## `_action_buttons` map (minus the static "close" entry) is rebuilt each call.
##
## Rows are DETACHED from the tree immediately (remove_child) and the dict is
## rebuilt synchronously, so a handler can refresh() and the test reads the new
## buttons in the same call stack. The actual node free is DEFERRED (queue_free):
## a button's own `pressed` handler triggers this refresh, so the button is still
## mid-emit — freeing it synchronously would crash ("freed while a signal is being
## emitted" / "locked object"). Detaching now + freeing at frame end is safe and
## the test never sees the stale node because it looks them up via the dict.
func refresh() -> void:
	if not _built or game == null:
		return
	# Drop every action button except the static "close" so tests never read a
	# stale node, then re-register them as the sections rebuild.
	var close_btn: Variant = _action_buttons.get("close")
	_action_buttons.clear()
	if close_btn != null:
		_action_buttons["close"] = close_btn

	_clear(_settlement_body)
	_clear(_buildings_body)
	_clear(_refine_body)
	_clear(_market_body)
	_clear(_orders_body)
	_clear(_expedition_body)
	_clear(_boss_body)

	_build_settlement_section()
	_build_buildings_section()
	_build_refine_section()
	_build_market_section()
	_build_orders_section()
	_build_expedition_section()
	_build_boss_section()

## Detach every child of `container` from the tree NOW (so the rebuilt rows render
## correctly and the dict is the only live reference), then queue_free it. The
## free is deferred because a row's button may be mid-`pressed`-emit when this runs
## (the handler that triggered the refresh). The detached node is already out of
## the tree and dropped from `_action_buttons`, so nothing reads it again.
func _clear(container: Node) -> void:
	for child in container.get_children():
		container.remove_child(child)
		child.queue_free()

# ── sections ──────────────────────────────────────────────────────────────────

func _build_settlement_section() -> void:
	var s := game.settlement
	var line := _make_label("%s · cap %d · plots %d/%d" % [
		s.tier_name(), s.cap(), game.plots_used(), s.plots()], COL_BODY)
	_settlement_body.add_child(line)

	if s.is_max_tier():
		_settlement_body.add_child(_make_label("City — top tier reached", COL_MUTED))
		return

	var next_name: String = TownConfig.tier_name(s.tier + 1)
	var cost_text: String = _format_cost(s.next_tier_cost())
	var btn := Button.new()
	btn.text = "Advance to %s — %s" % [next_name, cost_text]
	btn.disabled = not game.can_tier_up()
	btn.connect("pressed", Callable(self, "_do_tier_up"))
	_settlement_body.add_child(btn)
	_action_buttons["tierup"] = btn

func _build_buildings_section() -> void:
	var used: int = game.plots_used()
	var total: int = game.settlement.plots()
	_buildings_body.add_child(_make_label("Plots %d/%d" % [used, total], COL_MUTED))

	for id in BuildingConfig.available_at_tier(game.settlement.tier):
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var cost_text: String = _format_cost(BuildingConfig.building_cost(id))
		var kind: String = BuildingConfig.building_kind(id)
		var label := _make_label("%s  (%s)  [%s]" % [
			BuildingConfig.building_name(id), cost_text, kind], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		if game.has_building(id):
			var demo := Button.new()
			demo.text = "Demolish"
			demo.size_flags_horizontal = Control.SIZE_SHRINK_END
			demo.connect("pressed", Callable(self, "_do_demolish").bind(id))
			row.add_child(demo)
			_action_buttons["demolish:" + id] = demo
		else:
			var build_btn := Button.new()
			build_btn.text = "Build"
			build_btn.disabled = not game.can_build(id)
			build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
			build_btn.connect("pressed", Callable(self, "_do_build").bind(id))
			row.add_child(build_btn)
			_action_buttons["build:" + id] = build_btn

		_buildings_body.add_child(row)

func _build_refine_section() -> void:
	for id in RecipeConfig.RECIPE_IDS:
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var inputs_text: String = _format_cost(RecipeConfig.recipe_inputs(id))
		var station_name: String = BuildingConfig.building_name(RecipeConfig.recipe_station(id))
		var label := _make_label("%s: %s → %d×%s  @ %s" % [
			RecipeConfig.recipe_name(id), inputs_text, RecipeConfig.recipe_qty(id),
			RecipeConfig.recipe_output(id), station_name], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var craft_btn := Button.new()
		craft_btn.text = "Craft"
		craft_btn.disabled = not game.can_craft(id)
		craft_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		craft_btn.connect("pressed", Callable(self, "_do_craft").bind(id))
		row.add_child(craft_btn)
		_action_buttons["craft:" + id] = craft_btn

		_refine_body.add_child(row)

func _build_market_section() -> void:
	var any := false
	for res in MarketConfig.sellable_resources():
		var owned: int = game.qty(res)
		if owned <= 0:
			continue
		any = true
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var label := _make_label("%s ×%d  (sell %d)" % [
			res, owned, MarketConfig.sell_price(res)], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var sell_btn := Button.new()
		sell_btn.text = "Sell 1"
		sell_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		sell_btn.connect("pressed", Callable(self, "_do_sell").bind(res))
		row.add_child(sell_btn)
		_action_buttons["sell:" + res] = sell_btn

		_market_body.add_child(row)

	if not any:
		_market_body.add_child(_make_label("nothing to sell yet", COL_MUTED))

func _build_orders_section() -> void:
	if game.orders.is_empty():
		_orders_body.add_child(_make_label("no orders", COL_MUTED))
		return
	for i in game.orders.size():
		var order: Dictionary = game.orders[i]
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var label := _make_label("Deliver %d×%s → +%dc" % [
			int(order["qty"]), order["resource"], int(order["reward"])], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var fill_btn := Button.new()
		fill_btn.text = "Fill"
		fill_btn.disabled = not game.can_fill_order(i)
		fill_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		fill_btn.connect("pressed", Callable(self, "_do_fill").bind(i))
		row.add_child(fill_btn)
		_action_buttons["fill:" + str(i)] = fill_btn

		_orders_body.add_child(row)

func _build_expedition_section() -> void:
	# M3f — "the combination": spend Kitchen-made `supplies` as mine turns. While on
	# an expedition the section shows remaining turns + a "Leave the mine" button;
	# on the farm it shows the supply count + an "Enter the Mine" button (disabled
	# until City tier with at least 1 supplies — can_enter_mine() gates it).
	if game.is_in_mine():
		_expedition_body.add_child(_make_label(
			"⛏ On expedition — %d turns left" % game.mine_turns_left, COL_BODY))
		var leave_btn := Button.new()
		leave_btn.text = "Leave the mine"
		leave_btn.connect("pressed", Callable(self, "_do_leave_mine"))
		_expedition_body.add_child(leave_btn)
		_action_buttons["leave_mine"] = leave_btn
		return

	var supplies: int = game.qty("supplies")
	var gate_text: String = "City reached" if game.settlement.tier >= TownConfig.TIER_CITY \
		else "reach City to launch"
	_expedition_body.add_child(_make_label(
		"Supplies: %d · %s" % [supplies, gate_text], COL_BODY))
	var enter_btn := Button.new()
	enter_btn.text = "Enter the Mine (%d turns)" % supplies
	enter_btn.disabled = not game.can_enter_mine()
	enter_btn.connect("pressed", Callable(self, "_do_enter_mine"))
	_expedition_body.add_child(enter_btn)
	_action_buttons["enter_mine"] = enter_btn

func _build_boss_section() -> void:
	# M3g — the capstone boss (Frostmaw), the Town-2 close. You don't fight from a
	# button here: an active boss raises the BOARD's chain bar, so you damage it by
	# chaining on the board. While fighting we show its HP + a hint to go chain; once
	# Town 2 is done we show the win mark; otherwise a challenge row gated by
	# can_challenge_boss() (City tier + mine mastery).
	if game.is_boss_active():
		_boss_body.add_child(_make_label(
			"⚔ Fighting %s — HP %d" % [
				BossConfig.boss_name(game.boss_active), game.boss_hp], COL_BODY))
		_boss_body.add_child(_make_label(
			"Close this menu and chain 4+ tiles to damage it.", COL_MUTED))
		return

	if game.town2_complete:
		_boss_body.add_child(_make_label(
			"✓ Town 2 complete — Frostmaw defeated.", COL_BODY))
		return

	_boss_body.add_child(_make_label(
		"Capstone: %s" % BossConfig.boss_desc(BossConfig.FROSTMAW), COL_BODY))
	var challenge_btn := Button.new()
	challenge_btn.text = "⚔ Challenge Frostmaw"
	challenge_btn.disabled = not game.can_challenge_boss()
	challenge_btn.connect("pressed", Callable(self, "_do_challenge_boss"))
	_boss_body.add_child(challenge_btn)
	_action_buttons["challenge_boss"] = challenge_btn

# ── action handlers ───────────────────────────────────────────────────────────
# Each calls the GameState method, emits `state_changed` only when the result is
# ok (a real mutation), and always refresh()es so disabled states re-evaluate
# even on a no-op failure.

func _do_tier_up() -> void:
	_after(game.try_tier_up())

func _do_build(id: String) -> void:
	_after(game.build(id))

func _do_demolish(id: String) -> void:
	_after(game.demolish(id))

func _do_craft(id: String) -> void:
	_after(game.craft(id))

func _do_sell(res: String) -> void:
	_after(game.sell(res, 1))

func _do_fill(index: int) -> void:
	_after(game.fill_order(index))

func _do_enter_mine() -> void:
	# enter_mine() returns the standard {ok, reason|turns} dict, so _after handles it.
	_after(game.enter_mine())

func _do_leave_mine() -> void:
	# leave_mine() returns void (no failure mode — it always snaps to the farm), so
	# emit state_changed directly instead of routing through _after.
	game.leave_mine()
	emit_signal("state_changed")
	refresh()

func _do_challenge_boss() -> void:
	# start_boss() returns the standard {ok, reason|...} dict, so _after handles it.
	# Main's _on_town_changed reacts to state_changed by raising the board's chain bar.
	_after(game.start_boss())

## Shared tail: emit state_changed when the action succeeded, then always
## re-render so disabled affordances reflect the new state.
func _after(result: Dictionary) -> void:
	if bool(result.get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── helpers ───────────────────────────────────────────────────────────────────

## A wrapping body Label in the given color.
func _make_label(text: String, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", color)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return lbl

## Format a resource-cost Dictionary like "plank 8, hay_bundle 16, flour 8".
## An empty cost reads as "free".
func _format_cost(cost: Dictionary) -> String:
	if cost.is_empty():
		return "free"
	var parts: Array = []
	for k in cost.keys():
		parts.append("%s %d" % [k, int(cost[k])])
	return ", ".join(parts)
