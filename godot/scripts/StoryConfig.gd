class_name StoryConfig
extends RefCounted
## Story CATALOG (story-engine logic core) — the ported, port-reachable subset of the
## Phaser story beats (src/story.ts STORY_BEATS + SIDE_BEATS). Pure data + pure
## lookups; the condition/snapshot/fire/choice logic lives in StoryEngine (pure
## static) and is wired ADDITIVELY into GameState event sites (post_story_event).
## NO modal/chronicle UI — that's a later slice. Mirrors the data-layer style of
## AchievementConfig / BossConfig / BuildingConfig.
##
## ── PORTING NOTES (what we KEPT, ADAPTED, and OMITTED vs React story.ts) ──────
## The Godot port is the Town 1 (farm) → Town 2 (mine + Frostmaw) → Town 3 (rats)
## slice. A beat is included only if the port's CURRENT progression can actually
## FIRE it — no fakes, no unreachable beats. React gated beats on tile-key totals,
## NPC bonds, keepers, zones, and fish; the port has none of those, so every
## ported beat's `when` is re-expressed against PORT FACTS (see StoryEngine.build_snapshot):
##   event.type ∈ { session_start, tier_up(+event.tier), boss_defeated,
##                  building_built(+event.id), order_fulfilled, chain }
##   inventory.<resource_key>  — current count of a PRODUCED resource (hay_bundle,
##                               flour, block, …) for threshold beats
##   tier                      — settlement.tier (int)
##   flag.<id>                 — story flags
##
## NARRATIVE (titles + lines) is ported faithfully; only the GATE is adapted, and
## any unportable EFFECT is stripped (no spawnNPC, no unlockBiome, no bondDelta,
## no keeper/zone/fish choices). Adaptations are noted inline per beat.
##
## ── OMITTED beats (gated on systems the port lacks) ──────────────────────────
##   act1_first_harvest  — folded into act1_light_hearth (single "bring 20 hay" gate;
##                         React split it into a 1-tile and a 20-tile beat — the port
##                         keeps the meaningful 20-hay milestone).
##   act1_keeper_trial   — NOW PORTED (T29): the keeper system exists (T31, KeeperConfig +
##                         give_keeper_reward). Re-expressed against the keeper_farm_<path> flag
##                         instead of the absent keeper_confronted event. See the beat below.
##   act2_bram_arrives / act2_liss_arrives — spawnNPC (Bram / Sister Liss) + NPC roster:
##                         NO NPCs in the port. (Bram's smith flavour survives as the
##                         narrator voice in the quarry/iron beats.)
##   act2_first_hinge    — craft_made(iron_hinge): the port has no iron_hinge recipe
##                         (RecipeConfig is bread/supplies). Iron progress is instead
##                         carried by the quarry beat (inventory.block) + the mine arc.
##   act3_mine_found / act3_mine_opened — gated on act_entered + tile_mine_coal totals
##                         and carry unlockBiome:"mine" (the port unlocks the mine via
##                         the City tier + supplies, not a story flag). Replaced by a
##                         single tier-driven "the mine opens at City" beat.
##   act3_caravan        — building_built(caravan_post): no caravan_post building.
##   act3_festival / act3_win — gated on all_buildings_built + five tile-key larders
##                         (tile_grain_wheat / tile_fruit_blackberry / tile_tree_oak,
##                         none of which the port's inventory accumulates). Replaced by
##                         a single port-honest finish beat on the rats milestone +
##                         a built-out town (block larder).
##   mira_letter_* / frostmaw_keeper* — Bond-8 NPC arc / keeper meta-currency
##                         (Embers / Core Ingots): NO NPCs, bonds, or meta-currencies
##                         in the port. The ONE surviving branching beat (a player
##                         CHOICE with grants) is reimagined as the Frostmaw aftermath
##                         (frostmaw_aftermath) granting plain coins/block — the only
##                         currencies the port has — so the choice machinery is exercised.

# ── Flags the ported beats reference (set by onComplete or a choice) ──────────
## Pure data. Mirrors the relevant slice of src/flags.ts STORY_FLAGS — only the
## flags the PORTABLE beats actually set are listed (a UI/wiki can iterate this).
## Each entry: { id, label, desc }.
const FLAGS: Array = [
	{"id": "intro_seen",          "label": "Intro seen",           "desc": "The player has met Wren at the cold hearth and named the settlement."},
	{"id": "hearth_lit",          "label": "Hearth lit",           "desc": "Twenty hay gathered — the Hearth is alive again."},
	{"id": "first_order",         "label": "First order",          "desc": "The player has fulfilled their first villager order."},
	{"id": "lumber_raised",       "label": "Lumber camp raised",   "desc": "A Lumber Camp stands; the board now grows trees → planks."},
	{"id": "hamlet_named",        "label": "Grown to a Hamlet",    "desc": "The settlement has climbed from Camp to Hamlet."},
	{"id": "kitchen_packed",      "label": "Kitchen packing",      "desc": "A Kitchen packs farm food into supplies for the mine."},
	{"id": "reached_city",        "label": "Reached City",         "desc": "The settlement has reached City — the expedition into the mine opens."},
	{"id": "quarry_foothold",     "label": "Quarry foothold",      "desc": "Twenty blocks banked — the stone economy is stable."},
	{"id": "iron_drawn",          "label": "Iron drawn",           "desc": "The mine has yielded its first iron bars."},
	{"id": "frostmaw_felled",     "label": "Frostmaw felled",      "desc": "The capstone frost-wyrm is defeated; Town 2 is complete."},
	{"id": "keeper_choice_made",  "label": "Keeper choice made",   "desc": "The player has decided the Frostmaw's fate (bind it / break it)."},
	{"id": "keeper_path_bound",   "label": "Keeper path — bound",  "desc": "The player bound the wyrm to the hearth (warmth over spoils)."},
	{"id": "keeper_path_broken",  "label": "Keeper path — broken", "desc": "The player broke the wyrm's hold and took its core (spoils)."},
	{"id": "rats_arrived",        "label": "Rats arrived",         "desc": "With Town 2 done, vermin creep into the fields — the Town 3 lesson."},
	{"id": "settlement_lives",    "label": "The settlement lives", "desc": "Town 1→2→3 mastered — the settlement stands on its own."},
	# T29 — flags reachable now that the gating systems are ported (keepers / gifts / bonds).
	{"id": "home_keeper_resolved","label": "Home keeper resolved", "desc": "The home settlement's keeper (the Deer-Spirit) has been faced and a path chosen."},
	{"id": "first_gift_given",    "label": "First gift given",     "desc": "The player has given a villager their first gift — the bond economy has begun."},
	{"id": "bond_liked_reached",  "label": "A villager warmed",    "desc": "A villager's bond has risen into Liked — someone in the Vale truly trusts you now."},
]

# ── Beats ─────────────────────────────────────────────────────────────────────
## ~17 portable beats spanning the port's arc:
##   arrival → light the hearth → first order → first spawner → grow to Hamlet →
##   (T29) face the keeper → (T29) first gift → (T29) a villager warms →
##   pack the kitchen → reach City → quarry/stone → first iron → boss defeated →
##   (CHOICE: bind/break the wyrm) → rats → finish.
## The three T29 beats (act1_keeper_trial / side_first_gift / side_bond_liked) became
## reachable once the keeper (T31), gift (T18/T19), and bond-band (T20) systems were ported.
##
## Beat shape (Dictionary):
##   id:         String   — stable id; the fired-marker is "_fired_<id>"
##   act:        int      — narrative act (1..3); a beat may carry it (StoryEngine
##                          advances story_state.act to the MAX act fired)
##   title:      String   — display title
##   lines:      Array    — [{speaker:String, text:String}] (speaker "" = narrator)
##   when:       Dictionary — the StoryEngine condition tree ({} = no auto-fire;
##                          choice-queued resolution beats carry {})
##   on_complete:Dictionary — {set_flag:[ids]} applied when the beat fires
##   choices:    Array    — optional [{id,label,outcome:{set_flag,resources,coins,queue_beat}}]
##   repeat:     bool     — re-fireable (default false — one-time via the fired marker)
const BEATS: Array = [
	# ── Act 1 ─────────────────────────────────────────────────────────────────
	{
		"id": "act1_arrival",
		"act": 1,
		"title": "A Cold Hearth",
		"lines": [
			{"speaker": "", "text": "You step through a doorway that has not been a doorway in years. A figure waits by a cold stone hollow."},
			{"speaker": "Wren", "text": "Took you long enough."},
			{"speaker": "Wren", "text": "This was the Hearth — or it will be again, if you've still got the hands for it."},
			{"speaker": "", "text": "She presses a pair of iron tongs into your palm."},
			{"speaker": "Wren", "text": "Bring me twenty hay — we light it tonight. But first this place needs a name. Yours, now."},
		],
		# React: when event.type == session_start. Port: identical — fired by
		# GameState.start_story_session(). (The name-settlement prompt is UI-only and
		# dropped from the logic layer.)
		"when": {"fact": "event.type", "op": "eq", "value": "session_start"},
		"on_complete": {"set_flag": ["intro_seen"]},
		"repeat": false,
	},
	{
		"id": "act1_light_hearth",
		"act": 1,
		"title": "First Light",
		"lines": [
			{"speaker": "Wren", "text": "There. The first of many. This land was dead, but it still remembers how to grow."},
			{"speaker": "Wren", "text": "The Hearth is alive again. The fields will keep us now."},
		],
		# React: resource.tile_grass_grass.total >= 20  (folded act1_first_harvest in).
		# Port: grass PRODUCES hay_bundle, so the 20-hay gate is inventory.hay_bundle.
		# spawnNPC:"mira" is STRIPPED (no NPCs).
		"when": {"fact": "inventory.hay_bundle", "op": "gte", "value": 20},
		"on_complete": {"set_flag": ["hearth_lit"]},
		"repeat": false,
	},
	{
		"id": "act1_first_order",
		"act": 1,
		"title": "The First Delivery",
		"lines": [
			{"speaker": "Wren", "text": "There — someone asked, you answered, and the Vale knows it can ask again."},
			{"speaker": "Wren", "text": "Keep the orders flowing. Coin is how a settlement remembers to feed itself."},
		],
		# React: event.type == order_fulfilled (+ event.count >= 1). Port drops the
		# count leaf (every order_fulfilled event is exactly one fill). spawnNPC:"tomas"
		# STRIPPED.
		"when": {"fact": "event.type", "op": "eq", "value": "order_fulfilled"},
		"on_complete": {"set_flag": ["first_order"]},
		"repeat": false,
	},
	{
		"id": "act1_lumber_raised",
		"act": 1,
		"title": "Room For Tomorrow",
		"lines": [
			{"speaker": "Wren", "text": "A Lumber Camp. Now the tree-line answers to us — planks, when we need them."},
			{"speaker": "Wren", "text": "Every building you raise is a decision about what the land becomes."},
		],
		# React act1_build_granary gated on building_built(granary). The port has no
		# granary; its first meaningful build is the Lumber Camp (the first spawner),
		# so the "room for tomorrow / first construction" beat is rehomed onto it.
		"when": {
			"all": [
				{"fact": "event.type", "op": "eq", "value": "building_built"},
				{"fact": "event.id", "op": "eq", "value": "lumber_camp"},
			],
		},
		"on_complete": {"set_flag": ["lumber_raised"]},
		"repeat": false,
	},
	{
		"id": "act1_hamlet",
		"act": 1,
		"title": "From Camp to Hamlet",
		"lines": [
			{"speaker": "Wren", "text": "Look at it. Not a camp anymore — a Hamlet, with room to grow."},
			{"speaker": "Wren", "text": "Bigger stores, more plots. We can think past the next harvest now."},
		],
		# No React analogue — the tier ladder (Camp→City) is a port-native system.
		# Fires on the first tier_up to Hamlet (tier 2). Demonstrates the tier_up event.
		"when": {
			"all": [
				{"fact": "event.type", "op": "eq", "value": "tier_up"},
				{"fact": "event.tier", "op": "gte", "value": 2},
			],
		},
		"on_complete": {"set_flag": ["hamlet_named"]},
		"repeat": false,
	},
	{
		# T29 — PORTED now that the keeper system exists (T31). React's act1_keeper_trial gated on a
		# keeper_confronted event + the keeper system, both ABSENT when StoryConfig was first written;
		# it is now reachable. The port's keeper resolution (give_keeper_reward) sets a
		# keeper_<type>_<path> flag and posts a "keeper_resolved" event, so this beat fires the moment
		# the home settlement's keeper (the Deer-Spirit) is faced on EITHER path. Narrative carried
		# faithfully from React; React's advanceAct:2 maps to act:2 here (apply_beat advances the act).
		# The keeper_resolved event also carries event.type=="keeper_resolved", but gating on the
		# FLAG (set by give_keeper_reward before the event posts) keeps it robust on a reload too.
		"id": "act1_keeper_trial",
		"act": 2,
		"title": "The Keeper At The Fence",
		"lines": [
			{"speaker": "", "text": "The old keeper of field and herd has watched you long enough to have an opinion. It has decided to share it."},
			{"speaker": "Wren", "text": "So you've settled that. The Deer-Spirit doesn't bend for everyone — bound or banished, the land answers to your hearth now."},
			{"speaker": "Wren", "text": "Whatever you chose, the road beyond the Vale can open. There's deeper country out there."},
		],
		# Fires when the home (farm) keeper is resolved on EITHER path (keeper_farm_coexist /
		# keeper_farm_driveout, set by give_keeper_reward). `any` of the two path flags.
		"when": {
			"any": [
				{"fact": "flag.keeper_farm_coexist", "op": "truthy"},
				{"fact": "flag.keeper_farm_driveout", "op": "truthy"},
			],
		},
		"on_complete": {"set_flag": ["home_keeper_resolved"]},
		"repeat": false,
	},
	{
		# T29 — PORTED now that the NPC gift system exists (T18/T19). There was no single React beat for
		# "first gift" (React's gift content lived in the Bond-8 letter arcs, still unportable), so this
		# is a port-native milestone that EXERCISES the now-real give_gift path the brief calls out: the
		# first time the player gifts any villager, a short beat marks that the bond economy has opened.
		# Fired off the "gift_given" event posted by give_gift. One-time (the first gift only).
		"id": "side_first_gift",
		"act": 1,
		"title": "A Small Kindness",
		"lines": [
			{"speaker": "Wren", "text": "You gave something away with nothing asked in return. People remember that out here — more than coin, sometimes."},
			{"speaker": "Wren", "text": "Keep at it. A villager who trusts you works harder, asks fairer, and looks out for the place."},
		],
		"when": {"fact": "event.type", "op": "eq", "value": "gift_given"},
		"on_complete": {"set_flag": ["first_gift_given"]},
		"repeat": false,
	},
	{
		# T29 — PORTED now that NPC bonds + bands exist (T18/T20). React gated personal beats on
		# `npc.<id>.bond >= N` (the bond_at_least settle-composite); the port has real bonds and the
		# Liked band (NpcConfig.BOND_BANDS: bond >= 7). This beat fires the first time ANY villager's
		# bond crosses into Liked — the gift_given / order_fulfilled events carry the resulting bond on
		# event.bond, so the gate reads that. Mirrors the React bond-arc gate, simplified to the port's
		# single bond fact (no per-NPC settle composite, no letter follow-up).
		"id": "side_bond_liked",
		"act": 2,
		"title": "Warmed Through",
		"lines": [
			{"speaker": "", "text": "It's a small thing — a villager saves you the good loaf, leaves the gate open the way you like it."},
			{"speaker": "Wren", "text": "That's what it looks like when someone here truly trusts you. Worth more than it weighs."},
		],
		# event.bond is the NEW bond after a gift/order fill (give_gift / fill_order post it). 7 = the
		# Liked band floor. A chain event carries no event.bond → reads 0 → never fires off a chain.
		"when": {"fact": "event.bond", "op": "gte", "value": 7},
		"on_complete": {"set_flag": ["bond_liked_reached"]},
		"repeat": false,
	},
	# ── Act 2 (the mine + the smith's voice) ──────────────────────────────────
	{
		"id": "act2_kitchen",
		"act": 2,
		"title": "Packing for the Dark",
		"lines": [
			{"speaker": "Wren", "text": "A Kitchen. Good — the field's bounty packs down into supplies, and supplies are what get us underground."},
			{"speaker": "Wren", "text": "Food on the surface buys turns below. That's the bargain of the mine."},
		],
		# Port-native: the Kitchen refiner (supplies → mine turns) is the bridge to
		# Town 2. Fires on building_built(kitchen).
		"when": {
			"all": [
				{"fact": "event.type", "op": "eq", "value": "building_built"},
				{"fact": "event.id", "op": "eq", "value": "kitchen"},
			],
		},
		"on_complete": {"set_flag": ["kitchen_packed"]},
		"repeat": false,
	},
	{
		"id": "act2_city_expedition",
		"act": 2,
		"title": "The Mine Opens",
		"lines": [
			{"speaker": "Wren", "text": "A City. Word travels — and so can we. There's a sealed mine past the ridge."},
			{"speaker": "Wren", "text": "Spend your supplies and the dark will open. Stone, iron, and worse, waiting down there."},
		],
		# React act3_mine_found/_opened gated on act_entered + tile_mine_coal totals and
		# carried unlockBiome:"mine". The PORT unlocks the expedition via the City tier +
		# supplies (GameState.can_enter_mine), not a story flag — so this single beat
		# fires when the settlement reaches City (tier 5) and DROPS unlockBiome.
		"when": {
			"all": [
				{"fact": "event.type", "op": "eq", "value": "tier_up"},
				{"fact": "event.tier", "op": "gte", "value": 5},
			],
		},
		"on_complete": {"set_flag": ["reached_city"]},
		"repeat": false,
	},
	{
		"id": "act2_quarry_foothold",
		"act": 2,
		"title": "Quarry Foothold",
		"lines": [
			{"speaker": "Wren", "text": "That stone is not just stone. It is road, wall, kiln, and promise."},
			{"speaker": "Wren", "text": "Twenty blocks cut and stacked. The settlement has bones now."},
		],
		# React act2_frostmaw beat: resource.tile_mine_stone.total >= 20. Port: stone
		# PRODUCES block, so the gate is inventory.block >= 20. (Block is banked the
		# moment a stone chain crosses its threshold — fired off the chain event's
		# inventory snapshot.)
		"when": {"fact": "inventory.block", "op": "gte", "value": 20},
		"on_complete": {"set_flag": ["quarry_foothold"]},
		"repeat": false,
	},
	{
		"id": "act2_first_iron",
		"act": 2,
		"title": "Iron in the Vale",
		"lines": [
			{"speaker": "Wren", "text": "Iron. Cold and heavy and ours. The first bar always feels like a small miracle."},
			{"speaker": "Wren", "text": "With iron we can stand against what the deep mine keeps."},
		],
		# React act2_first_hinge gated on craft_made(iron_hinge) — no such recipe in the
		# port. Reworked to the port's iron: iron_ore PRODUCES iron_bar, so the gate is
		# inventory.iron_bar >= 5 (the first handful of bars from the mine).
		"when": {"fact": "inventory.iron_bar", "op": "gte", "value": 5},
		"on_complete": {"set_flag": ["iron_drawn"]},
		"repeat": false,
	},
	{
		"id": "act2_frostmaw_felled",
		"act": 2,
		"title": "The Wyrm Falls",
		"lines": [
			{"speaker": "", "text": "The Frostmaw does not fall so much as settle — frost crackling down to a low blue glow that does not melt."},
			{"speaker": "Wren", "text": "It kept this hearth cold so nothing else could take it. ...Now it's down, and the deep is yours."},
		],
		# React's Frostmaw boss moved to keeper-trials in the live game, but the PORT has
		# a real Frostmaw capstone boss (BossConfig.FROSTMAW). Fires on the boss_defeated
		# event posted by damage_boss on a DEFEAT, and QUEUES the branching aftermath beat.
		"when": {"fact": "event.type", "op": "eq", "value": "boss_defeated"},
		"on_complete": {"set_flag": ["frostmaw_felled"], "queue_beat": "frostmaw_aftermath"},
		"repeat": false,
	},
	{
		# CHOICE beat. No firing `when` ({} → never auto-fires); it is QUEUED by
		# act2_frostmaw_felled's on_complete.queue_beat and resolved explicitly via
		# resolve_story_choice. This is the ONE surviving branching beat — React's
		# frostmaw_keeper Embers/Core-Ingot fork, reimagined with the port's only real
		# currencies (coins / block) so the choice machinery is genuinely exercised.
		# Resources/coins are NOT auto-granted — only the player's explicit choice grants.
		"id": "frostmaw_aftermath",
		"act": 2,
		"title": "The Hearth-Keeper",
		"lines": [
			{"speaker": "Wren", "text": "It's not a beast. Not really. The cold leans toward us now like it's listening."},
			{"speaker": "Wren", "text": "We can let it stay — bind it to the hearth, the way it's always been. Or break its hold for good and take what's left of its core. Your call."},
		],
		"when": {},
		"choices": [
			{
				"id": "bind",
				"label": "Let it stay. The hearth can share its warmth.",
				# Bound: a modest, lasting coin tithe (the port's stand-in for Embers).
				"outcome": {"set_flag": ["keeper_choice_made", "keeper_path_bound"], "resources": {}, "coins": 150, "queue_beat": ""},
			},
			{
				"id": "break",
				"label": "Break its hold. The hearth is ours alone.",
				# Broken: the core comes away as dense block (the port's stand-in for Core Ingots).
				"outcome": {"set_flag": ["keeper_choice_made", "keeper_path_broken"], "resources": {"block": 25}, "coins": 0, "queue_beat": ""},
			},
		],
		"repeat": false,
	},
	# ── Act 3 (rats + finish) ─────────────────────────────────────────────────
	{
		"id": "act3_rats",
		"act": 3,
		"title": "Something in the Stores",
		"lines": [
			{"speaker": "Wren", "text": "With the deep quiet, the small troubles come back. Rats — in the grain, in the fields."},
			{"speaker": "Wren", "text": "Chain through them or shoo them off. A settlement this size will always have a few."},
		],
		# Port-native (M3h): rats turn on the moment the capstone boss is defeated
		# (GameState.rats_enabled == town2_complete). Gated on flag.frostmaw_felled so it
		# fires the next event AFTER the wyrm falls (demonstrates a flag-gated beat).
		"when": {"fact": "flag.frostmaw_felled", "op": "truthy"},
		"on_complete": {"set_flag": ["rats_arrived"]},
		"repeat": false,
	},
	{
		"id": "act3_finish",
		"act": 3,
		"title": "The Settlement Lives",
		"lines": [
			{"speaker": "", "text": "The fields are tended, the mine is broken open, the wyrm is still. The settlement stands on its own."},
			{"speaker": "Wren", "text": "Camp to City, surface to deep, and the cold finally answered. You built this. (More of the old kingdom waits — keep going.)"},
		],
		# React act3_win required festival_announced + five tile-key larders (none in the
		# port's inventory). Port-honest finish: rats survived (the Town-3 lesson learned)
		# AND a built-out town (a healthy block larder of 50, the port's most-banked
		# refined good). All-flag/inventory gate → fires off any later event once both hold.
		"when": {
			"all": [
				{"fact": "flag.rats_arrived", "op": "truthy"},
				{"fact": "inventory.block", "op": "gte", "value": 50},
			],
		},
		"on_complete": {"set_flag": ["settlement_lives"]},
		"repeat": false,
	},
]

# ── Static lookups (usable without an instance) ──────────────────────────────

## Every beat in stable narrative order (a defensive deep copy).
static func all_beats() -> Array:
	return BEATS.duplicate(true)

## The full beat entry for `id`, or an empty Dictionary for unknown ids (a copy).
static func beat_by_id(id: String) -> Dictionary:
	for b in BEATS:
		if String(b.get("id", "")) == id:
			return (b as Dictionary).duplicate(true)
	return {}

## True when `id` names a real beat.
static func has_beat(id: String) -> bool:
	for b in BEATS:
		if String(b.get("id", "")) == id:
			return true
	return false

## Every flag definition (a defensive deep copy).
static func all_flags() -> Array:
	return FLAGS.duplicate(true)

## True when `id` names a registered story flag.
static func has_flag(id: String) -> bool:
	for f in FLAGS:
		if String(f.get("id", "")) == id:
			return true
	return false
