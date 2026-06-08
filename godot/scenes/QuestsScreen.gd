extends CanvasLayer
## The Quests + Almanac screen, ported from the React quests feature
## (src/features/quests/index.tsx). A parchment modal over a warm scrim with a two-tab
## toggle: QUESTS (the deterministic 6-slot board — each quest's label, a progress bar
## toward its target, and a Claim button enabled only when complete & unclaimed) and
## ALMANAC (the XP/tier track — the current XP + level, a progress bar into the next
## level, then the 10-tier list with a Claim button per tier gated on level + not-yet-
## claimed). ACTIONABLE (unlike the read-only Charter): Claim buttons mutate GameState
## via game.claim_quest / game.claim_almanac_tier; Main persists + refreshes on close.
##
## LAYOUT mirrors AchievementsScreen / CharterScreen EXACTLY (parchment card, iron
## border, drop shadow, a Cinzel title, UiKit / Palette journal styling).
##
## NO class_name on purpose — Main preloads this script
## (preload("res://scenes/QuestsScreen.gd")) so the port never needs an --import pass to
## register a new global (mirrors AchievementsScreen / CharterScreen / PortalScreen).
##
## REAL DATA. Quests come from game.quests (rolled via QuestConfig); almanac state from
## game.almanac_xp / almanac_level / almanac_claimed; the tier catalog from
## AlmanacConfig.all_tiers(). Nothing is faked or placeholder.
##
## Headless-test contract. The close Button lives in `_action_buttons` under the stable
## key "close" (emits `closed`). The two tab buttons live in `_tab_buttons["quests"] /
## ["almanac"]`. On the Quests tab each quest's Claim button lives in `_quest_buttons[id]`
## and its row PanelContainer in `_quest_rows[id]`. On the Almanac tab each tier's Claim
## button lives in `_tier_buttons[tier]` and its row in `_tier_rows[tier]`. The current
## tab is `_tab`. open() / refresh() re-read the live state so a claim re-renders.

var game: GameState

signal closed

## action id → Button, for headless tests. Always has "close".
var _action_buttons: Dictionary = {}

## "quests" / "almanac" → the tab toggle Button. Built once in the shell.
var _tab_buttons: Dictionary = {}

## quest_id:String → its rendered row PanelContainer (Quests tab, rebuilt each refresh()).
var _quest_rows: Dictionary = {}
## quest_id:String → its Claim Button (Quests tab). Lets a test drive a claim.
var _quest_buttons: Dictionary = {}
## tier:int → its rendered row PanelContainer (Almanac tab, rebuilt each refresh()).
var _tier_rows: Dictionary = {}
## tier:int → its Claim Button (Almanac tab).
var _tier_buttons: Dictionary = {}

## Static shell (built once in setup()); the body VBox is cleared + repopulated each
## refresh() so switching tabs / reopening / claiming always reflects live state.
var _body: VBoxContainer
var _built: bool = false

## Current tab: "quests" | "almanac".
var _tab: String = "quests"

# ── parchment palette (matches AchievementsScreen / CharterScreen tokens) ──────────
const COL_TITLE  := Palette.INK
const COL_HEADER := Palette.EMBER
const COL_BODY   := Palette.INK
const COL_MUTED  := Palette.INK_MID
const COL_VALUE  := Palette.GOLD
const COL_PANEL  := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, ensure the quest board is rolled, build the static shell ONCE, render.
func setup(g: GameState) -> void:
	game = g
	if game != null:
		game.ensure_quests()   # populate the board on first use (idempotent)
	if not _built:
		_build_shell()
		_built = true
	refresh()

func open() -> void:
	visible = true
	if game != null:
		game.ensure_quests()
	refresh()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 4                                   # modal, above the HUD (layer 1)
	visible = false

	# Full-rect warm-brown scrim. MOUSE_FILTER_STOP so clicks behind it never reach the
	# board while the screen is open (matches the other modals).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

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
	panel.add_theme_stylebox_override("panel", _parchment_card_style())
	center.add_child(panel)

	var width_cap := MarginContainer.new()
	width_cap.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	panel.add_child(width_cap)

	var root_vbox := VBoxContainer.new()
	root_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_theme_constant_override("separation", 10)
	width_cap.add_child(root_vbox)

	# Title row: "📋 Quests" heading + right-aligned "✕ Close".
	var title_row := HBoxContainer.new()
	title_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(title_row)

	var title := Label.new()
	title.text = "📋 Quests"
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

	# Two-tab toggle: Quests / Almanac.
	var tabs := HBoxContainer.new()
	tabs.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_theme_constant_override("separation", 8)
	root_vbox.add_child(tabs)

	var quests_btn := Button.new()
	quests_btn.text = "Quests"
	UiKit.style_button(quests_btn, Palette.EMBER, 6, 16)
	quests_btn.connect("pressed", Callable(self, "_on_tab").bind("quests"))
	tabs.add_child(quests_btn)
	_tab_buttons["quests"] = quests_btn

	var almanac_btn := Button.new()
	almanac_btn.text = "Almanac"
	UiKit.style_button(almanac_btn, Palette.EMBER, 6, 16)
	almanac_btn.connect("pressed", Callable(self, "_on_tab").bind("almanac"))
	tabs.add_child(almanac_btn)
	_tab_buttons["almanac"] = almanac_btn

	var scroll := UiKit.make_vscroll()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(scroll)

	_body = VBoxContainer.new()
	_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_theme_constant_override("separation", 10)
	scroll.add_child(_body)

## A parchment card StyleBoxFlat — the shared modal look (warm fill, iron border,
## rounded, drop shadow).
func _parchment_card_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(20)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	return style

# ── tab switching ──────────────────────────────────────────────────────────────

func _on_tab(tab: String) -> void:
	_tab = tab
	refresh()

## Apply the React segmented-tab look (active = solid ember fill, inactive = parchment
## outline) via the shared UiKit.style_segment — the SAME toggle styling used by the
## Achievements / Townsfolk / Charter tabs, so Quests|Almanac reads consistently
## across the port instead of the old subtle DIM-fill pair.
func _sync_tab_buttons() -> void:
	for key in _tab_buttons.keys():
		UiKit.style_segment(_tab_buttons[key], String(key) == _tab, Palette.EMBER, 6)

# ── render ────────────────────────────────────────────────────────────────────

## Clear the body and repopulate it from the live state for the current tab.
func refresh() -> void:
	if not _built or game == null:
		return
	_sync_tab_buttons()
	for child in _body.get_children():
		_body.remove_child(child)
		child.queue_free()
	_quest_rows.clear()
	_quest_buttons.clear()
	_tier_rows.clear()
	_tier_buttons.clear()

	if _tab == "quests":
		_render_quests()
	else:
		_render_almanac()

## QUESTS tab: a row per rolled quest (claimable quests sorted to the top, like React).
func _render_quests() -> void:
	if game.quests.is_empty():
		_body.add_child(_empty_label("No quests on the board yet."))
		return
	var sorted: Array = game.quests.duplicate()
	# Claimable-but-unclaimed first (React sorts done-and-unclaimed to the top).
	sorted.sort_custom(func(a, b):
		var ac: int = 1 if QuestConfig.is_claimable(a) else 0
		var bc: int = 1 if QuestConfig.is_claimable(b) else 0
		return ac > bc)
	for q in sorted:
		var row := _make_quest_row(q as Dictionary)
		_body.add_child(row)
		_quest_rows[String((q as Dictionary).get("id", ""))] = row

## A single quest row: a soft-parchment chip with the label + reward, a progress bar
## with a current/target label, and a Claim button (enabled only when claimable).
func _make_quest_row(q: Dictionary) -> PanelContainer:
	var qid: String = String(q.get("id", ""))
	var target: int = int(q.get("target", 0))
	var progress: int = int(q.get("progress", 0))
	var claimed: bool = bool(q.get("claimed", false))
	var claimable: bool = QuestConfig.is_claimable(q)
	var reward: Dictionary = q.get("reward", {})

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# React highlights a DONE/CLAIMED quest card with an ember border + glow
	# (`completed ? !border-[#d6612a]`). Mirror it: a completed (claimable-or-claimed)
	# row gets a 2px ember border so the actionable card stands out from the rest.
	var chip_box: StyleBoxFlat = UiKit.row_box()
	if claimable or claimed:
		chip_box = chip_box.duplicate() as StyleBoxFlat
		chip_box.border_color = Palette.EMBER
		chip_box.set_border_width_all(2)
	chip.add_theme_stylebox_override("panel", chip_box)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 4)
	chip.add_child(col)

	# ── top line: label (expands) + reward ──────────────────────────────────────
	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_theme_constant_override("separation", 8)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(top)

	var label_lbl := Label.new()
	label_lbl.text = _quest_label(q)
	label_lbl.add_theme_font_size_override("font_size", 16)
	label_lbl.add_theme_color_override("font_color", COL_BODY)
	label_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(label_lbl)

	var reward_lbl := Label.new()
	reward_lbl.text = _quest_reward_text(reward)
	reward_lbl.add_theme_font_size_override("font_size", 14)
	reward_lbl.add_theme_color_override("font_color", COL_VALUE)
	reward_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	reward_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(reward_lbl)

	# ── progress bar + current/target label ─────────────────────────────────────
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.add_theme_constant_override("separation", 8)
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(bar_row)

	bar_row.add_child(_make_bar(progress, target, claimable or claimed))

	var prog_lbl := Label.new()
	prog_lbl.text = "%d/%d" % [mini(progress, target), target]
	prog_lbl.add_theme_font_size_override("font_size", 13)
	prog_lbl.add_theme_color_override("font_color", COL_BODY)
	prog_lbl.custom_minimum_size = Vector2(56, 0)
	prog_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	prog_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_child(prog_lbl)

	# ── Claim button (enabled only when claimable) ──────────────────────────────
	var claim_btn := Button.new()
	claim_btn.text = "CLAIMED" if claimed else "CLAIM"
	claim_btn.disabled = not claimable
	claim_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(claim_btn, Palette.GO_GREEN, 6, 18)
	claim_btn.connect("pressed", Callable(self, "_on_claim_quest").bind(qid))
	col.add_child(claim_btn)
	_quest_buttons[qid] = claim_btn

	return chip

## The display label for a quest: substitute the rolled target into the template's
## "{n}" placeholder (mirrors React questLabel).
func _quest_label(q: Dictionary) -> String:
	var tpl: Dictionary = QuestConfig.template_by_id(String(q.get("template", "")))
	var label: String = String(tpl.get("label", ""))
	if label == "":
		return "Quest: %s (%d)" % [String(q.get("category", "?")), int(q.get("target", 0))]
	return label.replace("{n}", str(int(q.get("target", 0))))

## Format a quest reward dict: "+N 🪙  +M ✦" (coins + almanac XP).
func _quest_reward_text(reward: Dictionary) -> String:
	var parts: Array = []
	var coins: int = int(reward.get("coins", 0))
	if coins > 0:
		parts.append("+%d 🪙" % coins)
	var xp: int = int(reward.get("xp", 0))
	if xp > 0:
		parts.append("+%d ✦" % xp)
	return "  ".join(parts) if not parts.is_empty() else "—"

# ── ALMANAC tab ───────────────────────────────────────────────────────────────

## ALMANAC tab: an XP/level header + a progress bar into the next level, then the
## 10-tier list (each with a Claim button gated on level + not-yet-claimed).
func _render_almanac() -> void:
	var xp: int = game.almanac_xp
	var level: int = game.almanac_level
	var into_level: int = xp - (level - 1) * AlmanacConfig.XP_PER_LEVEL

	# Header line: level + XP-into-level / XP_PER_LEVEL.
	var header := Label.new()
	header.text = "Level %d  ·  %d / %d ✦ to next" % [level, into_level, AlmanacConfig.XP_PER_LEVEL]
	header.add_theme_font_size_override("font_size", 18)
	header.add_theme_color_override("font_color", COL_VALUE)
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(header)

	# A progress bar into the current level.
	var bar_row := HBoxContainer.new()
	bar_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar_row.add_theme_constant_override("separation", 8)
	bar_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_body.add_child(bar_row)
	bar_row.add_child(_make_bar(into_level, AlmanacConfig.XP_PER_LEVEL, false))
	var total_lbl := Label.new()
	total_lbl.text = "%d ✦" % xp
	total_lbl.add_theme_font_size_override("font_size", 13)
	total_lbl.add_theme_color_override("font_color", COL_BODY)
	total_lbl.custom_minimum_size = Vector2(64, 0)
	total_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	total_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_row.add_child(total_lbl)

	for tier_def in AlmanacConfig.all_tiers():
		var row := _make_tier_row(tier_def as Dictionary, level)
		_body.add_child(row)
		_tier_rows[int((tier_def as Dictionary).get("tier", 0))] = row

## A single almanac tier row: name + reward + description, a level requirement, and a
## Claim button (enabled only when level >= required AND not already claimed).
func _make_tier_row(tier_def: Dictionary, level: int) -> PanelContainer:
	var tier: int = int(tier_def.get("tier", 0))
	var req_level: int = int(tier_def.get("level", 1))
	var claimed: bool = game.almanac_claimed.has(tier)
	var claimable: bool = AlmanacConfig.can_claim_tier(tier, level, game.almanac_claimed)

	var chip := PanelContainer.new()
	chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chip.add_theme_stylebox_override("panel", UiKit.row_box())
	if not claimed and not claimable:
		chip.modulate = Color(1, 1, 1, 0.78)   # locked rows read dimmer

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 4)
	chip.add_child(col)

	var top := HBoxContainer.new()
	top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_theme_constant_override("separation", 8)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = "Tier %d — %s" % [tier, String(tier_def.get("name", ""))]
	name_lbl.add_theme_font_size_override("font_size", 16)
	name_lbl.add_theme_color_override("font_color", COL_VALUE if claimed else COL_BODY)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(name_lbl)

	var req_lbl := Label.new()
	req_lbl.text = "Lv %d" % req_level
	req_lbl.add_theme_font_size_override("font_size", 12)
	req_lbl.add_theme_color_override("font_color", COL_MUTED)
	req_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(req_lbl)

	var reward_lbl := Label.new()
	reward_lbl.text = _tier_reward_text(tier_def.get("reward", {}))
	reward_lbl.add_theme_font_size_override("font_size", 13)
	reward_lbl.add_theme_color_override("font_color", COL_VALUE if (claimed or claimable) else COL_MUTED)
	reward_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	reward_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(reward_lbl)

	var desc_lbl := Label.new()
	desc_lbl.text = String(tier_def.get("description", ""))
	desc_lbl.add_theme_font_size_override("font_size", 12)
	desc_lbl.add_theme_color_override("font_color", COL_MUTED)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(desc_lbl)

	var claim_btn := Button.new()
	claim_btn.text = "CLAIMED" if claimed else "CLAIM"
	claim_btn.disabled = not claimable
	claim_btn.size_flags_horizontal = Control.SIZE_SHRINK_END
	UiKit.style_action_button(claim_btn, Palette.GO_GREEN, 6, 18)
	claim_btn.connect("pressed", Callable(self, "_on_claim_tier").bind(tier))
	col.add_child(claim_btn)
	_tier_buttons[tier] = claim_btn

	return chip

## Format an almanac tier reward dict: coins (🪙), runes (◆), tools (label ×n), and a
## "+ structural" honour tag. Uses ToolConfig labels when available.
func _tier_reward_text(reward: Dictionary) -> String:
	if reward == null or reward.is_empty():
		return "—"
	var parts: Array = []
	var coins: int = int(reward.get("coins", 0))
	if coins > 0:
		parts.append("+%d 🪙" % coins)
	var rune_n: int = int(reward.get("runes", 0))
	if rune_n > 0:
		parts.append("+%d ◆" % rune_n)
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
	var structural: String = String(reward.get("structural", ""))
	if structural != "":
		parts.append("+ %s" % structural)
	return "  ".join(parts) if not parts.is_empty() else "—"

# ── claim handlers ──────────────────────────────────────────────────────────────

func _on_claim_quest(quest_id: String) -> void:
	if game == null:
		return
	game.claim_quest(quest_id)
	refresh()

func _on_claim_tier(tier: int) -> void:
	if game == null:
		return
	game.claim_almanac_tier(tier)
	refresh()

# ── shared widgets ──────────────────────────────────────────────────────────────

## A DIM progress track with a MOSS→GOLD fill sized to value/maxv. `done` finishes the
## fill in gold; otherwise it's moss. Mirrors the AchievementsScreen bar widget.
func _make_bar(value: int, maxv: int, done: bool) -> Panel:
	var track := Panel.new()
	track.custom_minimum_size = Vector2(0, 12)
	track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", UiKit.bar_box(Palette.DIM, Palette.IRON))

	var ratio: float = 0.0
	if maxv > 0:
		ratio = clampf(float(value) / float(maxv), 0.0, 1.0)
	var fill := Panel.new()
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fill_col: Color = COL_VALUE if done else Palette.MOSS
	fill.add_theme_stylebox_override("panel", UiKit.bar_box(fill_col, fill_col))
	fill.set_anchors_preset(Control.PRESET_TOP_LEFT)
	track.add_child(fill)
	track.resized.connect(func():
		var w: float = maxf(0.0, track.size.x - 2.0)
		fill.position = Vector2(1, 1)
		fill.size = Vector2(w * ratio, maxf(0.0, track.size.y - 2.0)))
	return track

func _empty_label(text: String) -> Label:
	var empty := Label.new()
	empty.text = text
	empty.add_theme_font_size_override("font_size", 14)
	empty.add_theme_color_override("font_color", COL_MUTED)
	empty.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	empty.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return empty

# ── pure helpers (usable + testable without rendering) ─────────────────────────

## Number of quests on the board.
func quest_count() -> int:
	return game.quests.size() if game != null else 0

## How many quests are currently claimable (complete + unclaimed).
func claimable_count() -> int:
	if game == null:
		return 0
	var n: int = 0
	for q in game.quests:
		if QuestConfig.is_claimable(q):
			n += 1
	return n

## Total almanac tiers in the catalog.
func tier_total() -> int:
	return AlmanacConfig.tier_count()
