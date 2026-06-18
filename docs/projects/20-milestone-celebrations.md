# Milestone Celebrations (firsts + progression flourishes)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

Progression in this game is tracked everywhere (chain length, buildings, settlement tiers, founded zones) but **no moment is marked**. Building your first structure, landing your first chain-of-10, reaching your first City tier, founding your first new zone — all pass silently. This brief adds a thin **milestone-celebration layer**: at a small set of *meaningful firsts*, fire a celebratory **toast banner** (the existing `useNotifier().toast` surface), an accessibility **announcement** (`announce()`), a distinct **sound**, and an optional lightweight **confetti overlay**. Each milestone fires **once, ever**, recorded in a persisted "seen" set.

This is cheap dopamine layered on top of systems that already emit the signals — it adds **no new game mechanic**. The detector is a single React hook that diffs `prev`/`next` state, **exactly mirroring `src/audio/useAudio.tsx`** which already fires one-shot sounds off state diffs. The only persistence implication is the seen-set (handled via a save-migration rung, since the ladder is live — no save wipe).

## Background & current state (VERIFIED)

All references read in this worktree. **CLAUDE.md says `.js`/`.jsx`; the real files are `.ts`/`.tsx`** — trust the code.

### Toast / notification infra — `src/ui/primitives/Toast.tsx` (SHIPPED)
- `useNotifier()` (`src/ui/primitives/Toast.tsx:237`) returns a `NotifierApi` (`:33`) whose `toast(payload)` is the celebration surface. Outside a provider it returns a no-op stub (`:240-247`), so a `toast()` call is always safe.
- `toast` payload is `Omit<ToastEntry, "id" | "stagger">` (`:159`): `{ text: ReactNode; tone?: ToastTone; icon?: string; duration?: number; ariaLive?: "assertive" | "polite" }` (`ToastEntry` at `:16-24`).
- **Tones** (`ToastTone`, `:14`): `info | success | warning | danger | moss | ember | gold | iron`. Each maps to a colour class in `TONE_TOAST` (`:51-60`). `gold` and `success`/`moss` read as celebratory.
- **Auto-dismiss + max-concurrent:** default lifetime `TOAST_MS = 3000` ms (`:45`), exit anim `TOAST_EXIT_MS = 200` (`:46`); `duration` overrides per-toast (`ToastItem`, `:68`). At most `TOAST_MAX = 3` toasts are shown; older ones are sliced off the front (`:49`, `:169-172`). Toasts auto-stagger their entry animation (`TOAST_STAGGER_MS`, `:132-134`).
- Toasts render in an `aria-live="polite"` region pinned bottom-centre (`:193-205`); there is also an `aria-live="assertive"` sr-only node (`:223`).
- `bubble()` (NPC speech, top-centre) and `beat()` (story) also exist on the API — **not** used here.

### A11y bridge — `src/a11y.ts` (SHIPPED)
- `announce(text, opts?)` (`src/a11y.ts:20`) routes a string to the registered notifier's `toast()` (so an announcement IS a toast, with `ariaLive` set). `opts`: `{ assertive?, tone?, icon?, duration? }` (`AnnounceOptions`, `:6-12`). Default tone `info`, default `ariaLive` polite (`:23,:29`).
- It is a **module-level singleton**: `useA11yBridge()` (`:33`) registers the live notifier into `_notifier` on mount; `announce()` no-ops until then and if no notifier is registered (`:21-22`). Both `useAudio(state)` and `useA11yBridge()` are already wired in `prototype.tsx:395` / `prototype.tsx:398`.
- **Design note:** since `announce()` *is* a toast with an aria-live tag, the simplest path is **one `announce()` call per milestone** (it shows the banner AND announces it). A separate `toast()` is only needed if you want a banner that is NOT announced. Recommend `announce()` for the text/aria, plus the sound + optional confetti fired alongside.

### Audio — the diff-detection model to mirror: `src/audio/useAudio.tsx` (SHIPPED)
- `useAudio(state)` (`src/audio/useAudio.tsx:26`) keeps a `prev` ref (`:36`) and, in an effect that runs every render (`:38`), compares `p` (prev) vs `s` (next) and fires one-shots: e.g. building-built is detected as `Object.keys(s.built).length > Object.keys(p.built).length` (`:61-67`), chain-collected as `s.turnsUsed > p.turnsUsed` (`:44`) with `len = s.lastChainLength` (`:45`), level-up as `s.level > p.level` (`:52`). It then sets `prev.current = s` (`:107`). **This is the exact pattern the milestone detector copies.** Haptics in this file gate on `state.settings.hapticsOn` (`:48` etc.).
- `src/audio/index.ts` is Web-Audio synthesized one-shots. `play(name, { pitch })` (`:160`) self-gates on `enabled.sfx` (`:161`). `SOUNDS` (`:49`) already has `levelUp` (a major-chord arpeggio, `:83-90`) and `upgrade` (a sparkle, `:71-73`) — either is a reasonable celebration cue, or add a new dedicated `milestone` sound (a brighter fanfare). `setEnabled` is synced from settings inside `useAudio` (`:28-33`), so any `play()` from a sibling hook respects the Sound toggle automatically.

### Progression signals already in state (VERIFIED present)
Detected from `GameState` (`src/types/state.ts`):
- **Chain length:** `lastChainLength?: number` (`src/types/state.ts:318`); set in the reducer on collect — `lastChainLength: effectiveChain` (`src/state.ts:479`). First chain-of-N = `s.lastChainLength >= N && (p.lastChainLength ?? 0) < N`. (Note: `lastChainLength` is the *last* chain, not a max — track the milestone via the seen-set, not by reading a running max.)
- **Buildings:** `built: Record<string, Record<string, unknown>>` (`src/types/state.ts:240`). First building = `Object.keys(s.built).length >= 1 && Object.keys(p.built).length === 0` (same shape `useAudio` already diffs at `:61-63`).
- **Settlement tiers:** `settlements: Record<string, { founded: boolean; tier?: number; ... }>` (`src/types/state.ts:242`). Tier-ups come from the `TIER_UP` reducer case (`src/state.ts:757`); founding from `FOUND_SETTLEMENT` (`src/state.ts:720`). "First City tier" = first time any settlement's `tier` reaches the City rung — diff `settlements[*].tier` prev vs next. (City is the home ladder's top rung; see the cartography tiers — confirm the numeric rung against `src/features/zones` `ZoneTier` data when wiring, rather than hard-coding.)
- **Zones founded:** `FOUND_SETTLEMENT` flips `settlements[zoneId].founded = true` (`src/state.ts:720-755`). "First zone founded beyond the start" = first `founded` settlement appearing in `s.settlements` that was not in `p.settlements`.
- **Heirloom / meta tokens** (camelCase — a known gotcha, see doc 01/12): `heirloomSeed` (`src/types/state.ts:167`), `pactIron` (`:168`), `tidesingerPearl` (`:169`). "First heirloom token earned" = any of these crossing 0→positive. Optional milestone.

### Modals — `src/router.ts` (SHIPPED) — for a *bigger* celebration on the largest milestone
- `KNOWN_MODALS` (`src/router.ts:42-48`) = `menu | boss | tutorial | debug | festivals`. A modal is opened by dispatching `OPEN_MODAL` → reducer sets `state.modal` (`src/state.ts:804-805`); closed via `CLOSE_MODAL` (`:806-807`). The router only deep-links modals listed in `KNOWN_MODALS`; gameplay-gated modals (`season`, `leaveBoard`, `runSummary`) are intentionally **excluded** from deep links (`src/router.ts:41`) but still work as in-app modals.
- **Correction to a likely assumption:** you do NOT have to add a celebration modal to `KNOWN_MODALS` for it to *function* — `state.modal` can hold any key the UI knows how to render. You only add it to `KNOWN_MODALS` if you want it **deep-linkable / shareable via URL**, which a one-shot celebration should NOT be (you can't re-trigger a once-ever milestone). **Recommendation: keep the celebration as a toast + confetti overlay; reserve a dedicated modal only for the single grandest milestone (e.g. first City), and if added, model it like `runSummary` (gameplay-gated, excluded from deep links) rather than putting it in `KNOWN_MODALS`.**

### No existing confetti / celebration component
Grep for `confetti`/`celebrat` finds only `src/textures/categories/festive.ts` + `src/textures/animations/festive.ts` (board tile textures — unrelated). The confetti overlay is **new** (a small self-contained React/CSS or canvas component; no library needs adding — keep it dependency-free and `reduceMotion`-safe, see Out-of-scope re: there is no `reduceMotion` setting, so gate confetti on `hapticsOn`/`sfxOn`? — no; just keep it brief and skip if `sfxOn === false` is NOT appropriate either; make it always-on but very short, or behind a new lightweight toggle — see Risks).

### Persistence — seen-set needs a migration rung (ladder is LIVE)
- `SAVE_SCHEMA_VERSION = 47` (`src/constants.ts:215`). The **save-migration ladder is live** (doc 08, shipped): `src/state/saveMigrations.ts` upgrades a save `version → version+1` via `MIGRATIONS[oldVersion]` instead of wiping (`:31-47`). Both version gates (`persistence.ts:24`, `init.ts:185`) defer to it. A persisted-shape add therefore needs a **MIGRATIONS rung**, not a wipe — see the documented recipe in `saveMigrations.ts:14-18`.

## Scope

**In scope:**
- A new detector hook `src/celebrations/useMilestones.ts(x)` modelled on `useAudio` — diffs `prev`/`next` `GameState`, computes which milestone(s) just became true, fires `announce()` + a celebration `play()` + (optional) confetti, and records each fired milestone in a persisted seen-set so it never repeats.
- A persisted **seen-milestones set** on game state (e.g. `state.milestonesSeen: Record<string, true>` or a string[]), seeded `{}` for new saves and via a new `MIGRATIONS[47]` rung for old saves; `SAVE_SCHEMA_VERSION` bumped 47 → 48.
- A milestone catalogue (id → { test(prev,next), text, tone, icon, sound, confetti?, grand? }) covering at minimum: first building, first chain-of-10, first City tier, first zone founded.
- An optional lightweight **confetti overlay** component (dependency-free) shown briefly on celebration.
- Optional: a dedicated celebration modal for the single grandest milestone (first City), modelled on `runSummary` (NOT added to `KNOWN_MODALS`).
- Unit tests for the **pure** milestone-detection predicates and the seen-set/migration logic.

**Out of scope / non-goals:**
- No new game mechanic, economy change, or reward — celebrations are pure presentation + a persisted boolean set.
- **No volume control and no `reduceMotion` setting** — neither exists in this project (`DEFAULT_SETTINGS` is `{ sfxOn, musicOn, hapticsOn, tutorialDisabled }`, `src/features/settings/slice.ts:42`). Do not invent one. Sound auto-respects `sfxOn` via `play()` self-gating. If confetti needs a kill-switch, that is a deliberate new setting — flag it, don't assume it.
- No retroactive firing: a save that already has 12 buildings should NOT fire "first building" on load — the migration seeds the seen-set so already-passed milestones are marked seen (see Step 4 / Risks).
- Not adding the celebration to `KNOWN_MODALS` (it must not be deep-linkable).

## Implementation plan

### Step 1 — Persisted seen-set + schema bump
- Add `milestonesSeen` to `GameState` (`src/types/state.ts`) — recommend `Record<string, true>` for O(1) membership.
- Seed it `{}` in the initial-state builder (`src/state/init.ts` around `:65` where `version` is set).
- Bump `SAVE_SCHEMA_VERSION` 47 → 48 (`src/constants.ts:215`).
- Add `MIGRATIONS[47]` (`src/state/saveMigrations.ts`) that sets `version: 48` and **seeds `milestonesSeen` so already-passed milestones are marked seen** for existing players (e.g. if the save has ≥1 building, mark `first_building`; if any settlement tier is City, mark `first_city`; etc.). This prevents a wall of celebrations on first load after the update. Add a fixture + migrator test per the recipe (`saveMigrations.ts:18`).

### Step 2 — Pure milestone catalogue (`src/celebrations/milestones.ts`)
Keep the predicates pure and Phaser/React-free for unit testing:
```ts
// src/celebrations/milestones.ts
import type { GameState } from "../types/state.js";

export interface MilestoneDef {
  id: string;
  /** True only on the transition where the milestone is first achieved. */
  test: (prev: Partial<GameState>, next: Partial<GameState>) => boolean;
  text: string;
  tone: "gold" | "success" | "moss" | "ember";
  icon?: string;
  sound: string;      // a key in audio SOUNDS
  grand?: boolean;    // largest milestones may open the dedicated modal
}

const buildingCount = (s: Partial<GameState>) => Object.keys(s.built ?? {}).length;
const maxTier = (s: Partial<GameState>) =>
  Math.max(0, ...Object.values(s.settlements ?? {}).map((x) => x?.tier ?? 0));
const foundedCount = (s: Partial<GameState>) =>
  Object.values(s.settlements ?? {}).filter((x) => x?.founded).length;

export const MILESTONES: MilestoneDef[] = [
  { id: "first_building", test: (p, n) => buildingCount(p) === 0 && buildingCount(n) >= 1,
    text: "First building raised!", tone: "moss", sound: "upgrade" },
  { id: "first_chain_10", test: (p, n) => (p.lastChainLength ?? 0) < 10 && (n.lastChainLength ?? 0) >= 10,
    text: "Chain of 10!", tone: "gold", sound: "levelUp" },
  { id: "first_city", test: (p, n) => maxTier(p) < CITY_RUNG && maxTier(n) >= CITY_RUNG,
    text: "Your town became a City!", tone: "gold", sound: "levelUp", grand: true },
  { id: "first_zone", test: (p, n) => foundedCount(p) < foundedCount(n) && foundedCount(n) >= 1,
    text: "New settlement founded!", tone: "success", sound: "levelUp" },
];
```
- Resolve `CITY_RUNG` from the actual zone-tier data in `src/features/zones` (do not hard-code a magic number) — read the `ZoneTier` ladder when wiring.
- `lastChainLength` is the *last* chain (`src/state.ts:479`), not a max; the seen-set guarantees once-only, so a single chain-of-10 marks it forever even though later chains may be shorter.

### Step 3 — Detector hook (`src/celebrations/useMilestones.tsx`) — mirror `useAudio`
```ts
export function useMilestones(state: Partial<GameState> | null | undefined, dispatch: Dispatch): void {
  const prev = useRef<Partial<GameState>>(state ?? {});
  useEffect(() => {
    const p = prev.current ?? {};
    const s = state ?? {};
    const seen = s.milestonesSeen ?? {};
    for (const m of MILESTONES) {
      if (seen[m.id]) continue;
      if (!m.test(p, s)) continue;
      announce(m.text, { tone: m.tone, icon: m.icon, assertive: true });
      play(m.sound);
      // optional: show confetti overlay
      dispatch({ type: "MILESTONE/SEEN", id: m.id });  // persists into milestonesSeen
      if (m.grand) dispatch({ type: "OPEN_MODAL", modal: "celebration" }); // gameplay-gated, NOT in KNOWN_MODALS
    }
    prev.current = s;
  });
}
```
- Add a `MILESTONE/SEEN` action that sets `state.milestonesSeen[id] = true`. **Run the `check-slice-action` skill** — a new action only reaches its reducer if registered in `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` (the documented footgun); if handled in the root `src/state.ts` switch (like `OPEN_MODAL` at `:804`), it runs unconditionally — confirm which path applies.
- Wire `useMilestones(state, dispatch)` next to `useAudio(state)` in `prototype.tsx:395`.

### Step 4 — Confetti overlay (optional, dependency-free)
- A small fixed-position React component that renders ~30–50 CSS/SVG particles for ~1.2 s then unmounts. Trigger via local state in the hook's host or a tiny context. Keep it `pointer-events-none` and above the toast layer. No new npm dependency.

### Step 5 — `graphify update .`
After code changes, run `graphify update .` (AST-only, no API cost) per CLAUDE.md.

## Success criteria

- [ ] On a fresh save, building the **first** structure shows a celebratory toast ("First building raised!"), plays a sound, and (if enabled) shows confetti — **once**; building the 2nd does nothing.
- [ ] Landing a **chain-of-10 for the first time** celebrates once; later chains (even another 10) do not re-fire.
- [ ] Reaching the **first City tier** and **founding the first zone** each celebrate once.
- [ ] Each celebration is **announced** (aria-live) via `announce()`, so screen-reader users hear it.
- [ ] With **Sound off** (`sfxOn === false`) no celebration sound plays (auto via `play()` self-gate); the toast still shows.
- [ ] An **existing save** (≥1 building, City tier, founded zones) upgraded via `MIGRATIONS[47]` does **NOT** spew a backlog of celebrations on load — those milestones are pre-marked seen.
- [ ] Seen-set **persists**: reload after a milestone → it does not re-fire.
- [ ] `SAVE_SCHEMA_VERSION` bumped 47 → 48 with a contiguous `MIGRATIONS[47]` rung + fixture/test; an old v47 save loads (not wiped).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Validation — how to verify

### Gating (must pass before PR)
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — clean.
- `check-slice-action` skill for the new `MILESTONE/SEEN` action.

### New unit tests (pure, run under `npm test`)
- `src/__tests__/milestones.test.ts`: each `MILESTONES[*].test` returns `true` only on the achieving transition and `false` otherwise (e.g. `first_building` true for `{built:{}}→{built:{a:{}}}`, false for `{built:{a:{}}}→{built:{a:{},b:{}}}`; `first_chain_10` true for `lastChainLength 9→10`, false for `10→10` and `10→8`; `first_city` honours the resolved City rung; `first_zone` on `foundedCount` increase).
- `src/__tests__/save-migrations.test.ts` (extend existing): add a v47 fixture; assert `migrateSave` produces `version: 48` and seeds `milestonesSeen` so already-passed milestones are marked. Confirm a v47 save with no progress seeds an empty/partial set correctly.
- Do **not** call `play()` in node (it constructs an `AudioContext`); only assert `SOUNDS[m.sound]` exists for each milestone.

### Manual in-game check (this host)
- `preview_screenshot` **HANGS** here — do not rely on it; the `:5173` server serves **main**, not this worktree. Spin a worktree Vite on a spare port: `node ../../../node_modules/vite/bin/vite.js --port 5181 --base /puzzleDrag2/`.
- Drive the reducer via `window.__hearthVisual.dispatch/state/freeze`: dispatch a build, a 10-chain collect, a `TIER_UP` to City, a `FOUND_SETTLEMENT`, and confirm each toast/sound/confetti fires once. Re-dispatch and confirm no re-fire.
- AudioContext needs a user gesture (`unlock()` on first pointerdown, `src/audio/useAudio.tsx:110-118`) — click the canvas once before expecting sound.

## Double-check / adversarial review

- **"Will it spam on first load after the update?"** This is the top landmine. The detector must not fire for milestones already achieved before the seen-set existed. Solve it in `MIGRATIONS[47]`: inspect the migrating save and pre-mark every already-true milestone. Prove it with a fixture test (a "rich" v47 save → zero celebrations on load).
- **Once-only proof:** drive the same milestone twice via the console; expect exactly one toast/sound. The guard is `if (seen[m.id]) continue;` plus the persisted `MILESTONE/SEEN` write — verify the write actually reaches `milestonesSeen` (run `check-slice-action`).
- **`lastChainLength` is last, not max:** confirm `first_chain_10` still fires for a single 10-chain even if every other chain is short, and never re-fires after a later 10-chain (seen-set covers this).
- **City rung not hard-coded:** verify `CITY_RUNG` is read from the zone-tier data, not a literal — the home ladder rung numbers have changed historically.
- **Schema discipline:** `SAVE_SCHEMA_VERSION` bumped exactly one rung; `MIGRATIONS[47]` sets `version: 48`; rungs stay contiguous (`saveMigrations.ts:28-29`). A skipped rung → `missing-migrator` → discard.
- **No deep-linkable modal:** if you add the grand-milestone modal, confirm it is NOT in `KNOWN_MODALS` (`src/router.ts:42`) — it must not be reachable via URL (you cannot re-trigger a once-ever event).
- **Settings:** there is no `reduceMotion`. If confetti motion is a concern, that requires a deliberate new toggle — call it out in the PR rather than silently gating on an unrelated setting.
- **Rollback safety:** the detector + catalogue + confetti are additive presentation; the only stateful change is `milestonesSeen` + its migration rung. Reverting requires keeping the schema at 48 with a no-op `MIGRATIONS[47]` (per the doc-08 lesson: never roll a shipped schema backward) — note this in the PR.

## Risks & gotchas

- **First-load backlog (biggest risk)** — see Double-check; the migration must pre-seed seen milestones.
- **Schema wipe if you bump without a rung** — the ladder is live; a bump with no `MIGRATIONS[47]` rung makes old saves `missing-migrator` → discarded. Always pair the bump with a rung + fixture.
- **Slice-action footgun** — `MILESTONE/SEEN` no-ops silently unless registered. Use `check-slice-action`.
- **No `reduceMotion` / no `volume`** — do not invent settings; sound auto-respects `sfxOn`.
- **Don't add the celebration to `KNOWN_MODALS`** — keep it gameplay-gated like `runSummary`.
- **`graphify update .`** after code changes (CLAUDE.md).
- **CLAUDE.md doc drift** — files are `.ts`/`.tsx`.

## References

- `src/ui/primitives/Toast.tsx` — `useNotifier` (237), `toast` payload (159), `ToastTone` (14), `TONE_TOAST` (51), `TOAST_MS`/`TOAST_MAX` (45,49), no-op stub outside provider (240).
- `src/a11y.ts` — `announce` (20), `AnnounceOptions` (6), `useA11yBridge` singleton register (33).
- `src/audio/useAudio.tsx` — the diff-detection model to mirror: `prev` ref (36), per-render diff effect (38), building-built diff (61-67), chain-collect diff (44-45), `setEnabled` from settings (28-33), AudioContext unlock (110-118).
- `src/audio/index.ts` — `play` self-gate on `enabled.sfx` (160-161), `SOUNDS` (49), `levelUp` (83), `upgrade` (71).
- `src/types/state.ts` — `lastChainLength` (318), `built` (240), `settlements` (242), `heirloomSeed`/`pactIron`/`tidesingerPearl` (167-169).
- `src/state.ts` — `lastChainLength` set on collect (479), `FOUND_SETTLEMENT` (720), `TIER_UP` (757), `OPEN_MODAL`/`CLOSE_MODAL` (804-807).
- `src/router.ts` — `KNOWN_MODALS` (42), gameplay-gated modals excluded from deep links (41).
- `src/state/saveMigrations.ts` — ladder + recipe (14-18, 31-47), apply loop (70).
- `src/state/persistence.ts` (24) + `src/state/init.ts` (65,185) — the two version gates that defer to the ladder.
- `src/constants.ts` — `SAVE_SCHEMA_VERSION = 47` (215, bump to 48).
- `src/features/settings/slice.ts` — `DEFAULT_SETTINGS` (42, no volume/reduceMotion).
- `prototype.tsx` — `useAudio(state)` (395) / `useA11yBridge()` (398) wiring site.
- Skill `.claude/skills/check-slice-action` — for the new `MILESTONE/SEEN` action.
- doc `08-save-migration-ladder.md` — the live ladder this brief depends on.
- CLAUDE.md (repo root) — house rules; `.js`→`.ts` doc drift.
