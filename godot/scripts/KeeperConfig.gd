class_name KeeperConfig
extends RefCounted
## The biome KEEPERS — ported VERBATIM from src/keepers.ts (T31). Each settlement type
## (farm / mine / harbor) has a guardian "made conscious by the founding bargain". Once a
## settlement is built up its keeper appears and the player makes a FINAL, per-settlement
## choice:
##   • Coexist  — the keeper stays, the biome keeps its wild gifts → grants 5 Embers
##   • Drive Out — the keeper withdraws → grants 5 Core Ingots
## The choice sets a `keeper_<type>_<path>` story flag (kingdom-wide, path-gated) and grants
## the path's currency. This config is the source of truth for the encounter dialogue +
## rewards (the GDScript analogue of the React KEEPERS map).
##
## SIMPLIFICATION (per the T31 brief). React's Drive Out launches an opt-in "Keeper Trial"
## mini-game (startKeeperTrial → a special board); the port has no trial mini-game, so the
## faithful outcome is collapsed into a DIRECT choice on the keeper encounter: choosing a path
## immediately sets the path flag + grants the currency (give_keeper_reward). The DIALOGUE
## (intro + per-path pitch) is carried verbatim so the encounter reads identically.
##
## Registered as a `class_name` global (like BossConfig / PortalConfig / WorkerConfig) so its
## const + static helpers are reachable WITHOUT a live autoload — headless tests run before the
## scene tree exists. Stateless: never instantiated.
##
## FEATURE FLAG (same spirit as Constants.FIRE_HAZARD_ENABLED + GameState.fire_hazard_force).
## `enabled` gates the WHOLE keeper ENCOUNTER system: the auto-trigger off a build
## (Main._maybe_trigger_keeper via GameState.keeper_encounter_ready), the `keeper` deeplink / QA open
## (Main._open_keeper), and the currency grant (GameState.give_keeper_reward). Default ON = shipped
## behaviour; set it to false — here to disable permanently, or at runtime (a test / dev path) — to
## disable keepers FULLY: no encounter ever fires, the deeplink no-ops, and no Embers/Core Ingots are
## ever granted.
##
## SAFE TO TOGGLE: story/act progression does NOT depend on it (StoryEngine.next_beat never gates on
## the act, so the act1_keeper_trial beat simply never fires, and NOTHING consumes the
## home_keeper_resolved flag). The only knock-on: the Boons economy has no currency source while it's
## off (Embers/Core Ingots are granted ONLY by the keeper), so boons stay unpurchasable — the Boons
## screen still opens and shows 0/0. No crash, no soft-lock.
##
## A runtime-settable `static var` (not a const) so tests can exercise the OFF path and reset it; the
## keeper unit tests assume the default-ON, and one dedicated test flips it OFF + back.
static var enabled: bool = true

## True when the keeper encounter system is enabled (the `enabled` flag above). Single source of
## truth read by GameState.keeper_encounter_ready / give_keeper_reward and Main._open_keeper.
static func is_enabled() -> bool:
	return enabled

## The three keepers, keyed by settlement TYPE ("farm" | "mine" | "harbor"). Each entry, carried
## verbatim from src/keepers.ts:
##   id:                   String  — stable keeper id (deer_spirit / stone_knocker / tidesinger)
##   name:                 String  — display name ("The Deer-Spirit")
##   title:                String  — flavour title ("Keeper of Field & Herd")
##   icon:                 String  — the keeper emoji (🦌 / 🪨 / 🌊)
##   appears_after_buildings: int  — buildings the settlement needs before the keeper appears
##   intro:                Array[String] — encounter intro lines (narration / keeper speech)
##   coexist: { label:String, pitch:Array[String], embers:int }    — Coexist path
##   driveout: { label:String, pitch:Array[String], core_ingots:int } — Drive Out path
const KEEPERS: Dictionary = {
	"farm": {
		"id": "deer_spirit",
		"name": "The Deer-Spirit",
		"title": "Keeper of Field & Herd",
		"icon": "🦌",
		"appears_after_buildings": 4,
		"intro": [
			"A tall, stag-headed figure walks the edge of the field at twilight, moving with the unhurried air of an old judge who has heard every excuse at least twice.",
			"Deer-Spirit: \"I have watched you work. You are not the first. You will not be the last. ...You are, however, the first to fix that fence properly. Credit where it's due.\"",
			"Deer-Spirit: \"I tend this place. Some lines have asked me to leave. Some have asked me to stay. I will accept either — but choose with your whole chest, as the young ones say. Speak.\"",
		],
		"coexist": {
			"label": "Stay — tend the land with me.",
			"pitch": [
				"The Deer-Spirit lowers its great head. The hearth flares a soft, mossy green.",
				"Deer-Spirit: \"Then we keep it together. The soil stays rich. The herds stay calm. The crows stay... mostly polite. Walk well, line-of-my-watching.\"",
			],
			"embers": 5,
		},
		"driveout": {
			"label": "Go — I'll tend it alone.",
			"pitch": [
				"The Deer-Spirit nods once — the way a judge nods at a verdict it disagrees with but is obliged to record.",
				"Deer-Spirit: \"Then we should contest. ...Or we could not, and I simply leave, and you get a very tidy field and a faint, lifelong sense of having mislaid something. ...I'll allow it. The hearth is yours.\"",
			],
			"core_ingots": 5,
		},
	},
	"mine": {
		"id": "stone_knocker",
		"name": "The Stone-Knocker",
		"title": "Keeper of the Deep Ways",
		"icon": "🪨",
		"appears_after_buildings": 3,
		"intro": [
			"Deep in the workings a stout figure of living rock raps its knuckles along the wall, listening for weak seams. Its voice is a copper kettle. It is older than the other keepers and does not enjoy small talk.",
			"Stone-Knocker: \"You've been here long enough that you can hear me. Good. Saves time.\"",
			"Stone-Knocker: \"We talk. Quick. The stone has no patience for speeches, and frankly neither do I. Pick.\"",
		],
		"coexist": {
			"label": "Share the stone.",
			"pitch": [
				"Stone-Knocker: \"Acceptable. I keep the props honest, you keep the carts moving, nobody gets buried who didn't earn it. Deal.\"",
				"It knocks once on the wall. Somewhere overhead, a seam that was thinking about collapsing quietly reconsiders.",
			],
			"embers": 5,
		},
		"driveout": {
			"label": "The stone is mine.",
			"pitch": [
				"Stone-Knocker: \"...Bold. Wrong, but bold.\" It steps back into the rock the way a man steps behind a curtain.",
				"\"Mind the ceiling,\" it says, from somewhere inside the wall. The deep ways are yours now — quieter, steadier, and noticeably less lucky.",
			],
			"core_ingots": 5,
		},
	},
	"harbor": {
		"id": "tidesinger",
		"name": "The Tidesinger",
		"title": "Keeper of Wrecks & Runs",
		"icon": "🌊",
		"appears_after_buildings": 3,
		"intro": [
			"On a strange, glassy grey morning the sea goes still and someone is singing. A thin, fluid figure sits on the breakwater with her feet in the foam, far too cheerful for the hour.",
			"Tidesinger: \"Hello, hello, line of my line's neighbours! The tide knows you. It says you're 'fine.' That's high praise — it called the last lot 'a bit much.'\"",
			"Tidesinger: \"So: sing with me, or send me off? Either way I do the harmony. Speak — and try to land on the beat.\"",
		],
		"coexist": {
			"label": "Sing with me.",
			"pitch": [
				"Tidesinger: \"Yesss. We do it properly, then — the fish run thick, the wrecks give up their secrets, the storms knock before they let themselves in.\"",
				"She holds a note that makes the gulls go quiet. \"...Mostly. I'm a keeper, not a miracle. Fair tides to you.\"",
			],
			"embers": 5,
		},
		"driveout": {
			"label": "The harbor is my charter.",
			"pitch": [
				"Tidesinger: \"Ooh — 'charter.' Big word. The Hollow Folk *love* that word.\" She slides off the breakwater without a splash.",
				"\"Off I go, then. The harbour's yours: reliable, tidy, and roughly forty percent less interesting. Enjoy it!\"",
			],
			"core_ingots": 5,
		},
	},
}

## Stable iteration order of the settlement TYPES (matches src/keepers.ts key order).
const KEEPER_TYPES: Array = ["farm", "mine", "harbor"]

# ── Static helpers (usable without an instance) ──────────────────────────────────

## True when `type` names a real keeper settlement type ("farm" | "mine" | "harbor").
static func has_keeper(type: String) -> bool:
	return KEEPERS.has(type)

## The full keeper entry for settlement `type` (a deep COPY so the caller can't mutate the
## const), or {} for an unknown type. (React keeperForType.)
static func keeper_for_type(type: String) -> Dictionary:
	if not KEEPERS.has(type):
		return {}
	return (KEEPERS[type] as Dictionary).duplicate(true)

## The keeper id ("deer_spirit" / …) for settlement `type` ("" for an unknown type).
static func keeper_id(type: String) -> String:
	return String(keeper_for_type(type).get("id", ""))

## Display name for the keeper of settlement `type` ("" for an unknown type).
static func keeper_name(type: String) -> String:
	return String(keeper_for_type(type).get("name", ""))

## Flavour title for the keeper of settlement `type` ("" for an unknown type).
static func keeper_title(type: String) -> String:
	return String(keeper_for_type(type).get("title", ""))

## The keeper emoji for settlement `type` ("" for an unknown type).
static func keeper_icon(type: String) -> String:
	return String(keeper_for_type(type).get("icon", ""))

## Buildings the settlement of `type` needs before its keeper appears (0 for an unknown type).
static func appears_after_buildings(type: String) -> int:
	return int(keeper_for_type(type).get("appears_after_buildings", 0))

## The encounter intro lines for settlement `type` (a COPY; [] for an unknown type).
static func intro_lines(type: String) -> Array:
	var lines: Variant = keeper_for_type(type).get("intro", [])
	return (lines as Array).duplicate() if lines is Array else []

## The path slice ({label, pitch, embers?|core_ingots?}) for `type` + `path` ∈ {coexist,
## driveout} (a COPY; {} for an unknown type/path). (React keeperPathInfo.)
static func path_info(type: String, path: String) -> Dictionary:
	var k: Dictionary = keeper_for_type(type)
	if k.is_empty():
		return {}
	if path == "coexist":
		return (k.get("coexist", {}) as Dictionary).duplicate(true)
	if path == "driveout":
		return (k.get("driveout", {}) as Dictionary).duplicate(true)
	return {}

## The player-facing button label for `type` + `path` ("" for an unknown type/path).
static func path_label(type: String, path: String) -> String:
	return String(path_info(type, path).get("label", ""))

## The per-path pitch lines for `type` + `path` (a COPY; [] for an unknown type/path).
static func path_pitch(type: String, path: String) -> Array:
	var p: Variant = path_info(type, path).get("pitch", [])
	return (p as Array).duplicate() if p is Array else []

## Embers granted by the Coexist path for `type` (0 for an unknown type / non-coexist).
static func coexist_embers(type: String) -> int:
	return int(path_info(type, "coexist").get("embers", 0))

## Core Ingots granted by the Drive Out path for `type` (0 for an unknown type / non-driveout).
static func driveout_core_ingots(type: String) -> int:
	return int(path_info(type, "driveout").get("core_ingots", 0))

## True when `path` is a real keeper path id ("coexist" | "driveout").
static func is_path(path: String) -> bool:
	return path == "coexist" or path == "driveout"

## The story-flag id set when settlement `type` resolves keeper `path`: `keeper_<type>_<path>`
## (mirrors React's keeper_<zoneId>_<path>; the port keys by TYPE since the home settlement IS
## its biome type). "" for an unknown type/path.
static func flag_for(type: String, path: String) -> String:
	if not has_keeper(type) or not is_path(path):
		return ""
	return "keeper_%s_%s" % [type, path]
