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
## the only actionable Control is "✕ Close"; everything else is MOUSE_FILTER_IGNORE.
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

	# Full-rect warm-brown scrim. MOUSE_FILTER_STOP so clicks behind it never reach
	# the board while the trophy screen is open (matches the other modals).
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

	# A non-scrolling column: title row + header line pinned at the top, then a
	# ScrollContainer that owns the (potentially long) trophy list.
	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "🏆 Achievements" heading + a right-aligned "✕ Close" button.
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
	close_btn.text = "✕ Close"
	close_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_button(close_btn, Palette.EMBER, 6, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	title_row.add_child(close_btn)
	_action_buttons["close"] = close_btn

	# Header line — "N / total unlocked" (gold), rebuilt each refresh().
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

	# The dynamic body — every section + trophy row hangs off this and is cleared +
	# rebuilt each refresh().
	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 12)
	scroll.add_child(_body)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from AchievementConfig.all(): the header count
## line, then an ordered section (sub-heading + a row per achievement) for each
## non-empty group. Every catalog entry gets exactly one row (tracked in `_rows`).
func refresh() -> void:
	if not _built or game == null:
		return
	# Detach + free the previous body content. The screen is read-only (only Close
	# acts, and that hides), so a plain queue_free is safe — we never refresh mid-emit.
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_rows.clear()

	_header_label.text = "%d / %d unlocked" % [unlocked_count(), total_count()]

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

## Build one section: an iron hairline, an ember Cinzel sub-heading, then a trophy
## row per entry (in catalog order).
func _build_group_section(group_name: String, entries: Array) -> void:
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
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(header)

	for entry in entries:
		var row := _make_trophy_row(entry as Dictionary)
		_body.add_child(row)
		_rows[String((entry as Dictionary).get("id", ""))] = row

## A single trophy row: a soft-parchment chip holding a top line (icon + name +
## reward) over the description + a progress bar with a current/threshold label.
## Unlocked rows get a gold accent + a 🏆 icon; locked rows are muted with a 🔒 and
## a dimmed bar.
func _make_trophy_row(entry: Dictionary) -> PanelContainer:
	var id: String = String(entry.get("id", ""))
	var ach_name: String = String(entry.get("name", id))
	var desc: String = String(entry.get("desc", ""))
	var counter: String = String(entry.get("counter", ""))
	var threshold: int = int(entry.get("threshold", 0))
	var unlocked: bool = is_unlocked(id)
	var current: int = row_progress(entry)

	var chip := PanelContainer.new()
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	# Locked rows read dimmer overall (the whole chip is modulated down a touch).
	if not unlocked:
		chip.modulate = Color(1, 1, 1, 0.78)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_theme_constant_override("separation", 4)
	chip.add_child(col)

	# ── top line: icon + name (expands) + reward ──────────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_theme_constant_override("separation", 8)
	col.add_child(top)

	var icon := Label.new()
	icon.text = "🏆" if unlocked else "🔒"
	icon.add_theme_font_size_override("font_size", 20)
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(icon)

	var name_lbl := Label.new()
	name_lbl.text = ach_name
	name_lbl.add_theme_font_size_override("font_size", 19)
	# Unlocked trophies get the gold accent; locked stay ink-muted.
	name_lbl.add_theme_color_override("font_color", COL_VALUE if unlocked else COL_MUTED)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_lbl)

	var reward_lbl := Label.new()
	reward_lbl.text = _reward_text(entry.get("reward", {}))
	reward_lbl.add_theme_font_size_override("font_size", 15)
	reward_lbl.add_theme_color_override("font_color", COL_VALUE if unlocked else COL_MUTED)
	reward_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	reward_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(reward_lbl)

	# ── description ───────────────────────────────────────────────────────────
	var desc_lbl := Label.new()
	desc_lbl.text = desc
	desc_lbl.add_theme_font_size_override("font_size", 14)
	desc_lbl.add_theme_color_override("font_color", COL_MUTED)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(desc_lbl)

	# ── progress bar: a DIM track with a MOSS→GOLD fill + a "current/threshold"
	#    label to its right. The fill is a child Control sized by the track resize. ─
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_theme_constant_override("separation", 8)
	col.add_child(bar_row)

	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
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
	# Unlocked bars finish in gold; in-progress bars are moss.
	var fill_col: Color = COL_VALUE if unlocked else Palette.MOSS
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	# Size the fill once the track has a width: re-apply on every track resize so the
	# proportion survives a viewport change. Seed an immediate size for the headless
	# case where `resized` may not fire before a test inspects the tree.
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0))
	)

	var prog_lbl := Label.new()
	prog_lbl.text = "%d/%d" % [mini(current, threshold), threshold]
	prog_lbl.add_theme_font_size_override("font_size", 13)
	prog_lbl.add_theme_color_override("font_color", COL_BODY if unlocked else COL_MUTED)
	prog_lbl.custom_minimum_size = Vector2(56, 0)
	prog_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	prog_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_child(prog_lbl)

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
