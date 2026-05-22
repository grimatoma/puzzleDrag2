# Motion & Transitions

Catalogue of every animation, transition, and motion-driven visual effect in the app. Organized by surface so you can find "what plays here" by location. Each entry lists the visible behavior, the source files, and the duration / easing tokens that drive it.

If you're touching motion code, this is the index. If you're adding a new effect, add it here too — keep the list complete.

---

## Table of contents

1. [HUD: numeric count-ups & receipt chips](#hud-numeric-count-ups--receipt-chips)
2. [Buttons: hover, press, disabled](#buttons-hover-press-disabled)
3. [Modals & dialogs: enter / exit](#modals--dialogs-enter--exit)
4. [Bottom sheets: enter / exit](#bottom-sheets-enter--exit)
5. [Toasts & NPC bubbles: enter / exit / stagger](#toasts--npc-bubbles-enter--exit--stagger)
6. [Tab badges: pulse on increment](#tab-badges-pulse-on-increment)
7. [View transitions: screen crossfade](#view-transitions-screen-crossfade)
8. [Board → HUD: reward trajectory chip](#board--hud-reward-trajectory-chip)
9. [Board: tile lift on selection](#board-tile-lift-on-selection)
10. [Board: path validity color tween](#board-path-validity-color-tween)
11. [Board: chain landing bounce & upgrade pop-in](#board-chain-landing-bounce--upgrade-pop-in)
12. [Season transition cinematic](#season-transition-cinematic)
13. [Level-up cinematic](#level-up-cinematic)
14. [Boss encounter pre-roll](#boss-encounter-pre-roll)
15. [Typography: display serif on titles](#typography-display-serif-on-titles)
16. [Panel chrome: gold underline ornament](#panel-chrome-gold-underline-ornament)
17. [App shell: parchment-grain texture](#app-shell-parchment-grain-texture)
18. [Pre-existing motion (not introduced in this pass)](#pre-existing-motion-not-introduced-in-this-pass)
19. [Visual-test freeze contract](#visual-test-freeze-contract)

---

## HUD: numeric count-ups & receipt chips

**What you see.** When coins, level, or other tracked numbers change, the number tweens up/down over 200–900 ms instead of snapping. As it tweens, it does a brief scale-bump (1 → 1.18 → 1, ~420 ms cubic-bezier with overshoot) tinted brighter on gain or darker on loss. A small floating "+N" / "-N" chip drifts up from the number itself for ~1.1 s and fades.

**Hook.** `src/ui/primitives/useCountUp.js` — RAF-tweened number with a `{ display, pulse, pulseKey }` return. The `pulseKey` increments on every change so the consumer can use it as a React `key` to force the pulse element to re-mount and replay the keyframe. Snaps instantly when `data-visual-test="true"` is set on `<html>`.

**Receipt-chip hook.** `src/ui/primitives/useReceiptChips.js` — watches a value, queues a transient `{ id, delta }` entry on each change, auto-removes after `lifetimeMs` (default 1100 ms). Filterable by sign.

**Keyframes (`src/index.css`).**
- `@keyframes gainPop` — `scale(1) → 1.18 → 1`, `filter: brightness(1) → 1.4 saturate(1.2) → 1`, 420 ms `cubic-bezier(.34,1.56,.64,1)`.
- `@keyframes lossPop` — `scale(1) → 0.92 → 1`, brightness 1 → 0.85 → 1, 360 ms `ease-out`.
- `@keyframes rewardChipFloat` — drift up ~28 px, fade out over 1100 ms `cubic-bezier(.2,.7,.2,1)`.

**Selectors.** `[data-count-pulse="gain"]` and `[data-count-pulse="loss"]` carry the animation; `.reward-chip` carries the float.

**Wiring.** Coins and level in `src/ui/Hud.jsx` consume both hooks; the count-up renders the number with the data-attribute, the receipt chips render absolutely-positioned floaters above the coin pill.

---

## Buttons: hover, press, disabled

**What you see.** Hovering any `.hl-btn` on a pointer device lifts it 1 px and grounds it with a thin shadow. Pressing it (touch or mouse) pushes it 1 px down, scales it to 0.97, and inverts the shadow into an inset highlight — the button physically depresses for 60 ms. Disabled buttons drop to 0.6 opacity.

**Source.** `src/components.css:367-394`.

**Timings.** Background / border / color transitions all 140 ms `ease`. The transform uses 120 ms `cubic-bezier(.34,1.56,.64,1)` (the same overshoot curve as the count-up). On `:active`, transition-duration is force-shortened to 60 ms so the press lands instantly.

**Why hover is media-gated.** `@media (hover: hover) { .hl-btn:hover { … } }` — touch devices skip the lift and fall straight through to `:active`, so iOS doesn't get a sticky hover state on tap.

---

## Modals & dialogs: enter / exit

**What you see.** Opening a dialog: backdrop fades in, panel slides up 8 px + fades over 200 ms. Closing: panel slides down 4 px + scales to 0.985 + fades; backdrop fades in parallel; both unmount once the exit completes. Symmetry on both sides — no more instant-pop dismiss.

**Hook.** `src/ui/primitives/useExitTransition.js` — phase state machine: `"open"` → `"exiting"` → `"closed"`. Returns `{ shouldRender, exiting }`. Consumers keep the element mounted while `shouldRender`, swap the animation class when `exiting`, and let the timer transition phase to `"closed"` to unmount.

**Wiring.** `src/ui/primitives/Dialog.jsx` (`ParchmentDialog`, `StoryDialog`) threads `exiting` into both `BackdropShell` (backdrop fade) and `PanelIn` (panel slide).

**Keyframes (`src/index.css`).**
- `@keyframes dialogPanelIn` — `translateY(8px) + opacity 0 → 1`.
- `@keyframes dialogPanelOut` — `translateY(0) → 4px scale(0.985) + opacity 1 → 0`.
- `@keyframes backdropOut` — opacity 1 → 0.

**Timing.** Enter 200 ms, exit ~130 ms (`enter / 1.5`, snappier than entry — feels responsive, not draggy).

---

## Bottom sheets: enter / exit

**What you see.** Sheets slide up from the bottom edge; on dismiss they slide back down to translateY(100%) with a slight fade.

**Source.** `src/ui/primitives/BottomSheet.jsx` — wraps the same `useExitTransition` hook used by dialogs.

**Keyframes.**
- `@keyframes bottomSheetIn` — `translateY(100%) → 0`.
- `@keyframes bottomSheetOut` — `translateY(0) → 100% + opacity 1 → 0.6`.

---

## Toasts & NPC bubbles: enter / exit / stagger

**What you see.** A toast or NPC speech bubble fades in from 8 px below at 96 % scale (180 ms). It sits for its full lifetime, then on dismiss / timeout slides up 8 px and fades over 180 ms — never just disappearing. When multiple toasts arrive in the same 350 ms window, each one's entrance is staggered by 80 ms (capped at 240 ms total) so the eye registers them sequentially instead of as a wall.

**Hooks / wiring.** `src/ui/primitives/Toast.jsx`:
- `ToastItem` / `BubbleItem` set local `exiting` state when the dismiss timer fires; `onDone` is called *after* the exit anim so the parent can unmount it cleanly.
- `NotifierProvider` tracks `staggerRef` — a cumulative delay that bumps by 80 ms per arrival and resets after a 350 ms quiet window.

**Keyframes (`src/index.css`).**
- `@keyframes toastIn` — `translateY(8px) scale(0.96) + opacity 0 → 1`.
- `@keyframes toastOut` — `translateY(0) → -8px scale(0.96) + opacity 1 → 0`.

**Fixed regression.** The old code declared both an inline `animation: "toastIn 180ms ease-out"` and a Tailwind `animate-[fadein_…]` class — the `toastIn` keyframe didn't exist, so only the Tailwind half ran. We added the keyframe and removed the duplicate.

---

## Tab badges: pulse on increment

**What you see.** The "ready orders" badge on the Inventory tab (and any other badge wired through `Tab`) gains the gain-pop scale-bump every time its count goes up.

**Source.** `src/ui/primitives/TabBar.jsx` — the `Badge` runs its `count` through `useCountUp` and applies the resulting `pulseKey` as the React `key`. Re-mounting on each count change replays the `[data-count-pulse]` keyframe.

---

## View transitions: screen crossfade

**What you see.** Switching between top-level views (Town, Board, Inventory, Crafting, Map, Townsfolk) no longer snaps — the incoming view fades in over 220 ms with a small Y nudge. The direction of the nudge depends on where you're going: heading into a deeper feature slides up from below, returning to Town slides down from above.

**Direction hook.** `src/ui/primitives/useViewDirection.js` — heuristic that returns `"down"` when navigating *to* `town`, `"up"` otherwise. Sibling-to-sibling moves (inventory ↔ craft ↔ map) all read as "forward."

**Wiring.** `src/ui.jsx` — `FeatureScreens` wraps the active feature in a `<div key={viewKey} className="view-enter-up|down">`. Keying on `viewKey` forces a remount on every navigation, which retriggers the keyframe.

**Town wrapper.** `prototype.jsx` wraps the Town surface in `.view-enter-down` so coming home from a feature uses the "back" direction.

**Keyframes (`src/index.css`).**
- `@keyframes viewEnterUp` — `translateY(10px) + opacity 0 → 1`, 220 ms `cubic-bezier(.2,.7,.2,1)`.
- `@keyframes viewEnterDown` — `translateY(-10px) + opacity 0 → 1`, same duration / easing.
- `@keyframes viewEnter` — neutral 4 px version, used by surfaces that don't care about direction.

The HUD and bottom nav sit structurally *outside* the swap target, so they don't animate — only the panel content does.

---

## Board → HUD: reward trajectory chip

**What you see.** When a chain pays out, a glowing gold "+15" (or whatever the coin reward was) spawns at the center of the chain on the canvas and arcs upward to the HUD coin pill. As it lands, the coin pill is already mid-count-up via `useCountUp`. Source and target are real DOM coordinates — the chip actually flies to the pill.

**Event bus.** `src/ui/rewardEvents.js` — module-level `EventTarget`. Phaser side calls `emitBurst({ pageX, pageY, coins })` when a chain collects; the HUD coin pill registers itself as the anchor via `setCoinAnchorEl(el)`; `getCoinAnchorRect()` resolves the live page-space rect each spawn.

**Phaser source.** `src/GameScene.js` — after a chain collects, emits the canvas-space center → page-space coords + coin total through `SCENE_EVENTS.REWARD_BURST` (`src/constants.js`). `prototype.jsx` subscribes and forwards into the rewardEvents bus.

**React renderer.** `src/ui/RewardChipsLayer.jsx` — portaled to `document.body` at `z-index: 150`, listens to the bus, computes `dx = targetX - startX` and `dy = targetY - startY`, renders a `.reward-trajectory-chip` with `--tx`/`--ty` CSS custom properties driving the keyframe.

**Keyframe (`src/index.css`).** `@keyframes rewardTrajectory` — 4-stage interpolation of `translate(calc(-50% + var(--tx) * k), calc(-50% + var(--ty) * k))` from 0 % to 100 %. Starts at 0.6 scale, pops to 1.1 mid-flight, lands at 0.55 as it fades. 900 ms `cubic-bezier(.45,.05,.55,.95)`.

---

## Board: tile lift on selection

**What you see.** When you drag-select a chain, the selected tiles lift ~6 px above the board and gain a soft elliptical shadow at their rest position. They scale to 1.08 (was 1.06). It reads like the chain physically rises off the board surface.

**Source.** `src/TileObj.js` — `setSelected(on)` adjusts `baseY = scene.boardY + row * ts + ts / 2 - 6` when selected, paints an ellipse `Graphics` shadow at the original rest position, and tweens scale to 1.08. The shadow is destroyed in `destroy()` to prevent leak.

---

## Board: path validity color tween

**What you see.** While dragging a partial chain (below the minimum length), the path line is brown. The moment your chain reaches the minimum (3 by default, 5 in Winter / boss), the line color tweens smoothly from brown → orange over ~120 ms instead of snapping. Crossing back below the threshold tweens it back. The halo around the head also brightens.

**Source.** `src/GameScene.js` — `_pathValidProgress` is a 0 → 1 tween value updated each frame; `_repaintPathColors()` interpolates between `PATH_COLORS_INVALID` and `PATH_COLORS_VALID` via `lerpHex(invalid, valid, progress)` and applies the result to the line stroke + halo fill.

---

## Board: chain landing bounce & upgrade pop-in

**What you see.** When tiles fall into place after a collapse, each one squishes briefly on landing — scaleY 0.9 → 1 over ~80 ms — instead of just stopping. When a chain triggers an upgrade and the next-tier tile spawns, it pops in from scale 0 → 1 with a `Back.Out` easing and emits a small gold sparkle, rather than just appearing.

**Source.** `src/GameScene.js`:
- `_landingBounce(tile)` — called after the fall tween completes, runs an 80 ms scaleY squash-and-release.
- `_upgradeSpawnBurst(tile)` — called when the upgrade spawns, scale 0 → 1 with `Back.Out` over 220 ms, plus a one-shot sparkle emit from the existing gold particle emitter.

---

## Season transition cinematic

**What you see.** When the board crosses into a new season (Spring → Summer, Summer → Autumn, …), a radial-gradient color wash tinted to the season's color fades up over the play area for ~1.1 s. Centered in the wash, the season name slides up from 18 px with letter-spacing collapsing from 0.4em to 0.05em, holds, then fades up and out with letter-spacing reopening. Season's signature color also drives a soft text-shadow on the name.

**Component.** `src/ui/SeasonCinematic.jsx` — portal-rendered to `document.body` at `z-index: 200`. Watches `seasonIndexInSession(turnsUsed, turnBudget)` from `src/features/zones/data.js`; fires only when on the board AND season index changes (suppresses entry from non-board views).

**Keyframes (`src/index.css`).**
- `@keyframes seasonCinematicBg` — opacity 0 → 1 → 1 → 0 (held mid-arc), 1100 ms ease-in-out.
- `@keyframes seasonCinematicCard` — letter-spacing + Y + scale arc with the same 4-stop profile, 1100 ms `cubic-bezier(.2,.7,.2,1)`.

Tint and accent come from `SEASONS[idx].bg` and `.fill` in `src/constants.js`.

---

## Level-up cinematic

**What you see.** When `state.level` ticks up, a full-screen radial-gradient gold-tinted glow fades on, conic-gradient "sunburst" rays sweep behind a card that reads `LEVEL UP / N` (the new level in big tabular-nums gold), the card scales 0.6 → 1.08 → 1, holds, then fades up and out. The whole sequence runs 1.6 s and is `pointer-events: none` — gameplay continues underneath.

**Component.** `src/ui/LevelUpCinematic.jsx` — portal-rendered to `document.body` at `z-index: 200`. Mounted-flag guards first render so initial save load doesn't fire it. Fires only when `level > prev`.

**Keyframes (`src/index.css`).**
- `@keyframes levelupBg` — opacity arc 0 → 1 → 1 → 0, 1600 ms ease-in-out.
- `@keyframes levelupCard` — scale arc 0.6 → 1.08 → 1 → 1.12 with opacity, 1600 ms `cubic-bezier(.34,1.56,.64,1)`.
- `@keyframes levelupRays` — rotates 0° → 80° while scaling 0.4 → 1.4 with opacity arc, 1600 ms `ease-out`.

The "rays" element is a 600×600 `conic-gradient` of alternating gold wedges; blur(0.5px) softens the edges.

---

## Boss encounter pre-roll

**What you see.** Before the boss modal slides up, an ember-rose radial flash blooms from the screen center while a vignette darkens the edges with a brown-red tint. The camera shakes briefly at low intensity. After ~700 ms the modal opens. Communicates "this is a Big Moment" before the player has to deal with it.

**Component.** `src/ui/BossCinematic.jsx` — portal-rendered to `document.body` at `z-index: 60`. Watches `state.modal === "boss"`; fires only on rising edge (modal opens from elsewhere, not from initial mount). Calls `scene._shake(360, 0.012)` on the live Phaser scene via `getPhaserScene()`.

**Keyframes (`src/index.css`).**
- `@keyframes bossCinematicVignette` — opacity 0 → 1 → 0 over 700 ms ease-out.
- `@keyframes bossCinematicFlash` — scale 0.4 → 1.1 → 2.2 with opacity arc 0 → 0.85 → 0 over 700 ms `cubic-bezier(.4,0,.6,1)`.

Vignette is a radial gradient from transparent center → `rgba(58,18,8,0.85)` edge. Flash is a 220 px circle with an ember → muted-rose gradient and 8 px blur.

---

## Typography: display serif on titles

**What you see.** Panel titles and detail-pane headers render in a serif display face (Cinzel, fallback chain to IM Fell English → Fraunces → ui-serif → Georgia). Body type stays system sans. The shift is small but does more for "feels like a game" than any single micro-animation: the parchment chrome stops competing with sans body for medieval read.

**Token.** `src/tokens.css:120` — `--font-display: "Cinzel", "IM Fell English", "Fraunces", ui-serif, Georgia, "Times New Roman", serif;`

**Applied to.** `src/components.css` — `.hl-panel-title`, `.hl-title`, `.hl-detail-pane__title`. All use `font-family: var(--font-display)` and a small `letter-spacing` bump (0.015em) for elegance at display sizes.

The fonts aren't loaded via `<link rel="stylesheet">`; we let the OS resolve the fallback chain so we don't ship webfonts unless we choose to. Cinzel ships on most Mac/iOS installs; Georgia is the universal last fallback.

---

## Panel chrome: gold underline ornament

**What you see.** Every feature panel header carries a soft gold underline beneath the title — a thin horizontal gradient from transparent → gold-soft → transparent. Subtle "ledger plate" detail that ties panels into the cozy-medieval visual identity without competing with content.

**Source.** `src/components.css:51-63` — `.hl-panel-header::after` with `linear-gradient(90deg, transparent, var(--gold-soft) 25%, var(--gold-soft) 75%, transparent)` at 0.55 opacity, 1 px tall, inset 12 px from each side.

---

## App shell: parchment-grain texture

**What you see.** The brown chrome that wraps the board (sidebar columns and the inset bands top and bottom) carries a subtle layered dot pattern with `mix-blend-mode: overlay`. Reads as worked leather instead of flat flood-fill. Feature panels and the board itself sit on top and are untouched.

**Source.** `src/index.css:159-179`.

**Mechanism.** `.hl-app-shell::before` paints a `::before` pseudo at `z-index: 0` with two staggered radial-gradient dot patterns (parchment cream highlights + dark shadow specks). `.hl-app-shell > *` lifts every direct child to `z-index: 1` so the pattern stays behind content.

**Wiring.** `prototype.jsx` adds `hl-app-shell` to the app shell wrapper div.

---

## Pre-existing motion (not introduced in this pass)

For completeness — these existed before and were not modified. Listed here so the catalogue is whole:

- **Town clouds drift** (`townCloudA/B/C`, `cloudBreathe`) — `src/index.css:8-34`. Slow horizontal drift on Town backdrop layers.
- **Town smoke** (`townSmoke`, `townThemeFade`) — `src/index.css:56-66`. Chimney smoke loop and night/day backdrop crossfade.
- **Hearth pulse** (`hearthPulse`) — `src/index.css:67-70`. Center brazier slow breathe.
- **Story dialog slide** (`storyDialogIn`, `storyBarIn`) — `src/index.css:36-44`. Story modal entry from below.
- **Tutorial pulse ring** (`storyPulseRing`) — `src/index.css:46-54`. Looping ring around the CTA the tutorial is pointing at.
- **Per-station crafting strip** (`craftStripActivePulse`, `craftStripReadyGlow`, `craftRingDashSpin`, `craftRingReadyPulse`, `craftBadgeReadyPulse`) — `src/index.css:331+`. Crafting queue visuals: pulse while running, ring spin, ready-state glow.
- **Tile sway** (`TileObj.js` sway tween) — gentle continuous rotation oscillation on board tiles.
- **Path-line glow & expanding ring** (`GameScene.js`) — particle-style head halo on the drag path.
- **Camera shake** (`GameScene.js:_shake`) — scales by chain length on collect; reused by boss cinematic.
- **Radial collect flash** (`GameScene.js`) — gold flash at the chain end on collect.
- **XP bar width transition** (`ActionCard.jsx`) — 300 ms width tween on the progress fill.

---

## Visual-test freeze contract

The visual regression suite (`npm run test:visual`) snaps Playwright screenshots and diffs them against goldens. Motion is the enemy of pixel-stable snapshots, so the harness sets `document.documentElement.dataset.visualTest = "true"` before first paint, and a stylesheet zeros all transition / animation durations.

**Two contracts new motion code must respect:**

1. **Number tweens snap instantly.** `useCountUp` checks `data-visual-test="true"` and returns the current value directly when set — no in-flight tween will be captured.
2. **Cinematics never fire on first mount.** `LevelUpCinematic`, `BossCinematic`, and `SeasonCinematic` all guard their first effect run with a `mountedRef` (level-up + boss) or an `entered` flag (season). Goldens load mid-game state via `?visual=…` scenarios, and we don't want a load to trigger a "level up" overlay against the snapshot.

If you add new motion that paints fullscreen or animates a number, follow the same two patterns and verify with `npm run test:visual` before pushing.
