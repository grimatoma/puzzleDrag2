# Chain Juice & Game-Feel (remaining vision)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Round out the moment-to-moment "juice" of the core chain verb so that building and collecting a chain feels tactile and rewarding at every length. **Most of the juice layer already ships** (float text, coin-fly-to-wallet chips, chain-length camera shake, escalating collect sound + haptic) and a per-tile **drag feedback ladder just landed**. This brief is the **REMAINING vision only** — the pieces not yet built — and it explicitly marks what is DONE so a fresh session does not re-implement shipped work.

The remaining items: a chain **combo/streak meter** across consecutive collects, a **bigger milestone flourish** at very long chains (≥10 / ≥15), and an optional **screen-edge vignette pulse**. The resource/coin counter tick-up the original concept called for is **already done** (see below) — what remains there is only an audit/polish pass, not a build.

## Background & current state (VERIFIED)

All references were read directly in this worktree. **Several "remaining" items from the seed concept turned out to be already shipped — corrections flagged inline.** Files are `.ts`/`.tsx` (CLAUDE.md's `.js`/`.jsx` is stale doc-drift).

### Already shipped (DO NOT rebuild)

- **`+N` float text on collect.** `GameScene.collectPath` builds the gain string and calls `this.floatText(...)` at **`src/GameScene.ts:1744`**; the floater helper is `floatText(msg, x, y)` at **`src/GameScene.ts:1964`**. It already clamps the displayed gain to the inventory cap and appends `★×N` upgrade / bonus-yield suffixes (lines 1726–1744).
- **Coin-fly-to-wallet reward chips.** The scene emits `SCENE_EVENTS.REWARD_BURST` from `collectPath` at **`src/GameScene.ts:1817`** with `coins: totalGained * (res.value ?? 0)` (line 1822) and the chain centroid in canvas-local coords. `prototype.tsx` listens at **`prototype.tsx:230`**, converts to page coords, and calls `emitBurst(...)` (line 238). The bus is **`src/ui/rewardEvents.ts`** (`emitBurst`/`onBurst`/`setCoinAnchorEl`/`getCoinAnchorRect`); the chip renderer is **`src/ui/RewardChipsLayer.tsx`** (mounted at `prototype.tsx:634`). The HUD coin pill registers itself as the fly-to anchor via `setCoinAnchorEl(coinAnchorRef.current)` at **`src/ui/Hud.tsx:133`**.
- **Chain-length-scaled camera shake.** `collectPath` calls `this.shakeForChain(this.path.length)` at **`src/GameScene.ts:1748`**; `shakeForChain` (line 1919) guards `len < 3` and uses the pure curves `shakeIntensityFor` / `shakeDurationFor` from **`src/game/juiceCurves.ts`** (lines 14, 23). A radial flash ring (`radialFlash`, line 1925, also `len < 3`-guarded, curve `radialPeakRadiusFor`) fires alongside it (called at line 1749). An `upgradeBurst` flash (line 1946) fires on upgrade tiles.
- **Collect sound with chain-length PITCH escalation + escalating haptic.** In **`src/audio/useAudio.tsx:44–48`**: on a `turnsUsed` increase the hook reads `lastChainLength` and plays `chainCollect` with `pitch = min(2.0, 1 + (len-3)*0.10)` for `len ≥ 3`, then vibrates `len >= 6 ? 80 : 40` ms when `hapticsOn`. Sound defs (`chainStart`, `chainTick`, `chainCollect`) live in **`src/audio/index.ts:53–63`**.
- **CORRECTION — resource/coin COUNTER tick-up is ALREADY DONE.** The seed concept listed "HUD count rolls up instead of snapping" as remaining. It is shipped: **`src/ui/primitives/useCountUp.ts`** is a rAF cube-eased count-up hook (with a `visualTest` instant-snap escape). The coin pill uses it at **`src/ui/Hud.tsx:128`** (`coinsDisplay` + a `data-count-pulse` gain/loss pulse + a `pulseKey`), and resource cells use it at **`src/ui/primitives/ResourceCell.tsx:114`**. Receipt "+N/−N" deltas next to the coin pill come from **`src/ui/primitives/useReceiptChips.ts`** (Hud.tsx:130). So the counter roll-up needs at most an *audit/polish* pass (e.g. confirm it reads well during fast multi-collect bursts), not a build.

### Done elsewhere — open [PR #1241](https://github.com/grimatoma/puzzleDrag2/pull/1241) (branch `claude/gallant-tesla-6b2acd`)

- **Per-tile drag "feedback ladder"** (doc `02-drag-build-feedback-ladder.md`). Implemented in PR #1241 (not yet merged to main): a pure `src/game/dragFeedback.ts` (`tickPitch` +7%/tile clamped, `tickHapticMs` 6→18 ms, a one-shot `crossesThreshold`) wired into `GameScene.addToPath`, playing a new `chainTick` sound at a laddered pitch per added tile, a distinct "now collectable" confirm cue when the chain first crosses `_effectiveMinChain()`, and an escalating haptic gated on `hapticsOn`. **Treat 02 as DONE via #1241 — do not re-spec or re-implement it** (a near-identical duplicate was reverted from another branch to avoid two copies of `dragFeedback.ts`).

### Remaining (this brief)

1. **Resource/coin counter tick-up — audit only.** Already shipped via `useCountUp` (above). Remaining work, if any, is a polish pass: verify roll-up timing during rapid back-to-back collects and that the board-side reward chip + the HUD count-up don't read as double-counting. No new mechanism.
2. **Chain COMBO / streak meter** across consecutive collects — there is no streak state today. `lastChainLength` exists (read in `useAudio.tsx:45`) but nothing tracks *consecutive* collects or decays a streak.
3. **Milestone flourish at very long chains (≥10 / ≥15)** — today shake/flash scale continuously and clamp; there is no distinct one-shot celebration at long-chain milestones.
4. **Optional screen-edge vignette pulse** — no vignette overlay exists.

## Scope

**In scope (remaining only):**
- A combo/streak meter: track consecutive collects (and a decay/break rule), surface it in the HUD, and optionally feed it into the existing juice (shake/sound) intensity.
- A milestone flourish: a distinct one-shot effect at chain length ≥10 and a bigger one at ≥15, layered on top of (not replacing) the existing continuous shake/flash.
- An optional screen-edge vignette pulse on big collects.
- A short audit/polish pass on the already-shipped `useCountUp` counter roll-up.

**Out of scope / non-goals:**
- Re-building float text, reward chips, camera shake, the collect sound/haptic, or the drag feedback ladder — all shipped (see above).
- Any new dispatched **action type** unless registered (slice footgun — see Risks). Prefer riding existing `CHAIN_COLLECTED` and existing HUD state.
- A `SAVE_SCHEMA_VERSION` bump. The streak is **session/run-scoped** and should NOT be persisted (a combo that survives reload is undesirable and a persisted field forces a migration — out of scope here).
- New art-pipeline / PixelLab assets. Vignette + milestone flourishes are procedural Phaser graphics/CSS, like the existing `radialFlash` / `upgradeBurst`.
- Re-tuning the existing juice curves' base numbers (only *add* milestone tiers / a streak multiplier on top).

## Implementation plan

Ordered. Names are exact; verify symbols before pasting.

### 1. Counter tick-up audit (polish, no build)
- Confirm `useCountUp` (`src/ui/primitives/useCountUp.ts`) reads well when coins jump several times in one second (rapid chains). It already coalesces by animating `from → value` each change; check the pulse `gen` key (line 70/74) doesn't strobe. If acceptable, record "verified, no change" — this item is done.

### 2. Combo / streak meter
- **State location:** the streak is run-scoped. Two viable homes — pick one and stay consistent:
  - (a) **Scene-local** in `GameScene` (a `_comboCount` + a timeout/turn-based decay), surfaced to React via a new `SCENE_EVENTS` emit or a registry key. Keeps it out of the reducer/persistence entirely (recommended — no save/footgun risk).
  - (b) **Reducer-side** on a volatile, non-persisted field. If you go reducer-side, the increment must run inside `CHAIN_COLLECTED` and the field must be added to the persistence **VOLATILE** allowlist (`src/state/persistence.ts:7`) so it is NOT written to the save — otherwise you change the persisted shape and force a migration. Any *new action type* needs `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` registration (run the `check-slice-action` skill).
- **Decay rule:** define what breaks the streak (e.g. resets at season roll, or after N seconds with no collect). Keep it simple and testable as a pure helper (mirror the `dragFeedback.ts` / `juiceCurves.ts` pattern: a pure `nextCombo(prev, ...)` in `src/game/`).
- **HUD surface:** render the streak near the coin/season area in `src/ui/Hud.tsx`. Reuse the existing pulse styling conventions (`data-count-pulse`) for cohesion.

### 3. Milestone flourish (≥10 / ≥15)
- In `collectPath` (after the existing `shakeForChain` / `radialFlash` calls at `src/GameScene.ts:1748–1749`), add a one-shot at length thresholds — a bigger `radialFlash`/`upgradeBurst`-style ring, a distinct sound (reuse `chainCollect` at a higher pitch or add a `chainMilestone` def in `src/audio/index.ts`), and a stronger haptic. Keep it **additive** on top of the clamped continuous curves so short chains are byte-for-byte unchanged.
- Put the threshold/intensity math in a pure helper (e.g. extend `src/game/juiceCurves.ts` with a `milestoneTierFor(len): 0|1|2`) so it is unit-testable without Phaser.

### 4. Optional screen-edge vignette pulse
- A short radial-gradient overlay that pulses on big collects. Cheapest as a CSS/DOM overlay in React (driven off the same `REWARD_BURST` / a new milestone event) rather than a full-screen Phaser graphic, so it composes with the canvas. Gate it behind the milestone tier so it only fires on long chains.
- **Respect reduced motion if doc `23` has landed:** if the `reducedMotion` setting exists, the vignette + milestone flourish + streak shake-boost are exactly the kind of effect that must be damped. Wire them through the same gate.

### 5. Tests + housekeeping
- Unit-test the pure helpers (`nextCombo`, `milestoneTierFor`) — A/B deltas, not just "it runs."
- After code changes: `graphify update .`; then `npm run lint && npm run typecheck && npm test`.

## Success criteria

- [ ] A visible combo/streak meter increments on consecutive collects and resets per its decay rule; it does **not** persist across reload (not in the save).
- [ ] A distinct one-shot flourish fires at chain length ≥10 and a bigger one at ≥15, layered on the existing shake/flash; chains < 10 are unchanged.
- [ ] (If built) the vignette pulse fires only on milestone chains and is damped/disabled when `reducedMotion` is on (doc 23).
- [ ] The counter roll-up audit is recorded (verified-no-change or a small polish PR).
- [ ] No new persisted field; `SAVE_SCHEMA_VERSION` is unchanged (still **47**, `src/constants.ts:215`). An existing save loads without being wiped.
- [ ] No unregistered action type was added (grep + `check-slice-action`).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

**Gating (must pass before PR):** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

**Unit tests (the real proof — the Phaser/canvas layer has ZERO unit coverage, so push juice math into pure helpers and test there):**
- `nextCombo`: collecting in succession raises the count; the break condition resets it. A/B: with vs without an intervening break.
- `milestoneTierFor(len)`: `9 → 0`, `10 → 1`, `15 → 2` (or your chosen thresholds); assert the continuous curves are untouched below 10.

**Manual in-game check (canvas effects have no unit coverage):**
- Spin a worktree Vite on a spare port with base `/puzzleDrag2/`: `node ../../../node_modules/vite/bin/vite.js` (the worktree has no `node_modules`; `:5173` serves MAIN, not this worktree).
- `preview_screenshot` HANGS on this host — **do not use it.** Drive/inspect via `window.__hearthVisual.dispatch/state/freeze` and `window.__phaserScene`; assert via DOM + `getComputedStyle`.
- Build a 10+ then 15+ chain and confirm the milestone flourish + streak meter fire; reload mid-streak and confirm the streak resets (not persisted).

**Informational (not gating on this host):** `npm run test:e2e`, `npm run test:visual`. Visual goldens are **not regenerable on this Windows host** (DOM drifts 3–5%, Phaser WebGL ~38%); a juice change moves pixels — flag any diffs for canonical (Linux CI) re-baseline.

## Double-check / adversarial review

- **"Did I rebuild something already shipped?"** Before writing any float-text / reward-chip / shake / collect-sound / drag-ladder code, re-read the "Already shipped" and "Just landed" sections. The most likely waste here is re-implementing the counter tick-up (it's `useCountUp`, done) or a second collect sound (`chainCollect` exists, pitched).
- **Persistence trap:** a streak that survives reload means you persisted it. Keep it scene-local or in the VOLATILE allowlist; prove with a reload test.
- **Slice footgun:** if you add a reducer-side streak action, it silently no-ops unless registered in `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` (`src/state.ts`). Prefer scene-local state to sidestep it.
- **Additivity:** every new effect must be additive — with no milestone reached and no streak, board feel is identical to today. Prove the existing test suite stays green and short chains are unchanged.
- **Reduced-motion coupling:** the new flourishes are prime candidates for the doc 23 reduced-motion damp. If 23 has landed, wire them in; if not, leave a clear TODO so 23 catches them.

## References

- `src/GameScene.ts` — `collectPath` float text (1744), `floatText` (1964); `REWARD_BURST` emit (1817, coins at 1822); `shakeForChain` call (1748) + def (1919); `radialFlash` (1749 call, 1925 def); `upgradeBurst` (1946); `addToPath` (1365) → `_chainFeedback` (1382); `_effectiveMinChain` (used at 1385).
- `src/game/juiceCurves.ts` — `shakeIntensityFor` (14), `shakeDurationFor` (23), `radialPeakRadiusFor` (33). **(extend with `milestoneTierFor`.)**
- `src/game/dragFeedback.ts` — `tickPitch` (20), `tickHapticMs` (29), `crossesThreshold` (39). **(DONE — reference only.)**
- `src/audio/useAudio.tsx` — chain collect pitch + haptic (44–48). `src/audio/index.ts` — `chainStart`/`chainTick`/`chainCollect` defs (53–63).
- `prototype.tsx` — `REWARD_BURST` listener → `emitBurst` (230–238); `hapticsOn` registry bridge (283–286); `RewardChipsLayer` mount (634).
- `src/ui/rewardEvents.ts` — `emitBurst`/`onBurst`/`setCoinAnchorEl`/`getCoinAnchorRect`. `src/ui/RewardChipsLayer.tsx` — chip renderer.
- `src/ui/Hud.tsx` — coin pill + `useCountUp` (128), receipt chips (130), `setCoinAnchorEl` anchor (133), pill rendered `!onBoard` (198). `src/ui/primitives/useCountUp.ts` — count-up hook. `src/ui/primitives/useReceiptChips.ts`. `src/ui/primitives/ResourceCell.tsx:114` — resource cell count-up.
- `src/state/persistence.ts` — whole-state persist minus `VOLATILE` (7, 50); `src/constants.ts` — `SAVE_SCHEMA_VERSION = 47` (215).
- Skills: **`check-slice-action`** (any action registration), **`phaser-scene-debug`** (reducer↔registry↔scene boundary), **`pre-pr-check`**.
- Related: doc **02** (drag feedback ladder — now SHIPPED), doc **23** (reduced-motion — wire the new flourishes through its gate).
