class_name UiKit
extends Node
## Shared UI builder helpers — M5a extract.
##
## A stateless `class_name` global (NOT an autoload) that centralises the
## styling helpers previously copy-pasted across Main.gd, TownScreen.gd,
## MenuScreen.gd, and InventoryScreen.gd.  Every function is `static` so
## call sites use `UiKit.heading_font()`, `UiKit.btn_box(fill)`, etc. without
## ever instantiating this node.
##
## Palette tokens are read from the `Palette` class_name global (Palette.gd).

# ── heading font ─────────────────────────────────────────────────────────────

## Cached Cinzel-Regular.ttf as a BOLD FontVariation.  Returns null when the
## asset isn't present so callers fall back gracefully (the parchment look does
## NOT depend on the font landing).  The cache is shared across all callers
## because `static var` lives on the class, not an instance.
static var _heading_font_cache: Font = null
static var _heading_font_tried: bool = false

## Return a bold Cinzel FontVariation, or null if the font file isn't imported.
## The result is cached after the first call — every subsequent call returns
## the same instance.
static func heading_font() -> Font:
	if _heading_font_tried:
		return _heading_font_cache
	_heading_font_tried = true
	var path := "res://assets/fonts/Cinzel-Regular.ttf"
	if ResourceLoader.exists(path):
		var base := load(path)
		if base is FontFile:
			var fv := FontVariation.new()
			fv.base_font = base
			fv.variation_opentype = {"wght": 700}   # bold weight on the variable axis
			_heading_font_cache = fv
	return _heading_font_cache

# ── StyleBox builders ─────────────────────────────────────────────────────────

## Parchment StyleBoxFlat used by Main.gd HUD buttons: warm fill, 2 px iron
## border, radius 8, generous margins (14 h / 7 v).
static func parchment_box(fill: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.corner_radius_top_left = 8
	sb.corner_radius_top_right = 8
	sb.corner_radius_bottom_left = 8
	sb.corner_radius_bottom_right = 8
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 7
	sb.content_margin_bottom = 7
	return sb

## Action-button StyleBoxFlat used by TownScreen / MenuScreen / InventoryScreen:
## warm fill, 2 px iron border, radius 8, snug margins (12 h / `padding_v` v).
##
## `padding_v` defaults to 6 (TownScreen + InventoryScreen); pass 8 for
## MenuScreen which uses slightly taller button padding.
static func btn_box(fill: Color, padding_v: int = 6) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = padding_v
	sb.content_margin_bottom = padding_v
	return sb

## Per-resource ledger row chip used by InventoryScreen: soft parchment fill,
## 1 px iron border, radius 8, snug margins (12 h / 6 v).
static func row_box() -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.IRON
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	sb.content_margin_left = 12
	sb.content_margin_right = 12
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	return sb

## Bar StyleBox (progress track / fill): flat fill, 1 px border, radius 6.
static func bar_box(fill: Color, border: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 6
	sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6
	sb.corner_radius_bottom_right = 6
	return sb

## Card StyleBox for the stockpile panel: parchment fill, 2 px iron border,
## radius 12, soft drop shadow, comfortable padding.
static func card_box(fill: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = Palette.IRON
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.corner_radius_top_left = 12
	sb.corner_radius_top_right = 12
	sb.corner_radius_bottom_left = 12
	sb.corner_radius_bottom_right = 12
	sb.shadow_size = 8
	sb.shadow_color = Color(0, 0, 0, 0.18)
	sb.shadow_offset = Vector2(0, 3)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 12
	return sb

# ── Compound helpers ──────────────────────────────────────────────────────────

## Build a fully-rounded pill PanelContainer: iron 1 px border, `bg` fill,
## `text` Label in `fg`.  The inner Label is stored as meta "label" so callers
## can keep a reference and mutate its text later.
static func make_pill(text: String, fg: Color, bg := Palette.PARCHMENT) -> PanelContainer:
	var box := PanelContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = Palette.IRON
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.corner_radius_top_left = 999
	sb.corner_radius_top_right = 999
	sb.corner_radius_bottom_left = 999
	sb.corner_radius_bottom_right = 999
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 3
	sb.content_margin_bottom = 3
	box.add_theme_stylebox_override("panel", sb)
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", fg)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(lbl)
	box.set_meta("label", lbl)
	return box

## Apply the parchment-pill look to an action Button.
##
## Parameters:
##   btn            — the Button to style.
##   accent         — hover text color (default Palette.EMBER).
##   padding_v      — vertical padding for btn_box() (default 6; pass 8 for
##                    MenuScreen's slightly taller buttons).
##   with_font_size — when > 0, sets a font_size override (MenuScreen/Inventory
##                    use 20; TownScreen leaves font size at default so pass 0).
##   with_disabled  — when true, also overrides the "disabled" stylebox
##                    (TownScreen needs this; MenuScreen/Inventory do not).
static func style_button(
	btn: Button,
	accent := Palette.EMBER,
	padding_v: int = 6,
	with_font_size: int = 0,
	with_disabled: bool = false
) -> void:
	btn.add_theme_stylebox_override("normal",  btn_box(Palette.PARCHMENT,      padding_v))
	btn.add_theme_stylebox_override("hover",   btn_box(Palette.PARCHMENT_SOFT, padding_v))
	btn.add_theme_stylebox_override("pressed", btn_box(Palette.DIM,            padding_v))
	btn.add_theme_stylebox_override("focus",   btn_box(Palette.PARCHMENT_SOFT, padding_v))
	if with_disabled:
		btn.add_theme_stylebox_override("disabled", btn_box(Palette.DIM, padding_v))
	btn.add_theme_color_override("font_color",         Palette.INK)
	btn.add_theme_color_override("font_hover_color",   accent)
	btn.add_theme_color_override("font_pressed_color", Palette.INK_MID)
	if with_disabled:
		btn.add_theme_color_override("font_disabled_color", Color(Palette.INK_MID, 0.5))
	if with_font_size > 0:
		btn.add_theme_font_size_override("font_size", with_font_size)
