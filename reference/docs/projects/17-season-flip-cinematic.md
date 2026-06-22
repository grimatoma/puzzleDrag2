# Season-Flip Cinematic

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

A farming run is silently quartered into four seasons (Spring → Summer → Autumn → Winter) as the player burns turns. When the in-session season **flips**, the only thing that happens on the board today is a quiet per-tile cross-fade of the seasonal art (and a faint bottom-edge tint swap). The flip is a beat the game already tracks but never *celebrates*.

This project adds a **1–2 second board-wide "season-flip" cinematic**: when the season index increments mid-run, fire a one-shot, full-board flourish keyed to the **incoming** season — a sweep of petals / golden leaves / snow (matching the season strip's existing per-season particle vocabulary), a brief light wipe across the board, and the existing `seasonTurn` warm-bell. It is a pure **game-feel / juice** addition layered on top of the already-correct season detection and per-tile art swap — no new game state, no balance change, no persisted-shape change. It matters because the seasonal system is the game's signature visual and the flip currently passes without the player noticing it happened.

## Background & current state (VERIFIED)

I opened every named file. The seed facts are mostly right; the corrections below matter for scoping.

### Season index within a run — `seasonIndexInSession`
`src/features/zones/data.ts:109-116` — `seasonIndexInSession(turnsUsed, turnBudget)` buckets a run into 0..3 by **turns remaining** (`>75%` → Spring=0, `>50%` → Summer=1, `>25%` → Autumn=2, else Winter=3). `seasonNameInSession` (`:118-120`) wraps it through `SESSION_SEASON_NAMES = ["Spring","Summer","Autumn","Winter"]` (`:102`). The board scene reads exactly this — `GameScene.season()` (`src/GameScene.ts:610-619`) and `currentSeasonName` (`src/textures.ts:149-155`) both call it off the registry `turnsUsed`/`turnBudget`. So the index is a **derived function of `turnsUsed`** — there is no `season` field in state; nothing dispatches "season changed."

### How a season change currently surfaces on the board
The registry key the scene watches is `turnsUsed`, not a season value:
- `src/GameScene.ts:292` — `onRegistry("turnsUsed", () => this.refreshSeasonTint())`. This fires on **every** turn, not only on a season boundary.
- `refreshSeasonTint()` (`GameScene.ts:671-685`) destroys + redraws the background (`drawBackground`, which paints a low-alpha season-accent strip at `:665-668`) and calls `rebakeSeasonalTilesForSeason` (`src/textures.ts:161+`) to re-bake the vector seasonal tiles for the current season.
- **Baked PixelLab art** (willow/chicken/carrot and any future subject) is *not* snapped here under motion. It cross-fades per-tile through the per-frame loop: `_animateSeasonalArt` (`GameScene.ts:2046+`) calls `seasonalAdvance(res.key, season, tSec)` (`src/textures/seasonal/seasonalArt.ts:234`), and when the settled season changes that state machine plays the tile's **transition clip** once before settling (`advanceTransition`, `seasonalArt.ts:198-229`). Under reduced motion the loop is idle, so `refreshSeasonTint` snaps the stills instead (`GameScene.ts:684` → `_rebakeBakedTiles`).

So **today the flip is decentralized and per-tile** — each tile quietly fades on its own. There is no synchronized, board-wide "the season just turned" moment.

### The season strip is a SEPARATE nested Phaser game — reuse its vocabulary, don't reach into it
`src/ui/seasonStripScene.ts` is its own `Phaser.Scene` mounted by the React wrapper `src/ui/seasonStripPhaser.tsx` as a **standalone `Phaser.Game`** (`seasonStripPhaser.tsx:57-101`), fed via its own `hwv.*` registry keys (`hwv.turnsUsed`, `hwv.seasonIdx`, …, set at `:83-87, :129-133`). It is **not** the main board scene and shares no registry with it. It already defines the season look the cinematic should echo:
- `SEASON_PALETTES` (`seasonStripScene.ts:42-47`) — per-season sky/ground/hill/panel/num colors.
- Per-season particle systems built in `buildParticles()` (`seasonStripScene.ts:664-767`): Spring = drifting **pink/yellow petals** (textures `hwv-petal-pink/-yellow`), Summer = rising **gold motes** (`hwv-mote-gold`), Autumn = **falling leaves** (`hwv-leaf-red/-orange/-yellow`), Winter = **snowfall** (`hwv-flake-small/-large`).

The cinematic should **mirror this vocabulary** (petals/leaves/snow per season) so the board flourish reads as the same world — but it must build its **own** particle textures/emitters inside `GameScene` (the strip's textures live in a different Phaser game and are not addressable from the board scene). Don't try to share textures across the two games.

### The `seasonTurn` audio already exists and is wired
- `src/audio/index.ts:74-77` — `seasonTurn`: a warm bell (220 Hz triangle, 400 ms with natural decay). Confirmed.
- `src/audio/useAudio.tsx:58` — `if (s.modal === 'season' && p.modal !== 'season') play('seasonTurn');`. **CORRECTION to the implied trigger:** the bell does NOT play on the in-run season *index* flip. It plays when the **`season` modal opens** — i.e. the end-of-run season-summary modal (`state.modal === "season"`, set by `CLOSE_SEASON`/turn-end at `src/state.ts:345, :481, :1444`). That modal is the *run-summary* screen, not a mid-run season change. So `seasonTurn` is "a run/season ended" today, **not** "the season turned mid-board."
  - Implication for this brief: we want the bell (or a variant) to also fire on the **mid-run index increment**. The cleanest path is to play it from the scene's one-shot flourish (call `play("seasonTurn")` from `src/audio/index.ts` directly inside `GameScene`), OR add a new audio cue and trigger it the same way `useAudio` triggers others (off a state delta). Playing it from the scene keeps the cinematic self-contained and avoids the slice-action footgun (see below). Pitch it slightly per season if desired via the existing `play(name, { pitch })` option (`index.ts:160`).

### The cleanest hook to detect the increment + trigger the overlay
The scene already recomputes the season every `turnsUsed` change. Two clean options:

- **Option A (recommended) — detect in the scene.** `GameScene` already has `this.seasonName` (`GameScene.ts:130`, set each `update()` at `:1977` via `currentSeasonName(this)`). The `onRegistry("turnsUsed", …)` handler (`GameScene.ts:292`) is the single funnel for turn changes. Add a remembered `_lastSeasonIdx` field; in that handler compute the new index from `seasonIndexInSession(getRegistry(this.registry,"turnsUsed") ?? 0, getRegistry(this.registry,"turnBudget") ?? 0)` and, when it **increased** (and the previous value was a real number, not the initial), call a new `playSeasonFlip(newIdx)` before/after `refreshSeasonTint()`. This needs only the registry values already present and adds no new bridge.
- **Option B — push a season-flip nonce from React.** `prototype.tsx` already computes `seasonIdx` for the strip (`prototype.tsx:367`) and pushes `turnsUsed`/`turnBudget` to the board registry (`:177-178, :275, :278`). You could add a `seasonFlipNonce` registry key bumped when the React-side `seasonIdx` increments, and have the scene listen for it. This is more plumbing and duplicates detection that the scene can already do. Prefer **A** unless you find a timing race.

Both work because `turnsUsed` is pushed to the board registry on every turn (`prototype.tsx:275`) and the scene already reacts to it. Recommendation: **Option A**, guarding against the boundary cases below (board entry, reduced motion, season *decrease* on a new run).

### Reduced motion — there is NO in-game setting; it's the OS media query
**CORRECTION:** the brief's "respect a reduced-motion setting if present" — there is **no** reduce-motion field in `GameSettings` (`src/types/gameStateFields.ts:23-31` has only `sfxOn`, `musicOn`, `hapticsOn`, `tutorialDisabled`). The scene's motion gate is `_motionEnabled()` (`GameScene.ts:2007-2016`), which reads the OS `(prefers-reduced-motion: reduce)` media query. So the requirement is: **gate the particle/light-wipe flourish on `this._motionEnabled()`**; when motion is reduced, do the silent snap that already happens (and optionally still ring the bell — audio is governed by `settings.sfxOn`, not motion). Do NOT invent a new setting.

### Audio enable gate
`play()` no-ops when SFX is off (`src/audio/index.ts:161`, `enabled.sfx`), and `useAudio` syncs `enabled.sfx` from `settings.sfxOn` (`useAudio.tsx:28-33`). So calling `play("seasonTurn")` from the scene is automatically silenced when the player has SFX off — no extra gate needed.

## Scope

**In scope**
- Detect the in-run season-**index increment** on the live board (Option A) and fire a **one-shot** board-wide flourish.
- The flourish: a season-keyed particle burst (petals / gold motes / leaves / snow, mirroring the strip's vocabulary) swept across the board + a brief light-wipe (a translucent rectangle/gradient tweened across the board) over ~1–2 s, then auto-cleaned-up.
- Ring the existing `seasonTurn` bell (optionally pitch-shifted per season) on the mid-run flip, played from the scene.
- Gate the visual flourish on `_motionEnabled()` (OS reduced-motion); keep the silent snap as the reduced-motion fallback.
- A small amount of new texture generation inside `GameScene` for the flourish particles (cheap, generated once, like the strip does).

**Out of scope / non-goals (keep this tight)**
- Any change to `seasonIndexInSession` thresholds, `turnBudget`, or the season model.
- The end-of-run `season` modal and its existing `seasonTurn` trigger in `useAudio` (leave it; the new bell is the *mid-run* flip, a different event).
- Reworking the per-tile baked-art transition loop (`seasonalAdvance`) — the cinematic is an **overlay on top of** that, not a replacement; tiles keep cross-fading.
- The season strip scene (`seasonStripScene.ts`) — it already animates per season; no change there.
- Adding an in-game reduce-motion setting (use the OS query that the scene already honors).
- New persisted state, new action types, `SAVE_SCHEMA_VERSION` bump (none required — see below).
- Re-baselining visual goldens on this Windows host (impossible here — see house rules).

## Implementation plan

### Step 1 — Detect the mid-run season-index increment in the scene
In `GameScene`:
1a. Add a field `_lastSeasonIdx: number | null = null` (near `seasonName` at `GameScene.ts:130`).
1b. In the existing `onRegistry("turnsUsed", …)` handler (`GameScene.ts:292`), after `refreshSeasonTint()`, compute the new index:
```ts
const tb = getRegistry(this.registry, "turnBudget") ?? 0;
const tu = getRegistry(this.registry, "turnsUsed") ?? 0;
const idx = (typeof tb === "number" && tb >= 1) ? seasonIndexInSession(tu, tb) : 0;
const prev = this._lastSeasonIdx;
this._lastSeasonIdx = idx;
if (prev !== null && idx > prev) this.playSeasonFlip(idx);   // only forward, mid-run
```
1c. **Reset `_lastSeasonIdx` to `null` on board entry / regen** so a fresh run (turnsUsed back to 0 → Spring) doesn't fire a flip and so the next first real increment is detected cleanly. Set it in `regenerateBoard` (`GameScene.ts:737-754`) and on the `newBoardNonce` / `biomeKey` handlers (`GameScene.ts:288, :280`) — wherever a new board begins. Seed it from the current index there (`this._lastSeasonIdx = idx` computed from current registry) so re-entering mid-run doesn't replay.

> Why this is safe: `idx > prev` only fires on a forward boundary crossing within one run; a new run resets to Spring (lower index → no fire); board entry seeds the baseline.

### Step 2 — Build the season-flip flourish (`playSeasonFlip(idx)`)
A new private method on `GameScene`. Gate it: `if (!this._motionEnabled()) return;` (the silent snap already ran in `refreshSeasonTint`). Keep it self-contained and auto-cleaning.

2a. **Particle textures (once).** Mirror the strip's `generateTextures()` pattern (`seasonStripScene.ts:206-294`): lazily generate small petal/mote/leaf/snowflake textures guarded by `this.textures.exists(key)`. Use board-local keys (e.g. `flip-petal`, `flip-leaf`, `flip-flake`, `flip-mote`) so they don't collide with the strip game's keys. Note this game's "texture key already in use" console-error tripwire — guard every `generateTexture` with an `exists` check (the e2e/visual specs assert zero console errors; see house rules).

2b. **Particle sweep keyed to the incoming season** (`idx`): pick the texture(s) + drift direction matching the strip — Spring petals (down-drift), Summer gold motes (up-rise), Autumn leaves (down + tumble), Winter snow (down). Spawn a **short burst** over the board rect (`this.boardX/boardY`, `COLS*tileSize × ROWS*tileSize`) with a finite lifespan (~1.5 s), then destroy the emitter (`emitter.stop()` + delayed `destroy()`), so nothing lingers. Add the emitter at a depth **above the tiles** but use modest alpha so the board stays readable.

2c. **Light wipe.** A translucent rectangle (or a 2-stop gradient using the incoming `SEASON_PALETTES[idx]` accent) the width of the board, tweened across it left→right over ~600–900 ms with alpha in→out, then destroyed. Keep peak alpha low (≈0.25–0.35) so it reads as a wipe, not a white-out — and note the seasonal-transition bloom lesson in MEMORY: keep it subtle, no full-board flash.

2d. **Cleanup discipline:** track the created game objects and destroy them on `shutdown`/`destroy` (the scene already has cleanup hooks); never leave a `repeat:-1` tween or live emitter. The flourish is strictly one-shot.

### Step 3 — Tie to the existing `seasonTurn` audio
Inside `playSeasonFlip(idx)` (and NOT gated by motion — audio should still play under reduced motion, governed by SFX), call the audio module directly:
```ts
import { play } from "./audio/index.js";
play("seasonTurn", { pitch: [1.0, 1.06, 0.96, 0.9][idx] ?? 1 }); // optional per-season pitch
```
`play` self-no-ops when SFX is off (`audio/index.ts:161`) and lazy-resumes the context. If a distinct cue is preferred over reusing `seasonTurn`, add one to `SOUNDS` in `src/audio/index.ts` and call it — that's a pure data add, no slice involvement.

> Put the `play(...)` call **outside** the `_motionEnabled()` early-return so the bell rings even under reduced motion. Reorder Step 2's motion gate accordingly (play audio first, then `if (!motion) return;`, then particles + wipe).

### Step 4 — (Optional) echo the flip on the season strip
Low priority, only if cheap: the strip scene could pulse its numeral panel or briefly intensify its current-season emitter when `hwv.seasonIdx` changes (it already gets `hwv.seasonIdx` and reacts in `onRegistryChange`, `seasonStripScene.ts:1071-1078`). Not required for success; the board cinematic is the deliverable.

### Slice-registration footgun (READ THIS)
**No new action types are required.** The detection lives in the Phaser scene off the existing `turnsUsed` registry value; audio is a direct `play()` call. If you choose Option B (a `seasonFlipNonce` registry key) that is still scene/registry plumbing, not a reducer action. **Do not add a reducer action** for this — if you think you need one, you've over-scoped. (For reference: a new action only reaches a slice if its `type` is in `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` in `src/state.ts`; run the `check-slice-action` skill if you ever add one.)

### SAVE_SCHEMA note
Nothing persisted changes — the cinematic reads derived registry values and plays audio. **Do not bump `SAVE_SCHEMA_VERSION`.** Confirm the diff touches only `GameScene.ts` (+ optionally `audio/index.ts` for a new cue and `seasonStripScene.ts` for the optional echo).

## Success criteria

- [ ] Crossing a season boundary mid-run (e.g. `turnsUsed` rising past 25% of `turnBudget`, Spring→Summer) fires a **single** board-wide flourish whose particles match the incoming season (petals/motes/leaves/snow).
- [ ] A light wipe sweeps the board once, peaks at low alpha, and fully cleans up (no lingering tween/emitter/graphics — verify object count returns to baseline).
- [ ] The `seasonTurn` bell rings on the flip (and is silenced when `settings.sfxOn` is false).
- [ ] Under OS reduced-motion (`prefers-reduced-motion: reduce`), the **visual** flourish is skipped, the silent season snap still happens, and (optionally) the bell still rings.
- [ ] Starting a **new run** (turnsUsed resets to 0 → Spring) does **not** fire a flip; re-entering a board mid-run does **not** replay a flip for a season already settled.
- [ ] No "Texture key already in use" console error is introduced (every `generateTexture` guarded by `exists`).
- [ ] `SAVE_SCHEMA_VERSION` unchanged; a pre-existing save still loads.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating (must pass, run on this host):**
- `npm run typecheck` — scene reads registry via the existing `getRegistry` helpers; confirm the season-index math compiles with the imported `seasonIndexInSession`.
- `npm run lint` — clean over `src/` + `prototype.tsx`.
- `npm test` — vitest (node env, **no canvas**). The flourish is Phaser-only so it has **no unit coverage**; what you *can* unit-test is any pure helper you extract (e.g. a `seasonFlipDirection(idx)` mapping or a `didSeasonAdvance(prevIdx, turnsUsed, turnBudget)` predicate) — extract one small pure function and test it so the detection logic isn't entirely untested.
- `npm run build` — production build succeeds.

**Manual in-game check (this host — `preview_screenshot` HANGS, assert via scene/DOM):**
1. Spin a worktree Vite on a spare port: `node ../../../node_modules/vite/bin/vite.js --port <PORT>` with base `/puzzleDrag2/` (the `:5173` server serves MAIN, not this worktree; the worktree has no `node_modules`).
2. Drive into a farm board (`FARM/ENTER`) so a `turnBudget` exists.
3. In devtools, advance turns to cross a boundary and watch the scene: `const s = window.__phaserScene;` then drive `turnsUsed` up via the reducer (`window.__hearthVisual.dispatch(...)` collecting a chain, or directly nudging state via the freeze/dispatch hooks per the `live-game-preview-verify` memory). Confirm exactly one flourish fires per boundary crossing.
4. Assert cleanup: after ~2 s, the temporary emitter/graphics are gone (inspect `s.children.list.length` returns to baseline; no object tagged with your flip layer remains).
5. Toggle SFX off in settings → confirm no bell on the next flip. Flip the OS reduced-motion query (devtools rendering pane "Emulate prefers-reduced-motion") → confirm no particles/wipe but the season still snaps.

**Visual goldens:** `npm run test:visual` may diff if a golden happens to capture mid-flourish (unlikely, since it's a transient one-shot). On this Windows host goldens are **not regenerable** (Phaser WebGL ~38% drift). Treat any diff as **informational**; re-baseline on the canonical CI host and justify in the PR.

## Double-check / adversarial review

- **"It fires on every turn, not just boundaries."** Defend with the `idx > prev` guard and the manual check: advance several turns *within* one season and confirm zero flourishes; only the boundary turn fires.
- **"It fires on board entry / new run."** The `_lastSeasonIdx` reset-and-seed on regen/entry prevents this — verify by entering a fresh farm (Spring, no flip) and by re-entering a board already in Autumn (no replay).
- **Registry timing race (Option A vs B):** `turnsUsed` is pushed by a React effect (`prototype.tsx:275`); if the season summary modal also opens on the same turn (run end at `state.ts:481`), make sure the mid-run flip doesn't double up with the modal's `seasonTurn`. A run *ending* lands on Winter via `CLOSE_SEASON`; confirm the end-of-run case isn't double-belled (the modal path is a separate event — if it feels redundant, suppress the scene bell when the new turn also ends the run).
- **Bloom/white-out caution (MEMORY: "Seasonal transition bloom"):** keep the light wipe subtle and avoid any full-board brightness spike; the per-tile transition loop is already the validated path for tile recolor — the wipe is decoration, not a recolor.
- **Two Phaser games:** confirm you generated flip particle textures inside the **board** scene, not by referencing the strip game's textures (different `Phaser.Game`, different texture cache).

**Rollback safety:** the change is additive (one detection branch in an existing handler + one self-cleaning `playSeasonFlip` method + an optional audio cue). No persisted-shape change, no `SAVE_SCHEMA` bump, no new action type. Removing the `playSeasonFlip` call restores prior behavior exactly.

## Risks & gotchas

- **The seed brief's reduced-motion + `seasonTurn` framing needed correcting** (see Background): there is no in-game reduce-motion setting (use `_motionEnabled()`/OS query), and `seasonTurn` today fires on the **run-end `season` modal**, not the mid-run index flip. Re-read those two corrections before wiring.
- **`onRegistry("turnsUsed")` fires every turn** — the boundary guard is load-bearing.
- **Texture-key console-error tripwire:** guard every `generateTexture` with `this.textures.exists(key)` (the e2e/visual specs assert zero console errors).
- **One-shot discipline:** no `repeat:-1` tweens, no leaked emitters — destroy on completion and on scene shutdown.
- **Keep it subtle:** the bloom memory shows full-board brightness language/effects overshoot; cap the wipe alpha low.
- **Visual goldens can't be regenerated here** — expect at most a transient/informational diff; don't chase it on this host.

## References

- `src/features/zones/data.ts:109-120` — `seasonIndexInSession` / `seasonNameInSession` / `SESSION_SEASON_NAMES`.
- `src/GameScene.ts` — `seasonName` field (`:130`), `onRegistry("turnsUsed")` (`:292`), `season()` (`:610-619`), `drawBackground` season strip (`:665-668`), `refreshSeasonTint` (`:671-685`), `regenerateBoard` (`:737-754`), per-frame seasonal art loop `_animateSeasonalArt` (`:2046+`), `_motionEnabled` (`:2007-2016`), `_rebakeBakedTiles` (`:2205+`).
- `src/textures.ts:149-155` — `currentSeasonName`; `rebakeSeasonalTilesForSeason` (`:161+`).
- `src/textures/seasonal/seasonalArt.ts` — `seasonalAdvance` (`:234`), `advanceTransition` (`:198-229`).
- `src/audio/index.ts` — `seasonTurn` (`:74-77`), `SOUNDS` (`:49`), `play(name, { pitch })` (`:160`), SFX gate (`:161`).
- `src/audio/useAudio.tsx:58` — current `seasonTurn` trigger (on `modal === 'season'`); SFX sync (`:28-33`).
- `src/ui/seasonStripScene.ts` — `SEASON_PALETTES` (`:42-47`), `generateTextures` (`:206-294`), `buildParticles` per-season emitters (`:664-767`), `onRegistryChange` (`:1071-1078`).
- `src/ui/seasonStripPhaser.tsx` — strip mounted as its own `Phaser.Game` (`:57-101`), `hwv.*` registry sync (`:83-87, :129-134`).
- `prototype.tsx` — `turnsUsed`/`turnBudget` pushed to board registry (`:177-178, :275, :278`); React-side `seasonIdx` (`:367`).
- `src/types/gameStateFields.ts:23-31` — `GameSettings` (no reduce-motion field).
- `src/state.ts:345, :481, :1444` — where `modal: "season"` (run-end summary) is set.
- Skills: `phaser-scene-debug` (state↔registry↔scene boundary), `pixel-art-animation` (if hand-crafting flourish frames), `pre-pr-check` (PR body). Memory: `live-game-preview-verify`, `seasonal-transition-bloom` (keep the wipe subtle), `visual-goldens-host-limits`.
- Related: `docs/projects/22-four-season-tile-sets.md` — completing the per-tile season art makes the board itself change at the flip; this cinematic is the punctuation on top of that.
