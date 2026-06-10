extends SceneTree
## Headless tests for the Keeper economy + Boons feature (T31, ported from src/keepers.ts +
## src/features/boons). Layers:
##
##   1. KeeperConfig data — the 3 keepers (ids/names/icons/appearsAfterBuildings) + dialogue +
##      per-path rewards (5 Embers coexist / 5 Core Ingots driveout), carried VERBATIM from keepers.ts.
##   2. BoonConfig data — the 6 catalogs × 2 boons (12 total) with the right ids/costs/effects,
##      + the pure helpers (all_boons / boon_by_id / boon_is_unlocked / can_afford / boon_effect_mult).
##   3. GameState.give_keeper_reward — grants the right currency + sets the path flag, ONCE per type
##      (final). keeper_encounter_ready off the built-building threshold.
##   4. GameState boon purchase — boon_unlocked only when its path flag is set; can_purchase_boon +
##      purchase_boon gated on unlocked+afford+not-owned, deducts the cost, marks owned;
##      boon_effect_mult composes across owned boons.
##   5. The two effect channels — coin_gain_mult multiplies credit_chain coins; bond_gain_mult
##      multiplies the order-fill + gift bond gains; a FRESH game leaves both at 1.0 (byte-identical).
##   6. save/load — embers/core_ingots/boons round-trip; the keeper flags ride in story.flags;
##      missing keys default to 0/0/{}.
##   7. ViewRouter — the BOONS + KEEPER modals (open/resolve/modal_id/known_ids).
##   8. BoonsScreen + KeeperModal rendering — real data, real mutation, the action-button contract.
##   9. Main integration — _open_boons / _open_keeper + apply_deeplink("boons"/"keeper") + the
##      keeper ENCOUNTER auto-trigger off buildings.size() >= appearsAfterBuildings, + the choice.
##
## Same dependency-free harness as run_portal_tests.gd. Run from the godot/ project root:
##   godot --headless --script res://tests/run_boons_tests.gd
## Exits 0 when every check passes, 1 on any failure — so CI can gate on it.

const BoonsScreenScript := preload("res://scenes/BoonsScreen.gd")
const KeeperModalScript := preload("res://scenes/KeeperModal.gd")

var _checks: int = 0
var _failures: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_closed() -> void:
	_closed_count += 1

## Build a GameState whose home settlement is "built up" past the FARM keeper threshold by
## stuffing N real building ids into `buildings`. Uses the first N ids from the build roster.
func _game_with_buildings(n: int) -> GameState:
	var g := GameState.new()
	var added := 0
	for id in BuildingConfig.ALL_BUILD_IDS:
		if added >= n:
			break
		g.buildings.append(String(id))
		added += 1
	return g

func _initialize() -> void:
	print("\n── Boons + Keeper tests ───────────────────────────")

	# ── 1. KeeperConfig data ───────────────────────────────────────────────────────
	_check(KeeperConfig.KEEPER_TYPES.size() == 3, "KeeperConfig has 3 keeper types")
	_check(KeeperConfig.has_keeper("farm") and KeeperConfig.has_keeper("mine") and KeeperConfig.has_keeper("harbor"),
		"has_keeper true for farm/mine/harbor")
	_check(not KeeperConfig.has_keeper("bogus"), "has_keeper false for bogus")

	_check(KeeperConfig.keeper_id("farm") == "deer_spirit", "farm keeper id deer_spirit")
	_check(KeeperConfig.keeper_id("mine") == "stone_knocker", "mine keeper id stone_knocker")
	_check(KeeperConfig.keeper_id("harbor") == "tidesinger", "harbor keeper id tidesinger")
	_check(KeeperConfig.keeper_name("farm") == "The Deer-Spirit", "farm keeper name")
	_check(KeeperConfig.keeper_icon("farm") == "🦌", "farm keeper icon 🦌")
	_check(KeeperConfig.keeper_icon("mine") == "🪨", "mine keeper icon 🪨")
	_check(KeeperConfig.keeper_icon("harbor") == "🌊", "harbor keeper icon 🌊")

	# appearsAfterBuildings carried verbatim (farm 4, mine 3, harbor 3).
	_check(KeeperConfig.appears_after_buildings("farm") == 4, "farm appearsAfterBuildings 4")
	_check(KeeperConfig.appears_after_buildings("mine") == 3, "mine appearsAfterBuildings 3")
	_check(KeeperConfig.appears_after_buildings("harbor") == 3, "harbor appearsAfterBuildings 3")

	# Dialogue present.
	_check(KeeperConfig.intro_lines("farm").size() == 3, "farm has 3 intro lines")
	_check(KeeperConfig.path_pitch("farm", "coexist").size() == 2, "farm coexist pitch has 2 lines")
	_check(KeeperConfig.path_pitch("farm", "driveout").size() == 2, "farm driveout pitch has 2 lines")
	_check(KeeperConfig.path_label("farm", "coexist") == "Stay — tend the land with me.", "farm coexist label verbatim")
	_check(KeeperConfig.path_label("mine", "driveout") == "The stone is mine.", "mine driveout label verbatim")

	# Rewards: 5 Embers (coexist) / 5 Core Ingots (driveout) for every keeper.
	for t in ["farm", "mine", "harbor"]:
		_check(KeeperConfig.coexist_embers(t) == 5, "%s coexist grants 5 embers" % t)
		_check(KeeperConfig.driveout_core_ingots(t) == 5, "%s driveout grants 5 core ingots" % t)

	# The path flag id.
	_check(KeeperConfig.flag_for("farm", "coexist") == "keeper_farm_coexist", "flag_for(farm,coexist)")
	_check(KeeperConfig.flag_for("mine", "driveout") == "keeper_mine_driveout", "flag_for(mine,driveout)")
	_check(KeeperConfig.flag_for("farm", "bogus") == "", "flag_for bad path → ''")

	# ── 2. BoonConfig data ──────────────────────────────────────────────────────────
	_check(BoonConfig.count() == 12, "BoonConfig has 12 boons total")
	_check(BoonConfig.all_boons().size() == 12, "all_boons() returns 12")
	_check(BoonConfig.CATALOG_KEYS.size() == 6, "6 catalog keys")
	for ck in BoonConfig.CATALOG_KEYS:
		_check(BoonConfig.catalog(String(ck)).size() == 2, "%s catalog has 2 boons" % String(ck))

	# Spot-check the 12 boons VERBATIM: id, cost, effect.
	var dB := BoonConfig.boon_by_id("deer_blessing")
	_check(dB.get("name") == "Deer-Blessing" and int(dB.get("cost", {}).get("embers", 0)) == 3
		and dB.get("effect", {}).get("type") == "bond_gain_mult" and float(dB.get("effect", {}).get("mult", 0)) == 1.2,
		"deer_blessing: 3 embers, bond×1.2")
	var hT := BoonConfig.boon_by_id("hearth_thrift")
	_check(int(hT.get("cost", {}).get("embers", 0)) == 8 and float(hT.get("effect", {}).get("mult", 0)) == 1.15
		and hT.get("effect", {}).get("type") == "coin_gain_mult", "hearth_thrift: 8 embers, coin×1.15")
	var iM := BoonConfig.boon_by_id("iron_market")
	_check(int(iM.get("cost", {}).get("core_ingots", 0)) == 5 and float(iM.get("effect", {}).get("mult", 0)) == 1.2
		and iM.get("effect", {}).get("type") == "coin_gain_mult", "iron_market: 5 core_ingots, coin×1.2")
	var dC := BoonConfig.boon_by_id("drilled_corps")
	_check(int(dC.get("cost", {}).get("core_ingots", 0)) == 8 and float(dC.get("effect", {}).get("mult", 0)) == 1.1
		and dC.get("effect", {}).get("type") == "bond_gain_mult", "drilled_corps: 8 core_ingots, bond×1.1")
	var dF := BoonConfig.boon_by_id("deep_friendship")
	_check(int(dF.get("cost", {}).get("embers", 0)) == 5 and float(dF.get("effect", {}).get("mult", 0)) == 1.15
		and dF.get("effect", {}).get("type") == "bond_gain_mult", "deep_friendship: 5 embers, bond×1.15")
	var vR := BoonConfig.boon_by_id("vein_richness")
	_check(int(vR.get("cost", {}).get("embers", 0)) == 8 and float(vR.get("effect", {}).get("mult", 0)) == 1.2
		and vR.get("effect", {}).get("type") == "coin_gain_mult", "vein_richness: 8 embers, coin×1.2")
	var iT := BoonConfig.boon_by_id("ingot_thrift")
	_check(int(iT.get("cost", {}).get("core_ingots", 0)) == 5 and float(iT.get("effect", {}).get("mult", 0)) == 1.2
		and iT.get("effect", {}).get("type") == "coin_gain_mult", "ingot_thrift: 5 core_ingots, coin×1.2")
	var fD := BoonConfig.boon_by_id("foreman_drills")
	_check(int(fD.get("cost", {}).get("core_ingots", 0)) == 8 and float(fD.get("effect", {}).get("mult", 0)) == 1.1
		and fD.get("effect", {}).get("type") == "bond_gain_mult", "foreman_drills: 8 core_ingots, bond×1.1")
	var sA := BoonConfig.boon_by_id("sailor_amity")
	_check(int(sA.get("cost", {}).get("embers", 0)) == 5 and float(sA.get("effect", {}).get("mult", 0)) == 1.2
		and sA.get("effect", {}).get("type") == "bond_gain_mult", "sailor_amity: 5 embers, bond×1.2")
	var pT := BoonConfig.boon_by_id("pearl_trove")
	_check(int(pT.get("cost", {}).get("embers", 0)) == 8 and float(pT.get("effect", {}).get("mult", 0)) == 1.15
		and pT.get("effect", {}).get("type") == "coin_gain_mult", "pearl_trove: 8 embers, coin×1.15")
	var hTar := BoonConfig.boon_by_id("harbor_tariff")
	_check(int(hTar.get("cost", {}).get("core_ingots", 0)) == 5 and float(hTar.get("effect", {}).get("mult", 0)) == 1.25
		and hTar.get("effect", {}).get("type") == "coin_gain_mult", "harbor_tariff: 5 core_ingots, coin×1.25")
	var pG := BoonConfig.boon_by_id("press_gang")
	_check(int(pG.get("cost", {}).get("core_ingots", 0)) == 8 and float(pG.get("effect", {}).get("mult", 0)) == 1.05
		and pG.get("effect", {}).get("type") == "bond_gain_mult", "press_gang: 8 core_ingots, bond×1.05")

	_check(BoonConfig.boon_by_id("bogus").is_empty(), "boon_by_id('bogus') == {}")
	_check(BoonConfig.path_of_catalog("farm_coexist") == "coexist", "path_of_catalog farm_coexist → coexist")
	_check(BoonConfig.path_of_catalog("harbor_driveout") == "driveout", "path_of_catalog harbor_driveout → driveout")
	_check(BoonConfig.type_of_catalog("harbor_driveout") == "harbor", "type_of_catalog harbor_driveout → harbor")

	# boon_is_unlocked: only when ANY keeper_*_<path> flag is set (kingdom-wide, path-gated).
	_check(not BoonConfig.boon_is_unlocked({}, dB), "deer_blessing locked with no flags")
	_check(BoonConfig.boon_is_unlocked({"keeper_farm_coexist": true}, dB),
		"deer_blessing (coexist) unlocked by keeper_farm_coexist")
	# Kingdom-wide: a MINE coexist flag unlocks a FARM coexist boon (path-gated, not per-type).
	_check(BoonConfig.boon_is_unlocked({"keeper_mine_coexist": true}, dB),
		"farm coexist boon unlocked by ANY coexist flag (kingdom-wide)")
	# But a driveout flag does NOT unlock a coexist boon.
	_check(not BoonConfig.boon_is_unlocked({"keeper_farm_driveout": true}, dB),
		"coexist boon NOT unlocked by a driveout flag")
	_check(BoonConfig.boon_is_unlocked({"keeper_farm_driveout": true}, iM),
		"driveout boon iron_market unlocked by keeper_farm_driveout")

	# can_afford.
	_check(BoonConfig.can_afford(3, 0, dB), "can_afford deer_blessing with 3 embers")
	_check(not BoonConfig.can_afford(2, 0, dB), "cannot afford deer_blessing with 2 embers")
	_check(BoonConfig.can_afford(0, 5, iM), "can_afford iron_market with 5 core_ingots")
	_check(not BoonConfig.can_afford(99, 4, iM), "cannot afford iron_market with 4 core_ingots")

	# boon_effect_mult composition.
	_check(BoonConfig.boon_effect_mult({}, "coin_gain_mult") == 1.0, "empty owned → coin mult 1.0")
	_check(abs(BoonConfig.boon_effect_mult({"hearth_thrift": true}, "coin_gain_mult") - 1.15) < 0.0001,
		"one coin boon → 1.15")
	# Two coin boons compose: 1.15 * 1.2 = 1.38.
	_check(abs(BoonConfig.boon_effect_mult({"hearth_thrift": true, "iron_market": true}, "coin_gain_mult") - 1.38) < 0.0001,
		"two coin boons compose 1.15*1.2 = 1.38")
	# A bond boon does NOT contribute to the coin channel.
	_check(abs(BoonConfig.boon_effect_mult({"deer_blessing": true}, "coin_gain_mult") - 1.0) < 0.0001,
		"bond boon doesn't affect coin channel")
	_check(abs(BoonConfig.boon_effect_mult({"deer_blessing": true}, "bond_gain_mult") - 1.2) < 0.0001,
		"deer_blessing → bond mult 1.2")

	# ── 3. GameState.give_keeper_reward + keeper_encounter_ready ──────────────────────
	# Not ready below the building threshold.
	var g0 := _game_with_buildings(3)            # farm needs 4
	_check(not g0.keeper_encounter_ready("farm"), "farm encounter NOT ready at 3 buildings (<4)")
	var bad := g0.give_keeper_reward("farm", "coexist")
	_check(not bool(bad.get("ok", true)) and String(bad.get("reason", "")) == "not_ready",
		"give_keeper_reward not_ready below threshold")
	_check(g0.embers == 0, "no embers granted when not ready")

	# Ready at 4 buildings → coexist grants 5 embers + sets the flag.
	var gc := _game_with_buildings(4)
	_check(gc.keeper_encounter_ready("farm"), "farm encounter ready at 4 buildings")
	_check(not gc.keeper_resolved("farm"), "farm keeper unresolved before choice")
	var rc := gc.give_keeper_reward("farm", "coexist")
	_check(bool(rc.get("ok", false)), "give_keeper_reward(farm,coexist) ok")
	_check(gc.embers == 5, "coexist granted 5 embers")
	_check(gc.core_ingots == 0, "coexist granted 0 core ingots")
	_check(bool(gc.story.flags.get("keeper_farm_coexist", false)), "keeper_farm_coexist flag set")
	_check(gc.keeper_resolved("farm"), "farm keeper resolved after choice")
	_check(gc.keeper_path_for("farm") == "coexist", "keeper_path_for(farm) == coexist")
	# FINAL: a second call (any path) is a no-op (no double grant).
	var rc2 := gc.give_keeper_reward("farm", "driveout")
	_check(not bool(rc2.get("ok", true)) and String(rc2.get("reason", "")) == "resolved",
		"second give_keeper_reward → resolved (no double grant)")
	_check(gc.embers == 5 and gc.core_ingots == 0, "currencies unchanged after the rejected second choice")
	_check(not gc.keeper_encounter_ready("farm"), "encounter no longer ready once resolved")

	# Drive Out grants 5 core ingots + sets the driveout flag.
	var gd := _game_with_buildings(4)
	var rd := gd.give_keeper_reward("farm", "driveout")
	_check(bool(rd.get("ok", false)), "give_keeper_reward(farm,driveout) ok")
	_check(gd.core_ingots == 5 and gd.embers == 0, "driveout granted 5 core ingots, 0 embers")
	_check(bool(gd.story.flags.get("keeper_farm_driveout", false)), "keeper_farm_driveout flag set")

	# ── 3b. Feature flag (KeeperConfig.enabled) — the whole encounter system off-switch ──────────────
	# Flip the flag OFF at runtime and assert the full off-contract, then reset so the auto-trigger /
	# deeplink sections below run with the default ON. (Shipped default is ON; this is the only block
	# that exercises the OFF path.) DISABLED here means: never encounter-ready, the grant is refused,
	# and no currency is ever produced — so the dependent Boons economy simply has no source.
	KeeperConfig.enabled = false
	var gff := _game_with_buildings(4)
	_check(not gff.keeper_encounter_ready("farm"), "flag OFF: keeper_encounter_ready('farm') false even at 4 buildings")
	var rff := gff.give_keeper_reward("farm", "coexist")
	_check(not bool(rff.get("ok", true)) and String(rff.get("reason", "")) == "disabled",
		"flag OFF: give_keeper_reward refused with reason 'disabled'")
	_check(gff.embers == 0 and gff.core_ingots == 0, "flag OFF: no Embers/Core Ingots granted")
	KeeperConfig.enabled = true
	_check(KeeperConfig.is_enabled(), "flag reset back ON for the remaining checks")

	# Bad type / path guards.
	var gx := _game_with_buildings(4)
	_check(String(gx.give_keeper_reward("bogus", "coexist").get("reason", "")) == "unknown", "unknown type → unknown")
	_check(String(gx.give_keeper_reward("farm", "bogus").get("reason", "")) == "bad_path", "bad path → bad_path")

	# ── 4. GameState boon purchase + boon_unlocked + boon_effect_mult ─────────────────
	# Locked before any keeper choice.
	var gp := GameState.new()
	_check(not gp.boon_unlocked("deer_blessing"), "deer_blessing locked on a fresh game")
	var pl := gp.purchase_boon("deer_blessing")
	_check(not bool(pl.get("ok", true)) and String(pl.get("reason", "")) == "locked",
		"purchase_boon locked before keeper choice")

	# Coexist chosen → coexist boons unlock. Seed 5 embers (the grant).
	gp.story.flags["keeper_farm_coexist"] = true
	gp.embers = 5
	_check(gp.boon_unlocked("deer_blessing"), "deer_blessing unlocked after coexist flag")
	_check(not gp.boon_unlocked("iron_market"), "iron_market (driveout) still locked")
	# Purchase deer_blessing (3 embers): deducts + marks owned.
	_check(gp.can_purchase_boon("deer_blessing"), "can_purchase deer_blessing (unlocked + 5>=3)")
	var pd := gp.purchase_boon("deer_blessing")
	_check(bool(pd.get("ok", false)), "purchase deer_blessing ok")
	_check(gp.embers == 2, "embers deducted 3 (5-3=2)")
	_check(gp.has_boon("deer_blessing"), "deer_blessing owned after purchase")
	# Re-purchase rejected (owned).
	var pr := gp.purchase_boon("deer_blessing")
	_check(not bool(pr.get("ok", true)) and String(pr.get("reason", "")) == "owned", "re-purchase → owned")
	_check(gp.embers == 2, "embers unchanged on re-purchase")
	# hearth_thrift (8 embers) — unlocked but unaffordable (only 2 embers).
	_check(not gp.can_purchase_boon("hearth_thrift"), "hearth_thrift unaffordable (2<8)")
	var pa := gp.purchase_boon("hearth_thrift")
	_check(not bool(pa.get("ok", true)) and String(pa.get("reason", "")) == "cant_afford", "purchase → cant_afford")
	# Owned deer_blessing now drives the bond channel mult.
	_check(abs(gp.boon_effect_mult("bond_gain_mult") - 1.2) < 0.0001, "owned deer_blessing → bond mult 1.2")
	_check(abs(gp.boon_effect_mult("coin_gain_mult") - 1.0) < 0.0001, "no coin boon owned → coin mult 1.0")

	# Composition through GameState: own a second coin boon via driveout path.
	gp.story.flags["keeper_farm_driveout"] = true
	gp.core_ingots = 20
	gp.purchase_boon("iron_market")              # coin×1.2
	gp.embers = 20
	gp.purchase_boon("hearth_thrift")            # coin×1.15
	_check(abs(gp.boon_effect_mult("coin_gain_mult") - 1.38) < 0.0001,
		"two owned coin boons compose 1.2*1.15 = 1.38 via GameState")

	# ── 5. The two effect channels wired into the economy ─────────────────────────────
	# FRESH game: coin_gain_mult is 1.0 → credit_chain coins are byte-identical to baseline.
	var gfresh := GameState.new()
	var T := Constants.Tile
	var base_res := gfresh.credit_chain(T.GRASS, 6)
	var base_coins := int(base_res.get("coins_gain", 0))
	_check(base_coins > 0, "fresh credit_chain yields coins")
	_check(abs(gfresh.boon_effect_mult("coin_gain_mult") - 1.0) < 0.0001, "fresh coin mult 1.0")

	# With a coin boon owned, the SAME chain yields floor(base * mult) coins.
	var gcoin := GameState.new()
	gcoin.story.flags["keeper_farm_driveout"] = true
	gcoin.boons["iron_market"] = true            # coin×1.2
	var boon_res := gcoin.credit_chain(T.GRASS, 6)
	var expected := int(floor(float(base_coins) * 1.2))
	_check(int(boon_res.get("coins_gain", -1)) == expected,
		"coin_gain_mult multiplies chain coins (%d → %d ×1.2)" % [base_coins, expected])

	# bond_gain_mult: a gift's bond delta scales by the bond multiplier.
	# Baseline gift delta (no boon).
	var gbase := GameState.new()
	gbase.inventory["hay_bundle"] = 1
	var gift_npc := String(NpcConfig.all_ids()[0])
	var before_base := gbase.npc_bond(gift_npc)
	gbase.give_gift(gift_npc, "hay_bundle")
	var base_delta := gbase.npc_bond(gift_npc) - before_base
	_check(base_delta > 0.0, "fresh gift raises bond by a positive delta")
	# With a bond boon owned, the same gift raises the bond by base_delta * 1.2.
	var gbond := GameState.new()
	gbond.story.flags["keeper_farm_coexist"] = true
	gbond.boons["deer_blessing"] = true          # bond×1.2
	gbond.inventory["hay_bundle"] = 1
	var before_boon := gbond.npc_bond(gift_npc)
	gbond.give_gift(gift_npc, "hay_bundle")
	var boon_delta := gbond.npc_bond(gift_npc) - before_boon
	_check(abs(boon_delta - base_delta * 1.2) < 0.0001,
		"bond_gain_mult scales gift bond delta (%.3f → %.3f ×1.2)" % [base_delta, boon_delta])

	# bond_gain_mult also scales the order-fill bond gain (+0.3 base).
	var gobase := GameState.new()
	gobase.inventory["bread"] = 99
	# Build a deliverable order via the public path: seed a hand-built order.
	var order_npc := String(NpcConfig.all_ids()[0])
	gobase.orders = [{"resource": "bread", "qty": 1, "reward": 5, "base_reward": 5, "npc": order_npc}]
	var ob_before := gobase.npc_bond(order_npc)
	gobase.fill_order(0)
	var ob_delta := gobase.npc_bond(order_npc) - ob_before
	_check(abs(ob_delta - GameState.BOND_GAIN_PER_FILL) < 0.0001, "fresh order-fill bond gain == BOND_GAIN_PER_FILL")
	var goboon := GameState.new()
	goboon.story.flags["keeper_farm_coexist"] = true
	goboon.boons["deer_blessing"] = true         # bond×1.2
	goboon.inventory["bread"] = 99
	goboon.orders = [{"resource": "bread", "qty": 1, "reward": 5, "base_reward": 5, "npc": order_npc}]
	var obn_before := goboon.npc_bond(order_npc)
	goboon.fill_order(0)
	var obn_delta := goboon.npc_bond(order_npc) - obn_before
	_check(abs(obn_delta - GameState.BOND_GAIN_PER_FILL * 1.2) < 0.0001,
		"bond_gain_mult scales order-fill bond gain ×1.2")

	# ── 6. save/load round-trip + missing-key defaults ────────────────────────────────
	var gsv := GameState.new()
	gsv.embers = 7
	gsv.core_ingots = 3
	gsv.story.flags["keeper_farm_coexist"] = true
	gsv.boons["deer_blessing"] = true
	gsv.boons["iron_market"] = true
	var snap := gsv.to_dict()
	_check(snap.has("embers") and snap.has("core_ingots") and snap.has("boons"),
		"to_dict includes embers/core_ingots/boons")
	var restored := GameState.from_dict(snap)
	_check(restored.embers == 7 and restored.core_ingots == 3, "round-trip currencies")
	_check(restored.has_boon("deer_blessing") and restored.has_boon("iron_market"), "round-trip owned boons")
	_check(bool(restored.story.flags.get("keeper_farm_coexist", false)), "round-trip keeper flag (via story.flags)")
	_check(restored.keeper_resolved("farm"), "restored keeper resolved")
	# Missing keys (a pre-T31 save) → defaults.
	var legacy := GameState.from_dict({"coins": 5})
	_check(legacy.embers == 0 and legacy.core_ingots == 0 and legacy.boons.is_empty(),
		"missing keys → embers/core_ingots 0 + empty boons (back-compat)")
	# Corrupt boon id dropped on load.
	var corrupt := GameState.from_dict({"boons": {"bogus_boon": true, "deer_blessing": true}})
	_check(not corrupt.has_boon("bogus_boon") and corrupt.has_boon("deer_blessing"),
		"from_dict drops a bogus boon id, keeps a real one")

	# Fresh game = all mults 1.0 (the additive guarantee).
	var gng := GameState.new_game()
	_check(gng.embers == 0 and gng.core_ingots == 0 and gng.boons.is_empty(), "new_game: 0/0/{} keeper economy")
	_check(abs(gng.boon_effect_mult("coin_gain_mult") - 1.0) < 0.0001, "new_game coin mult 1.0")
	_check(abs(gng.boon_effect_mult("bond_gain_mult") - 1.0) < 0.0001, "new_game bond mult 1.0")

	# ── 7. ViewRouter — BOONS + KEEPER modals ─────────────────────────────────────────
	var rt := ViewRouter.new()
	rt.open_modal(ViewRouter.Modal.BOONS)
	_check(rt.current_modal() == ViewRouter.Modal.BOONS, "current_modal() == BOONS")
	rt.close_modal()
	_check(rt.current_modal() == ViewRouter.Modal.NONE, "close_modal resets to NONE")
	var d_boons := ViewRouter.resolve("boons")
	_check(bool(d_boons.get("ok", false)) and int(d_boons.get("modal", -1)) == ViewRouter.Modal.BOONS,
		"resolve('boons') → BOONS")
	_check(int(ViewRouter.resolve("boon").get("modal", -1)) == ViewRouter.Modal.BOONS, "resolve('boon') alias → BOONS")
	_check(int(ViewRouter.resolve("keeper").get("modal", -1)) == ViewRouter.Modal.KEEPER, "resolve('keeper') → KEEPER")
	_check(ViewRouter.modal_id(ViewRouter.Modal.BOONS) == "boons", "modal_id(BOONS) == 'boons'")
	_check(ViewRouter.modal_id(ViewRouter.Modal.KEEPER) == "keeper", "modal_id(KEEPER) == 'keeper'")
	_check(ViewRouter.known_ids().has("boons") and ViewRouter.known_ids().has("keeper"),
		"known_ids contains boons + keeper")

	# ── 8a. BoonsScreen rendering ─────────────────────────────────────────────────────
	var sg := GameState.new()                     # fresh: nothing unlocked
	var screen = BoonsScreenScript.new()
	root.add_child(screen)
	screen.setup(sg)
	await process_frame
	screen.open()
	screen.connect("closed", Callable(self, "_on_closed"))
	_check(screen.visible, "boons screen visible after open()")
	_check(screen._action_buttons.has("close"), "_action_buttons has 'close'")
	_check(screen.total_count() == 12, "screen.total_count() == 12")
	_check(screen._cards.size() == 12, "one card per boon (12 cards)")
	# Fresh: no boon unlocked → no Claim buttons rendered (locked badges instead).
	_check(screen._claim_buttons.is_empty(), "no Claim buttons when nothing unlocked")
	_check(screen._header_label.text.contains("0"), "header shows 0 Embers / Core Ingots")

	# Unlock coexist + seed embers → coexist boons get Claim buttons; an affordable one enables.
	sg.story.flags["keeper_farm_coexist"] = true
	sg.embers = 5
	screen.refresh()
	_check(screen._claim_buttons.has("deer_blessing"), "deer_blessing has a Claim button after unlock")
	_check(not screen._claim_buttons["deer_blessing"].disabled, "deer_blessing Claim enabled (5>=3)")
	_check(not screen._claim_buttons.has("iron_market"), "iron_market (driveout) still no Claim (locked)")
	# Real purchase through the screen → GameState mutates + the card flips to Owned (no Claim btn).
	screen._claim_buttons["deer_blessing"].emit_signal("pressed")
	_check(sg.has_boon("deer_blessing"), "screen Claim purchased deer_blessing")
	_check(sg.embers == 2, "screen Claim deducted 3 embers")
	_check(not screen._claim_buttons.has("deer_blessing"), "owned boon no longer has a Claim button")
	_check(screen._header_label.text.contains("2"), "header re-rendered to 2 Embers")
	# Close fires + hides.
	var before_closed := _closed_count
	screen._action_buttons["close"].emit_signal("pressed")
	_check(_closed_count == before_closed + 1, "boons closed signal fired")
	_check(not screen.visible, "boons screen hidden after close")

	# ── 8b. KeeperModal rendering ─────────────────────────────────────────────────────
	var kg := _game_with_buildings(4)
	var modal = KeeperModalScript.new()
	root.add_child(modal)
	modal.setup(kg)
	await process_frame
	modal.open_for("farm")
	_check(modal.visible, "keeper modal visible after open_for")
	_check(modal.current_type() == "farm", "keeper modal type == farm")
	_check(not modal.is_resolved(), "keeper modal in INTRO state (unresolved)")
	_check(modal._action_buttons.has("coexist") and modal._action_buttons.has("driveout"),
		"INTRO: both path buttons present")
	_check(modal._line_rows.size() == 3, "INTRO renders the 3 intro lines")
	# Choose Coexist → real reward + flip to PITCH state.
	modal._action_buttons["coexist"].emit_signal("pressed")
	_check(kg.embers == 5, "keeper modal Coexist granted 5 embers")
	_check(bool(kg.story.flags.get("keeper_farm_coexist", false)), "keeper modal Coexist set the flag")
	_check(modal.is_resolved() and modal.current_path() == "coexist", "modal flipped to PITCH (coexist)")
	_check(modal._action_buttons.has("continue") and not modal._action_buttons.has("coexist"),
		"PITCH: Continue present, path buttons gone")

	# ── 9. Main integration ───────────────────────────────────────────────────────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	main.game.farm_run_active = true             # so apply_deeplink('board') hides overlays (run-gate)
	# Dismiss the first-launch tutorial modal that _ready auto-opens (it sits in the board-close
	# cascade ahead of the secondary views and would otherwise be the one hidden by a board return).
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false

	_check(main.has_method("_open_boons"), "Main has _open_boons()")
	_check(main.has_method("_open_keeper"), "Main has _open_keeper()")
	_check(main.has_method("_maybe_trigger_keeper"), "Main has _maybe_trigger_keeper()")
	_check(main._boons_screen == null, "boons screen lazy (null before open)")

	# apply_deeplink("boons") opens it + sets the router modal.
	var ok_boons: bool = main.apply_deeplink("boons")
	_check(ok_boons, "apply_deeplink('boons') returns true")
	_check(main._boons_screen != null and main._boons_screen.visible, "apply_deeplink('boons') shows the screen")
	_check(main._router.current_modal() == ViewRouter.Modal.BOONS, "router modal == BOONS")
	# Close back to the board.
	main.apply_deeplink("board")
	_check(not main._boons_screen.visible, "boons hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE, "router NONE after board")

	# apply_deeplink("keeper") opens the encounter (QA path).
	var ok_keeper: bool = main.apply_deeplink("keeper")
	_check(ok_keeper, "apply_deeplink('keeper') returns true")
	_check(main._keeper_modal != null and main._keeper_modal.visible, "keeper modal shown via deeplink")
	main.apply_deeplink("board")

	# The keeper ENCOUNTER AUTO-TRIGGER: build the home up to 4 buildings, then a town change fires it.
	SaveManager.clear()
	var packed2: PackedScene = load("res://scenes/Main.tscn")
	var main2 = packed2.instantiate()
	root.add_child(main2)
	await process_frame
	main2.game.farm_run_active = true
	# Suppress the first-launch auto-modals (tutorial + any queued arrival story beat) so they
	# don't sit on top of / block the keeper-encounter auto-trigger we're testing.
	if main2._tutorial_modal != null:
		main2._tutorial_modal.visible = false
	main2.game.story.beat_queue.clear()
	if main2._story_modal != null:
		main2._story_modal.visible = false
	# Below threshold: a town change does NOT trigger the encounter.
	main2.game.buildings = []
	main2._on_town_changed()
	_check(main2._keeper_modal == null or not main2._keeper_modal.visible,
		"no encounter below the building threshold")
	# At/above threshold + unresolved → the encounter fires on the next town change.
	var added := 0
	for id in BuildingConfig.ALL_BUILD_IDS:
		if added >= 4:
			break
		main2.game.buildings.append(String(id))
		added += 1
	main2._on_town_changed()
	_check(main2._keeper_modal != null and main2._keeper_modal.visible,
		"keeper encounter auto-triggers at >= appearsAfterBuildings (farm 4)")
	_check(main2._keeper_modal.current_type() == "farm", "auto-triggered encounter is the FARM keeper")
	# Resolve via the modal → grants currency + sets flag + a subsequent town change does NOT re-fire.
	main2._keeper_modal._action_buttons["driveout"].emit_signal("pressed")
	main2._keeper_modal._action_buttons["continue"].emit_signal("pressed")
	_check(main2.game.core_ingots == 5, "Main encounter Drive Out granted 5 core ingots")
	_check(main2.game.keeper_resolved("farm"), "Main keeper resolved after the choice")
	main2._on_town_changed()
	_check(not (main2._keeper_modal != null and main2._keeper_modal.visible),
		"resolved keeper does NOT re-trigger on the next town change")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
