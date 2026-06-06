extends Node2D
## Root scene: owns the Board and a CanvasLayer HUD (title, live chain counter,
## and a running tally of collected resources). M1 deliverable — proves the core
## mechanic end-to-end with placeholder art.

var board: Board
var _chain_label: Label
var _status_label: Label
var _totals_label: Label
var _totals := {}                      ## resource name -> whole units collected

func _ready() -> void:
	_build_hud()
	board = Board.new()
	add_child(board)
	board.chain_changed.connect(_on_chain_changed)
	board.chain_resolved.connect(_on_chain_resolved)
	_layout()
	get_viewport().size_changed.connect(_layout)

func _layout() -> void:
	var vp: Vector2 = get_viewport_rect().size
	board.layout_for(vp)
	var bw: Vector2 = board.board_pixel_size()
	board.position = Vector2((vp.x - bw.x) / 2.0, vp.y * 0.22)
	_refresh_status()

# ── HUD ────────────────────────────────────────────────────────────────────

func _build_hud() -> void:
	# Background sits on a CanvasLayer BEHIND the board (layer -1); labels sit on
	# a layer ABOVE it (layer 1). The board itself is plain Node2D canvas (layer
	# 0) in between, so it draws over the backdrop and under the text.
	var bg_layer := CanvasLayer.new()
	bg_layer.layer = -1
	add_child(bg_layer)
	var bg := ColorRect.new()
	bg.color = Color(0.063, 0.078, 0.055)             # deep earthy background
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg_layer.add_child(bg)

	var layer := CanvasLayer.new()
	layer.layer = 1
	add_child(layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE   # never eat board drags
	layer.add_child(root)

	var title := Label.new()
	title.text = "puzzleDrag2 · Godot M1"
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", Color(0.83, 0.90, 0.74))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.set_anchors_preset(Control.PRESET_TOP_WIDE)
	title.offset_top = 18
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(title)

	_chain_label = Label.new()
	_chain_label.text = "Drag 3+ matching tiles"
	_chain_label.add_theme_font_size_override("font_size", 22)
	_chain_label.add_theme_color_override("font_color", Color(0.89, 0.76, 0.29))
	_chain_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_chain_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_chain_label.offset_top = 60
	_chain_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_chain_label)

	_status_label = Label.new()
	_status_label.text = ""
	_status_label.add_theme_font_size_override("font_size", 20)
	_status_label.add_theme_color_override("font_color", Color(0.65, 0.84, 0.55))
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_status_label.offset_top = -150
	_status_label.offset_left = -300
	_status_label.offset_right = 300
	_status_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_status_label)

	_totals_label = Label.new()
	_totals_label.text = "Collected: —"
	_totals_label.add_theme_font_size_override("font_size", 20)
	_totals_label.add_theme_color_override("font_color", Color(0.93, 0.95, 0.88))
	_totals_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_totals_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_totals_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_totals_label.offset_top = -110
	_totals_label.offset_left = 24
	_totals_label.offset_right = -24
	_totals_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_totals_label)

# ── signal handlers ────────────────────────────────────────────────────────

func _on_chain_changed(length: int) -> void:
	if length <= 0:
		_chain_label.text = "Drag 3+ matching tiles"
	else:
		_chain_label.text = "Chain: %d" % length

func _on_chain_resolved(_tile_type: int, length: int, resource: String, units: int) -> void:
	if units > 0:
		_totals[resource] = int(_totals.get(resource, 0)) + units
		_status_label.text = "Chain of %d  →  +%d %s" % [length, units, resource]
	else:
		_status_label.text = "Chain of %d  →  building progress…" % length
	_refresh_totals()

func _refresh_totals() -> void:
	if _totals.is_empty():
		_totals_label.text = "Collected: —"
		return
	var parts: Array = []
	for key in _totals:
		parts.append("%s ×%d" % [key, _totals[key]])
	parts.sort()
	_totals_label.text = "Collected:  " + "   ".join(parts)

func _refresh_status() -> void:
	if board != null and _status_label != null and _status_label.text == "":
		_status_label.text = ""
