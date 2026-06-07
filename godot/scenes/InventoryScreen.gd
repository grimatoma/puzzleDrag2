class_name InventoryScreen
extends CanvasLayer
## M4g — the dedicated Inventory ledger. The original game has a full Inventory view;
## the port only had a cramped HUD stockpile strip, so this is a roomy, read-only
## parchment modal that lists EVERY owned resource, grouped (Farm goods / Refined /
## Mine / Other), with counts, Market sell prices, per-line values, and a total
## stockpile value footer.
##
## Modelled on TownScreen / MenuScreen: same warm-brown scrim backdrop + centered
## parchment PanelContainer card (StyleBoxFlat parchment fill, iron border, rounded
## corners, soft drop shadow) → MarginContainer width-cap → ScrollContainer → VBox,
## a Cinzel title, and the shared `_style_button` / `_btn_box` / `_heading_font`
## helpers copied from those screens.
##
## READ-ONLY by design. This is a ledger, not a shop — there are NO sell/buy actions
## here (that's the Town Market). The only actionable control is "✕ Close". Every
## other Control is MOUSE_FILTER_IGNORE so it never eats a click.
##
## REAL DATA. Counts come straight from GameState.inventory; prices + sellability
## from MarketConfig (SELL / can_sell / sell_price). Grouping comes from the
## Constants production families. Nothing is faked or placeholder.
##
## Headless-test contract. The close Button is registered in `_action_buttons` under
## the stable key "close" (emits `closed`), and the screen exposes pure compute
## helpers — total_value(), kinds(), total_units(), group_of(res) — so the UI-wiring
## test can verify the ledger math without rendering.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest inventory.
var _body: VBoxContainer
var _built: bool = false

## M5-polish — the live search query (lower-cased substring filter over resource names).
## Empty string ("") means "no filter" — the full grouped ledger shows. The LineEdit at the
## top of the card drives this via _on_search_changed; refresh() re-reads it each render.
var _query: String = ""
var _search_field: LineEdit             ## the search input (registered for headless tests)

# ── group membership (per the Constants production families) ───────────────────
# Ordered group definitions: each is [display name, Array of resource keys]. A
# resource not in any of these lands in the trailing "Other" group so the ledger
# NEVER silently drops an owned good. Mirrors the CLAUDE-listed port resources:
#   Farm:    hay_bundle, flour, eggs, soup, pie, honey, plank, meat, milk, horseshoe
#   Refined: bread, supplies
#   Mine:    block, iron_bar, coke, cut_gem, dirt
const GROUP_FARM := "Farm goods"
const GROUP_REFINED := "Refined"
const GROUP_MINE := "Mine"
const GROUP_OTHER := "Other"

const FARM_RESOURCES: Array = [
	"hay_bundle", "flour", "eggs", "soup", "pie",
	"honey", "plank", "meat", "milk", "horseshoe",
]
const REFINED_RESOURCES: Array = ["bread", "supplies"]
const MINE_RESOURCES: Array = ["block", "iron_bar", "coke", "cut_gem", "dirt"]

## The render order of the groups. "Other" is last so unknown keys trail the knowns.
const GROUP_ORDER: Array = [GROUP_FARM, GROUP_REFINED, GROUP_MINE, GROUP_OTHER]

# ── parchment palette (matches TownScreen / MenuScreen journal tokens) ──────────
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

	# Full-rect dim backdrop. MOUSE_FILTER_STOP so clicks behind it never reach the
	# board while the ledger is open. A warm brown-tinted scrim (matches the other
	# modals) so the parchment card reads as paper on a desk, not a hole in darkness.
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Centered panel: a full-rect Control holds a panel pinned with comfortable
	# margins; a width-cap MarginContainer keeps it tidy on wide viewports.
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
	# Parchment card — warm fill, iron border, rounded corners, generous content
	# padding, and a soft drop shadow so it floats over the warm scrim.
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

	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	width_cap.add_child(scroll)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 14)
	scroll.add_child(root_vbox)

	# Title row: "📦 Inventory" heading + a right-aligned "✕ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "📦 Inventory"
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

	# M5-polish — a search field that filters the ledger rows by name (case-insensitive
	# substring). Sits between the title and the grouped body. Typing re-renders the body
	# live; clearing it restores the full grouped ledger. Styled like the parchment row chips.
	_search_field = LineEdit.new()
	_search_field.placeholder_text = "Search items…"
	_search_field.clear_button_enabled = true
	_search_field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_search_field.add_theme_font_size_override("font_size", 18)
	_search_field.add_theme_color_override("font_color", COL_BODY)
	_search_field.add_theme_color_override("font_placeholder_color", COL_MUTED)
	_search_field.add_theme_stylebox_override("normal", UiKit.row_box())
	_search_field.add_theme_stylebox_override("focus", UiKit.row_box())
	_search_field.connect("text_changed", Callable(self, "_on_search_changed"))
	root_vbox.add_child(_search_field)

	# The dynamic body — every group section + the footer hang off this and are
	# cleared + rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	root_vbox.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from `game.inventory`: an ordered group section
## (header + a row per owned resource) for each non-empty group, then a footer with
## the total stockpile value + a kinds/units subline. An empty inventory shows a
## single muted hint.
func refresh() -> void:
	if not _built or game == null:
		return
	# Detach + free the previous body content. Nothing in this screen presses a button
	# that triggers refresh() (it's read-only — only Close acts, and that hides), so a
	# plain queue_free is safe; we never refresh mid-emit of a body control.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()

	# Group the owned resources, then apply the live search query (case-insensitive name
	# substring). An empty query passes everything through unchanged.
	var grouped: Dictionary = _grouped_owned()
	var any: bool = false
	var any_owned: bool = false
	for group_name in GROUP_ORDER:
		var keys: Array = grouped.get(group_name, [])
		if not keys.is_empty():
			any_owned = true
		var shown: Array = _apply_query(keys)
		if shown.is_empty():
			continue
		any = true
		_build_group_section(group_name, shown)

	# Empty-state messaging: distinguish a genuinely empty stockpile from "nothing matches
	# your search" so the player knows WHY the ledger is blank.
	if not any:
		if any_owned and _query != "":
			var no_match := _make_label(
				"No items match '%s'." % _query, COL_MUTED)
			_body.add_child(no_match)
		else:
			var empty := _make_label(
				"Your stockpile is empty — chain tiles to gather goods.", COL_MUTED)
			_body.add_child(empty)
		return

	_build_footer()

## Build one group: an ember Cinzel section header, then a row per owned resource
## (sorted by key) showing name · count · sell-each + line value (gold) when sellable.
func _build_group_section(group_name: String, keys: Array) -> void:
	# A subtle iron hairline above each group for the ruled-ledger feel.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var header := Label.new()
	header.text = group_name
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	_body.add_child(header)

	var sorted: Array = keys.duplicate()
	sorted.sort()
	for res in sorted:
		_body.add_child(_make_resource_row(String(res)))

## A single resource row: a soft-parchment chip holding three columns —
##   name (ink, expands) · count (ink, prominent) · value (gold, sell-each + line)
## The value column is OMITTED for non-sellable goods (e.g. supplies).
func _make_resource_row(res: String) -> PanelContainer:
	var count: int = game.qty(res)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# Name — expands to push the count + value to the right edge.
	var name_lbl := _make_label(res, COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	# Count — prominent ink, right-aligned in its own fixed column.
	var count_lbl := Label.new()
	count_lbl.text = "×%d" % count
	count_lbl.add_theme_font_size_override("font_size", 20)
	count_lbl.add_theme_color_override("font_color", COL_BODY)
	count_lbl.custom_minimum_size = Vector2(64, 0)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count_lbl)

	# Value — sell-each + the line value (count × sell), gold. Sellable goods only.
	var value_lbl := Label.new()
	value_lbl.add_theme_font_size_override("font_size", 16)
	value_lbl.add_theme_color_override("font_color", COL_VALUE)
	value_lbl.custom_minimum_size = Vector2(150, 0)
	value_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if MarketConfig.can_sell(res):
		var each: int = MarketConfig.sell_price(res)
		value_lbl.text = "%d🪙 ea · %d🪙" % [each, each * count]
	else:
		value_lbl.text = "—"
		value_lbl.add_theme_color_override("font_color", COL_MUTED)
	row.add_child(value_lbl)

	return chip

## The footer: the total stockpile value (gold), then a muted "{K} kinds · {N} items"
## subline. Preceded by an iron hairline to set it off from the last group.
func _build_footer() -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.9)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var total := Label.new()
	total.text = "Total stockpile value: %d 🪙" % total_value()
	total.add_theme_font_size_override("font_size", 22)
	total.add_theme_color_override("font_color", COL_VALUE)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		total.add_theme_font_override("font", heading_font)
	total.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_body.add_child(total)

	var subline := _make_label(
		"%d kinds · %d items" % [kinds(), total_units()], COL_MUTED)
	subline.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_body.add_child(subline)

# ── search / filter (M5-polish) ────────────────────────────────────────────────

## The search field changed — store the lower-cased, trimmed query and re-render the
## body so the filter applies live. Wired to the LineEdit's `text_changed` signal.
func _on_search_changed(text: String) -> void:
	_query = text.strip_edges().to_lower()
	refresh()

## True when `res`'s name matches `query` as a case-insensitive substring. An empty/blank
## query matches EVERYTHING (no filter). Pure + headless-testable — the single source of the
## filter rule shared by the UI render path and the tests.
static func matches_query(res: String, query: String) -> bool:
	var q: String = query.strip_edges().to_lower()
	if q == "":
		return true
	return res.to_lower().find(q) != -1

## Filter a group's resource keys to those matching the current `_query`. Returns a new Array
## (the input is never mutated) — used by refresh() to decide which rows to render and which
## groups to omit when nothing in them matches.
func _apply_query(keys: Array) -> Array:
	var out: Array = []
	for res in keys:
		if matches_query(String(res), _query):
			out.append(res)
	return out

# ── ledger math (pure helpers — usable + testable without rendering) ───────────

## Which group a resource belongs to: "Farm goods" / "Refined" / "Mine" for the
## known production families, else "Other" so nothing is ever dropped.
func group_of(res: String) -> String:
	if FARM_RESOURCES.has(res):
		return GROUP_FARM
	if REFINED_RESOURCES.has(res):
		return GROUP_REFINED
	if MINE_RESOURCES.has(res):
		return GROUP_MINE
	return GROUP_OTHER

## Distinct owned resource kinds (count > 0).
func kinds() -> int:
	var n: int = 0
	if game != null:
		for key in game.inventory:
			if int(game.inventory[key]) > 0:
				n += 1
	return n

## Total individual units held across every owned resource.
func total_units() -> int:
	var n: int = 0
	if game != null:
		for key in game.inventory:
			n += maxi(0, int(game.inventory[key]))
	return n

## Total stockpile value: sum over owned SELLABLE resources of count × sell_price.
## Non-sellable goods (e.g. supplies — no Market price) contribute 0.
func total_value() -> int:
	var total: int = 0
	if game != null:
		for key in game.inventory:
			var res := String(key)
			var count: int = int(game.inventory[key])
			if count <= 0:
				continue
			if MarketConfig.can_sell(res):
				total += count * MarketConfig.sell_price(res)
	return total

## Group → Array of owned resource keys (count > 0) in that group. Empty groups are
## omitted from the dict; callers iterate GROUP_ORDER for a stable section order.
func _grouped_owned() -> Dictionary:
	var out: Dictionary = {}
	if game == null:
		return out
	for key in game.inventory:
		var res := String(key)
		if int(game.inventory[key]) <= 0:
			continue
		var g: String = group_of(res)
		if not out.has(g):
			out[g] = []
		(out[g] as Array).append(res)
	return out

# ── helpers (copied from TownScreen / MenuScreen to keep the journal look) ──────

## A wrapping body Label in the given color.
func _make_label(text: String, color: Color) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", color)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return lbl
