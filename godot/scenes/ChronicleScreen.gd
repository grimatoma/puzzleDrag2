extends CanvasLayer
## The CHRONICLE — a read-only parchment timeline of the story so far. A scrim + card
## modal (mirrors AchievementsScreen) that renders every FIRED story beat as a timeline
## card, grouped by Act (Cinzel "Act N" sub-headings), in narrative order. The story
## LOGIC (which beats fired, the flags) is owned by GameState.story; this screen reads
## that and the StoryConfig catalog — nothing is faked.
##
## A beat is "fired" when its auto-marker (StoryEngine.fired_key, "_fired_<id>") is set
## in game.story.flags. We iterate StoryConfig.all_beats() (stable narrative order),
## include the fired ones, group them by their `act`, and render each as a card showing
## the beat title + its first line's text (the lede). A "N / total chapters" header
## tracks how much of the arc has been seen; an empty state greets a fresh game.
##
## Modelled EXACTLY on scenes/AchievementsScreen.gd: `extends CanvasLayer`, a build-once
## static shell (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders,
## a `closed` signal, and a close Button registered in `_action_buttons["close"]`. Same
## UiKit / Palette journal styling (parchment card, iron border, drop shadow, Cinzel
## title + Act sub-headings, row chips).
##
## NO class_name on purpose — Main preloads this script (preload(".../ChronicleScreen.gd"))
## so the port never needs an --import pass to register a new global.
##
## Headless-test contract. The close Button lives in `_action_buttons` under "close"
## (emits `closed`); the screen exposes pure helpers — fired_count(), total_count(),
## is_fired(id) — and tracks the rendered entry cards in `_rows` (beat id → card) so a
## test can assert a fired beat is listed and the count matches.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest fired beats.
var _body: VBoxContainer
var _built: bool = false

## The header "N / total chapters" line, rebuilt each refresh().
var _header_label: Label

## The empty-state Label ("Your story begins…"), shown when nothing has fired.
var _empty_label: Label

## beat id:String → the rendered timeline card PanelContainer, rebuilt each refresh().
var _rows: Dictionary = {}

# ── parchment palette (matches AchievementsScreen / MenuScreen journal tokens) ──────
const COL_TITLE := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY := Palette.INK
const COL_MUTED := Palette.INK_MID
const COL_VALUE := Palette.GOLD
const COL_PANEL := Palette.PARCHMENT
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

	# Full-rect warm-brown scrim. MOUSE_FILTER_STOP so clicks behind it never reach the
	# board while the chronicle is open (matches the other modals).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Centered panel: a full-rect Control holds a panel pinned with comfortable margins;
	# a width-cap MarginContainer keeps it tidy on wide viewports (mirrors AchievementsScreen).
	var center := Control.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	panel.offset_left = 24
	panel.offset_right = -24
	panel.offset_top = 48
	panel.offset_bottom = -48
	# Parchment card — warm fill, iron border, rounded corners, generous content padding,
	# soft drop shadow so it floats over the warm scrim.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
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

	# A non-scrolling column: title row + header line pinned at the top, then a
	# ScrollContainer that owns the (potentially long) timeline.
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "📜 Chronicle" heading + a right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "📜 Chronicle"
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

	# Header line — "N / total chapters" (gold), rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	# The dynamic body — every Act sub-heading + timeline card hangs off this and is
	# cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

	# Empty-state label (lives in the body; shown when nothing has fired).
	_empty_label = Label.new()
	_empty_label.text = "Your story begins…"
	_empty_label.add_theme_font_size_override("font_size", 18)
	_empty_label.add_theme_color_override("font_color", COL_MUTED)
	_empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_empty_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_empty_label.mouse_filter = Control.MOUSE_FILTER_IGNORE

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from StoryConfig.all_beats(): the header count line,
## then, for each Act that has a fired beat, an "Act N" sub-heading followed by a
## timeline card per fired beat (in catalog order). A fresh game shows the empty state.
func refresh() -> void:
	if not _built or game == null:
		return
	# Detach + free the previous body content. The screen is read-only (only Close acts,
	# and that hides), so a plain queue_free is safe — we never refresh mid-emit. Detach
	# the persistent _empty_label (don't free it — it's reused across refreshes).
	for child in _body.get_children():
		_body.remove_child(child)
		if child != _empty_label:
			child.queue_free()
	_rows.clear()

	var total: int = total_count()
	var fired: int = fired_count()
	_header_label.text = "%d / %d chapters" % [fired, total]

	# Empty state — nothing fired yet.
	if fired == 0:
		_body.add_child(_empty_label)
		_empty_label.visible = true
		return
	_empty_label.visible = false

	# Group fired beats by act (in catalog order within each act). all_beats() is already
	# in narrative order, so a single pass keyed by act preserves ordering.
	var by_act: Dictionary = {}      # act:int → Array of beat Dictionaries (fired, in order)
	var act_order: Array = []        # acts in first-seen order
	for beat in StoryConfig.all_beats():
		var id: String = String((beat as Dictionary).get("id", ""))
		if not is_fired(id):
			continue
		var act: int = int((beat as Dictionary).get("act", 1))
		if not by_act.has(act):
			by_act[act] = []
			act_order.append(act)
		(by_act[act] as Array).append(beat)

	for act in act_order:
		_build_act_section(act, by_act[act])

## Build one Act section: an iron hairline, an ember Cinzel "Act N" sub-heading, then a
## timeline card per fired beat (in catalog order).
func _build_act_section(act: int, beats: Array) -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var header := Label.new()
	header.text = "Act %d" % act
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(header)

	for beat in beats:
		var card := _make_timeline_card(beat as Dictionary)
		_body.add_child(card)
		_rows[String((beat as Dictionary).get("id", ""))] = card

## A single timeline card: a soft-parchment chip holding the beat title (gold) over its
## lede — the first line's text (or the `body` field, defensively). Reuses the row_box
## styling shared with the achievements rows.
func _make_timeline_card(beat: Dictionary) -> PanelContainer:
	var title: String = String(beat.get("title", String(beat.get("id", ""))))

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 4)
	chip.add_child(col)

	var title_lbl := Label.new()
	title_lbl.text = title
	title_lbl.add_theme_font_size_override("font_size", 19)
	title_lbl.add_theme_color_override("font_color", COL_VALUE)
	title_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(title_lbl)

	var lede := _beat_lede(beat)
	if lede != "":
		var lede_lbl := Label.new()
		lede_lbl.text = lede
		lede_lbl.add_theme_font_size_override("font_size", 14)
		lede_lbl.add_theme_color_override("font_color", COL_MUTED)
		lede_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		lede_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(lede_lbl)

	return chip

## The card lede: the first line's text (defensively falling back to a `body` field, or
## "" when a beat has neither).
func _beat_lede(beat: Dictionary) -> String:
	var lines: Array = beat.get("lines", [])
	if not lines.is_empty():
		var first: Dictionary = lines[0] as Dictionary
		var t: String = String(first.get("text", ""))
		if t != "":
			return t
	return String(beat.get("body", ""))

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total story beats in the catalog.
func total_count() -> int:
	return StoryConfig.all_beats().size()

## How many catalog beats have fired in `game`.
func fired_count() -> int:
	if game == null:
		return 0
	var n: int = 0
	for beat in StoryConfig.all_beats():
		if is_fired(String((beat as Dictionary).get("id", ""))):
			n += 1
	return n

## True when beat `id` has fired (its _fired_<id> marker is set in game.story.flags).
func is_fired(id: String) -> bool:
	if game == null or id == "":
		return false
	return bool(game.story.flags.get(StoryEngine.fired_key(id), false))
