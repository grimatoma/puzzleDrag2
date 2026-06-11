class_name QuestConfig
extends RefCounted
## The deterministic QUEST system, ported from the React quests feature
## (src/features/quests/data.ts + templates.ts). Pure data + pure derivation: the
## template pool, a string-seeded mulberry32 PRNG (rngFrom), the seeded 6-slot roll
## (roll_quests), the per-event progress tick (tick_quest), and the claim helper
## (claim_quest). The MUTABLE quest state (the rolled list, quest_day, claimed flags)
## + the event wiring live on GameState; this is the headless-testable catalog/logic
## half, mirroring AchievementConfig / CharterConfig (a `class_name` global, no
## autoload, reachable in headless tests before a scene tree exists). Stateless.
##
## ── PORTING NOTES — what we KEPT, REMAPPED, and OMITTED vs React templates.ts ──
##   A template is included ONLY if the port can actually PRODUCE the event that ticks
##   it (no fakes, no unreachable quests). The port is the farm + mine + harbor slice
##   (Constants.Tile / STRING_KEYS), with orders, the two RecipeConfig recipes
##   (bread / supplies), and the ToolConfig tool set (bomb/rake/sickle/auger/
##   blast_charge/axe/scythe/stone_hammer/drill/magnet).
##
##   COLLECT templates — the `key` MUST be a real Constants.STRING_KEYS tile key (the
##   collect event fires with the chained tile's STRING key, see GameState.credit_chain).
##     KEPT (key exists in STRING_KEYS):
##       collect_hay (tile_grass_grass), collect_wheat (tile_grain_wheat),
##       collect_log + collect_oak (BOTH tile_tree_oak — React ships both; faithful),
##       collect_sardine/mackerel/clam/kelp (the four catchable fish keys),
##       collect_stone/ore/coal/gem/dirt (the five mine keys),
##       collect_pig (tile_herd_pig), collect_cow (tile_cattle_cow),
##       collect_horse (tile_mount_horse).
##     OMITTED (no such tile in the port):
##       collect_berry (tile_fruit_blackberry — port fruit is APPLE, no blackberry),
##       collect_sheep (tile_herd_sheep — port herd is PIG only, no sheep),
##       collect_flour (key "flour" is a RESOURCE, not a tile key — the collect event
##         carries the TILE key tile_grain_wheat, never "flour", so it could never tick).
##
##   CRAFT templates — the `item` MUST be a real RecipeConfig output (the craft event
##   fires with the crafted recipe's OUTPUT key, see GameState.craft wiring).
##     KEPT: craft_bread (RecipeConfig.BREAD output "bread").
##     OMITTED (no port recipe produces them): craft_jam, craft_plank, craft_chowder,
##       craft_fish_oil (fish_oil_bottled), craft_lantern, craft_goldring,
##       craft_cobblepath, craft_pie, craft_meat, craft_milk. (The port has exactly two
##       recipes — bread + supplies; supplies has no React template, so only bread maps.)
##
##   ORDER template — orders are fully reachable.
##     KEPT: orders_any.
##
##   TOOL templates — the `tool` MUST be a real ToolConfig id (the tool event fires with
##   the used tool's ToolConfig id). React's tool ids (clear / basic / rare) DO NOT exist
##   in the port, so the React tool templates are REMAPPED onto real port tools rather
##   than invented:
##     React tool_scythe (tool "clear", "Use the Scythe") → port ToolConfig.SCYTHE ("scythe")
##       — the real port Scythe, a 1:1 spiritual match (kept id tool_scythe).
##     React tool_seedpack (tool "basic") + tool_lockbox (tool "rare") have NO port
##       equivalent → DROPPED, and replaced with two real port-tool templates so the
##       tool category still has variety: tool_bomb (ToolConfig.BOMB) + tool_drill
##       (ToolConfig.DRILL). These are NEW port-faithful templates over real tools, not
##       a port of the unreachable React ids.
##
##   CHAIN templates — long chains are fully reachable.
##     KEPT: chain_8 (minLength 8), chain_12 (minLength 12).
##
## ── DETERMINISM (ported EXACTLY from React rngFrom) ─────────────────────────────
## rngFrom = FNV-1a hash of the seed string → a mulberry32 PRNG. The 32-bit integer
## math (Math.imul / >>> / | 0) is mirrored via a 16-bit _imul split (see below),
## so roll_quests yields IDENTICAL results for identical seeds and is
## headless-testable. roll_quests draws in the SAME consumption order as React: per
## pick, one draw selects the template index (splice), one draw picks the target in
## [targetMin, targetMax].

## §17 locked: 20 almanac XP per quest claim (mirrors React QUEST_CLAIM_XP).
const QUEST_CLAIM_XP: int = 20

## How many quests a fresh roll produces (mirrors React's 6-slot deterministic roll).
const QUEST_COUNT: int = 6

## The ported, port-reachable template pool. Each entry:
##   id:           String — stable template id (matches React where the template survives)
##   category:     String — "collect" | "craft" | "order" | "tool" | "chain"
##   key:          String — (collect) the Constants.STRING_KEYS tile key it counts
##   item:         String — (craft) the RecipeConfig output key it counts
##   tool:         String — (tool) the ToolConfig id it counts
##   min_length:   int    — (chain) the minimum chain length that counts (-1 when N/A)
##   label:        String — display label with a "{n}" target placeholder
##   target_min:   int    — inclusive low end of the rolled target range
##   target_max:   int    — inclusive high end of the rolled target range
##   coin_base:    int    — flat coin reward
##   coin_per_unit:int    — extra coins per target unit (reward = base + floor(target*per))
const QUEST_TEMPLATES: Array = [
	# ── collect-resource (key = a real STRING_KEYS tile key) ─────────────────────
	{"id": "collect_hay",   "category": "collect", "key": "tile_grass_grass", "min_length": -1, "label": "Collect {n} grass",
		"target_min": 20, "target_max": 50, "coin_base": 30, "coin_per_unit": 1},
	{"id": "collect_wheat", "category": "collect", "key": "tile_grain_wheat", "min_length": -1, "label": "Collect {n} wheat",
		"target_min": 8,  "target_max": 20, "coin_base": 40, "coin_per_unit": 2},
	{"id": "collect_log",   "category": "collect", "key": "tile_tree_oak",    "min_length": -1, "label": "Collect {n} logs",
		"target_min": 8,  "target_max": 18, "coin_base": 30, "coin_per_unit": 2},
	{"id": "collect_oak",   "category": "collect", "key": "tile_tree_oak",    "min_length": -1, "label": "Fell {n} oaks",
		"target_min": 6,  "target_max": 14, "coin_base": 30, "coin_per_unit": 3},
	{"id": "collect_sardine",  "category": "collect", "key": "tile_fish_sardine",  "min_length": -1, "label": "Collect {n} sardines",
		"target_min": 12, "target_max": 30, "coin_base": 35, "coin_per_unit": 2},
	{"id": "collect_mackerel", "category": "collect", "key": "tile_fish_mackerel", "min_length": -1, "label": "Collect {n} mackerel",
		"target_min": 8,  "target_max": 20, "coin_base": 40, "coin_per_unit": 3},
	{"id": "collect_clam",     "category": "collect", "key": "tile_fish_clam",     "min_length": -1, "label": "Gather {n} clams",
		"target_min": 6,  "target_max": 14, "coin_base": 40, "coin_per_unit": 4},
	{"id": "collect_kelp",     "category": "collect", "key": "tile_fish_kelp",     "min_length": -1, "label": "Cut {n} kelp",
		"target_min": 10, "target_max": 22, "coin_base": 30, "coin_per_unit": 2},
	{"id": "collect_stone", "category": "collect", "key": "tile_mine_stone",    "min_length": -1, "label": "Quarry {n} stone",
		"target_min": 12, "target_max": 30, "coin_base": 35, "coin_per_unit": 2},
	{"id": "collect_ore",   "category": "collect", "key": "tile_mine_iron_ore", "min_length": -1, "label": "Mine {n} ore",
		"target_min": 8,  "target_max": 20, "coin_base": 45, "coin_per_unit": 3},
	{"id": "collect_coal",  "category": "collect", "key": "tile_mine_coal",     "min_length": -1, "label": "Haul {n} coal",
		"target_min": 8,  "target_max": 18, "coin_base": 40, "coin_per_unit": 3},
	{"id": "collect_gem",   "category": "collect", "key": "tile_mine_gem",      "min_length": -1, "label": "Find {n} gems",
		"target_min": 4,  "target_max": 10, "coin_base": 60, "coin_per_unit": 6},
	{"id": "collect_dirt",  "category": "collect", "key": "tile_special_dirt",  "min_length": -1, "label": "Shovel {n} dirt",
		"target_min": 12, "target_max": 30, "coin_base": 25, "coin_per_unit": 1},
	{"id": "collect_pig",   "category": "collect", "key": "tile_herd_pig",      "min_length": -1, "label": "Drive {n} pigs",
		"target_min": 5,  "target_max": 12, "coin_base": 35, "coin_per_unit": 4},
	{"id": "collect_cow",   "category": "collect", "key": "tile_cattle_cow",    "min_length": -1, "label": "Milk {n} cows",
		"target_min": 4,  "target_max": 10, "coin_base": 50, "coin_per_unit": 6},
	{"id": "collect_horse", "category": "collect", "key": "tile_mount_horse",   "min_length": -1, "label": "Saddle {n} horses",
		"target_min": 3,  "target_max": 8,  "coin_base": 60, "coin_per_unit": 8},
	# ── craft-item (item = a real RecipeConfig output) ───────────────────────────
	{"id": "craft_bread",   "category": "craft",   "item": "bread",            "min_length": -1, "label": "Bake {n} bread",
		"target_min": 2,  "target_max": 5,  "coin_base": 50, "coin_per_unit": 15},
	# ── fulfil-orders ─────────────────────────────────────────────────────────────
	{"id": "orders_any",    "category": "order",                               "min_length": -1, "label": "Deliver {n} orders",
		"target_min": 3,  "target_max": 6,  "coin_base": 60, "coin_per_unit": 15},
	# ── use-tool (tool = a real ToolConfig id; React ids remapped onto port tools) ─
	{"id": "tool_scythe",   "category": "tool",    "tool": "scythe",           "min_length": -1, "label": "Use the Scythe {n} times",
		"target_min": 2,  "target_max": 5,  "coin_base": 30, "coin_per_unit": 10},
	{"id": "tool_bomb",     "category": "tool",    "tool": "bomb",             "min_length": -1, "label": "Use the Bomb {n} times",
		"target_min": 2,  "target_max": 4,  "coin_base": 30, "coin_per_unit": 15},
	{"id": "tool_drill",    "category": "tool",    "tool": "drill",            "min_length": -1, "label": "Use the Drill {n} times",
		"target_min": 1,  "target_max": 3,  "coin_base": 30, "coin_per_unit": 20},
	# ── chain-length ──────────────────────────────────────────────────────────────
	{"id": "chain_8",       "category": "chain",                               "min_length": 8,  "label": "Make a chain of 8+",
		"target_min": 1,  "target_max": 3,  "coin_base": 50, "coin_per_unit": 25},
	{"id": "chain_12",      "category": "chain",                               "min_length": 12, "label": "Make a chain of 12+",
		"target_min": 1,  "target_max": 2,  "coin_base": 80, "coin_per_unit": 40},
]

# ── 32-bit integer helpers (mirror JS Math.imul / >>> / | 0 semantics) ──────
const _U32: int = 0x100000000
const _MASK32: int = 0xFFFFFFFF

static func _to_int32(x: int) -> int:
	var v: int = x & _MASK32
	if v >= 0x80000000:
		v -= _U32
	return v

static func _to_uint32(x: int) -> int:
	return x & _MASK32

## JS Math.imul(a, b): 32-bit integer multiply via a 16-bit split (a full 32×32
## product overflows GDScript's signed-64 int). Mirrors JS Math.imul exactly.
static func _imul(a: int, b: int) -> int:
	var ua: int = a & _MASK32
	var ub: int = b & _MASK32
	var a_lo: int = ua & 0xFFFF
	var a_hi: int = ua >> 16
	var b_lo: int = ub & 0xFFFF
	var b_hi: int = ub >> 16
	var cross: int = ((a_hi * b_lo + a_lo * b_hi) & 0xFFFF) << 16
	var lo: int = (a_lo * b_lo + cross) & _MASK32
	return _to_int32(lo)

## JS unsigned right shift `x >>> n` over the 32-bit value of x.
static func _ushr(x: int, n: int) -> int:
	return (x & _MASK32) >> n

# ── Seeded mulberry32 PRNG (ported EXACTLY from React rngFrom in data.ts) ────────
## Build a PRNG state {"a": int} from a string seed via FNV-1a, then call
## _rng_next(state) for each draw. Mirrors:
##   let h = 2166136261; for c: h ^= c; h = Math.imul(h, 16777619); let a = h >>> 0;
## NOTE: React's rngFrom uses FNV-1a (offset 2166136261, prime 16777619); this is
## DIFFERENT from a plain mulberry32-seed hash — we reproduce THIS one faithfully.
static func rng_state(seed_str: String) -> Dictionary:
	var h: int = 2166136261
	for i in seed_str.length():
		var ch: int = seed_str.unicode_at(i)
		h = _imul(_to_int32(h ^ ch), 16777619)
	return {"a": _to_uint32(h)}

## One mulberry32 draw → float in [0, 1). Mutates state["a"] in place. Mirrors:
##   let t = (a += 0x6D2B79F5);
##   t = Math.imul(t ^ (t >>> 15), t | 1);
##   t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
##   return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
static func rng_next(state: Dictionary) -> float:
	var a: int = _to_int32(int(state["a"]) + 0x6D2B79F5)
	state["a"] = a
	var t: int = _imul(_to_int32(a ^ _ushr(a, 15)), _to_int32(a | 1))
	var t2: int = _imul(_to_int32(t ^ _ushr(t, 7)), _to_int32(t | 61))
	t = _to_int32(t ^ _to_int32(t + t2))
	var out: int = _to_uint32(_to_int32(t ^ _ushr(t, 14)))
	return float(out) / 4294967296.0

# ── Catalog helpers (usable without an instance) ──────────────────────────────────

## Every template in stable order (a defensive deep copy).
static func all_templates() -> Array:
	var out: Array = []
	for t in QUEST_TEMPLATES:
		out.append((t as Dictionary).duplicate(true))
	return out

## The full template entry for `id` (a deep COPY), or {} for an unknown id.
static func template_by_id(id: String) -> Dictionary:
	for t in QUEST_TEMPLATES:
		if String(t.get("id", "")) == id:
			return (t as Dictionary).duplicate(true)
	return {}

## True when `id` names a real template.
static func has_template(id: String) -> bool:
	for t in QUEST_TEMPLATES:
		if String(t.get("id", "")) == id:
			return true
	return false

# ── Roll (ported EXACTLY from React rollQuests) ───────────────────────────────────

## Roll QUEST_COUNT (6) quests deterministically from (save_seed, quest_day). Same
## inputs always produce the same quests. The seed string mirrors React's
## `${saveSeed}|${year}|${season}` — the port has no calendar, so quest_day folds
## year+season into one monotonic int. Each quest is a plain Dictionary:
##   { id, template, category, key, item, tool, min_length, target, progress,
##     claimed, reward:{coins, xp} }
## Draw order matches React: per pick, draw#1 selects the template index (splice from
## a working copy of the pool), draw#2 picks target in [target_min, target_max].
static func roll_quests(save_seed: String, quest_day: int) -> Array:
	var state := rng_state("%s|%d" % [save_seed, quest_day])
	var pool: Array = QUEST_TEMPLATES.duplicate(true)
	var out: Array = []
	while out.size() < QUEST_COUNT and not pool.is_empty():
		var idx: int = int(floor(rng_next(state) * float(pool.size())))
		# Defensive clamp (rng_next is < 1.0, so idx < size, but guard a float edge).
		idx = clampi(idx, 0, pool.size() - 1)
		var tpl: Dictionary = pool[idx]
		pool.remove_at(idx)
		var range_span: int = int(tpl.get("target_max", 0)) - int(tpl.get("target_min", 0))
		var target: int = int(tpl.get("target_min", 0)) + int(floor(rng_next(state) * float(range_span + 1)))
		var coins: int = int(tpl.get("coin_base", 0)) + int(floor(float(target) * float(tpl.get("coin_per_unit", 0))))
		out.append({
			"id": "%s-%d-%d" % [String(tpl.get("id", "")), quest_day, out.size()],
			"template": String(tpl.get("id", "")),
			"category": String(tpl.get("category", "")),
			"key": String(tpl.get("key", "")),
			"item": String(tpl.get("item", "")),
			"tool": String(tpl.get("tool", "")),
			"min_length": int(tpl.get("min_length", -1)),
			"target": target,
			"progress": 0,
			"claimed": false,
			"reward": {"coins": coins, "xp": QUEST_CLAIM_XP},
		})
	return out

# ── Tick (ported EXACTLY from React tickQuest) ────────────────────────────────────

## Pure: return a NEW quest dict with updated progress for the given event. No mutation
## of the input. A claimed quest never progresses; progress clamps to the target. The
## `event` is a Dictionary:
##   {"type":"collect", "key":String, "amount":int}
##   {"type":"craft",   "item":String, "count":int}
##   {"type":"order"}
##   {"type":"tool",    "tool":String}
##   {"type":"chain",   "length":int}
## Mirrors the React category/key/item/tool/min_length matching exactly.
static func tick_quest(quest: Dictionary, event: Dictionary) -> Dictionary:
	if bool(quest.get("claimed", false)):
		return quest
	var etype: String = String(event.get("type", ""))
	var category: String = String(quest.get("category", ""))
	var inc: int = 0
	if etype == "collect" and category == "collect" and String(quest.get("key", "")) == String(event.get("key", "")):
		inc = int(event.get("amount", 1))
	elif etype == "craft" and category == "craft" and String(quest.get("item", "")) == String(event.get("item", "")):
		inc = int(event.get("count", 1))
	elif etype == "order" and category == "order":
		inc = 1
	elif etype == "tool" and category == "tool" and String(quest.get("tool", "")) == String(event.get("tool", "")):
		inc = 1
	elif etype == "chain" and category == "chain" \
			and int(quest.get("min_length", -1)) >= 0 \
			and int(event.get("length", 0)) >= int(quest.get("min_length", -1)):
		inc = 1
	if inc == 0:
		return quest
	var next: Dictionary = quest.duplicate(true)
	next["progress"] = mini(int(quest.get("target", 0)), int(quest.get("progress", 0)) + inc)
	return next

## True when `quest` is complete (progress reached target) and not yet claimed.
static func is_claimable(quest: Dictionary) -> bool:
	return not bool(quest.get("claimed", false)) and int(quest.get("progress", 0)) >= int(quest.get("target", 0))
