extends SceneTree
## Headless unit-test runner for the NPC roster + bonding system — ported from the
## React npcs feature (src/features/npcs/data.ts + bond.ts). Covers NpcConfig
## (roster, bond bands, bond_modifier, reward_with_bond, clamping) and the GameState
## bonding wiring: the npcs field (roster + float bonds), npc_bond / gain_bond
## (clamping), generate_order attaching an npc + base_reward, fill_order paying the
## bond-ADJUSTED payout while raising the npc's bond, the ×1.15 Liked payout once a
## bond reaches 7, save/load round-trip of npcs, an old (npc-less) save loading
## defensively, and seeded determinism of the attached npc.
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_npc_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.
##
## Same dependency-free harness style as tests/run_orders_tests.gd. `class_name`
## globals are aliased with `var` (not `const`) because a class_name ref is not a
## constant expression in 4.6.

# class_name globals → plain member vars (not const; see header note).
var NC := NpcConfig
var OC := OrderConfig

var _checks: int = 0
var _failures: int = 0

func _initialize() -> void:
	print("\n── NPC roster + bonding tests ─────────────────────")
	_test_roster()
	_test_bond_bands()
	_test_reward_with_bond()
	_test_npc_bond_gain_bond_clamp()
	_test_generate_order_attaches_npc()
	_test_fill_pays_base_and_raises_bond()
	_test_liked_bond_pays_more()
	_test_gift_tiers()
	_test_gift_apply()
	_test_gift_cooldown()
	_test_gift_clamp()
	_test_gift_guards()
	_test_gift_save_round_trip()
	_test_save_round_trip()
	_test_old_save_defensive()
	_test_determinism()
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

# ── NpcConfig roster ──────────────────────────────────────────────────────────

func _test_roster() -> void:
	var ids: Array = NC.all_ids()
	_check(ids.size() == 5, "roster has exactly 5 NPCs")
	for expected in ["wren", "mira", "tomas", "bram", "liss"]:
		_check(ids.has(expected), "roster includes '%s'" % expected)
		_check(NC.has(expected), "NpcConfig.has('%s') true" % expected)
	_check(not NC.has("nobody"), "NpcConfig.has('nobody') false")
	# A representative name + role pairing (wren=Scout).
	_check(NC.display_name("wren") == "Wren", "display_name(wren) == 'Wren'")
	_check(NC.role("wren") == "Scout", "role(wren) == 'Scout'")
	_check(NC.role("mira") == "Baker", "role(mira) == 'Baker'")
	_check(NC.role("tomas") == "Beekeeper", "role(tomas) == 'Beekeeper'")
	_check(NC.role("bram") == "Smith", "role(bram) == 'Smith'")
	_check(NC.role("liss") == "Physician", "role(liss) == 'Physician'")
	_check(NC.display_name("nobody") == "", "display_name(unknown) == ''")
	_check(NC.role("nobody") == "", "role(unknown) == ''")
	# Every roster entry carries a color string.
	var all_colored := true
	for n in NC.NPCS:
		if not (n.has("color") and n["color"] is String and not String(n["color"]).is_empty()):
			all_colored = false
	_check(all_colored, "every NPC entry has a non-empty color")

# ── bond_band / bond_modifier ─────────────────────────────────────────────────

func _test_bond_bands() -> void:
	# Representative bonds → band name + multiplier.
	_check(NC.bond_band(3.0)["name"] == "Sour" and is_equal_approx(NC.bond_modifier(3.0), 0.70),
		"bond 3 → Sour ×0.70")
	_check(NC.bond_band(5.0)["name"] == "Warm" and is_equal_approx(NC.bond_modifier(5.0), 1.00),
		"bond 5 → Warm ×1.00")
	# 6.9 floors to 6 → still Warm (the additive guarantee: <7 stays ×1.00).
	_check(NC.bond_band(6.9)["name"] == "Warm" and is_equal_approx(NC.bond_modifier(6.9), 1.00),
		"bond 6.9 floors to 6 → Warm ×1.00")
	_check(NC.bond_band(7.0)["name"] == "Liked" and is_equal_approx(NC.bond_modifier(7.0), 1.15),
		"bond 7 → Liked ×1.15")
	_check(NC.bond_band(10.0)["name"] == "Beloved" and is_equal_approx(NC.bond_modifier(10.0), 1.25),
		"bond 10 → Beloved ×1.25")
	# Clamping: below 0 reads as the lowest band (Sour); above 10 reads as Beloved.
	_check(is_equal_approx(NC.bond_modifier(-5.0), 0.70), "bond < 0 clamps to Sour ×0.70")
	_check(is_equal_approx(NC.bond_modifier(99.0), 1.25), "bond > 10 clamps to Beloved ×1.25")

# ── reward_with_bond ──────────────────────────────────────────────────────────

func _test_reward_with_bond() -> void:
	_check(NC.reward_with_bond(100, 5.0) == 100, "reward_with_bond(100, 5) == 100 (Warm, identity)")
	_check(NC.reward_with_bond(100, 7.0) == 115, "reward_with_bond(100, 7) == 115 (Liked)")
	_check(NC.reward_with_bond(100, 9.0) == 125, "reward_with_bond(100, 9) == 125 (Beloved)")
	_check(NC.reward_with_bond(100, 3.0) == 70, "reward_with_bond(100, 3) == 70 (Sour)")
	# 6.9 still floors to Warm → identity.
	_check(NC.reward_with_bond(100, 6.9) == 100, "reward_with_bond(100, 6.9) == 100 (floors to Warm)")

# ── npc_bond / gain_bond clamp ────────────────────────────────────────────────

func _test_npc_bond_gain_bond_clamp() -> void:
	var g := GameState.new()
	# Every roster NPC starts at the Warm default 5.0.
	for id in NC.all_ids():
		_check(g.npc_bond(id) == 5.0, "fresh npc_bond(%s) == 5.0" % id)
	# An unknown id reads as the Warm default too (no phantom band).
	_check(g.npc_bond("nobody") == 5.0, "npc_bond(unknown) defaults to 5.0")
	# gain_bond adjusts and clamps to [0, 10].
	g.gain_bond("wren", 0.3)
	_check(is_equal_approx(g.npc_bond("wren"), 5.3), "gain_bond(wren, 0.3) → 5.3")
	g.gain_bond("wren", 100.0)
	_check(g.npc_bond("wren") == 10.0, "gain_bond clamps high at 10.0")
	g.gain_bond("wren", -100.0)
	_check(g.npc_bond("wren") == 0.0, "gain_bond clamps low at 0.0")
	# Bonds are stored as floats.
	_check(g.npcs["bonds"]["wren"] is float, "stored bond is a float")

# ── generate_order attaches an npc + base_reward ──────────────────────────────

func _test_generate_order_attaches_npc() -> void:
	var g := GameState.new()
	g.seed_orders(424242)
	var roster: Array = g.npcs["roster"]
	for i in 30:
		var o: Dictionary = g.generate_order()
		_check(o.has("npc") and roster.has(String(o["npc"])),
			"generate_order #%d attaches an npc in the roster" % i)
		_check(o.has("base_reward") and int(o["base_reward"]) == int(o["reward"]),
			"generate_order #%d base_reward == reward (base unchanged)" % i)

# ── fill_order at default bond pays base AND raises bond ───────────────────────

func _test_fill_pays_base_and_raises_bond() -> void:
	var g := GameState.new()
	# A KNOWN order from a KNOWN npc at the default bond (5.0 → Warm → ×1.00). The
	# payout must equal base_reward exactly — the additive default-bond guarantee.
	g.orders = [{"resource": "hay_bundle", "qty": 5, "reward": 30, "base_reward": 30, "npc": "mira"}]
	g.inventory["hay_bundle"] = 5
	g.coins = 0
	var before: float = g.npc_bond("mira")
	var res: Dictionary = g.fill_order(0)
	_check(bool(res["ok"]), "fill_order succeeds")
	_check(int(res["reward"]) == 30, "default-bond payout == base 30 (×1.00 identity)")
	_check(g.coins == 30, "coins credited the base payout 30")
	_check(res.get("npc", "") == "mira", "fill result carries the npc")
	_check(is_equal_approx(g.npc_bond("mira"), before + 0.3), "filling raised mira's bond by 0.3")

# ── once a bond reaches Liked (≥7) the order pays ×1.15 ────────────────────────

func _test_liked_bond_pays_more() -> void:
	var g := GameState.new()
	# Push bram into Liked (7.0) and fill an order from bram with base 200.
	g.gain_bond("bram", 2.0) # 5.0 → 7.0
	_check(g.npc_bond("bram") == 7.0, "(setup) bram bond pushed to 7.0 (Liked)")
	g.orders = [{"resource": "flour", "qty": 4, "reward": 200, "base_reward": 200, "npc": "bram"}]
	g.inventory["flour"] = 4
	g.coins = 0
	var res: Dictionary = g.fill_order(0)
	_check(bool(res["ok"]), "fill_order from a Liked npc succeeds")
	_check(int(res["reward"]) == 230, "Liked payout == round(200 × 1.15) == 230")
	_check(g.coins == 230, "coins credited the Liked-adjusted payout 230")

# ── save / load round-trips npcs (roster + float bonds) ───────────────────────

func _test_save_round_trip() -> void:
	var g := GameState.new()
	g.gain_bond("wren", 1.7)   # 6.7
	g.gain_bond("liss", -2.0)  # 3.0
	var d: Dictionary = g.to_dict()
	_check(d.has("npcs"), "to_dict includes npcs")
	var loaded := GameState.from_dict(d)
	_check(loaded.npcs["roster"] == g.npcs["roster"], "load preserves the roster")
	_check(is_equal_approx(loaded.npc_bond("wren"), 6.7), "load preserves wren bond 6.7")
	_check(is_equal_approx(loaded.npc_bond("liss"), 3.0), "load preserves liss bond 3.0")
	_check(loaded.npcs["bonds"]["wren"] is float, "loaded bond is a float")
	# An out-of-range saved bond is clamped on load.
	var corrupt: Dictionary = g.to_dict()
	corrupt["npcs"]["bonds"]["bram"] = 99.0
	var loaded2 := GameState.from_dict(corrupt)
	_check(loaded2.npc_bond("bram") == 10.0, "out-of-range saved bond clamps to 10.0 on load")

# ── old save (no npcs / npc-less orders) loads defensively ─────────────────────

func _test_old_save_defensive() -> void:
	# A save written before npcs existed: no "npcs" key, and an order with no npc /
	# no base_reward (just the legacy resource/qty/reward).
	var old_save: Dictionary = {
		"coins": 10,
		"orders": [{"resource": "flour", "qty": 3, "reward": 18}],
	}
	var s := GameState.from_dict(old_save)
	# Missing npcs → the default roster at the Warm default 5.0.
	_check(s.npcs["roster"] == NC.all_ids(), "missing npcs → default roster")
	for id in NC.all_ids():
		_check(s.npc_bond(id) == 5.0, "missing npcs → %s defaults to 5.0" % id)
	# The npc-less order still fills: base falls back to reward (18), npc to wren,
	# default bond ×1.00 → payout 18 (identical to the pre-bonding economy).
	s.inventory["flour"] = 3
	s.coins = 0
	var res: Dictionary = s.fill_order(0)
	_check(bool(res["ok"]), "old npc-less order still fills")
	_check(int(res["reward"]) == 18, "old order pays its base reward 18 (×1.00 default bond)")
	_check(res.get("npc", "") == GameState.DEFAULT_ORDER_NPC, "old order falls back to the default npc (wren)")
	_check(is_equal_approx(s.npc_bond("wren"), 5.3), "filling an old order still raises the fallback npc's bond")

# ── T18: gift preference tiers (NpcConfig) ────────────────────────────────────

func _test_gift_tiers() -> void:
	# Per-tier deltas (React GIFT_DELTAS): loves +0.5, likes +0.3, neutral +0.15.
	_check(is_equal_approx(NC.GIFT_LOVES, 0.5), "GIFT_LOVES delta is 0.5")
	_check(is_equal_approx(NC.GIFT_LIKES, 0.3), "GIFT_LIKES delta is 0.3")
	_check(is_equal_approx(NC.GIFT_NEUTRAL, 0.15), "GIFT_NEUTRAL delta is 0.15")
	# mira: loves flour/bread, likes honey/jam. flour → loves, honey → likes, plank → neutral.
	_check(NC.gift_tier("mira", "flour") == "loves", "mira loves flour")
	_check(NC.gift_tier("mira", "bread") == "loves", "mira loves bread")
	_check(NC.gift_tier("mira", "honey") == "likes", "mira likes honey")
	_check(NC.gift_tier("mira", "jam") == "likes", "mira likes jam")
	_check(NC.gift_tier("mira", "plank") == "neutral", "mira is neutral on plank")
	# bram: loves iron_bar/coke, likes block.
	_check(NC.gift_tier("bram", "iron_bar") == "loves", "bram loves iron_bar")
	_check(NC.gift_tier("bram", "coke") == "loves", "bram loves coke")
	_check(NC.gift_tier("bram", "block") == "likes", "bram likes block")
	# Unknown NPC → everything neutral.
	_check(NC.gift_tier("nobody", "flour") == "neutral", "unknown npc → neutral tier")
	# gift_delta maps each tier to the right delta.
	_check(is_equal_approx(NC.gift_delta("loves"), 0.5), "gift_delta(loves) == 0.5")
	_check(is_equal_approx(NC.gift_delta("likes"), 0.3), "gift_delta(likes) == 0.3")
	_check(is_equal_approx(NC.gift_delta("neutral"), 0.15), "gift_delta(neutral) == 0.15")
	# Every NPC carries non-empty loves + likes lists, all inventory resources (not tile_* keys).
	var all_resource_prefs := true
	for id in NC.all_ids():
		for k in NC.loves_of(id) + NC.likes_of(id):
			if String(k).begins_with("tile_"):
				all_resource_prefs = false
	_check(all_resource_prefs, "every gift preference is an inventory resource (no tile_* keys)")

# ── T18: give_gift consumes + bumps bond by the tier delta (GameState) ─────────

func _test_gift_apply() -> void:
	var g := GameState.new()
	# Loved gift: mira loves flour (+0.5). Stock 2 flour, give one.
	g.inventory["flour"] = 2
	var before: float = g.npc_bond("mira")
	_check(g.can_gift("mira", "flour"), "can_gift(mira, flour) true with stock + no cooldown")
	var res: Dictionary = g.give_gift("mira", "flour")
	_check(bool(res["ok"]), "give_gift(mira, flour) ok")
	_check(String(res["tier"]) == "loves", "gift result tier == loves")
	_check(is_equal_approx(float(res["delta"]), 0.5), "gift delta == 0.5 (loved)")
	_check(is_equal_approx(g.npc_bond("mira"), before + 0.5), "mira bond rose by 0.5")
	_check(g.qty("flour") == 1, "give_gift consumed one flour (2 → 1)")

	# Liked gift to a DIFFERENT npc (tomas likes bread, +0.3). Different season-mate so no cooldown clash.
	var g2 := GameState.new()
	g2.inventory["bread"] = 1
	var b2: float = g2.npc_bond("tomas")
	var res2: Dictionary = g2.give_gift("tomas", "bread")
	_check(bool(res2["ok"]) and String(res2["tier"]) == "likes", "tomas bread gift is a 'likes' tier")
	_check(is_equal_approx(g2.npc_bond("tomas"), b2 + 0.3), "tomas bond rose by 0.3 (liked)")
	_check(not g2.inventory.has("bread"), "fully-consumed bread key erased")

	# Neutral gift (+0.15): give mira a resource she neither loves nor likes (plank).
	var g3 := GameState.new()
	g3.inventory["plank"] = 1
	var b3: float = g3.npc_bond("mira")
	var res3: Dictionary = g3.give_gift("mira", "plank")
	_check(bool(res3["ok"]) and String(res3["tier"]) == "neutral", "plank to mira is a neutral gift")
	_check(is_equal_approx(g3.npc_bond("mira"), b3 + 0.15), "mira bond rose by 0.15 (neutral)")

# ── T18: once-per-season cooldown ──────────────────────────────────────────────

func _test_gift_cooldown() -> void:
	var g := GameState.new()
	g.inventory["flour"] = 5
	# Fresh state is season 0 (Spring). First gift succeeds.
	_check(g.current_season_index() == 0, "(precondition) fresh state is season 0")
	_check(bool(g.give_gift("mira", "flour")["ok"]), "first gift this season succeeds")
	# A SECOND gift to mira THIS season is blocked (cooldown), no further consume / bond bump.
	_check(not g.can_gift("mira", "flour"), "can_gift(mira) false during the season cooldown")
	var bond_after_first: float = g.npc_bond("mira")
	var flour_after_first: int = g.qty("flour")
	var second: Dictionary = g.give_gift("mira", "flour")
	_check(not bool(second["ok"]) and String(second.get("reason", "")) == "cooldown",
		"second gift this season is rejected with reason 'cooldown'")
	_check(g.npc_bond("mira") == bond_after_first, "bond unchanged by the blocked second gift")
	_check(g.qty("flour") == flour_after_first, "no flour consumed by the blocked second gift")
	# A DIFFERENT npc is still giftable this season (cooldown is per-NPC).
	g.inventory["jam"] = 1
	_check(bool(g.give_gift("liss", "jam")["ok"]), "a different npc is still giftable this season")
	# Advancing the SEASON clears mira's cooldown (farm_turns_used 5 of a 10-budget → Autumn/season 2).
	g.farm_turns_used = 5
	_check(g.current_season_index() != 0, "(precondition) season advanced away from 0")
	_check(g.can_gift("mira", "flour"), "mira giftable again in a new season")
	_check(bool(g.give_gift("mira", "flour")["ok"]), "gift succeeds again in the new season")

# ── T18: bond clamps at 10 across repeated gifts ───────────────────────────────

func _test_gift_clamp() -> void:
	var g := GameState.new()
	# Push mira near the cap, then a loved gift must clamp at 10 (not overshoot).
	g.gain_bond("mira", 4.8)   # 5.0 → 9.8
	g.inventory["flour"] = 1
	_check(is_equal_approx(g.npc_bond("mira"), 9.8), "(setup) mira bond at 9.8")
	var res: Dictionary = g.give_gift("mira", "flour")   # +0.5 would be 10.3 → clamps to 10
	_check(bool(res["ok"]), "near-cap loved gift succeeds")
	_check(g.npc_bond("mira") == 10.0, "bond clamps at 10.0 (9.8 + 0.5 → 10.0)")
	_check(is_equal_approx(float(res["bond"]), 10.0), "gift result reports the clamped bond 10.0")

# ── T18: give_gift guards (unknown npc / no stock) ─────────────────────────────

func _test_gift_guards() -> void:
	var g := GameState.new()
	g.inventory["flour"] = 1
	# Unknown NPC → reason "unknown", no mutation.
	var u: Dictionary = g.give_gift("nobody", "flour")
	_check(not bool(u["ok"]) and String(u.get("reason", "")) == "unknown", "unknown npc gift → reason 'unknown'")
	_check(g.qty("flour") == 1, "no flour consumed on unknown-npc gift")
	# No stock → reason "no_stock".
	var ns: Dictionary = g.give_gift("mira", "honey")   # holds 0 honey
	_check(not bool(ns["ok"]) and String(ns.get("reason", "")) == "no_stock", "no-stock gift → reason 'no_stock'")
	_check(not g.can_gift("mira", "honey"), "can_gift false with no stock")

# ── T18: gift cooldown survives save/load ──────────────────────────────────────

func _test_gift_save_round_trip() -> void:
	var g := GameState.new()
	g.inventory["flour"] = 2
	g.inventory["jam"] = 1
	_check(bool(g.give_gift("mira", "flour")["ok"]), "(setup) gifted mira in season 0")
	# Persist + reload — the cooldown for mira (season 0) must survive so a reloaded game
	# still blocks a same-season re-gift, while a never-gifted NPC stays giftable.
	var d: Dictionary = g.to_dict()
	_check(d["npcs"].has("giftCooldown"), "to_dict npcs includes giftCooldown")
	var loaded := GameState.from_dict(d)
	loaded.inventory["flour"] = 2
	loaded.inventory["jam"] = 1
	_check(loaded.current_season_index() == 0, "(precondition) reloaded state is season 0")
	_check(not loaded.can_gift("mira", "flour"), "reloaded game still blocks mira's same-season re-gift")
	_check(loaded.can_gift("tomas", "jam"), "a never-gifted NPC is still giftable after load")
	# The bond from the gift also persisted (mira got +0.5).
	_check(is_equal_approx(loaded.npc_bond("mira"), 5.5), "reloaded mira bond carries the gift's +0.5")

# ── determinism: seeded generation reproduces the same orders (incl. npc) ──────

func _test_determinism() -> void:
	var a := GameState.new()
	a.seed_orders(13579)
	var b := GameState.new()
	b.seed_orders(13579)
	var all_match := true
	for i in 15:
		var oa: Dictionary = a.generate_order()
		var ob: Dictionary = b.generate_order()
		if oa["resource"] != ob["resource"] or int(oa["qty"]) != int(ob["qty"]) \
				or int(oa["reward"]) != int(ob["reward"]) or String(oa["npc"]) != String(ob["npc"]):
			all_match = false
	_check(all_match, "two equally-seeded GameStates generate identical orders (incl. npc)")
