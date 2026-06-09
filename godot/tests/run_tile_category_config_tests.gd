extends SceneTree
## Headless tests for TileCategoryConfig (Batch 3) — the deduped tile-CATEGORY taxonomy
## (label/glyph/family/representative-tile + the canonical DROP_PREFIXES + the shared
## display_name_from_key derivation). This is a behaviour-PRESERVING dedup, so the suite asserts
## the config reproduces the EXACT values the five former duplicated tables produced:
##
##   1. Labels/headings — match the former StartFarmingModal._category_label +
##      TileCollectionScreen._category_heading (incl. the heading specials + the "" → "Other" +
##      the title-case fallback for an unknown id).
##   2. Glyphs — match the former StartFarmingModal.CATEGORY_GLYPH (incl. the "•" default).
##   3. Families — match the former TileCollectionScreen.CATEGORY_TO_FAMILY (incl. "uncategorized"
##      fallback); FAMILIES order + FAMILY_LABEL preserved.
##   4. DROP_PREFIXES — the shared list = union of the three former copies MINUS "coin" (it carries
##      "fish" but NOT "coin"; "coin" was dead-only in TileVariantUi and including it regressed the
##      Tile Collection coin label).
##   5. display_name_from_key — strips correctly ("tile_grass_grass" → "Grass",
##      "tile_mine_iron_ore" → "Iron Ore", "tile_special_dirt" → "Dirt", …) AND, over EVERY
##      Constants.STRING_KEYS tile, is byte-identical to the old UiKit derivation (whose list == the
##      shared list) and differs from the old TileCollectionScreen derivation ONLY for the five fish
##      tiles ("Fish Sardine" → "Sardine", …); "tile_coin_golden" stays "Coin Golden".
##   6. representative_tile — grass→GRASS and the FULL farm set matches the old FARM_CATEGORY_TO_TILE,
##      the 6-subset matches the old FARM_CATEGORY_TILE; non-farm categories → EMPTY.
##   7. Plural alias — glyph("vegetables")==glyph("veg"), label("fruits")==label("fruit"), etc.
##
## Dependency-free SceneTree harness (mirrors run_resource_config_tests.gd). Run from godot/:
##   godot --headless --script res://tests/run_tile_category_config_tests.gd
## Exits 0 when every check passes, 1 on any failure.

var TCC := TileCategoryConfig

var _checks: int = 0
var _failures: int = 0

func _check(cond: bool, msg: String) -> void:
	_checks += 1
	if cond:
		print("  PASS  ", msg)
	else:
		_failures += 1
		print("  FAIL  ", msg)
		push_error("FAIL: " + msg)

func _initialize() -> void:
	print("\n── TileCategoryConfig (Batch 3) tests ─────────────")
	_test_labels()
	_test_glyphs()
	_test_families()
	_test_drop_prefixes()
	_test_display_name_examples()
	_test_display_name_parity_all_tiles()
	_test_representative_tiles()
	_test_plural_alias()
	_test_tile_variant_display_name_dedup()
	print("──────────────────────────────────────────────────")
	print("%d checks, %d failure(s)\n" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)

# ── 1. Labels / headings (former _category_label + _category_heading) ─────────────

func _test_labels() -> void:
	# Farm categories — both old tables agreed on these strings.
	var expected := {
		"grass": "Grass", "grain": "Grain", "trees": "Trees", "birds": "Birds",
		"veg": "Vegetables", "fruit": "Fruits", "flower": "Flowers",
		"herd": "Herd Animals", "cattle": "Cattle", "mount": "Mounts",
	}
	for cat in expected.keys():
		_check(TCC.label(cat) == String(expected[cat]),
			"label('%s') == '%s'" % [cat, expected[cat]])

	# Heading specials (former _category_heading match arms).
	_check(TCC.heading("coin") == "Treasure", "heading('coin') == 'Treasure'")
	_check(TCC.heading("fish_pearl") == "Giant Pearl", "heading('fish_pearl') == 'Giant Pearl'")
	_check(TCC.heading("rat") == "Rat (Hazard)", "heading('rat') == 'Rat (Hazard)'")
	_check(TCC.heading("rubble") == "Rubble (Hazard)", "heading('rubble') == 'Rubble (Hazard)'")
	# Mine non-special categories title-case via the catalog (former heading fallback).
	_check(TCC.heading("stone") == "Stone", "heading('stone') == 'Stone'")
	_check(TCC.heading("iron") == "Iron", "heading('iron') == 'Iron'")
	# "" → "Other" (former _category_heading special; the call site passes "" for an EMPTY tile).
	_check(TCC.heading("") == "Other", "heading('') == 'Other'")
	# Unknown id → title-case fallback (both former helpers).
	_check(TCC.label("widgetcat") == "Widgetcat", "label('widgetcat') == 'Widgetcat' (title-case fallback)")
	_check(TCC.heading("widgetcat") == "Widgetcat", "heading('widgetcat') == 'Widgetcat' (title-case fallback)")
	# label and heading agree for every non-empty id.
	var all_agree: bool = true
	for cat in TCC.CATEGORIES.keys():
		if TCC.label(String(cat)) != TCC.heading(String(cat)):
			all_agree = false
	_check(all_agree, "label() == heading() for every non-empty catalogued category")

# ── 2. Glyphs (former StartFarmingModal.CATEGORY_GLYPH) ───────────────────────────

func _test_glyphs() -> void:
	var expected := {
		"grass": "🌿", "grain": "🌾", "trees": "🌳", "birds": "🐦",
		"veg": "🥕", "fruit": "🍎", "flower": "🌸",
		"herd": "🐖", "cattle": "🐄", "mount": "🐎",
	}
	for cat in expected.keys():
		_check(TCC.glyph(cat) == String(expected[cat]),
			"glyph('%s') == '%s'" % [cat, expected[cat]])
	# Categories with no glyph return "" (and glyph_or supplies the caller default).
	_check(TCC.glyph("stone") == "", "glyph('stone') == '' (no glyph)")
	_check(TCC.glyph("xyz") == "", "glyph(unknown) == ''")
	# The former call site was CATEGORY_GLYPH.get(cat, "•") — glyph_or reproduces it.
	_check(TCC.glyph_or("grass", "•") == "🌿", "glyph_or('grass','•') == '🌿'")
	_check(TCC.glyph_or("stone", "•") == "•", "glyph_or('stone','•') == '•' (default for glyph-less)")
	_check(TCC.glyph_or("xyz", "•") == "•", "glyph_or(unknown,'•') == '•'")

# ── 3. Families (former TileCollectionScreen.CATEGORY_TO_FAMILY + FAMILIES/FAMILY_LABEL) ──

func _test_families() -> void:
	# The complete former CATEGORY_TO_FAMILY map.
	var expected := {
		"grass": "farm", "grain": "farm", "birds": "farm", "veg": "farm", "fruit": "farm",
		"flower": "farm", "trees": "farm", "herd": "farm", "cattle": "farm", "mount": "farm",
		"stone": "mining", "iron": "mining", "copper": "mining", "coal": "mining",
		"dirt": "mining", "gem": "mining", "gold": "mining", "coin": "mining",
		"fish": "water", "fish_pearl": "water",
		"rat": "hazards", "rubble": "hazards",
	}
	for cat in expected.keys():
		_check(TCC.family(cat) == String(expected[cat]),
			"family('%s') == '%s'" % [cat, expected[cat]])
	# Unknown category falls back to "uncategorized" (former .get(cat, "uncategorized")).
	_check(TCC.family("xyz") == "uncategorized", "family(unknown) == 'uncategorized'")
	# FAMILIES order + labels preserved.
	_check(TCC.families() == ["farm", "mining", "water", "hazards", "uncategorized"],
		"families() order preserved")
	_check(TCC.family_label("farm") == "Farm", "family_label('farm') == 'Farm'")
	_check(TCC.family_label("uncategorized") == "Other", "family_label('uncategorized') == 'Other'")
	_check(TCC.family_label("unknownfam") == "unknownfam", "family_label(unknown) == id (fallback)")

# ── 4. DROP_PREFIXES — the shared list = UiKit's old list (union − "coin") ────────

func _test_drop_prefixes() -> void:
	var dp: Array = TCC.drop_prefixes()
	# The shared list must be EXACTLY UiKit's former list: the union minus "coin" (carries "fish").
	var expected := ["grass", "grain", "bird", "veg", "fruit", "flower",
		"tree", "herd", "cattle", "mount", "mine", "special", "fish"]
	_check(dp == expected,
		"DROP_PREFIXES == UiKit's old list (union − 'coin'); got %s" % str(dp))
	# "fish" stays (it was in UiKit's list; dropping it would regress UiKit's cost-chip labels).
	_check(dp.has("fish"), "DROP_PREFIXES contains 'fish'")
	# "coin" is intentionally EXCLUDED: it was dead-only in TileVariantUi (coin tiles resolve via the
	# catalog display_name) and including it regressed the Tile Collection coin label.
	_check(not dp.has("coin"), "DROP_PREFIXES does NOT contain 'coin' (dead-only; regressed coin label)")

# ── 5. display_name_from_key — explicit examples ──────────────────────────────────

func _test_display_name_examples() -> void:
	_check(TCC.display_name_from_key("") == "", "display_name_from_key('') == ''")
	_check(TCC.display_name_from_key("tile_grass_grass") == "Grass",
		"display_name_from_key('tile_grass_grass') == 'Grass'")
	_check(TCC.display_name_from_key("tile_mine_iron_ore") == "Iron Ore",
		"display_name_from_key('tile_mine_iron_ore') == 'Iron Ore'")
	_check(TCC.display_name_from_key("tile_special_dirt") == "Dirt",
		"display_name_from_key('tile_special_dirt') == 'Dirt'")
	_check(TCC.display_name_from_key("tile_fish_sardine") == "Sardine",
		"display_name_from_key('tile_fish_sardine') == 'Sardine' ('fish' is in the shared list)")
	# 'coin' is intentionally NOT in the shared list, so the "coin" segment is kept.
	_check(TCC.display_name_from_key("tile_coin_golden") == "Coin Golden",
		"display_name_from_key('tile_coin_golden') == 'Coin Golden' ('coin' excluded from the list)")
	_check(TCC.display_name_from_key("tile_mount_horse") == "Horse",
		"display_name_from_key('tile_mount_horse') == 'Horse'")
	# Non-catalog hazard keys (no "tile_" prefix) title-case as a single word.
	_check(TCC.display_name_from_key("rat") == "Rat", "display_name_from_key('rat') == 'Rat'")
	_check(TCC.display_name_from_key("rubble") == "Rubble", "display_name_from_key('rubble') == 'Rubble'")

# ── 6. display_name_from_key parity over EVERY tile (vs BOTH old derivations) ─────

## Compare the new shared helper against the TWO former derivations over every catalog tile key:
##   • old UiKit (list WITH "fish", WITHOUT "coin") — must be byte-IDENTICAL (the shared list ==
##     UiKit's old list), proving UiKit's labels are unchanged.
##   • old TileCollectionScreen (list WITHOUT "fish" AND WITHOUT "coin") — the new helper must
##     differ from it ONLY for the five fish tiles (now stripped to "Sardine"/…); "tile_coin_golden"
##     must be UNCHANGED ("Coin Golden"). This is the truth the earlier version masked by comparing
##     against UiKit only (which already stripped "fish").
func _test_display_name_parity_all_tiles() -> void:
	# OLD UiKit DROP_PREFIXES — identical to the new shared list. Parity here must be exact.
	var old_uikit_prefixes := ["grass", "grain", "bird", "veg", "fruit", "flower",
		"tree", "herd", "cattle", "mount", "mine", "special", "fish"]
	# OLD TileCollectionScreen DROP_PREFIXES — lacked BOTH "fish" and "coin".
	var old_tc_prefixes := ["grass", "grain", "bird", "veg", "fruit", "flower",
		"tree", "herd", "cattle", "mount", "mine", "special"]
	# The ONLY keys whose label may differ from old-TileCollectionScreen (the five fish tiles).
	var expected_fish: Dictionary = {
		"tile_fish_sardine": "Sardine", "tile_fish_mackerel": "Mackerel",
		"tile_fish_clam": "Clam", "tile_fish_oyster": "Oyster", "tile_fish_kelp": "Kelp",
	}

	var uikit_mismatches: Array = []
	var tc_deltas: Array = []          # keys where new != old-TileCollectionScreen
	for tile in Constants.STRING_KEYS.keys():
		var key: String = String(Constants.STRING_KEYS[tile])
		var got: String = TCC.display_name_from_key(key)
		# (a) vs old UiKit — must match byte-for-byte for EVERY key (lists are identical).
		if got != _old_tile_name(key, old_uikit_prefixes):
			uikit_mismatches.append("%s: new='%s' oldUiKit='%s'"
				% [key, got, _old_tile_name(key, old_uikit_prefixes)])
		# (b) vs old TileCollectionScreen — collect every key where they differ.
		var old_tc: String = _old_tile_name(key, old_tc_prefixes)
		if got != old_tc:
			tc_deltas.append([key, old_tc, got])

	_check(uikit_mismatches.is_empty(),
		"display_name_from_key byte-IDENTICAL to former UiKit derivation for ALL tiles (mismatches: %s)" % str(uikit_mismatches))

	# The deltas vs old-TileCollectionScreen must be EXACTLY the five fish tiles, each stripped to its
	# bare name; every delta key must be in expected_fish and resolve to the expected stripped label.
	var delta_keys: Array = []
	var bad_deltas: Array = []
	for d in tc_deltas:
		var k: String = String(d[0])
		delta_keys.append(k)
		if not expected_fish.has(k) or String(d[2]) != String(expected_fish[k]):
			bad_deltas.append("%s: old='%s' new='%s'" % [k, d[1], d[2]])
	_check(bad_deltas.is_empty(),
		"the ONLY deltas vs old-TileCollectionScreen are the 5 fish tiles → bare names (bad: %s)" % str(bad_deltas))
	# And ALL five fish tiles must be present in the delta set (none silently unchanged).
	var missing_fish: Array = []
	for fk in expected_fish.keys():
		if not delta_keys.has(String(fk)):
			missing_fish.append(fk)
	_check(missing_fish.is_empty(),
		"all 5 fish tiles changed vs old-TileCollectionScreen (missing: %s)" % str(missing_fish))
	# Exactly five deltas — no other key moved.
	_check(delta_keys.size() == 5,
		"exactly 5 deltas vs old-TileCollectionScreen (got %d: %s)" % [delta_keys.size(), str(delta_keys)])

	# The coin tile is the regression the audit caught: with "coin" excluded it is UNCHANGED vs
	# old-TileCollectionScreen ("Coin Golden") — NOT the strictly-worse "Golden".
	_check(TCC.display_name_from_key("tile_coin_golden") == "Coin Golden",
		"coin tile UNCHANGED → 'Coin Golden' ('coin' excluded; no regression)")
	_check(_old_tile_name("tile_coin_golden", old_tc_prefixes) == "Coin Golden",
		"old-TileCollectionScreen coin label was 'Coin Golden' (baseline sanity)")

## A former prefix-strip derivation, verbatim (strip tile_, drop a leading prefix, join, capitalize()).
## `prefixes` selects WHICH old copy is reproduced (UiKit's vs TileCollectionScreen's list).
func _old_tile_name(key: String, prefixes: Array) -> String:
	var s: String = key
	if s.begins_with("tile_"):
		s = s.substr(5)
		var parts: Array = s.split("_")
		if parts.size() >= 2 and prefixes.has(String(parts[0])):
			parts.remove_at(0)
		s = " ".join(parts)
	return s.capitalize()

# ── 7. representative_tile (former GameState.FARM_CATEGORY_TILE / FARM_CATEGORY_TO_TILE) ──

func _test_representative_tiles() -> void:
	var T := Constants.Tile
	_check(TCC.representative_tile("grass") == T.GRASS, "representative_tile('grass') == GRASS")
	# The FULL farm set must match the former FARM_CATEGORY_TO_TILE values.
	var full := {
		"grass": T.GRASS, "grain": T.WHEAT, "trees": T.OAK, "birds": T.PHEASANT,
		"veg": T.CARROT, "fruit": T.APPLE, "flower": T.PANSY, "herd": T.PIG,
		"cattle": T.COW, "mount": T.HORSE,
	}
	var full_ok: bool = true
	for cat in full.keys():
		if TCC.representative_tile(String(cat)) != int(full[cat]):
			full_ok = false
	_check(full_ok, "representative_tile matches the full former FARM_CATEGORY_TO_TILE")
	# The derived GameState maps must equal the config (single source).
	_check(GameState.FARM_CATEGORY_TO_TILE.size() == 10, "GameState.FARM_CATEGORY_TO_TILE has 10 rows")
	_check(GameState.FARM_CATEGORY_TILE.size() == 6, "GameState.FARM_CATEGORY_TILE (base-spawn) has 6 rows")
	var gs_full_ok: bool = true
	for cat in full.keys():
		if int(GameState.FARM_CATEGORY_TO_TILE.get(cat, Constants.EMPTY)) != int(full[cat]):
			gs_full_ok = false
	_check(gs_full_ok, "GameState.FARM_CATEGORY_TO_TILE byte-identical to the former const")
	# The base-spawn subset excludes the four upgrade-only targets.
	for cat in ["flower", "herd", "cattle", "mount"]:
		_check(not GameState.FARM_CATEGORY_TILE.has(cat),
			"FARM_CATEGORY_TILE excludes upgrade-only '%s'" % cat)
	for cat in ["grass", "grain", "trees", "birds", "veg", "fruit"]:
		_check(int(GameState.FARM_CATEGORY_TILE.get(cat, Constants.EMPTY)) == int(full[cat]),
			"FARM_CATEGORY_TILE['%s'] == its base tile" % cat)
	# Non-farm categories carry no representative tile.
	_check(TCC.representative_tile("stone") == Constants.EMPTY, "representative_tile('stone') == EMPTY")
	_check(TCC.representative_tile("fish") == Constants.EMPTY, "representative_tile('fish') == EMPTY")
	_check(TCC.representative_tile("xyz") == Constants.EMPTY, "representative_tile(unknown) == EMPTY")

# ── 8. Plural alias (defensive React-plural normalisation) ────────────────────────

func _test_plural_alias() -> void:
	_check(TCC.glyph("vegetables") == TCC.glyph("veg"), "glyph('vegetables') == glyph('veg')")
	_check(TCC.glyph("fruits") == TCC.glyph("fruit"), "glyph('fruits') == glyph('fruit')")
	_check(TCC.glyph("flowers") == TCC.glyph("flower"), "glyph('flowers') == glyph('flower')")
	_check(TCC.glyph("herd_animals") == TCC.glyph("herd"), "glyph('herd_animals') == glyph('herd')")
	_check(TCC.glyph("mounts") == TCC.glyph("mount"), "glyph('mounts') == glyph('mount')")
	_check(TCC.glyph("bird") == TCC.glyph("birds"), "glyph('bird') == glyph('birds')")
	_check(TCC.label("vegetables") == "Vegetables", "label('vegetables') resolves to 'Vegetables'")
	_check(TCC.family("herd_animals") == "farm", "family('herd_animals') == 'farm'")
	_check(TCC.representative_tile("mounts") == Constants.Tile.HORSE,
		"representative_tile('mounts') resolves to HORSE")

# ── 9. TileVariantConfig.display_name — catalog-first intact + fallback folded into the
#       shared helper (the former 4th _DROP/title-case copy removed; no "coin" prefix). ──

func _test_tile_variant_display_name_dedup() -> void:
	var TVC := TileVariantConfig
	# (a) Catalog-FIRST path is intact: for a catalog tile id, display_name returns the catalog
	# display_name — NOT the prefix-strip — so the fallback never runs for any real input. Pick a
	# tile whose catalog name DIFFERS from a bare strip ("Meadow Grass" vs the strip's "Meadow"),
	# so this can only pass if the catalog branch wins.
	_check(TVC.display_name("tile_grass_meadow") == "Meadow Grass",
		"TileVariantConfig.display_name('tile_grass_meadow') == catalog 'Meadow Grass' (catalog-first, not the 'grass'-stripped 'Meadow')")
	_check(TVC.display_name("tile_grass_grass") == "Grass",
		"TileVariantConfig.display_name('tile_grass_grass') == catalog 'Grass'")
	_check(TVC.display_name("tile_mine_iron_ore") == "Ore",
		"TileVariantConfig.display_name('tile_mine_iron_ore') == catalog 'Ore' (catalog-first)")
	# Every catalog id resolves to its catalog display_name (the fallback is unreachable for catalog ids).
	var dn_mismatch: Array = []
	for id in TVC.CATALOG.keys():
		var sid: String = String(id)
		var catalog_dn: String = String((TVC.CATALOG[sid] as Dictionary).get("display_name", ""))
		if catalog_dn != "" and TVC.display_name(sid) != catalog_dn:
			dn_mismatch.append(sid)
	_check(dn_mismatch.is_empty(),
		"every catalog id returns its catalog display_name via TileVariantConfig.display_name (mismatches: %s)" % str(dn_mismatch))

	# (b) The (currently-unreached) NON-catalog fallback now routes through the ONE shared helper —
	# TileCategoryConfig.display_name_from_key — byte-for-byte. Use ids that are NOT catalog tiles.
	for nc in ["rat", "rubble", "fish_pearl", "xyz_widget"]:
		_check(not TVC.is_tile(nc), "%s is a non-catalog id (exercises the fallback)" % nc)
		_check(TVC.display_name(nc) == TCC.display_name_from_key(nc),
			"non-catalog fallback '%s' routes through TileCategoryConfig.display_name_from_key" % nc)

	# (c) The 4th _DROP copy is gone and carries no stray "coin": the source no longer declares an
	# inline _DROP const, and no fallback path re-introduces a "coin" prefix strip. Proven via a
	# coin-shaped non-catalog id — if a local "coin" list still existed it would strip to "Golden";
	# routed through the shared helper (which excludes "coin") it stays "Coin Golden".
	_check(not TVC.is_tile("coin_golden"),
		"'coin_golden' (sans tile_ prefix) is a non-catalog id")
	_check(TVC.display_name("coin_golden") == TCC.display_name_from_key("coin_golden"),
		"coin-shaped fallback id matches the shared helper (no stray 'coin' strip in TileVariantConfig)")
