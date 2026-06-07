extends SceneTree
## Diagnose whether the SmoothScroll-backed modals actually scroll.
## Opens a deep-linked screen, finds every SmoothScrollContainer, reports overflow
## detection + content_node wiring, then drives a programmatic scroll and an injected
## mouse-wheel event to see if the content position actually moves.
##   godot --path godot --script res://tools/scroll_diag.gd -- <deeplink>

func _find_scrolls(node: Node, out: Array) -> void:
	if node is SmoothScrollContainer:
		out.append(node)
	for c in node.get_children():
		_find_scrolls(c, out)

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var deeplink: String = args[0] if args.size() > 0 else "town"

	var win := root
	DisplayServer.window_set_size(Vector2i(720, 1280))
	win.size = Vector2i(720, 1280)
	win.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_EXPAND

	SaveManager.clear()
	var main = load("res://scenes/Main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	if main._tutorial_modal != null:
		main._tutorial_modal.visible = false
	main.game.mark_tutorial_seen()
	main.apply_deeplink(deeplink)
	for _i in range(30):
		await process_frame

	var scrolls: Array = []
	_find_scrolls(root, scrolls)
	print("=== deeplink=%s  found %d SmoothScrollContainer(s) ===" % [deeplink, scrolls.size()])
	for s in scrolls:
		var sc: SmoothScrollContainer = s
		var cn = sc.content_node
		# Identify which screen this scroll belongs to (parent chain).
		var chain := ""
		var p: Node = sc
		while p != null:
			chain = p.name + "/" + chain if chain != "" else p.name
			p = p.get_parent()
		print("PARENT CHAIN: %s" % chain)
		var kids := ""
		for ch in sc.get_children():
			kids += "%s(%s,min=%s) " % [ch.get_class(), ch.name, (ch.get_combined_minimum_size() if ch is Control else Vector2.ZERO)]
		print("DIRECT CHILDREN: %s" % kids)
		if cn != null:
			print("content_node parent=%s" % (cn.get_parent().name if cn.get_parent() else "<none>"))
		var ssv := sc.should_scroll_vertical()
		print("scroll size=%s  content_node=%s  content_min=%s  content_size=%s  should_scroll_v=%s  pos.y=%s" % [
			sc.size,
			(cn.name if cn != null else "<null>"),
			(cn.get_combined_minimum_size() if cn != null else Vector2.ZERO),
			(cn.size if cn != null else Vector2.ZERO),
			ssv, sc.pos.y])
		# Programmatic scroll attempt
		sc.scroll_vertically(600.0)
		for _i in range(20):
			await process_frame
		print("   after scroll_vertically(600): pos.y=%s content_node.position.y=%s" % [
			sc.pos.y, (cn.position.y if cn != null else 0.0)])

	quit(0)
