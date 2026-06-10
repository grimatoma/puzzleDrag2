class_name UiFx
extends RefCounted
## Shared UI motion kit — the navigation/menu animation layer.
##
## A stateless `class_name` global (like UiKit/Palette — NOT an autoload) holding every
## menu/nav transition the port plays: overlay (screen/modal) open transitions, the
## bottom-nav tab activation animation, and tactile button press feedback. Centralising
## the tweens here keeps every surface moving with the SAME timing + easing language,
## the way UiKit keeps them painted with the same parchment language.
##
## Animations never change LOGICAL state — only `modulate`, `scale` and `pivot_offset`
## (visual-only properties that containers ignore for layout). `visible` flags, button
## presses, router state and signals all behave byte-identically with animations on or
## off, so the headless test contract is untouched.
##
## Disabled automatically on the headless display server (tweens would burn frames in
## tests for nothing) and switchable via `UiFx.enabled = false` (the visual-regression
## harness pins it off so captures are deterministic, never mid-fade).

## Master switch. The visual harness (tests/run_visual_tests.gd) sets this false so
## every capture is taken at the settled end-state, never mid-animation.
static var enabled: bool = true

## PLAYER preference (the menu's "Reduce Motion" toggle, persisted on GameState as
## `reduce_motion`). Kept SEPARATE from `enabled` (the infra/harness switch) so
## Main applying the loaded preference on launch can never un-pin a harness that
## disabled motion for deterministic captures.
static var reduced: bool = false

## Motion timings (seconds). Kept short — mobile-first UI motion should read as
## "responsive", not "cinematic": the card lands before the finger lifts.
const SCRIM_IN := 0.16          ## scrim/backdrop fade-in
const CARD_IN := 0.22           ## card pop-in (fade + scale)
const CARD_SCALE_FROM := 0.94   ## card starting scale (subtle zoom, not a balloon)
const NAV_IN := 0.18            ## nav underline grow / highlight fade
const ICON_POP := 0.13          ## nav icon pop half-time (up, then back)
const ICON_POP_SCALE := 1.18    ## nav icon pop peak scale
const PRESS_TIME := 0.06        ## button press-down shrink time
const PRESS_SCALE := 0.95       ## button press-down scale
const RELEASE_TIME := 0.12      ## button release spring-back time

## True when animations should actually play. Headless display servers (the unit-test
## sweep) get the end state instantly.
static func _active() -> bool:
	return enabled and not reduced and DisplayServer.get_name() != "headless"

## Public probe for continuous, self-driven effects (a _process-driven pulse) so they
## can idle when motion is off — the same gate every one-shot helper here uses.
static func is_active() -> bool:
	return _active()

# ── overlay open transition ───────────────────────────────────────────────────

## Animate a screen/modal CanvasLayer in: the scrim/backdrop (the first
## MOUSE_FILTER_STOP ColorRect child) fades in, and every other direct Control child
## (the centered card, the view panel, floating overlay buttons) fades + scales in
## from CARD_SCALE_FROM around its own centre. Safe to call every open — it kills any
## in-flight open tween first and is a complete no-op headless / when disabled (the
## overlay just appears at full opacity, exactly as before this kit existed).
##
## Awaits ONE frame before tweening so first-open layout has resolved (pivot_offset
## needs real sizes); the initial transparent state is snapped immediately so there is
## no one-frame flash of the unanimated overlay.
static func animate_overlay_open(overlay: CanvasLayer) -> void:
	if overlay == null or not overlay.is_inside_tree():
		return
	if not _active():
		return
	# Collect the animation targets among the overlay's DIRECT Control children.
	var scrim: Control = null
	var cards: Array = []
	for child in overlay.get_children():
		if not (child is Control):
			continue
		var ctl := child as Control
		if scrim == null and ctl is ColorRect and ctl.mouse_filter == Control.MOUSE_FILTER_STOP:
			scrim = ctl
		else:
			cards.append(ctl)
	if scrim == null and cards.is_empty():
		return
	# OPAQUE backdrops (the full-bleed VIEWS paint solid FRAME_BG) must NOT alpha-fade:
	# fading one in would flash the board behind it on every tab switch (the old view is
	# hidden instantly). Views keep an instant backdrop and animate only their content;
	# translucent modal scrims fade in as scrims should.
	if scrim != null and (scrim as ColorRect).color.a >= 0.999:
		scrim = null
	# Kill a previous open tween (a rapid re-open mid-animation) and snap targets
	# transparent NOW so the pre-tween frame doesn't flash the finished overlay.
	_kill_meta_tween(overlay, "_uifx_open_tween")
	if scrim != null:
		scrim.modulate.a = 0.0
	for c in cards:
		(c as Control).modulate.a = 0.0
	# One frame so container layout resolves (sizes → correct pivots on first open).
	var tree := overlay.get_tree()
	if tree != null:
		await tree.process_frame
	if not is_instance_valid(overlay) or not overlay.is_inside_tree():
		return
	if not overlay.visible:
		# Closed again during the awaited frame — restore the resting state instantly.
		if scrim != null and is_instance_valid(scrim):
			scrim.modulate.a = 1.0
		for c in cards:
			if is_instance_valid(c):
				(c as Control).modulate.a = 1.0
		return
	var tween := overlay.create_tween()
	tween.set_parallel(true)
	overlay.set_meta("_uifx_open_tween", tween)
	if scrim != null and is_instance_valid(scrim):
		tween.tween_property(scrim, "modulate:a", 1.0, SCRIM_IN) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	for c in cards:
		if not is_instance_valid(c):
			continue
		var ctl := c as Control
		ctl.pivot_offset = ctl.size / 2.0
		ctl.scale = Vector2(CARD_SCALE_FROM, CARD_SCALE_FROM)
		tween.tween_property(ctl, "modulate:a", 1.0, CARD_IN) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.tween_property(ctl, "scale", Vector2.ONE, CARD_IN) \
			.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

# ── bottom-nav tab activation ─────────────────────────────────────────────────

## Animate a nav tab BECOMING active: the ember underline grows out from its centre,
## the faint highlight fades in, and the icon does a quick pop (1 → 1.18 → 1).
## `_refresh_nav` has already set the final visible/colour state, so headless/disabled
## runs simply keep that end state — this only adds the motion on top.
static func nav_tab_activate(underline: Control, highlight: Control, icon: Control) -> void:
	if not _active():
		return
	if underline != null and is_instance_valid(underline) and underline.is_inside_tree():
		_kill_meta_tween(underline, "_uifx_tween")
		underline.pivot_offset = underline.size / 2.0
		underline.scale = Vector2(0.0, 1.0)
		var ut := underline.create_tween()
		underline.set_meta("_uifx_tween", ut)
		ut.tween_property(underline, "scale", Vector2.ONE, NAV_IN) \
			.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	if highlight != null and is_instance_valid(highlight) and highlight.is_inside_tree():
		_kill_meta_tween(highlight, "_uifx_tween")
		highlight.modulate.a = 0.0
		var ht := highlight.create_tween()
		highlight.set_meta("_uifx_tween", ht)
		ht.tween_property(highlight, "modulate:a", 1.0, NAV_IN) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if icon != null and is_instance_valid(icon) and icon.is_inside_tree():
		_kill_meta_tween(icon, "_uifx_tween")
		icon.pivot_offset = icon.size / 2.0
		icon.scale = Vector2.ONE
		var it := icon.create_tween()
		icon.set_meta("_uifx_tween", it)
		it.tween_property(icon, "scale", Vector2(ICON_POP_SCALE, ICON_POP_SCALE), ICON_POP) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		it.tween_property(icon, "scale", Vector2.ONE, ICON_POP) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

## Reset a nav tab's animated transforms to rest (scale 1, full opacity). Called for
## every INACTIVE tab on each nav refresh so an interrupted activation can never leave
## a tab half-scaled or half-faded.
static func nav_tab_rest(underline: Control, highlight: Control, icon: Control) -> void:
	for ctl in [underline, highlight, icon]:
		if ctl != null and is_instance_valid(ctl):
			_kill_meta_tween(ctl, "_uifx_tween")
			(ctl as Control).scale = Vector2.ONE
			(ctl as Control).modulate.a = 1.0

# ── one-shot pop ──────────────────────────────────────────────────────────────

## Quick celebratory pop (scale 1 → peak → 1 around the centre) for a control whose
## STATE just advanced — the chain stage banner hitting "DOUBLE!", a count chip
## landing. One-shot; safe to spam (re-trigger restarts it); nothing headless/reduced.
static func pop(ctl: Control, peak: float = 1.25, dur: float = 0.26) -> void:
	if ctl == null or not is_instance_valid(ctl):
		return
	if not _active() or not ctl.is_inside_tree():
		return
	_kill_meta_tween(ctl, "_uifx_pop")
	ctl.pivot_offset = ctl.size / 2.0
	ctl.scale = Vector2.ONE
	var t := ctl.create_tween()
	ctl.set_meta("_uifx_pop", t)
	t.tween_property(ctl, "scale", Vector2(peak, peak), dur * 0.4) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	t.tween_property(ctl, "scale", Vector2.ONE, dur * 0.6) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

# ── content swap fade ─────────────────────────────────────────────────────────

## Quick fade-in for a control whose CONTENT was just swapped in place (a tutorial
## step's title/body, a paged panel) — the gentle cue that "this changed". Only
## modulate is tweened (container layout never fights it). Instant when inactive.
static func content_fade(ctl: Control, dur: float = 0.22) -> void:
	if ctl == null or not is_instance_valid(ctl):
		return
	if not _active() or not ctl.is_inside_tree():
		ctl.modulate.a = 1.0
		return
	_kill_meta_tween(ctl, "_uifx_fade")
	ctl.modulate.a = 0.0
	var t := ctl.create_tween()
	ctl.set_meta("_uifx_fade", t)
	t.tween_property(ctl, "modulate:a", 1.0, dur) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

# ── text reveal (typewriter) ──────────────────────────────────────────────────

## Sweep a Label's glyphs in left-to-right (the storybook typewriter) by tweening
## `visible_ratio` — `.text` itself is never touched, so anything reading the label's
## content (tests, accessibility) sees the whole line immediately. Duration scales
## with length (≈45 chars/s, capped) and `delay` staggers multi-line reveals.
## Headless/disabled shows the full text instantly.
static func reveal_text(label: Label, delay: float = 0.0) -> void:
	if label == null or not is_instance_valid(label):
		return
	if not _active() or not label.is_inside_tree():
		label.visible_ratio = 1.0
		return
	_kill_meta_tween(label, "_uifx_reveal")
	label.visible_ratio = 0.0
	var dur := clampf(float(label.text.length()) / 45.0, 0.25, 1.4)
	var t := label.create_tween()
	label.set_meta("_uifx_reveal", t)
	if delay > 0.0:
		t.tween_interval(delay)
	t.tween_property(label, "visible_ratio", 1.0, dur)

# ── attention pulse (looping) ─────────────────────────────────────────────────

## Start a gentle infinite breathe (scale 1 → 1.06 → 1) on a control that wants the
## player's eye — the active-boss pill, an affordable tier-up hint. Idempotent: calling
## again while pulsing is a no-op. Pair with clear_attention_pulse when the condition
## ends. Headless/disabled starts nothing.
static func attach_attention_pulse(ctl: Control, peak: float = 1.06, period: float = 1.1) -> void:
	if ctl == null or not is_instance_valid(ctl) or ctl.has_meta("_uifx_pulse"):
		return
	if not _active() or not ctl.is_inside_tree():
		return
	# Mark BEFORE the awaited frame (idempotence guard), then let layout size the
	# control so the pivot lands at its true centre — a first-build call would
	# otherwise read size (0,0) and pulse around the top-left corner.
	ctl.set_meta("_uifx_pulse", true)
	var tree := ctl.get_tree()
	if tree != null:
		await tree.process_frame
	if not is_instance_valid(ctl) or not ctl.is_inside_tree():
		return
	if not ctl.has_meta("_uifx_pulse"):
		return   # cleared during the awaited frame — the condition already ended
	ctl.pivot_offset = ctl.size / 2.0
	var t := ctl.create_tween().set_loops()
	ctl.set_meta("_uifx_pulse", t)
	t.tween_property(ctl, "scale", Vector2(peak, peak), period * 0.5) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	t.tween_property(ctl, "scale", Vector2.ONE, period * 0.5) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

## Stop an attention pulse and rest the control at scale 1. Safe when none is running.
static func clear_attention_pulse(ctl: Control) -> void:
	if ctl == null or not is_instance_valid(ctl):
		return
	_kill_meta_tween(ctl, "_uifx_pulse")
	ctl.scale = Vector2.ONE

# ── button press feedback ─────────────────────────────────────────────────────

## Attach tactile press feedback to a button: it shrinks slightly (scale 0.95 around
## its centre) on press and springs back on release. Idempotent (meta-guarded), so the
## restyle-on-state-change helpers (style_segment is recalled on every tab flip) can
## call this freely. Scale is visual-only — container layout and hit-testing of
## NEIGHBOURS are unaffected, and headless runs never start a tween at all.
static func attach_press_feedback(btn: BaseButton) -> void:
	if btn == null or btn.has_meta("_uifx_press"):
		return
	btn.set_meta("_uifx_press", true)
	btn.button_down.connect(func() -> void:
		if not _active() or not btn.is_inside_tree():
			return
		_kill_meta_tween(btn, "_uifx_tween")
		btn.pivot_offset = btn.size / 2.0
		var t := btn.create_tween()
		btn.set_meta("_uifx_tween", t)
		t.tween_property(btn, "scale", Vector2(PRESS_SCALE, PRESS_SCALE), PRESS_TIME) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	)
	btn.button_up.connect(func() -> void:
		if not btn.is_inside_tree():
			return
		if not _active():
			btn.scale = Vector2.ONE
			return
		_kill_meta_tween(btn, "_uifx_tween")
		var t := btn.create_tween()
		btn.set_meta("_uifx_tween", t)
		t.tween_property(btn, "scale", Vector2.ONE, RELEASE_TIME) \
			.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	)

## Attach a quarter-turn spin on press (the ⚙ settings cog flourish). Rotation is
## visual-only, around the control's centre; idempotent via meta guard.
static func attach_press_spin(btn: BaseButton) -> void:
	if btn == null or btn.has_meta("_uifx_spin"):
		return
	btn.set_meta("_uifx_spin", true)
	btn.pressed.connect(func() -> void:
		if not _active() or not btn.is_inside_tree():
			return
		_kill_meta_tween(btn, "_uifx_spin_tween")
		btn.pivot_offset = btn.size / 2.0
		btn.rotation = 0.0
		var t := btn.create_tween()
		btn.set_meta("_uifx_spin_tween", t)
		t.tween_property(btn, "rotation", PI / 2.0, 0.28) \
			.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		t.tween_callback(func() -> void: btn.rotation = 0.0)
	)

# ── launch intro ──────────────────────────────────────────────────────────────

## One-shot launch reveal for a piece of persistent chrome: the control fades in while
## sliding from `dy` px away (negative = drops in from above, positive = rises from
## below), after `delay` seconds — stagger several for the app-launch flourish. Awaits
## one frame so the first layout pass has placed the control; a headless/disabled run
## changes nothing (the control just sits where layout put it).
static func intro_drop(ctl: Control, dy: float, dur: float = 0.4, delay: float = 0.0) -> void:
	if ctl == null or not is_instance_valid(ctl) or not _active():
		return
	ctl.modulate.a = 0.0
	var tree := ctl.get_tree()
	if tree != null:
		await tree.process_frame
	if not is_instance_valid(ctl) or not ctl.is_inside_tree():
		return
	var rest := ctl.position
	ctl.position = rest + Vector2(0, dy)
	var t := ctl.create_tween()
	if delay > 0.0:
		t.tween_interval(delay)
	t.set_parallel(true)
	t.tween_property(ctl, "position", rest, dur) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(ctl, "modulate:a", 1.0, dur * 0.8) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

# ── HUD value transitions ─────────────────────────────────────────────────────

## Animate a Label's numeric readout from `from` to `to`, formatting each frame with
## `fmt` (e.g. "🪙 %d") — the classic count-up/count-down currency tick. Headless /
## disabled (and the no-change case) snap straight to the final text, so callers can
## route EVERY refresh through this without branching.
static func count_to(label: Label, from: int, to: int, fmt: String = "%d", dur: float = 0.45) -> void:
	if label == null or not is_instance_valid(label):
		return
	if not _active() or not label.is_inside_tree() or from == to:
		label.text = fmt % to
		return
	_kill_meta_tween(label, "_uifx_count")
	var t := label.create_tween()
	label.set_meta("_uifx_count", t)
	t.tween_method(func(v: float) -> void:
		label.text = fmt % int(roundf(v)),
		float(from), float(to), dur) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

## Smoothly resize a bar-fill Control to `target` (the progress-bar grow/shrink).
## Rapid successive calls (a live chain updating every tile) kill the in-flight tween
## and re-aim at the new target, so the fill glides instead of stepping. Headless /
## disabled snaps to the target so goldens and tests see the settled width.
static func resize_to(ctl: Control, target: Vector2, dur: float = 0.18) -> void:
	if ctl == null or not is_instance_valid(ctl):
		return
	if not _active() or not ctl.is_inside_tree():
		ctl.size = target
		return
	_kill_meta_tween(ctl, "_uifx_size")
	var t := ctl.create_tween()
	ctl.set_meta("_uifx_size", t)
	t.tween_property(ctl, "size", target, dur) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

# ── full-screen fade (scene hand-off) ─────────────────────────────────────────

## Fade the whole screen to black over `dur` — awaitable, for a deliberate scene
## hand-off (New Game restart). Spawns a one-shot top CanvasLayer + ColorRect under
## `owner`; the caller is expected to tear the tree down right after (scene reload),
## so the layer is never reclaimed manually. Returns immediately when inactive
## (headless/disabled) so test paths reload with zero delay.
static func fade_to_black(owner_node: Node, dur: float = 0.32) -> void:
	if owner_node == null or not is_instance_valid(owner_node) or not owner_node.is_inside_tree():
		return
	if not _active():
		return
	var layer := CanvasLayer.new()
	layer.layer = 100
	owner_node.add_child(layer)
	var black := ColorRect.new()
	black.color = Color(0, 0, 0, 1)
	black.modulate.a = 0.0
	black.set_anchors_preset(Control.PRESET_FULL_RECT)
	black.mouse_filter = Control.MOUSE_FILTER_STOP   # swallow input during the hand-off
	layer.add_child(black)
	var t := black.create_tween()
	t.tween_property(black, "modulate:a", 1.0, dur) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	await t.finished

# ── impact shake ──────────────────────────────────────────────────────────────

## Short decaying positional shake — the impact accent for a BIG chain landing (or any
## hit that deserves weight). Works on any CanvasItem with a `position` (the board
## Node2D, a Control). The rest position is remembered across a re-trigger mid-shake so
## rapid impacts can't walk the node away from home; it always settles exactly at rest.
static func shake(node: Node, amplitude: float = 6.0, dur: float = 0.3) -> void:
	if node == null or not is_instance_valid(node) or not ("position" in node):
		return
	if not _active() or not node.is_inside_tree():
		return
	_kill_meta_tween(node, "_uifx_shake")
	var rest: Vector2 = node.get_meta("_uifx_shake_rest", node.position)
	node.set_meta("_uifx_shake_rest", rest)
	node.position = rest
	var t := node.create_tween()
	node.set_meta("_uifx_shake", t)
	var steps := 5
	var step_dur := dur / float(steps + 1)
	for i in range(steps):
		var decay := 1.0 - float(i) / float(steps)
		var off := Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * amplitude * decay
		t.tween_property(node, "position", rest + off, step_dur) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	t.tween_property(node, "position", rest, step_dur) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	t.tween_callback(func() -> void:
		if is_instance_valid(node):
			node.remove_meta("_uifx_shake_rest")
	)

# ── shared helpers ────────────────────────────────────────────────────────────

## Kill + clear a tween stored in `node`'s meta under `key` (the standard "one live
## tween per animated property group" guard used by every helper above).
static func _kill_meta_tween(node: Node, key: String) -> void:
	if node.has_meta(key):
		var old = node.get_meta(key)
		if old is Tween and (old as Tween).is_valid():
			(old as Tween).kill()
		node.remove_meta(key)
