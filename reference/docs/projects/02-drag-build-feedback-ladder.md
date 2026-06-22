# Drag-Build Feedback Ladder (audio + haptics)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Drag-to-build a chain in this game today is almost silent **during** the drag. The only escalating audio (`chainCollect`, pitch rising with chain length) fires **after** release, and the only haptic during the drag is a single `navigator.vibrate(10)` at drag-start. Visually the drag is heavily juiced (growing line segments, ring bursts, star previews, validity colour-tween), but there is no per-tile *sound* and no escalating *haptic* as the chain grows. That asymmetry makes building feel flat next to the satisfying release sound.

This brief adds a **per-tile feedback ladder during the drag** for maximum game-feel ROI per line of code: a rising-pitch "tick" on each successful tile add (pitch laddered by current chain length), a distinct **confirm cue** the exact moment the chain first crosses the collectable threshold (`effectiveMinChain`), and an escalating haptic. All changes are pure presentation — **no economy, no state shape, no persisted data changes**. The single chokepoint (`addToPath`) plus one tiny audio addition make this a tight, low-risk change.

## Background & current state (VERIFIED)

All references below were read in this worktree. **CLAUDE.md still says `.js`/`.jsx`; the real files are `.ts`/`.tsx`** — trust the code, not CLAUDE.md.

### The drag chain lives in `src/GameScene.ts` (SHIPPED)
- `startPath(tile)` — `src/GameScene.ts:1424`. Begins the drag: sets `this.dragging = true`, calls `this.addToPath(tile)`, dims, shows grass hover, emits chain update, and **already fires a haptic**: `if (getRegistry(this.registry, "hapticsOn") && navigator.vibrate) { try { navigator.vibrate(10); } catch {} }` (`src/GameScene.ts:1446`). The seed brief's "single `navigator.vibrate(10)` on startPath" is **correct**.
- `tryAddToPath(tile)` — `src/GameScene.ts:1451`. The pointer-move handler. Handles backtrack (pop), rejects frozen/rubble/already-selected, and on a same-key + adjacent tile calls `this.addToPath(tile)` (`src/GameScene.ts:1467`). It is invoked from the pointer handler at `src/GameScene.ts:227`.
- **`addToPath(tile)` — `src/GameScene.ts:1470` — is the single funnel for "a tile was successfully added."** Both `startPath` and `tryAddToPath` route through it. Today it is:
  ```ts
  addToPath(tile: TileObj): void {
    tile.setSelected(true);
    tile.pulse();
    this.path.push(tile);
    this.redrawPath();
    this.updateGrassHover();
    this._emitChainUpdate();
  }
  ```
  This is where the per-tile tick + escalating haptic belong (immediately after `this.path.push(tile)` so `this.path.length` is the new, post-add length).
- `endPath()` — `src/GameScene.ts:1683`. On release, if `this.path.length >= this._effectiveMinChain()` it calls `collectPath()` (`src/GameScene.ts:1690`), else `clearPath(true)`.
- `collectPath()` — `src/GameScene.ts:1787`. Emits `SCENE_EVENTS.CHAIN_COLLECTED` (`src/GameScene.ts:1896`) which the reducer turns into the `CHAIN_COLLECTED` action and (separately) drives the post-release `chainCollect` audio via the `turnsUsed` delta (see below).
- `_effectiveMinChain()` — `src/GameScene.ts:553`. Returns `Math.max(3, boss?.minChain ?? 0)`. This is the **collectable threshold** — the moment `this.path.length` reaches this value, the chain becomes collectable and the path validity colour flips brown→orange (`pathValid` at `src/GameScene.ts:1489`). **Correction to the seed brief:** the brief says "min-chain/effective-min-chain threshold" as if there were two; there is exactly one effective threshold, `_effectiveMinChain()` (base 3, raised only by an active boss). The old winter min-chain was removed (see the comment at `src/GameScene.ts:551-552`).
- `_emitChainUpdate()` — `src/GameScene.ts:1993` — builds the payload via `buildChainUpdatePayload(...)` (pure, in `src/game/producedResource.ts:59`) and emits `SCENE_EVENTS.CHAIN_UPDATE`. The payload (`ChainUpdatePayload`, `src/game/producedResource.ts:42`) carries `count`, `valid`, `minChain`, `upgrades`, `nextTileProgress`, `resourceKey`, `tileKey`, etc. **This payload already contains everything needed to detect the threshold crossing on the React side** (`count` and `valid`/`minChain`).

### Audio: `src/audio/` (SHIPPED) — and a DORMANT sound
- `src/audio/index.ts` — Web-Audio synth. `play(name, { pitch })` (`src/audio/index.ts:152`) is **self-gating**: it returns immediately if `enabled.sfx` is false (`src/audio/index.ts:153`), clamps pitch to `[0.5, 2.5]`, and multiplies every step's `freq`/`freqEnd` by pitch. `setEnabled({ sfx, music })` (`src/audio/index.ts:38`) sets the module-level `enabled`.
- **There is NO volume control anywhere in the audio system.** `enabled` is `{ sfx: boolean, music: boolean }` only (`src/audio/index.ts:11-14, 31`). **Correction to the seed brief:** "respect the audio settings (mute, volume)" — there is a mute (`sfxOn` → `enabled.sfx`) but **no volume**. Do not invent one for this project; gain is baked per-step in `SOUNDS`.
- `SOUNDS` (`src/audio/index.ts:49`) defines `chainStart` (`src/audio/index.ts:51`: 200→400 Hz sine, 80 ms) — **but `chainStart` is NEVER played** (grep `chainStart` across `src/` finds only its definition + a comment at `src/audio/index.ts:102`). It is **DORMANT/DEAD**. We can repurpose it as the per-tile tick base, or add a new dedicated sound. This brief adds **two new sounds** (`chainTick`, `chainReady`) and leaves `chainStart` alone (optionally wire `chainStart` into `startPath` as a freebie — noted as optional).
- `src/audio/useAudio.tsx` — the React hook that watches `GameState` deltas and fires sounds. The post-release escalation lives here: when `turnsUsed` increases (chain collected), it computes `pitch = len >= 3 ? Math.min(2.0, 1 + (len - 3) * 0.10) : 1` and calls `play('chainCollect', { pitch })`, plus a haptic (`navigator.vibrate(len >= 6 ? 80 : 40)`) gated on `state.settings.hapticsOn` (`src/audio/useAudio.tsx:44-49`). **Correction to seed brief's "useAudio.tsx chainCollect pitch ~L44": confirmed, the block is `src/audio/useAudio.tsx:42-49`.** This hook is also where `setEnabled({ sfx: settings.sfxOn !== false, music: settings.musicOn === true })` is synced (`src/audio/useAudio.tsx:28-33`).

### Settings: `src/features/settings/` (SHIPPED)
- `DEFAULT_SETTINGS` (`src/features/settings/slice.ts:42`) = `{ sfxOn: true, musicOn: true, hapticsOn: true, tutorialDisabled: false }`. The toggles UI lists them (`src/features/settings/index.tsx:143` shows `{ key: 'hapticsOn', label: 'Haptics' }`). **There is NO `reduceMotion` setting.** **Correction to the seed brief:** "reduce-motion/haptics prefs" — there is **no reduce-motion pref** in this project; the only relevant gate is `hapticsOn`. Audio mute is `sfxOn`. Do not gate on a non-existent `reduceMotion`.
- `SETTINGS/TOGGLE` (`src/features/settings/slice.ts:58`) is the only mutation. Settings persist to their **own** localStorage key (`STORAGE_KEYS.settings`) via `persistSettings` (`src/features/settings/slice.ts:19`) — **separate from the main save**, so it is **NOT** under `SAVE_SCHEMA_VERSION`. We add no settings, so this is untouched.

### How settings reach the scene vs. the hook
- `hapticsOn` IS mirrored into the Phaser registry: `GameRegistryContract.hapticsOn: boolean` (`src/types/phaserRegistry.ts:59`), synced in `prototype.tsx:283-285`. So scene-side code reads it via `getRegistry(this.registry, "hapticsOn")` — exactly what `startPath` already does.
- **`sfxOn` is NOT in the registry** (it is not a key on `GameRegistryContract`). The scene cannot read `sfxOn` directly. **This is fine**: `play()` self-gates on `enabled.sfx`, which `useAudio` keeps in sync from `sfxOn`. So scene-side `play('chainTick')` correctly goes silent when sfx is off **without** the scene needing to know the setting.

### Cross-collect: `src/game/crossCollect.ts` (SHIPPED, pure)
- `findCrossCollectTargets(grid, pathCells)` (`src/game/crossCollect.ts:91`) is **pure** (no Phaser/React) and returns the unique partner cells `{ row, col, key }[]`. The seed brief's "findCrossCollectTargets is pure" is **correct**. Its `pathCells` param is `{ row, col, key }[]`; a `TileObj` exposes `.row`, `.col`, `.res.key`, so building the arg from `this.path` is trivial. The optional "partner-eligible" cue can call this from `addToPath` and compare target count to the previous count. **Kept OPTIONAL** (see Scope) — it runs a grid scan on every tile-add and is the least certain to feel good.

### Slice-action footgun & persistence — NOT triggered (but stated so a fresh session does not worry)
- This change dispatches **no new action** and reads/writes **no slice**. The per-tile tick is either (a) a direct `play()` call inside `addToPath` (scene-side), or (b) a `CHAIN_UPDATE`-delta listener inside `useAudio` (React-side). **Neither path adds an action type**, so the `SLICE_PRIMARY_ACTIONS` / `ALWAYS_RUN_SLICES` registration footgun in `src/state.ts` does **not** apply. If a later iteration adds a dispatched action, run the `check-slice-action` skill.
- **No persisted shape changes** → `SAVE_SCHEMA_VERSION` (`src/constants.ts`) is **not** bumped → no save wipe, no dependency on the save-migration ladder (doc 08).

## Scope

**In scope:**
- Two new synthesized sounds in `src/audio/index.ts`: `chainTick` (short rising bleep, the per-tile tick) and `chainReady` (a distinct confirm cue for the threshold crossing).
- Per-tile tick on every successful add, pitched by the **new** chain length (`this.path.length` after push). Laddered pitch so a long chain climbs audibly.
- A one-shot **confirm cue** (`chainReady`) the moment `this.path.length` first reaches `this._effectiveMinChain()` during a single drag (fire once per drag at the crossing, not on every subsequent add).
- Escalating **haptic** during the drag, gated by `hapticsOn` (registry, scene-side) — a small bump per add growing with length, plus a slightly stronger bump at the threshold crossing.
- Respect `sfxOn` (automatically, via `play()` self-gating) and `hapticsOn` (explicit gate).
- Unit tests for the pure helpers (pitch ladder, crossing-detection predicate) and an `index.ts` sound-registration test.

**Out of scope / non-goals (keep this tight):**
- **No volume control** — the project has none; do not add one.
- **No `reduceMotion` pref** — does not exist; do not add one or gate on it.
- No new persisted settings, no `SAVE_SCHEMA_VERSION` bump, no new dispatched actions, no reducer/slice changes.
- No change to the post-release `chainCollect` sound or haptic in `useAudio.tsx` (it stays as the release payoff).
- No economy/yield/threshold changes. Pure game-feel.
- The cross-collect "partner became eligible" cue is **OPTIONAL** and may be deferred — implement only if it demonstrably improves feel and does not cost noticeable per-add CPU.
- No new art/textures/visual goldens are *required* by this change (it is audio+haptics). If you also touch on-canvas visuals, see the visual-golden caveat in Risks.

## Implementation plan

Recommended approach: **scene-side** (option A). It puts the tick at the exact funnel (`addToPath`), reuses the existing `hapticsOn` registry read that `startPath` already uses, and fires the audio on the same frame as the visual ring-burst for tight sync. Option B (React-side via `CHAIN_UPDATE`) is documented as an alternative but is one event-hop later and cannot read per-add timing as precisely.

### Step 1 — Add the two sounds (`src/audio/index.ts`)
Add to the `SOUNDS` record (mirror the existing step shape). Keep gains low (match the ~0.05–0.07 range already used):
```ts
// Per-tile tick during a drag-build. Pitched up by chain length at the call site.
chainTick: {
  steps: [{ freq: 330, freqEnd: 440, dur: 45, type: 'triangle', gain: 0.05 }],
},
// Chain crossed the collectable threshold — distinct, slightly brighter confirm.
chainReady: {
  steps: [
    { freq: 523, dur: 55, type: 'square', gain: 0.05, gap: 60 },
    { freq: 784, dur: 70, type: 'square', gain: 0.05, gap: 0, delay: 0.060 },
  ],
},
```
No change to `play()` is needed — it already accepts `{ pitch }` and self-gates on `enabled.sfx`.

### Step 2 — Extract a pure pitch-ladder helper (testable without Phaser)
Add a tiny pure function. Put it in `src/audio/index.ts` (exported) or a new `src/game/dragFeedback.ts` (preferred — keeps `index.ts` synth-only and gives a clean unit-test target with no `window`/AudioContext dependency):
```ts
// src/game/dragFeedback.ts
/** Per-tile tick pitch as the chain grows. 1.0 at length 1, climbing ~6% per
 *  tile, clamped so it never exceeds play()'s 2.5 ceiling. Mirrors the spirit of
 *  the post-release chainCollect ladder in useAudio.tsx but per-add. */
export function tickPitch(len: number): number {
  return Math.min(2.2, 1 + Math.max(0, len - 1) * 0.06);
}

/** True only on the single add where the chain first becomes collectable:
 *  prevLen was below the threshold and newLen has reached it. */
export function crossesThreshold(prevLen: number, newLen: number, minChain: number): boolean {
  return prevLen < minChain && newLen >= minChain;
}

/** Haptic duration (ms) for a per-tile add, escalating with length. Returns 0
 *  to mean "no buzz" (e.g. very short chains) so callers can skip the call. */
export function tickHapticMs(len: number): number {
  if (len < 2) return 0;        // length 1 already buzzed via startPath's vibrate(10)
  return Math.min(35, 6 + len * 3);
}
```

### Step 3 — Wire the ladder into `addToPath` (`src/GameScene.ts:1470`)
Import the helper and `play` at the top of `GameScene.ts` (it already imports plenty from `./constants.js`; add `import { play } from "./audio/index.js";` and `import { tickPitch, crossesThreshold, tickHapticMs } from "./game/dragFeedback.js";`). Then:
```ts
addToPath(tile: TileObj): void {
  const prevLen = this.path.length;          // length BEFORE this add
  tile.setSelected(true);
  tile.pulse();
  this.path.push(tile);
  const len = this.path.length;              // length AFTER this add
  const minChain = this._effectiveMinChain();

  // Per-tile rising tick.
  play('chainTick', { pitch: tickPitch(len) });

  // One-shot confirm the instant the chain becomes collectable.
  if (crossesThreshold(prevLen, len, minChain)) {
    play('chainReady');
  }

  // Escalating haptic, gated by the user setting (same gate startPath uses).
  if (getRegistry(this.registry, "hapticsOn") && navigator.vibrate) {
    const ms = crossesThreshold(prevLen, len, minChain)
      ? 50                                   // stronger bump at the crossing
      : tickHapticMs(len);
    if (ms > 0) { try { navigator.vibrate(ms); } catch { /* unsupported */ } }
  }

  this.redrawPath();
  this.updateGrassHover();
  this._emitChainUpdate();
}
```
**Why `prevLen`/`len` and not a separate flag:** `crossesThreshold` is naturally one-shot per drag — once `prevLen >= minChain` it can never be true again within the same drag, and a fresh drag starts from `clearPath(false)` → `addToPath` with `path.length === 0`. **Backtrack edge case:** `tryAddToPath` pops on backtrack **without** calling `addToPath` (`src/GameScene.ts:1456-1462`), so popping below the threshold then re-crossing **will** replay `chainReady`. That is acceptable (re-crossing is a real re-confirmation) — but if a skeptic objects, see the Double-check section for the optional `_readyFiredThisDrag` latch.

### Step 4 (OPTIONAL) — cross-collect "partner eligible" cue
Only if it feels good. In `addToPath`, after the push, compute targets and compare to a per-drag cached count:
```ts
import { findCrossCollectTargets } from "./game/crossCollect.js";
// ... in addToPath, after push:
const grid = getRegistry(this.registry, "grid");
if (grid) {
  const pathCells = this.path.map(t => ({ row: t.row, col: t.col, key: t.res.key }));
  const n = findCrossCollectTargets(grid as never, pathCells).length;
  if (n > this._prevCrossCount) play('chainTick', { pitch: 1.9 }); // subtle high blip
  this._prevCrossCount = n;
}
```
Reset `this._prevCrossCount = 0` in `clearPath`/`startPath`. **Defer if unsure** — it adds a grid scan per add. Note `findCrossCollectTargets` reads the **registry grid** (`RegistryGrid`), whose cells expose `.key` (not `.res.key`); the helper handles both via `cellKey()` (`src/game/crossCollect.ts:64`).

### Step 5 — `graphify update .`
After code changes, run `graphify update .` to keep the knowledge graph current (AST-only, no API cost).

### Alternative — Option B (React-side, `src/audio/useAudio.tsx`)
If you prefer to keep all audio in the hook: in `prototype.tsx` the `CHAIN_UPDATE` event already flows to `setChainInfo(data)` (`prototype.tsx:222`). You would lift `chainInfo` (which carries `count`, `valid`, `minChain`) into something `useAudio` can diff, then in the hook's effect compare `count` vs the previous count: on increase → `play('chainTick', { pitch: tickPitch(count) })`; on `valid` flipping false→true (or count crossing `minChain`) → `play('chainReady')`. Haptic gates on `state.settings.hapticsOn` (the hook already does this for `chainCollect`). **Downside:** `CHAIN_UPDATE` is also emitted on backtrack and at drag end (`endPath` emits a `null`), so the diff logic is fiddlier than the scene-side funnel, and the tick lands one event-hop after the visual. Prefer Option A.

## Success criteria

- [ ] Dragging across same-key adjacent tiles plays an audible **tick on each added tile**, and the pitch **rises** as the chain grows (a 7-chain's last tick is clearly higher than its first).
- [ ] The instant the chain length first reaches `_effectiveMinChain()` (default 3; higher under a boss), a **distinct `chainReady` confirm** plays — different timbre from the tick, fired exactly once at the crossing.
- [ ] Each successful tile-add produces an **escalating haptic** on devices that support `navigator.vibrate`, **only when `hapticsOn` is true**; the crossing add buzzes slightly stronger.
- [ ] With **Sound (sfx) toggled OFF**, no tick / confirm sound plays during a drag (verified via `enabled.sfx === false` short-circuit in `play()`).
- [ ] With **Haptics toggled OFF**, no `navigator.vibrate` is called during the drag (the existing `startPath` vibrate also respects this).
- [ ] The post-release `chainCollect` sound + haptic in `useAudio.tsx` are **unchanged** (still fire once on collect).
- [ ] **No** new persisted settings, **no** `SAVE_SCHEMA_VERSION` bump, **no** new dispatched action types.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
- [ ] (If Step 4 done) a partner-eligible blip fires when a new cross-collect target becomes adjacent, with no measurable per-add jank.

## Validation — how to verify

### Gating (must pass before PR)
- `npm run lint` — clean.
- `npm run typecheck` — clean (`tsc --noEmit` over `src/` + entries). Watch for: missing imports of `play`/helpers in `GameScene.ts`, and the `findCrossCollectTargets` grid cast if Step 4 is done.
- `npm test` — Vitest (node env, fake localStorage, **no canvas**). The Phaser/canvas layer has **zero** unit coverage, so all new tests must target **pure** helpers, not `GameScene`.
- `npm run build` — production build succeeds.

### New unit tests to add (pure, run under `npm test`)
- `src/__tests__/dragFeedback.test.ts`:
  - `tickPitch`: `tickPitch(1) === 1`; monotonic increasing for `len = 1..12`; clamped at `<= 2.2`; never exceeds `play()`'s 2.5 ceiling.
  - `crossesThreshold`: `crossesThreshold(2, 3, 3) === true`; `crossesThreshold(3, 4, 3) === false`; `crossesThreshold(4, 3, 3) === false` (backtrack down — no fire); `crossesThreshold(0, 5, 3) === true` (jump past — still fires once); honours a raised boss `minChain` (e.g. `crossesThreshold(4, 5, 5) === true`).
  - `tickHapticMs`: returns `0` for `len < 2`; monotonic non-decreasing; clamped `<= 35`.
- `src/__tests__/audioSounds.test.ts` (or extend an existing audio test): import `{ SOUNDS }` from `../audio/index.js` and assert `SOUNDS.chainTick` and `SOUNDS.chainReady` exist with non-empty `steps` arrays whose every step has positive `freq`, `dur`, `gain`. (Do **not** call `play()` in node — it constructs an `AudioContext`, which is unavailable; only inspect `SOUNDS`.)

### e2e / visual (informational here — NOT in CI, NOT gating)
- `npm run test:e2e` (Playwright, `tests/e2e`) — run if a drag-flow spec exists; audio/haptics are not assertable in Playwright by default (no audible assertion). Use it only to confirm no console errors / no regression in the drag flow.
- `npm run test:visual` — **not relevant** unless you also changed on-canvas visuals. **Do not regenerate goldens on this Windows host** (DOM drifts 3–5%, Phaser WebGL ~38% from GPU/fonts); re-baseline only on the canonical host. e2e + visual are not in CI today.

### Manual in-game check (this host)
- `preview_screenshot` **HANGS** here — do not depend on it. The `:5173` server serves **main**, not this worktree.
- Spin a worktree Vite on a spare port (worktree has no `node_modules`): `node ../../../node_modules/vite/bin/vite.js --port 5180 --base /puzzleDrag2/`.
- Drive/inspect via `window.__phaserScene` (the live scene) and `window.__hearthVisual.dispatch/state/freeze` (reducer). Audio needs a user gesture to unlock the AudioContext (`unlock()` on first `pointerdown`, `src/audio/useAudio.tsx:110-118`) — click the canvas once before expecting sound.
- To exercise the funnel without a real pointer drag: from the console, grab `window.__phaserScene`, call `scene.startPath(tile)` then `scene.addToPath(tile2)` for adjacent same-key tiles and listen for the rising ticks + the `chainReady` confirm at length 3. Toggle Sound and Haptics in Settings and repeat to confirm gating.
- Haptics on desktop: `navigator.vibrate` is usually a no-op (returns false) — verify the **gate** by spying: `const orig = navigator.vibrate; navigator.vibrate = (...a)=>{console.log('VIBE',a); return true;};` then drag with `hapticsOn` on vs off.

## Double-check / adversarial review

- **"Did the tick actually fire?"** Prove it without ears: temporarily wrap `play` (in `index.ts`) or add a `console.count('chainTick')` at the call site in `addToPath`, drag a 5-chain, confirm 5 counts (one per add, including the `startPath` first add which routes through `addToPath`). Remove the instrumentation before commit.
- **"Did the confirm fire exactly once at the crossing?"** With the spy above, drag straight to length 5 with `minChain = 3`: expect `chainReady` logged once (at the 3rd add), `chainTick` 5×. Then **backtrack** from 5 → 2 → 4: a skeptic will note `chainReady` replays on the re-cross. If that is unwanted, add a per-drag latch: `this._readyFiredThisDrag` set to `false` in `startPath`/`clearPath`, set `true` when `chainReady` fires, and require `!this._readyFiredThisDrag` in the crossing branch. Document whichever you choose in the PR.
- **Prove the dormant `chainStart` was not accidentally activated** — grep confirms `chainStart` is unused today; this change must not start playing it unless you deliberately chose the optional `startPath` freebie. State which.
- **sfx-off proof:** set `enabled.sfx` false (toggle Sound off → `useAudio`'s `setEnabled` effect runs) and confirm `play('chainTick')` returns at the `if (!enabled.sfx) return;` guard (`src/audio/index.ts:153`). A scene-side call cannot bypass this because it goes through the same `play()`.
- **haptics-off proof:** with the `navigator.vibrate` spy installed, toggle Haptics off and confirm zero `VIBE` logs during a drag (the `getRegistry(this.registry, "hapticsOn")` read is kept current by `prototype.tsx:283-285`).
- **Boss min-chain edge:** with an active boss raising `minChain` to e.g. 5, confirm `chainReady` fires at length 5, not 3 (`crossesThreshold(prevLen, len, this._effectiveMinChain())` uses the live value).
- **Performance:** `play()` creates one or two short oscillators per add — cheap. The OPTIONAL Step 4 grid scan is the only per-add cost worth profiling; if `addToPath` shows jank on a big board, drop Step 4.
- **Rollback safety:** the entire change is additive presentation — reverting the `addToPath` edits + removing the two `SOUNDS` entries + the helper file fully restores prior behaviour. No data, no schema, no actions touched, so a revert cannot corrupt saves or no-op a slice.
- **Regression guard:** confirm `endPath`/`collectPath` still emit `CHAIN_COLLECTED` and the post-release `chainCollect` sound still plays exactly once (the new ticks are during the drag, the payoff is unchanged).

## Risks & gotchas

- **Wrong setting names (top landmine).** There is **no `volume`** and **no `reduceMotion`** in this project. The only gates are `sfxOn` (→ `enabled.sfx`, auto via `play()`) and `hapticsOn` (registry, read with `getRegistry(this.registry, "hapticsOn")`). Do not invent settings; do not gate on `reduceMotion`.
- **`sfxOn` is not in the Phaser registry.** Scene-side code must rely on `play()` self-gating, not a registry read. Adding `sfxOn` to `GameRegistryContract` is unnecessary and out of scope.
- **Length timing.** Read `prevLen` *before* `this.path.push(tile)` and `len` *after*, or the crossing detection is off by one. The visual ring-burst at `redrawPath` uses the post-push length too, so firing audio between push and `redrawPath` keeps sound and visual in sync.
- **AudioContext gesture unlock.** Sound is silent until the first `pointerdown` unlocks the context (`src/audio/useAudio.tsx:110`). In manual/console testing, click the canvas once first.
- **Canvas has zero unit coverage.** Do not write a Vitest test that imports `GameScene` (it needs `window`/Phaser). Keep all new tests on the pure helpers + `SOUNDS` shape. Calling `play()` in node throws on `new AudioContext()`.
- **Visual goldens / CI.** This change is audio+haptics; goldens should not be needed. Do **not** regen goldens on this Windows host. e2e + visual are not gating in CI.
- **CLAUDE.md doc drift.** It references `.js`/`.jsx`; the files are `.ts`/`.tsx`. Use the real paths in this brief.
- **Backtrack re-cross** can replay `chainReady` (see Double-check) — decide latch vs no-latch and note it in the PR.
- **`graphify update .`** after code changes (mandated by CLAUDE.md).

## References

- `src/GameScene.ts` — `startPath` (1424), `tryAddToPath` (1451), **`addToPath` (1470 — the funnel)**, `redrawPath` (1479), `endPath` (1683), `collectPath` (1787), `_effectiveMinChain` (553), `_emitChainUpdate` (1993), existing haptic at 1446.
- `src/audio/index.ts` — `SOUNDS` (49), dormant `chainStart` (51), `play`/self-gating (152-153), `setEnabled` (38), `PlayOptions.pitch` (140).
- `src/audio/useAudio.tsx` — post-release `chainCollect` pitch ladder + haptic (42-49), `setEnabled` sync (28-33), AudioContext unlock (110-118).
- `src/game/producedResource.ts` — `buildChainUpdatePayload` (59), `ChainUpdatePayload` shape with `count`/`valid`/`minChain` (42).
- `src/game/crossCollect.ts` — `findCrossCollectTargets` (91, pure), `cellKey` dual `.key`/`.res.key` resolution (64), `CROSS_COLLECT_PAIRINGS` (21).
- `src/features/settings/slice.ts` — `DEFAULT_SETTINGS` (42, no volume/reduceMotion), `SETTINGS/TOGGLE` (58), separate `persistSettings` localStorage key (19).
- `src/features/settings/index.tsx` — toggle rows incl. `hapticsOn` (143).
- `src/types/phaserRegistry.ts` — `GameRegistryContract.hapticsOn` (59), `getRegistry` (110) / `setRegistry` (121); note `sfxOn` is absent.
- `prototype.tsx` — registry sync for `hapticsOn` (283-285), scene event wiring `CHAIN_COLLECTED` (217) / `CHAIN_UPDATE` (222).
- `src/constants.ts` — `SCENE_EVENTS` (19-24), `SAVE_SCHEMA_VERSION` (not bumped by this change).
- `src/__tests__/chainEmitUpdate.test.ts` — existing pattern for testing the pure chain-update builder (template for the new pure-helper tests).
- Skill `.claude/skills/check-slice-action` — run **only** if a future iteration adds a dispatched action (this brief adds none).
- CLAUDE.md (repo root) — house rules; note the `.js`→`.ts` doc drift.
