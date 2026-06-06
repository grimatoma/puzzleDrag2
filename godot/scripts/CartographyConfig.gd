class_name CartographyConfig
extends Node
## Pure data for the CARTOGRAPHY world map — a MINIMAL ADDITIVE port of the React
## game's `src/features/cartography/data.ts` (MAP_NODES + MAP_EDGES), trimmed to the
## THREE zones the Godot port actually plays today: the home village (the farm board),
## the mine, and the harbor. Each zone maps to one of GameState's `active_biome`
## values ("farm"/"mine"/"harbor") so the screen can highlight where you are and route
## a travel request into the EXISTING expedition entry (enter_mine/enter_harbor).
##
## DEFERRED (NOT modelled here, by design): settlement founding, per-zone inventory,
## discovery gating, multi-settlement, the farm/event/festival/boss/capital nodes, the
## board templates + entry costs + danger lists carried by the full React MAP_NODES.
## This is a flavor view + an alternate entry point, nothing more.
##
## A stateless `class_name` global (NOT an autoload): every value is a `const`, so it's
## reachable as `CartographyConfig.ZONES` / `CartographyConfig.all()` WITHOUT an
## instance (mirrors Constants / Palette, so the helpers also work in headless tests
## before a scene tree exists).
##
## Positions are in the SAME 0..100 SVG-viewBox space the React map uses; the x/y are
## a sensible 3-node triangle: home on the left (the React `home` x/y), the mine to the
## upper-right (echoing the React `quarry` node), the harbor to the lower-left (the
## React `harbor` node). CartographyScreen fits this 0..100 layout into its map panel.

## The three ported zones. `biome` is the GameState.active_biome value this zone maps
## to (home → "farm"); `kind` drives the node tint in the screen (home warm, mine grey,
## harbor blue). `x`/`y` are 0..100 layout coordinates.
const ZONES: Array = [
	{
		"id": "home", "name": "Hearthwood Vale", "kind": "home", "icon": "🏡",
		"x": 18.0, "y": 52.0, "biome": "farm",
	},
	{
		"id": "mine", "name": "Cracked Quarry", "kind": "mine", "icon": "⛏",
		"x": 74.0, "y": 26.0, "biome": "mine",
	},
	{
		"id": "harbor", "name": "Saltspray Harbor", "kind": "harbor", "icon": "⚓",
		"x": 30.0, "y": 84.0, "biome": "harbor",
	},
]

## Roads between zones — the home village is the hub; both expeditions branch off it.
## Each edge is an ordered [from_id, to_id] pair (drawn undirected by the screen).
const EDGES: Array = [
	["home", "mine"],
	["home", "harbor"],
]

# ── helpers (pure, usable + testable without a scene tree) ─────────────────────

## Every zone dict, in declaration order.
static func all() -> Array:
	return ZONES

## The zone dict with id `id`, or an empty dict when no zone matches.
static func by_id(id: String) -> Dictionary:
	for z in ZONES:
		if String(z.get("id", "")) == id:
			return z
	return {}

## Map a GameState.active_biome value to its zone id: "farm" → "home", "mine" → "mine",
## "harbor" → "harbor". Falls back to "home" for any unknown/empty biome (the farm is
## the default location), so the screen always has a current zone to highlight.
static func current_id(active_biome: String) -> String:
	for z in ZONES:
		if String(z.get("biome", "")) == active_biome:
			return String(z.get("id", "home"))
	return "home"
