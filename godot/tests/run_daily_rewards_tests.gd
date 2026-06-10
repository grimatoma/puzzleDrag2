extends SceneTree
## Headless tests for the daily login-streak reward system:
##   DailyRewardConfig — the 1..30 reward ladder + the {coins:25} default + tool-id remap
##   GameState.login_tick — the React LOGIN_TICK logic EXACTLY (idempotent same-day,
##                          consecutive +1, gap reset, cap at 30, each reward TYPE granted)
##   GameState save/load — daily_last_claimed + daily_streak_day round-trip + defaults
##   DailyStreakModal — open_for renders day + reward; Collect → collected/closed signals
##   ViewRouter — DAILY modal enum + resolve("daily")/("streak") + modal_id + known_ids
##   Main integration — apply_deeplink("daily") opens the modal on demand
##
## Run from the godot/ project root:
##   godot --headless --script res://tests/run_daily_rewards_tests.gd
## Exits 0 when every check passes, 1 on any failure.

const DailyStreakModalScript := preload("res://scenes/DailyStreakModal.gd")

var _checks: int = 0
var _failures: int = 0

# Signal counters for the daily modal.
var _collected_count: int = 0
var _closed_count: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _on_collected() -> void:
	_collected_count += 1

func _on_closed() -> void:
	_closed_count += 1

## Press the action button registered under `key`. Returns true if it existed.
func _press(modal, key: String) -> bool:
	var btn: Variant = modal._action_buttons.get(key)
	if btn == null:
		return false
	btn.emit_signal("pressed")
	return true

func _initialize() -> void:
	print("\n── Daily login-streak reward tests ─────────────────")

	# ── 1. DailyRewardConfig — the reward ladder + remap + default ─────────────
	_check(DailyRewardConfig.MAX_DAY == 30, "DailyRewardConfig.MAX_DAY == 30")
	# Day 1 = 25 coins.
	var r1: Dictionary = DailyRewardConfig.reward_for_day(1)
	_check(int(r1.get("coins", 0)) == 25, "day 1 reward = 25 coins")
	# Day 2 = 50 coins.
	_check(int(DailyRewardConfig.reward_for_day(2).get("coins", 0)) == 50, "day 2 reward = 50 coins")
	# Day 3 = tool basic→scythe, amount 1, no coins.
	var r3: Dictionary = DailyRewardConfig.reward_for_day(3)
	_check(String(r3.get("tool", "")) == "scythe", "day 3 tool remapped basic→scythe")
	_check(int(r3.get("amount", 0)) == 1, "day 3 tool amount == 1")
	_check(int(r3.get("coins", 0)) == 0, "day 3 has no coins")
	# Day 5 = tool rare→bomb, amount 1.
	var r5: Dictionary = DailyRewardConfig.reward_for_day(5)
	_check(String(r5.get("tool", "")) == "bomb", "day 5 tool remapped rare→bomb")
	# Day 6 unlisted → {coins:25} default.
	var r6: Dictionary = DailyRewardConfig.reward_for_day(6)
	_check(int(r6.get("coins", 0)) == 25 and not r6.has("tool"), "day 6 (unlisted) = {coins:25} default")
	# Day 7 = 150 coins + tool shuffle→rake, amount 1.
	var r7: Dictionary = DailyRewardConfig.reward_for_day(7)
	_check(int(r7.get("coins", 0)) == 150, "day 7 reward = 150 coins")
	_check(String(r7.get("tool", "")) == "rake", "day 7 tool remapped shuffle→rake")
	# Day 14 = 300 coins + 1 rune.
	var r14: Dictionary = DailyRewardConfig.reward_for_day(14)
	_check(int(r14.get("coins", 0)) == 300 and int(r14.get("runes", 0)) == 1, "day 14 = 300 coins + 1 rune")
	# Day 30 = 1000 coins + 3 runes + the Triceratops unlock_tile (React unlockTile — the port HAS the tile).
	var r30: Dictionary = DailyRewardConfig.reward_for_day(30)
	_check(int(r30.get("coins", 0)) == 1000, "day 30 reward = 1000 coins")
	_check(int(r30.get("runes", 0)) == 3, "day 30 reward = 3 runes")
	_check(String(r30.get("unlock_tile", "")) == "tile_cattle_triceratops", "day 30 reward carries the Triceratops unlock_tile")
	_check(not r30.has("tool"), "day 30 has no tool grant")
	# Day past 30 (defensive) → {coins:25} default.
	_check(int(DailyRewardConfig.reward_for_day(31).get("coins", 0)) == 25, "day 31 (out of range) = {coins:25} default")
	# Every mapped tool id is a real ToolConfig member (no fakes).
	_check(ToolConfig.has_tool("scythe") and ToolConfig.has_tool("bomb") and ToolConfig.has_tool("rake"),
		"all remapped tool ids (scythe/bomb/rake) are real ToolConfig members")
	# reward_for_day returns a COPY (mutating it doesn't corrupt the const table).
	var mutate: Dictionary = DailyRewardConfig.reward_for_day(1)
	mutate["coins"] = 9999
	_check(int(DailyRewardConfig.reward_for_day(1).get("coins", 0)) == 25, "reward_for_day returns a defensive copy")

	# ── 2. GameState.login_tick — first claim (day 1, grants) ─────────────────
	var g := GameState.new()
	_check(g.daily_last_claimed == "" and g.daily_streak_day == 0, "fresh GameState: never claimed (\"\" / 0)")
	var coins0: int = g.coins
	var res1: Dictionary = g.login_tick("2026-06-06")
	_check(bool(res1.get("claimed", false)) == true, "first claim: claimed == true")
	_check(int(res1.get("day", 0)) == 1, "first claim: day == 1")
	_check(int(res1.get("reward", {}).get("coins", 0)) == 25, "first claim: reward = 25 coins")
	_check(g.coins == coins0 + 25, "first claim: +25 coins granted")
	_check(g.daily_last_claimed == "2026-06-06", "first claim: daily_last_claimed set to today")
	_check(g.daily_streak_day == 1, "first claim: daily_streak_day == 1")

	# ── 3. Idempotent same-day (no double grant) ──────────────────────────────
	var coins_after_1: int = g.coins
	var res_same: Dictionary = g.login_tick("2026-06-06")
	_check(bool(res_same.get("claimed", false)) == false, "same-day tick: claimed == false")
	_check(int(res_same.get("day", 0)) == 1, "same-day tick: day still 1")
	_check(res_same.get("reward", {}).is_empty(), "same-day tick: reward is empty (nothing granted)")
	_check(g.coins == coins_after_1, "same-day tick: coins UNCHANGED (no double grant)")
	_check(g.daily_streak_day == 1, "same-day tick: streak day UNCHANGED")

	# ── 4. Consecutive next-day (day 2) ───────────────────────────────────────
	var coins_before_2: int = g.coins
	var res2: Dictionary = g.login_tick("2026-06-07")
	_check(bool(res2.get("claimed", false)) == true, "next-day tick: claimed == true")
	_check(int(res2.get("day", 0)) == 2, "next-day tick: day == 2 (consecutive +1)")
	_check(g.coins == coins_before_2 + 50, "next-day tick: +50 coins (day 2 reward)")
	_check(g.daily_streak_day == 2, "next-day tick: daily_streak_day == 2")
	_check(g.daily_last_claimed == "2026-06-07", "next-day tick: last claimed advanced")

	# ── 5. 2-day gap reset (back to day 1) ────────────────────────────────────
	# From 2026-06-07 jump to 2026-06-10 (3-day gap) → reset to day 1.
	var coins_before_gap: int = g.coins
	var res_gap: Dictionary = g.login_tick("2026-06-10")
	_check(bool(res_gap.get("claimed", false)) == true, "gap tick: claimed == true")
	_check(int(res_gap.get("day", 0)) == 1, "gap tick: day reset to 1 (non-consecutive gap)")
	_check(g.coins == coins_before_gap + 25, "gap tick: +25 coins (day-1 reward after reset)")
	_check(g.daily_streak_day == 1, "gap tick: daily_streak_day reset to 1")

	# Exactly a 2-day gap also resets (only diff==1 extends).
	var g2 := GameState.new()
	g2.login_tick("2026-06-01")          # day 1
	g2.login_tick("2026-06-02")          # day 2 (consecutive)
	var res_2day: Dictionary = g2.login_tick("2026-06-04")   # 2-day gap → reset
	_check(int(res_2day.get("day", 0)) == 1, "exact 2-day gap resets to day 1")

	# ── 6. Cap at 30 (day 30 stays 30 on the 31st consecutive day) ────────────
	var gcap := GameState.new()
	# Walk 30 consecutive days starting 2026-01-01 → reaches day 30.
	var day30_res: Dictionary = {}
	for i in range(30):
		var date: String = "2026-01-%02d" % (i + 1)
		day30_res = gcap.login_tick(date)
	_check(int(day30_res.get("day", 0)) == 30, "30 consecutive days reaches day 30")
	_check(gcap.daily_streak_day == 30, "streak day == 30 after 30 consecutive")
	_check(int(day30_res.get("reward", {}).get("coins", 0)) == 1000, "day 30 grants 1000 coins")
	_check(int(day30_res.get("reward", {}).get("runes", 0)) == 3, "day 30 grants 3 runes")
	# The `daily` tile-discovery method: day 30 unlocks Triceratops (React unlockTile). The reward
	# carries unlock_tile and login_tick discovers it — the tile is now in the player's collection.
	_check(String(day30_res.get("reward", {}).get("unlock_tile", "")) == "tile_cattle_triceratops",
		"day 30 reward carries the unlock_tile")
	_check(gcap.is_tile_discovered("tile_cattle_triceratops"),
		"day 30 DISCOVERS Triceratops (the `daily` discovery method works)")
	# The 31st consecutive day (2026-01-31) → still day 30 (capped).
	var coins_at_30: int = gcap.coins
	var runes_at_30: int = gcap.runes
	var res_31: Dictionary = gcap.login_tick("2026-01-31")
	_check(int(res_31.get("day", 0)) == 30, "31st consecutive day STAYS at day 30 (capped)")
	_check(gcap.daily_streak_day == 30, "streak day stays 30 after cap")
	# Day 30's reward is granted AGAIN (it's a fresh claim on a new calendar day).
	_check(gcap.coins == coins_at_30 + 1000, "capped day re-grants day-30 coins (fresh calendar day)")
	_check(gcap.runes == runes_at_30 + 3, "capped day re-grants day-30 runes")

	# ── 7. Each reward TYPE granted correctly ─────────────────────────────────
	# 7a. coins-only day (day 2).
	var gc := GameState.new()
	gc.login_tick("2026-03-01")          # day 1 (25c)
	var before_coins: int = gc.coins
	gc.login_tick("2026-03-02")          # day 2 (50c)
	_check(gc.coins == before_coins + 50, "coins-only day grants exactly the coins")

	# 7b. tool day → correct remapped ToolConfig id + amount.
	var gt := GameState.new()
	gt.login_tick("2026-03-01")          # day 1
	gt.login_tick("2026-03-02")          # day 2
	gt.login_tick("2026-03-03")          # day 3 → tool scythe ×1
	_check(gt.tool_count("scythe") == 1, "day-3 tool grant: scythe charge == 1")
	gt.login_tick("2026-03-04")          # day 4 (coins)
	gt.login_tick("2026-03-05")          # day 5 → tool bomb ×1
	_check(gt.tool_count("bomb") == 1, "day-5 tool grant: bomb charge == 1")
	gt.login_tick("2026-03-06")          # day 6 (default 25c)
	var coins_before_7: int = gt.coins
	gt.login_tick("2026-03-07")          # day 7 → 150c + rake ×1
	_check(gt.tool_count("rake") == 1, "day-7 tool grant: rake charge == 1")
	_check(gt.coins == coins_before_7 + 150, "day-7 grants its 150 coins alongside the tool")
	# A tool grant STACKS onto an existing charge (login a second 30-day cycle to re-hit day 3).
	# Quicker: grant the same tool day again via a fresh streak and assert stacking.
	# (Re-hitting day 3: reset then walk to day 3 again is heavy; assert stacking directly.)
	gt.grant_tool("scythe", 1)
	_check(gt.tool_count("scythe") == 2, "tool grants stack onto existing charges")

	# 7c. runes day (day 14).
	var gr := GameState.new()
	var runes0: int = gr.runes
	# Walk 14 consecutive days to reach day 14.
	for i in range(14):
		gr.login_tick("2026-04-%02d" % (i + 1))
	_check(gr.daily_streak_day == 14, "14 consecutive days reaches day 14")
	_check(gr.runes == runes0 + 1, "day-14 grants exactly 1 rune")

	# 7d. day 30 grants 1000c + 3 runes and NO tile unlock (already asserted in §6; re-confirm
	#     here that the granted reward dict carries no unlockTile key).
	_check(not day30_res.get("reward", {}).has("unlockTile"), "day-30 granted reward carries no unlockTile")

	# 7e. unlisted-day default ({coins:25}) actually granted (day 6 path above used it).
	var gd := GameState.new()
	gd.login_tick("2026-05-01")          # day 1
	gd.login_tick("2026-05-02")          # day 2
	gd.login_tick("2026-05-03")          # day 3
	gd.login_tick("2026-05-04")          # day 4
	gd.login_tick("2026-05-05")          # day 5
	var coins_before_6: int = gd.coins
	var res_d6: Dictionary = gd.login_tick("2026-05-06")   # day 6 → default 25c
	_check(int(res_d6.get("day", 0)) == 6, "reaching day 6 (unlisted)")
	_check(gd.coins == coins_before_6 + 25, "unlisted day-6 grants the {coins:25} default")

	# ── 8. Save/load round-trip of daily_last_claimed + daily_streak_day ──────
	var gs := GameState.new()
	gs.login_tick("2026-06-01")
	gs.login_tick("2026-06-02")          # now day 2, last claimed 2026-06-02
	var snap: Dictionary = gs.to_dict()
	_check(snap.has("daily_last_claimed"), "to_dict carries daily_last_claimed")
	_check(snap.has("daily_streak_day"), "to_dict carries daily_streak_day")
	_check(String(snap["daily_last_claimed"]) == "2026-06-02", "to_dict daily_last_claimed value")
	_check(int(snap["daily_streak_day"]) == 2, "to_dict daily_streak_day value")
	var gs2 := GameState.from_dict(snap)
	_check(gs2.daily_last_claimed == "2026-06-02", "from_dict restores daily_last_claimed")
	_check(gs2.daily_streak_day == 2, "from_dict restores daily_streak_day")
	# Round-tripped state is idempotent on the same day + extends on the next.
	var res_rt_same: Dictionary = gs2.login_tick("2026-06-02")
	_check(bool(res_rt_same.get("claimed", false)) == false, "restored state idempotent on its last-claimed day")
	var res_rt_next: Dictionary = gs2.login_tick("2026-06-03")
	_check(int(res_rt_next.get("day", 0)) == 3, "restored state extends to day 3 on the next day")

	# Missing keys default to never-claimed.
	var snap_missing: Dictionary = gs.to_dict()
	snap_missing.erase("daily_last_claimed")
	snap_missing.erase("daily_streak_day")
	var gs3 := GameState.from_dict(snap_missing)
	_check(gs3.daily_last_claimed == "" and gs3.daily_streak_day == 0,
		"from_dict with missing keys → never claimed (\"\" / 0)")
	# Defensive: an empty date with a phantom streak day is normalised to 0.
	var snap_corrupt: Dictionary = gs.to_dict()
	snap_corrupt["daily_last_claimed"] = ""
	snap_corrupt["daily_streak_day"] = 17
	var gs4 := GameState.from_dict(snap_corrupt)
	_check(gs4.daily_streak_day == 0, "empty date forces streak day 0 (no phantom streak)")
	# Defensive: an over-large streak day is clamped to MAX_DAY.
	var snap_big: Dictionary = gs.to_dict()
	snap_big["daily_last_claimed"] = "2026-06-02"
	snap_big["daily_streak_day"] = 999
	var gs5 := GameState.from_dict(snap_big)
	_check(gs5.daily_streak_day == DailyRewardConfig.MAX_DAY, "over-large streak day clamped to MAX_DAY")

	# ── 9. ADDITIVE GUARANTEE: a bare GameState carries the daily defaults ─────
	var bare := GameState.new()
	_check(bare.daily_last_claimed == "" and bare.daily_streak_day == 0,
		"bare GameState.new() has the additive daily defaults (no economy change)")

	# ── 10. DailyStreakModal — reward_summary + open/collect signals ──────────
	# reward_summary formats each reward type.
	_check(DailyStreakModalScript.reward_summary({"coins": 25}) == "25 ◉", "reward_summary coins-only")
	_check(DailyStreakModalScript.reward_summary({"coins": 300, "runes": 1}) == "300 ◉  ·  1 rune",
		"reward_summary coins + 1 rune (singular)")
	_check(DailyStreakModalScript.reward_summary({"coins": 1000, "runes": 3}) == "1000 ◉  ·  3 runes",
		"reward_summary coins + 3 runes (plural)")
	_check(DailyStreakModalScript.reward_summary({"tool": "scythe", "amount": 1}) == "Scythe ×1",
		"reward_summary tool resolves ToolConfig label")
	_check(DailyStreakModalScript.reward_summary({}) == "—", "reward_summary empty reward → dash")

	var game_m := GameState.new()
	var modal = DailyStreakModalScript.new()
	root.add_child(modal)
	modal.setup(game_m)
	modal.connect("collected", Callable(self, "_on_collected"))
	modal.connect("closed", Callable(self, "_on_closed"))
	_check(not modal.visible, "modal hidden before open_for()")
	modal.open_for(7, DailyRewardConfig.reward_for_day(7))
	await process_frame
	_check(modal.visible, "modal visible after open_for()")
	_check(modal.current_day() == 7, "current_day() == 7")
	_check(modal._day_label.text == "Day 7", "day label renders 'Day 7'")
	_check(modal._reward_label.text.find("150 ◉") >= 0, "reward label shows the 150 coins")
	_check(modal._reward_label.text.find("Rake ×1") >= 0, "reward label shows the Rake tool")
	_check(modal._action_buttons.has("collect"), "_action_buttons has 'collect'")
	# Pressing Collect emits collected + closed and hides the modal.
	var col_before: int = _collected_count
	var clo_before: int = _closed_count
	_check(_press(modal, "collect"), "pressed 'collect'")
	_check(_collected_count == col_before + 1, "collected signal fired once")
	_check(_closed_count == clo_before + 1, "closed signal fired once")
	_check(not modal.visible, "modal hidden after collect")

	# ── 11. ViewRouter — DAILY modal ──────────────────────────────────────────
	var r := ViewRouter.new()
	r.open_modal(ViewRouter.Modal.DAILY)
	_check(r.current_modal() == ViewRouter.Modal.DAILY, "current_modal() == DAILY after open_modal")
	_check(r.is_open(ViewRouter.Modal.DAILY), "is_open(DAILY) == true")
	r.close_modal()
	_check(r.current_modal() == ViewRouter.Modal.NONE, "close_modal() resets to NONE")
	var d_daily := ViewRouter.resolve("daily")
	_check(bool(d_daily.get("ok", false)), "resolve('daily') ok")
	_check(int(d_daily.get("modal", -1)) == ViewRouter.Modal.DAILY, "resolve('daily') modal == DAILY")
	var d_streak := ViewRouter.resolve("streak")
	_check(int(d_streak.get("modal", -1)) == ViewRouter.Modal.DAILY, "resolve('streak') alias → DAILY")
	_check(ViewRouter.modal_id(ViewRouter.Modal.DAILY) == "daily", "modal_id(DAILY) == 'daily'")
	var ids := ViewRouter.known_ids()
	_check(ids.has("daily") and ids.has("streak"), "known_ids() contains 'daily' + 'streak'")

	# ── 12. Main integration — apply_deeplink('daily') opens the modal ────────
	SaveManager.clear()
	var packed: PackedScene = load("res://scenes/Main.tscn")
	_check(packed != null, "Main.tscn loads")
	var main = packed.instantiate()
	root.add_child(main)
	await process_frame
	# Task C — board RUN-GATE: a board return (apply_deeplink('board')) only reaches the board
	# while a bounded farm run is live (town is home). Mark a run active so this suite's clear-to-
	# board + close-via-board idioms hide overlays + reset the router instead of redirecting to town.
	main.game.farm_run_active = true
	_check(main.has_method("_open_daily"), "Main has _open_daily()")
	_check(main.has_method("_maybe_show_daily"), "Main has _maybe_show_daily()")
	# Fresh launch fires login_tick for today → a fresh claim, so a pending daily claim exists,
	# held behind the tutorial (shown first on a fresh game). Dismiss the tutorial the real way
	# (Skip) so the launch sequencing is mirrored before we exercise the deeplink. The daily
	# modal may auto-surface once the tutorial + story queue clear (that's the design); we then
	# also exercise the explicit deeplink path below.
	if main._tutorial_modal != null and main._tutorial_modal.visible:
		_press(main._tutorial_modal, "skip")
		await process_frame
	# Close any modal that auto-surfaced (daily or a story beat) so we start the deeplink test
	# from a clean board, then open the daily modal on demand.
	main.apply_deeplink("board")
	await process_frame
	# apply_deeplink('daily') opens the modal on demand regardless of streak state.
	var ok_daily: bool = main.apply_deeplink("daily")
	_check(ok_daily, "apply_deeplink('daily') returns true")
	_check(main._daily_modal != null and main._daily_modal.visible,
		"apply_deeplink('daily') shows the daily modal")
	_check(main._router.current_modal() == ViewRouter.Modal.DAILY,
		"_router.current_modal() == DAILY after apply_deeplink('daily')")
	# apply_deeplink('board') closes it; router resets to NONE.
	main.apply_deeplink("board")
	_check(main._daily_modal == null or not main._daily_modal.visible,
		"daily modal hidden after apply_deeplink('board')")
	_check(main._router.current_modal() == ViewRouter.Modal.NONE,
		"_router.current_modal() == NONE after apply_deeplink('board')")

	SaveManager.clear()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)
