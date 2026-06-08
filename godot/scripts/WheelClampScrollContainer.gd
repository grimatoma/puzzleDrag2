class_name WheelClampScrollContainer
extends SmoothScrollContainer
## A SmoothScrollContainer that suppresses elastic overscroll for MOUSE-WHEEL input
## only, while leaving the springy overdrag intact for finger/content drags.
##
## Why: a single wheel notch injects a big velocity spike (`velocity.y += speed`,
## default 1000/notch) in ScrollInputHandler._handle_wheel_scroll(). When that spike
## carries the content past a boundary, ScrollPhysics.apply_overdrag() springs it back —
## the "rubber band moves way more than my wheel" feel the user reported on desktop.
##
## The addon's only overshoot switch (`allow_overdragging`) is global: turning it off
## would also kill the nice elastic pull on touch drags (mobile, where the port runs
## portrait and there is no wheel). So instead of flipping that flag, we clamp per FRAME
## but ONLY when the last gesture was the wheel: `last_scroll_type == WHEEL`. Touch/mouse
## content drags report `DRAG` and keep their overdrag untouched; scrollbar drags report
## `BAR` and can't overshoot anyway.
##
## The clamp runs inside our `_process` override AFTER `super._process(delta)` has already
## written `content_node.position`, so the boundary is pinned BEFORE the frame is drawn —
## there is no one-frame flash of overshoot. The result is the wheel decelerates normally
## inside the list and simply stops dead at the top/bottom edge. (This intentionally lives
## here, in repo code, rather than as an edit to the vendored addon under
## addons/SmoothScroll/, so a plugin update can't silently revert it — same reasoning as
## the `drag_with_touch = false` workaround in UiKit.make_vscroll().)

func _process(delta: float) -> void:
	super._process(delta)
	# Only the wheel gets the hard stop; drags keep their elastic overdrag.
	if last_scroll_type != SCROLL_TYPE.WHEEL:
		return
	if input_handler != null and input_handler.content_dragging:
		return
	if content_node == null:
		return
	_clamp_axis_to_bounds(true)
	_clamp_axis_to_bounds(false)


## Pin `pos`/`velocity`/`content_node.position` back inside the scrollable range on one
## axis if a wheel-driven momentum step pushed them past the boundary. No-op while the
## content is within bounds, so normal wheel momentum scrolling is preserved.
func _clamp_axis_to_bounds(vertical: bool) -> void:
	var spare := ScrollLayout.get_spare_size(self, content_margins)
	var size_diff: float = ScrollLayout.get_child_size_y_diff(content_node, spare.y, true) if vertical \
		else ScrollLayout.get_child_size_x_diff(content_node, spare.x, true)
	var axis_pos: float = pos.y if vertical else pos.x

	if axis_pos > 0.0:
		axis_pos = 0.0
	elif axis_pos < -size_diff:
		axis_pos = -size_diff
	else:
		return  # within bounds — leave wheel momentum alone

	if vertical:
		pos.y = axis_pos
		velocity.y = 0.0
		content_node.position.y = _base_offset.y + axis_pos
	else:
		pos.x = axis_pos
		velocity.x = 0.0
		content_node.position.x = _base_offset.x + axis_pos
