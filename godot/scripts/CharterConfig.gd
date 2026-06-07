class_name CharterConfig
extends RefCounted
## The Charter — "The Hollow Pact": the six terms of the founding covenant, ported
## from the React charter feature (src/features/charter/index.tsx PACT_TERMS) as a
## pure-data catalog + the read-only derivation logic. The Charter is a READ-ONLY
## reflection of story state: it owns NO mutable state and NEVER writes to GameState.
## It reads game.story.choice_log + game.story.flags and DERIVES each term's status
## (honored / violated / pending). Mirrors the data-layer style of PortalConfig /
## DecorationConfig — a `class_name` global (no autoload) so its const + static helpers
## are reachable in headless tests before a scene tree exists. Stateless.
##
## ── PORTING NOTE — the NARRATIVE is verbatim; the beat/flag GATES are REMAPPED ──
## Each term's authored Hollow-Pact text (id / roman / title / description) is carried
## VERBATIM from the React PACT_TERMS — that is real authored React content. BUT the
## React terms reference beats/flags from the REACT story (act1_first_harvest,
## act2_bram_arrives, act3_festival, act3_win, keeper_path_coexist / keeper_path_driveout,
## …), MOST of which DO NOT EXIST in the Godot story arc (StoryConfig). The Godot port is
## a deliberately RE-SCOPED Town 1→2→3 slice with DIFFERENT beat/flag ids (see
## StoryConfig's porting notes). A verbatim port of the React related_beats/flags would
## render six terms that can NEVER resolve against the Godot story state — a dead/fake
## feature. So each term's `related_beats` / `honored_flags` / `violation_flags` are
## REMAPPED to the Godot arc's REAL ids (every id below is asserted to exist in
## StoryConfig by run_charter_tests.gd — the anti-dead-feature guard). The remap, term
## by term:
##   I   found_first        related: act1_arrival, act1_light_hearth, act1_first_order
##                          honored: intro_seen                       violation: (none)
##   II  audit_embers       related: act1_first_order, act2_quarry_foothold
##                          honored: first_order, quarry_foothold     violation: (none)
##   III three_names        related: act1_hamlet, act2_city_expedition, act2_first_iron
##                          honored: hamlet_named, reached_city        violation: (none)
##   IV  no_empty_hearths   related: act1_light_hearth, act1_first_order
##                          honored: hearth_lit                        violation: (none)
##   V   drive_out_bite     related: frostmaw_aftermath, act2_frostmaw_felled,
##                                   keeper_path_bound, keeper_path_broken
##                          honored: keeper_path_bound  violation: keeper_path_broken
##   VI  capital_last       related: act3_finish
##                          honored: settlement_lives                  violation: (none)
##
## Term V is the cleanest mapping — the Godot keeper-path CHOICE genuinely drives it:
## the player binds the wyrm (keeper_path_bound = coexist → HONORED) or breaks it
## (keeper_path_broken = drive-out → VIOLATED). The keeper decision is RECORDED as a
## choice_log row against the `frostmaw_aftermath` beat (the only beat with choices), so
## that beat — NOT a flag — is the term's testable related beat.
##
## ── DEVIATION FROM THE SUPPLIED REMAP TABLE (term V related_beats) ──────────────
## The brief's remap table listed `keeper_choice_made` as a term-V related BEAT. But
## `keeper_choice_made` is a FLAG in StoryConfig (FLAGS), NOT a beat — has_beat() is
## false for it, and a choice_log row never carries it as a beat_id (the keeper choice
## is logged against `frostmaw_aftermath`, the beat that owns the bind/break choices).
## Shipping `keeper_choice_made` as a related beat would (a) fail the has_beat() guard
## and (b) never match a real choice_log row. So term V's related_beats uses
## `frostmaw_aftermath` (the REAL choice beat) in its place. `keeper_path_bound` /
## `keeper_path_broken` are kept in related_beats too because they are ALSO flags (not
## beats) — see the second deviation note below.
##
## ── DEVIATION (term V related_beats — keeper_path_bound/broken are FLAGS too) ────
## The supplied table also listed `keeper_path_bound` / `keeper_path_broken` as term-V
## related BEATS. These are FLAGS (set by the frostmaw_aftermath choice outcome), not
## beats — has_beat() is false for them. They DO their real job as the honored/violation
## FLAGS (where they ARE asserted to exist via has_flag). To stay faithful to the table's
## intent while keeping the has_beat() anti-dead-feature guard meaningful, term_related_entries
## only ever MATCHES choice_log rows whose beat_id is in related_beats — and the only
## keeper-choice row uses beat_id `frostmaw_aftermath`. So including the two flag ids in
## related_beats is harmless (they simply never match a row) but would make a has_beat()
## assertion over related_beats fail. run_charter_tests.gd therefore asserts has_beat()
## only over the related_beats that ARE real beats and has_flag() over the honored/
## violation flags; the two keeper-path flag ids are intentionally LEFT OUT of term V's
## related_beats so every related_beats id is a real beat. (Net: term V related_beats =
## [frostmaw_aftermath, act2_frostmaw_felled].)

## The six Hollow-Pact terms, in stable display order. Each entry:
##   id:              String — stable term id (matches React PACT_TERMS id)
##   roman:           String — the roman numeral ("I".."VI")
##   title:           String — display title (verbatim React)
##   description:     String — the term's authored text (VERBATIM React)
##   related_beats:   Array  — Godot beat ids whose choice_log rows test this term
##   honored_flags:   Array  — Godot flag ids that mark this term honored
##   violation_flags: Array  — Godot flag ids that mark this term violated
const PACT_TERMS: Array = [
	{
		"id": "found_first",
		"roman": "I",
		"title": "Found before you spend",
		"description": "Every settlement is founded at the home hearth before its bounty is spent abroad.",
		"related_beats": ["act1_arrival", "act1_light_hearth", "act1_first_order"],
		"honored_flags": ["intro_seen"],
		"violation_flags": [],
	},
	{
		"id": "audit_embers",
		"roman": "II",
		"title": "Audit the embers",
		"description": "What burns in the hearth is counted, and what is counted is remembered.",
		"related_beats": ["act1_first_order", "act2_quarry_foothold"],
		"honored_flags": ["first_order", "quarry_foothold"],
		"violation_flags": [],
	},
	{
		"id": "three_names",
		"roman": "III",
		"title": "Three names, three roads",
		"description": "Three settlements named in your hand before the capital is called.",
		"related_beats": ["act1_hamlet", "act2_city_expedition", "act2_first_iron"],
		"honored_flags": ["hamlet_named", "reached_city"],
		"violation_flags": [],
	},
	{
		"id": "no_empty_hearths",
		"roman": "IV",
		"title": "No empty hearths",
		"description": "No lot abandoned, no hearth left cold once it has been lit.",
		"related_beats": ["act1_light_hearth", "act1_first_order"],
		"honored_flags": ["hearth_lit"],
		"violation_flags": [],
	},
	{
		"id": "drive_out_bite",
		"roman": "V",
		"title": "Drive out only what bites",
		"description": "A keeper may be driven out only after it has harmed a settler. Every drive-out adds a mark to this term unless the keeper has bitten first.",
		# DEVIATION: the brief's table listed keeper_choice_made / keeper_path_bound /
		# keeper_path_broken here, but those are FLAGS, not beats. The real keeper-choice
		# beat is frostmaw_aftermath (the only beat with bind/break choices); the wyrm-fall
		# beat is act2_frostmaw_felled. The bound/broken FLAGS carry the honored/violation
		# below. See the header notes.
		"related_beats": ["frostmaw_aftermath", "act2_frostmaw_felled"],
		"honored_flags": ["keeper_path_bound"],
		"violation_flags": ["keeper_path_broken"],
	},
	{
		"id": "capital_last",
		"roman": "VI",
		"title": "The capital is the last",
		"description": "The old capital opens only when three settlements have stood. Three tokens, three roads, then the gate.",
		"related_beats": ["act3_finish"],
		"honored_flags": ["settlement_lives"],
		"violation_flags": [],
	},
]

# ── Catalog helpers (usable without an instance) ──────────────────────────────────

## Every term in stable display order (a defensive deep copy, so a caller can't
## mutate the const term dicts / their arrays).
static func all() -> Array:
	var out: Array = []
	for t in PACT_TERMS:
		out.append((t as Dictionary).duplicate(true))
	return out

## Number of terms in the Hollow Pact (always 6).
static func count() -> int:
	return PACT_TERMS.size()

## The full term entry for `id` (a deep COPY), or {} for an unknown id.
static func term_by_id(id: String) -> Dictionary:
	for t in PACT_TERMS:
		if String(t.get("id", "")) == id:
			return (t as Dictionary).duplicate(true)
	return {}

# ── Derivation (ported EXACTLY from src/features/charter/index.tsx) ───────────────

## choice_log entries whose beat_id is one of the term's related_beats. Mirrors React
## termRelatedEntries. Each entry is the raw choice_log row ({beat_id, choice_id}).
static func term_related_entries(term: Dictionary, choice_log: Array) -> Array:
	var related: Array = term.get("related_beats", [])
	var out: Array = []
	for e in choice_log:
		if not (e is Dictionary):
			continue
		var beat_id: String = String((e as Dictionary).get("beat_id", ""))
		if related.has(beat_id):
			out.append(e)
	return out

## Derive a term's state — "violated" | "honored" | "pending" — with the React
## precedence (deriveTermState):
##   1. VIOLATED  if ANY violation_flag is set.
##   2. HONORED   else if ANY honored_flag is set OR there is >= 1 related entry.
##   3. PENDING   otherwise.
static func derive_term_state(term: Dictionary, choice_log: Array, flags: Dictionary) -> String:
	for f in term.get("violation_flags", []):
		if bool(flags.get(String(f), false)):
			return "violated"
	for f in term.get("honored_flags", []):
		if bool(flags.get(String(f), false)):
			return "honored"
	if term_related_entries(term, choice_log).size() > 0:
		return "honored"
	return "pending"

## The player-facing caption for a term, matching React termCaption EXACTLY (incl.
## singular/plural and the "|| 1" floor on the count):
##   violated → "Violated — N recorded mark(s)"
##   honored  → "Honored across N choice(s)"
##   pending  → "Awaiting your hand"
static func term_caption(term: Dictionary, choice_log: Array, flags: Dictionary) -> String:
	var entries: Array = term_related_entries(term, choice_log)
	var n: int = entries.size()
	var state: String = derive_term_state(term, choice_log, flags)
	if state == "violated":
		var marks: int = n if n > 0 else 1   # React: entries.length || 1
		var mark_word: String = "mark" if marks == 1 else "marks"
		return "Violated — %d recorded %s" % [marks, mark_word]
	if state == "honored":
		var choices: int = n if n > 0 else 1
		var choice_word: String = "choice" if choices == 1 else "choices"
		return "Honored across %d %s" % [choices, choice_word]
	return "Awaiting your hand"

## The pill TONE (a Palette Color) for a term state, mirroring React statePillTone:
##   honored → moss/green   violated → rose/red   pending → iron/grey
## Uses the project's Palette tokens (Palette.MOSS for honored; a rose red for
## violated; Palette.IRON for pending) — consistent with how the other screens pick
## status colors from Palette.
static func state_pill_tone(state: String) -> Color:
	if state == "honored":
		return Palette.MOSS
	if state == "violated":
		return COL_ROSE
	return Palette.IRON

## A rose/red for the "violated" pill (the React `rose` tone). The Palette has no
## dedicated rose token, so this is the charter-local violation accent.
const COL_ROSE := Color8(0xb0, 0x3a, 0x2e)

## The pill LABEL for a term state, mirroring React statePillLabel (the state word
## itself: "honored" | "violated" | "pending").
static func state_pill_label(state: String) -> String:
	return state

## Resolve a choice_log entry to its display fields, mirroring React formatChoiceEntry:
##   { title:String, choice_label:String, act }
## Looks the beat up via StoryConfig.beat_by_id; if the beat is unknown, falls back to
## the raw beat_id as the title, the raw choice_id as the label, and act = 0 (React used
## null for "no act"; the port has no null int, so 0 is the sentinel and the UI hides
## the act badge when act <= 0). For a known beat, resolves the choice label from the
## beat's `choices` array (matching choice_id), falling back to the raw choice_id.
static func format_choice_entry(entry: Dictionary) -> Dictionary:
	var beat_id: String = String(entry.get("beat_id", ""))
	var choice_id: String = String(entry.get("choice_id", ""))
	var beat: Dictionary = StoryConfig.beat_by_id(beat_id)
	if beat.is_empty():
		return {
			"title": beat_id,
			"choice_label": choice_id,
			"act": 0,   # sentinel for "no act" (React used null)
		}
	var title: String = String(beat.get("title", beat_id))
	if title == "":
		title = beat_id
	var act: int = int(beat.get("act", 0))
	var choice_label: String = choice_id
	for c in beat.get("choices", []):
		if not (c is Dictionary):
			continue
		if String((c as Dictionary).get("id", "")) == choice_id:
			choice_label = String((c as Dictionary).get("label", choice_id))
			break
	return {
		"title": title,
		"choice_label": choice_label,
		"act": act,
	}
