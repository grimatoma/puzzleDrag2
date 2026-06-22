# Four-Season Tile Sets (finish the signature feature)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check. This is an **asset-production** brief, not a code feature."

## Goal

The game's signature visual is a board that **visibly changes with the season** — fresh green in Spring, lush in Summer, golden-thinning in Autumn, frosted/snow-covered in Winter — as a run burns its turn budget. The engine, the onboarding mechanism, and the season detection are all **shipped and working**. But the *content* is ~1 tile deep: of ~79 tiles with seasonal-art folders, only **3** (`tile_tree_willow`, `tile_bird_chicken`, `tile_veg_carrot`) have a complete four-season set with transitions. Every other tile ships **only a Summer hero image** and falls back to Summer for all four seasons — so today the board looks the same in Winter as in Summer for all but three tiles.

This project **batch-authors the remaining seasonal art** — the Spring / Autumn / Winter stills plus the three forward transition animations (and per-season idle loops) — for the tile roster, via the existing PixelLab raw-v2 pipeline, then drops the folders and verifies in-game. **No code change is required for the common case** (the engine auto-discovers art). It matters because completing this is what turns a clever-but-invisible system into the game's headline feel.

## Background & current state (VERIFIED)

I read the engine and the discovery plugin, and listed `public/seasonal-tiles/` on disk. The seed facts are correct, including the stale-doc risk — confirmed below.

### How a tile picks its seasonal image + the Summer fallback
`src/textures/seasonal/seasonalArt.ts` is the controller:
- A subject's per-season idle clips are stored in `State.idle[0..3]` (Spring/Summer/Autumn/Winter) (`seasonalArt.ts:49-57`); `SUMMER = 1` is the anchor (`:31`).
- `fallbackIdleIndex(present, idx)` (`seasonalArt.ts:138-142`) is the placeholder rule: **exact season if present, else the Summer anchor, else the first available, else -1.** So a Summer-only drop renders Summer for **every** season.
- A subject becomes "active" (its baked art fully replaces the procedural vector icon) as soon as **any** idle decodes — `active: idle.some(Boolean)` (`seasonalArt.ts:119`), exposed via `seasonalArtActive(key)` (`:130-132`).
- Transitions live in `State.trans[0..2]` (`[i]` = season `i → i+1`, `seasonalArt.ts:33, :52`); a **missing** transition just snaps (the season change is instant rather than animated) — `advanceTransition` (`:198-229`).
- The board consumes all this in `GameScene._animateSeasonalArt` (`src/GameScene.ts:2046+`) → `seasonalAdvance` (`seasonalArt.ts:234`), re-baking the `tile_<key>` frame-bank as the season settles or a transition plays.

### The onboarding mechanism — it is the Vite plugin, NOT a static registry (stale-doc risk CONFIRMED)
The seed flags a known stale-doc risk here. **The real, current mechanism is a build-time directory scan, not a hand-maintained registry:**
- `tools/vite/seasonalSubjects.mjs` — the `seasonalSubjects()` Vite plugin scans `public/seasonal-tiles/` at startup/build, reads each subdirectory's `*.png` files, and exposes `virtual:seasonal-subjects` exporting `SEASONAL_MANIFEST` = `{ <tileKey>: [pngFilenames…] }` (`seasonalSubjects.mjs:14-37`). It is shared by both `vite.config` and `vitest.config` so the virtual module resolves under dev/build **and** tests.
- `seasonalArt.ts:23, :37, :42` — the controller imports `SEASONAL_MANIFEST` from `virtual:seasonal-subjects`; `MANIFEST = SEASONAL_MANIFEST ?? {}`; `SEASONAL_SUBJECT_KEYS = new Set(Object.keys(MANIFEST))`. **There is no hand-authored REGISTRY object** in `seasonalArt.ts` — the old API name `BAKED_SEASONAL_KEYS`/a static registry is gone (renamed to `SEASONAL_SUBJECT_KEYS`, manifest-driven). The folder name **must equal the tile's resource `key`** (e.g. `tile_tree_willow`), and texture keys are double-prefixed in this game (`tile_${res.key}` → `tile_tile_tree_willow`).
- **Onboarding a tile is therefore zero-code:** drop a folder `public/seasonal-tiles/<tileKey>/` containing the season PNGs and restart the dev server (so the plugin rescans). No edit to `seasonalArt.ts` or any registry. Adding a *brand-new* tile key not in the roster also wants a row in `tools/pixellab/roster.mjs` for the doc gallery, but that's documentation, not engine wiring.

### What's in `public/seasonal-tiles/` today — 3 complete, 76 Summer-only
There are **79** tile folders. The expected per-tile file set (from `IDLE_FILES`/`TRANS_FILES`, `seasonalArt.ts:32-33`) is 4 idles + 3 transitions = 7 PNGs. Disk reality:

- **Complete (7 files each — all four seasons + 3 forward transitions): 3 tiles**
  - `tile_bird_chicken`, `tile_tree_willow`, `tile_veg_carrot`
  - (`willow`/`carrot` are 128px; `chicken` is the lone native-64 legacy subject.)
- **Summer-only (1 file: `idle-summer.png`): 76 tiles** — everything else, e.g. `tile_fruit_apple`, `tile_grain_wheat`, `tile_mine_gold`, `tile_herd_sheep`, `tile_tree_oak`, `tile_flower_pansy`, `tile_fish_clam`, `tile_special_giant_pearl`, … (spanning categories: bird/cattle/herd/mount, fruit/veg/grain/grass/flower, tree, fish, mine, coin, special).

So today the board only truly changes seasons for **3 of 79 tiles**; the other 76 render their Summer hero in Winter too (correct fallback behavior, just incomplete content).

### The generation pipeline + skill (the work surface)
The asset toolchain is the PixelLab raw-v2 REST pipeline under `tools/pixellab/`, config-driven:
- `tools/pixellab/run_subject.mjs` — the driver: `node run_subject.mjs <config.mjs> <prompts|summer|seasons|transitions|idles>`.
- `tools/pixellab/subjects/<name>.mjs` — one **thin** per-subject config (identity + category + overrides + palette/seed locks); prompts are **composed** from the shared meta layers in `tools/pixellab/prompts/` (`framing`/`seasons`/`categories`/`compose`), never hand-written per state — thin one-line prompts were the documented primary drift cause.
- QA gates: `check_pad.py` (pad alignment across seasons), `check_envelope.py` (no grow/shrink/sprawl vs Summer), `check_glow.py` (SPIKE single-frame overshoot + BLOOM sustained white-out — **run on transitions too**), `assemble_gifs.py` (review montages).
- `pack_sheets.py` — frames → transparent strips into `public/seasonal-tiles/<subject>/` (centers the **pad** in the frame; `--concat` for the deciduous two-segment autumn→winter).
- `gen_gallery.mjs` + `roster.mjs` — regenerate the doc's Asset gallery (done/total per category).
- Source of truth: `docs/seasonal-tile-system/index.html` (decisions, API schemas, the meta-prompt model + 12 category playbooks, validated results, gotchas).
- The orchestration skill: **`.claude/skills/seasonal-tile-pipeline`** (SKILL.md is the procedure; `references/engine-integration.md` is the wiring; the doc is the reference). **Use it** — it encodes the per-category lifecycle, the ⟂ gates, and every gotcha (pad-centering, the no-light-words transition rule, the constant-subject palette lock for animals/minerals, the cp1252 console, `convert`≠ImageMagick, the 540s poll).

The validated end-to-end runs to date: willow, grass, eggplant, chicken, carrot. The **work is asset production**, not engineering: per tile, author the thin config, generate + QA the three missing seasons + transitions (+ idles), pack, drop the folder, verify. Effort scales with the **76 remaining tiles** — pipeline-driven and batchable, hence **L**.

## Scope

**In scope**
- Author the missing **Spring / Autumn / Winter stills** + the **three forward transitions** (spring→summer, summer→autumn, autumn→winter) + **per-season idle loops** for the Summer-only tiles, prioritized by board visibility (below), via the `seasonal-tile-pipeline`.
- Pack each completed subject's sheets into `public/seasonal-tiles/<tileKey>/` and verify in-game.
- Keep the doc gallery + roster current (`gen_gallery.mjs`, add roster rows for any new subject slug).
- Archive rejected candidates/intermediates out of VC (per the skill); commit only canonical stills + final GIFs + sheets.

**Out of scope / non-goals**
- **Engine/code changes** — the auto-discovery + Summer-anchor fallback already handle a partially- or fully-authored subject. Only touch code if you hit a real gap (e.g. a tile whose `res.key` doesn't match its intended folder name, or a brand-new tile needing a resource entry — that's the `resource-add` skill's territory, a separate concern).
- Re-deriving the Summer anchors that already ship (the 76 Summer-only tiles each already have a vetted `idle-summer.png` — **build the other seasons as edits off it**, don't regenerate Summer).
- Backward (winter→spring) transitions — a run ends at Winter; the pipeline is forward-only.
- New tiles / new resources / balance — content art only.
- `SAVE_SCHEMA_VERSION` bump — dropping PNG folders changes nothing persisted (no save impact at all).
- Re-baselining visual goldens on this Windows host (impossible here — see Validation).

## Implementation plan

This is a **per-tile production loop** run through the skill. Do a few tiles end-to-end first to re-validate the pipeline on this host, then batch.

### Step 0 — Prioritize by board visibility
Author in order of how often a tile is actually on the board (highest payoff first):
1. **Farm staples** — the common drop pool the player sees every run: grains (`tile_grain_wheat/corn/rice`), core veg (`tile_veg_carrot` already done; `beet/turnip/squash/pepper/broccoli/cucumber/mushroom/eggplant`), core fruit (`tile_fruit_apple/pear/lemon`), grass (`tile_grass_grass/meadow/heather`), trees (`tile_tree_oak/birch/fir/cypress/palm`), flowers (`tile_flower_pansy/water_lily`).
2. **Animals** — herd/cattle/bird/mount (`tile_herd_sheep/pig/goat/...`, `tile_cattle_cow/longhorn`, `tile_bird_*`, `tile_mount_horse/donkey/...`). Remember the **constant-subject palette lock**: the creature's colors are fixed; the season is the **pad + light + small accents** only (autumn light once turned a white chicken fully orange — lock it).
3. **Mine/ore + special** — `tile_mine_stone/coal/iron_ore/copper_ore/gold/gem`, `tile_coin_golden`, `tile_special_dirt/giant_pearl`. Rock/metal is **constant**; season is entirely the pad+light. Lowest priority (least seasonal by nature, but still benefits from pad/light variation).
4. **Fish/aquatic** — `tile_fish_*`: season on the water pad + light.

(Group within a category so they share the composed playbook and read consistently as a set.)

### Step 1 — Per-tile loop (follow the skill's gates)
For each tile, copy a thin config (`tools/pixellab/subjects/<name>.mjs`, model on `chicken.mjs`/`carrot.mjs`), set its `category` + `identity` + `overrides` + `paletteLock`, then:
1. **Compose & review prompts** (`run_subject … prompts`) ⟂ GATE — dump to `docs/seasonal-tile-system/prompts/<subject>.md`, eyeball for under-specification/off-model, tune, repeat. (No API cost.)
2. **Skip Summer** — the canonical `idle-summer.png` already ships; copy it to `docs/seasonal-tile-system/assets/<subject>-summer.png` as the anchor everything inherits if not already there.
3. **The other three seasons** (`run_subject … seasons`) ⟂ GATE — `edit-images-v2` off Summer (deciduous winter chains summer→autumn→bare-mound→winter). QA: `check_pad.py --fix`, `check_envelope.py`, present the four stills together.
4. **Forward transitions** (`run_subject … transitions`) ⟂ GATE — `animate-with-text-v3`, **colour+shape words only, never light/glow** (the bloom rule). `check_glow.py` on each (SPIKE→drop frame; BLOOM→regenerate). Two-segment for the deciduous bare-mound hinge.
5. **Idle loops** (`run_subject … idles`) ⟂ GATE — seamless micro-loop per season, `check_glow.py` (idle frame_07 overshoot is common). Cool-season idles may be **static** (`--static-idle`) per the produce playbook.
6. **Pack** (`pack_sheets.py <subject>` [`--concat …` for deciduous]) → transparent strips into `public/seasonal-tiles/<tileKey>/`. Confirm the folder name == the tile `res.key`.
7. **Verify in-game** (below) + **refresh gallery** (`gen_gallery.mjs`; add a `roster.mjs` row first for any new slug).

### Step 2 — Drop folder = onboard (zero code)
Because discovery is the Vite plugin scan (`seasonalSubjects.mjs`), the packed folder is picked up on **dev-server restart** with no code edit. Each newly-completed season swaps in automatically; any season still missing keeps falling back to Summer (so a half-finished subject degrades gracefully — you can ship Autumn alone and Winter still shows Summer until authored).

### Step 3 — Track progress in the doc
`gen_gallery.mjs` regenerates the Asset gallery with a `done / total` counter per category and a 3-row card (keyframes · idles · transitions) per subject (+ `planned` placeholders). This is the burndown view for the 76-tile backlog.

### Code-change footgun (mostly N/A, but read)
- **No slice actions, no `SAVE_SCHEMA` bump** — this is pure asset drop-in.
- The only code you might touch: if a tile's intended folder name doesn't match its `res.key`, or a planned subject has no resource at all, that's the `resource-add` pipeline (`resource-add` skill) — a separate change, not this brief. The 76 Summer-only tiles already have resources + matching folders, so the common path is code-free.

## Success criteria

- [ ] Prioritized batch of Summer-only tiles completed to **full four-season sets + 3 forward transitions** (+ idles), packed into `public/seasonal-tiles/<tileKey>/`.
- [ ] Each completed tile passes the QA gates: pad-aligned across seasons (`check_pad`), within envelope (`check_envelope`), no glow SPIKE/BLOOM on idles **and transitions** (`check_glow`).
- [ ] In-game, a completed tile **visibly differs** across the four in-session seasons (pixel-sampled, not just "looks right"), and its forward transition plays (rather than snapping) on a season flip.
- [ ] Animals/minerals keep their **own palette** across seasons (the season recolors the pad/light, not the subject).
- [ ] No code change for the common path; folder names == tile `res.key`; gallery + roster regenerated to reflect the new `done/total`.
- [ ] Rejected candidates/intermediates archived **out of VC**; only canonical stills + final GIFs + sheets committed.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass (the plugin rescans the new folders; the existing `seasonalArt` tests still pass).

## Validation — how to verify

**Pipeline QA (per tile, run during authoring):** `check_pad.py`, `check_envelope.py`, `check_glow.py` (idles + transitions), `assemble_gifs.py` montages — read them; these are the consistency/envelope eyeball. (See the skill's gate table.)

**Repo gates (must pass on this host):**
- `npm run typecheck` / `npm run lint` — no code changed for the common path, so these should stay green; run them to catch any stray edit.
- `npm test` — vitest resolves `virtual:seasonal-subjects` via the shared plugin (`seasonalSubjects.mjs`), so the manifest now includes the new folders. The pure tests for `fallbackIdleIndex`/`advanceTransition` (`seasonalArt.ts`) still hold; confirm no orphaned-folder test trips (a folder must contain ≥1 PNG, and ideally the full set, to be coherent).
- `npm run build` — production build embeds the rescanned manifest; confirm it succeeds and the new PNGs are emitted into `dist/`.

**Manual in-game check (this host — WebGL `preview_screenshot` HANGS; verify by pixel-sampling, per the skill + `live-game-preview-verify` memory):**
1. Restart the worktree Vite (so the plugin rescans the new folders): `node ../../../node_modules/vite/bin/vite.js --port <PORT>` with base `/puzzleDrag2/`.
2. Enter a farm board (`FARM/ENTER`) where the completed tile spawns.
3. Drive `turnsUsed` across the four season buckets and **pixel-sample the tile's texture** via `window.__phaserScene` at each season — confirm the four seasons render distinct art (not all Summer) and the transition plays on the flip. Confirm `seasonalArtActive("<tileKey>")` is true.
4. Spot-check an animal tile: confirm its body color is unchanged across seasons (only pad/light/accents differ).

**Visual goldens:** completing tiles **will** change what the board renders, so `npm run test:visual` will diff. On this Windows host the Phaser WebGL goldens are **not regenerable** (~38% host GPU/font drift). Treat diffs as **informational**; re-baseline on the canonical CI/Linux host and justify in the PR (per the `visual-goldens-host-limits` memory).

## Double-check / adversarial review

- **"It still shows Summer in Winter."** Confirm the packed folder name exactly equals the tile `res.key` (double-prefix gotcha: texture key is `tile_${res.key}`), that the dev server was **restarted** (the plugin scans at startup, not on the fly — see `seasonalSubjects.mjs` header note), and that `idle-winter.png` actually decoded (`seasonalArtActive` true and `State.idle[3]` non-null).
- **"The transition snaps instead of playing."** A missing `trans-<from>-<to>.png` snaps by design (`advanceTransition`); confirm the three transition strips are present and packed (deciduous uses the two-segment `--concat`).
- **Drift across the set:** the primary historical failure mode — guard with the composed prompts (never thin one-liners), `check_envelope`, and the gridline montage. Present each category's four-tile set together to catch an off-model member.
- **Bloom/white-out on transitions** (the documented landmine): transition action text must use **colour + shape only, zero light words** (even a negation makes it worse); `check_glow --bloom` gates it. Re-roll the seed and pick clean.
- **Animal/mineral recolor:** verify the creature/rock palette is explicitly locked in the edit prompt; sample the body color across seasons.
- **Pad jump:** `pack_sheets.py` centers the **pad** (not the bbox); a slanted subject is fine but the base must sit consistent — verify the land doesn't hop between seasons in-game.

**Rollback safety:** every change is additive PNG folders + thin configs + doc/gallery regen. No code, no persisted state, no `SAVE_SCHEMA`. Deleting a tile's folder reverts it to its Summer-only fallback (or its procedural icon if Summer is removed too) with zero side effects.

## Risks & gotchas

- **Stale-doc trap confirmed:** onboarding is the **Vite plugin scan** (`tools/vite/seasonalSubjects.mjs` → `virtual:seasonal-subjects`), **not** a static registry in `seasonalArt.ts`. Don't go looking for / editing a registry — drop a folder and restart.
- **Restart-to-rescan:** the plugin scans `public/seasonal-tiles/` at server start/build; a freshly dropped folder won't appear until you restart Vite (and vitest picks it up via the same shared plugin).
- **Folder name == `res.key`**, and texture keys are double-prefixed (`tile_tile_*`).
- **Cost/time:** every generation costs credits + 30s–5min and everything inherits from the Summer anchor — gate at each ⟂ step and show the user; don't batch-spend before the prompts review passes. Big edits can exceed a 240s poll (wrapper times out at 540s — re-poll by job id, don't regenerate).
- **Constant-subject palette lock** for animals/minerals/objects, and the **no-light-words** transition rule, are the two prompt rules most likely to bite. Both are in the skill + the design doc.
- **Windows host:** console is cp1252 (keep script output ASCII); `convert` on PATH is the disk tool, not ImageMagick (use Pillow); WebGL screenshots time out (pixel-sample to verify).
- **Visual goldens can't be regenerated here** — expect (real, expected) diffs as tiles gain seasons; re-baseline on CI.

## References

- `src/textures/seasonal/seasonalArt.ts` — `fallbackIdleIndex` Summer-anchor rule (`:138-142`), `SUMMER` (`:31`), `IDLE_FILES`/`TRANS_FILES` (`:32-33`), `MANIFEST`/`SEASONAL_SUBJECT_KEYS` from `virtual:seasonal-subjects` (`:23, :37, :42`), `seasonalArtActive` (`:130-132`), `advanceTransition` (`:198-229`), `seasonalAdvance` (`:234`).
- `tools/vite/seasonalSubjects.mjs:14-37` — the discovery plugin (the real onboarding mechanism; `SEASONAL_MANIFEST`).
- `src/GameScene.ts:2046+` — `_animateSeasonalArt` (board consumer); `:677` `rebakeSeasonalTilesForSeason`.
- `public/seasonal-tiles/` — 79 folders; complete sets: `tile_tree_willow`, `tile_bird_chicken`, `tile_veg_carrot`; the other 76 are `idle-summer.png` only.
- Pipeline: `tools/pixellab/run_subject.mjs`, `subjects/*.mjs`, `prompts/{framing,seasons,categories,compose}.mjs`, `pack_sheets.py`, `check_pad.py`/`check_envelope.py`/`check_glow.py`/`assemble_gifs.py`, `gen_gallery.mjs`, `roster.mjs`.
- Skill: `.claude/skills/seasonal-tile-pipeline` (SKILL.md + `references/engine-integration.md`). Source of truth: `docs/seasonal-tile-system/index.html`. Adjacent skills: `pixel-art-craft` (static craft), `pixel-art-animation` (motion), `resource-add` (only if a tile lacks a resource/key match).
- Memory: `seasonal-tile-system-2026-06-15` (full pipeline + zero-config engine + 77 summer heros), `seasonal-tile-pad-centering`, `seasonal-transition-bloom`, `visual-goldens-host-limits`, `live-game-preview-verify`.
- Related: `docs/projects/17-season-flip-cinematic.md` — the board-wide flip cinematic that punctuates the season change these assets make visible.
