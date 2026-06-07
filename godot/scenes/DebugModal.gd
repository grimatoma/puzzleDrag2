extends CanvasLayer
## Developer DEBUG overlay (a dev-only QA tool) — the Godot port's analogue of the
## React `debug` modal. A scrollable parchment CanvasLayer modal that:
##
##   1. STATE READOUT — live labels reading REAL GameState fields (coins / runes /
##      influence / turn / settlement tier / active biome / town2_complete / inventory
##      item count / quests rolled / almanac level / daily streak day). The readout text
##      is factored into the PURE static `readout_lines(game)` helper so it's headless-
##      testable without any rendering.
##   2. JUMP GRID — one button per deep-link in ViewRouter.known_ids() (aliases + dupes
##      skipped), each calling main.apply_deeplink(id). The debug modal thus doubles as
##      the QA index of every reachable surface.
##   3. QUICK GRANTS — a few buttons that call REAL existing GameState / SaveManager
##      mutations only (+500 coins, +5 runes, +100 influence, Tier up, Roll quests, Clear
##      save). The button → method mapping is described by the PURE static `grant_specs()`
##      so a test can assert every backing method genuinely exists (has_method). After a
##      grant Main's HUD pills + this readout are refreshed via the `main` back-reference.
##
## DEEP-LINK ONLY. Like the React debug modal (which is hidden — not on the HUD), this is
## reachable solely via apply_deeplink("debug"); Main wires NO permanent HUD button for it.
##
## NO class_name — preloaded by Main (const DebugModalScript := preload(...)) so the port
## never needs an --import to register it as a global (mirrors TutorialModal / DailyStreakModal /
## every other lazily-created modal).
##
## HEADLESS-TEST CONTRACT
##   - `readout_lines(game)` / `grant_specs()` are PURE statics (no node access).
##   - Every actionable button is in `_action_buttons` under a stable key:
##       jump buttons:  "jump:<id>"        (one per deduped known id)
##       grant buttons: "grant:<grant id>" (one per grant_specs() entry)
##       "close".
##   - `_readout_labels` holds the rendered readout Labels (one per readout line).

var game: GameState
var main                                ## back-reference to Main (for apply_deeplink + HUD refresh)

signal closed

## Stable button registry for headless tests. Keys: "jump:<id>", "grant:<id>", "close".
var _action_buttons: Dictionary = {}

## The rendered readout Labels, in order (re-textualised by refresh_readout()).
var _readout_labels: Array = []

## True once _build_shell() has run (safe to call setup() again).
var _built: bool = false

# Static shell refs.
var _readout_col: VBoxContainer         ## holds the readout Labels

# Palette mirrors (MenuScreen / DailyStreakModal tokens).
const COL_TITLE := Palette.INK
const COL_BODY  := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const COL_DANGER := Color("#b06a52")    ## soft danger tone for "Clear save"
const PANEL_MAX_WIDTH := 460.0

# ── pure helpers (headless-testable, no node access) ─────────────────────────────

## A list of "Label: value" readout lines describing the live GameState. PURE — takes a
## GameState and returns plain strings, so the readout can be asserted in a headless test
## without building the modal. A null game yields a single "(no game)" line. Reads REAL
## fields only — settlement tier resolves its name via TownConfig (same as the HUD pill).
static func readout_lines(g: GameState) -> PackedStringArray:
	if g == null:
		return PackedStringArray(["(no game)"])
	var inv_items: int = 0
	for k in g.inventory:
		if int(g.inventory[k]) > 0:
			inv_items += 1
	var tier_name: String = TownConfig.tier_name(g.settlement.tier)
	return PackedStringArray([
		"Coins: %d" % g.coins,
		"Runes: %d" % g.runes,
		"Influence: %d" % g.influence,
		"Turn: %d" % g.turn,
		"Tier: %d (%s)" % [g.settlement.tier, tier_name],
		"Active biome: %s" % g.active_biome,
		"Town 2 complete: %s" % ("yes" if g.town2_complete else "no"),
		"Inventory items: %d" % inv_items,
		"Quests rolled: %d" % g.quests.size(),
		"Almanac level: %d" % g.almanac_level,
		"Daily streak day: %d" % g.daily_streak_day,
	])

## Describe the quick-grant buttons. PURE — returns an Array of {id, label, target, method}
## dicts. `target` is "game" or "save" (which object owns `method`). Each entry's `method`
## is a REAL existing GameState / SaveManager method (the test asserts has_method on each).
## "+500 coins" / "+5 runes" / "+100 influence" mutate fields directly so they list NO
## method (the field write is always valid); they're still surfaced so the test can grant
## via them and assert the delta. Listed methods: try_tier_up (Tier up), reroll_quests
## (Roll quests), clear (Clear save).
static func grant_specs() -> Array:
	return [
		{"id": "coins500",  "label": "+500 coins",   "target": "game", "method": ""},
		{"id": "runes5",    "label": "+5 runes",     "target": "game", "method": ""},
		{"id": "influence100", "label": "+100 influence", "target": "game", "method": ""},
		{"id": "tierup",    "label": "Tier up",      "target": "game", "method": "try_tier_up"},
		{"id": "rollquests", "label": "Roll quests", "target": "game", "method": "reroll_quests"},
		{"id": "clearsave", "label": "Clear save",   "target": "save", "method": "clear"},
	]

## The DEDUPED list of jump targets — one entry per DISTINCT modal so aliases ("items" vs
## "inventory", "world" vs "cartography", "" vs "board") collapse to a single button. PURE:
## walks ViewRouter.known_ids(), resolving each to its modal and keeping the FIRST id that
## maps to a not-yet-seen modal. The empty id is normalised to "board" so the button has a
## label. "debug" is skipped (no point jumping to the modal you're already in).
static func jump_targets() -> PackedStringArray:
	var seen: Dictionary = {}
	var out: PackedStringArray = PackedStringArray()
	for id in ViewRouter.known_ids():
		if id == "debug":
			continue
		var label_id: String = id if id != "" else "board"
		var intent: Dictionary = ViewRouter.resolve(id)
		if not bool(intent.get("ok", false)):
			continue
		var modal: int = int(intent.get("modal", ViewRouter.Modal.NONE))
		if seen.has(modal):
			continue
		seen[modal] = true
		out.append(label_id)
	return out

# ── lifecycle ────────────────────────────────────────────────────────────────────

## Store `game` + the Main back-reference, build the static shell ONCE, then sync the
## readout. Safe to call again (the shell is only built the first time). `m` is Main —
## used for apply_deeplink (jump grid) + HUD refresh after a grant.
func setup(g: GameState, m = null) -> void:
	game = g
	main = m
	if not _built:
		_build_shell()
		_built = true
	refresh_readout()

func open() -> void:
	visible = true
	refresh_readout()

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ───────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 6                                   # top tier (mirrors TutorialModal / DailyStreakModal)
	visible = false

	# Warm-brown scrim (matches MenuScreen / DailyStreakModal).
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.17, 0.13, 0.08, 0.66)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	# Full-rect CenterContainer centres the parchment card at its own min size.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = COL_PANEL
	style.set_corner_radius_all(16)
	style.set_content_margin_all(22)
	style.border_color = Palette.IRON
	style.set_border_width_all(2)
	style.shadow_size = 12
	style.shadow_color = Color(0, 0, 0, 0.28)
	style.shadow_offset = Vector2(0, 5)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 14)
	panel.add_child(col)

	var heading_font: Font = UiKit.heading_font()

	# Title — "🛠 Debug" in the Cinzel display serif.
	var title := Label.new()
	title.text = "🛠 Debug"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", COL_TITLE)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if heading_font != null:
		title.add_theme_font_override("font", heading_font)
	col.add_child(title)

	# Iron hairline under the title.
	col.add_child(_rule())

	# The three sections live inside a height-capped ScrollContainer so a tall jump
	# grid + readout never run off a short viewport.
	var scroll := UiKit.make_vscroll()
	scroll.custom_minimum_size = Vector2(PANEL_MAX_WIDTH - 44, 460)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	col.add_child(scroll)

	var scroll_col := VBoxContainer.new()
	scroll_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll_col.add_theme_constant_override("separation", 14)
	scroll.add_child(scroll_col)

	# ── Section 1: State readout ──────────────────────────────────────────────
	scroll_col.add_child(_section_header("State", heading_font))
	_readout_col = VBoxContainer.new()
	_readout_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_readout_col.add_theme_constant_override("separation", 2)
	scroll_col.add_child(_readout_col)

	# ── Section 2: Jump grid ──────────────────────────────────────────────────
	scroll_col.add_child(_section_header("Jump to", heading_font))
	var jump_grid := GridContainer.new()
	jump_grid.columns = 3
	jump_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	jump_grid.add_theme_constant_override("h_separation", 6)
	jump_grid.add_theme_constant_override("v_separation", 6)
	scroll_col.add_child(jump_grid)
	for id in jump_targets():
		var jbtn := Button.new()
		jbtn.text = id
		jbtn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		UiKit.style_button(jbtn, Palette.EMBER, 4, 14)
		# Capture the id; route the jump through Main.apply_deeplink (single nav path).
		var jump_id: String = id
		jbtn.pressed.connect(func(): _on_jump(jump_id))
		jump_grid.add_child(jbtn)
		_action_buttons["jump:%s" % id] = jbtn

	# ── Section 3: Quick grants ───────────────────────────────────────────────
	scroll_col.add_child(_section_header("Grants", heading_font))
	var grant_grid := GridContainer.new()
	grant_grid.columns = 2
	grant_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grant_grid.add_theme_constant_override("h_separation", 6)
	grant_grid.add_theme_constant_override("v_separation", 6)
	scroll_col.add_child(grant_grid)
	for spec in grant_specs():
		var gid: String = String(spec["id"])
		var gbtn := Button.new()
		gbtn.text = String(spec["label"])
		gbtn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var accent: Color = COL_DANGER if gid == "clearsave" else Palette.MOSS
		UiKit.style_button(gbtn, accent, 6, 15)
		gbtn.pressed.connect(func(): apply_grant(gid))
		grant_grid.add_child(gbtn)
		_action_buttons["grant:%s" % gid] = gbtn

	# ── Close button (outside the scroll, always reachable) ───────────────────
	col.add_child(_rule())
	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	UiKit.style_button(close_btn, Palette.EMBER, 8, 20)
	close_btn.connect("pressed", Callable(self, "close"))
	col.add_child(close_btn)
	_action_buttons["close"] = close_btn

## A thin iron hairline separator (mirrors DailyStreakModal's rule).
func _rule() -> HSeparator:
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	return rule

## A small section header Label (Cinzel when present).
func _section_header(text: String, heading_font: Font) -> Label:
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 18)
	lbl.add_theme_color_override("font_color", COL_TITLE)
	if heading_font != null:
		lbl.add_theme_font_override("font", heading_font)
	return lbl

# ── readout render ───────────────────────────────────────────────────────────────

## Re-textualise the readout labels from the live GameState. Rebuilds the label set when
## the line count changes (it's stable in practice) so it always matches readout_lines().
func refresh_readout() -> void:
	if _readout_col == null:
		return
	var lines: PackedStringArray = readout_lines(game)
	# Rebuild the label set if the count drifted (defensive; usually a no-op after build).
	if _readout_labels.size() != lines.size():
		for child in _readout_col.get_children():
			child.queue_free()
		_readout_labels.clear()
		for _i in lines.size():
			var lbl := Label.new()
			lbl.add_theme_font_size_override("font_size", 15)
			lbl.add_theme_color_override("font_color", COL_BODY)
			_readout_col.add_child(lbl)
			_readout_labels.append(lbl)
	for i in lines.size():
		(_readout_labels[i] as Label).text = lines[i]

# ── action handlers ────────────────────────────────────────────────────────────

## Jump to a deep-linked surface via Main (the single nav path). No-op (besides logging)
## when there's no Main back-reference (e.g. a bare headless modal in a unit test).
func _on_jump(id: String) -> void:
	if main != null and main.has_method("apply_deeplink"):
		main.apply_deeplink(id)

## Apply a quick grant by id, then refresh Main's HUD + this readout so the mutation shows
## immediately. Every branch calls a REAL existing GameState / SaveManager mutation (see
## grant_specs()). Returns the grant result Dictionary where the backing method returns one
## (try_tier_up / reroll_quests), else {} — handy for the headless test to assert on.
func apply_grant(id: String) -> Dictionary:
	var result: Dictionary = {}
	if game == null:
		return result
	match id:
		"coins500":
			game.coins += 500
		"runes5":
			game.runes += 5
		"influence100":
			game.influence += 100
		"tierup":
			result = game.try_tier_up()
		"rollquests":
			game.reroll_quests()
		"clearsave":
			SaveManager.clear()
	_refresh_main_hud()
	refresh_readout()
	return result

## Refresh whatever HUD surfaces Main exposes so a grant's coins/runes/influence/tier land
## on the on-board pills immediately. Guarded per-method so a bare modal (no Main) is a
## no-op, and so it survives any future HUD-method rename without crashing the grant.
func _refresh_main_hud() -> void:
	if main == null:
		return
	for m in ["_refresh_meta", "_refresh_runes", "_refresh_settlement", "_refresh_buildings", "_refresh_totals", "_refresh_chain_progress"]:
		if main.has_method(m):
			main.call(m)
