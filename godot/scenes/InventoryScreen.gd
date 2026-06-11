class_name InventoryScreen
extends CanvasLayer
## M4g / C1 — the dedicated Inventory VIEW. The original game has a full Inventory view;
## the port started with a cramped HUD stockpile strip, then a roomy read-only ledger,
## and this (C1) brings it closer to the React reference (src/features/inventory/index.tsx):
## a CATEGORY TAB BAR (All / Resources / Tools) over the body, a live name SEARCH, and the
## familiar grouped ledger (Farm goods / Refined / Mine / Other) with counts + Market value.
##
## TABS (React parity, honestly mapped to what the port actually has):
##   • All       — everything owned: the grouped resource ledger PLUS owned tools PLUS items.
##   • Resources — the grouped resource ledger only (GameState.inventory counts).
##   • Tools     — owned tools (GameState.tools, charges > 0): icon + name + ×count.
##   • Items     — the port's special valuables that are NEITHER a resource family NOR a tool:
##                 Runes (🔮 — the harbor's premium giant-pearl reward, also granted by Almanac
##                 tiers) and Influence (◈ — the portal-magic currency earned from decorations).
##                 These are real, non-faked GameState scalar counters (game.runes / game.influence),
##                 the port's analogue of React's INVENTORY_TAGS.ITEM (kind:"item") entries. Shown
##                 only when held (> 0); the tab reads its empty state otherwise. This is NOT a fake:
##                 it surfaces existing player-facing valuables that previously had no inventory home.
##
## VIEW TOGGLE (React header ⊞/≣): the body renders as a LIST (grouped ledger rows, the default)
## or a GRID (compact icon+count chips, 3 columns). The ⊞ toggle in the title row flips it; the
## chosen mode persists across tabs. The grid view mirrors React's grid inventory layout.
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
## stable key "close" (emits `closed`); the view toggle is `_action_buttons["view_toggle"]`;
## the tab buttons are registered in `_tab_buttons` keyed by tab id
## ("all"/"resources"/"tools"/"items"); the screen exposes pure compute helpers —
## total_value(), kinds(), total_units(), group_of(res), tab_ids(), owned_tool_ids(),
## visible_tool_ids(), item_ids(), visible_item_ids(), view_mode() ("list"/"grid") — so the
## UI-wiring test can verify tabs + search + the view toggle + the ledger math without rendering.

var game: GameState

signal closed
## Emitted after an expanded row's Sell/Buy mutated GameState (coins + inventory moved),
## so Main can refresh the HUD pills + save — the same contract TownScreen uses.
signal state_changed

## action id → Button, for headless tests. Static: "close", "view_toggle". While a row is
## expanded its actions register as "sell:<key>" / "buy:<key>" (dropped on re-render).
var _action_buttons: Dictionary = {}

## C2 — expand-in-place (React InventoryListItemExpanded parity): the entry key of the one
## expanded ledger row ("" = none). Keys are namespaced "res:<key>" / "tool:<id>" / "item:<id>"
## so a resource and a tool sharing a name can't collide. Tapping a row toggles it; tapping
## another row moves the expansion; the expansion survives refresh() (e.g. after a Sell).
var _expanded: String = ""

## entry_key → the rendered expandable-chip PanelContainer for the active list view, rebuilt each
## refresh(). Lets toggle_expand animate the expand/collapse IN PLACE (rebuild only the two affected
## rows) instead of refreshing the whole list — the same shared motion the crafting screen uses.
var _cards: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest inventory.
var _body: VBoxContainer
var _built: bool = false

## M5-polish — the live search query (lower-cased substring filter over resource names).
## Empty string ("") means "no filter" — the full grouped ledger shows. The LineEdit at the
## top of the card drives this via _on_search_changed; refresh() re-reads it each render.
var _query: String = ""
var _search_field: LineEdit             ## the search input (registered for headless tests)

## C1 — category tabs (React PRIMARY_FILTERS parity). The active tab filters the body to a
## kind: All shows resources + tools + items, Resources shows the grouped resource ledger,
## Tools shows owned tool charges, Items shows the special valuables (runes / influence).
## "all" is the default so setup()+open() renders the full ledger the existing view tests inspect.
const TAB_ALL := "all"
const TAB_RESOURCES := "resources"
const TAB_TOOLS := "tools"
const TAB_ITEMS := "items"
## Tab id → display label, in render order. Drives both the tab row build + tab_ids().
const TAB_DEFS: Array = [
	[TAB_ALL, "All"],
	[TAB_RESOURCES, "Resources"],
	[TAB_TOOLS, "Tools"],
	[TAB_ITEMS, "Items"],
]
var _tab: String = TAB_ALL
## tab id → segmented toggle Button. Built once in the shell; registered for headless tests.
var _tab_buttons: Dictionary = {}

## C1+ — body view mode: "list" (grouped ledger rows, default) or "grid" (compact icon+count
## chips). The ⊞ toggle in the title row flips it; persists across tab switches. Mirrors React's
## list/grid inventory header toggle.
const VIEW_LIST := "list"
const VIEW_GRID := "grid"
var _view: String = VIEW_LIST
var _view_btn: Button                   ## the ⊞/≣ view-toggle Button (registered for tests)

## Columns in the grid view. The expanded grid detail spans a full row of this many cells.
const GRID_COLS := 3

## The port's special "Items" — non-resource, non-tool valuables surfaced as inventory items.
## REAL GameState scalar counters; nothing invented. ITEM_IDS is the stable id list + render order;
## the glyph + label for each are DERIVED from the ResourceConfig kind:"item" rows (the single
## source of truth — was a hardcoded [id, glyph, label] literal here). item_count() still binds each
## id to its GameState scalar field (game.runes / game.influence) — that's logic, not metadata.
const ITEM_IDS: Array = ["runes", "influence"]

## The rendered [id, glyph, label] rows, populated from ResourceConfig in ITEM_IDS order. A
## function (not a const) because the metadata now lives in the catalog. Callers + the headless
## item tests iterate this exactly as they did the old ITEM_DEFS const.
func _item_defs() -> Array:
	var out: Array = []
	for id in ITEM_IDS:
		out.append([id, ResourceConfig.glyph(id), ResourceConfig.label(id)])
	return out

# ── group membership (derived from ResourceConfig.family) ───────────────────────
# Each owned resource is bucketed into one of these four ledger sections by its
# ResourceConfig family id ("farm"/"refined"/"mine"/"other"). A resource whose family is
# unknown (or "other") lands in the trailing "Other" group so the ledger NEVER silently
# drops an owned good. The catalog reproduces today's exact grouping, with ONE deliberate
# reconciliation: `jam` is family "farm" (it was in the Hud STOCKPILE_ROSTER but missing
# from the old hardcoded FARM list, so it used to fall into "Other"). See ResourceConfig.gd.
const GROUP_FARM := "Farm Goods"
const GROUP_REFINED := "Refined"
const GROUP_MINE := "Mine"
const GROUP_OTHER := "Other"

## ResourceConfig family id → display group name. Anything not here (incl. ResourceConfig
## FAMILY_OTHER and any uncatalogued key) maps to GROUP_OTHER via group_of().
const FAMILY_TO_GROUP: Dictionary = {
	ResourceConfig.FAMILY_FARM: GROUP_FARM,
	ResourceConfig.FAMILY_REFINED: GROUP_REFINED,
	ResourceConfig.FAMILY_MINE: GROUP_MINE,
}

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
	# the TOP so the persistent layer-1 HUD top bar (settlement title + pills + ⚙ menu) shows
	# ABOVE the view, and stops UiKit.NAV_RESERVE short of the bottom so the persistent nav bar
	# (a LOWER CanvasLayer) shows through + stays tappable; MOUSE_FILTER_STOP eats clicks in
	# the band it covers.
	var backdrop := UiKit.make_view_backdrop()
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

	# Hidden close affordance — wired but not rendered; backs ESC/back, apply_deeplink("board"),
	# and the headless tests (which press _action_buttons["close"]). The view title is now shown
	# in the persistent HUD top bar (set_nav_title("Inventory")) so no in-page heading is needed.
	var close_btn := Button.new()
	close_btn.visible = false
	close_btn.connect("pressed", Callable(self, "close"))
	_action_buttons["close"] = close_btn

	# C1 — category tab row (React PRIMARY_FILTERS parity): scrollable tabs on the left,
	# the ⊞/≣ view toggle pinned to the far right. Tabs can swipe-scroll; the toggle is fixed.
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	var tab_scroll := ScrollContainer.new()
	tab_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	tab_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	tab_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_child(tab_scroll)

	var tab_inner := HBoxContainer.new()
	tab_inner.add_theme_constant_override("separation", 6)
	tab_scroll.add_child(tab_inner)

	for def in TAB_DEFS:
		var tab_id: String = String(def[0])
		var tab_btn := Button.new()
		tab_btn.text = String(def[1])
		UiKit.set_font_size(tab_btn, Typography.Role.SUBHEAD)
		tab_btn.connect("pressed", Callable(self, "_on_tab").bind(tab_id))
		tab_inner.add_child(tab_btn)
		_tab_buttons[tab_id] = tab_btn

	# View toggle — pinned to the right of the tab row, always visible.
	_view_btn = Button.new()
	_view_btn.text = "⊞ Grid"
	_view_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(_view_btn, Palette.EMBER, 6, 16)
	_view_btn.connect("pressed", Callable(self, "_on_view_toggle"))
	tab_row.add_child(_view_btn)
	_action_buttons["view_toggle"] = _view_btn

	# M5-polish — a search field that filters the ledger rows by name (case-insensitive
	# substring). Sits between the title and the grouped body. Typing re-renders the body
	# live; clearing it restores the full grouped ledger. Styled like the parchment row chips.
	_search_field = LineEdit.new()
	_search_field.placeholder_text = "Search inventory…"
	_search_field.clear_button_enabled = true
	_search_field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.set_font_size(_search_field, Typography.Role.SUBHEAD)
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

	# Auto-refresh on window resize to update grid columns
	tree_entered.connect(func() -> void:
		get_viewport().size_changed.connect(func() -> void:
			if visible:
				refresh()
		)
	)

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
	# Drop the per-render expanded-row action keys so tests/handlers never see a freed node.
	for k in _action_buttons.keys():
		if String(k).begins_with("sell:") or String(k).begins_with("buy:"):
			_action_buttons.erase(k)
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_cards.clear()

	if _view == VIEW_GRID:
		_render_grid()
		return
	if _tab == TAB_TOOLS:
		_render_tools_tab()
	elif _tab == TAB_ITEMS:
		_render_items_tab()
	else:
		# All + Resources both render the grouped resource ledger; All ALSO appends owned
		# tools + items below it so it's a true "everything owned" view.
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

	# On All, append owned tools + items (search-filtered) as trailing sections.
	var tool_ids: Array = visible_tool_ids() if include_tools else []
	var any_tool_owned: bool = (not owned_tool_ids().is_empty()) if include_tools else false
	if not tool_ids.is_empty():
		_build_tool_section(tool_ids)
	var item_ids_shown: Array = visible_item_ids() if include_tools else []
	var any_item_owned: bool = (not item_ids().is_empty()) if include_tools else false
	if not item_ids_shown.is_empty():
		_build_item_section(item_ids_shown)

	if not any_resource_shown and tool_ids.is_empty() and item_ids_shown.is_empty():
		# Nothing rendered — say WHY (empty stockpile vs no search match).
		var any_owned: bool = any_resource_owned or any_tool_owned or any_item_owned
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

## ITEMS tab — the special valuables (runes / influence) the player holds, after the live
## search. A header + a row per held item (glyph · name · ×count). Empty state distinguishes
## "none held yet" from "filtered out". REAL data: game.runes / game.influence scalar counters.
func _render_items_tab() -> void:
	var held: Array = item_ids()
	var shown: Array = visible_item_ids()
	if shown.is_empty():
		if not held.is_empty() and _query != "":
			_body.add_child(_make_label("No items match '%s'." % _query, COL_MUTED))
		else:
			_body.add_child(_make_label(
				"No special items yet — capture a giant pearl for a Rune, or raise Influence with decorations.",
				COL_MUTED))
		return
	_build_item_section(shown)

## GRID view — a GRID_COLS-wide grid of compact icon+count chips for whatever the active tab covers
## (resources / tools / items / all). Mirrors React's grid inventory layout. Empty → the same muted
## hint the list view shows.
##
## Built as a VBox of GRID_COLS-wide HBox rows (not a single GridContainer) so the expanded chip's
## detail can drop in as a full-width card BETWEEN rows — a GridContainer cell can't span columns,
## and we never want to shift the surrounding chips. The tapped chip keeps its cell; its detail
## unfolds full-width directly beneath its row, with an ▲ over the origin column.
func _render_grid() -> void:
	var entries: Array = _grid_entries()
	if entries.is_empty():
		var msg := "Your stockpile is empty — chain tiles to gather goods."
		if _query != "":
			msg = "No items match '%s'." % _query
		_body.add_child(_make_label(msg, COL_MUTED))
		return

	var rows_box := VBoxContainer.new()
	rows_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rows_box.add_theme_constant_override("separation", 8)
	rows_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(rows_box)

	var n: int = entries.size()
	var i: int = 0
	while i < n:
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation", 8)
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		rows_box.add_child(row)

		var expanded_col: int = -1
		var expanded_key: String = ""
		for c in range(GRID_COLS):
			var idx: int = i + c
			if idx < n:
				var entry: Dictionary = entries[idx] as Dictionary
				var entry_key: String = String(entry.get("entry_key", ""))
				var chip := _make_grid_chip(entry)
				row.add_child(chip)
				_cards[entry_key] = chip
				if entry_key != "" and entry_key == _expanded:
					expanded_col = c
					expanded_key = entry_key
			else:
				# Empty filler so a short trailing row keeps its cells at the grid width (no stretch).
				var filler := Control.new()
				filler.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				filler.mouse_filter = Control.MOUSE_FILTER_IGNORE
				row.add_child(filler)

		if expanded_col != -1:
			rows_box.add_child(_make_grid_detail(expanded_key, expanded_col))

		i += GRID_COLS

## The full-width inline detail card shown below the grid row holding the expanded entry. An ember
## ▲ sits over the originating column so the card visibly points back at which grid chip was tapped.
## Reuses _populate_details_for_key, so the card reads the same live state (description + Sell/Buy)
## and registers the same action keys as the list view's expanded row.
func _make_grid_detail(entry_key: String, origin_col: int) -> VBoxContainer:
	var wrap := VBoxContainer.new()
	wrap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	wrap.add_theme_constant_override("separation", 0)
	wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Arrow row: GRID_COLS cells matching the grid above (same separation), ▲ centred in origin_col.
	var arrow_row := HBoxContainer.new()
	arrow_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arrow_row.add_theme_constant_override("separation", 8)
	arrow_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for c in range(GRID_COLS):
		if c == origin_col:
			var arrow := Label.new()
			arrow.text = "▲"
			arrow.add_theme_font_size_override("font_size", 18)
			arrow.add_theme_color_override("font_color", Palette.EMBER)
			arrow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			arrow.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
			arrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
			arrow_row.add_child(arrow)
		else:
			var cell := Control.new()
			cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
			arrow_row.add_child(cell)
	wrap.add_child(arrow_row)

	# Ember-bordered detail panel (the "expanded" accent), full width — never shifts the grid.
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	UiKit.style_chip_expanded(panel, true)
	wrap.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 8)
	panel.add_child(col)

	var details := VBoxContainer.new()
	details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	details.mouse_filter = Control.MOUSE_FILTER_IGNORE
	details.add_theme_constant_override("separation", 6)
	col.add_child(details)
	_populate_details_for_key(details, entry_key)

	return wrap

## The chips the grid view shows for the active tab, each {key, entry_key, glyph, label, count}.
## `entry_key` is the namespaced expand key ("res:"/"tool:"/"item:") so a grid chip toggles the
## same expansion the list rows use. Resources come from the owned (search-filtered) ledger; tools
## from visible_tool_ids; items from visible_item_ids; All concatenates all three. Drives
## _render_grid + the grid headless test.
func _grid_entries() -> Array:
	var out: Array = []
	var want_res: bool = _tab == TAB_ALL or _tab == TAB_RESOURCES
	var want_tools: bool = _tab == TAB_ALL or _tab == TAB_TOOLS
	var want_items: bool = _tab == TAB_ALL or _tab == TAB_ITEMS
	if want_res:
		var res_keys: Array = []
		if game != null:
			for key in game.inventory:
				if int(game.inventory[key]) > 0 and matches_query(String(key), _query):
					res_keys.append(String(key))
		res_keys.sort()
		for res in res_keys:
			out.append({"key": res, "entry_key": "res:" + String(res), "glyph": "",
				"label": UiKit.pretty_name(res), "count": game.qty(String(res))})
	if want_tools:
		for id in visible_tool_ids():
			out.append({"key": id, "entry_key": "tool:" + String(id), "glyph": "",
				"label": _tool_name(String(id)), "count": game.tool_count(String(id))})
	if want_items:
		for entry in _item_defs():
			var id: String = String(entry[0])
			if not visible_item_ids().has(id):
				continue
			out.append({"key": id, "entry_key": "item:" + id, "glyph": String(entry[1]),
				"label": String(entry[2]), "count": item_count(id)})
	return out

## A compact grid chip: a soft-parchment cell with the icon (or glyph) above a "name ×count"
## line. Tapping it expands the entry in place (a full-width detail card drops in below the chip's
## grid row); the chip shows the ember "expanded" border when it is the open entry.
func _make_grid_chip(entry: Dictionary) -> PanelContainer:
	var entry_key: String = String(entry.get("entry_key", ""))
	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_STOP
	UiKit.style_chip_expanded(chip, entry_key != "" and entry_key == _expanded)
	if entry_key != "":
		chip.gui_input.connect(func(event: InputEvent) -> void:
			var tap: bool = (event is InputEventMouseButton \
				and (event as InputEventMouseButton).button_index == MOUSE_BUTTON_LEFT \
				and (event as InputEventMouseButton).pressed) \
				or (event is InputEventScreenTouch and (event as InputEventScreenTouch).pressed)
			if tap:
				toggle_expand(entry_key)
		)
	# review-4 — share the row width across the columns. Without EXPAND_FILL each chip
	# collapses to its icon's minimum width and the autowrapped name label breaks words
	# mid-glyph ("Bomb" → "Bom/b", "Scythe" → "Scyth/e").
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 2)
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_child(col)

	var icon := UiKit.make_icon(String(entry.get("key", "")), 36.0)
	if icon != null:
		var holder := CenterContainer.new()
		holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(icon)
		col.add_child(holder)
	elif String(entry.get("glyph", "")) != "":
		var glyph := Label.new()
		glyph.text = String(entry["glyph"])
		UiKit.set_font_size(glyph, Typography.Role.TITLE)
		glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		col.add_child(glyph)

	var name_lbl := Label.new()
	name_lbl.text = String(entry.get("label", ""))
	UiKit.set_font_size(name_lbl, Typography.Role.BODY)
	name_lbl.add_theme_color_override("font_color", COL_BODY)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	var count_lbl := Label.new()
	count_lbl.text = "×%d" % int(entry.get("count", 0))
	UiKit.set_font_size(count_lbl, Typography.Role.SUBHEAD)
	count_lbl.add_theme_color_override("font_color", COL_VALUE)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(count_lbl)
	return chip

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
	UiKit.set_font_size(header, Typography.Role.HEADING)
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
## C2 — tapping the chip EXPANDS it in place (React InventoryListItemExpanded): a details
## section (kind · description · Sell/Buy actions) slides open under the row.
func _make_resource_row(res: String) -> PanelContainer:
	var count: int = game.qty(res)
	var entry_key: String = "res:" + res

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	chip.mouse_filter = Control.MOUSE_FILTER_STOP

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 8)
	chip.add_child(col)
	_cards[entry_key] = chip

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	col.add_child(row)

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
	UiKit.set_font_size(count_lbl, Typography.Role.SUBHEAD)
	count_lbl.add_theme_color_override("font_color", COL_BODY)
	count_lbl.custom_minimum_size = Vector2(64, 0)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count_lbl)

	# Value — sell-each + the line value (count × sell), gold. Sellable goods only.
	var value_lbl := Label.new()
	UiKit.set_font_size(value_lbl, Typography.Role.SUBHEAD)
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

	# Expanded details — kind eyebrow, the catalog description, and real Sell/Buy actions
	# (the same GameState.sell/buy the Town Market uses; prices are the live drifted ones).
	var details := UiKit.begin_expand_details(col)
	_populate_resource_details(details, res)

	return chip

## Fill an expanded resource entry's details VBox: the group eyebrow, catalog description, and the
## real Sell/Buy actions (live drifted prices). Shared by the list row's inline expand AND the grid
## view's full-width detail card, so both read the same live state and register the same
## "sell:<res>" / "buy:<res>" action keys (the headless contract).
func _populate_resource_details(details: VBoxContainer, res: String) -> void:
	var count: int = game.qty(res)
	UiKit.add_expand_eyebrow(details, "Resource · %s" % group_of(res), COL_HEADER)
	var desc: String = ResourceConfig.desc(res)
	if desc != "":
		details.add_child(UiKit.make_expand_body_text(desc, COL_MUTED))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	details.add_child(actions)
	if MarketConfig.can_sell(res):
		var sell_btn := Button.new()
		sell_btn.text = "Sell 1 · +%d🪙" % game.live_sell_price(res)
		UiKit.style_action_button(sell_btn, Palette.MOSS, 6, Typography.size(Typography.Role.LABEL))
		sell_btn.disabled = count <= 0
		sell_btn.connect("pressed", Callable(self, "_on_sell").bind(res))
		actions.add_child(sell_btn)
		_action_buttons["sell:" + res] = sell_btn
	if MarketConfig.can_buy(res):
		var buy_btn := Button.new()
		var price: int = game.live_buy_price(res)
		buy_btn.text = "Buy 1 · %d🪙" % price
		UiKit.style_action_button(buy_btn, Palette.GOLD, 6, Typography.size(Typography.Role.LABEL))
		buy_btn.disabled = game.coins < price
		buy_btn.connect("pressed", Callable(self, "_on_buy").bind(res))
		actions.add_child(buy_btn)
		_action_buttons["buy:" + res] = buy_btn
	if actions.get_child_count() == 0:
		actions.queue_free()
		details.add_child(UiKit.make_expand_body_text("Not traded at the Market.", COL_MUTED))

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
	UiKit.set_font_size(header, Typography.Role.HEADING)
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
## C2 — tapping expands in place to show the tool's catalog description + a usage hint.
func _make_tool_row(id: String) -> PanelContainer:
	var charges: int = game.tool_count(id)
	var entry_key: String = "tool:" + id

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	chip.mouse_filter = Control.MOUSE_FILTER_STOP

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 8)
	chip.add_child(col)
	_cards[entry_key] = chip

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	col.add_child(row)

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
	UiKit.set_font_size(count_lbl, Typography.Role.SUBHEAD)
	count_lbl.add_theme_color_override("font_color", COL_BODY)
	count_lbl.custom_minimum_size = Vector2(64, 0)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count_lbl)

	# Expanded details — the tool's catalog description + where it's used.
	var details := UiKit.begin_expand_details(col)
	_populate_tool_details(details, id)

	return chip

## Fill an expanded tool entry's details VBox: the "consumed on use" eyebrow, the catalog
## description, and the usage hint. Shared by the list row + the grid detail card.
func _populate_tool_details(details: VBoxContainer, id: String) -> void:
	UiKit.add_expand_eyebrow(details, "Tool · consumed on use", COL_HEADER)
	var desc: String = ToolConfig.tool_desc(id)
	if desc != "":
		details.add_child(UiKit.make_expand_body_text(desc, COL_MUTED))
	details.add_child(UiKit.make_expand_body_text("Use it from the tool bar above the board.", COL_MUTED))

# ── Items section (special valuables: runes / influence) ──────────────────────────

## Build the "Items" section: an ember Cinzel header, then a row per held special item
## (already search-filtered by the caller). Glyph · name · ×count — real GameState counters.
func _build_item_section(ids: Array) -> void:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	_body.add_child(rule)

	var header := Label.new()
	header.text = "Items"
	UiKit.set_font_size(header, Typography.Role.HEADING)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	_body.add_child(header)

	for id in ids:
		_body.add_child(_make_item_row(String(id)))

## A single special-item row: a soft-parchment chip with glyph · name · ×count. Items carry no
## Market value (a rune is spent in the Portal, not sold), so there is no value column.
## C2 — tapping expands in place to show the item's catalog description.
func _make_item_row(id: String) -> PanelContainer:
	var count: int = item_count(id)
	var def: Dictionary = _item_def(id)
	var entry_key: String = "item:" + id

	var chip := PanelContainer.new()
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	chip.mouse_filter = Control.MOUSE_FILTER_STOP

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 8)
	chip.add_child(col)
	_cards[entry_key] = chip

	var row := HBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 10)
	col.add_child(row)

	# Glyph badge (these items have no procedural PNG art — they're scalar valuables).
	var glyph := Label.new()
	glyph.text = String(def.get("glyph", "•"))
	UiKit.set_font_size(glyph, Typography.Role.TITLE)
	glyph.custom_minimum_size = Vector2(34, 34)
	glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(glyph)

	var name_lbl := _make_label(String(def.get("label", id)), COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	var count_lbl := Label.new()
	count_lbl.text = "×%d" % count
	UiKit.set_font_size(count_lbl, Typography.Role.SUBHEAD)
	count_lbl.add_theme_color_override("font_color", COL_BODY)
	count_lbl.custom_minimum_size = Vector2(64, 0)
	count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	count_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(count_lbl)

	# Expanded details — the valuable's catalog description (where it comes from / what
	# it's for). No actions: runes/influence are spent at their own surfaces, not sold.
	var details := UiKit.begin_expand_details(col)
	_populate_item_details(details, id)

	return chip

## Fill an expanded special-item entry's details VBox: the eyebrow + catalog description. No
## actions — runes/influence are spent at their own surfaces. Shared by the list row + grid card.
func _populate_item_details(details: VBoxContainer, id: String) -> void:
	UiKit.add_expand_eyebrow(details, "Special item", COL_HEADER)
	var desc: String = ResourceConfig.desc(id)
	if desc != "":
		details.add_child(UiKit.make_expand_body_text(desc, COL_MUTED))

## Fill `details` with the right per-kind content for a namespaced `entry_key`
## ("res:" / "tool:" / "item:"). Lets the grid detail card reuse the exact list-row detail bodies.
func _populate_details_for_key(details: VBoxContainer, entry_key: String) -> void:
	if entry_key.begins_with("res:"):
		_populate_resource_details(details, entry_key.substr(4))
	elif entry_key.begins_with("tool:"):
		_populate_tool_details(details, entry_key.substr(5))
	elif entry_key.begins_with("item:"):
		_populate_item_details(details, entry_key.substr(5))

## Toggle the expansion for `entry_key` ("res:flour" / "tool:bomb" / "item:runes"): tapping
## the expanded row collapses it, tapping another moves the expansion there. Public — the
## headless test drives it directly.
##
## In the LIST view this animates IN PLACE (the same shared motion the crafting screen uses): only
## the two affected rows change — the newly tapped row is rebuilt expanded and unrolls open while
## the previously open row rolls shut and drops its details. The GRID view rebuilds via refresh():
## the tapped chip stays put in its cell and a full-width detail card drops in below that grid row
## (so the surrounding chips never shift), with an ▲ over the origin column pointing at the chip.
func toggle_expand(entry_key: String) -> void:
	if not _built:
		return
	if _view != VIEW_GRID:
		# List view has all items expanded all of the time, so no-op.
		return
	_expanded = "" if _expanded == entry_key else entry_key
	refresh()

## Rebuild `entry_key`'s collapsed row as an EXPANDED one in place (so its summary + details read
## the live inventory/price state), swap the node at the same list position, then unroll the new
## details open. Falls back to a full refresh() if the row isn't currently rendered.
func _expand_row_inplace(entry_key: String) -> void:
	var old_chip: Variant = _cards.get(entry_key)
	if old_chip == null or not is_instance_valid(old_chip) or not (old_chip as Node).is_inside_tree():
		refresh()
		return
	var idx: int = (old_chip as Node).get_index()
	_body.remove_child(old_chip)
	(old_chip as Node).queue_free()
	var new_chip := _build_row_for_key(entry_key)
	if new_chip == null:
		refresh()
		return
	_body.add_child(new_chip)
	_body.move_child(new_chip, idx)
	var wrap: Variant = new_chip.get_meta("_details_wrap", null)
	if wrap != null:
		UiFx.expand_section(wrap as Control)

## Roll `entry_key`'s expanded row shut: recolour its border to the collapsed look and animate its
## details section closed, freeing it when the collapse finishes. The summary row stays put.
func _collapse_row_inplace(entry_key: String) -> void:
	var chip: Variant = _cards.get(entry_key)
	if chip == null or not is_instance_valid(chip):
		return
	UiKit.style_chip_expanded(chip as PanelContainer, false)
	var node := chip as Node
	if not node.has_meta("_details_wrap"):
		return
	var wrap: Variant = node.get_meta("_details_wrap")
	node.remove_meta("_details_wrap")
	if wrap == null or not is_instance_valid(wrap):
		return
	var w := wrap as Control
	UiFx.collapse_section(w, func() -> void:
		if is_instance_valid(w):
			w.queue_free())

## Build a fresh ledger row for a namespaced `entry_key`, dispatching to the right row builder by
## prefix ("res:" / "tool:" / "item:"). Used by the in-place expand to rebuild only the tapped row.
func _build_row_for_key(entry_key: String) -> PanelContainer:
	if entry_key.begins_with("res:"):
		return _make_resource_row(entry_key.substr(4))
	elif entry_key.begins_with("tool:"):
		return _make_tool_row(entry_key.substr(5))
	elif entry_key.begins_with("item:"):
		return _make_item_row(entry_key.substr(5))
	return null

## The currently expanded entry key ("" when none). Headless contract.
func expanded_key() -> String:
	return _expanded

## Sell 1 unit of `res` through the real Market path (live drifted price), then re-render —
## the row stays expanded so repeated sells are one tap each. Emits state_changed on success
## so Main refreshes the HUD coin pill + saves.
func _on_sell(res: String) -> void:
	var result: Dictionary = game.sell(res, 1)
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

## Buy 1 unit of `res` (live drifted price, cap-respecting) — mirror of _on_sell.
func _on_buy(res: String) -> void:
	var result: Dictionary = game.buy(res, 1)
	refresh()
	if bool(result.get("ok", false)):
		emit_signal("state_changed")

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
	UiKit.set_font_size(total, Typography.Role.HEADING)
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

# ── view toggle (list ↔ grid) ─────────────────────────────────────────────────────

## The ⊞/≣ view-toggle button was pressed — flip the body between list + grid and re-render.
func _on_view_toggle() -> void:
	_view = VIEW_GRID if _view == VIEW_LIST else VIEW_LIST
	if _view_btn != null:
		# The button labels the mode it will switch TO next, like React's toggle.
		_view_btn.text = "≣ List" if _view == VIEW_GRID else "⊞ Grid"
	refresh()

## Set the view mode programmatically (headless tests / deep-links). "list" | "grid".
func set_view(mode: String) -> void:
	if mode != VIEW_LIST and mode != VIEW_GRID:
		return
	if mode == _view:
		return
	_view = mode
	if _view_btn != null:
		_view_btn.text = "≣ List" if _view == VIEW_GRID else "⊞ Grid"
	refresh()

## The current body view mode ("list" | "grid"). Headless contract.
func view_mode() -> String:
	return _view

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

## The tab ids in render order ("all", "resources", "tools", "items"). Drives the tab row build
## and is the headless contract for "which tabs exist". The Items tab surfaces the port's real
## special valuables (runes / influence) — see the header.
func tab_ids() -> Array:
	var out: Array = []
	for def in TAB_DEFS:
		out.append(String(def[0]))
	return out

# ── items (special valuables — pure helpers) ──────────────────────────────────────

## The ITEM_DEFS row for `id`, or {glyph,label} fallbacks for an unknown id.
func _item_def(id: String) -> Dictionary:
	for entry in _item_defs():
		if String(entry[0]) == id:
			return {"glyph": String(entry[1]), "label": String(entry[2])}
	return {"glyph": "•", "label": UiKit.pretty_name(id)}

## The live count of special item `id` from the matching GameState scalar counter.
func item_count(id: String) -> int:
	if game == null:
		return 0
	match id:
		"runes":     return game.runes
		"influence": return game.influence
		_:           return 0

## Every special item id the player HOLDS (count > 0), in ITEM_DEFS order. REAL GameState data.
func item_ids() -> Array:
	var out: Array = []
	for entry in _item_defs():
		var id: String = String(entry[0])
		if item_count(id) > 0:
			out.append(id)
	return out

## Held special items filtered by the live search query — matched against the id AND the label.
func visible_item_ids() -> Array:
	var out: Array = []
	for id in item_ids():
		var def: Dictionary = _item_def(id)
		if matches_query(id, _query) or matches_query(String(def.get("label", id)), _query):
			out.append(id)
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

## Which group a resource belongs to: "Farm Goods" / "Refined" / "Mine" for the known
## production families (derived from ResourceConfig.family), else "Other" so nothing is ever
## dropped (covers ResourceConfig FAMILY_OTHER AND any uncatalogued key).
func group_of(res: String) -> String:
	return String(FAMILY_TO_GROUP.get(ResourceConfig.family(res), GROUP_OTHER))

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
	UiKit.set_font_size(lbl, Typography.Role.SUBHEAD)
	lbl.add_theme_color_override("font_color", color)
	lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return lbl
