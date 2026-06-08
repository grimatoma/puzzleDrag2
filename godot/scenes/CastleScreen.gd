extends CanvasLayer
## Castle — the resource-contribution screen, ported from the React castle feature
## (src/features/castle/index.tsx). A parchment modal over a warm scrim that renders
## the three CastleConfig needs as a list of cards. Each card shows the need label, a
## progress bar (contributed/target), "Have: N" (current inventory of the need's
## resource), and two buttons: "Contribute 1" and "All (N)" (contribute all you can
## afford). Buttons are disabled when you have 0 of that resource or the need is met.
## Contributing is a ONE-WAY SINK (no reset, no reward) per the React slice.
##
## Modelled EXACTLY on scenes/AchievementsScreen.gd: `extends CanvasLayer`, a build-once
## static shell (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders,
## a `closed` signal, and a close Button registered in `_action_buttons["close"]`. The
## same UiKit / Palette journal styling (parchment card, iron border, drop shadow, a
## Cinzel title via UiKit.heading_font(), section sub-headings, row chips, bar_box bars).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/CastleScreen.gd")) so the port never needs an --import pass
## to register a new global (mirrors AchievementsScreen / RecipeWikiScreen).
##
## REAL DATA + REAL MUTATION. The needs come from CastleConfig.all(); per-need
## contributed totals + the on-hand "Have" count come straight from GameState
## (castle_contributed_for + inventory). The contribute buttons call the real
## game.contribute_to_castle(id, n) (which deducts from the shared inventory and bumps
## the contributed counter) then refresh(). Nothing is faked.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable
## key "close" (emits `closed`); each need's buttons live in `_need_buttons[id]` as
## {"one": Button, "all": Button}; the rendered card per need is tracked in `_cards`.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## need_id:String → {"one": Button, "all": Button} for the contribute buttons of that
## need's card, rebuilt each refresh(). Lets a test drive a contribution path.
var _need_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the current contribution + inventory state.
var _body: VBoxContainer
## The needs scroll — a full-bleed VIEW page: it expands (SIZE_EXPAND_FILL) to fill the
## page height between the persistent top bar + bottom nav, so the needs list scrolls
## within the page rather than the card being content-sized + centred.
var _scroll: ScrollContainer
var _built: bool = false

## Header label, rebuilt each refresh().
var _header_label: Label

## need_id:String → the rendered card PanelContainer, rebuilt each refresh(). Lets a
## test fetch a specific card (e.g. assert the soup card renders its progress).
var _cards: Dictionary = {}

# ── parchment palette (matches AchievementsScreen / RecipeWikiScreen tokens) ──────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0

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
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Opaque VIEW background (not a dim modal scrim). B2 promotes this menu sub-page to a
	# full-brightness VIEW: it paints the warm app-frame parchment over the board (no longer
	# dimmed behind), reserving UiKit.TOPBAR_RESERVE at the TOP so the persistent layer-1 HUD
	# top bar shows ABOVE the view, and stopping UiKit.NAV_RESERVE short of the bottom so the
	# persistent nav bar (a LOWER CanvasLayer) shows through + stays tappable; MOUSE_FILTER_STOP
	# eats clicks in the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip; a width-cap MarginContainer keeps
	# line length tidy on wide viewports.
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
	# Flat page fill (NOT a floating card) — parchment, no corner radius, no border, no drop
	# shadow, so it reads as a full-brightness page under the persistent top bar. This menu
	# sub-page KEEPS its visible "✖ Close" (the legitimate back-to-board affordance).
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := UiKit.make_width_cap()
	panel.add_child(width_cap)

	# A non-scrolling column: title row + header line pinned at the top, then a
	# ScrollContainer that owns the needs list. Fills the full-bleed page height so the
	# scroll below expands into it (no empty void beneath a short needs list).
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "🏰 Castle" heading + right-aligned "✖ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🏰 Castle"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✖ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Header line — "N / M needs met" (gold), rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	_scroll = UiKit.make_vscroll()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Full-bleed VIEW: the scroll expands to fill the full-height page (the panel now spans
	# the band between the top bar + nav), so the needs list scrolls within the page rather
	# than the card being content-sized + centred.
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(_scroll)

	# The dynamic body — every need card hangs off this and is cleared + rebuilt each
	# refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	_scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from CastleConfig.all(): the header count line,
## then one card per need in stable order. Every need gets exactly one card (tracked
## in `_cards`); its contribute buttons are tracked in `_need_buttons`.
func refresh() -> void:
	if not _built or game == null:
		return
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	_need_buttons.clear()

	_header_label.text = "%d / %d needs met" % [needs_met_count(), total_count()]

	for entry in CastleConfig.all():
		var card := _make_need_card(entry as Dictionary)
		_body.add_child(card)
		_cards[String((entry as Dictionary).get("id", ""))] = card

## A single need card: a soft-parchment chip holding a top line (label + contributed/
## target), a progress bar, then a "Have: N" line with the two contribute buttons.
## "Contribute 1" is disabled when have == 0 or the need is met; "All (N)" is disabled
## when there's nothing affordable to contribute (have == 0 or the need is met).
func _make_need_card(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var label: String = String(entry.get("label", id))
	var resource: String = String(entry.get("resource", ""))
	var target: int = int(entry.get("target", 0))
	var contributed: int = game.castle_contributed_for(id)
	var have: int = int(game.inventory.get(resource, 0))
	var remaining: int = maxi(0, target - contributed)
	var complete: bool = contributed >= target
	var all_amount: int = mini(have, remaining)   # affordable contribution this click

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	# Met needs read slightly dimmer overall (mirrors the locked-row dim elsewhere).
	if complete:
		chip.modulate = Color(1, 1, 1, 0.85)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 5)
	chip.add_child(col)

	# ── top line: label (expands) + contributed/target ─────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 8)
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = label
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_VALUE if complete else COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_lbl)

	var prog_lbl := Label.new()
	prog_lbl.text = "%d / %d" % [contributed, target]
	prog_lbl.add_theme_font_size_override("font_size", 16)
	prog_lbl.add_theme_color_override("font_color", COL_BODY)
	prog_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	prog_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(prog_lbl)

	# ── progress bar: DIM track + a MOSS (or GOLD when met) fill ────────────────
	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	col.add_child(track)

	var ratio: float = 0.0
	if target > 0:
		ratio = clampf(float(contributed) / float(target), 0.0, 1.0)
	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fill_col: Color = COL_VALUE if complete else Palette.MOSS
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	# Size the fill once the track has a width; re-apply on resize. Seed an immediate
	# size for the headless case where `resized` may not fire before a test inspects.
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	# ── bottom line: "Have: N" + contribute buttons ─────────────────────────────
	var bottom := HBoxContainer.new()
	bottom.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	var have_lbl := Label.new()
	have_lbl.text = "Have: %d" % have
	have_lbl.add_theme_font_size_override("font_size", 15)
	have_lbl.add_theme_color_override("font_color", COL_MUTED)
	have_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	have_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom.add_child(have_lbl)

	# "Contribute 1" — disabled when you have none of the resource or the need is met.
	var one_btn := Button.new()
	one_btn.text = "Contribute 1"
	one_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(one_btn, Palette.GO_GREEN, 6, 15)
	one_btn.disabled = (have < 1) or complete
	one_btn.connect("pressed", Callable(self, "_on_contribute").bind(id, 1))
	bottom.add_child(one_btn)

	# "All (N)" — contribute everything affordable this click. Disabled when there's
	# nothing affordable (have == 0 or the need is met → all_amount == 0).
	var all_btn := Button.new()
	all_btn.text = "All (%d)" % all_amount
	all_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(all_btn, Palette.GO_GREEN, 6, 15)
	all_btn.disabled = all_amount <= 0
	all_btn.connect("pressed", Callable(self, "_on_contribute").bind(id, all_amount))
	bottom.add_child(all_btn)

	_need_buttons[id] = {"one": one_btn, "all": all_btn}
	return chip

## A contribute button was pressed: donate `amount` of `id` the REAL way (deducts from
## inventory + bumps the contributed counter, clamped in GameState), then re-render so
## the bar / Have / button states reflect the spend immediately.
func _on_contribute(id: String, amount: int) -> void:
	if game == null:
		return
	game.contribute_to_castle(id, amount)
	refresh()

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total Castle needs in the catalog.
func total_count() -> int:
	return CastleConfig.all().size()

## How many needs are fully met (contributed >= target) in `game`.
func needs_met_count() -> int:
	if game == null:
		return 0
	var n: int = 0
	for entry in CastleConfig.all():
		var id: String = String((entry as Dictionary).get("id", ""))
		if game.castle_contributed_for(id) >= int((entry as Dictionary).get("target", 0)):
			n += 1
	return n
