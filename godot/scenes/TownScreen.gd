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
signal rats_shoo_requested

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
# T20: the Workers (hire-by-type) section MOVED to the Townsfolk screen's Workers tab
# (NPCs vs hired Workers are distinct concepts on distinct tabs). TownScreen no longer
# renders a Workers section, so there is no double-hire UI.
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
## Order-card surface (React parity): a faint moss-tinted parchment fill with a soft
## moss border, so each NPC order reads as a green request card distinct from the
## plain parchment rows of the other sections. Tints sit a touch warm of pure green
## to stay cohesive with the leather-bound-journal palette.
const ORDER_CARD_BG := Color(0.886, 0.910, 0.812)      ## #e2e8cf — faint moss parchment
const ORDER_CARD_BORDER := Color(0.624, 0.706, 0.443)  ## #9fb471 — soft moss edge

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

	# Opaque VIEW background (not a dim modal scrim). This screen is one of the five
	# persistent bottom-nav VIEWS, so it paints the warm app-frame parchment over the
	# board — reading as a view, not a modal punched out of darkness. It reserves
	# UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD top bar shows ABOVE the
	# view, and stops UiKit.NAV_RESERVE short of the bottom so the persistent nav bar (a
	# LOWER CanvasLayer) shows through and stays tappable; MOUSE_FILTER_STOP eats clicks in
	# the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: PanelContainer → MarginContainer (width-cap) → ScrollContainer
	# → VBox, pinned edge-to-edge (no card margins).
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	# Full-bleed: no L/R card margins; the backdrop already reserves the top band so only a
	# small inner pad is needed at the top; the bottom clears the persistent nav strip.
	panel.offset_left = 0
	panel.offset_right = 0
	panel.offset_top = UiKit.TOPBAR_RESERVE + 8
	panel.offset_bottom = -UiKit.NAV_RESERVE
	panel.custom_minimum_size = Vector2(0, 0)
	# Flat page fill (NOT a floating card) — parchment, no corner radius, no border, no drop
	# shadow, so it reads as a full-brightness page under the persistent top bar.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                  # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := UiKit.make_width_cap()
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

	# Title row: "🏠 Town" heading spanning the row. The visible "✖ Close" is GONE — a primary
	# nav VIEW is left via the bottom nav / ESC-back, not a card close button. A non-rendered
	# close Button is still created + wired below so ESC/back, the "board" deep-link, and the
	# headless tests (which press _action_buttons["close"]) keep working.
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

	# Hidden close affordance — created + wired but NOT added to the visible row, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the close-button tests.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
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
	# T20: no Workers section here — hiring lives on the Townsfolk screen's Workers tab.

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

	_build_settlement_section()
	_build_buildings_section()
	_build_refine_section()
	_build_market_section()
	_build_orders_section()
	_build_expedition_section()
	_build_boss_section()
	_build_rats_section()

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
	UiKit.style_action_button(btn, Palette.EMBER, 6, 0)
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
			UiKit.style_action_button(build_btn, Palette.GO_GREEN, 6, 0)
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
		var out_key: String = RecipeConfig.recipe_output(id)
		var out_icon := UiKit.make_icon(out_key, 30.0)
		if out_icon != null:
			row.add_child(out_icon)
		var label := _make_label("%s: %s → %d×%s  @ %s" % [
			RecipeConfig.recipe_name(id), inputs_text, RecipeConfig.recipe_qty(id),
			UiKit.pretty_name(out_key), station_name], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var craft_btn := Button.new()
		craft_btn.text = "Craft"
		craft_btn.disabled = not game.can_craft(id)
		craft_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_action_button(craft_btn, Palette.GO_GREEN, 6, 0)
		craft_btn.connect("pressed", Callable(self, "_do_craft").bind(id))
		row.add_child(craft_btn)
		_action_buttons["craft:" + id] = craft_btn

		_refine_body.add_child(row)

func _build_market_section() -> void:
	# T16: Event banner — show when a seasonal market event is active.
	var ev: Dictionary = game.market_event
	if not ev.is_empty():
		var ev_label: String = String(ev.get("label", ""))
		var ev_desc: String = String(ev.get("desc", ""))
		var banner := PanelContainer.new()
		banner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var banner_style := StyleBoxFlat.new()
		banner_style.bg_color = Color(0.95, 0.88, 0.50, 0.90)   # warm amber
		banner_style.set_corner_radius_all(8)
		banner_style.set_content_margin_all(10)
		banner.add_theme_stylebox_override("panel", banner_style)
		var banner_vbox := VBoxContainer.new()
		var ev_title := _make_label("⚡ %s" % ev_label, COL_HEADER)
		ev_title.add_theme_font_size_override("font_size", 14)
		ev_title.add_theme_color_override("font_color", Palette.EMBER)
		banner_vbox.add_child(ev_title)
		if ev_desc != "":
			var ev_body := _make_label(ev_desc, COL_BODY)
			ev_body.autowrap_mode = TextServer.AUTOWRAP_WORD
			banner_vbox.add_child(ev_body)
		banner.add_child(banner_vbox)
		_market_body.add_child(banner)

	# review-17 — a clear "Sell" sub-header so the sell rows read as their own group and the
	# Buy group below it is obviously a separate, reachable section (the buy rows used to sit
	# under a faint "— Buy —" line that was easy to miss below the sell fold).
	_market_body.add_child(_make_subheader("⤴ Sell"))

	var any_sell := false
	for res in MarketConfig.sellable_resources():
		var owned: int = game.qty(res)
		if owned <= 0:
			continue
		any_sell = true
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var sell_icon := UiKit.make_icon(res, 30.0)
		if sell_icon != null:
			row.add_child(sell_icon)
		# T16: show the LIVE drifted sell price (falls back to base with no drift).
		var live_sell: int = game.live_sell_price(res)
		var label := _make_label("%s ×%d  (sell %d🪙)" % [
			UiKit.pretty_name(res), owned, live_sell], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var sell_btn := Button.new()
		sell_btn.text = "Sell 1"
		sell_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_action_button(sell_btn, Palette.GOLD, 6, 0)
		sell_btn.connect("pressed", Callable(self, "_do_sell").bind(res))
		row.add_child(sell_btn)
		_action_buttons["sell:" + res] = sell_btn

		_market_body.add_child(row)

	if not any_sell:
		_market_body.add_child(_make_label("nothing to sell yet", COL_MUTED))

	# ── Buy rows ─────────────────────────────────────────────────────────────
	# review-17 — a prominent ember "Buy" sub-header (matching the "Sell" one above) makes the
	# buy section obviously reachable, instead of the old faint centred "— Buy —" line that was
	# easy to miss below the sell fold.
	_market_body.add_child(_make_subheader("⤵ Buy"))

	for res in MarketConfig.buyable_resources():
		# T16: show the LIVE drifted buy price (falls back to base with no drift).
		var price: int = game.live_buy_price(res)
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 10)
		var buy_icon := UiKit.make_icon(res, 30.0)
		if buy_icon != null:
			row.add_child(buy_icon)
		var label := _make_label("%s  (buy %d🪙)" % [UiKit.pretty_name(res), price], COL_BODY)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

		var buy_btn := Button.new()
		buy_btn.text = "Buy 1"
		buy_btn.disabled = game.coins < price
		buy_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
		UiKit.style_action_button(buy_btn, Palette.GO_GREEN, 6, 0)
		buy_btn.connect("pressed", Callable(self, "_do_buy").bind(res))
		row.add_child(buy_btn)
		_action_buttons["buy:" + res] = buy_btn

		_market_body.add_child(row)

func _build_orders_section() -> void:
	if game.orders.is_empty():
		_orders_body.add_child(_make_label("no orders", COL_MUTED))
		return
	for i in game.orders.size():
		_orders_body.add_child(_build_order_card(i))

## Build ONE NPC order card (React parity — src/features/orders): a soft-green
## PanelContainer holding a round NPC avatar, the NPC name + role, the request line
## with the resource icon, a have/need progress bar, a reward chip, and a wide
## "Deliver" button. All data is REAL (the order Dictionary + NpcConfig + game.qty);
## an order whose `npc` isn't a roster id falls back to a neutral "?" avatar with the
## resource name as the header. The deliver button keeps the SAME wiring the flat row
## had — `_action_buttons["fill:"+i]`, disabled = not can_fill_order, → _do_fill(i).
func _build_order_card(i: int) -> PanelContainer:
	var order: Dictionary = game.orders[i]
	var res: String = String(order["resource"])
	var qty: int = int(order["qty"])
	var reward: int = int(order["reward"])
	var npc_id: String = String(order.get("npc", ""))
	var known: bool = NpcConfig.has(npc_id)

	# Resolve the requesting NPC (or a neutral fallback for an unknown id).
	var npc_name: String = NpcConfig.display_name(npc_id) if known else UiKit.pretty_name(res)
	var npc_role: String = NpcConfig.role(npc_id) if known else ""
	var npc_color: Color = NpcConfig.color(npc_id) if known else COL_MUTED
	var initial: String = npc_name.substr(0, 1).to_upper() if (known and not npc_name.is_empty()) else "?"

	# ── Card shell: a soft faint-green parchment card, rounded + moss-bordered. ──
	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = ORDER_CARD_BG
	card_style.set_corner_radius_all(12)
	card_style.set_content_margin_all(12)
	card_style.border_color = ORDER_CARD_BORDER
	card_style.set_border_width_all(1)
	card.add_theme_stylebox_override("panel", card_style)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 8)
	card.add_child(col)

	# ── Header row: [avatar] [name / role] (expand) [reward chip] ──────────────
	var header := HBoxContainer.new()
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_theme_constant_override("separation", 10)
	col.add_child(header)

	header.add_child(_make_avatar(npc_color, initial))

	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	name_col.add_theme_constant_override("separation", 1)
	header.add_child(name_col)

	var name_lbl := Label.new()
	name_lbl.text = npc_name
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_HEADER)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		name_lbl.add_theme_font_override("font", hf)
	name_col.add_child(name_lbl)

	if not npc_role.is_empty():
		var role_lbl := Label.new()
		role_lbl.text = npc_role
		role_lbl.add_theme_font_size_override("font_size", 14)
		role_lbl.add_theme_color_override("font_color", COL_MUTED)
		name_col.add_child(role_lbl)

	# Reward chip — gold, right-aligned in the header.
	var chip := UiKit.make_pill("+%d🪙" % reward, Palette.GOLD, Palette.PARCHMENT_SOFT)
	chip.size_flags_horizontal = Control.SIZE_SHRINK_END
	chip.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	header.add_child(chip)

	# ── Request line: [icon] "Bring {qty}× {Pretty Resource}" ──────────────────
	var req := HBoxContainer.new()
	req.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	req.add_theme_constant_override("separation", 6)
	col.add_child(req)
	var req_icon := UiKit.make_icon(res, 28.0)
	if req_icon != null:
		req.add_child(req_icon)
	var req_lbl := _make_label("Bring %d× %s" % [qty, UiKit.pretty_name(res)], COL_BODY)
	req_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	req.add_child(req_lbl)

	# ── have/need progress bar: DIM track + MOSS→GOLD fill + "{have}/{qty}". ───
	var have: int = game.qty(res)
	var ratio: float = clampf(float(have) / float(maxi(1, qty)), 0.0, 1.0)
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.add_theme_constant_override("separation", 8)
	col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	bar_row.add_child(track)

	# The fill is a child Control positioned inside the track; a full bar fills gold,
	# any partial progress fills moss (mirrors Main's chain-progress fill).
	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fill_col: Color = Palette.GOLD if ratio >= 1.0 else Palette.MOSS
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	# Width is driven off the track's resolved size once it lays out (and on resize),
	# inset 1px for the track's border — same idiom as Main._on_chain_track_resized.
	track.resized.connect(func() -> void:
		var w: float = maxf(0.0, track.size.x - 2.0)
		var h: float = maxf(0.0, track.size.y - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, h)
	)

	var hn_lbl := Label.new()
	hn_lbl.text = "%d/%d" % [have, qty]
	hn_lbl.add_theme_font_size_override("font_size", 14)
	hn_lbl.add_theme_color_override("font_color", COL_MUTED)
	hn_lbl.size_flags_horizontal = Control.SIZE_SHRINK_END
	hn_lbl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bar_row.add_child(hn_lbl)

	# ── Deliver button (wide) — SAME wiring as the old flat row. ───────────────
	var fill_btn := Button.new()
	fill_btn.text = "Deliver"
	fill_btn.disabled = not game.can_fill_order(i)
	fill_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(fill_btn, Palette.GO_GREEN, 8, 0)
	fill_btn.connect("pressed", Callable(self, "_do_fill").bind(i))
	col.add_child(fill_btn)
	_action_buttons["fill:" + str(i)] = fill_btn

	return card

## A ~46px round NPC avatar: a PanelContainer with a fully-rounded StyleBoxFlat tinted
## `bg` (the NPC's roster color), holding the name's `initial` centered in contrast-
## picked text. Mirrors the React circular avatar in the orders feature.
func _make_avatar(bg: Color, initial: String) -> PanelContainer:
	var av := PanelContainer.new()
	av.custom_minimum_size = Vector2(46, 46)
	av.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	av.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(999)
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	av.add_theme_stylebox_override("panel", sb)
	var lbl := Label.new()
	lbl.text = initial
	lbl.add_theme_font_size_override("font_size", 22)
	# Light/dark text picked for legibility on the avatar tint (parity with how
	# UiKit's filled buttons pick contrasting label colors).
	var lum: float = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b
	lbl.add_theme_color_override("font_color", Palette.INK if lum > 0.62 else Palette.PARCHMENT_SOFT)
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var hf: Font = UiKit.heading_font()
	if hf != null:
		lbl.add_theme_font_override("font", hf)
	av.add_child(lbl)
	return av

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
	UiKit.style_action_button(enter_btn, Palette.EMBER, 6, 0)
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
	UiKit.style_action_button(enter_h_btn, Palette.EMBER, 6, 0)
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
			"✔ Town 2 complete — Frostmaw defeated.", COL_BODY))
		return

	_boss_body.add_child(_make_label(
		"Capstone: %s" % BossConfig.boss_desc(BossConfig.FROSTMAW), COL_BODY))
	var challenge_btn := Button.new()
	challenge_btn.text = "⚔ Challenge Frostmaw"
	challenge_btn.disabled = not game.can_challenge_boss()
	UiKit.style_action_button(challenge_btn, Palette.EMBER, 6, 0)
	challenge_btn.connect("pressed", Callable(self, "_do_challenge_boss"))
	_boss_body.add_child(challenge_btn)
	_action_buttons["challenge_boss"] = challenge_btn

func _build_rats_section() -> void:
	# M3h — the Town-3 rats hazard. Renders NOTHING until rats are live (Town 2 done):
	# until then the section header sits over an empty body. Once enabled it shows a
	# status line, Build/Demolish rows for the two Ratcatcher buildings (gated by
	# can_build, which requires City + rats_enabled), and — when a Ratcatcher with
	# charges is placed — a "Shoo rats" button that emits `rats_shoo_requested` for Main to act on.
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
			UiKit.style_action_button(build_btn, Palette.GO_GREEN, 6, 0)
			build_btn.connect("pressed", Callable(self, "_do_build").bind(id))
			row.add_child(build_btn)
			_action_buttons["build:" + id] = build_btn

		_rats_body.add_child(row)

	# A free-shoo button only when a Ratcatcher is placed with charges left. It does
	# NOT spend the charge here — it emits `rats_shoo_requested` and Main owns the single spend.
	if game.can_shoo_rats():
		var shoo_btn := Button.new()
		shoo_btn.text = "Shoo rats (free move, %d left)" % game.ratcatcher_charges_left()
		UiKit.style_action_button(shoo_btn, Palette.GOLD, 6, 0)
		shoo_btn.connect("pressed", Callable(self, "_do_shoo_rats"))
		_rats_body.add_child(shoo_btn)
		_action_buttons["shoo_rats"] = shoo_btn

# T20: the Workers (hire-by-type) section + its helpers (_worker_effect_summary,
# _format_worker_cost) and the _do_hire / _do_fire handlers have MOVED to
# scenes/TownsfolkScreen.gd (the Workers tab). Hiring is reached via the Townsfolk
# screen now; TownScreen renders no Workers section, so there is no double-hire UI.

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

# T20: _do_hire / _do_fire moved to scenes/TownsfolkScreen.gd (the Workers tab).

func _do_shoo_rats() -> void:
	# M3h — this screen has no board ref and must NOT spend the charge (Main owns the
	# single spend). Just gate on availability and emit `rats_shoo_requested`; Main spends the
	# charge, clears the board, and calls back refresh() so the count/button update.
	if not game.can_shoo_rats():
		return
	emit_signal("rats_shoo_requested")

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

## A bold ember sub-header (review-17): used inside a section to separate sub-groups (e.g.
## the Market's Sell / Buy halves) so each is obviously its own reachable block. Smaller than
## a top-level section header, in the Cinzel display face when available.
func _make_subheader(text: String) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", COL_HEADER)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		lbl.add_theme_font_override("font", hf)
	return lbl

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
