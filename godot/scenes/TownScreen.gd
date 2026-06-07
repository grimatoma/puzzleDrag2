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
## M3h — the "Shoo rats" button emits this instead of clearing the board itself
## (this screen has no board ref). Main connects it, spends the charge, and clears
## the board (the single accounting point for a shoo-move).
signal shoo_rats

## Keyed by a string action id → the Button node, rebuilt each refresh() so
## headless tests can locate + press a specific button. Keys:
##   "close", "tierup", "build:<id>", "demolish:<id>", "sell:<res>", "buy:<res>",
##   "craft:<recipe>", "fill:<index>", "enter_mine", "leave_mine", "challenge_boss",
##   "shoo_rats" (M3h), "hire:<worker_id>", "fire:<worker_id>",
##   "enter_harbor", "leave_harbor" (M3j).
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
var _rats_body: VBoxContainer         ## M3h — Town-3 rats hazard (build/shoo)
var _workers_body: VBoxContainer      ## workers — hire/fire by type
var _built: bool = false

# ── parchment palette (M4c — matches Main's HUD / Palette.gd journal tokens) ───
# Re-pointed at the leather-bound-journal palette so the Town panel reads as paper
# on a desk instead of a dark modal. Changing the const VALUES re-skins every
# reference at once: title/body in ink, section headers in ember, muted in ink-mid,
# the panel fill in parchment.
const COL_TITLE := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY := Palette.INK
const COL_MUTED := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
## A soft danger tone for destructive/exit actions (demolish / leave the mine).
const COL_DANGER := Color("#b06a52")
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
	# M4c: a warm brown-tinted scrim (not flat black) so the parchment panel reads
	# as paper on a desk rather than a window punched out of darkness.
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
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
	# M4c: parchment card — warm fill, iron border, rounded corners, generous
	# content padding, and a soft drop shadow so it floats over the warm scrim.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                  # Palette.PARCHMENT
	style.set_corner_radius_all(16)
	style.set_content_margin_all(20)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	var scroll := UiKit.make_vscroll()
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
	# M4c: the Cinzel display serif (parity with Main's headings). Defensive — falls
	# back to the default font when the asset isn't imported/present.
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, COL_DANGER, 6, 0, true)
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
	_rats_body = _add_section("Rats")
	_workers_body = _add_section("Workers")

## Append a section to the root VBox: a thin "ledger rule" divider, a header Label,
## then an (initially empty) body VBox that refresh() repopulates. Returns the body
## VBox.
func _add_section(header_text: String) -> VBoxContainer:
	# M4c: a subtle iron hairline between sections for that ruled-ledger feel.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_root_vbox.add_child(rule)

	var header := Label.new()
	header.text = header_text
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
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
	_clear(_rats_body)
	_clear(_workers_body)

	_build_settlement_section()
	_build_buildings_section()
	_build_refine_section()
	_build_market_section()
	_build_orders_section()
	_build_expedition_section()
	_build_boss_section()
	_build_rats_section()
	_build_workers_section()

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
	UiKit.style_button(btn, Palette.EMBER, 6, 0, true)
	btn.connect("pressed", Callable(self, "_do_tier_up"))
	_settlement_body.add_child(btn)
	_action_buttons["tierup"] = btn

func _build_buildings_section() -> void:
	var used: int = game.plots_used()
	var total: int = game.settlement.plots()
	_buildings_body.add_child(_make_label("Plots %d/%d" % [used, total], COL_MUTED))

	for id in BuildingConfig.available_at_tier(game.settlement.tier):
		# M3h: rats-HAZARD buildings (Ratcatcher / Master Ratcatcher) live in the Rats
		# section instead — skip them here so each build button has ONE owner + key.
		if BuildingConfig.is_hazard_building(id):
			continue
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
			UiKit.style_button(demo, COL_DANGER, 6, 0, true)
			demo.connect("pressed", Callable(self, "_do_demolish").bind(id))
			row.add_child(demo)
			_action_buttons["demolish:" + id] = demo
		else:
			var build_btn := Button.new()
			build_btn.text = "Build"
			build_btn.disabled = not game.can_build(id)
			build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
			UiKit.style_button(build_btn, Palette.MOSS, 6, 0, true)
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
		UiKit.style_button(craft_btn, Palette.MOSS, 6, 0, true)
		craft_btn.connect("pressed", Callable(self, "_do_craft").bind(id))
		row.add_child(craft_btn)
		_action_buttons["craft:" + id] = craft_btn

		_refine_body.add_child(row)

func _build_market_section() -> void:
	var any_sell := false
	for res in MarketConfig.sellable_resources():
		var owned: int = game.qty(res)
		if owned <= 0:
			continue
		any_sell = true
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
		UiKit.style_button(sell_btn, Palette.GOLD, 6, 0, true)
		sell_btn.connect("pressed", Callable(self, "_do_sell").bind(res))
		row.add_child(sell_btn)
		_action_buttons["sell:" + res] = sell_btn

		_market_body.add_child(row)

	if not any_sell:
		_market_body.add_child(_make_label("nothing to sell yet", COL_MUTED))

	# ── Buy rows ─────────────────────────────────────────────────────────────
	# A "Buy" subheading visually separates the sell rows from the buy rows.
	var buy_header := _make_label("— Buy —", COL_MUTED)
	buy_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_market_body.add_child(buy_header)

	for res in MarketConfig.buyable_resources():
		var price: int = MarketConfig.buy_price(res)
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var label := _make_label("%s  (buy %d)" % [res, price], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var buy_btn := Button.new()
		buy_btn.text = "Buy 1"
		buy_btn.disabled = game.coins < price
		buy_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_button(buy_btn, Palette.MOSS, 6, 0, true)
		buy_btn.connect("pressed", Callable(self, "_do_buy").bind(res))
		row.add_child(buy_btn)
		_action_buttons["buy:" + res] = buy_btn

		_market_body.add_child(row)

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
		UiKit.style_button(fill_btn, Palette.GOLD, 6, 0, true)
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
		UiKit.style_button(leave_btn, COL_DANGER, 6, 0, true)
		leave_btn.connect("pressed", Callable(self, "_do_leave_mine"))
		_expedition_body.add_child(leave_btn)
		_action_buttons["leave_mine"] = leave_btn
		return

	# M3j — the HARBOR expedition (the Town-3 outing), mirroring the mine. While on the
	# harbor the section shows remaining turns + the live tide + a "Leave the harbor"
	# button; off it, the enter row appears (gated below).
	if game.is_in_harbor():
		_expedition_body.add_child(_make_label(
			"🌊 On the harbor — %d turns left · %s tide" % [
				game.harbor_turns_left, game.fish_tide], COL_BODY))
		var leave_h_btn := Button.new()
		leave_h_btn.text = "Leave the harbor"
		UiKit.style_button(leave_h_btn, COL_DANGER, 6, 0, true)
		leave_h_btn.connect("pressed", Callable(self, "_do_leave_harbor"))
		_expedition_body.add_child(leave_h_btn)
		_action_buttons["leave_harbor"] = leave_h_btn
		return

	var supplies: int = game.qty("supplies")
	var gate_text: String = "City reached" if game.settlement.tier >= TownConfig.TIER_CITY \
		else "reach City to launch"
	_expedition_body.add_child(_make_label(
		"Supplies: %d · %s" % [supplies, gate_text], COL_BODY))
	var enter_btn := Button.new()
	enter_btn.text = "Enter the Mine (%d turns)" % supplies
	enter_btn.disabled = not game.can_enter_mine()
	UiKit.style_button(enter_btn, Palette.EMBER, 6, 0, true)
	enter_btn.connect("pressed", Callable(self, "_do_enter_mine"))
	_expedition_body.add_child(enter_btn)
	_action_buttons["enter_mine"] = enter_btn

	# M3j — the HARBOR enter row. The harbor has NO City-tier gate of its own
	# (can_enter_harbor only needs supplies), but it's the Town-3 outing, so it's framed
	# behind town2_complete (the Frostmaw capstone) — matching how rats/Town-3 unlock. The
	# button is disabled unless can_enter_harbor() AND town2_complete; the label shows the
	# supplies cost (turns) and a hint when Town 2 isn't done yet.
	var harbor_gate_text: String = "Town 2 done" if game.town2_complete \
		else "defeat Frostmaw to unlock"
	_expedition_body.add_child(_make_label(
		"Harbor — Supplies: %d · %s" % [supplies, harbor_gate_text], COL_BODY))
	var enter_h_btn := Button.new()
	enter_h_btn.text = "Enter the harbor (%d turns)" % supplies
	enter_h_btn.disabled = not (game.can_enter_harbor() and game.town2_complete)
	UiKit.style_button(enter_h_btn, Palette.EMBER, 6, 0, true)
	enter_h_btn.connect("pressed", Callable(self, "_do_enter_harbor"))
	_expedition_body.add_child(enter_h_btn)
	_action_buttons["enter_harbor"] = enter_h_btn

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
	UiKit.style_button(challenge_btn, Palette.EMBER, 6, 0, true)
	challenge_btn.connect("pressed", Callable(self, "_do_challenge_boss"))
	_boss_body.add_child(challenge_btn)
	_action_buttons["challenge_boss"] = challenge_btn

func _build_rats_section() -> void:
	# M3h — the Town-3 rats hazard. Renders NOTHING until rats are live (Town 2 done):
	# until then the section header sits over an empty body. Once enabled it shows a
	# status line, Build/Demolish rows for the two Ratcatcher buildings (gated by
	# can_build, which requires City + rats_enabled), and — when a Ratcatcher with
	# charges is placed — a "Shoo rats" button that emits `shoo_rats` for Main to act on.
	if not game.rats_enabled():
		return

	_rats_body.add_child(_make_label("🐀 Rats infest the board", COL_BODY))
	if game.has_ratcatcher():
		_rats_body.add_child(_make_label(
			"Shoo charges: %d/%d" % [
				game.ratcatcher_charges_left(), GameState.RATCATCHER_CHARGES], COL_MUTED))

	for id in [BuildingConfig.RATCATCHER, BuildingConfig.MASTER_RATCATCHER]:
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var cost_text: String = _format_cost(BuildingConfig.building_cost(id))
		var label := _make_label("%s  (%s)" % [
			BuildingConfig.building_name(id), cost_text], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		if game.has_building(id):
			var demo := Button.new()
			demo.text = "Demolish"
			demo.size_flags_horizontal = Control.SIZE_SHRINK_END
			UiKit.style_button(demo, COL_DANGER, 6, 0, true)
			demo.connect("pressed", Callable(self, "_do_demolish").bind(id))
			row.add_child(demo)
			_action_buttons["demolish:" + id] = demo
		else:
			var build_btn := Button.new()
			build_btn.text = "Build"
			build_btn.disabled = not game.can_build(id)
			build_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
			UiKit.style_button(build_btn, Palette.MOSS, 6, 0, true)
			build_btn.connect("pressed", Callable(self, "_do_build").bind(id))
			row.add_child(build_btn)
			_action_buttons["build:" + id] = build_btn

		_rats_body.add_child(row)

	# A free-shoo button only when a Ratcatcher is placed with charges left. It does
	# NOT spend the charge here — it emits `shoo_rats` and Main owns the single spend.
	if game.can_shoo_rats():
		var shoo_btn := Button.new()
		shoo_btn.text = "Shoo rats (free move, %d left)" % game.ratcatcher_charges_left()
		UiKit.style_button(shoo_btn, Palette.GOLD, 6, 0, true)
		shoo_btn.connect("pressed", Callable(self, "_do_shoo_rats"))
		_rats_body.add_child(shoo_btn)
		_action_buttons["shoo_rats"] = shoo_btn

func _build_workers_section() -> void:
	# Workers — hire-by-type units whose passive effects shave tiles off a chain
	# (threshold_reduce_category) or stretch a recipe (recipe_input_reduce). One row
	# per WorkerConfig type: name/role + "×count/max" + an effect summary + the ramped
	# next-hire cost, a Hire button (disabled unless can_hire_worker), and a Fire button
	# (only when at least one is hired). Wired to game.hire_worker / fire_worker via
	# _after, exactly like the build/market rows.
	for id in WorkerConfig.all_ids():
		var count: int = game.worker_count(id)
		var maxc: int = WorkerConfig.max_count(id)
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)

		var cost: Dictionary = WorkerConfig.hire_cost_at(id, count)
		var cost_text: String = _format_worker_cost(cost)
		var label := _make_label("%s ×%d/%d — %s  (%s)" % [
			WorkerConfig.worker_name(id), count, maxc,
			_worker_effect_summary(id), cost_text], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		# Fire button only when at least one of this type is hired.
		if count > 0:
			var fire_btn := Button.new()
			fire_btn.text = "Fire"
			fire_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
			UiKit.style_button(fire_btn, COL_DANGER, 6, 0, true)
			fire_btn.connect("pressed", Callable(self, "_do_fire").bind(id))
			row.add_child(fire_btn)
			_action_buttons["fire:" + id] = fire_btn

		var hire_btn := Button.new()
		hire_btn.text = "Hire"
		hire_btn.disabled = not game.can_hire_worker(id)
		hire_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_button(hire_btn, Palette.MOSS, 6, 0, true)
		hire_btn.connect("pressed", Callable(self, "_do_hire").bind(id))
		row.add_child(hire_btn)
		_action_buttons["hire:" + id] = hire_btn

		_workers_body.add_child(row)

## A short player-facing description of `id`'s passive effect.
func _worker_effect_summary(id: String) -> String:
	var kind: String = WorkerConfig.ability_kind(id)
	var amount: int = WorkerConfig.ability_amount(id)
	if kind == WorkerConfig.KIND_THRESHOLD_REDUCE_CATEGORY:
		return "-%d %s chain" % [amount, WorkerConfig.ability_category(id)]
	if kind == WorkerConfig.KIND_RECIPE_INPUT_REDUCE:
		return "-%d %s in %s" % [amount, WorkerConfig.ability_input(id), WorkerConfig.ability_recipe(id)]
	return ""

## Format a worker hire cost {coins, resources} like "50c, hay_bundle 2".
func _format_worker_cost(cost: Dictionary) -> String:
	var parts: Array = ["%dc" % int(cost.get("coins", 0))]
	var res: Dictionary = cost.get("resources", {})
	for k in res.keys():
		parts.append("%s %d" % [k, int(res[k])])
	return ", ".join(parts)

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

func _do_buy(res: String) -> void:
	_after(game.buy(res, 1))

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

func _do_enter_harbor() -> void:
	# enter_harbor() returns the standard {ok, reason|turns} dict, so _after handles it.
	# Main's _on_town_changed reacts to state_changed by re-pooling the board onto the harbor
	# and placing the giant pearl.
	_after(game.enter_harbor())

func _do_leave_harbor() -> void:
	# leave_harbor() returns void (no failure mode — it always snaps to the farm), so emit
	# state_changed directly instead of routing through _after (mirrors _do_leave_mine).
	game.leave_harbor()
	emit_signal("state_changed")
	refresh()

func _do_challenge_boss() -> void:
	# start_boss() returns the standard {ok, reason|...} dict, so _after handles it.
	# Main's _on_town_changed reacts to state_changed by raising the board's chain bar.
	_after(game.start_boss())

func _do_hire(id: String) -> void:
	# hire_worker() returns the standard {ok, reason|...} dict, so _after handles it
	# (emits state_changed on success, always refreshes so disabled states re-evaluate).
	_after(game.hire_worker(id))

func _do_fire(id: String) -> void:
	# fire_worker() returns the standard {ok, reason|...} dict, so _after handles it.
	_after(game.fire_worker(id))

func _do_shoo_rats() -> void:
	# M3h — this screen has no board ref and must NOT spend the charge (Main owns the
	# single spend). Just gate on availability and emit `shoo_rats`; Main spends the
	# charge, clears the board, and calls back refresh() so the count/button update.
	if not game.can_shoo_rats():
		return
	emit_signal("shoo_rats")

## Shared tail: emit state_changed when the action succeeded, then always
## re-render so disabled affordances reflect the new state.
func _after(result: Dictionary) -> void:
	if bool(result.get("ok", false)):
		emit_signal("state_changed")
	refresh()

# ── helpers ───────────────────────────────────────────────────────────────────
# Note: heading_font(), btn_box(), style_button() have moved to UiKit (M5a).
# TownScreen calls UiKit.style_button(..., 6, 0, true) to preserve the
# disabled-state override that TownScreen originally carried.

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
