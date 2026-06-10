extends CanvasLayer
## The FOUNDER PICKER — a parchment dialog (card over a warm scrim) where the player founds a new
## settlement at a discovered, unfounded map node and chooses its BIOME variant (T22, ported from
## the React founder flow: FOUND_SETTLEMENT + SETTLEMENT_BIOMES + resolveBiomeChoice). One state:
##
##   PICK state: the node name + the founding cost, and one button per biome option for the node's
##     settlement TYPE (farm / mine / harbor) — each labelled with the biome's icon + name + its two
##     fixed hazards + resource bonus. Choosing a biome calls the REAL game.found_settlement(zone,
##     biome) (gated on prior-complete + affordable), then dismisses the modal (emits `founded` with
##     {zone, biome}) so Main can save + refresh + surface a toast (and any earned Hearth-Token).
##
## Modelled on scenes/KeeperModal.gd (warm-scrim backdrop + centred parchment PanelContainer +
## UiKit-styled buttons + a ScrollContainer around the options). NO class_name — Main preloads this
## script so the port never needs an --import pass to register a global (mirrors KeeperModal).
##
## REAL DATA + REAL MUTATION. The biome options + cost come from CartographyConfig + GameState; the
## choice calls the real game.found_settlement(). Nothing is faked.
##
## Headless-test contract. Each biome option button is registered in `_action_buttons` under
## "biome:<id>", plus "cancel". current_zone() / is_founded() expose the state for tests.

var game: GameState

signal closed
## Emitted when the player founds the settlement with a biome — carries the {zone, biome} that was
## founded. Main listens to save + refresh + toast (+ surface any earned Hearth-Token).
signal founded(zone: String, biome: String)

## action id → Button, for headless tests. "biome:<id>" per option, + "cancel".
var _action_buttons: Dictionary = {}

## The zone currently being founded ("" when none). Set by open_for().
var _zone: String = ""
## Set true once a biome was successfully chosen (the founding committed).
var _founded: bool = false

var _built: bool = false
var _title_label: Label             ## "Found <Node Name>" (Cinzel)
var _subtitle_label: Label          ## the cost + type line
var _options_scroll: ScrollContainer
var _options_box: VBoxContainer     ## the biome option buttons (cleared each render)

# ── parchment palette (matches KeeperModal tokens) ──────────────────────────────
const COL_TITLE := Palette.INK
const COL_SUBTITLE := Palette.INK_MID
const COL_BODY := Palette.INK
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 520.0
const OPTIONS_MAX_H := 520.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Present the founder picker for map node `zone_id` and show the modal. A node that isn't a
## settlement type (or is already founded) renders an empty (still dismissible) card.
func open_for(zone_id: String) -> void:
	if not _built:
		return
	_zone = zone_id
	_founded = false
	_render()
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 5                                   # above the other modals (Town/Menu at 3/4)
	visible = false

	var backdrop := UiKit.make_scrim()
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

	# Title — "Found <Node Name>", Cinzel display serif, centred.
	_title_label = Label.new()
	_title_label.text = ""
	_title_label.add_theme_font_size_override("font_size", 28)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_title_label)

	# Cost + type line, centred + muted.
	_subtitle_label = Label.new()
	_subtitle_label.text = ""
	_subtitle_label.add_theme_font_size_override("font_size", 15)
	_subtitle_label.add_theme_color_override("font_color", COL_SUBTITLE)
	_subtitle_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_subtitle_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_subtitle_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_subtitle_label)

	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	var hint := Label.new()
	hint.text = "Choose this settlement's land — it fixes the hazards you'll face and what it yields."
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", COL_BODY)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(hint)

	_options_scroll = UiKit.make_vscroll()
	_options_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_options_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_options_scroll.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	col.add_child(_options_scroll)

	_options_box = VBoxContainer.new()
	_options_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_options_box.add_theme_constant_override("separation", 10)
	_options_scroll.add_child(_options_box)

	# A Cancel button so the founder flow is always dismissible.
	var cancel := Button.new()
	cancel.text = "Not yet"
	cancel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(cancel, Palette.IRON, 8, 16, true)
	cancel.connect("pressed", Callable(self, "close"))
	col.add_child(cancel)
	_action_buttons["cancel"] = cancel

# ── render ────────────────────────────────────────────────────────────────────

## Render the picker for the current zone: the title + cost line + one button per biome option.
func _render() -> void:
	if not _built:
		return
	var node: Dictionary = CartographyConfig.by_id(_zone)
	var node_name: String = String(node.get("name", _zone))
	var type: String = CartographyConfig.settlement_type_for_zone(_zone)
	_title_label.text = "Found %s" % node_name
	var cost: int = game.settlement_founding_cost() if game != null else 0
	_subtitle_label.text = "A %s settlement · %d 🪙" % [type, cost]

	# Clear options + the action registry (keep "cancel", re-registered below).
	for child in _options_box.get_children():
		_options_box.remove_child(child)
		child.queue_free()
	for k in _action_buttons.keys():
		if String(k).begins_with("biome:"):
			_action_buttons.erase(k)

	var can_pay: bool = game != null and game.coins >= cost and game.completed_settlement_count() >= 1
	for biome in CartographyConfig.biomes_for_type(type):
		_options_box.add_child(_make_biome_button(biome as Dictionary, can_pay))

	_fit_options_scroll()
	call_deferred("_fit_options_scroll")

## One biome option button: "<icon> <Name> — bonus: <bonus> · hazards: a, b". Disabled when the
## player can't afford the founding (the cost gate is enforced again in game.found_settlement).
func _make_biome_button(biome: Dictionary, can_pay: bool) -> Button:
	var bid: String = String(biome.get("id", ""))
	var hazards: Array = biome.get("hazards", [])
	var hazard_txt: String = ", ".join(_humanize(hazards))
	var btn := Button.new()
	btn.text = "%s %s\n%s · ⚠ %s" % [
		String(biome.get("icon", "")), String(biome.get("name", bid)),
		String(biome.get("bonus", "")), hazard_txt,
	]
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if can_pay:
		UiKit.style_action_button(btn, Palette.GO_GREEN, 8, 15)
		btn.connect("pressed", Callable(self, "_on_pick_biome").bind(bid))
	else:
		btn.disabled = true
		UiKit.style_button(btn, Palette.IRON, 8, 15, true)
	_action_buttons["biome:" + bid] = btn
	return btn

## Size the options scroll to its content (capped) so a short picker hugs its options.
func _fit_options_scroll() -> void:
	if _options_scroll == null or _options_box == null:
		return
	var content_h: float = _options_box.get_combined_minimum_size().y
	_options_scroll.custom_minimum_size = Vector2(0, minf(content_h, OPTIONS_MAX_H))

# ── action handlers ───────────────────────────────────────────────────────────

## A biome was chosen: found the settlement the REAL way (game.found_settlement deducts coins,
## records the founding, seeds the zone archive, folds earned Hearth-Tokens). On success hide +
## emit `founded`; on failure (shouldn't happen — the button is gated) keep the picker open.
func _on_pick_biome(biome_id: String) -> void:
	if game == null or _zone == "":
		close()
		return
	var res: Dictionary = game.found_settlement(_zone, biome_id)
	if not bool(res.get("ok", false)):
		# Re-render so a now-unaffordable option reflects the blocked state (defensive).
		_render()
		return
	_founded = true
	var z: String = _zone
	var b: String = String(res.get("biome", biome_id))
	visible = false
	emit_signal("founded", z, b)

# ── pure helpers (testable without rendering internals) ────────────────────────

## The zone currently being founded, or "" when none.
func current_zone() -> String:
	return _zone

## True once a biome was successfully chosen (the founding committed).
func is_founded() -> bool:
	return _founded

## Title-Case a list of snake_case hazard ids ("gas_pocket" → "Gas Pocket").
func _humanize(items: Array) -> Array:
	var out: Array = []
	for it in items:
		out.append(String(it).capitalize())
	return out
