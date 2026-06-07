class_name CastleConfig
extends RefCounted
## Castle Needs — the resource-contribution targets, ported from the React castle
## slice (src/features/castle/data.ts) as a pure-data catalog + helper statics.
##
## The Castle is a ONE-WAY SINK: the player donates resources from inventory toward
## each need; there is no reset and no reward beyond the contribution itself (REFERENCE
## §11). Three hardcoded needs, each pointing at a REAL port inventory key — soup
## (Kitchen-style food), meat (herd produce), and coal (the prefixed mine inventory
## key tile_mine_coal). The contribution/deduction logic lives in GameState
## (contribute_to_castle) wired into the same inventory the orders/recipes paths use.
##
## Targets are carried VERBATIM from data.ts (soup 53 / meat 47 / coal 43). The need
## `id`/`key` is the React need KEY (soup/meat/coal); `resource` is the inventory key
## the contribution deducts (soup/meat/tile_mine_coal). For soup + meat the id and
## resource coincide; for coal they differ (id "coal", resource "tile_mine_coal"),
## exactly as the React data does.
##
## Registered as a `class_name` global (like AchievementConfig / WorkerConfig) so its
## const + static helpers are reachable WITHOUT a live autoload — headless tests run
## before the scene tree exists. Stateless: never instantiated.

## The ported Castle needs, in stable display order. Each entry:
##   id:       String — stable need key (matches React: soup/meat/coal)
##   label:    String — display name
##   resource: String — the inventory key a contribution deducts
##   target:   int    — the contribution goal (one-way; never exceeded)
const NEEDS: Array = [
	{"id": "soup", "label": "Soup", "resource": "soup",           "target": 53},
	{"id": "meat", "label": "Meat", "resource": "meat",           "target": 47},
	{"id": "coal", "label": "Coal", "resource": "tile_mine_coal", "target": 43},
]

## Stable iteration order of the need ids.
const NEED_IDS: Array = ["soup", "meat", "coal"]

# ── Static helpers (usable without an instance) ──────────────────────────────────

## Every need entry in stable catalog order (a defensive copy of each row).
static func all() -> Array:
	var out: Array = []
	for n in NEEDS:
		out.append((n as Dictionary).duplicate(true))
	return out

## True when `id` names a real Castle need.
static func has_need(id: String) -> bool:
	for n in NEEDS:
		if String(n.get("id", "")) == id:
			return true
	return false

## The full need entry for `id` (a COPY), or {} for an unknown id.
static func get_need(id: String) -> Dictionary:
	for n in NEEDS:
		if String(n.get("id", "")) == id:
			return (n as Dictionary).duplicate(true)
	return {}

## Display label for need `id` ("" for an unknown id).
static func need_label(id: String) -> String:
	return String(get_need(id).get("label", ""))

## The inventory key a contribution to `id` deducts ("" for an unknown id).
static func need_resource(id: String) -> String:
	return String(get_need(id).get("resource", ""))

## The contribution target for `id` (0 for an unknown id).
static func need_target(id: String) -> int:
	return int(get_need(id).get("target", 0))
