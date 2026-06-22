# Accessibility: Reduced Motion + Shape-Coded Tile Families

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Make the board readable and comfortable for more players, and have the game read as premium polish:

1. **Reduced-motion setting** — a user toggle (optionally seeded from the OS `prefers-reduced-motion` query) that damps the juicier animations: camera shake, the per-tile drag feedback pulses/haptics, float-text & ring bursts, and any season-flip cinematic. Concrete and codeable now.
2. **Shape-coded tile families** — the board distinguishes resource families by **silhouette/icon**, not hue alone, so colorblind players can parse it. This half is design-leaning: an **audit + guidelines**, since the seasonal-art pipeline already gives many tiles distinct sprites and the gap is the still-vector / placeholder tiles and per-family silhouette distinctiveness.

Split the work accordingly: ship the reduced-motion plumbing end-to-end (clean engineering), then deliver the shape-coding audit/guidelines.

## Background & current state (VERIFIED)

All references were read directly in this worktree. **Corrections to the seed assumptions are flagged inline.** Files are `.ts`/`.tsx` (CLAUDE.md's `.js`/`.jsx` is stale doc-drift).

### Settings today

- **`src/features/settings/slice.ts`** — `DEFAULT_SETTINGS` (line 42) = `{ sfxOn: true, musicOn: true, hapticsOn: true, tutorialDisabled: false }`. **There is NO `reducedMotion` today** — confirmed. `SETTINGS/TOGGLE` (line 58) flips `state.settings[key]`. The slice's `initial` (line 49) is `{ settings: { ...DEFAULT_SETTINGS, ...(loadSettings() || {}) }, settingsTab: 'main' }` — so any new default merges over a saved partial automatically (a save lacking the key just gets the default).
- **Settings persist in TWO places (important correction to the migration framing):**
  - Their own localStorage key via `persistSettings(settings)` (slice.ts:19, key `STORAGE_KEYS.settings`), written from `state.runActionEffects` after the reducer.
  - AND inside the **main save**: `persistStateNow` writes the **whole GameState minus a VOLATILE allowlist** (`src/state/persistence.ts:45`, allowlist at line 7), and `settings` is a GameState field, so it lands in the main save too.
- **Toggle UI** — **`src/features/settings/index.tsx`**: the `TOGGLE_ROWS` array (line 140) is `sfxOn` / `musicOn` / `hapticsOn`; `SettingsTab` (line 147) maps it to `Toggle` rows that dispatch `SETTINGS/TOGGLE`. The section is labelled "Audio" (line 161) — a motion toggle wants either a new "Display"/"Accessibility" section or a relabel.

### Persistence + the migration ladder (doc 08 is LIVE)

- **`SAVE_SCHEMA_VERSION = 47`** (`src/constants.ts:215`).
- The forward-only **migration ladder is LIVE** (`src/state/saveMigrations.ts`): `loadSavedState` (`src/state/persistence.ts:16`) runs `migrateSave` on a version mismatch and only discards forward/gap/corrupt saves. `MIGRATIONS` (saveMigrations.ts:31) currently has rungs `45→46` and `46→47`, both **no-op version bumps** (the features they once seeded — Fiber Crush, Hearthkeeping — were removed; the rungs stay so old saves still walk the chain). The header comment (lines 14–18) documents the bump recipe: bump `SAVE_SCHEMA_VERSION`, add `MIGRATIONS[oldVersion]` setting `version = old+1`, add a fixture + test.
- **What adding `reducedMotion` means for persistence:** it adds a field to `state.settings`, which is part of the main save → a persisted-shape change. Because the migration ladder is live and `DEFAULT_SETTINGS` is **merged over** loaded settings (slice.ts:50), a save missing the key is harmless on load (it just gets the default). The disciplined move is still: **bump `SAVE_SCHEMA_VERSION` 47→48 and add a `MIGRATIONS[47]` rung** that bumps `version` to 48 (it can default `settings.reducedMotion` or simply rely on the slice merge). **Do NOT wipe.** This keeps the ladder contiguous and the bump documented, per doc 08.

### How the scene sees settings (the bridge)

- **`GameScene` reads settings only via the Phaser registry**, never `state.settings` directly. The typed contract is **`src/types/phaserRegistry.ts`** — `GameRegistryContract` (line 47) already carries **`hapticsOn: boolean`** (line 59). Adding a board-facing setting starts with a new entry on this map.
- **`hapticsOn` is bridged in `prototype.tsx:283–286`**: it reads `gameState.settings?.hapticsOn`, then `setRegistry(gameRef.current?.registry, "hapticsOn", settingsHapticsOn ?? true)` in an effect keyed on the value. **`reducedMotion` follows this exact pattern.**
- The scene already gates haptics on the registry flag — e.g. `_chainFeedback` reads `getRegistry(this.registry, "hapticsOn")` at **`src/GameScene.ts:1388`** before vibrating.

### Where motion would be damped if `reducedMotion` is on

- **Camera shake** — `shakeForChain` (`src/GameScene.ts:1919`) → `_shake` (line 428). Curves in `src/game/juiceCurves.ts`. Also the radial flash `radialFlash` (line 1925) and `upgradeBurst` (line 1946).
- **Per-tile drag feedback ladder** — `_chainFeedback` (`src/GameScene.ts:1382`), which fires laddered tick pulses + haptics (`src/game/dragFeedback.ts`). Audio is separable from motion; the **pulse/haptic** is the motion part to damp.
- **Float-text & ring bursts** — `floatText` (`src/GameScene.ts:1964`), `radialFlash`, `upgradeBurst`, plus the board→HUD reward chips (`src/ui/RewardChipsLayer.tsx`, emitted at `src/GameScene.ts:1817`).
- **Season-flip cinematic** — the seasonal transition glow/whiteout (see MEMORY "Seasonal transition bloom"); search the season-strip / transition code for the flip animation and clamp it under reduced motion.
- **Note:** the scene already has a `_dur(ms)` time-scaling helper used by tweens (e.g. `_landingBounce`, `src/GameScene.ts:443`). A clean implementation routes durations/intensities through a reduced-motion-aware scalar (and short-circuits the shake/flash entirely) rather than touching each call site by hand.

### Tile families / colors (shape-coding)

- **`src/features/zones/data.ts`** — `ZONE_CATEGORIES` (line 43) = the 10 families: **`grass`, `grain`, `trees`, `birds`, `vegetables`, `fruits`, `flowers`, `herd_animals`, `cattle`, `mounts`** (`ZoneCategoryKey` derived at line 56). Human labels in `src/features/zones/zoneInfoFormat.ts:3` (`ZONE_CATEGORY_LABELS`). **(Correction to the seed list: the constant lives in `src/features/zones/data.ts`, not `src/constants.ts`; the membership matches the seed.)**
- The seasonal-art pipeline (MEMORY "Seasonal tile system") already gives many tiles distinct 128px sprites with per-family silhouettes (willow/chicken/carrot/etc.; all 77 tiles have a summer hero). **The gap is the still-vector / placeholder tiles and ensuring per-family silhouette distinctiveness** — two families should never read as the same shape at a glance even in grayscale.

## Scope

**In scope:**
- **Reduced-motion setting end-to-end:** add `reducedMotion` to `DEFAULT_SETTINGS`; a toggle row (in a Display/Accessibility section); optional one-time seed from `window.matchMedia('(prefers-reduced-motion: reduce)')` at init; the `SAVE_SCHEMA` bump + migration rung; the `GameRegistryContract` key; the `prototype.tsx` registry bridge; and the actual **damping** of the listed effects (shake, drag pulses/haptics, bursts/float text, season flip).
- **Shape-coding audit + guidelines:** a written audit of the 10 families' current silhouette distinctiveness (which have distinct sprites vs still-vector/placeholder), a grayscale legibility check, and concrete guidelines (one canonical silhouette/icon motif per family) for the seasonal-tile pipeline to follow. Optionally a small first fix for the worst-confused pair.

**Out of scope / non-goals:**
- A *destructive* save wipe — the ladder is live; bump + no-op/merge rung, never wipe.
- A full re-art of every tile. Shape-coding here is **audit + guidelines** (design-leaning), not a bulk art generation pass (that rides the `seasonal-tile-pipeline` skill separately).
- New dispatched action types — `SETTINGS/TOGGLE` already handles arbitrary keys; no new action needed (so no slice footgun).
- A separate colorblind *palette* mode — shape-coding is the chosen approach; a palette remap is a possible later brief.
- Touching the audio toggles' behavior (reduced motion damps *motion*, not sound; haptics is arguably motion-adjacent — decide whether reduced-motion also implies fewer haptics, but `hapticsOn` stays its own toggle).

## Implementation plan

Ordered. Names are exact; verify symbols before pasting.

### Part A — Reduced-motion setting (concrete, codeable now)

**A1. Add the setting + default.**
- `src/features/settings/slice.ts:42` — add `reducedMotion: false` to `DEFAULT_SETTINGS`. (The `initial` merge at line 50 means any saved partial without the key gets the default.)
- **Optional OS seed at init:** in `loadSettings`/`initial` (slice.ts:6/49), if the saved settings have no explicit `reducedMotion`, seed it from `window.matchMedia('(prefers-reduced-motion: reduce)').matches` (guard `typeof window`/`matchMedia` for SSR/tests). Keep it a one-time seed so the user's explicit toggle always wins thereafter.

**A2. Toggle UI.**
- `src/features/settings/index.tsx` — add a `reducedMotion` row. Either add it to `TOGGLE_ROWS` (line 140) and relabel the "Audio" section (line 161) to "Audio & Display", or add a small second section with a "Reduce Motion" row. Dispatches the existing `SETTINGS/TOGGLE` (no new action).

**A3. Persistence — bump the ladder (per doc 08).**
- `src/constants.ts:215` — `SAVE_SCHEMA_VERSION` 47 → 48.
- `src/state/saveMigrations.ts` — add `MIGRATIONS[47]: (save) => ({ ...save, version: 48 })` (the slice merge supplies the default; no field surgery needed). Keep rungs contiguous.
- Add a fixture under `src/__tests__/fixtures/saves/` + a migrator test (per the header recipe, saveMigrations.ts:14–18).

**A4. Bridge to the scene (mirror `hapticsOn`).**
- `src/types/phaserRegistry.ts:59` — add `reducedMotion: boolean;` to `GameRegistryContract` (right after `hapticsOn`).
- `prototype.tsx:283–286` — add a sibling effect: read `gameState.settings?.reducedMotion`, `setRegistry(gameRef.current?.registry, "reducedMotion", settingsReducedMotion ?? false)`.

**A5. Damp the effects.** Read `const rm = getRegistry(this.registry, "reducedMotion") ?? false;` in the scene and:
- **Camera shake / flash:** in `shakeForChain` (`src/GameScene.ts:1919`) and `radialFlash` (1925) / `upgradeBurst` (1946), short-circuit (no shake/ring) or sharply reduce intensity+duration when `rm`. Cleanest: feed `rm` into the pure curves (a `reduced` arg in `src/game/juiceCurves.ts`) so the damping is unit-testable.
- **Drag feedback pulses/haptics:** in `_chainFeedback` (`src/GameScene.ts:1382`), skip the tile `pulse()`-style motion and the `navigator.vibrate(...)` when `rm` (keep the *audio* tick — that's not motion). Consider whether `rm` should imply no haptics regardless of `hapticsOn`.
- **Float text & reward chips:** under `rm`, render float text statically (no rise/fade tween, or a much shorter one) and have `RewardChipsLayer` (`src/ui/RewardChipsLayer.tsx`) either skip the fly animation or snap. The React layer can read `reducedMotion` from `gameState.settings` directly (it's a React component, no registry needed).
- **Season-flip cinematic:** clamp the transition glow/whiteout under `rm` (find the season-strip transition animation; gate its tween).
- **Tip:** route tween durations through the existing `_dur(ms)` helper (`src/GameScene.ts`, used at 443) made `rm`-aware, so most call sites need no change.

### Part B — Shape-coding audit + guidelines (design-leaning)

**B1. Inventory the 10 families.** For each `ZONE_CATEGORIES` family (`src/features/zones/data.ts:43`), list which tiles have a distinct seasonal sprite vs which still render the vector/placeholder art (cross-reference the seasonal-tile roster / `public/seasonal-tiles/<tileKey>/` dirs and the seasonal-art registry).

**B2. Grayscale legibility check.** Render one representative tile per family and desaturate (or check against a colorblind simulation). Flag any two families that read as the same silhouette — those are the real accessibility failures.

**B3. Guidelines.** Write a one-page guideline (HTML doc under `docs/` via the `html-docs` skill, or a section in the seasonal-tile-system doc): one canonical silhouette/icon motif per family (e.g. round grain bundle vs spiky tree vs winged bird vs hoofed cattle), so the `seasonal-tile-pipeline` enforces per-family distinctiveness going forward. Optionally generate one corrective sprite for the worst-confused pair as a proof.

## Success criteria

- [ ] `reducedMotion` exists in `DEFAULT_SETTINGS` (default `false`, optionally OS-seeded) and has a toggle row that flips it via `SETTINGS/TOGGLE`.
- [ ] `GameRegistryContract` has `reducedMotion: boolean` and `prototype.tsx` bridges it (mirrors `hapticsOn`), restored on reload.
- [ ] With `reducedMotion` ON: camera shake/flash are suppressed or sharply reduced, drag pulses/haptics are damped, float text & reward chips don't fly/bounce, and the season-flip cinematic is clamped. With it OFF: behavior is byte-for-byte today's.
- [ ] `SAVE_SCHEMA_VERSION` bumped 47→48 with a contiguous `MIGRATIONS[47]` rung + fixture + test; an existing v47 save loads (not wiped) and gains `reducedMotion: false`.
- [ ] No new dispatched action type (grep + `check-slice-action`).
- [ ] The shape-coding audit exists: per-family distinct-sprite vs placeholder inventory, a grayscale legibility pass flagging confused pairs, and written per-family silhouette guidelines.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating (must pass before PR):** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

**Unit tests (the Phaser/canvas layer has ZERO unit coverage — push damping math into pure helpers and test there):**
- Migration: a v47 fixture migrates to v48 and is not discarded; the migrated save's `settings.reducedMotion` resolves to `false` after the slice merge.
- Juice curves with a `reduced` flag: `shakeIntensityFor(len, reduced=true)` returns 0 (or ≪ normal); normal path unchanged.
- Settings reducer: `SETTINGS/TOGGLE` on `reducedMotion` flips it.

**Manual in-game check (canvas effects have no unit coverage):**
- Spin a worktree Vite on a spare port with base `/puzzleDrag2/`: `node ../../../node_modules/vite/bin/vite.js` (worktree has no `node_modules`; `:5173` serves MAIN).
- `preview_screenshot` HANGS on this host — **do not use it.** Drive/inspect via `window.__hearthVisual.dispatch/state/freeze` and `window.__phaserScene`; assert via DOM + `getComputedStyle`. Toggle reduced motion via `dispatch({ type: "SETTINGS/TOGGLE", key: "reducedMotion" })` and confirm `getRegistry(__phaserScene.registry, "reducedMotion")` flips, then chain a long collect and confirm shake/flash are suppressed.
- Reload with `reducedMotion` on and confirm it persists and the registry is re-seeded.

**Shape-coding:** the audit is the deliverable; validate it by desaturating the per-family representative tiles and confirming no two families collide. (No automated gate; it's a design artifact.)

**Informational (not gating on this host):** `npm run test:e2e`, `npm run test:visual`. Visual goldens are **not regenerable on this Windows host** (DOM 3–5%, Phaser WebGL ~38%); a reduced-motion change alters animation timing → flag any diffs for canonical (Linux CI) re-baseline. (A reduced-motion screenshot may actually *stabilize* goldens.)

## Double-check / adversarial review

- **Migration discipline (doc 08):** the ladder is live — confirm you **bumped** (47→48) and added a **contiguous** rung + fixture, and that a v47 save is upgraded, not discarded. Never roll the version back; never wipe.
- **Bridge round-trip:** prove the registry value matches `gameState.settings.reducedMotion` for both true/false, and is restored on reload — forgetting the reload-restore makes the setting "forget" itself after refresh (the classic `hapticsOn`-pattern pitfall).
- **OFF path is identical to today:** with `reducedMotion` false, every damped call site must reduce to current behavior. Prove the full suite stays green and a manual long-chain looks unchanged.
- **Don't over-damp:** reduced motion should keep the game readable and responsive — it damps *gratuitous* motion (shake, fly, bounce, glow), not functional feedback (the chain still collects, the count still updates; consider an instant count-set rather than a roll under `rm`). Audio and the actual tile-clear are not "motion."
- **Slice footgun:** `SETTINGS/TOGGLE` already exists and is registered; do **not** invent a new action. If you do, `check-slice-action` must pass.
- **Shape-coding scope creep:** resist turning the audit into a bulk re-art. The deliverable is the inventory + grayscale check + guidelines (and at most one proof sprite). Bulk generation is a separate `seasonal-tile-pipeline` effort.

## References

- `src/features/settings/slice.ts` — `DEFAULT_SETTINGS` (42), `initial` merge (49–52), `SETTINGS/TOGGLE` (58), `persistSettings` (19).
- `src/features/settings/index.tsx` — `TOGGLE_ROWS` (140), `SettingsTab` (147), "Audio" section label (161).
- `src/types/phaserRegistry.ts` — `GameRegistryContract` (47), `hapticsOn` (59), `getRegistry`/`setRegistry` (110/121). **(add `reducedMotion`.)**
- `prototype.tsx` — `hapticsOn` bridge (283–286). **(add the `reducedMotion` sibling.)**
- `src/GameScene.ts` — `_chainFeedback` haptic gate (1388) + def (1382); `shakeForChain` (1919) / `_shake` (428); `radialFlash` (1925); `upgradeBurst` (1946); `floatText` (1964); `_dur` tween-time helper (used at 443); `REWARD_BURST` emit (1817).
- `src/game/juiceCurves.ts` — shake/flash curves (14/23/33). `src/game/dragFeedback.ts` — drag pulse/haptic curves (20/29/39). `src/ui/RewardChipsLayer.tsx` — board→HUD chip fly.
- `src/state/persistence.ts` — `loadSavedState` + `migrateSave` (16), whole-state persist minus VOLATILE (45/7). `src/state/saveMigrations.ts` — `MIGRATIONS` ladder (31) + bump recipe (14–18). `src/constants.ts` — `SAVE_SCHEMA_VERSION = 47` (215).
- `src/features/zones/data.ts` — `ZONE_CATEGORIES` (43, 10 families) + `ZoneCategoryKey` (56). `src/features/zones/zoneInfoFormat.ts:3` — `ZONE_CATEGORY_LABELS`.
- Skills: **`check-slice-action`** (verify no/added action registration), **`phaser-scene-debug`** (reducer↔registry↔scene boundary), **`seasonal-tile-pipeline`** (for any corrective sprite), **`html-docs`** (the audit doc), **`pre-pr-check`**.
- Related: doc **08** (save-migration ladder — LIVE; follow its bump recipe), doc **02 / 19** (the motion this damps — drag ladder, chain juice/flourishes).
