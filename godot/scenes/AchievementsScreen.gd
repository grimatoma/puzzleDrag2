extends CanvasLayer
## M10 — the dedicated Achievements trophy screen. A read-only parchment modal over a
## warm scrim that renders the ENTIRE ported AchievementConfig catalog as a scrollable
## list of trophy rows, grouped into a few readable sections (Chains / Orders / Boss /
## Collections / Mine / Harvest). Each row shows an unlocked/locked icon, the name +
## description, a progress bar (current/threshold) toward the trophy, and its reward.
##
## Modelled EXACTLY on scenes/InventoryScreen.gd: `extends CanvasLayer`, a build-once
## static shell (`setup(g)` → `_build_shell()` once → `refresh()`), `open()` re-renders,
## a `closed` signal, and a close Button registered in `_action_buttons["close"]`. The
## same UiKit / Palette journal styling (parchment card, iron border, drop shadow, a
## Cinzel title via UiKit.heading_font(), section sub-headings, row chips, bar_box bars).
##
## NO class_name on purpose — Main preloads this script (preload(".../AchievementsScreen.gd"))
## so the port never needs an --import pass to register a new global. Pure read-only:
## the only actionable Control is "✖ Close"; everything else is MOUSE_FILTER_IGNORE.
##
## REAL DATA. The catalog comes from AchievementConfig.all(); per-row progress + the
## unlocked flag come straight from GameState (achievement_progress(counter) +
## achievements_unlocked). Nothing is faked or placeholder.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable
## key "close" (emits `closed`); the screen exposes pure helpers — unlocked_count(),
## total_count(), is_unlocked(id), row_progress(entry) — and tracks the rendered rows in
## `_rows` (one PanelContainer per catalog entry) so a test can assert the row count
## matches AchievementConfig.all().size() and that an unlocked row reads as unlocked.

var game: GameState

signal closed

## action id → Button, for headless tests. Currently just "close".
var _action_buttons: Dictionary = {}

## Static shell, built once in setup(); the body VBox is cleared + repopulated each
## refresh() so reopening always reflects the latest progress.
var _body: VBoxContainer
var _built: bool = false

## The header "N / total unlocked" line, rebuilt each refresh().
var _header_label: Label

## entry id:String → the rendered row PanelContainer, rebuilt each refresh(). Lets a
## test fetch a specific row (e.g. assert first_steps reads unlocked).
var _rows: Dictionary = {}

## Current tab: "trophies" (the catalog grid) | "collection" (the resource codex).
## Trophies is the default so setup()+open() renders the trophy rows the view test
## inspects via `_rows`.
var _tab: String = "trophies"

## "trophies" / "collection" → the segmented toggle Button. Built once in the shell.
var _tab_buttons: Dictionary = {}

# ── the two tabs (React parity: Trophies | Collection) ───────────────────────────
const TAB_TROPHIES := "trophies"
const TAB_COLLECTION := "collection"

# ── grouping (by the AchievementConfig counter families, for readable sections) ─
# Ordered [display name, Array of counters]. Any catalog counter not listed here lands
# in the trailing "More" group so the screen NEVER silently drops a trophy.
const GROUP_ORDER: Array = [
	["Chains",      ["chains_committed"]],
	["Orders",      ["orders_fulfilled"]],
	["Boss",        ["bosses_defeated"]],
	["Collections", ["distinct_resources_chained", "distinct_buildings_built"]],
	["Mine",        ["mine_chained"]],
	["Harvest",     ["veg_chained", "fruit_chained", "flower_chained", "herd_chained",
					 "cattle_chained", "mount_chained", "tree_chained"]],
]
const GROUP_MORE := "More"

# ── parchment palette (matches InventoryScreen / TownScreen journal tokens) ──────
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
	# shadow, so it reads as a full-brightness page under the persistent top bar. Unlike B1's
	# PRIMARY views, this menu sub-page KEEPS its visible "✖ Close" (the legitimate back-to-board
	# affordance — it's not a nav destination).
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL                   # Palette.PARCHMENT
	style.set_content_margin_all(20)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	# Keep the panel from sprawling on wide viewports.
	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	# A non-scrolling column: title row + header line pinned at the top, then a
	# ScrollContainer that owns the (potentially long) trophy list.
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "🏆 Achievements" heading + a right-aligned "✖ Close" button.
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "🏆 Achievements"
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

	# Tab row: a Trophies | Collection segmented toggle on the left, with the
	# "N / M unlocked" (or "discovered") count pushed to the right — mirroring React's
	# FeaturePanel.Tabs row (the count sits on `ml-auto`).
	var tab_row := HBoxContainer.new()
	tab_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_row.add_theme_constant_override("separation", 6)
	root_vbox.add_child(tab_row)

	var trophies_btn := Button.new()
	trophies_btn.text = "Trophies"
	trophies_btn.add_theme_font_size_override("font_size", 16)
	trophies_btn.connect("pressed", Callable(self, "_on_tab").bind(TAB_TROPHIES))
	tab_row.add_child(trophies_btn)
	_tab_buttons[TAB_TROPHIES] = trophies_btn

	var collection_btn := Button.new()
	collection_btn.text = "Collection"
	collection_btn.add_theme_font_size_override("font_size", 16)
	collection_btn.connect("pressed", Callable(self, "_on_tab").bind(TAB_COLLECTION))
	tab_row.add_child(collection_btn)
	_tab_buttons[TAB_COLLECTION] = collection_btn

	# Count line — "N / M unlocked" or "N / M discovered" (gold), rebuilt each refresh().
	# Right-aligned via an expanding spacer label.
	_header_label = Label.new()
	_header_label.text = ""
	_header_label.add_theme_font_size_override("font_size", 15)
	_header_label.add_theme_color_override("font_color", COL_VALUE)
	_header_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_header_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_header_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tab_row.add_child(_header_label)

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	# The dynamic body — every section + trophy row hangs off this and is cleared +
	# rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it for the current tab. Trophies renders the catalog
## as 2-column grids of compact cards grouped by family (every entry tracked in `_rows`);
## Collection renders the resource discovery codex. The count line reflects the tab.
func refresh() -> void:
	if not _built or game == null:
		return
	_sync_tabs()
	# Detach + free the previous body content. The screen is read-only (only Close
	# acts, and that hides), so a plain queue_free is safe — we never refresh mid-emit.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_rows.clear()

	if _tab == TAB_COLLECTION:
		_header_label.text = "%d / %d discovered" % [discovered_count(), collection_total()]
		_build_collection()
	else:
		_header_label.text = "%d / %d unlocked" % [unlocked_count(), total_count()]
		_build_trophies()

## TROPHIES tab — every non-empty group as a sub-heading + a 2-column grid of compact
## cards. Every catalog entry gets exactly one card (tracked in `_rows`).
func _build_trophies() -> void:
	var grouped: Dictionary = _grouped_catalog()
	# Render the known groups in order, then the trailing "More" catch-all.
	for spec in GROUP_ORDER:
		var name: String = String(spec[0])
		var entries: Array = grouped.get(name, [])
		if entries.is_empty():
			continue
		_build_group_section(name, entries)
	var more: Array = grouped.get(GROUP_MORE, [])
	if not more.is_empty():
		_build_group_section(GROUP_MORE, more)

# ── tab switching ────────────────────────────────────────────────────────────

func _on_tab(tab: String) -> void:
	if tab == _tab:
		return
	_tab = tab
	refresh()

## Apply the segmented active/inactive look to the two toggle buttons.
func _sync_tabs() -> void:
	for key in _tab_buttons.keys():
		UiKit.style_segment(_tab_buttons[key], String(key) == _tab)

## Build one trophy section: an ember Cinzel sub-heading, then a 2-column GridContainer
## of compact cards (in catalog order). Matches React's `grid grid-cols-2` per group.
func _build_group_section(group_name: String, entries: Array) -> void:
	var header := Label.new()
	header.text = group_name.to_upper()
	header.add_theme_font_size_override("font_size", 16)
	header.add_theme_color_override("font_color", COL_HEADER)
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		header.add_theme_font_override("font", heading_font)
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(header)

	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	grid.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(grid)

	for entry in entries:
		var card := _make_trophy_card(entry as Dictionary)
		grid.add_child(card)
		_rows[String((entry as Dictionary).get("id", ""))] = card

## A compact trophy CARD (2-column grid cell, React TrophyCard parity): icon + a
## middle column (name + truncated desc + a thin progress bar with a current/threshold
## count) + a right-aligned reward. Unlocked cards get a 🏆, a moss "done" accent + a
## moss border; locked cards are muted with a 🔒, an ember reward and a soft iron border.
func _make_trophy_card(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var ach_name: String = String(entry.get("name", id))
	var desc: String = String(entry.get("desc", ""))
	var threshold: int = int(entry.get("threshold", 0))
	var unlocked: bool = is_unlocked(id)
	var current: int = row_progress(entry)

	var card := PanelContainer.new()
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.custom_minimum_size = Vector2(0, 62)
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_theme_stylebox_override("panel", _card_style(unlocked))

	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 7)
	card.add_child(top)

	# ── icon (trophy when unlocked, lock when not) ─────────────────────────────
	var icon := Label.new()
	icon.text = "🏆" if unlocked else "🔒"
	icon.add_theme_font_size_override("font_size", 18)
	icon.add_theme_color_override("font_color", Palette.GOLD if unlocked else COL_MUTED)
	icon.custom_minimum_size = Vector2(22, 0)
	icon.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(icon)

	# ── middle column: name+reward, desc, progress bar ─────────────────────────
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 2)
	top.add_child(col)

	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_theme_constant_override("separation", 4)
	col.add_child(title_row)

	var name_lbl := Label.new()
	name_lbl.text = ach_name
	name_lbl.add_theme_font_size_override("font_size", 13)
	name_lbl.add_theme_color_override("font_color", Palette.INK if unlocked else COL_MUTED)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.clip_text = true
	name_lbl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_child(name_lbl)

	var reward_lbl := Label.new()
	reward_lbl.text = _reward_text(entry.get("reward", {}))
	reward_lbl.add_theme_font_size_override("font_size", 11)
	reward_lbl.add_theme_color_override("font_color", Palette.MOSS if unlocked else Palette.EMBER)
	reward_lbl.size_flags_horizontal = Control.SIZE_SHRINK_END
	reward_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	reward_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	title_row.add_child(reward_lbl)

	# ── description (single line, ellipsised) ──────────────────────────────────
	var desc_lbl := Label.new()
	desc_lbl.text = desc
	desc_lbl.add_theme_font_size_override("font_size", 11)
	desc_lbl.add_theme_color_override("font_color", COL_MUTED)
	desc_lbl.clip_text = true
	desc_lbl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(desc_lbl)

	# ── progress bar + current/threshold count ─────────────────────────────────
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_theme_constant_override("separation", 6)
	col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 7)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))
	bar_row.add_child(track)

	var ratio: float = 0.0
	if threshold > 0:
		ratio = clampf(float(current) / float(threshold), 0.0, 1.0)
	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Unlocked bars finish in moss (done); in-progress bars are gold.
	var fill_col: Color = Palette.MOSS if unlocked else Palette.GOLD
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	var prog_lbl := Label.new()
	prog_lbl.text = "%d/%d" % [mini(current, threshold), threshold]
	prog_lbl.add_theme_font_size_override("font_size", 10)
	prog_lbl.add_theme_color_override("font_color", COL_MUTED)
	prog_lbl.custom_minimum_size = Vector2(34, 0)
	prog_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	prog_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_child(prog_lbl)

	return card

## Card StyleBox for a trophy cell: soft parchment fill, radius 10, snug padding. The
## border reads the unlock state — moss-green when earned, soft iron when still locked.
func _card_style(unlocked: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT
	sb.border_color = Palette.MOSS if unlocked else Color(Palette.IRON, 0.55)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(10)
	sb.content_margin_left = 10
	sb.content_margin_right = 10
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	return sb

# ── Collection tab (resource discovery codex — REAL distinct-chained data) ──────
# A gallery of the farm + mine resources. A resource lights up (icon + name) once the
# player has CHAINED it at least once (game.distinct_seen("distinct_resources_chained"));
# undiscovered resources read as a muted "?" chip. This is real discovery data the port
# already tracks for the Naturalist/Polymath trophies — no fabricated lifetime counts.

## Resource keys produced by every tile in a pool, in first-seen order, de-duplicated and
## skipping tiles that produce nothing (dirt / hazards).
func _pool_resources(pool: Array) -> Array:
	var out: Array = []
	var seen: Dictionary = {}
	for tile in pool:
		var res: String = Constants.produced_resource(int(tile))
		if res != "" and not seen.has(res):
			seen[res] = true
			out.append(res)
	return out

## The full collection roster (farm resources then mine resources), de-duplicated across
## the two biomes so a resource shared by both is shown once under Farm.
func _collection_roster() -> Dictionary:
	var farm: Array = _pool_resources(Constants.FARM_POOL)
	var mine: Array = []
	var farm_set: Dictionary = {}
	for r in farm:
		farm_set[r] = true
	for r in _pool_resources(Constants.MINE_POOL):
		if not farm_set.has(r):
			mine.append(r)
	return {"farm": farm, "mine": mine}

## How many distinct resources the player has chained (discovered).
func discovered_count() -> int:
	if game == null:
		return 0
	var roster: Dictionary = _collection_roster()
	var discovered: Dictionary = game.distinct_seen("distinct_resources_chained")
	var n: int = 0
	for group in ["farm", "mine"]:
		for res in (roster[group] as Array):
			if discovered.has(res):
				n += 1
	return n

## Total resources in the collection roster.
func collection_total() -> int:
	var roster: Dictionary = _collection_roster()
	return (roster["farm"] as Array).size() + (roster["mine"] as Array).size()

## Build the Collection tab body: a Farm section + a Mine section, each a wrapping row
## of resource chips (discovered chips show the icon + name; undiscovered show "?").
func _build_collection() -> void:
	var roster: Dictionary = _collection_roster()
	var discovered: Dictionary = game.distinct_seen("distinct_resources_chained")
	for spec in [["Farm", roster["farm"]], ["Mine", roster["mine"]]]:
		var group_name: String = String(spec[0])
		var entries: Array = spec[1]
		if entries.is_empty():
			continue
		var header := Label.new()
		header.text = group_name.to_upper()
		header.add_theme_font_size_override("font_size", 16)
		header.add_theme_color_override("font_color", COL_HEADER)
		var heading_font: Font = UiKit.heading_font()
		if heading_font != null:
			header.add_theme_font_override("font", heading_font)
		header.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_body.add_child(header)

		var flow := HFlowContainer.new()
		flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		flow.add_theme_constant_override("h_separation", 8)
		flow.add_theme_constant_override("v_separation", 8)
		flow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_body.add_child(flow)
		for res in entries:
			flow.add_child(_make_resource_chip(String(res), discovered.has(res)))

	# Footer — "Discovered N / M" (no fabricated lifetime total; the port doesn't track it).
	var footer := Label.new()
	footer.text = "Discovered %d / %d" % [discovered_count(), collection_total()]
	footer.add_theme_font_size_override("font_size", 13)
	footer.add_theme_color_override("font_color", COL_MUTED)
	footer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(footer)

## One resource chip: a small card with the resource icon (or a muted "?" when not yet
## discovered) over its name (or "???"). Discovered chips read brighter with a moss border.
func _make_resource_chip(res: String, discovered: bool) -> PanelContainer:
	var chip := PanelContainer.new()
	chip.custom_minimum_size = Vector2(92, 104)
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sb := StyleBoxFlat.new()
	sb.bg_color = Palette.PARCHMENT_SOFT if discovered else Palette.DIM
	sb.border_color = Palette.MOSS if discovered else Color(Palette.IRON, 0.5)
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(12)
	sb.set_content_margin_all(6)
	chip.add_theme_stylebox_override("panel", sb)
	if not discovered:
		chip.modulate = Color(1, 1, 1, 0.7)

	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 3)
	chip.add_child(col)

	var icon: Control = null
	if discovered:
		icon = UiKit.make_icon(res, 44)
	if icon == null:
		# No art (or undiscovered): a centered glyph — the resource initial when known,
		# a "?" when not — so every chip has a visible mark.
		var glyph := Label.new()
		glyph.text = "?" if not discovered else UiKit.pretty_name(res).substr(0, 1)
		glyph.add_theme_font_size_override("font_size", 26)
		glyph.add_theme_color_override("font_color", COL_MUTED)
		glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		glyph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		icon = glyph
	else:
		(icon as Control).size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(icon)

	var name_lbl := Label.new()
	name_lbl.text = UiKit.pretty_name(res) if discovered else "???"
	name_lbl.add_theme_font_size_override("font_size", 10)
	name_lbl.add_theme_color_override("font_color", Palette.INK if discovered else COL_MUTED)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.clip_text = true
	name_lbl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(name_lbl)

	return chip

## Format a reward dict for display: "+N 🪙" for coins, "+ {tool} ×n" for a tool
## reward (using the ToolConfig label when available), or "—" for an empty reward.
func _reward_text(reward: Dictionary) -> String:
	if reward == null or reward.is_empty():
		return "—"
	var parts: Array = []
	var coins: int = int(reward.get("coins", 0))
	if coins > 0:
		parts.append("+%d 🪙" % coins)
	var tools_reward: Dictionary = reward.get("tools", {})
	for tid in tools_reward.keys():
		var n: int = int(tools_reward[tid])
		var label: String = String(tid)
		var cfg: Dictionary = ToolConfig.get_tool(String(tid))
		if not cfg.is_empty():
			label = String(cfg.get("label", tid))
		if n > 1:
			parts.append("+ %s ×%d" % [label, n])
		else:
			parts.append("+ %s" % label)
	return "  ".join(parts) if not parts.is_empty() else "—"

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Total achievements in the catalog.
func total_count() -> int:
	return AchievementConfig.all().size()

## How many of the catalog's achievements are unlocked in `game`.
func unlocked_count() -> int:
	if game == null:
		return 0
	var n: int = 0
	for entry in AchievementConfig.all():
		if is_unlocked(String((entry as Dictionary).get("id", ""))):
			n += 1
	return n

## True when achievement `id` is recorded unlocked in `game`.
func is_unlocked(id: String) -> bool:
	return game != null and bool(game.achievements_unlocked.get(id, false))

## Current progress value for a catalog entry's counter (delegates to GameState's
## achievement_progress, which handles both quantity + distinct counters).
func row_progress(entry: Dictionary) -> int:
	if game == null:
		return 0
	return game.achievement_progress(String(entry.get("counter", "")))

## group display name → Array of catalog entries (in catalog order) for that group.
## Entries whose counter isn't in any GROUP_ORDER family land under "More".
func _grouped_catalog() -> Dictionary:
	# Build a counter → group-name lookup from GROUP_ORDER.
	var counter_to_group: Dictionary = {}
	for spec in GROUP_ORDER:
		var gname: String = String(spec[0])
		for c in (spec[1] as Array):
			counter_to_group[String(c)] = gname

	var out: Dictionary = {}
	for entry in AchievementConfig.all():
		var counter: String = String((entry as Dictionary).get("counter", ""))
		var gname: String = String(counter_to_group.get(counter, GROUP_MORE))
		if not out.has(gname):
			out[gname] = []
		(out[gname] as Array).append(entry)
	return out
