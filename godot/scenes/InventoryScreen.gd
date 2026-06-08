class_name InventoryScreen
extends CanvasLayer
## M4g / C1 — the dedicated Inventory VIEW. The original game has a full Inventory view;
## the port started with a cramped HUD stockpile strip, then a roomy read-only ledger,
## and this (C1) brings it closer to the React reference (src/features/inventory/index.tsx):
## a CATEGORY TAB BAR (All / Resources / Tools) over the body, a live name SEARCH, and the
## familiar grouped ledger (Farm goods / Refined / Mine / Other) with counts + Market value.
##
## TABS (React parity, honestly mapped to what the port actually has):
##   • All       — everything owned: the grouped resource ledger PLUS owned tools.
##   • Resources — the grouped resource ledger only (GameState.inventory counts).
##   • Tools     — owned tools (GameState.tools, charges > 0): icon + name + ×count.
##   The React reference also has an "Items" tab (INVENTORY_TAGS.ITEM — items whose kind is
##   neither resource nor tool). The port has NO such distinct kind: every inventory key is a
##   resource family and every tool lives in GameState.tools, so the Items tab is OMITTED
##   rather than faked (per the no-fakes rule). If a real "item" kind ever lands it gets a tab.
##
## Modelled on TownScreen / TownsfolkScreen: full-bleed parchment VIEW panel (reserves the
## persistent top bar + bottom nav), a Cinzel title, a UiKit.style_segment tab row (same
## segmented toggle TownsfolkScreen uses), and the shared UiKit styling helpers
## (UiKit.heading_font / UiKit.make_icon / UiKit.row_box) — called on the UiKit namespace.
##
## READ-ONLY by design. This is a ledger, not a shop — there are NO sell/buy/use actions
## here (selling is the Town Market; using tools is the board palette). The only actionable
## controls are the tab buttons + the search field. Every other Control is
## MOUSE_FILTER_IGNORE so it never eats a click.
##
## REAL DATA. Resource counts come straight from GameState.inventory; prices + sellability
## from MarketConfig (can_sell / sell_price); tool counts from GameState.tool_count, labels
## from ToolConfig. Grouping comes from the Constants production families. Nothing is faked.
##
## Headless-test contract. The close Button is registered in `_action_buttons` under the
## stable key "close" (emits `closed`); the tab buttons are registered in `_tab_buttons`
## keyed by tab id ("all"/"resources"/"tools"); the screen exposes pure compute helpers —
## total_value(), kinds(), total_units(), group_of(res), tab_ids(), owned_tool_ids(),
## visible_tool_ids() — so the UI-wiring test can verify tabs + search + the ledger math
## without rendering.

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

## C1 — category tabs (React PRIMARY_FILTERS parity, minus the un-backed "Items" tab).
## The active tab filters the body to a kind: All shows resources + tools, Resources shows
## the grouped resource ledger, Tools shows owned tool charges. "all" is the default so
## setup()+open() renders the full ledger the existing view tests inspect.
const TAB_ALL := "all"
const TAB_RESOURCES := "resources"
const TAB_TOOLS := "tools"
## Tab id → display label, in render order. Drives both the tab row build + tab_ids().
const TAB_DEFS: Array = [
	[TAB_ALL, "All"],
	[TAB_RESOURCES, "Resources"],
	[TAB_TOOLS, "Tools"],
]
var _tab: String = TAB_ALL
## tab id → segmented toggle Button. Built once in the shell; registered for headless tests.
var _tab_buttons: Dictionary = {}

# ── group membership (per the Constants production families) ───────────────────
# Ordered group definitions: each is [display name, Array of resource keys]. A
# resource not in any of these lands in the trailing "Other" group so the ledger
# NEVER silently drops an owned good. Mirrors the CLAUDE-listed port resources:
#   Farm:    hay_bundle, flour, eggs, soup, pie, honey, plank, meat, milk, horseshoe
#   Refined: bread, supplies
#   Mine:    block, iron_bar, coke, cut_gem, dirt
const GROUP_FARM := "Farm Goods"
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

	# Opaque VIEW background (not a dim modal scrim). The Inventory ledger is one of the
	# five persistent bottom-nav VIEWS, so it paints the warm app-frame parchment over the
	# board — reading as a view, not a hole in darkness. It reserves UiKit.TOPBAR_RESERVE at
	# the TOP so the persistent layer-1 HUD top bar (settlement title + pills + ☰ menu) shows
	# ABOVE the view, and stops UiKit.NAV_RESERVE short of the bottom so the persistent nav bar
	# (a LOWER CanvasLayer) shows through + stays tappable; MOUSE_FILTER_STOP eats clicks in
	# the band it covers.
	var backdrop := ColorRect.new()
	backdrop.color = Palette.FRAME_BG
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.offset_top = UiKit.TOPBAR_RESERVE   # reveal the persistent HUD top bar above
	backdrop.offset_bottom = -UiKit.NAV_RESERVE  # leave the bottom nav strip unpainted
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-bleed view content: a full-rect Control holds a panel pinned edge-to-edge (no card
	# margins), reserving the top-bar band + bottom-nav strip; a width-cap MarginContainer
	# keeps line length tidy on wide viewports (the web caps it too).
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
	# shadow, so it reads as a full-brightness page under the persistent top bar.
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
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

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 14)
	scroll.add_child(root_vbox)

	# Title row: "📦 Inventory" heading spanning the row. The visible "✕ Close" is GONE — a
	# primary nav VIEW is left via the bottom nav / ESC-back, not a card close button. A
	# non-rendered close Button is still created + wired below so ESC/back, the "board"
	# deep-link, and the headless tests (which press _action_buttons["close"]) keep working.
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

	# Hidden close affordance — created + wired but NOT added to the visible row, so it never
	# renders yet still backs ESC/back, apply_deeplink("board"), and the close-button tests.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# C1 — category tab row (React PRIMARY_FILTERS parity). A tight HBox of segmented
	# toggles (the same UiKit.style_segment look TownsfolkScreen uses): All | Resources |
	# Tools. Selecting a tab re-renders the body filtered to that kind. "All" is active by
	# default. Each button is registered in _tab_buttons for the headless tab-switch test.
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	for def in TAB_DEFS:
		var tab_id: String = String(def[0])
		var tab_btn := Button.new()
		tab_btn.text = String(def[1])
		tab_btn.add_theme_font_size_override("font_size", 16)
		tab_btn.connect("pressed", Callable(self, "_on_tab").bind(tab_id))
		tab_row.add_child(tab_btn)
		_tab_buttons[tab_id] = tab_btn

	# M5-polish — a search field that filters the ledger rows by name (case-insensitive
	# substring). Sits between the title and the grouped body. Typing re-renders the body
	# live; clearing it restores the full grouped ledger. Styled like the parchment row chips.
	_search_field = LineEdit.new()
	_search_field.placeholder_text = "Search inventory…"
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

## Clear the body and repopulate it for the active tab (synced first so the segmented
## toggle reflects `_tab`). The Resources + All tabs render the grouped resource ledger
## (+ owned tools on All); the Tools tab renders owned tool charges. The live search
## query filters within whichever tab is active. Read-only — only Close acts (and hides),
## so the plain queue_free of the previous body is safe (never mid-emit of a body control).
func refresh() -> void:
	if not _built or game == null:
		return
	_sync_tabs()
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()

	if _tab == TAB_TOOLS:
		_render_tools_tab()
	else:
		# All + Resources both render the grouped resource ledger; All ALSO appends owned
		# tools below it so it's a true "everything owned" view.
		_render_resources_tab(_tab == TAB_ALL)

## RESOURCES / ALL tab — the grouped resource ledger. Each non-empty group (after the live
## search) is a section (header + a row per owned resource), then a stockpile-value footer.
## When `include_tools` (the All tab) any owned tools are appended as their own section so
## All reads as "everything owned". Empty-state messaging distinguishes a genuinely empty
## stockpile from "nothing matches your search".
func _render_resources_tab(include_tools: bool) -> void:
	var grouped: Dictionary = _grouped_owned()
	var any_resource_shown: bool = false
	var any_resource_owned: bool = false
	for group_name in GROUP_ORDER:
		var keys: Array = grouped.get(group_name, [])
		if not keys.is_empty():
			any_resource_owned = true
		var shown: Array = _apply_query(keys)
		if shown.is_empty():
			continue
		any_resource_shown = true
		_build_group_section(group_name, shown)

	# On All, append owned tools (search-filtered) as a trailing "Tools" section.
	var tool_ids: Array = visible_tool_ids() if include_tools else []
	var any_tool_owned: bool = (not owned_tool_ids().is_empty()) if include_tools else false
	if not tool_ids.is_empty():
		_build_tool_section(tool_ids)

	if not any_resource_shown and tool_ids.is_empty():
		# Nothing rendered — say WHY (empty stockpile vs no search match).
		var any_owned: bool = any_resource_owned or any_tool_owned
		if any_owned and _query != "":
			_body.add_child(_make_label("No items match '%s'." % _query, COL_MUTED))
		else:
			_body.add_child(_make_label(
				"Your stockpile is empty — chain tiles to gather goods.", COL_MUTED))
		return

	# The value footer reflects the resource stockpile (tools have no Market value); only
	# show it when at least one resource row rendered, so a tools-only All view skips it.
	if any_resource_shown:
		_build_footer()

## TOOLS tab — owned tools (GameState.tools, charges > 0) after the live search. A header +
## a row per tool (icon · name · ×charges). Empty state: "No tools yet" (genuinely none) or
## "No tools match '<q>'" (filtered out). REAL data: counts from game.tool_count, labels
## from ToolConfig (known ids) else pretty_name (e.g. a summoned magic tool).
func _render_tools_tab() -> void:
	var owned: Array = owned_tool_ids()
	var shown: Array = visible_tool_ids()
	if shown.is_empty():
		if not owned.is_empty() and _query != "":
			_body.add_child(_make_label("No tools match '%s'." % _query, COL_MUTED))
		else:
			_body.add_child(_make_label("No tools yet — earn them from quests and rewards.", COL_MUTED))
		return
	_build_tool_section(shown)
	# A muted "N tools · M charges" footer, mirroring the resource ledger's subline.
	var charges: int = 0
	for id in shown:
		charges += game.tool_count(String(id))
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.9)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)
	var subline := _make_label(
		"%d tool%s · %d charge%s" % [shown.size(), "" if shown.size() == 1 else "s",
			charges, "" if charges == 1 else "s"], COL_MUTED)
	subline.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_body.add_child(subline)

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

	# Icon — the same procedural art React shows, when we have it (text-only keys skip).
	var icon := UiKit.make_icon(res, 34.0)
	if icon != null:
		row.add_child(icon)

	# Name — title-cased ("hay_bundle" → "Hay Bundle"), expands to push count + value right.
	var name_lbl := _make_label(UiKit.pretty_name(res), COL_BODY)
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

# ── Tools section (C1) ──────────────────────────────────────────────────────────

## Build the "Tools" section: an ember Cinzel header (matching the resource group headers),
## then a row per owned tool id (already ordered + search-filtered by the caller).
func _build_tool_section(tool_ids: Array) -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var header := Label.new()
	header.text = "Tools"
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	_body.add_child(header)

	for id in tool_ids:
		_body.add_child(_make_tool_row(String(id)))

## A single tool row — the same chip layout as a resource row: a soft-parchment chip with
## icon · name · ×charges. Tools carry no Market value, so there is no value column (a tool
## is consumed on use, not sold). Name uses the ToolConfig label for known ids, else the
## title-cased key (e.g. a summoned magic tool not in the ToolConfig catalog).
func _make_tool_row(id: String) -> PanelContainer:
	var charges: int = game.tool_count(id)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	chip.add_child(row)

	# Icon — the procedural tool art exported to assets/resources/<id>.png (bomb, scythe, …).
	var icon := UiKit.make_icon(id, 34.0)
	if icon != null:
		row.add_child(icon)

	# Name — ToolConfig label for a known tool, else the title-cased key.
	var name_lbl := _make_label(_tool_name(id), COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	# Charges — prominent ink, right-aligned (mirrors the resource count column).
	var count_lbl := Label.new()
	count_lbl.text = "×%d" % charges
	count_lbl.add_theme_font_size_override("font_size", 20)
	count_lbl.add_theme_color_override("font_color", COL_BODY)
	count_lbl.custom_minimum_size = Vector2(64, 0)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count_lbl)

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
## body so the filter applies live (within the active tab). Wired to the LineEdit's
## `text_changed` signal.
func _on_search_changed(text: String) -> void:
	_query = text.strip_edges().to_lower()
	refresh()

# ── tab switching (C1) ──────────────────────────────────────────────────────────

## A tab button was pressed — switch the active tab (no-op when already active) and
## re-render the body filtered to that kind. The search query persists across tabs.
func _on_tab(tab: String) -> void:
	if tab == _tab:
		return
	_tab = tab
	refresh()

## Re-apply the segmented-toggle look so the active tab reads as "you are here". Called at
## the top of every refresh() so the visual state always matches `_tab`.
func _sync_tabs() -> void:
	for key in _tab_buttons.keys():
		UiKit.style_segment(_tab_buttons[key], String(key) == _tab)

## Switch the active tab programmatically (headless tests + deep-links). Unknown ids are
## ignored. Re-renders only when the tab actually changes.
func set_tab(tab: String) -> void:
	_on_tab(tab)

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

# ── tabs + tools (pure helpers — usable + testable without rendering) ──────────

## The tab ids in render order ("all", "resources", "tools"). Drives the tab row build and
## is the headless contract for "which tabs exist" (the Items tab is intentionally absent —
## the port has no item kind that lands in inventory; see the header).
func tab_ids() -> Array:
	var out: Array = []
	for def in TAB_DEFS:
		out.append(String(def[0]))
	return out

## Display name for a tool id: the ToolConfig label for a known tool ("bomb" → "Bomb"), else
## the title-cased key (covers a summoned magic tool not in the ToolConfig catalog).
func _tool_name(id: String) -> String:
	if ToolConfig.has_tool(id):
		return ToolConfig.tool_label(id)
	return UiKit.pretty_name(id)

## Every owned tool id (charges > 0), in a stable order: known ToolConfig ids first (catalog
## order), then any extra owned ids (e.g. summoned magic tools) sorted, so nothing owned is
## dropped. REAL data straight from game.tools via tool_count.
func owned_tool_ids() -> Array:
	var out: Array = []
	if game == null:
		return out
	for id in ToolConfig.TOOL_IDS:
		if game.tool_count(String(id)) > 0:
			out.append(String(id))
	var extra: Array = []
	for key in game.tools:
		var id := String(key)
		if int(game.tools[key]) > 0 and not out.has(id):
			extra.append(id)
	extra.sort()
	out.append_array(extra)
	return out

## Owned tools filtered by the live search query — matched against BOTH the raw id and the
## display name so "stone" finds "Stone Hammer". The Array the Tools tab + All section render.
func visible_tool_ids() -> Array:
	var out: Array = []
	for id in owned_tool_ids():
		var sid := String(id)
		if matches_query(sid, _query) or matches_query(_tool_name(sid), _query):
			out.append(sid)
	return out

# ── ledger math (pure helpers — usable + testable without rendering) ───────────

## Which group a resource belongs to: "Farm Goods" / "Refined" / "Mine" for the
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
