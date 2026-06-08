extends CanvasLayer
## The Charter — "The Hollow Pact" view, ported from the React charter feature
## (src/features/charter/index.tsx). A parchment modal over a warm scrim. READ-ONLY:
## it reads game.story.choice_log + game.story.flags + game.turn and renders a
## reflection of the player's choices against the six Hollow-Pact terms. It NEVER
## mutates GameState — there is no Build/Summon/Contribute action; the only buttons are
## the tab toggle, the term-card openers, the detail-panel close, and the screen Close.
##
## LAYOUT (mirrors PortalScreen / DecorationsScreen EXACTLY):
##   • full-rect warm-brown scrim (clicks behind it never reach the board)
##   • a centered parchment PanelContainer (iron border, rounded, drop shadow)
##   • a title row: "⚖️ The Charter" (Cinzel heading) + "✕ Close"
##   • a settlement RIBBON line: "Hearthwood Vale" + "{turn} turn(s) elapsed" + "Hollow Pact"
##   • a two-tab toggle: "Terms" / "All choices" (a selected/unselected button pair)
##   • a ScrollContainer owning the dynamic body, rebuilt each refresh():
##       TERMS tab: the 6 term cards (roman + title + caption + a state-coloured pill).
##                  Clicking a card opens the in-screen DETAIL PANEL (a second
##                  PanelContainer overlay): the term description + "Where it was tested"
##                  (the related choice-log entries via format_choice_entry, or the
##                  empty-state line). The detail panel reuses the same parchment styling.
##       ALL CHOICES tab: the timeline — every choice_log row (beat title + "Act N" +
##                  choice label; value only if the row carries one — Godot rows don't,
##                  so it's guarded out). Empty-state line when the log is empty.
##
## NOTE on Godot story rows: StoryState.choice_log rows are {beat_id, choice_id} — NO
## `ts`, NO `value` (the Godot engine doesn't record them). So the timeline simply has
## no timestamps and never shows a value line — faithful to the data the port records
## (React rendered ts/value only `if present` too). Rows are shown in stored order (no ts
## to sort by).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/CharterScreen.gd")) so the port never needs an --import pass to
## register a new global (mirrors PortalScreen / DecorationsScreen / CastleScreen).
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable
## key "close" (emits `closed`). The two tab buttons live in `_tab_buttons["terms"]` /
## `_tab_buttons["all"]`. On the Terms tab each term's card lives in `_cards[id]` and its
## opener Button in `_card_buttons[id]`. The detail panel is `_detail_panel` (visible
## when a term is open); its close Button is `_action_buttons["detail_close"]`. The
## currently open term id is `_open_term_id` ("" when closed). The current tab is `_tab`.

var game: GameState

signal closed

## action id → Button, for headless tests. Always has "close"; has "detail_close" while
## the term detail panel is open.
var _action_buttons: Dictionary = {}

## "terms" / "all" → the tab toggle Button. Built once in the shell.
var _tab_buttons: Dictionary = {}

## term_id:String → its rendered card PanelContainer (Terms tab only, rebuilt each refresh()).
var _cards: Dictionary = {}

## term_id:String → its card opener Button (Terms tab only). Lets a test drive a card open.
var _card_buttons: Dictionary = {}

## Static shell (built once in setup()); the body VBox is cleared + repopulated each
## refresh() so switching tabs / reopening always reflects the live story state.
var _body: VBoxContainer
## The body scroll — a full-bleed VIEW page: it expands (SIZE_EXPAND_FILL) to fill the
## page height between the persistent top bar + bottom nav, so the tab body scrolls within
## the page rather than the card being content-sized + centred.
var _scroll: ScrollContainer
var _built: bool = false

## The ribbon's turns-elapsed Label, refreshed each refresh().
var _ribbon_turns: Label

## Current tab: "terms" | "all".
var _tab: String = "terms"

## The currently open term id ("" when the detail panel is hidden).
var _open_term_id: String = ""

## The term detail overlay panel (shown/hidden), built lazily on first open.
var _detail_panel: PanelContainer
## The detail panel's dynamic body (cleared + repopulated each open).
var _detail_body: VBoxContainer

# ── parchment palette (matches PortalScreen / DecorationsScreen tokens) ────────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0

## The fallback settlement name (React: settlement?.name ?? "Hearthwood Vale"; the port
## dropped the name prompt as UI-only, so the fallback is always used).
const SETTLEMENT_NAME := "Hearthwood Vale"

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render. Safe to call again.
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
	# sub-page KEEPS its visible "✕ Close" (the legitimate back-to-board affordance). The
	# term-DETAIL overlay still uses the floating-card _parchment_card_style().
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	# Fill the full-bleed page height so the scroll below expands into it (no empty void
	# beneath a short tab body).
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "⚖️ The Charter" heading + right-aligned "✕ Close".
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "⚖️ The Charter"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COL_TITLE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.add_child(title)

	var close_btn := Button.new()
	close_btn.text = "✕ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Settlement ribbon: name + turns elapsed + "Hollow Pact".
	root_vbox.add_child(_build_ribbon())

	# Two-tab toggle: Terms / All choices.
	var tabs := HBoxContainer.new()
	tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_theme_constant_override("separation", 8)
	root_vbox.add_child(tabs)

	var terms_btn := Button.new()
	terms_btn.text = "Terms"
	UiKit.style_button(terms_btn, Palette.EMBER, 6, 16)
	terms_btn.connect("pressed", Callable(self, "_on_tab").bind("terms"))
	tabs.add_child(terms_btn)
	_tab_buttons["terms"] = terms_btn

	var all_btn := Button.new()
	all_btn.text = "All choices"
	UiKit.style_button(all_btn, Palette.EMBER, 6, 16)
	all_btn.connect("pressed", Callable(self, "_on_tab").bind("all"))
	tabs.add_child(all_btn)
	_tab_buttons["all"] = all_btn

	_scroll = UiKit.make_vscroll()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Full-bleed view: the scroll takes the spare page height (no content-clamp / float-card
	# sizing) so the tab body fills the page and scrolls when it overflows.
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(_scroll)

	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 10)
	_scroll.add_child(_body)

	# The term-detail overlay panel (built once, hidden until a card is opened).
	_build_detail_panel()

## A parchment card StyleBoxFlat — the shared modal look (warm fill, iron border,
## rounded, drop shadow). Used by the main panel + the detail overlay.
func _parchment_card_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(20)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	return style

## The settlement ribbon: a soft-parchment chip with the name + turns-elapsed line and a
## right-aligned "Hollow Pact" tag. Mirrors the React SettlementRibbon.
func _build_ribbon() -> PanelContainer:
	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# Leading circular seal badge (React parity: the gold-soft rounded badge at the head of
	# the SettlementRibbon).
	row.add_child(_make_ribbon_badge())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	col.add_theme_constant_override("separation", 2)
	row.add_child(col)

	var name_lbl := Label.new()
	name_lbl.text = SETTLEMENT_NAME
	name_lbl.add_theme_font_size_override("font_size", 18)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	_ribbon_turns = Label.new()
	_ribbon_turns.text = _turns_text()
	_ribbon_turns.add_theme_font_size_override("font_size", 13)
	_ribbon_turns.add_theme_color_override("font_color", COL_MUTED)
	_ribbon_turns.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_ribbon_turns)

	var tag := Label.new()
	tag.text = "Hollow Pact"
	tag.add_theme_font_size_override("font_size", 12)
	tag.add_theme_color_override("font_color", COL_MUTED)
	tag.size_flags_horizontal = Control.SIZE_SHRINK_END
	tag.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(tag)
	return chip

## "{N} turn(s) elapsed" from the live turn counter (singular/plural like React).
func _turns_text() -> String:
	var n: int = game.turn if game != null else 0
	var word: String = "turn" if n == 1 else "turns"
	return "%d %s elapsed" % [n, word]

## The ribbon's leading circular seal badge: a gold-soft disc with a faint gold ring and a
## centred seal glyph (React's gold-soft pact badge at the head of the SettlementRibbon).
func _make_ribbon_badge() -> Control:
	var wrap := Control.new()
	wrap.custom_minimum_size = Vector2(40, 40)
	wrap.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var disc := Panel.new()
	disc.set_anchors_preset(Control.PRESET_FULL_RECT)
	disc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(Palette.GOLD, 0.18)        # gold-soft wash
	sb.border_color = Color(Palette.GOLD, 0.55)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(999)
	disc.add_theme_stylebox_override("panel", sb)
	wrap.add_child(disc)

	var glyph := Label.new()
	glyph.text = "✦"                                # the Pact seal mark (engine-native glyph)
	glyph.add_theme_font_size_override("font_size", 20)
	glyph.add_theme_color_override("font_color", Palette.GOLD.darkened(0.1))
	glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	glyph.set_anchors_preset(Control.PRESET_FULL_RECT)
	glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
	wrap.add_child(glyph)
	return wrap

# ── tab switching ──────────────────────────────────────────────────────────────

func _on_tab(tab: String) -> void:
	_tab = tab
	# Switching tabs closes any open detail panel.
	_open_term_id = ""
	refresh()

## Style the tab buttons: the SELECTED tab is a SOLID-GOLD segment (clear "you are here");
## the unselected one is a plain parchment outline. Uses the shared segmented-control look.
func _sync_tab_buttons() -> void:
	for key in _tab_buttons.keys():
		UiKit.style_segment(_tab_buttons[key], String(key) == _tab, Palette.GOLD)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from the live story state for the current tab. The
## ribbon turns-line + tab-button tints are also refreshed. The detail overlay is shown
## iff a term is open.
func refresh() -> void:
	if not _built or game == null:
		return
	if _ribbon_turns != null:
		_ribbon_turns.text = _turns_text()
	_sync_tab_buttons()
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()
	_card_buttons.clear()

	if _tab == "terms":
		_render_terms()
	else:
		_render_timeline()

	_sync_detail_panel()

## TERMS tab: the 6 term cards + a closing italic note (mirrors the React Terms tab).
func _render_terms() -> void:
	var flags: Dictionary = _flags()
	var log: Array = _choice_log()
	for term in CharterConfig.all():
		var card := _make_term_card(term as Dictionary, log, flags)
		_body.add_child(card)
		_cards[String((term as Dictionary).get("id", ""))] = card

	var note := Label.new()
	note.text = "Six terms, sworn at the home hearth. Read by the Ember at the close of the age. Each choice you make is weighed against them."
	note.add_theme_font_size_override("font_size", 12)
	note.add_theme_color_override("font_color", COL_MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(note)

## A single term card: a clickable soft-parchment chip with the roman numeral, the title,
## the derived caption, and a state-coloured pill. Clicking opens the detail panel.
func _make_term_card(term: Dictionary, log: Array, flags: Dictionary) -> PanelContainer:
	var id: String = String(term.get("id", ""))
	var roman: String = String(term.get("roman", ""))
	var title: String = String(term.get("title", id))
	var state: String = CharterConfig.derive_term_state(term, log, flags)
	var caption: String = CharterConfig.term_caption(term, log, flags)

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# Roman numeral (ember, fixed-ish width on the left).
	var roman_lbl := Label.new()
	roman_lbl.text = "%s." % roman
	roman_lbl.add_theme_font_size_override("font_size", 22)
	roman_lbl.add_theme_color_override("font_color", COL_HEADER)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		roman_lbl.add_theme_font_override("font", hf)
	roman_lbl.custom_minimum_size = Vector2(36, 0)
	roman_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	roman_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(roman_lbl)

	# Title + caption column (expands).
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	row.add_child(col)

	var title_lbl := Label.new()
	title_lbl.text = title
	title_lbl.add_theme_font_size_override("font_size", 16)
	title_lbl.add_theme_color_override("font_color", COL_BODY)
	title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(title_lbl)

	var cap_lbl := Label.new()
	cap_lbl.text = caption
	cap_lbl.add_theme_font_size_override("font_size", 12)
	cap_lbl.add_theme_color_override("font_color", COL_MUTED)
	cap_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(cap_lbl)

	# State pill (right-aligned).
	row.add_child(_make_state_pill(state))

	# An invisible full-card Button overlay so the whole card is clickable (the card's
	# inner Labels ignore the mouse, so the button gets the click). Stored for tests.
	var opener := Button.new()
	opener.flat = true
	opener.set_anchors_preset(Control.PRESET_FULL_RECT)
	opener.mouse_filter = Control.MOUSE_FILTER_STOP
	opener.focus_mode = Control.FOCUS_NONE
	opener.connect("pressed", Callable(self, "_on_open_term").bind(id))
	chip.add_child(opener)
	_card_buttons[id] = opener
	return chip

## A small rounded pill in the state's SOFT tone with the state label. The saturated
## CharterConfig tone is lightened into a soft pastel fill with a hue-matched soft border
## and DARK ink text of the same hue (soft moss / iron / rose), so the pills read as quiet
## status tints instead of loud saturated chips.
func _make_state_pill(state: String) -> PanelContainer:
	var tone: Color = CharterConfig.state_pill_tone(state)
	var label: String = CharterConfig.state_pill_label(state)
	var bg: Color = tone.lightened(0.66)
	var border: Color = tone.lightened(0.28)
	var ink: Color = Palette.INK_MID if state == "pending" else tone.darkened(0.30)

	var pill := PanelContainer.new()
	pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pill.size_flags_horizontal = Control.SIZE_SHRINK_END
	pill.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(999)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 3
	sb.content_margin_bottom = 3
	pill.add_theme_stylebox_override("panel", sb)

	var lbl := Label.new()
	lbl.text = label
	lbl.add_theme_font_size_override("font_size", 14)
	lbl.add_theme_color_override("font_color", ink)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pill.add_child(lbl)
	return pill

## ALL CHOICES tab: the timeline of every choice_log row, or an empty-state line.
func _render_timeline() -> void:
	var log: Array = _choice_log()
	if log.is_empty():
		var empty := Label.new()
		empty.text = "Your choices will be recorded here as the pact unfolds."
		empty.add_theme_font_size_override("font_size", 14)
		empty.add_theme_color_override("font_color", COL_MUTED)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_body.add_child(empty)
		return
	for e in log:
		_body.add_child(_make_timeline_row(e as Dictionary))

## A single timeline row: beat title + "Act N" tag + the resolved choice label. (Godot
## rows carry no ts/value, so neither is rendered.)
func _make_timeline_row(entry: Dictionary) -> PanelContainer:
	var f: Dictionary = CharterConfig.format_choice_entry(entry)

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 2)
	chip.add_child(col)

	# Top line: title + (optional) "Act N" tag.
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_theme_constant_override("separation", 8)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(top)

	var title_lbl := Label.new()
	title_lbl.text = String(f.get("title", ""))
	title_lbl.add_theme_font_size_override("font_size", 15)
	title_lbl.add_theme_color_override("font_color", COL_BODY)
	title_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(title_lbl)

	var act: int = int(f.get("act", 0))
	if act > 0:   # 0 is the "no act" sentinel (unknown beat) → hide the badge
		var act_lbl := Label.new()
		act_lbl.text = "Act %d" % act
		act_lbl.add_theme_font_size_override("font_size", 11)
		act_lbl.add_theme_color_override("font_color", COL_MUTED)
		act_lbl.size_flags_horizontal = Control.SIZE_SHRINK_END
		act_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		top.add_child(act_lbl)

	var choice_lbl := Label.new()
	choice_lbl.text = String(f.get("choice_label", ""))
	choice_lbl.add_theme_font_size_override("font_size", 12)
	choice_lbl.add_theme_color_override("font_color", COL_MUTED)
	choice_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	choice_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(choice_lbl)
	return chip

# ── term detail overlay ────────────────────────────────────────────────────────

func _build_detail_panel() -> void:
	_detail_panel = PanelContainer.new()
	_detail_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	_detail_panel.offset_left = 40
	_detail_panel.offset_right = -40
	_detail_panel.offset_top = 80
	_detail_panel.offset_bottom = -80
	_detail_panel.add_theme_stylebox_override("panel", _parchment_card_style())
	_detail_panel.visible = false
	add_child(_detail_panel)

	var cap := MarginContainer.new()
	cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	_detail_panel.add_child(cap)

	_detail_body = VBoxContainer.new()
	_detail_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_body.add_theme_constant_override("separation", 10)
	cap.add_child(_detail_body)

func _on_open_term(id: String) -> void:
	_open_term_id = id
	_sync_detail_panel()

func _on_detail_close() -> void:
	_open_term_id = ""
	_sync_detail_panel()

## Show or hide the detail overlay for the currently open term. When open, repopulate it
## with the term's heading, pill, description, and the "Where it was tested" list.
func _sync_detail_panel() -> void:
	if _detail_panel == null:
		return
	_action_buttons.erase("detail_close")
	if _open_term_id == "":
		_detail_panel.visible = false
		return
	var term: Dictionary = CharterConfig.term_by_id(_open_term_id)
	if term.is_empty():
		_detail_panel.visible = false
		_open_term_id = ""
		return

	for child in _detail_body.get_children():
		_detail_body.remove_child(child)
		child.queue_free()

	var flags: Dictionary = _flags()
	var log: Array = _choice_log()
	var state: String = CharterConfig.derive_term_state(term, log, flags)

	# Header row: "Term {roman} · {title}" + close.
	var head := HBoxContainer.new()
	head.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_body.add_child(head)

	var head_lbl := Label.new()
	head_lbl.text = "Term %s — %s" % [String(term.get("roman", "")), String(term.get("title", ""))]
	head_lbl.add_theme_font_size_override("font_size", 22)
	head_lbl.add_theme_color_override("font_color", COL_TITLE)
	var hf: Font = UiKit.heading_font()
	if hf != null:
		head_lbl.add_theme_font_override("font", hf)
	head_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	head.add_child(head_lbl)

	var dclose := Button.new()
	dclose.text = "✕"
	dclose.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(dclose, Palette.EMBER, 6, 18)
	dclose.connect("pressed", Callable(self, "_on_detail_close"))
	head.add_child(dclose)
	_action_buttons["detail_close"] = dclose

	# State pill.
	var pill_row := HBoxContainer.new()
	pill_row.add_child(_make_state_pill(state))
	_detail_body.add_child(pill_row)

	# Description.
	var desc := Label.new()
	desc.text = String(term.get("description", ""))
	desc.add_theme_font_size_override("font_size", 14)
	desc.add_theme_color_override("font_color", COL_BODY)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_detail_body.add_child(desc)

	# "Where it was tested" header.
	var tested_hdr := Label.new()
	tested_hdr.text = "Where it was tested"
	tested_hdr.add_theme_font_size_override("font_size", 12)
	tested_hdr.add_theme_color_override("font_color", COL_MUTED)
	tested_hdr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_detail_body.add_child(tested_hdr)

	var entries: Array = CharterConfig.term_related_entries(term, log)
	if entries.is_empty():
		var empty := Label.new()
		empty.text = "No choices recorded against this term yet."
		empty.add_theme_font_size_override("font_size", 13)
		empty.add_theme_color_override("font_color", COL_MUTED)
		empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_detail_body.add_child(empty)
	else:
		var list_scroll := UiKit.make_vscroll()
		list_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		list_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		list_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
		_detail_body.add_child(list_scroll)
		var list := VBoxContainer.new()
		list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		list.add_theme_constant_override("separation", 8)
		list_scroll.add_child(list)
		for e in entries:
			list.add_child(_make_timeline_row(e as Dictionary))

	_detail_panel.visible = true

# ── live story reads (READ-ONLY) ─────────────────────────────────────────────────

## The live story flags dict (empty when no game / no story).
func _flags() -> Dictionary:
	if game == null or game.story == null:
		return {}
	return game.story.flags

## The live choice_log array (empty when no game / no story). Shown in stored order
## (Godot rows carry no ts to sort by).
func _choice_log() -> Array:
	if game == null or game.story == null:
		return []
	return game.story.choice_log

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total terms in the Hollow Pact.
func total_count() -> int:
	return CharterConfig.count()
