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
enum Modal { NONE, TOWN, MENU, INVENTORY, TOWNMAP, ACHIEVEMENTS, TILES, CHRONICLE, TOWNSFOLK, CARTOGRAPHY, RECIPES, TUTORIAL, CASTLE, DECORATIONS, PORTAL, CHARTER, QUESTS, DAILY, LEAVEBOARD, DEBUG, STARTFARMING, BOONS, KEEPER, LEAVEFARM }

var view:  int = View.BOARD
var modal: int = Modal.NONE

# ── Single source of truth: Modal → its deep-link ids ──────────────────────────
## ONE table the three id↔Modal helpers (resolve / modal_id / known_ids) derive from,
## so there is no hand-maintained alias list to drift out of sync. Each entry maps a
## Modal enum value to an ORDERED Array of its deep-link id strings:
##   - element [0] is the CANONICAL id (what modal_id() returns),
##   - any later element is an accepted alias resolve() also honours.
##
## ORDER MATTERS. known_ids() flattens this table in iteration order, and that order is
## load-bearing: DebugModal.jump_targets() walks known_ids() and keeps the FIRST id that
## resolves to each modal, so the canonical id must precede its aliases AND the entries
## must stay in Modal-enum order (NONE → … → KEEPER) — exactly the legacy hand-written
## known_ids() sequence. The Dictionary literal preserves insertion order in GDScript,
## so listing the modals in enum order below reproduces the old order byte-for-byte.
const MODAL_IDS: Dictionary = {
	Modal.NONE:         ["", "board"],
	Modal.TOWN:         ["town", "ledger"],
	Modal.MENU:         ["menu"],
	Modal.INVENTORY:    ["inventory", "items"],
	Modal.TOWNMAP:      ["map", "townmap"],
	Modal.ACHIEVEMENTS: ["achievements", "trophies"],
	Modal.TILES:        ["tiles", "collection"],
	Modal.CHRONICLE:    ["chronicle", "story"],
	Modal.TOWNSFOLK:    ["townsfolk", "folk"],
	Modal.CARTOGRAPHY:  ["cartography", "world"],
	# review-3 — "craft"/"crafting" resolve to the CRAFTING UI (the RecipeWikiScreen),
	# matching the 🔨 Craft bottom-nav tab. ("recipes"/"recipewiki" stay as aliases.)
	Modal.RECIPES:      ["recipes", "recipewiki", "craft", "crafting"],
	Modal.TUTORIAL:     ["tutorial"],
	Modal.CASTLE:       ["castle", "keep"],
	Modal.DECORATIONS:  ["decorations", "decor"],
	Modal.PORTAL:       ["portal", "summon"],
	Modal.CHARTER:      ["charter", "pact"],
	Modal.QUESTS:       ["quests", "almanac"],
	Modal.DAILY:        ["daily", "streak"],
	Modal.LEAVEBOARD:   ["leaveboard", "leave"],
	Modal.DEBUG:        ["debug"],
	Modal.STARTFARMING: ["startfarming", "farm"],
	# T31 — the Boons catalog screen (the ✨ Boons town entry). ("boon" is an alias.)
	Modal.BOONS:        ["boons", "boon"],
	# T31 — the keeper-encounter modal. Normally auto-triggered off a town/build event;
	# this deep-link lets QA / the sanity-capture preview the encounter.
	Modal.KEEPER:       ["keeper"],
	# Leave-FARM-session confirm (the puzzle board's top-left "◀ Leave" back button). Normally
	# opened by that button mid-run; this deep-link lets QA / the sanity-capture preview the card.
	Modal.LEAVEFARM:    ["leavefarm"],
}

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
	# Look the id up across the single MODAL_IDS table — any id in any Modal's list
	# (canonical or alias; "" / "board" map to Modal.NONE) yields that Modal. Unknown
	# id → { "ok": false }, byte-identical to the legacy match's default branch.
	for m in MODAL_IDS:
		if id in (MODAL_IDS[m] as Array):
			return { "ok": true, "view": View.BOARD, "modal": int(m) }
	return { "ok": false }

## Inverse of the modal component of resolve() — map a Modal.* value back to
## its canonical string id (element [0] of its MODAL_IDS list). Useful for harness
## round-tripping and logging. An unmapped Modal value → "" (matches the legacy default).
static func modal_id(m: int) -> String:
	var ids: Array = MODAL_IDS.get(m, [])
	if ids.is_empty():
		return ""
	# Modal.NONE's canonical id is "board" (its list is ["", "board"], so element [1]);
	# every other modal's canonical id is element [0].
	if m == Modal.NONE:
		return "board"
	return String(ids[0])

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

## All valid deep-link ids (the full set accepted by resolve()), flattened from the
## single MODAL_IDS table in Modal-enum order with each modal's canonical id before its
## aliases. The order is load-bearing — DebugModal.jump_targets() relies on it (see the
## MODAL_IDS doc comment) — and matches the legacy hand-written list byte-for-byte.
static func known_ids() -> PackedStringArray:
	var out: PackedStringArray = PackedStringArray()
	for m in MODAL_IDS:
		for id in (MODAL_IDS[m] as Array):
			out.append(String(id))
	return out
