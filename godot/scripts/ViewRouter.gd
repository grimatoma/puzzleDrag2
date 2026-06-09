class_name ViewRouter extends RefCounted
## Pure navigation state machine — no Node, no signals, no scene access.
## Instantiate directly in tests: ViewRouter.new()
##
## Resolve dictionary shape (returned by resolve()):
##   Success:  { "ok": true,  "view": View.*,  "modal": Modal.* }
##   Failure:  { "ok": false }
##
## Every successful resolve includes BOTH view and modal so callers can
## act on either field without nil-checking. The board view is always
## BOARD (it is the only top-level view today); the modal field controls
## what overlay (if any) is shown on top of it.

enum View  { BOARD }
enum Modal { NONE, TOWN, MENU, INVENTORY, TOWNMAP, ACHIEVEMENTS, TILES, CHRONICLE, TOWNSFOLK, CARTOGRAPHY, RECIPES, TUTORIAL, CASTLE, DECORATIONS, PORTAL, CHARTER, QUESTS, DAILY, LEAVEBOARD, DEBUG, STARTFARMING, BOONS, KEEPER }

var view:  int = View.BOARD
var modal: int = Modal.NONE

# ── Instance state machine ────────────────────────────────────────────────────

## Set the active modal. Pass Modal.NONE to close without calling close_modal().
func open_modal(m: int) -> void:
	modal = m

## Close whatever modal is open (set to NONE).
func close_modal() -> void:
	modal = Modal.NONE

## Return true if modal m is currently open.
func is_open(m: int) -> bool:
	return modal == m

## Return the currently active modal (one of the Modal.* enum values).
func current_modal() -> int:
	return modal

# ── Static helpers ────────────────────────────────────────────────────────────

## Resolve a deep-link id string to a navigation intent.
## Returns { "ok": true, "view": View.*, "modal": Modal.* } on success,
## or       { "ok": false }                                  on unknown id.
static func resolve(id: String) -> Dictionary:
	match id:
		"", "board":
			return { "ok": true, "view": View.BOARD, "modal": Modal.NONE }
		"town", "ledger":
			return { "ok": true, "view": View.BOARD, "modal": Modal.TOWN }
		"menu":
			return { "ok": true, "view": View.BOARD, "modal": Modal.MENU }
		"inventory", "items":
			return { "ok": true, "view": View.BOARD, "modal": Modal.INVENTORY }
		"map", "townmap":
			return { "ok": true, "view": View.BOARD, "modal": Modal.TOWNMAP }
		"achievements", "trophies":
			return { "ok": true, "view": View.BOARD, "modal": Modal.ACHIEVEMENTS }
		"tiles", "collection":
			return { "ok": true, "view": View.BOARD, "modal": Modal.TILES }
		"chronicle", "story":
			return { "ok": true, "view": View.BOARD, "modal": Modal.CHRONICLE }
		"townsfolk", "folk":
			return { "ok": true, "view": View.BOARD, "modal": Modal.TOWNSFOLK }
		"cartography", "world":
			return { "ok": true, "view": View.BOARD, "modal": Modal.CARTOGRAPHY }
		"recipes", "recipewiki", "craft", "crafting":
			# review-3 — "craft" now resolves to the CRAFTING UI (the RecipeWikiScreen), matching
			# the 🔨 Craft bottom-nav tab. ("recipes"/"recipewiki" stay as aliases.)
			return { "ok": true, "view": View.BOARD, "modal": Modal.RECIPES }
		"tutorial":
			return { "ok": true, "view": View.BOARD, "modal": Modal.TUTORIAL }
		"castle", "keep":
			return { "ok": true, "view": View.BOARD, "modal": Modal.CASTLE }
		"decorations", "decor":
			return { "ok": true, "view": View.BOARD, "modal": Modal.DECORATIONS }
		"portal", "summon":
			return { "ok": true, "view": View.BOARD, "modal": Modal.PORTAL }
		"charter", "pact":
			return { "ok": true, "view": View.BOARD, "modal": Modal.CHARTER }
		"quests", "almanac":
			return { "ok": true, "view": View.BOARD, "modal": Modal.QUESTS }
		"daily", "streak":
			return { "ok": true, "view": View.BOARD, "modal": Modal.DAILY }
		"leaveboard", "leave":
			return { "ok": true, "view": View.BOARD, "modal": Modal.LEAVEBOARD }
		"debug":
			return { "ok": true, "view": View.BOARD, "modal": Modal.DEBUG }
		"startfarming", "farm":
			return { "ok": true, "view": View.BOARD, "modal": Modal.STARTFARMING }
		"boons", "boon":
			# T31 — the Boons catalog screen (the ✨ Boons town entry). ("boon" is an alias.)
			return { "ok": true, "view": View.BOARD, "modal": Modal.BOONS }
		"keeper":
			# T31 — the keeper-encounter modal. Normally auto-triggered off a town/build event;
			# this deep-link lets QA / the sanity-capture preview the encounter.
			return { "ok": true, "view": View.BOARD, "modal": Modal.KEEPER }
		_:
			return { "ok": false }

## Inverse of the modal component of resolve() — map a Modal.* value back to
## its canonical string id. Useful for harness round-tripping and logging.
static func modal_id(m: int) -> String:
	match m:
		Modal.NONE:      return "board"
		Modal.TOWN:      return "town"
		Modal.MENU:      return "menu"
		Modal.INVENTORY: return "inventory"
		Modal.TOWNMAP:   return "map"
		Modal.ACHIEVEMENTS: return "achievements"
		Modal.TILES:        return "tiles"
		Modal.CHRONICLE:    return "chronicle"
		Modal.TOWNSFOLK:    return "townsfolk"
		Modal.CARTOGRAPHY:  return "cartography"
		Modal.RECIPES:      return "recipes"
		Modal.TUTORIAL:     return "tutorial"
		Modal.CASTLE:       return "castle"
		Modal.DECORATIONS:  return "decorations"
		Modal.PORTAL:       return "portal"
		Modal.CHARTER:      return "charter"
		Modal.QUESTS:       return "quests"
		Modal.DAILY:        return "daily"
		Modal.LEAVEBOARD:   return "leaveboard"
		Modal.DEBUG:        return "debug"
		Modal.STARTFARMING: return "startfarming"
		Modal.BOONS:        return "boons"
		Modal.KEEPER:       return "keeper"
		_:               return ""

## Parse a browser `location.hash` ("#/inventory", "#inventory", "#/", "") into a
## deep-link id string. Strips the leading "#"/"/" decoration, then validates the
## remainder against resolve(); anything empty or unknown falls back to "board" (the
## root view) so junk in the address bar can never wedge the nav. Pure + static so
## the web History bridge in Main and the headless tests share one parser.
static func id_from_hash(hash: String) -> String:
	var raw := hash.strip_edges().lstrip("#/")
	if raw == "":
		return "board"
	if bool(resolve(raw).get("ok", false)):
		return raw
	return "board"

## All valid deep-link ids (the full set accepted by resolve()).
static func known_ids() -> PackedStringArray:
	return PackedStringArray(["", "board", "town", "ledger", "menu", "inventory", "items", "map", "townmap", "achievements", "trophies", "tiles", "collection", "chronicle", "story", "townsfolk", "folk", "cartography", "world", "recipes", "recipewiki", "craft", "crafting", "tutorial", "castle", "keep", "decorations", "decor", "portal", "summon", "charter", "pact", "quests", "almanac", "daily", "streak", "leaveboard", "leave", "debug", "startfarming", "farm", "boons", "boon", "keeper"])
