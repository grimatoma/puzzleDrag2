extends SceneTree
## Headless unit-test runner for the story engine logic (beats / flags / triggers /
## choices): StoryConfig (catalog), StoryEngine (pure evaluator/snapshot/appliers),
## StoryState (save/load), and the GameState integration wired ADDITIVELY into the
## existing event sites. Run from the godot/ project root:
##   godot --headless --script res://tests/run_story_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_achievements_tests.gd.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── Story engine tests ─────────────────────────────")
	# StoryConfig (catalog)
	_test_config_loads()
	# StoryEngine.evaluate_condition
	_test_eval_each_op()
	_test_eval_truthy_default()
	_test_eval_missing_fact()
	_test_eval_all_any_not_nesting()
	_test_eval_empty_cond_never_fires()
	# StoryEngine.build_snapshot
	_test_build_snapshot_shape()
	# StoryEngine.next_beat
	_test_next_beat_arrival_on_session_start()
	_test_next_beat_resource_threshold_crossing()
	_test_next_beat_flag_gated_only_after_prereq()
	_test_next_beat_one_time_no_refire()
	# StoryEngine.apply_choice
	_test_apply_choice_sets_flags_and_returns_grants()
	_test_apply_choice_unknown_is_noop()
	# StoryState save/load
	_test_story_state_round_trip()
	# GameState integration (the real wired paths)
	_test_gs_session_start_fires_and_enqueues()
	_test_gs_resolve_choice_credits_grants()
	_test_gs_tier_up_event_fires_beat()
	_test_gs_boss_defeat_event_fires_and_cascades()
	_test_gs_build_event_fires_beat()
	_test_gs_order_event_fires_beat()
	# T29 — the three newly-reachable beats (keeper / first gift / bond Liked).
	_test_gs_keeper_event_fires_beat()
	_test_gs_gift_event_fires_first_gift_beat()
	_test_gs_bond_liked_beat_fires_on_threshold()
	_test_gs_beats_do_not_autogrant()
	_test_gs_save_load_round_trips_story()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── assertion helper ────────────────────────────────────────────────────────

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

## A fresh, empty story_state Dictionary (act 1, no flags).
func _fresh_story() -> Dictionary:
	return {"act": 1, "flags": {}, "choice_log": [], "beat_queue": []}

## T24 — drive a FROSTMAW boss DEFEAT (a win) so the boss_defeated story event posts. Arms the
## frostmaw fight by hand (target 30 oak) and meets the target with one chain. The story-engine hooks
## (act2_frostmaw_felled etc.) fire on the post_story_event({"type":"boss_defeated"}) that
## _resolve_boss emits on any win. Returns the win result dict.
func _defeat_frostmaw(g: GameState) -> Dictionary:
	g.boss_active = BossConfig.FROSTMAW
	g.boss_season = "winter"
	g.boss_year = 1
	g.boss_turns_remaining = BossConfig.BOSS_WINDOW_TURNS
	g.boss_target_resource = "tile_tree_oak"
	g.boss_target_amount = 30
	return g.note_boss_chain(Constants.Tile.OAK, 30, 0)   # meets the target → win

# ── StoryConfig (catalog) ─────────────────────────────────────────────────────

func _test_config_loads() -> void:
	var beats := StoryConfig.all_beats()
	# 13 original + 3 T29 additions (act1_keeper_trial / side_first_gift / side_bond_liked) = 16.
	_check(beats.size() == 16, "catalog has the 16 ported beats (got %d)" % beats.size())
	# Spot-check expected ids are present across the arc (incl. the T29 additions).
	for id in ["act1_arrival", "act1_light_hearth", "act1_first_order", "act1_lumber_raised",
			"act1_hamlet", "act1_keeper_trial", "side_first_gift", "side_bond_liked",
			"act2_kitchen", "act2_city_expedition", "act2_quarry_foothold",
			"act2_first_iron", "act2_frostmaw_felled", "frostmaw_aftermath",
			"act3_rats", "act3_finish"]:
		_check(StoryConfig.has_beat(id), "catalog includes '%s'" % id)
	# Genuinely-unportable beats stay OMITTED (no fakes). act1_keeper_trial is NO LONGER here — it
	# became reachable once the keeper system (T31) was ported (see _test_gs_keeper_event_fires_beat).
	for omitted in ["act2_bram_arrives", "act2_first_hinge",
			"act3_caravan", "act3_win", "mira_letter_1", "frostmaw_keeper"]:
		_check(not StoryConfig.has_beat(omitted), "unportable '%s' is OMITTED" % omitted)
	# all_beats() returns a defensive copy (mutating must not corrupt the catalog).
	beats[0]["title"] = "ZZZ"
	_check(String(StoryConfig.beat_by_id("act1_arrival")["title"]) != "ZZZ",
		"all_beats() returns a defensive copy (catalog unchanged)")
	# FLAGS cover the flags the beats set (incl. the T29 additions).
	for f in ["intro_seen", "hearth_lit", "frostmaw_felled", "keeper_path_bound", "settlement_lives",
			"home_keeper_resolved", "first_gift_given", "bond_liked_reached"]:
		_check(StoryConfig.has_flag(f), "FLAGS includes '%s'" % f)

# ── StoryEngine.evaluate_condition: ops ───────────────────────────────────────

func _test_eval_each_op() -> void:
	var snap := {"n": 10, "s": "kitchen", "b": true}
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "eq", "value": 10}, snap), "eq matches")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "eq", "value": 11}, snap), "eq rejects mismatch")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "ne", "value": 11}, snap), "ne matches")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "ne", "value": 10}, snap), "ne rejects equal")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "gte", "value": 10}, snap), "gte matches (equal)")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "gte", "value": 9}, snap), "gte matches (above)")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "gte", "value": 11}, snap), "gte rejects below")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "lte", "value": 10}, snap), "lte matches (equal)")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "lte", "value": 9}, snap), "lte rejects above")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "gt", "value": 9}, snap), "gt matches")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "gt", "value": 10}, snap), "gt rejects equal")
	_check(StoryEngine.evaluate_condition({"fact": "n", "op": "lt", "value": 11}, snap), "lt matches")
	_check(not StoryEngine.evaluate_condition({"fact": "n", "op": "lt", "value": 10}, snap), "lt rejects equal")
	_check(StoryEngine.evaluate_condition({"fact": "s", "op": "eq", "value": "kitchen"}, snap), "eq matches strings")

func _test_eval_truthy_default() -> void:
	var snap := {"b": true, "zero": 0, "empty": "", "off": false}
	# op omitted defaults to "truthy".
	_check(StoryEngine.evaluate_condition({"fact": "b"}, snap), "default op truthy: a set true flag matches")
	_check(StoryEngine.evaluate_condition({"fact": "b", "op": "truthy"}, snap), "explicit truthy matches true")
	_check(not StoryEngine.evaluate_condition({"fact": "zero", "op": "truthy"}, snap), "truthy rejects 0")
	_check(not StoryEngine.evaluate_condition({"fact": "empty", "op": "truthy"}, snap), "truthy rejects empty string")
	_check(not StoryEngine.evaluate_condition({"fact": "off", "op": "truthy"}, snap), "truthy rejects false")

func _test_eval_missing_fact() -> void:
	var snap := {}
	_check(not StoryEngine.evaluate_condition({"fact": "nope", "op": "truthy"}, snap), "missing fact: truthy false")
	# Missing fact reads as 0 for numeric comparisons.
	_check(not StoryEngine.evaluate_condition({"fact": "nope", "op": "gte", "value": 1}, snap), "missing fact: gte 1 false (reads 0)")
	_check(StoryEngine.evaluate_condition({"fact": "nope", "op": "lt", "value": 1}, snap), "missing fact: lt 1 true (reads 0)")
	_check(StoryEngine.evaluate_condition({"fact": "nope", "op": "gte", "value": 0}, snap), "missing fact: gte 0 true (reads 0)")

func _test_eval_all_any_not_nesting() -> void:
	var snap := {"a": 5, "b": "x", "c": true}
	var c_all := {"all": [
		{"fact": "a", "op": "gte", "value": 5},
		{"fact": "b", "op": "eq", "value": "x"},
	]}
	_check(StoryEngine.evaluate_condition(c_all, snap), "all: both true → true")
	var c_all_fail := {"all": [
		{"fact": "a", "op": "gte", "value": 5},
		{"fact": "b", "op": "eq", "value": "y"},
	]}
	_check(not StoryEngine.evaluate_condition(c_all_fail, snap), "all: one false → false")
	var c_any := {"any": [
		{"fact": "a", "op": "eq", "value": 999},
		{"fact": "c", "op": "truthy"},
	]}
	_check(StoryEngine.evaluate_condition(c_any, snap), "any: one true → true")
	var c_any_fail := {"any": [
		{"fact": "a", "op": "eq", "value": 999},
		{"fact": "b", "op": "eq", "value": "zzz"},
	]}
	_check(not StoryEngine.evaluate_condition(c_any_fail, snap), "any: none true → false")
	var c_not := {"not": {"fact": "a", "op": "eq", "value": 999}}
	_check(StoryEngine.evaluate_condition(c_not, snap), "not: negates a false leaf → true")
	# Nested: all[ any[...], not[...] ]
	var nested := {"all": [
		{"any": [{"fact": "a", "op": "lt", "value": 0}, {"fact": "c", "op": "truthy"}]},
		{"not": {"fact": "b", "op": "eq", "value": "y"}},
	]}
	_check(StoryEngine.evaluate_condition(nested, snap), "nested all[any,not] evaluates correctly")

func _test_eval_empty_cond_never_fires() -> void:
	_check(not StoryEngine.evaluate_condition({}, {"anything": 1}), "empty condition never matches")

# ── StoryEngine.build_snapshot ────────────────────────────────────────────────

func _test_build_snapshot_shape() -> void:
	var event := {"type": "tier_up", "tier": 2}
	var inventory := {"hay_bundle": 20, "block": 0}
	var flags := {"hearth_lit": true, "off_flag": false}
	var snap := StoryEngine.build_snapshot(event, inventory, 2, flags)
	_check(String(snap.get("event.type", "")) == "tier_up", "snapshot flattens event.type")
	_check(int(snap.get("event.tier", -1)) == 2, "snapshot flattens event.tier")
	_check(int(snap.get("inventory.hay_bundle", -1)) == 20, "snapshot flattens inventory.<key>")
	_check(int(snap.get("inventory.block", -1)) == 0, "snapshot includes a zero-count inventory key")
	_check(int(snap.get("tier", -1)) == 2, "snapshot includes tier")
	_check(bool(snap.get("flag.hearth_lit", false)), "snapshot exposes a SET flag as flag.<id>")
	_check(not snap.has("flag.off_flag"), "snapshot OMITS a false flag (so truthy reads missing → false)")

# ── StoryEngine.next_beat ─────────────────────────────────────────────────────

func _test_next_beat_arrival_on_session_start() -> void:
	var st := _fresh_story()
	var beat := StoryEngine.next_beat(st, {"type": "session_start"}, {}, 1)
	_check(String(beat.get("id", "")) == "act1_arrival", "session_start selects act1_arrival")
	# After it's marked fired, the same event returns {} (no re-fire).
	var st2 := StoryEngine.apply_beat(st, beat)
	var beat2 := StoryEngine.next_beat(st2, {"type": "session_start"}, {}, 1)
	_check(beat2.is_empty(), "arrival does not re-fire once its marker is set")

func _test_next_beat_resource_threshold_crossing() -> void:
	# act1_light_hearth fires when inventory.hay_bundle >= 20, not before. (intro must
	# be done first since arrival isn't fired in this isolated story state — but
	# light_hearth gates on inventory only, so it can fire independently here.)
	var st := _fresh_story()
	# Below threshold → nothing about hay fires on a chain event.
	var below := StoryEngine.next_beat(st, {"type": "chain", "resource": "hay_bundle"}, {"hay_bundle": 19}, 1)
	_check(String(below.get("id", "")) != "act1_light_hearth", "light_hearth does NOT fire at 19 hay")
	# At/above threshold → it fires.
	var at := StoryEngine.next_beat(st, {"type": "chain", "resource": "hay_bundle"}, {"hay_bundle": 20}, 1)
	_check(String(at.get("id", "")) == "act1_light_hearth", "light_hearth fires at 20 hay")

func _test_next_beat_flag_gated_only_after_prereq() -> void:
	# act3_rats gates on flag.frostmaw_felled (truthy) — only fires after that flag is set.
	var st := _fresh_story()
	# Without the flag, a generic event does not fire rats.
	var before := StoryEngine.next_beat(st, {"type": "chain", "resource": "block"}, {}, 1)
	_check(String(before.get("id", "")) != "act3_rats", "rats does NOT fire before frostmaw_felled")
	# With the flag set, the next event fires rats (assuming earlier beats already fired so
	# they don't preempt — mark the prior boss beat fired too).
	st["flags"]["frostmaw_felled"] = true
	st["flags"][StoryEngine.fired_key("act2_frostmaw_felled")] = true
	var after := StoryEngine.next_beat(st, {"type": "chain", "resource": "block"}, {}, 1)
	_check(String(after.get("id", "")) == "act3_rats", "rats fires once frostmaw_felled is set")

func _test_next_beat_one_time_no_refire() -> void:
	# Fire act1_first_order, mark it, confirm a second order_fulfilled does not refire it.
	var st := _fresh_story()
	var b := StoryEngine.next_beat(st, {"type": "order_fulfilled"}, {}, 1)
	_check(String(b.get("id", "")) == "act1_first_order", "order_fulfilled selects act1_first_order")
	st = StoryEngine.apply_beat(st, b)
	var b2 := StoryEngine.next_beat(st, {"type": "order_fulfilled"}, {}, 1)
	_check(b2.is_empty(), "a second order_fulfilled does not re-fire first_order")

# ── StoryEngine.apply_choice ──────────────────────────────────────────────────

func _test_apply_choice_sets_flags_and_returns_grants() -> void:
	var beat := StoryConfig.beat_by_id("frostmaw_aftermath")
	_check(not beat.is_empty(), "frostmaw_aftermath beat exists")
	var st := _fresh_story()
	# "break" grants block 25 and sets keeper_path_broken.
	var res := StoryEngine.apply_choice(st, beat, "break")
	var new_st: Dictionary = res["story_state"]
	_check(bool(new_st["flags"].get("keeper_choice_made", false)), "choice sets keeper_choice_made")
	_check(bool(new_st["flags"].get("keeper_path_broken", false)), "the 'break' choice sets keeper_path_broken")
	_check(not bool(new_st["flags"].get("keeper_path_bound", false)), "the 'break' choice does NOT set keeper_path_bound")
	var grants: Dictionary = res["grants"]
	_check(int(grants["resources"].get("block", 0)) == 25, "'break' returns 25 block in grants")
	_check(int(grants["coins"]) == 0, "'break' returns 0 coins")
	_check(new_st["choice_log"].size() == 1, "choice is appended to choice_log")
	# "bind" grants 150 coins.
	var res2 := StoryEngine.apply_choice(st, beat, "bind")
	_check(int(res2["grants"]["coins"]) == 150, "'bind' returns 150 coins")
	_check(int(res2["grants"]["resources"].size()) == 0, "'bind' returns no resources")
	_check(bool(res2["story_state"]["flags"].get("keeper_path_bound", false)), "'bind' sets keeper_path_bound")

func _test_apply_choice_unknown_is_noop() -> void:
	var beat := StoryConfig.beat_by_id("frostmaw_aftermath")
	var st := _fresh_story()
	var res := StoryEngine.apply_choice(st, beat, "nonexistent")
	_check(int(res["grants"]["coins"]) == 0 and res["grants"]["resources"].is_empty(),
		"unknown choice id grants nothing")
	_check(res["story_state"]["flags"].is_empty(), "unknown choice sets no flags")

# ── StoryState save/load ──────────────────────────────────────────────────────

func _test_story_state_round_trip() -> void:
	var s := StoryState.new()
	s.act = 2
	s.flags["frostmaw_felled"] = true
	s.flags[StoryEngine.fired_key("act2_frostmaw_felled")] = true
	s.choice_log.append({"beat_id": "frostmaw_aftermath", "choice_id": "bind"})
	s.beat_queue.append("act3_rats")
	var d := s.to_dict()
	var s2 := StoryState.from_dict(d)
	_check(s2.act == 2, "round-trip preserves act")
	_check(s2.has_flag("frostmaw_felled"), "round-trip preserves a story flag")
	_check(s2.is_fired("act2_frostmaw_felled"), "round-trip preserves a fired marker")
	_check(s2.choice_log.size() == 1 and String(s2.choice_log[0]["choice_id"]) == "bind",
		"round-trip preserves choice_log")
	_check(s2.beat_queue.has("act3_rats"), "round-trip preserves beat_queue")
	# A missing/empty dict yields a fresh act-1 state.
	var fresh := StoryState.from_dict({})
	_check(fresh.act == 1 and fresh.flags.is_empty() and fresh.beat_queue.is_empty(),
		"from_dict({}) yields a fresh act-1 story state")
	# A false flag is dropped on load (keeps the flag map a clean set-of-true).
	var s3 := StoryState.from_dict({"act": 1, "flags": {"x": false, "y": true}})
	_check(not s3.flags.has("x") and s3.has_flag("y"), "from_dict drops false flags, keeps true ones")

# ── GameState integration (the real wired paths) ──────────────────────────────

func _test_gs_session_start_fires_and_enqueues() -> void:
	var g := GameState.new()
	var fired := g.start_story_session()
	_check(fired.size() == 1 and String(fired[0]) == "act1_arrival",
		"start_story_session fires exactly [act1_arrival] on a fresh state")
	_check(g.story.is_fired("act1_arrival"), "arrival is marked fired on the GameState's story")
	_check(g.story.has_flag("intro_seen"), "arrival's on_complete sets intro_seen")
	_check(g.story.beat_queue.has("act1_arrival"), "arrival is enqueued for the UI slice")
	# Calling again does nothing (one-time).
	var again := g.start_story_session()
	_check(again.is_empty(), "a second session_start fires nothing (arrival already fired)")

func _test_gs_resolve_choice_credits_grants() -> void:
	# Drive a boss defeat so frostmaw_aftermath is queued, then resolve a choice and
	# confirm GameState credits the grant.
	var g := GameState.new()
	_defeat_frostmaw(g)   # DEFEAT → posts boss_defeated → fires act2_frostmaw_felled (+queues aftermath)
	_check(g.story.is_fired("act2_frostmaw_felled"), "boss defeat fires act2_frostmaw_felled via the wired path")
	_check(g.story.beat_queue.has("frostmaw_aftermath"), "the aftermath choice beat is queued")
	var coins_before := g.coins
	var res := g.resolve_story_choice("frostmaw_aftermath", "bind")
	_check(bool(res["ok"]), "resolve_story_choice ok for a real choice")
	_check(g.coins == coins_before + 150, "the 'bind' choice credits +150 coins via resolve_story_choice")
	_check(g.story.has_flag("keeper_path_bound"), "the choice sets keeper_path_bound on the GameState story")
	# The 'break' path credits a resource (use a fresh defeat).
	var g2 := GameState.new()
	_defeat_frostmaw(g2)
	var block_before := g2.qty("block")
	g2.resolve_story_choice("frostmaw_aftermath", "break")
	_check(g2.qty("block") == block_before + 25, "the 'break' choice credits +25 block (cap path)")
	# An unknown choice is a clean no-op.
	var bad := g2.resolve_story_choice("frostmaw_aftermath", "nope")
	_check(not bool(bad["ok"]), "an unknown choice id returns ok=false")

func _test_gs_tier_up_event_fires_beat() -> void:
	# A real try_tier_up to Hamlet (tier 2) fires act1_hamlet via the wired path.
	var g := GameState.new()
	# Give exactly the Hamlet cost (hay_bundle 12, flour 6) and tier up.
	g.inventory["hay_bundle"] = 50
	g.inventory["flour"] = 50
	var r := g.try_tier_up()
	_check(bool(r["ok"]) and int(r["tier"]) == 2, "try_tier_up reaches Hamlet (tier 2)")
	_check(g.story.is_fired("act1_hamlet"), "tier_up to Hamlet fires act1_hamlet via the wired path")
	_check(g.story.beat_queue.has("act1_hamlet"), "act1_hamlet is enqueued")

func _test_gs_boss_defeat_event_fires_and_cascades() -> void:
	# A boss defeat fires act2_frostmaw_felled AND cascades to act3_rats (which gates on
	# flag.frostmaw_felled, now set in the same post_story_event loop).
	var g := GameState.new()
	_defeat_frostmaw(g)
	_check(g.story.is_fired("act2_frostmaw_felled"), "boss defeat fires the wyrm beat")
	_check(g.story.is_fired("act3_rats"), "the same boss_defeated event CASCADES to fire act3_rats")
	_check(g.story.has_flag("rats_arrived"), "act3_rats sets rats_arrived")
	_check(g.story.beat_queue.has("frostmaw_aftermath"), "the queued aftermath beat is enqueued")

func _test_gs_build_event_fires_beat() -> void:
	# Building the Lumber Camp fires act1_lumber_raised via the wired build() path.
	var g := GameState.new()
	g.settlement.tier = TownConfig.TIER_HAMLET   # Lumber Camp unlocks at Hamlet
	var cost := BuildingConfig.building_cost(BuildingConfig.LUMBER_CAMP)
	for k in cost.keys():
		g.inventory[k] = int(cost[k])
	var r := g.build(BuildingConfig.LUMBER_CAMP)
	_check(bool(r["ok"]), "build(lumber_camp) succeeds")
	_check(g.story.is_fired("act1_lumber_raised"), "building lumber_camp fires act1_lumber_raised via the wired path")
	# Building the Kitchen fires act2_kitchen.
	var g2 := GameState.new()
	g2.settlement.tier = TownConfig.TIER_TOWN    # Kitchen unlocks at Town
	var kcost := BuildingConfig.building_cost(BuildingConfig.KITCHEN)
	for k in kcost.keys():
		g2.inventory[k] = int(kcost[k])
	g2.build(BuildingConfig.KITCHEN)
	_check(g2.story.is_fired("act2_kitchen"), "building kitchen fires act2_kitchen via the wired path")

func _test_gs_order_event_fires_beat() -> void:
	# Filling an order fires act1_first_order via the wired fill_order() path.
	var g := GameState.new()
	g.orders = [{"resource": "hay_bundle", "qty": 3, "reward": 10}]
	g.inventory["hay_bundle"] = 10
	var r := g.fill_order(0)
	_check(bool(r["ok"]), "fill_order succeeds")
	_check(g.story.is_fired("act1_first_order"), "filling an order fires act1_first_order via the wired path")

func _test_gs_keeper_event_fires_beat() -> void:
	# T29: resolving the home (farm) keeper fires act1_keeper_trial via the wired give_keeper_reward
	# path. The keeper needs `appears_after_buildings` (4) buildings to be encounter-ready; stub the
	# built list so the gate passes without standing up the whole tier ladder.
	var g := GameState.new()
	var need: int = KeeperConfig.appears_after_buildings("farm")
	for i in need:
		g.buildings.append("stub_%d" % i)   # only the COUNT matters to keeper_encounter_ready
	var res := g.give_keeper_reward("farm", "coexist")
	_check(bool(res.get("ok", false)), "give_keeper_reward(farm, coexist) succeeds when encounter-ready")
	_check(g.story.has_flag("keeper_farm_coexist"), "give_keeper_reward sets the keeper_farm_coexist flag")
	_check(g.story.is_fired("act1_keeper_trial"), "resolving the home keeper fires act1_keeper_trial via the wired path")
	_check(g.story.has_flag("home_keeper_resolved"), "act1_keeper_trial sets home_keeper_resolved")
	_check(g.story.act >= 2, "act1_keeper_trial (act 2) advances the story act to 2")
	# The drive-out path fires it too (a fresh game).
	var g2 := GameState.new()
	for i in need:
		g2.buildings.append("stub_%d" % i)
	g2.give_keeper_reward("farm", "driveout")
	_check(g2.story.is_fired("act1_keeper_trial"), "the drive-out path also fires act1_keeper_trial")

func _test_gs_gift_event_fires_first_gift_beat() -> void:
	# T29: the first gift to a villager fires side_first_gift via the wired give_gift path.
	var g := GameState.new()
	var npc: String = String(NpcConfig.all_ids()[0])   # any real roster NPC
	g.inventory["bread"] = 2                            # something to gift
	var res := g.give_gift(npc, "bread")
	_check(bool(res.get("ok", false)), "give_gift succeeds with stock + a fresh season")
	_check(g.story.is_fired("side_first_gift"), "the first gift fires side_first_gift via the wired path")
	_check(g.story.has_flag("first_gift_given"), "side_first_gift sets first_gift_given")

func _test_gs_bond_liked_beat_fires_on_threshold() -> void:
	# T29: side_bond_liked fires when a gift/order pushes a villager's bond into Liked (>= 7). Seed
	# the bond just below 7, then a gift carries the NEW bond on event.bond >= 7 → the beat fires.
	var g := GameState.new()
	var npc: String = String(NpcConfig.all_ids()[0])
	g.gain_bond(npc, 6.9 - g.npc_bond(npc))   # set the bond to 6.9 (Warm, just below Liked)
	g.inventory["bread"] = 2
	# A gift bumps the bond by at least +0.15 → >= 7.05 → Liked. event.bond carries the new bond.
	var res := g.give_gift(npc, "bread")
	_check(bool(res.get("ok", false)), "give_gift succeeds (bond seeded near Liked)")
	_check(g.npc_bond(npc) >= 7.0, "the gift pushed the bond into the Liked band (>= 7)")
	_check(g.story.is_fired("side_bond_liked"), "crossing into Liked fires side_bond_liked via the wired gift path")
	_check(g.story.has_flag("bond_liked_reached"), "side_bond_liked sets bond_liked_reached")
	# Below the threshold it does NOT fire: a fresh game, one gift from the 5.0 default stays < 7.
	var g2 := GameState.new()
	var npc2: String = String(NpcConfig.all_ids()[0])
	g2.inventory["bread"] = 2
	g2.give_gift(npc2, "bread")
	_check(not g2.story.is_fired("side_bond_liked"), "a single gift from the default bond does NOT fire side_bond_liked")

func _test_gs_beats_do_not_autogrant() -> void:
	# CRITICAL: firing beats (no choices resolved) must NOT add resources/coins beyond the
	# normal economy. A boss defeat credits its boss reward + first_blood achievement, but
	# the STORY beat that fires must add nothing. Re-derive: a frostmaw win at exactly the target
	# (progress 30, year 1) pays boss_reward 200 + first_blood 200 = 400.
	var g := GameState.new()
	var coins_before := g.coins
	_defeat_frostmaw(g)   # fires act2_frostmaw_felled + cascades act3_rats — neither grants
	var boss_pay: int = int(BossConfig.boss_reward(BossConfig.FROSTMAW, 30, 1)["coins"])
	var expected := coins_before + boss_pay + 200  # +first_blood
	_check(g.coins == expected,
		"boss-defeat coins == boss reward + first_blood ONLY (story beats add nothing): got %d, want %d" % [g.coins, expected])
	# And a plain chain that fires a threshold beat adds no extra coins beyond the chain payout.
	var g2 := GameState.new()
	g2.inventory["hay_bundle"] = 19      # one short of the light_hearth threshold (20)
	# A grass chain of 6 → 1 hay unit → inventory 20 → fires act1_light_hearth. coins should
	# be exactly the chain payout (max(1,6/2)=3) + first_steps (+25, the FIRST chain). No story coins.
	var c0 := g2.coins
	g2.credit_chain(T.GRASS, 6)
	_check(g2.story.is_fired("act1_light_hearth"), "crossing 20 hay via a chain fires light_hearth")
	_check(g2.coins == c0 + 3 + 25, "the light_hearth beat adds NO coins (only chain payout + first_steps): got %d" % g2.coins)

func _test_gs_save_load_round_trips_story() -> void:
	var g := GameState.new()
	g.start_story_session()                       # fires arrival (flag + marker + queue)
	g.inventory["hay_bundle"] = 20
	g.credit_chain(T.GRASS, 6)                     # crosses 20+ hay → fires light_hearth
	_defeat_frostmaw(g)                            # fires wyrm + cascades rats; queues aftermath
	g.resolve_story_choice("frostmaw_aftermath", "bind")  # logs a choice
	var d := g.to_dict()
	_check(d.has("story"), "to_dict includes the story snapshot")
	var g2 := GameState.from_dict(d)
	_check(g2.story.is_fired("act1_arrival"), "save→load preserves arrival fired marker")
	_check(g2.story.has_flag("hearth_lit"), "save→load preserves hearth_lit flag")
	_check(g2.story.is_fired("act2_frostmaw_felled"), "save→load preserves the wyrm fired marker")
	_check(g2.story.has_flag("keeper_path_bound"), "save→load preserves a choice-set flag")
	_check(g2.story.choice_log.size() == g.story.choice_log.size() and g.story.choice_log.size() == 1,
		"save→load preserves choice_log")
	_check(g2.story.act == g.story.act, "save→load preserves story act")
	# A fired beat must NOT re-fire after load: re-posting session_start does nothing.
	var refired := g2.start_story_session()
	_check(refired.is_empty(), "after load, a re-posted session_start fires nothing (markers restored)")
	# A pre-story save (no "story" key) loads with a fresh act-1 story state.
	var old_save := {"inventory": {}, "progress": {}, "coins": 0, "turn": 0}
	var g3 := GameState.from_dict(old_save)
	_check(g3.story != null and g3.story.act == 1 and g3.story.flags.is_empty(),
		"a pre-story save loads with a fresh act-1 story state")
