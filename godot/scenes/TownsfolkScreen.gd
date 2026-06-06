extends CanvasLayer
## Townsfolk roster screen — a parchment modal over a warm scrim showing every NPC in
## the roster with their bond bar and tier label. Modelled EXACTLY on AchievementsScreen:
## `extends CanvasLayer`, `setup(g)`/`open()`/`refresh()`, `signal closed`, `_action_buttons["close"]`,
## parchment card + scrim, Cinzel title, scroll list of cards, UiKit/Palette.
##
## NO class_name on purpose — Main preloads this script so the port never needs an
## --import pass to register a new global. Pure read-only: the only actionable Control
## is "✕ Close"; everything else is MOUSE_FILTER_IGNORE.
##
## REAL DATA: the roster comes from game.npcs.roster (in NpcConfig.all_ids() order);
## names/roles/colors from NpcConfig; bond floats from game.npc_bond(id). Nothing faked.
##
## Headless-test contract:
##   _action_buttons["close"] — the close Button (emits `closed` signal)
##   _cards: Dictionary        — id:String → the rendered PanelContainer card, rebuilt each refresh()
##   npc_count()               — how many cards were rendered in the last refresh()

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest bond state.
var _body: VBoxContainer
var _built: bool = false

## The header "N townsfolk" line, rebuilt each refresh().
var _header_label: Label

## id:String → rendered PanelContainer card, rebuilt each refresh(). Lets tests fetch a
## specific card (e.g. assert the name label or bond band text).
var _cards: Dictionary = {}

# ── palette tokens (matches other parchment screens) ──────────────────────────────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0

# Bond-band → fill colour (tasteful Palette picks, matching the band mood).
# Sour   — muted rose (warm red-pink, subdued, a step down from ember)
# Warm   — neutral parchment-ink mid (the default, no strong tint)
# Liked  — moss green (positive, "things are going well")
# Beloved — gold (the top tier, prize colour)
const _BAND_FILL: Dictionary = {
	"Sour":    Color(0.68, 0.32, 0.28),   # muted rose/red
	"Warm":    Palette.INK_MID,            # neutral warm tan
	"Liked":   Palette.MOSS,               # positive moss green
	"Beloved": Palette.GOLD,               # prize gold
}

# ── lifecycle ──────────────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE, then render.
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

# ── static shell ───────────────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Full-rect warm-brown scrim (matches AchievementsScreen).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Centered panel.
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
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(20)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "👥 Townsfolk" heading + a right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "👥 Townsfolk"
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

	# Header line — "N townsfolk" (gold), rebuilt each refresh().
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 18)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root_vbox.add_child(_header_label)

	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	# The dynamic body — every NPC card hangs off this and is cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ─────────────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from game.npcs.roster in NpcConfig.all_ids() order.
func refresh() -> void:
	if not _built or game == null:
		return
	# Detach + free the previous body content.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	# Build the ordered roster: all_ids() order, filtered to what's actually in the roster.
	var roster: Array = game.npcs.get("roster", NpcConfig.all_ids())
	var ordered: Array = []
	for id in NpcConfig.all_ids():
		if roster.has(id):
			ordered.append(String(id))

	_header_label.text = "%d townsfolk" % ordered.size()

	for id in ordered:
		var card := _make_npc_card(id)
		_body.add_child(card)
		_cards[id] = card

## A single NPC card: a soft-parchment chip holding a top row (avatar swatch + name +
## role) over a bond bar with a band label. Layout mirrors AchievementsScreen trophy rows.
func _make_npc_card(id: String) -> PanelContainer:
	var npc_name: String = NpcConfig.display_name(id)
	var npc_role: String = NpcConfig.role(id)
	var bond: float = game.npc_bond(id)
	var band: Dictionary = NpcConfig.bond_band(bond)
	var band_name: String = String(band.get("name", "Warm"))
	var mult: float = float(band.get("mult", 1.0))

	# Parse the NPC color from the hex string in NPCS.
	var npc_color: Color = _npc_color(id)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 6)
	chip.add_child(col)

	# ── top row: round avatar + name + role ────────────────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 12)
	col.add_child(top)

	# Round color swatch/avatar (a Panel tinted with the NPC color, initial centered on it).
	var avatar_wrap := Control.new()
	avatar_wrap.custom_minimum_size = Vector2(44, 44)
	avatar_wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(avatar_wrap)

	var avatar := Panel.new()
	avatar.set_anchors_preset(Control.PRESET_FULL_RECT)
	avatar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var avatar_sb := StyleBoxFlat.new()
	avatar_sb.bg_color = npc_color
	avatar_sb.border_color = Color(npc_color.r * 0.7, npc_color.g * 0.7, npc_color.b * 0.7)
	avatar_sb.set_border_width_all(2)
	avatar_sb.set_corner_radius_all(999)   # fully round
	avatar_sb.shadow_size = 4
	avatar_sb.shadow_color = Color(0, 0, 0, 0.22)
	avatar_sb.shadow_offset = Vector2(0, 2)
	avatar.add_theme_stylebox_override("panel", avatar_sb)
	avatar_wrap.add_child(avatar)

	# First initial, centered over the swatch.
	var initial := Label.new()
	initial.text = npc_name.left(1).to_upper() if npc_name.length() > 0 else "?"
	initial.add_theme_font_size_override("font_size", 20)
	# Choose white or dark ink based on the swatch luminance so the letter is legible.
	var lum: float = npc_color.r * 0.299 + npc_color.g * 0.587 + npc_color.b * 0.114
	initial.add_theme_color_override("font_color", Color(1, 1, 1) if lum < 0.5 else Palette.INK)
	initial.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	initial.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	initial.set_anchors_preset(Control.PRESET_FULL_RECT)
	initial.mouse_filter = Control.MOUSE_FILTER_IGNORE
	avatar_wrap.add_child(initial)

	# Name + role column (expands to fill the remaining width).
	var name_col := VBoxContainer.new()
	name_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_theme_constant_override("separation", 2)
	top.add_child(name_col)

	var name_lbl := Label.new()
	name_lbl.text = npc_name
	name_lbl.add_theme_font_size_override("font_size", 20)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		name_lbl.add_theme_font_override("font", heading_font)
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_child(name_lbl)

	var role_lbl := Label.new()
	role_lbl.text = npc_role
	role_lbl.add_theme_font_size_override("font_size", 14)
	role_lbl.add_theme_color_override("font_color", COL_MUTED)
	role_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_col.add_child(role_lbl)

	# ── bond bar row ──────────────────────────────────────────────────────────
	# A DIM track with a band-tinted fill (width = bond/10) + a descriptive label.
	var bar_col := VBoxContainer.new()
	bar_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_col.add_theme_constant_override("separation", 4)
	col.add_child(bar_col)

	var fill_color: Color = _band_fill_color(band_name)
	var ratio: float = clampf(bond / 10.0, 0.0, 1.0)

	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_theme_constant_override("separation", 8)
	bar_col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	bar_row.add_child(track)

	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_color, fill_color))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	# Size the fill once the track has a width (mirrors AchievementsScreen).
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	# Band label: "<band name> · bond X.X/10 · ×<mult> orders"
	var band_lbl := Label.new()
	band_lbl.text = "%s · bond %.1f/10 · ×%.2f orders" % [band_name, bond, mult]
	band_lbl.add_theme_font_size_override("font_size", 13)
	band_lbl.add_theme_color_override("font_color", fill_color)
	band_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_col.add_child(band_lbl)

	return chip

# ── colour helpers ──────────────────────────────────────────────────────────────────

## Parse the NPC's hex color string (e.g. "#4f6b3a") into a Color.
## Falls back to a neutral warm-grey when the id isn't in the catalog.
func _npc_color(id: String) -> Color:
	for n in NpcConfig.NPCS:
		if String(n["id"]) == id:
			var hex: String = String(n["color"])
			if hex.begins_with("#"):
				hex = hex.substr(1)
			return Color.from_string("#" + hex, Palette.INK_MID)
	return Palette.INK_MID

## Return the fill Color for a given band name.
func _band_fill_color(band_name: String) -> Color:
	if _BAND_FILL.has(band_name):
		return _BAND_FILL[band_name] as Color
	return Palette.INK_MID

# ── pure helpers (usable + testable without rendering) ─────────────────────────────

## How many NPC cards were rendered in the last refresh().
func npc_count() -> int:
	return _cards.size()
