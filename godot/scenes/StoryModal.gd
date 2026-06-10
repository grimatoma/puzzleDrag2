extends CanvasLayer
## The story BEAT PRESENTER — a parchment dialog (card over a warm scrim) that shows
## ONE story beat at a time: its title (Cinzel), its lines as `speaker: text` rows
## (an empty speaker = narration, rendered without a prefix), and either a Continue
## button or — for a CHOICE beat — one button per choice. It is the UI half of the
## story engine: GameState's post_story_event ENQUEUES fired beat ids into
## game.story.beat_queue, and Main's _drain_story_queue() drives this modal to present
## the FRONT of that queue, advancing through it as the player dismisses each beat.
##
## Modelled on MenuScreen / TownMapScreen (warm-scrim backdrop + centred parchment
## PanelContainer + UiKit-styled pill buttons), with a ScrollContainer around the lines
## so a long beat stays readable. Data-driven: every render reads StoryConfig.beat_by_id.
##
## SINGLE SOURCE OF TRUTH. The modal never grants anything itself — a choice routes
## through game.resolve_story_choice (the only path that credits a beat's resources/
## coins), and a Continue just advances. On every advance the modal pops the presented
## beat id off the FRONT of game.story.beat_queue and emits `advanced`, so Main can
## present the next queued beat or hide the modal (and refresh the HUD — a choice may
## have granted coins/resources).
##
## NO class_name on purpose — Main preloads this script (preload(".../StoryModal.gd"))
## so the port never needs an --import pass to register a new global. Mirrors how
## AchievementsScreen / TileCollectionScreen are loaded.
##
## Headless-test contract. Every actionable button is registered in `_action_buttons`
## under a stable key — "continue" for a no-choice beat, "choice:<choice_id>" for each
## choice — so a test can fetch + `pressed.emit()` it and assert the advance/resolve.
## The screen exposes pure helpers: current_beat_id(), and tracks the rendered line
## rows in `_line_rows` so a test can assert the beat's lines rendered.

var game: GameState

signal closed
## Emitted after a beat is dismissed (Continue) or resolved (a choice) and popped off
## the front of game.story.beat_queue — Main listens to present the next queued beat or
## hide the modal + refresh the HUD.
signal advanced

## action id → Button, for headless tests. "continue" (no-choice beats) OR
## "choice:<choice_id>" (one per choice). Rebuilt on each open_for().
var _action_buttons: Dictionary = {}

## The beat id currently presented ("" when none). Set by open_for(), cleared on advance.
var _beat_id: String = ""

# Static shell, built once in setup(); the body (title + lines + buttons) is cleared +
# repopulated each open_for() so the modal always reflects the front-of-queue beat.
var _built: bool = false
var _title_label: Label             ## the beat title (Cinzel), set each render
var _lines_scroll: ScrollContainer  ## scrolls the lines; min height sized to content each render
var _lines_box: VBoxContainer       ## holds the speaker:text line rows (cleared each render)
var _buttons_box: VBoxContainer     ## holds the Continue / choice buttons (cleared each render)
## The rendered line rows (one Label per beat line), tracked for the headless test.
var _line_rows: Array = []

# ── parchment palette (matches MenuScreen / AchievementsScreen journal tokens) ──────
const COL_TITLE := Palette.INK
const COL_SPEAKER := Palette.EMBER
const COL_BODY := Palette.INK
const COL_NARRATION := Palette.INK_MID
const COL_PANEL := Palette.PARCHMENT
const PANEL_MAX_WIDTH := 520.0
## Cap on the lines scroll height — a short beat hugs its dialogue, a long beat scrolls.
const LINES_MAX_H := 560.0

# ── lifecycle ─────────────────────────────────────────────────────────────────

## Store `game`, build the static shell ONCE. Safe to call again (shell built once).
## Does NOT render a beat — call open_for(id) to present one.
func setup(g: GameState) -> void:
	game = g
	if not _built:
		_build_shell()
		_built = true

## Render `beat_id` and show the modal. The beat is looked up live from StoryConfig,
## so the modal is purely a view over the catalog data.
func open_for(beat_id: String) -> void:
	if not _built:
		return
	_beat_id = beat_id
	_render(beat_id)
	visible = true

func close() -> void:
	visible = false
	emit_signal("closed")

# ── static shell ──────────────────────────────────────────────────────────────

func _build_shell() -> void:
	layer = 5                                   # above the other modals (Town/Menu at 3/4)
	visible = false

	# Full-rect warm-brown scrim. MOUSE_FILTER_STOP so clicks behind it never reach the
	# board while a beat is showing (matches the other modals).
	var backdrop := UiKit.make_scrim()
	add_child(backdrop)

	# Centred card via a full-rect CenterContainer (centres its single child at the
	# child's own minimum size — same idiom as MenuScreen).
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_MAX_WIDTH, 0)
	# Parchment card — warm fill, iron border, rounded corners, generous padding, soft
	# drop shadow so it floats over the warm scrim.
	# Shared modal card surface (UiKit.modal_card_box) — one builder for every
	# centred-card modal so radius/border/shadow can never drift again.
	panel.add_theme_stylebox_override("panel", UiKit.modal_card_box(24))
	center.add_child(panel)

	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	col.add_theme_constant_override("separation", 14)
	panel.add_child(col)

	# Title — the beat title in the Cinzel display serif (parity with Main's headings).
	_title_label = Label.new()
	_title_label.text = ""
	_title_label.add_theme_font_size_override("font_size", 30)
	_title_label.add_theme_color_override("font_color", COL_TITLE)
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var heading_font: Font = UiKit.heading_font()
	if heading_font != null:
		_title_label.add_theme_font_override("font", heading_font)
	_title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(_title_label)

	# An iron hairline under the title.
	var rule := HSeparator.new()
	var line := StyleBoxLine.new()
	line.color = Color(Palette.IRON, 0.7)
	line.thickness = 1
	rule.add_theme_stylebox_override("separator", line)
	col.add_child(rule)

	# Lines — a ScrollContainer so a LONG beat scrolls rather than overflowing the card. A
	# bare SHRINK_BEGIN scroll collapses to 0 with no min height (a ScrollContainer does NOT
	# propagate its child's minimum HEIGHT), so _render sizes the scroll's min height to its
	# laid-out content each render, capped at LINES_MAX_H — short beats hug their dialogue,
	# long beats scroll. The dynamic VBox inside is cleared + rebuilt each render.
	_lines_scroll = UiKit.make_vscroll()
	_lines_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_lines_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lines_scroll.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	col.add_child(_lines_scroll)

	_lines_box = VBoxContainer.new()
	_lines_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_lines_box.add_theme_constant_override("separation", 12)
	_lines_scroll.add_child(_lines_box)

	# Buttons — Continue (no-choice) OR one per choice, rebuilt each render.
	_buttons_box = VBoxContainer.new()
	_buttons_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_buttons_box.add_theme_constant_override("separation", 10)
	col.add_child(_buttons_box)

# ── render ────────────────────────────────────────────────────────────────────

## Render the beat `beat_id`: its title, its lines, and its choice/continue buttons.
## Reads the beat live from StoryConfig so the modal is a pure view over the catalog.
func _render(beat_id: String) -> void:
	if not _built:
		return
	var beat: Dictionary = StoryConfig.beat_by_id(beat_id)

	# Clear previous lines + buttons + the action registry.
	for child in _lines_box.get_children():
		_lines_box.remove_child(child)
		child.queue_free()
	for child in _buttons_box.get_children():
		_buttons_box.remove_child(child)
		child.queue_free()
	_line_rows.clear()
	_action_buttons.clear()

	# An unknown beat id renders an empty (but still dismissible) card so a bad queue
	# entry can't strand the modal — Continue just advances past it.
	_title_label.text = String(beat.get("title", "…"))

	# ── lines: one row per {speaker, text}. A non-empty speaker prefixes an ember
	#    "Speaker" label above the body text; an empty speaker is narration (body only). ─
	for raw in beat.get("lines", []):
		var ln: Dictionary = raw as Dictionary
		var speaker: String = String(ln.get("speaker", ""))
		var text: String = String(ln.get("text", ""))
		_lines_box.add_child(_make_line_row(speaker, text))

	# ── buttons: choices (one per choice) OR a single Continue ──────────────────
	var choices: Array = beat.get("choices", [])
	if choices.is_empty():
		var cont := Button.new()
		cont.text = "Continue"
		cont.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		UiKit.style_action_button(cont, Palette.GO_GREEN, 8, 20)
		cont.connect("pressed", Callable(self, "_on_continue"))
		_buttons_box.add_child(cont)
		_action_buttons["continue"] = cont
	else:
		for raw_choice in choices:
			var choice: Dictionary = raw_choice as Dictionary
			var cid: String = String(choice.get("id", ""))
			var label: String = String(choice.get("label", cid))
			var btn := Button.new()
			btn.text = label
			btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			UiKit.style_button(btn, Palette.EMBER, 8, 18)
			# bind the choice id so the handler resolves THIS choice on the current beat.
			btn.connect("pressed", Callable(self, "_on_choice").bind(cid))
			_buttons_box.add_child(btn)
			_action_buttons["choice:" + cid] = btn

	# Size the lines scroll to its content (capped) once the labels have wrapped to the
	# card width. Deferred so the wrapping Label heights are settled; also seed an immediate
	# size so the FIRST capture/test frame isn't a zero-height collapse.
	_fit_lines_scroll()
	call_deferred("_fit_lines_scroll")

## Set the lines scroll's min height to its content's combined minimum height, capped at
## LINES_MAX_H so a short beat hugs its dialogue and a long beat scrolls within the cap.
func _fit_lines_scroll() -> void:
	if _lines_scroll == null or _lines_box == null:
		return
	var content_h: float = _lines_box.get_combined_minimum_size().y
	_lines_scroll.custom_minimum_size = Vector2(0, minf(content_h, LINES_MAX_H))

## A single line row: an ember Cinzel-weight speaker label (skipped for narration) over
## the wrapping body text. Narration body reads in the muted ink tone + italic feel; a
## spoken line reads in full ink. Tracked in `_line_rows` (the body Label) for tests.
func _make_line_row(speaker: String, text: String) -> Control:
	var row := VBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 2)

	if speaker != "":
		var spk := Label.new()
		spk.text = speaker
		spk.add_theme_font_size_override("font_size", 16)
		spk.add_theme_color_override("font_color", COL_SPEAKER)
		var heading_font: Font = UiKit.heading_font()
		if heading_font != null:
			spk.add_theme_font_override("font", heading_font)
		spk.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(spk)

	var body := Label.new()
	body.text = text
	body.add_theme_font_size_override("font_size", 17)
	# Narration (no speaker) reads in the muted tone; spoken lines in full ink.
	body.add_theme_color_override("font_color", COL_BODY if speaker != "" else COL_NARRATION)
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(body)

	_line_rows.append(body)
	return row

# ── action handlers ───────────────────────────────────────────────────────────

## Continue (a no-choice beat) — just advance past the current beat.
func _on_continue() -> void:
	_advance()

## A choice button — resolve the chosen outcome through GameState (the ONLY path that
## credits a beat's grants), then advance. resolve_story_choice applies the flags +
## credits resources/coins; a choice may queue a follow-up beat into the queue, which
## the advance below will surface next.
func _on_choice(choice_id: String) -> void:
	if game != null and _beat_id != "":
		game.resolve_story_choice(_beat_id, choice_id)
	_advance()

## Pop the presented beat id off the FRONT of game.story.beat_queue (if it's there) and
## emit `advanced` so Main presents the next queued beat or hides the modal. Defensive:
## removes the id wherever it sits (it should be the front), and only the FIRST match,
## so a queued duplicate isn't double-removed.
func _advance() -> void:
	if game != null:
		var q: Array = game.story.beat_queue
		var idx: int = q.find(_beat_id)
		if idx >= 0:
			q.remove_at(idx)
	_beat_id = ""
	emit_signal("advanced")

# ── pure helpers (testable without rendering internals) ────────────────────────

## The beat id currently presented, or "" when none.
func current_beat_id() -> String:
	return _beat_id
