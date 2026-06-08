extends SceneTree
## Headless GOLDEN round-trip test for GameState save persistence — the pre-refactor
## guard for Track E (splitting GameState into composed domain objects). It builds a
## representative MID-RUN GameState, snapshots it with to_dict(), rebuilds it with
## GameState.from_dict(), and asserts:
##   1. the rebuilt state matches the original FIELD-BY-FIELD (the data survives),
##   2. gs.to_dict() == gs2.to_dict() — the FLAT save dict round-trips byte-for-byte,
##   3. the FLAT shape is preserved: specific keys (npcs, tools, achievement_counters,
##      coins, …) sit at the TOP level of the dict, NOT nested under a sub-object.
## (3) is the load-bearing assertion: a future split that accidentally nests a key
## under a composed sub-object (e.g. emits {"npc_state": {"npcs": …}} instead of a
## top-level "npcs") would change the on-disk shape and is caught here.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_gamestate_roundtrip_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_state_tests.gd.

const T := Constants.Tile

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── GameState save round-trip golden ───────────────")
	_test_midrun_round_trip()
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

# ── build a representative mid-run state ──────────────────────────────────────

## A non-trivial GameState exercising every subsystem the golden guards: coins,
## inventory across several resources, fractional chain progress (carry-over), a
## placed building, an active order, a non-default NPC bond, owned tool charges, an
## unlocked achievement, advanced turns, and a couple of currency totals.
func _build_midrun() -> GameState:
	var g := GameState.new()
	# Chains: drive real economy state (inventory + progress carry-over + coins + turn
	# + the wired achievement counters). 13 grass → 2 hay_bundle, progress 1.
	g.credit_chain(T.GRASS, 13)
	g.credit_chain(T.WHEAT, 4)   # below flour threshold 5 → progress 4 (carry)
	g.credit_chain(T.GRASS, 5)   # more grass progress
	# Seed extra inventory directly so a recipe/order/building cost is affordable.
	g.inventory["flour"] = 40
	g.inventory["hay_bundle"] = int(g.inventory.get("hay_bundle", 0)) + 60
	g.inventory["plank"] = 12
	g.coins = 500
	# A placed spawner building (consumes a plot; LUMBER_CAMP unlocks at the Camp tier).
	var built: Dictionary = g.build(BuildingConfig.LUMBER_CAMP)
	if not bool(built.get("ok", false)):
		push_error("setup: failed to build lumber_camp: " + str(built))
	# An active order, hand-built so it is deterministic (resource we hold plenty of).
	g.orders = [{"resource": "hay_bundle", "qty": 5, "reward": 30, "base_reward": 30, "npc": "mira"}]
	# A non-default NPC bond (5.0 → 6.7 Warm; another driven Sour for variety).
	g.gain_bond("wren", 1.7)
	g.gain_bond("liss", -2.0)
	# Owned tool charges (two tools, stacking).
	g.grant_tool("stone_hammer", 3)
	g.grant_tool("bomb", 1)
	# An explicitly-unlocked achievement via the wired counter path (distinct buildings).
	g.bump_counter("distinct_buildings_built", 1, "lumber_camp")
	# A second currency + a structural-ish field for breadth.
	g.runes = 7
	g.influence = 3
	return g

# ── the golden round-trip ─────────────────────────────────────────────────────

func _test_midrun_round_trip() -> void:
	var gs := _build_midrun()
	var d: Dictionary = gs.to_dict()

	# (3) FLAT-SHAPE GUARD — these keys MUST live at the TOP level of the save dict.
	# A split that nests any of them under a sub-object would break the on-disk shape.
	for key in [
		"inventory", "progress", "coins", "turn", "settlement", "buildings", "orders",
		"npcs", "active_biome", "mine_turns_left", "farm_turns_used",
		"harbor_turns_left", "fish_tide", "fish_tide_turn", "fish_pearl", "runes",
		"boss_active", "boss_hp", "town2_complete", "ratcatcher_charges_used",
		"audio_muted", "tools", "achievement_counters", "achievements_unlocked",
		"_distinct_seen", "story", "workers", "tutorial_seen",
		"daily_last_claimed", "daily_streak_day", "castle_contributed",
		"influence", "decorations", "portal_built", "quests", "quest_day",
		"quest_seed", "almanac_xp", "almanac_level", "almanac_claimed",
		"almanac_structural",
	]:
		_check(d.has(key), "to_dict has top-level flat key '%s'" % key)

	# The npcs flat key keeps its {roster, bonds} sub-shape (NOT a renamed/nested form).
	_check(d["npcs"] is Dictionary and (d["npcs"] as Dictionary).has("roster") \
			and (d["npcs"] as Dictionary).has("bonds"),
		"flat 'npcs' key carries the {roster, bonds} shape")
	# tools is a flat dict; pending_tool is TRANSIENT and must NOT be persisted.
	_check(d["tools"] is Dictionary, "flat 'tools' key is a Dictionary")
	_check(not d.has("pending_tool"), "transient pending_tool is NOT persisted")

	# Rebuild from the snapshot.
	var gs2: GameState = GameState.from_dict(d)

	# (1) FIELD-BY-FIELD equality of the rebuilt state vs the original.
	_check(gs2.coins == gs.coins, "round-trip preserves coins")
	_check(gs2.turn == gs.turn, "round-trip preserves turn")
	_check(gs2.runes == gs.runes, "round-trip preserves runes")
	_check(gs2.influence == gs.influence, "round-trip preserves influence")
	_check(gs2.inventory == gs.inventory, "round-trip preserves inventory (full dict)")
	_check(gs2.progress == gs.progress, "round-trip preserves progress (carry-over)")
	_check(gs2.buildings == gs.buildings, "round-trip preserves placed buildings")
	_check(gs2.orders == gs.orders, "round-trip preserves the order board")
	_check(gs2.settlement.tier == gs.settlement.tier, "round-trip preserves settlement tier")
	_check(gs2.active_biome == gs.active_biome, "round-trip preserves active_biome")
	# NPC roster + bonds.
	_check(gs2.npcs["roster"] == gs.npcs["roster"], "round-trip preserves the NPC roster")
	_check(is_equal_approx(gs2.npc_bond("wren"), gs.npc_bond("wren")), "round-trip preserves wren bond")
	_check(is_equal_approx(gs2.npc_bond("liss"), gs.npc_bond("liss")), "round-trip preserves liss bond")
	# Tools.
	_check(gs2.tool_count("stone_hammer") == gs.tool_count("stone_hammer"),
		"round-trip preserves stone_hammer charges")
	_check(gs2.tool_count("bomb") == gs.tool_count("bomb"), "round-trip preserves bomb charges")
	_check(gs2.tools == gs.tools, "round-trip preserves the full tools dict")
	# Achievements.
	_check(gs2.achievement_counters == gs.achievement_counters,
		"round-trip preserves achievement_counters")
	_check(gs2.achievements_unlocked == gs.achievements_unlocked,
		"round-trip preserves achievements_unlocked")
	_check(gs2._distinct_seen == gs._distinct_seen, "round-trip preserves _distinct_seen")

	# (2) BYTE-FOR-BYTE: re-snapshotting the rebuilt state yields the identical dict.
	var d2: Dictionary = gs2.to_dict()
	_check(d == d2, "gs.to_dict() == gs2.to_dict() (flat save round-trips byte-for-byte)")
