extends CanvasLayer
## The KEEPER ENCOUNTER — a parchment dialog (card over a warm scrim) where a settlement's
## biome keeper appears and the player makes a FINAL choice (T31, ported from src/keepers.ts +
## the React keeper encounter). Two states:
##
##   INTRO state: the keeper's icon + name + title, the encounter INTRO lines, and the TWO path
##     buttons — Coexist (the keeper's coexist.label) and Drive Out (driveout.label). Choosing a
##     path calls the REAL game.give_keeper_reward(type, path) (sets the keeper_<type>_<path> story
##     flag + grants 5 Embers / 5 Core Ingots), then flips into the PITCH state.
##
##   PITCH state: the chosen path's PITCH lines + a single Continue. Continue dismisses the modal
##     (emits `resolved` with {type, path}) so Main can save + refresh + (later) surface boons.
##
## SCOPE (per the T31 brief): the port has no Keeper TRIAL mini-game, so Drive Out does NOT launch
## a special board — the faithful outcome (the path flag + the currency grant) happens directly on
## the choice. The DIALOGUE (intro + per-path pitch) is carried verbatim by KeeperConfig.
##
## Modelled on scenes/StoryModal.gd (warm-scrim backdrop + centred parchment PanelContainer +
## UiKit-styled buttons + a ScrollContainer around the lines). NO class_name — Main preloads this
## script (preload("res://scenes/KeeperModal.gd")) so the port never needs an --import pass to
## register a global (mirrors StoryModal / DailyStreakModal).
##
## REAL DATA + REAL MUTATION. The dialogue + rewards come from KeeperConfig; the choice calls the
## real game.give_keeper_reward(). Nothing is faked.
##
## Headless-test contract. Buttons are registered in `_action_buttons`: in the INTRO state
## "coexist" + "driveout"; in the PITCH state "continue". current_type() / current_path() /
## is_resolved() expose the state for tests; `_line_rows` tracks the rendered line Labels.

var game: GameState

signal closed
## Emitted when the player Continues past the chosen path's pitch — carries the resolved
## {type, path}. Main listens to save + refresh (+ surface the boons entry).
signal resolved(type: String, path: String)

## action id → Button, for headless tests. INTRO: "coexist" + "driveout". PITCH: "continue".
var _action_buttons: Dictionary = {}

## The settlement type currently presented ("" when none). Set by open_for().
var _type: String = ""
## The path chosen ("" until the player picks one), then "coexist" | "driveout".
var _chosen_path: String = ""

var _built: bool = false
var _icon_label: Label              ## the keeper icon (🦌/🪨/🌊), set each render
var _title_label: Label             ## keeper name (Cinzel), set each render
var _subtitle_label: Label          ## keeper title ("Keeper of Field & Herd")
var _lines_scroll: ScrollContainer
var _lines_box: VBoxContainer       ## holds the dialogue line rows (cleared each render)
var _buttons_box: VBoxContainer     ## holds the choice / Continue buttons (cleared each render)
## The rendered line rows (one Label per line), tracked for the headless test.
var _line_rows: Array = []

# ── parchment palette (matches StoryModal tokens) ───────────────────────────────
const COL_TITLE := Palette.INK
const COL_SUBTITLE := Palette.INK_MID
const COL_BODY := Palette.INK
const COL_NARRATION := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 520.0
const LINES_MAX_H := 520.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Present the keeper encounter for settlement `type` ("farm" | "mine" | "harbor") and show the
## modal in its INTRO state. An unknown type renders an empty (still dismissible) card.
func open_for(type: String) -> void:
	if not _built:
		return
	_type = type
	_chosen_path = ""
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 5                                   # above the other modals (Town/Menu at 3/4)
	visible = false

	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(24)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 12)
	panel.add_child(col)

	# Keeper icon — a big emoji, centred.
	_icon_label = Label.new()
	_icon_label.text = ""
	_icon_label.add_theme_font_size_override("font_size", 54)
	_icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_icon_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_icon_label)

	# Keeper name (Cinzel display serif), centred.
	_title_label = Label.new()
	_title_label.text = ""
	_title_label.add_theme_font_size_override("font_size", 30)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_title_label)

	# Keeper title / role, centred + muted.
	_subtitle_label = Label.new()
	_subtitle_label.text = ""
	_subtitle_label.add_theme_font_size_override("font_size", 15)
	_subtitle_label.add_theme_color_override("font_color", COL_SUBTITLE)
	_subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_subtitle_label)

	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	_lines_scroll = UiKit.make_vscroll()
	_lines_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_lines_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lines_scroll.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	col.add_child(_lines_scroll)

	_lines_box = VBoxContainer.new()
	_lines_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lines_box.add_theme_constant_override("separation", 12)
	_lines_scroll.add_child(_lines_box)

	_buttons_box = VBoxContainer.new()
	_buttons_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_buttons_box.add_theme_constant_override("separation", 10)
	col.add_child(_buttons_box)

# ── render ────────────────────────────────────────────────────────────────────

## Render the current state: the INTRO (lines + two path buttons) when no path chosen yet,
## otherwise the chosen path's PITCH (lines + Continue). Reads everything live from KeeperConfig.
func _render() -> void:
	if not _built:
		return
	var keeper: Dictionary = KeeperConfig.keeper_for_type(_type)

	# Header (keeper identity) — the same across both states.
	_icon_label.text = String(keeper.get("icon", ""))
	_title_label.text = String(keeper.get("name", "…"))
	_subtitle_label.text = String(keeper.get("title", ""))

	# Clear lines + buttons + the action registry.
	for child in _lines_box.get_children():
		_lines_box.remove_child(child)
		child.queue_free()
	for child in _buttons_box.get_children():
		_buttons_box.remove_child(child)
		child.queue_free()
	_line_rows.clear()
	_action_buttons.clear()

	if _chosen_path == "":
		_render_intro(keeper)
	else:
		_render_pitch()

	_fit_lines_scroll()
	call_deferred("_fit_lines_scroll")

## INTRO state: the encounter intro lines + the two path buttons (Coexist / Drive Out) labelled
## with each path's `label`. Choosing calls _on_choose(path).
func _render_intro(keeper: Dictionary) -> void:
	for raw in KeeperConfig.intro_lines(_type):
		_lines_box.add_child(_make_line_row(String(raw)))

	# Coexist button (the keeper's coexist.label).
	var coexist_label: String = String((keeper.get("coexist", {}) as Dictionary).get("label", "Coexist"))
	var coexist_btn := Button.new()
	coexist_btn.text = coexist_label
	coexist_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	coexist_btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UiKit.style_action_button(coexist_btn, Palette.GO_GREEN, 8, 17)
	coexist_btn.connect("pressed", Callable(self, "_on_choose").bind("coexist"))
	_buttons_box.add_child(coexist_btn)
	_action_buttons["coexist"] = coexist_btn

	# Drive Out button (the keeper's driveout.label).
	var driveout_label: String = String((keeper.get("driveout", {}) as Dictionary).get("label", "Drive Out"))
	var driveout_btn := Button.new()
	driveout_btn.text = driveout_label
	driveout_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	driveout_btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	UiKit.style_button(driveout_btn, Palette.EMBER, 8, 17)
	driveout_btn.connect("pressed", Callable(self, "_on_choose").bind("driveout"))
	_buttons_box.add_child(driveout_btn)
	_action_buttons["driveout"] = driveout_btn

## PITCH state: the chosen path's pitch lines + a single Continue that dismisses the encounter.
func _render_pitch() -> void:
	for raw in KeeperConfig.path_pitch(_type, _chosen_path):
		_lines_box.add_child(_make_line_row(String(raw)))

	# A small reward line so the grant reads (the path currency + amount).
	var reward_text: String = ""
	if _chosen_path == "coexist":
		reward_text = "✨ +%d Embers" % KeeperConfig.coexist_embers(_type)
	else:
		reward_text = "⬡ +%d Core Ingots" % KeeperConfig.driveout_core_ingots(_type)
	var reward_lbl := Label.new()
	reward_lbl.text = reward_text
	reward_lbl.add_theme_font_size_override("font_size", 18)
	reward_lbl.add_theme_color_override("font_color", Palette.GOLD)
	reward_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	reward_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lines_box.add_child(reward_lbl)

	var cont := Button.new()
	cont.text = "Continue"
	cont.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_action_button(cont, Palette.GO_GREEN, 8, 20)
	cont.connect("pressed", Callable(self, "_on_continue"))
	_buttons_box.add_child(cont)
	_action_buttons["continue"] = cont

## A wrapping body line in the narration tone (keeper dialogue is embedded in the line text
## verbatim, so there's no separate speaker prefix — matching the React intro/pitch arrays).
func _make_line_row(text: String) -> Control:
	var body := Label.new()
	body.text = text
	body.add_theme_font_size_override("font_size", 16)
	body.add_theme_color_override("font_color", COL_BODY)
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_line_rows.append(body)
	return body

## Size the lines scroll to its content (capped) so a short encounter hugs its dialogue.
func _fit_lines_scroll() -> void:
	if _lines_scroll == null or _lines_box == null:
		return
	var content_h: float = _lines_box.get_combined_minimum_size().y
	_lines_scroll.custom_minimum_size = Vector2(0, minf(content_h, LINES_MAX_H))

# ── action handlers ───────────────────────────────────────────────────────────

## A path button was pressed: resolve the keeper the REAL way (give_keeper_reward sets the path
## flag + grants the currency — FINAL + once per settlement), then flip into the PITCH state so
## the player reads the outcome before dismissing. A no-op result (already resolved) still flips
## to the pitch so the encounter never strands.
func _on_choose(path: String) -> void:
	if game != null and _type != "":
		game.give_keeper_reward(_type, path)
	_chosen_path = path
	_render()

## Continue past the pitch: hide the modal + emit `resolved` so Main saves + refreshes (and can
## surface the boons entry now that a path is unlocked).
func _on_continue() -> void:
	var t: String = _type
	var p: String = _chosen_path
	visible = false
	emit_signal("resolved", t, p)

# ── pure helpers (testable without rendering internals) ────────────────────────

## The settlement type currently presented, or "" when none.
func current_type() -> String:
	return _type

## The path chosen so far ("" in the INTRO state, else "coexist" | "driveout").
func current_path() -> String:
	return _chosen_path

## True once a path has been chosen (the modal is in the PITCH state).
func is_resolved() -> bool:
	return _chosen_path != ""
