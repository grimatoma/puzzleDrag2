# Ambient Soundscape (looping bed per zone × season)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Today the game is **silent between actions**: audio is 100% short one-shot SFX (chain ticks, collect chimes, level-up fanfares) — there is **no ambient bed and no music** playing under the game. That makes the world feel inert. This brief adds a **low, continuously-looping ambient layer** whose timbre changes with **zone × season**: spring birdsong, summer cicadas, autumn wind, winter hush. The bed sits quietly under the existing SFX, **gated behind the `musicOn` setting** (which is OFF by default), and **crossfades** when the zone or season changes.

To stay on-brand with the existing **synthesized** audio (no binary assets in the repo) and to avoid licensing friction on a public repo, the recommendation is a **synthesized ambient graph** — filtered noise + slow LFO modulation — not sample files. Samples are a documented alternative with a hard CC0/CC-BY constraint.

## Background & current state (VERIFIED)

All references read in this worktree. **CLAUDE.md says `.js`/`.jsx`; the real files are `.ts`/`.tsx`** — trust the code.

### Audio engine — `src/audio/index.ts` (SHIPPED) — synth one-shots only, NO ambient layer
- The whole module is **Web-Audio synthesized**: each sound is an array of `SoundStep` oscillator notes (`SoundStep` at `:16-24`, `SOUNDS` record at `:49-121`). **There are no sample assets** — confirmed, the seed brief's "no sample assets" is correct.
- `play(name, opts)` (`:160`) is **fire-and-forget**: it builds short `OscillatorNode`s that `start()` then `stop()` after `dur` ms (`playStep`, `:126-146`). There is **no sustained / looping node and no concept of a long-lived voice** today — confirmed "NO looping/ambient layer."
- `enabled` is module-level `{ sfx: boolean; music: boolean }` (`EnabledState`, `:11-14`), initialised `{ sfx: true, music: false }` (`:31`). **`music` is OFF by default** — confirmed. `setEnabled(next)` (`:38`) merges partials.
- **`enabled.music` is currently READ NOWHERE** — grep confirms it is only written (via `setEnabled`) and never gates anything, because no music/ambient exists yet. This is the toggle the ambient layer must honour. `play()` self-gates only on `enabled.sfx` (`:161`), so the ambient layer needs its **own** `enabled.music` gate.
- `getCtx()` (`:33`) lazily constructs the single shared `AudioContext`; `unlock()` (`:42-45`) resumes it if suspended. The ambient graph must use this **same** context and route to `c.destination`.
- **There is no master gain / no volume control** (the seed brief for doc 02 corrected this for SFX; same applies here). Ambient gain must be baked low at the graph's own `GainNode`.

### Audio hook — `src/audio/useAudio.tsx` (SHIPPED) — where ambient start/stop belongs
- `useAudio(state)` (`:26`) is the React↔state bridge. It syncs the toggles every time settings change: `setEnabled({ sfx: state?.settings?.sfxOn !== false, music: state?.settings?.musicOn === true })` (`:28-33`). So `enabled.music` already tracks `musicOn` — the ambient layer just needs to start/stop on that.
- It diffs `prev`/`next` state in a per-render effect (`:38-108`) to fire one-shots, and unlocks the AudioContext on first `pointerdown` (`:111-118`). **This is the right place to start/stop and crossfade the ambient bed**: read `musicOn`, `biomeKey`/`activeZone`, and the session season, and react to changes.
- The hook reads a narrow `AudioGameState` (`:7-20`) — it already pulls `biomeKey`, `built`, `settings.musicOn`, etc. You will widen it to also read `activeZone` and the fields needed to compute season (`turnsUsed` + the turn budget).

### Zone + season signals
- **Zone:** `state.biomeKey: string` (`src/types/state.ts:211`) and `state.activeZone: string` (`:283`). `biomeKey` is already in `AudioGameState` (`useAudio.tsx:7`); `activeZone` is not yet but is available on state. Pick whichever keys the per-zone timbre table (recommend `biomeKey` for board context — e.g. `'fish'` is already special-cased in `useAudio` at `:100`).
- **Season:** `seasonIndexInSession(turnsUsed, turnBudget)` (`src/features/zones/data.ts:109`) returns `0..3` = Spring/Summer/Autumn/Winter (names at `data.ts:101-102`). `seasonNameInSession` (`:118`) wraps it. The hook must compute the index from live state (`turnsUsed` + the run's turn budget — confirm the budget field name in `GameState` when wiring; `seasonIndexInSession` needs it). Season changes mid-run as `turnsUsed` advances, so the ambient bed should crossfade on index change.

### Settings — `src/features/settings/slice.ts` (SHIPPED)
- `DEFAULT_SETTINGS` (`:42-47`) = `{ sfxOn: true, musicOn: true, hapticsOn: true, tutorialDisabled: false }`. **Note:** the *settings default* here is `musicOn: true`, but the *audio engine* default is `music: false` (`index.ts:31`) — `useAudio` reconciles them (`:30-32`), so on a real boot the engine follows the persisted/`DEFAULT_SETTINGS` value. The ambient bed must be **behind `musicOn`** either way.
- Settings persist to their **own** localStorage key (`STORAGE_KEYS.settings`, `persistSettings` at `:19`) — **separate from the main save**, so this brief touches **no `SAVE_SCHEMA_VERSION`**. No new setting is required (reuse `musicOn`), so the toggle UI (`src/features/settings/index.tsx`) is unchanged.
- `SETTINGS/TOGGLE` (`:58`) is the only settings mutation; flipping `musicOn` flows to `setEnabled` via the `useAudio` effect.

### Licensing constraint (if samples are ever used)
The repo is **public**; only **CC0 / CC-BY** assets are committable (multiple memory notes confirm this is a hard rule). Synthesized audio sidesteps it entirely — **recommend synthesized-first**.

## Scope

**In scope:**
- A new ambient module under `src/audio/` (e.g. `src/audio/ambient.ts`) exposing `startAmbient()`, `stopAmbient()`, and `setAmbientScene({ zone, season })` (or a single `updateAmbient(opts)`), built on the **shared** `AudioContext` from `index.ts`.
- A synthesized ambient graph: a long-lived noise source (or a couple of detuned slow oscillators) → bandpass/lowpass filter → low `GainNode` → destination, with a slow LFO modulating filter/gain so it breathes rather than drones flat.
- A **per-zone × season timbre table** mapping `(zone, seasonIndex)` → graph params (filter centre/Q, LFO rate, noise colour, gain) so spring = bright/chirpy, summer = busy/warm, autumn = airy/windy, winter = sparse/quiet.
- **Start/stop + crossfade** wiring in `useAudio.tsx`: start when `musicOn` turns on, stop when it turns off, crossfade `setAmbientScene` when `biomeKey`/`activeZone` or the season index changes.
- **`enabled.music` gate** inside the ambient module (mirroring how `play()` self-gates on `enabled.sfx`), plus respecting the AudioContext `unlock()` gesture.
- Unit tests for the **pure** parts: the timbre lookup table and the zone/season → params resolution. (The Web-Audio graph itself is not unit-testable in node — no `AudioContext`.)

**Out of scope / non-goals:**
- **No sample assets / no new npm audio library** (synthesized-first; samples are a documented alternative only, behind the CC0/CC-BY constraint — do NOT commit non-free audio).
- **No new setting** — reuse the existing `musicOn`. No volume slider (the project has none).
- **No `SAVE_SCHEMA_VERSION` bump** — settings persist to their own key; no persisted game-shape change.
- No change to the existing one-shot SFX or the `play()` API.
- No melodic/score "music" — this is an *ambient bed*, not a soundtrack. (A composed loop could come later; keep this brief to the texture layer.)
- No new dispatched actions or slice changes (the hook reads state and drives a module-level audio graph; nothing is dispatched). The `SLICE_PRIMARY_ACTIONS` footgun therefore does not apply.

## Implementation plan

### Step 1 — Ambient graph module (`src/audio/ambient.ts`)
Build on the shared context. Sketch:
```ts
// src/audio/ambient.ts  — synthesized ambient bed, gated by enabled.music.
import { getCtx } from "./index.js"; // export getCtx (or add a small accessor) from index.ts

interface AmbientParams {
  filterHz: number;   // bandpass/lowpass centre
  q: number;          // resonance
  lfoHz: number;      // breathing rate (very slow, e.g. 0.05–0.3)
  gain: number;       // baked low, e.g. 0.02–0.06
  // optionally: a sparse chirp/tick scheduler for birdsong/cicadas
}

let running = false;
let nodes: { /* noise/osc + filter + gain + lfo */ } | null = null;

export function startAmbient(): void { /* build the graph once, route to destination, ramp gain in */ }
export function stopAmbient(): void { /* ramp gain to 0 then disconnect; running = false */ }
export function setAmbientScene(p: AmbientParams): void {
  // crossfade: ramp current gain down while ramping a new/retuned graph up,
  // or smoothly setTargetAtTime the existing filter/gain to the new params.
}
```
- Use a `BufferSource` of white noise (looped) or 2–3 detuned low oscillators as the bed; a `BiquadFilterNode` (lowpass for hush/wind, bandpass for chirp colour); a `GainNode` baked low; an `OscillatorNode` LFO on the filter frequency or gain for the "breathing" motion. Birdsong/cicadas can be a **sparse randomized scheduler** of short high blips (reuse the `playStep` idea) rather than continuous tone.
- **Self-gate on `enabled.music`** (read it from `index.ts` — export it or a small `isMusicEnabled()` accessor): `startAmbient()` and `setAmbientScene()` no-op when music is off, mirroring `play()`'s `enabled.sfx` guard.
- Crossfade via `GainNode.gain.setTargetAtTime(...)` / `linearRampToValueAtTime(...)` over ~1–2 s so zone/season changes are smooth, not abrupt.

### Step 2 — Timbre table (pure, testable) (`src/audio/ambientScenes.ts`)
```ts
import type { SessionSeasonName } from "../features/zones/data.js";
export function resolveAmbient(zone: string, seasonIndex: number): AmbientParams { ... }
```
- A table keyed by zone (or biome family) × season index (0..3). Seasons set the broad character (spring bright/chirpy, summer warm/busy, autumn airy, winter sparse/quiet); zone shifts colour (fish biome = watery low-pass, woods = leafy mid, etc.). Provide a **default** row so an unmapped zone still produces a sensible bed (no silence/softlock).
- Keep this module pure (no Web-Audio imports) so it unit-tests cleanly.

### Step 3 — Wire start/stop + crossfade in `useAudio.tsx`
- Widen `AudioGameState` (`useAudio.tsx:7-20`) to include `activeZone` and the turn-budget field needed for `seasonIndexInSession`.
- Add an effect that watches `musicOn`: when it becomes true (and after unlock), call `startAmbient()` + `setAmbientScene(resolveAmbient(zone, season))`; when false, `stopAmbient()`.
- In the existing per-render diff effect (or a dedicated one), when `biomeKey`/`activeZone` or the computed `seasonIndex` changes, call `setAmbientScene(resolveAmbient(...))` to crossfade. (Avoid re-tuning every render — only on actual change, like the other diffs in this file.)
- AudioContext unlock: the bed cannot start before the first gesture (autoplay policy). If `musicOn` is true before unlock, defer `startAmbient()` to the existing `unlock()` handler (`:111-118`).

### Step 4 — Export `getCtx`/`isMusicEnabled` from `index.ts`
- `index.ts` keeps `ctx` and `enabled` module-private. Add minimal exports (`getCtx` and an `isMusicEnabled()` reader, or pass the context in) so `ambient.ts` shares the one context and honours the toggle without duplicating state.

### Step 5 — `graphify update .`
After code changes, run `graphify update .` (AST-only, no API cost) per CLAUDE.md.

## Success criteria

- [ ] With **Music ON**, a quiet looping ambient bed plays continuously under the game (audible between actions, not just on events).
- [ ] The bed's character **changes with season** within a run (spring vs winter clearly differ) and **with zone/biome** (e.g. fish biome reads watery), **crossfading** smoothly rather than cutting.
- [ ] With **Music OFF** (default), **no ambient sound** plays; toggling Music off mid-play **stops** the bed (ramped, not clicky).
- [ ] The ambient bed uses the **same** `AudioContext` as the one-shot SFX and starts only **after the unlock gesture**.
- [ ] **No sample/binary audio assets** committed; the bed is synthesized.
- [ ] **No `SAVE_SCHEMA_VERSION` bump, no new setting, no new dispatched action.**
- [ ] One-shot SFX behaviour is unchanged.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

### Gating (must pass before PR)
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — clean.

### New unit tests (pure, run under `npm test`)
- `src/__tests__/ambientScenes.test.ts`: `resolveAmbient` returns distinct params per season index for a given zone (spring ≠ winter); returns the default row for an unknown zone; never returns `gain <= 0` for an "on" state; covers all four season indices.
- Do **not** instantiate the Web-Audio graph in node (`AudioContext` is unavailable). Keep tests on the pure table; if you want a guard on the graph module's exports, assert the functions exist and no-op when `enabled.music` is false (you can stub the context, but prefer keeping the testable surface in `ambientScenes.ts`).

### Manual in-game check (this host)
- `preview_screenshot` **HANGS** here — do not rely on it; `:5173` serves **main**, not this worktree. Spin a worktree Vite: `node ../../../node_modules/vite/bin/vite.js --port 5182 --base /puzzleDrag2/`.
- Click the canvas once (unlock), then toggle **Music** on in Settings and listen — confirm a quiet continuous bed. Toggle off → it stops smoothly.
- Drive season/zone via `window.__hearthVisual.dispatch/state/freeze`: advance `turnsUsed` across the season boundaries (`seasonIndexInSession`, `src/features/zones/data.ts:109`) and switch biome; confirm the bed crossfades. Inspect the live scene via `window.__phaserScene` if needed.
- Verify it does not double up: rapidly toggle Music / switch zones and confirm only one bed plays (no stacked graphs, no growing volume).

## Double-check / adversarial review

- **"Does it actually respect `musicOn`?"** `enabled.music` is read nowhere today (grep) — the ambient module must add its own gate. Prove it: with Music off, `startAmbient()`/`setAmbientScene()` no-op; toggle off mid-play stops the bed. Mirror `play()`'s `if (!enabled.sfx) return` pattern (`index.ts:161`).
- **Autoplay policy:** browsers suspend the AudioContext until a gesture. If `musicOn` is true on load, the bed must wait for `unlock()` (`useAudio.tsx:111-118`) — confirm no console warning about starting a suspended context and that it begins right after the first click.
- **No stacked graphs / leaks:** switching zone/season must **retune or crossfade one** graph, not spawn a new one each time. Verify `startAmbient` is idempotent (guarded by `running`) and `stopAmbient` disconnects nodes (so the AudioContext isn't accumulating dangling oscillators).
- **Clicks/pops:** all gain changes must be ramped (`setTargetAtTime`/`linearRampToValueAtTime`), never a hard `gain.value =` while audible.
- **Default season/zone:** `resolveAmbient` must return a sensible default for an unmapped zone — no silent gap, no throw.
- **Shared context:** confirm `ambient.ts` uses `index.ts`'s `getCtx()` and not a second `AudioContext` (a second context wastes resources and can desync unlock state).
- **No schema/slice impact:** confirm no `SAVE_SCHEMA_VERSION` change and no dispatched action — this is a presentation-only audio layer reading state. (If a later iteration adds an ambient-volume *setting*, that DOES touch the settings slice + UI — out of scope here.)
- **Rollback safety:** the layer is additive — reverting the new modules + the `useAudio` wiring fully restores prior silence. No data, no schema, no actions touched.
- **CPU:** a noise buffer + a couple of filters + one LFO is cheap and constant-cost; a sparse chirp scheduler should use modest timers, not per-frame work. Profile only if the bed is busy.

## Risks & gotchas

- **`enabled.music` is dead today** — you are the first reader; the gate is your responsibility (don't assume the engine enforces it like it does for `sfx`).
- **AudioContext gesture** — the bed is silent until the first `pointerdown` unlocks the context; defer start accordingly.
- **No volume control / no new setting** — reuse `musicOn`; bake ambient gain low at the graph.
- **Licensing** — synthesized-first. If you ever add samples, only CC0/CC-BY are committable to this public repo; flag it explicitly.
- **Don't stack graphs** — idempotent start, real stop/disconnect, ramped crossfade.
- **`graphify update .`** after code changes (CLAUDE.md).
- **CLAUDE.md doc drift** — files are `.ts`/`.tsx`.

## References

- `src/audio/index.ts` — synth one-shots only: `SoundStep`/`SOUNDS` (16-24, 49-121), `playStep` fire-and-forget (126-146), `play` self-gate on `enabled.sfx` (160-161), `EnabledState` + default `{ sfx:true, music:false }` (11-14, 31), `setEnabled` (38), `getCtx` (33), `unlock` (42-45). `enabled.music` is written but never read.
- `src/audio/useAudio.tsx` — toggle sync `setEnabled({ music: musicOn })` (28-33), per-render diff effect (38-108), `AudioGameState` (7-20, reads `biomeKey`), unlock-on-gesture (111-118).
- `src/features/zones/data.ts` — `seasonIndexInSession` (109), `seasonNameInSession` (118), `SESSION_SEASON_NAMES` (101-102), `SessionSeasonName` type (103).
- `src/types/state.ts` — `biomeKey` (211), `activeZone` (283).
- `src/features/settings/slice.ts` — `DEFAULT_SETTINGS` incl. `musicOn` (42-47), separate-key `persistSettings` (19), `SETTINGS/TOGGLE` (58).
- `src/constants.ts` — `SAVE_SCHEMA_VERSION = 47` (215) — **not** bumped by this change.
- CLAUDE.md (repo root) — house rules; `.js`→`.ts` doc drift; public-repo CC0/CC-BY asset rule.
