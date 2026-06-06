extends Node2D
## Root scene: owns the Board and a CanvasLayer HUD (title, live chain counter,
## a running tally of collected resources, and a coins/turn readout). M2
## deliverable — wires the core mechanic to a persistent run economy (GameState)
## that is loaded on start and saved after every resolved chain.

var board: Board
var game: GameState                    ## canonical run economy (inventory/coins/turn)
var _chain_label: Label
var _status_label: Label
var _totals_label: Label
var _meta_label: Label                  ## coins + turn readout
var _settlement_label: Label            ## town tier · cap · plots readout
var _buildings_label: Label             ## plots used + placed spawners readout
var _orders_label: Label                ## active NPC orders (resource → reward) readout
var _biome_label: Label                 ## current biome + mine turns (M3f expedition) readout
var _town_screen: TownScreen            ## the real on-screen Town panel (M3e), lazily created

func _ready() -> void:
	game = SaveManager.load_state()
	# Seed the order generator with a fixed int so the running game's orders (and
	# screenshots) are deterministic, then top the order board up to MAX_ORDERS.
	game.seed_orders(1337)
	game.refill_orders()
	_build_hud()
	board = Board.new()
	add_child(board)
	board.chain_changed.connect(_on_chain_changed)
	board.chain_resolved.connect(_on_chain_resolved)
	# Seed the board's refill pool from the restored save's ACTIVE BIOME (M3f): if
	# the save was mid-expedition, active_biome_pool() returns the mine pool and we
	# rebuild so mine tiles show immediately; otherwise it's the farm spawner pool.
	# Rebuild whenever we're in the mine OR any spawner was placed (the staples-only
	# board drawn in Board._ready would otherwise hide both).
	board.set_tile_pool(game.active_biome_pool())
	if game.is_in_mine() or not game.buildings.is_empty():
		board.setup_new_board()
	_layout()
	get_viewport().size_changed.connect(_layout)
	# Reflect any restored save immediately (inventory + coins + turn + tier + biome).
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()

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
	title.text = "puzzleDrag2 · Godot M3"
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

	_meta_label = Label.new()
	_meta_label.text = "Coins: 0   ·   Turn: 0"
	_meta_label.add_theme_font_size_override("font_size", 20)
	_meta_label.add_theme_color_override("font_color", Color(0.91, 0.78, 0.44))
	_meta_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_meta_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_meta_label.offset_top = 96
	_meta_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_meta_label)

	_settlement_label = Label.new()
	_settlement_label.text = "Camp · cap 200 · 3 plots"
	_settlement_label.add_theme_font_size_override("font_size", 18)
	_settlement_label.add_theme_color_override("font_color", Color(0.74, 0.86, 0.62))
	_settlement_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_settlement_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_settlement_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_settlement_label.offset_top = 126
	_settlement_label.offset_left = 24
	_settlement_label.offset_right = -24
	_settlement_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_settlement_label)

	_buildings_label = Label.new()
	_buildings_label.text = "Plots 0/3 · (no buildings)"
	_buildings_label.add_theme_font_size_override("font_size", 18)
	_buildings_label.add_theme_color_override("font_color", Color(0.70, 0.82, 0.92))
	_buildings_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_buildings_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_buildings_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_buildings_label.offset_top = 156
	_buildings_label.offset_left = 24
	_buildings_label.offset_right = -24
	_buildings_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_buildings_label)

	_orders_label = Label.new()
	_orders_label.text = "Orders:  —"
	_orders_label.add_theme_font_size_override("font_size", 18)
	_orders_label.add_theme_color_override("font_color", Color(0.95, 0.85, 0.62))
	_orders_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_orders_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_orders_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_orders_label.offset_top = 186
	_orders_label.offset_left = 24
	_orders_label.offset_right = -24
	_orders_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_orders_label)

	# M3f: current biome + (while mining) remaining expedition turns.
	_biome_label = Label.new()
	_biome_label.text = "Farm"
	_biome_label.add_theme_font_size_override("font_size", 18)
	_biome_label.add_theme_color_override("font_color", Color(0.78, 0.80, 0.84))
	_biome_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_biome_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_biome_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_biome_label.offset_top = 216
	_biome_label.offset_left = 24
	_biome_label.offset_right = -24
	_biome_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_biome_label)

	# Always-visible "🏠 Town" button — the REAL path into the town menu (the
	# temporary T/1-6/B/G/F keys below stay only as a harmless dev fallback). It
	# IS clickable (unlike every other HUD Control), so it must NOT use
	# MOUSE_FILTER_IGNORE. Pinned top-left, away from the centred board drag area.
	var town_btn := Button.new()
	town_btn.text = "🏠 Town"
	town_btn.add_theme_font_size_override("font_size", 20)
	town_btn.set_anchors_preset(Control.PRESET_TOP_LEFT)
	town_btn.offset_left = 18
	town_btn.offset_top = 18
	town_btn.connect("pressed", Callable(self, "_open_town"))
	root.add_child(town_btn)

# ── Town screen ─────────────────────────────────────────────────────────────

## Open the town panel, lazily creating + wiring it on first use.
func _open_town() -> void:
	if _town_screen == null:
		_town_screen = TownScreen.new()
		add_child(_town_screen)
		_town_screen.setup(game)
		_town_screen.connect("closed", Callable(self, "_on_town_closed"))
		_town_screen.connect("state_changed", Callable(self, "_on_town_changed"))
	_town_screen.open()

func _on_town_closed() -> void:
	if _town_screen != null:
		_town_screen.visible = false

## A town action mutated `game`: re-pool the board from the ACTIVE biome, refresh
## every HUD label, save. The Town screen's Expedition section can flip the biome
## (enter/leave the mine), so detect a biome change and regenerate the board with
## the new pool (a plain set_tile_pool only takes effect on the next refill — a
## biome swap must replace what's on the board NOW).
func _on_town_changed() -> void:
	var was_mine: bool = _board_pool_is_mine()
	board.set_tile_pool(game.active_biome_pool())
	if game.is_in_mine() != was_mine:
		board.setup_new_board()
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()
	SaveManager.save(game)

## True when the board's CURRENT refill pool is the mine pool — used to detect a
## biome flip before we overwrite the pool. Compares against Constants.MINE_POOL.
func _board_pool_is_mine() -> bool:
	return board != null and board.tile_pool == Constants.MINE_POOL

# ── signal handlers ────────────────────────────────────────────────────────

func _on_chain_changed(length: int) -> void:
	if length <= 0:
		_chain_label.text = "Drag 3+ matching tiles"
	else:
		_chain_label.text = "Chain: %d" % length

func _on_chain_resolved(tile_type: int, length: int) -> void:
	var res: Dictionary = game.credit_chain(tile_type, length)
	if int(res.get("units", 0)) > 0:
		_status_label.text = "Chain of %d  →  +%d %s" % [length, res["units"], res["resource"]]
	else:
		_status_label.text = "Chain of %d  →  building progress…" % length
	# M3f: a chain resolved inside the mine spends one expedition turn (the goods are
	# already credited above). When the turns run out the run SOFT-FAILS: keep
	# everything gathered, swap the board back to the farm pool, and regenerate.
	if game.is_in_mine():
		var turn_res: Dictionary = game.note_mine_turn()
		if bool(turn_res.get("exited", false)):
			_status_label.text = "Expedition over — supplies spent. Back to the farm."
			board.set_tile_pool(game.active_biome_pool())
			board.setup_new_board()
		else:
			_status_label.text = "%s  ·  ⛏ %d mine turn(s) left" % [
				_status_label.text, int(turn_res.get("turns_left", 0))]
	_refresh_totals()
	_refresh_meta()
	_refresh_settlement()
	_refresh_buildings()
	_refresh_orders()
	_refresh_biome()
	SaveManager.save(game)

# ── tier-up + build affordances ──────────────────────────────────────────────

## Dev/demo keyboard affordances — now a HARMLESS FALLBACK. As of M3e the real
## path into the town economy is the "🏠 Town" HUD button + the TownScreen panel
## (build/demolish/tier-up/craft/sell/fill buttons); these keys are kept only so
## the ladder, spawner system, and refining/market economy stay exercisable from
## the keyboard. Key input is separate from the board's _unhandled_input mouse
## handling, so it never interferes with chain drags.
##   T     — advance the town one tier (when affordable)
##   1/2/3 — build Lumber Camp / Coop / Garden
##   4/5/6 — demolish Lumber Camp / Coop / Garden
##   B     — bake bread at the Bakery (refiner: 3 flour + 1 eggs → 1 bread)  [TEMP]
##   G     — sell 1 hay_bundle at the Market (+1 coin)                       [TEMP]
##   F     — fill the first fillable NPC order (coin sink)                   [TEMP]
##   M     — launch a mine expedition when eligible (City + supplies)        [TEMP]
func _unhandled_key_input(event: InputEvent) -> void:
	if game == null:
		return
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_T:
			if game.can_tier_up():
				var res: Dictionary = game.try_tier_up()
				if bool(res.get("ok", false)):
					_status_label.text = "Town advanced  →  %s" % res.get("name", "")
					_refresh_totals()
					_refresh_meta()
					_refresh_settlement()
					_refresh_buildings()   # plots change with tier
					SaveManager.save(game)
				get_viewport().set_input_as_handled()
		KEY_1:
			_try_build(BuildingConfig.LUMBER_CAMP)
		KEY_2:
			_try_build(BuildingConfig.COOP)
		KEY_3:
			_try_build(BuildingConfig.GARDEN)
		KEY_4:
			_try_demolish(BuildingConfig.LUMBER_CAMP)
		KEY_5:
			_try_demolish(BuildingConfig.COOP)
		KEY_6:
			_try_demolish(BuildingConfig.GARDEN)
		KEY_B:
			_try_bake()       # TEMP M3c demo: refine flour + eggs into bread
		KEY_G:
			_try_sell_hay()   # TEMP M3c demo: sell 1 hay_bundle for a coin
		KEY_F:
			_try_fill_order() # TEMP M3d demo: fill the first fillable NPC order
		KEY_M:
			_try_enter_mine() # TEMP M3f demo: launch a mine expedition (real path: Town screen)

## Dev affordance: attempt a build, then re-pool the board + refresh HUD + save.
func _try_build(id: String) -> void:
	var res: Dictionary = game.build(id)
	if bool(res.get("ok", false)):
		_apply_pool_change()
		_status_label.text = "Built %s — %s now spawn" % [
			BuildingConfig.building_name(id), BuildingConfig.building_category(id)]
		SaveManager.save(game)
	else:
		# Brief, non-blocking hint; no mutation happened.
		_status_label.text = "Can't build %s (%s)" % [
			BuildingConfig.building_name(id), _build_hint(res.get("reason", ""))]
	get_viewport().set_input_as_handled()

## Dev affordance: attempt a demolish, then re-pool the board + refresh HUD + save.
func _try_demolish(id: String) -> void:
	var res: Dictionary = game.demolish(id)
	if bool(res.get("ok", false)):
		_apply_pool_change()
		_status_label.text = "Demolished %s" % BuildingConfig.building_name(id)
		SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3c demo: bake one bread at the Bakery (refiner). Real Bakery UI is M3d.
func _try_bake() -> void:
	if game.can_craft(RecipeConfig.BREAD):
		game.craft(RecipeConfig.BREAD)
		_status_label.text = "Baked bread (3 flour + 1 eggs)"
		_refresh_totals()
		_refresh_meta()
		SaveManager.save(game)
	else:
		_status_label.text = "Can't bake (need a Bakery + 3 flour + 1 eggs)"
	get_viewport().set_input_as_handled()

## TEMP M3c demo: sell one hay_bundle at the Market. Real Market UI is M3d.
func _try_sell_hay() -> void:
	if game.qty("hay_bundle") > 0:
		game.sell("hay_bundle", 1)
		_status_label.text = "Sold 1 hay_bundle (+1 coin)"
		_refresh_totals()
		_refresh_meta()
		SaveManager.save(game)
	else:
		_status_label.text = "No hay_bundle to sell"
	get_viewport().set_input_as_handled()

## TEMP M3d demo: fill the FIRST fillable NPC order (lowest index whose resource
## is in stock). Real order buttons land in the next milestone (the Town UI).
func _try_fill_order() -> void:
	var idx: int = -1
	for i in game.orders.size():
		if game.can_fill_order(i):
			idx = i
			break
	if idx < 0:
		_status_label.text = "No order you can fill yet"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = game.fill_order(idx)
	_status_label.text = "Filled order: %d×%s → +%d coins" % [
		int(res["qty"]), res["resource"], int(res["reward"])]
	_refresh_orders()
	_refresh_totals()
	_refresh_meta()
	SaveManager.save(game)
	get_viewport().set_input_as_handled()

## TEMP M3f demo: launch a mine expedition from the keyboard. The REAL entry is the
## Town screen's Expedition section ("Enter the Mine") — this key is a harmless dev
## fallback so the biome swap stays exercisable. Converts all supplies into turns,
## then re-pools + regenerates the board onto the mine and refreshes the HUD.
func _try_enter_mine() -> void:
	if not game.can_enter_mine():
		_status_label.text = "Can't enter the mine (need City + supplies)"
		get_viewport().set_input_as_handled()
		return
	var res: Dictionary = game.enter_mine()
	if bool(res.get("ok", false)):
		_enter_mine_visuals()
		_status_label.text = "⛏ Expedition underway — %d mine turns" % int(res.get("turns", 0))
		SaveManager.save(game)
	get_viewport().set_input_as_handled()

## Swap the board onto the CURRENT active biome and refresh the biome-affected HUD.
## Used after any biome flip (M demo key entry; the Town screen routes through
## _on_town_changed, which does the same set_tile_pool + setup_new_board). Naming it
## for the common direction (entering the mine) while staying biome-agnostic.
func _enter_mine_visuals() -> void:
	board.set_tile_pool(game.active_biome_pool())
	board.setup_new_board()
	_refresh_biome()
	_refresh_totals()

## Push the new active pool onto the board and refresh the building-affected HUD.
func _apply_pool_change() -> void:
	board.set_tile_pool(game.active_tile_pool())
	_refresh_buildings()
	_refresh_settlement()
	_refresh_totals()

## Short player-facing hint for a build() failure reason.
func _build_hint(reason: String) -> String:
	match reason:
		"exists":       return "already built"
		"locked":       return "need a higher tier"
		"no_plot":      return "no free plot"
		"insufficient": return "not enough resources"
		_:              return "unavailable"

func _refresh_totals() -> void:
	if game == null or game.inventory.is_empty():
		_totals_label.text = "Collected: —"
		return
	var parts: Array = []
	for key in game.inventory:
		parts.append("%s ×%d" % [key, game.inventory[key]])
	parts.sort()
	_totals_label.text = "Collected:  " + "   ".join(parts)

func _refresh_meta() -> void:
	if _meta_label == null or game == null:
		return
	_meta_label.text = "Coins: %d   ·   Turn: %d" % [game.coins, game.turn]

func _refresh_settlement() -> void:
	if _settlement_label == null or game == null:
		return
	var s := game.settlement
	var text: String = "%s · cap %d · %d plots" % [s.tier_name(), s.cap(), s.plots()]
	if game.can_tier_up():
		var next_name: String = TownConfig.tier_name(s.tier + 1)
		text += "    ▲ Press T to advance to %s" % next_name
	_settlement_label.text = text

func _refresh_buildings() -> void:
	if _buildings_label == null or game == null:
		return
	var used: int = game.plots_used()
	var total: int = game.settlement.plots()
	if game.buildings.is_empty():
		_buildings_label.text = "Plots %d/%d · (no buildings)" % [used, total]
		return
	var names: Array = []
	for id in game.buildings:
		names.append(BuildingConfig.building_name(id))
	var text: String = "Plots %d/%d · %s" % [used, total, ", ".join(names)]
	# Surface the M3c refining affordance only while a Bakery is placed.
	if game.has_building(BuildingConfig.BAKERY):
		text += "    🍞 B to bake bread"
	_buildings_label.text = text

func _refresh_orders() -> void:
	if _orders_label == null or game == null:
		return
	if game.orders.is_empty():
		_orders_label.text = "Orders:  —"
		return
	# Compact one-line readout: each order as "qty×resource → rewardc".
	var parts: Array = []
	for order in game.orders:
		parts.append("%d×%s → %dc" % [int(order["qty"]), order["resource"], int(order["reward"])])
	_orders_label.text = "Orders:  " + "   ·   ".join(parts) + "    📦 F to fill"

## M3f: show the current biome. On the farm it reads "Farm"; on an expedition it
## reads "⛏ Mine · turns left: N". Mirrors GameState.active_biome / mine_turns_left.
func _refresh_biome() -> void:
	if _biome_label == null or game == null:
		return
	if game.is_in_mine():
		_biome_label.text = "⛏ Mine · turns left: %d" % game.mine_turns_left
	else:
		_biome_label.text = "Farm"

func _refresh_status() -> void:
	if board != null and _status_label != null and _status_label.text == "":
		_status_label.text = ""
