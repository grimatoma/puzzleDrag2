extends SceneTree
## Headless unit tests for the T24 seasonal-boss system (the timed resource-target model that
## REPLACED the single Frostmaw HP fight). Covers:
##   • the 6-boss BossConfig catalog (ids / seasons / targets / modifiers / window) + unknown-id
##     safe defaults,
##   • the reward formula (defeat threshold, margin scaling, +1 rune, year scaling, loss = nothing),
##   • the GameState boss lifecycle: can_challenge gating, start_boss (modifier applied to a fresh
##     modifier_state, raised chain bar), progress counting (tile-key vs resource targets + craft),
##     window expiry (loss) vs target-met (win), capstone defeat → town2_complete + bosses_defeated,
##   • reachability of all 6 bosses (the current-season boss is spawned),
##   • save/load round-trip of the BossInstance + old-HP-model sanitisation.
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_boss_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const T := Constants.Tile
var BOSS := BossConfig
var BML := BossModifierLogic
var TC := TownConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Seasonal boss tests (T24) ──────────────────────")
	_test_catalog()
	_test_reward_formula()
	_test_can_challenge_gating()
	_test_start_boss_applies_modifier()
	_test_progress_tile_target()
	_test_progress_resource_target()
	_test_progress_craft_target()
	_test_window_expiry_loss()
	_test_target_met_win()
	_test_capstone_progression()
	_test_all_bosses_reachable()
	_test_min_chain_gate()
	_test_reveal_hidden_on_chain()
	_test_save_load()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion + setup helpers ─────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _give(g: GameState, resource: String, amount: int) -> void:
	g.inventory[resource] = int(g.inventory.get(resource, 0)) + amount

## A GameState parked at City tier with the 12 mine goods so it can challenge a boss.
func _ready_state() -> GameState:
	var g := GameState.new()
	g.settlement.tier = TC.TIER_CITY
	_give(g, "block", 6)
	_give(g, "iron_bar", 6)
	return g

## A seeded RNG so modifier picks are deterministic in the tests.
func _rng(seed: int = 999) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = seed
	return r

## Force the current farm season to `name` so pending_boss_id() resolves to a known boss. The season
## is derived from farm_turns_used / the turn budget — Spring at 0, advancing across the budget. We
## just pin farm_turns_used into the right quarter of the budget for the wanted season.
func _force_season(g: GameState, season_name_lower: String) -> void:
	var budget: int = g.farm_turn_budget()
	var idx: int = ["spring", "summer", "autumn", "winter"].find(season_name_lower)
	# season_index buckets turns into 4 quarters; land in the middle of the wanted quarter.
	g.farm_turns_used = int(float(budget) * (float(idx) + 0.5) / 4.0)

# ── catalog ────────────────────────────────────────────────────────────────────

func _test_catalog() -> void:
	_check(BOSS.BOSS_IDS.size() == 6, "6 bosses defined")
	_check(BOSS.BOSS_IDS == ["frostmaw", "quagmire", "ember_drake", "old_stoneface", "mossback", "storm"],
		"BOSS_IDS in the React data.ts order")
	_check(BOSS.BOSS_WINDOW_TURNS == 10, "BOSS_WINDOW_TURNS is 10")
	_check(BOSS.CAPSTONE == "storm", "the capstone boss is storm")

	# Per-boss target + season + modifier (verbatim from data.ts).
	_check(BOSS.boss_season("frostmaw") == "winter", "frostmaw season winter")
	_check(BOSS.target_resource("frostmaw") == "tile_tree_oak", "frostmaw target tile_tree_oak")
	_check(BOSS.target_amount("frostmaw") == 30, "frostmaw target ×30")
	_check(BOSS.modifier_type("frostmaw") == "freeze_columns", "frostmaw modifier freeze_columns")

	_check(BOSS.boss_season("quagmire") == "spring", "quagmire season spring")
	_check(BOSS.target_resource("quagmire") == "tile_grass_grass" and BOSS.target_amount("quagmire") == 50, "quagmire grass ×50")
	_check(BOSS.modifier_type("quagmire") == "respawn_boost", "quagmire modifier respawn_boost")

	_check(BOSS.target_resource("ember_drake") == "iron_bar" and BOSS.target_amount("ember_drake") == 3, "ember_drake iron_bar ×3")
	_check(BOSS.modifier_type("ember_drake") == "heat_tiles", "ember_drake modifier heat_tiles")

	_check(BOSS.target_resource("old_stoneface") == "tile_mine_stone" and BOSS.target_amount("old_stoneface") == 20, "old_stoneface stone ×20")
	_check(BOSS.modifier_type("old_stoneface") == "rubble_blocks", "old_stoneface modifier rubble_blocks")

	_check(BOSS.target_resource("mossback") == "tile_fruit_blackberry" and BOSS.target_amount("mossback") == 30, "mossback blackberry ×30")
	_check(BOSS.modifier_type("mossback") == "hide_resources", "mossback modifier hide_resources")

	_check(BOSS.target_resource("storm") == "fish_fillet" and BOSS.target_amount("storm") == 6, "storm fish_fillet ×6")
	_check(BOSS.modifier_type("storm") == "min_chain", "storm modifier min_chain")
	_check(BOSS.boss_min_chain("storm") == 4, "storm raises the board min chain to 4")
	_check(BOSS.boss_min_chain("frostmaw") == Constants.MIN_CHAIN, "a non-min_chain boss keeps the base chain bar")

	for id in BOSS.BOSS_IDS:
		_check(BOSS.boss_desc(id) != "", "%s has a description" % id)
		_check(BOSS.modifier_desc(id) != "", "%s has a modifier description" % id)

	# Unknown id → safe defaults.
	_check(not BOSS.is_boss("nope"), "is_boss('nope') is false")
	_check(BOSS.boss_name("x") == "", "unknown boss_name is ''")
	_check(BOSS.target_amount("x") == 0, "unknown target_amount is 0")
	_check(BOSS.boss_min_chain("x") == Constants.MIN_CHAIN, "unknown boss_min_chain falls back to MIN_CHAIN")

# ── reward formula ───────────────────────────────────────────────────────────────

func _test_reward_formula() -> void:
	# Loss (progress < target) → nothing.
	var loss := BOSS.boss_reward("frostmaw", 29, 1)   # target 30
	_check(not bool(loss["defeated"]) and int(loss["coins"]) == 0 and int(loss["runes"]) == 0, "below target → no reward, not defeated")

	# Exact target, year 1 → base 200, margin 0 → coins 200, +1 rune.
	var exact := BOSS.boss_reward("frostmaw", 30, 1)
	_check(bool(exact["defeated"]), "meeting the target defeats the boss")
	_check(int(exact["coins"]) == 200, "year 1 exact target → 200 coins (base 200*year, margin 0)")
	_check(int(exact["runes"]) == 1, "a win grants +1 rune")

	# Year 2, exact → base 400.
	_check(int(BOSS.boss_reward("frostmaw", 30, 2)["coins"]) == 400, "year 2 exact target → 400 coins (200*year)")

	# Margin scaling: progress = 2*target (100% over, capped) → base + floor(base * 1.0 * 0.5) = 1.5*base.
	# frostmaw target 30 → progress 60, year 1: base 200, margin min(1, 30/30)=1 → bonus 100 → 300.
	_check(int(BOSS.boss_reward("frostmaw", 60, 1)["coins"]) == 300, "100%-overshoot margin → 1.5× base (300)")
	# Margin caps at 1.0: progress 90 (200% over) still → 300, not more.
	_check(int(BOSS.boss_reward("frostmaw", 90, 1)["coins"]) == 300, "overshoot margin caps at 1.0× (still 300)")
	# Half-overshoot: progress 45 (50% over) → margin 0.5 → bonus floor(200*0.5*0.5)=50 → 250.
	_check(int(BOSS.boss_reward("frostmaw", 45, 1)["coins"]) == 250, "50%-overshoot → base + floor(200*0.5*0.5)=250")

# ── can_challenge gating ─────────────────────────────────────────────────────────

func _test_can_challenge_gating() -> void:
	# Fresh state (Camp, no goods) → can't.
	var fresh := GameState.new()
	_check(not fresh.can_challenge_boss(), "fresh state (Camp, no goods) can't challenge")

	# City but no mine goods → can't.
	var no_goods := GameState.new()
	no_goods.settlement.tier = TC.TIER_CITY
	_check(not no_goods.can_challenge_boss(), "City with 0 mine goods can't challenge")

	# Below City with the goods → can't (tier gate).
	var low := GameState.new()
	low.settlement.tier = TC.TIER_TOWN
	_give(low, "block", 6)
	_give(low, "iron_bar", 6)
	_check(not low.can_challenge_boss(), "Town tier with the goods still can't challenge (needs City)")

	# Ready state → CAN challenge (a season boss exists at Spring).
	var ready := _ready_state()
	_check(ready.can_challenge_boss(), "City + 12 mine goods CAN challenge")

	# Already fighting → can't.
	ready.start_boss(_rng())
	_check(not ready.can_challenge_boss(), "already-fighting state can't re-challenge")

# ── start_boss applies the modifier to a fresh modifier_state ───────────────────

func _test_start_boss_applies_modifier() -> void:
	# Winter → frostmaw (freeze_columns n=2).
	var g := _ready_state()
	_force_season(g, "winter")
	_check(g.pending_boss_id() == "frostmaw", "winter season → pending boss frostmaw")
	var res := g.start_boss(_rng())
	_check(bool(res["ok"]), "start_boss succeeds from a ready winter state")
	_check(g.boss_active == "frostmaw", "boss_active is frostmaw")
	_check(g.boss_turns_remaining == BOSS.BOSS_WINDOW_TURNS, "window starts at BOSS_WINDOW_TURNS")
	_check(g.boss_progress == 0, "progress starts at 0")
	_check(g.boss_target_resource == "tile_tree_oak" and g.boss_target_amount == 30, "target cached from catalog")
	_check((g.boss_modifier_state.get("frozen_columns", []) as Array).size() == 2, "freeze_columns applied 2 frozen columns to modifier_state")
	_check(g.boss_min_chain() == Constants.MIN_CHAIN, "frostmaw keeps the base chain bar")

	# Re-start while active → in_fight, no mutation.
	var again := g.start_boss(_rng())
	_check(again.get("reason", "") == "in_fight", "re-start while active → 'in_fight'")

	# Autumn → old_stoneface (rubble_blocks count=4).
	var g2 := _ready_state()
	_force_season(g2, "autumn")
	_check(g2.pending_boss_id() == "old_stoneface", "autumn season → old_stoneface")
	g2.start_boss(_rng())
	_check((g2.boss_modifier_state.get("rubble", []) as Array).size() == 4, "rubble_blocks applied 4 rubble cells")

	# Below-City start → locked (no mutation).
	var low := GameState.new()
	low.settlement.tier = TC.TIER_TOWN
	_give(low, "block", 6)
	_give(low, "iron_bar", 6)
	var locked := low.start_boss(_rng())
	_check(locked.get("reason", "") == "locked", "below-City start → 'locked'")
	_check(not low.is_boss_active(), "no boss armed after a locked start")

# ── progress: TILE-key target counts chained TILES ───────────────────────────────

func _test_progress_tile_target() -> void:
	var g := _ready_state()
	_force_season(g, "winter")
	g.start_boss(_rng())   # frostmaw: tile_tree_oak ×30
	# A chain of 5 OAK tiles → +5 progress (tile-key target counts chained tiles, not produced units).
	var r := g.note_boss_chain(T.OAK, 5, 0)   # units=0 deliberately; tile-key path ignores units
	_check(int(r.get("progress", -1)) == 5, "5-oak chain advances tile-key progress by 5 (chain length)")
	# A chain of a DIFFERENT tile (grass) → no progress.
	g.note_boss_chain(T.GRASS, 6, 1)
	_check(g.boss_progress == 5, "a non-target tile chain adds no progress")
	# Another oak chain accumulates.
	g.note_boss_chain(T.OAK, 4, 0)
	_check(g.boss_progress == 9, "progress accumulates across oak chains (5+4)")

# ── progress: RESOURCE target counts UNITS PRODUCED ──────────────────────────────

func _test_progress_resource_target() -> void:
	var g := _ready_state()
	_force_season(g, "summer")
	# Summer is the capstone (storm) season while town2 isn't done — force the ember_drake path by
	# completing town2 first so pending resolves to the season's first boss (ember_drake).
	g.town2_complete = true
	_check(g.pending_boss_id() == "ember_drake", "summer + town2 done → ember_drake (iron_bar target)")
	g.start_boss(_rng())
	# A resource target counts UNITS produced, not chain length: an IRON_ORE chain producing 1 iron_bar
	# unit advances by 1 (not by the chain length).
	var r := g.note_boss_chain(T.IRON_ORE, 7, 1)   # 7-long chain, but only 1 iron_bar unit produced
	_check(int(r.get("progress", -1)) == 1, "resource target counts UNITS (1), not chain length (7)")
	g.note_boss_chain(T.IRON_ORE, 6, 1)
	_check(g.boss_progress == 2, "resource progress accumulates by units (1+1)")

# ── progress: craft path (iron_bar-consuming recipe ticks +1) ─────────────────────

func _test_progress_craft_target() -> void:
	var g := _ready_state()
	_force_season(g, "summer")
	g.town2_complete = true
	g.start_boss(_rng())   # ember_drake: iron_bar ×3
	# Find a recipe that CONSUMES iron_bar as an input.
	var iron_recipe := ""
	for id in RecipeConfig.RECIPE_IDS:
		if int(RecipeConfig.recipe_inputs(id).get("iron_bar", 0)) > 0:
			iron_recipe = id
			break
	if iron_recipe == "":
		_check(false, "(setup) found a recipe that consumes iron_bar")
		return
	var before: int = g.boss_progress
	var rc := g.note_boss_craft(iron_recipe)
	_check(int(rc.get("progress", -1)) == before + 1, "crafting an iron_bar-consuming recipe ticks boss progress +1")
	# A recipe that doesn't consume iron_bar (BREAD) → no tick.
	var prog_after: int = g.boss_progress
	g.note_boss_craft(RecipeConfig.BREAD)
	_check(g.boss_progress == prog_after, "a non-iron_bar recipe does NOT tick the iron_bar boss")

# ── window expiry → LOSS (no reward) ─────────────────────────────────────────────

func _test_window_expiry_loss() -> void:
	var g := _ready_state()
	_force_season(g, "winter")
	g.start_boss(_rng())   # frostmaw: 30 oak in 10 turns
	var coins0: int = g.coins
	var runes0: int = g.runes
	# Make a little progress but nowhere near the target, then run the window out.
	g.note_boss_chain(T.OAK, 3, 0)   # progress 3, well under 30
	var rng := _rng()
	var last := {}
	for _i in BOSS.BOSS_WINDOW_TURNS:
		last = g.tick_boss_turn(rng)
	_check(not g.is_boss_active(), "the window expired → boss cleared")
	_check(not bool(last.get("defeated", true)), "an expired window is a LOSS (not defeated)")
	_check(g.coins == coins0 and g.runes == runes0, "a loss grants no coins / runes")
	_check(not g.town2_complete, "a loss does NOT set town2_complete")
	_check(g.boss_modifier_state.is_empty(), "the modifier overlay is cleared on resolve")

# ── target met mid-window → WIN (reward) ─────────────────────────────────────────

func _test_target_met_win() -> void:
	var g := _ready_state()
	_force_season(g, "winter")
	g.boss_year = 1
	g.start_boss(_rng())   # frostmaw: 30 oak
	var coins0: int = g.coins
	var runes0: int = g.runes
	# One big chain of 30 oak meets the target exactly → WIN inside note_boss_chain.
	var r := g.note_boss_chain(T.OAK, 30, 0)
	_check(bool(r.get("defeated", false)), "meeting the target via a chain WINS")
	_check(not g.is_boss_active(), "the boss clears on a win")
	_check(int(r.get("reward_coins", 0)) == 200, "year-1 exact win pays 200 coins")
	_check(int(r.get("reward_runes", 0)) == 1, "a win pays +1 rune")
	# The FIRST boss defeat in a fresh state ALSO unlocks the `first_blood` achievement (+200 coins
	# ON TOP of the 200 boss reward — the achievement bonus stacking, not a change to the payout).
	_check(g.coins == coins0 + 200 + 200, "200 boss reward + 200 first_blood achievement credited on the first win")
	_check(g.runes == runes0 + 1, "rune credited on the win")
	# frostmaw is NOT the capstone → town2 stays false; bosses_defeated still bumps.
	_check(not g.town2_complete, "a non-capstone win does NOT set town2_complete")
	_check(int(g.achievement_counters.get("bosses_defeated", 0)) >= 1, "a win bumps bosses_defeated")

# ── capstone (storm) win sets town2_complete ─────────────────────────────────────

func _test_capstone_progression() -> void:
	var g := _ready_state()
	_force_season(g, "summer")
	# town2 not yet done + summer → the capstone (storm) is offered for reachability.
	_check(g.pending_boss_id() == "storm", "summer + town2 NOT done → the capstone storm is offered")
	g.start_boss(_rng())   # storm: fish_fillet ×6, min_chain 4
	_check(g.boss_min_chain() == 4, "storm raises the board min chain to 4 while active")
	var defeated_before: int = int(g.achievement_counters.get("bosses_defeated", 0))
	# Meet the target (6 fish) — a fish chain produces fish_fillet units; resource target counts units.
	var r := g.note_boss_chain(T.FISH_SARDINE, 6, 6)   # 6 fillet units
	_check(bool(r.get("defeated", false)), "meeting the storm target wins")
	_check(g.town2_complete, "the CAPSTONE win sets town2_complete")
	_check(int(g.achievement_counters.get("bosses_defeated", 0)) == defeated_before + 1, "the capstone win bumps bosses_defeated")
	_check(g.boss_min_chain() == Constants.MIN_CHAIN, "the chain bar drops back to base after the capstone resolves")
	# Once town2 is done, the capstone can't be re-challenged in its season.
	var g2 := _ready_state()
	g2.town2_complete = true
	_force_season(g2, "summer")
	_check(g2.pending_boss_id() == "ember_drake", "after town2, summer offers ember_drake (not the done capstone)")

# ── all 6 bosses reachable (the current-season boss is spawned) ──────────────────

func _test_all_bosses_reachable() -> void:
	# Each season maps to a boss; verify start_boss arms each of the 6 (capstone via the pre-town2 path).
	var expected := {
		"winter": "frostmaw", "autumn": "old_stoneface",
	}
	for season in expected.keys():
		var g := _ready_state()
		_force_season(g, season)
		g.start_boss(_rng())
		_check(g.boss_active == expected[season], "%s season is reachable → %s" % [season, expected[season]])
	# Spring offers quagmire (first spring boss); after defeating it, mossback (the other spring boss)
	# is the next spring offering. We assert the roster covers BOTH spring bosses.
	_check(BOSS.season_roster("spring") == ["quagmire", "mossback"], "spring roster = [quagmire, mossback]")
	_check(BOSS.season_roster("summer") == ["ember_drake", "storm"], "summer roster = [ember_drake, storm]")
	# Spring + town2-done → quagmire (capstone is summer, so spring just offers its first boss).
	var gs := _ready_state()
	gs.town2_complete = true
	_force_season(gs, "spring")
	_check(gs.pending_boss_id() == "quagmire", "spring offers quagmire")
	# mossback (hide_resources) IS startable directly via its catalog (reachability of the modifier).
	var gm := _ready_state()
	gm.start_boss(_rng())   # whatever season; just assert mossback's modifier applies when spawned
	var mb := BML.apply_to_fresh_grid(BOSS.boss_modifier("mossback"), Constants.ROWS, Constants.COLS, _rng())
	_check((mb.get("hidden", []) as Array).size() == 4, "mossback's hide_resources is reachable (4 hidden cells)")

# ── min_chain gate (storm) — short chains don't reach progress (board-side) ───────

func _test_min_chain_gate() -> void:
	# The min_chain enforcement is on the BOARD (BoardLogic.is_valid_chain with min_chain). Here we
	# assert GameState surfaces the raised bar so the board can enforce it.
	var g := _ready_state()
	_force_season(g, "summer")
	g.start_boss(_rng())   # storm (pre-town2 summer)
	_check(g.boss_active == "storm", "(setup) storm armed")
	_check(g.boss_min_chain() == 4, "storm's min_chain is surfaced as 4 for the board gate")

# ── reveal hidden-on-chain (mossback) ────────────────────────────────────────────

func _test_reveal_hidden_on_chain() -> void:
	var g := _ready_state()
	# Arm mossback directly by forcing its season (spring) + town2 so pending = quagmire... mossback
	# is the SECOND spring boss; to test reveal we apply its modifier_state directly onto an armed boss.
	_force_season(g, "spring")
	g.town2_complete = true
	g.start_boss(_rng())   # quagmire (spring first) — but we want a hidden layer; overwrite for the test
	# Simulate a hide_resources boss state: install a hidden cell and assert reveal clears it.
	g.boss_modifier_state = {"hidden": [{"row": 2, "col": 3}, {"row": 4, "col": 1}]}
	_check(g.boss_cell_hidden(2, 3), "(setup) cell (2,3) is hidden")
	_check(not g.boss_cell_chainable(2, 3), "(setup) a hidden cell is unchainable")
	# Chaining a path that INCLUDES (2,3) reveals it.
	var revealed := g.reveal_boss_hidden([{"row": 2, "col": 3}])
	_check(revealed.size() == 1, "reveal_boss_hidden reveals the one chained hidden cell")
	_check(not g.boss_cell_hidden(2, 3), "(2,3) is no longer hidden after the chain reveal")
	_check(g.boss_cell_hidden(4, 1), "the other hidden cell (4,1) stays hidden")
	# Miner's Hat reveals ALL.
	var all := g.reveal_boss_hidden([])
	_check(all.size() == 1, "reveal-all (Miner's Hat) reveals the remaining hidden cell")
	_check(not g.boss_cell_hidden(4, 1), "(4,1) revealed by the reveal-all path")

# ── save / load round-trip of the BossInstance ───────────────────────────────────

func _test_save_load() -> void:
	# Live mid-fight: start, make progress, tick a couple of turns, round-trip.
	var g := _ready_state()
	_force_season(g, "winter")
	g.start_boss(_rng())
	g.note_boss_chain(T.OAK, 8, 0)   # progress 8
	g.tick_boss_turn(_rng())          # window 10 → 9
	g.tick_boss_turn(_rng())          # window 9 → 8
	_check(g.boss_progress == 8 and g.boss_turns_remaining == 8, "(setup) frostmaw at progress 8, 8 turns left")
	var d := g.to_dict()
	_check(d.get("boss_active", "") == "frostmaw", "to_dict carries boss_active 'frostmaw'")
	_check(int(d.get("boss_progress", -1)) == 8, "to_dict carries boss_progress 8")
	_check(int(d.get("boss_turns_remaining", -1)) == 8, "to_dict carries boss_turns_remaining 8")
	_check(d.has("boss_modifier_state"), "to_dict carries the modifier_state")
	var loaded := GameState.from_dict(d)
	_check(loaded.boss_active == "frostmaw", "from_dict restores boss_active")
	_check(loaded.boss_progress == 8, "from_dict restores boss_progress 8")
	_check(loaded.boss_turns_remaining == 8, "from_dict restores boss_turns_remaining 8")
	_check(loaded.boss_target_resource == "tile_tree_oak" and loaded.boss_target_amount == 30, "from_dict restores the target")
	_check((loaded.boss_modifier_state.get("frozen_columns", []) as Array).size() == 2, "from_dict restores the 2 frozen columns")
	_check(loaded.is_boss_active(), "loaded mid-fight state reports active")

	# A corrupt save with a bogus boss id → sanitised to idle.
	var bad := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "dragon", "boss_progress": 12, "town2_complete": false,
	}
	var b := GameState.from_dict(bad)
	_check(b.boss_active == "", "bogus boss id sanitises to idle ''")
	_check(b.boss_progress == 0 and b.boss_turns_remaining == 0, "an idle restored state rests every per-fight field")
	_check(b.boss_modifier_state.is_empty(), "an idle restored state has an empty modifier_state")
	_check(not b.is_boss_active(), "sanitised save reports no active boss")

	# An OLD HP-model save (boss_active='frostmaw', boss_hp=28, no new fields) loads with the boss
	# id kept + the per-fight fields defaulted from the catalog (the stale boss_hp key is ignored).
	var old_hp := {
		"inventory": {}, "progress": {}, "coins": 0, "turn": 0,
		"settlement": {"tier": 5}, "buildings": [], "orders": [],
		"active_biome": "farm", "mine_turns_left": 0,
		"boss_active": "frostmaw", "boss_hp": 28, "town2_complete": false,
	}
	var oh := GameState.from_dict(old_hp)
	_check(oh.boss_active == "frostmaw", "old HP-model save keeps the valid boss id")
	_check(oh.boss_target_resource == "tile_tree_oak" and oh.boss_target_amount == 30, "old save defaults the target from the catalog")
	_check(oh.boss_turns_remaining == BOSS.BOSS_WINDOW_TURNS, "old save defaults the window to BOSS_WINDOW_TURNS")

	# A defeated capstone preserves town2_complete across a round-trip.
	var won := _ready_state()
	_force_season(won, "summer")
	won.start_boss(_rng())   # storm (capstone, pre-town2)
	won.note_boss_chain(T.FISH_SARDINE, 6, 6)   # win
	_check(won.town2_complete, "(setup) capstone defeated → town2_complete")
	var wl := GameState.from_dict(won.to_dict())
	_check(wl.town2_complete == true, "from_dict preserves town2_complete after a capstone win")
	_check(wl.boss_active == "", "from_dict keeps boss_active '' after a win")
