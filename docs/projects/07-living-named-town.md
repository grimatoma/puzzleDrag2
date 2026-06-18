# Living Named Town (spatial NPCs)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

We have ~240 hand-written seasonal NPC lines (5 named characters × 4 seasons × 4 bond bands × ~3 lines) plus a handful of reactive story lines, but the five named NPCs — **Wren, Mira, Old Tomas, Bram, Sister Liss** — never physically appear in the town. The only people on the canvas are anonymous reskins of one walking-character atlas, and they only walk on the *procedural* town plan (the authored home/quarry maps have no waypoints, so even those don't appear there). The named NPCs' lines only ever surface as a transient 2-second toast bubble when you fill an order or give a gift — there is no way to *seek out* a character or learn who they are.

This project gives each named NPC a **fixed home building**, places them as a **tappable, portrait-backed sprite** standing at that building in the Phaser `TownScene`, and routes a tap to a lightweight **NPC-detail / talk surface** that shows the character's current bond level, bond band, and a fresh line pulled from `pickDialog`. It connects already-written content to a place players can visit, turning the town from set dressing into something inhabited — and it ships on the existing character atlas + portrait placeholders, so it does not block on new art.

## Background & current state (VERIFIED)

All paths below were opened and verified in this worktree. **Note the repo-wide doc drift: CLAUDE.md says `.js/.jsx` and `router.js`; the real files are `.ts/.tsx` and `src/router.ts`. Trust the code.**

### NPC data, dialog, bond (all SHIPPED)
- `src/features/npcs/data.ts`
  - `NPC_IDS = ["wren","mira","tomas","bram","liss"]` (frozen, line 33).
  - `NPC_DATA[id]` has `{ id, displayName, loves[], likes[], favoriteGift }` — **there is NO building / home / portrait field today.** Display names: `wren`→"Wren", `mira`→"Mira", `tomas`→"Old Tomas", `bram`→"Bram", `liss`→"Sister Liss".
  - `BOND_BANDS` (lines 1–6): `Sour 1–4 (×0.70)`, `Warm 5–6 (×1.00)`, `Liked 7–8 (×1.15)`, `Beloved 9–10 (×1.25)`.
- `src/features/npcs/dialog.ts`
  - `DIALOG_POOLS[npcId]` has `spring/summer/autumn/winter` season objects, each keyed by band name (`Sour/Warm/Liked/Beloved`) → `string[]`; plus an optional top-level `reactive: ReactiveLine[]`.
  - `pickDialog(npcId, season, bond, rng?, state=null)` (line 524): if `state` is passed it may (35% roll) return a *reactive* line whose `req(state)` is truthy; otherwise it routes by season+band. **Season keys are lowercase** (`spring`,`summer`,…). Passing `season=null` flattens all seasons for that band and returns a season-agnostic line (verified by the 6.3 fallback test). Missing cell → `"<Name>: '...'"` and a `console.warn` — **a fall-through warn will trip the e2e "zero console errors" gate, so never call `pickDialog` with a bad npcId/season.**
  - **🐛 Tomas nesting bug (CONFIRMED, fix this first):** `tomas`'s `reactive` block is nested *inside* the `winter` season object (dialog.ts lines ~222–230) instead of at the top level of `tomas`. Because `pickDialog` reads `DIALOG_POOLS[npcId].reactive` (line 527), Tomas's reactive line `tomas_first_order` is **never reachable**. The `winter` object still has its four band arrays, so the `npc-6.3` 80-cell coverage test passes and hides the bug. Doc 01 was supposed to fix this; **if it is still nested when you start, fix it here** (move the `reactive: [...]` array out of `winter` to be a direct child of `tomas`, mirroring `mira.reactive` / `wren.reactive`).
- `src/features/npcs/bond.ts` — `bondBand(bond)`, `bondModifier(bond)`, `bondModifier` bands, `applyGift(state,npcId,itemKey)` (gift→bond, season-gated cooldown), `giftTier`. `GIFT_DELTAS = { loves:0.5, likes:0.3, neutral:0.15 }`.

### Where dialog is surfaced today (SHIPPED, transient only)
- `src/state.ts`:
  - Order-fill path (~line 558): `pickDialog(o.npc, null, newBond, Math.random, state)` → sets `state.bubble`.
  - `GIVE_GIFT` (~line 1458–1473): `pickDialog(npcId, null, …)` → sets `state.bubble`.
  - `state.bubble` is rendered by the Toast system (`src/ui/primitives/Toast.tsx`) and is **VOLATILE / not persisted** (`src/state/persistence.ts:6` lists `bubble` in `VOLATILE`).
- **There is no NPC slice.** `GIVE_GIFT` and order-fill are handled directly in `coreReducer`. NPC state lives in `state.npcs` (`src/types/state.ts:142` `NpcsState = { roster, bonds, giftCooldown }`), initialised in `src/state/init.ts:128` (`bonds: { wren:5, mira:5, tomas:5, bram:5, liss:5 }`).

### TownScene (canvas) — how people are drawn (SHIPPED)
- `src/ui/town/TownScene.ts`
  - `create()` (line 114) calls, in order: bake textures → `createCharacterAnims()` → ground → object layer → `rebuildBuildingsAndPlots()` (line 491, draws building sprites at lot positions) → `spawnVillagers()` (line 556).
  - `spawnVillagers()` (line 556): spawns 4–7 anonymous `"character"`-atlas sprites at random **waypoints** and walks them along `plan.edges`. **It returns early when `plan.waypoints.length === 0` (line 560).**
  - Building sprites (`rebuildBuildingsAndPlots`, line 504): for each built lot it draws `building_<id>` and, outside placement mode, makes it interactive: `sprite.on("pointerup", … this.events.emit("town.clickbuilding", buildingId))` (lines 520–523). **This is the exact pattern to copy for NPC taps.**
  - Character atlas loaded in `preload()` (line 111): `this.load.atlas("character", …)`; idle frame `"misa-front"` used at line 569; walk anims created in `createCharacterAnims()` (line 197) keyed `misa-front/back/left/right-walk`.
  - The scene receives `town.update_built` events (line 163) to rebuild buildings/plots when React state changes.

### TownScene ↔ React bridge (SHIPPED)
- `src/ui/TownPhaserCanvas.tsx`: boots Phaser lazily, binds scene events at `postBoot` through **refs** (lines 73–95, 186–197) so the latest React callbacks are used. Existing wired events: `town.placebuilding`, `town.clickbuilding`, `town.clickboard`. **A new `town.clicknpc` event must be added in three places: emit in TownScene, `scene.events.on(...)` binding in TownPhaserCanvas `postBoot`, and a new `onClickNpc` prop.**
- `src/ui/Town.tsx` `TownView` (line 207): owns the `<TownPhaserCanvas>` and the React overlays. `onClickBuilding` (line 336) dispatches `SET_VIEW` to crafting for crafting stations. **This is where the NPC-detail surface (a React overlay) is opened.**

### Authored town maps — why named NPCs need lot/building coords, not waypoints (SHIPPED)
- `src/ui/town/townMaps.ts`: `toPlan()` (line 230) sets `waypoints: []` and `edges: []` for every authored map. So on the home/quarry ladders **`spawnVillagers` no-ops** and there is literally nobody on screen. Named NPCs must therefore be placed at **building/lot positions**, derived from `plan.lots` + the React `buildingsMap` (lotIndex→buildingId), not from waypoints.
- The home buildings the brief names all exist in `src/constants.ts` `BUILDINGS[]`: `hearth` (783), `bakery` (786), `forge` (819), `apiary` (906), `chapel` (911). Recommended associations (loves/role fit): **Mira→bakery, Bram→forge, Tomas→apiary, Liss→chapel, Wren→hearth** (Wren has no themed building; the hearth is the town anchor and is `lv:1 cost:0`, so it's the safe default home for the scout). These are the building ids; the NPC stands at that building's lot when it's built.

### Navigation / view system (SHIPPED)
- `src/router.ts`: `KNOWN_VIEWS` (line 34) and `KNOWN_MODALS` (line 42). `SET_VIEW`/`OPEN_MODAL` handled in `src/state.ts` (lines 691, 796). Modals deep-linkable via `?modal=`; some are excluded. **An NPC-detail surface does not need to be a routed modal** — keeping it as local React state in `TownView` (like the existing `purchaseBuilding`/`buildPickerOpen` overlays) is simpler and avoids a router change. Use a routed modal only if deep-linking to a specific NPC is desired (out of scope below).

### Season for dialog (VERIFIED nuance)
- Calendar season was removed; `state.season` is a market counter, not a display season. In-session season is derived by `seasonNameInSession(turnsUsed, turnBudget)` → `"Spring"|…|"Winter"` (`src/features/zones/data.ts:118`). **`pickDialog` season keys are lowercase**, so any caller passing a season must `.toLowerCase()` it. In the town view there is no active farm run, so `turnsUsed` is the last-run value; passing `null` (season-agnostic) is the safe, already-proven choice and matches today's order/gift behaviour. **Recommendation: pass `null` for the town talk surface** (season-agnostic), and treat per-season town dialog as a follow-up.

## Scope

**In scope:**
- Fix the Tomas reactive-line nesting bug in `dialog.ts` (if not already fixed by doc 01).
- Add an NPC→home-building association (a small static map; e.g. `NPC_HOME_BUILDING` in `src/features/npcs/data.ts`).
- Place each named NPC as a fixed (non-walking), depth-sorted sprite standing beside their home building in `TownScene`, only when that building is built. Reuse the `"character"` atlas idle frame; per-NPC tint/frame variation is acceptable as a placeholder.
- Make each NPC sprite tappable; emit a new `town.clicknpc` scene event carrying the npcId.
- Wire `town.clicknpc` through `TownPhaserCanvas` (`onClickNpc` prop) into `TownView`.
- Add a lightweight NPC-detail / talk React overlay in `TownView` (reuse `DetailPane` from `src/ui/primitives/BrowserDetail.tsx`): portrait placeholder, display name, bond value + band name, the current line from `pickDialog(npcId, null, bond, …, state)`, and a "Talk" button that re-rolls the line. Optionally a gift affordance (dispatch existing `GIVE_GIFT`).
- New vitest unit tests for the data/association layer + the Tomas fix; a Playwright e2e that taps an NPC and asserts the talk surface; live in-game manual verify via `window.__phaserScene`.

**Out of scope / non-goals (keep tight):**
- New PixelLab portraits or per-NPC character sprites — ship on placeholders/tints. (Art is a later pass.)
- Walking/pathing for named NPCs (they stand still; the anonymous walker system is untouched on the procedural plan).
- Per-season town dialog selection (pass `null`; season-agnostic). Reactive-line gating beyond what `pickDialog` already does.
- A routed/deep-linkable NPC modal (`?modal=npc`) — local React state is enough.
- Any change to persisted state shape, so **no `SAVE_SCHEMA_VERSION` bump** (see Risks).
- Re-baselining visual goldens on this host (not possible here; see house rules).
- Adding the named NPCs to non-home zones, or to the procedural fallback plan.

## Implementation plan

Touch order matters: fix the bug, add data, wire the canvas, wire the bridge, add the surface, then tests.

### 1. Fix the Tomas reactive nesting bug — `src/features/npcs/dialog.ts`
Move the `reactive: [...]` array (currently inside `tomas.winter`, ~lines 222–230) up to be a direct child of `tomas`, alongside `spring/summer/autumn/winter`, mirroring `mira` and `wren`. After the edit, `DIALOG_POOLS.tomas.reactive` must be an array and `DIALOG_POOLS.tomas.winter` must NOT contain a `reactive` key.

```ts
tomas: {
  spring: { /* … */ },
  summer: { /* … */ },
  autumn: { /* … */ },
  winter: { Sour:[…], Warm:[…], Liked:[…], Beloved:[…] },   // reactive removed from here
  reactive: [
    { id: "tomas_first_order",
      text: "Old Tomas: 'The Vale is talking. …'",
      req: (s) => s.story?.flags?.first_order },
  ],
},
```

### 2. Add NPC→home-building association — `src/features/npcs/data.ts`
Add a frozen map (NOT mutated by Dev Panel overrides; keep separate from `NPC_DATA`). Building ids verified in `constants.ts`.

```ts
// Where each named NPC physically stands in the home town. Keyed by NPC id →
// BUILDINGS[].id. The NPC only appears once that building is built.
export const NPC_HOME_BUILDING: Readonly<Record<string, string>> = Object.freeze({
  mira:  "bakery",
  bram:  "forge",
  tomas: "apiary",
  liss:  "chapel",
  wren:  "hearth",
});
```
Optionally add a `portrait` placeholder key per NPC for later art (string, unused by render for now).

### 3. Place fixed NPC sprites — `src/ui/town/TownScene.ts`
- Add a `npcSprites: Map<string, Phaser.GameObjects.Sprite> = new Map()` field.
- Add `drawNpcs()` and call it at the end of `rebuildBuildingsAndPlots()` (so NPCs re-render whenever buildings change via `town.update_built`). Destroy/clear `npcSprites` at the top of `rebuildBuildingsAndPlots()` like `buildingSprites`.
- For each `npcId` in `NPC_HOME_BUILDING`, find the **lot whose `buildingsMap[lot.index] === buildingId`**. If found and not in placement mode, place an idle `"character"` sprite offset beside the building (e.g. `l.cx - l.w*0.4`, baseY), depth-sorted by `y`, optionally `setTint(...)` per NPC for visual distinction. Make it interactive:

```ts
sprite.setInteractive({ useHandCursor: true });
sprite.on("pointerup", () => { if (!this.isDragging) this.events.emit("town.clicknpc", npcId); });
```

- Import `NPC_HOME_BUILDING` into TownScene. **TownScene is pure Phaser/TS with no React import** — importing from `features/npcs/data.ts` is fine (it's plain data; verify no transitive React import). If a transitive import is a problem, pass the association in via `init()` data instead.
- Silence NPC input during placement mode (mirror the `boardZones`/building input guard: `if (isPlacing) skip`), so a tap meant for placement can't open a talk surface.

### 4. Bridge the new event — `src/ui/TownPhaserCanvas.tsx`
- Add `onClickNpc: (npcId: string) => void` to `TownPhaserCanvasProps`.
- Add `const onClickNpcRef = useRef(onClickNpc);` and keep it fresh in the same effect that refreshes `onClickBuildingRef` (lines 76–80).
- In `postBoot` (near line 194) add: `scene.events.on("town.clicknpc", (npcId: string) => onClickNpcRef.current(npcId));`

### 5. NPC-detail / talk surface — `src/ui/Town.tsx`
- Add local state in `TownView`: `const [talkNpc, setTalkNpc] = useState<string | null>(null);`
- Pass `onClickNpc={(npcId) => setTalkNpc(npcId)}` to `<TownPhaserCanvas>`.
- Render an overlay (mirror the `purchaseBuilding` overlay block, lines 462–499) using `DetailPane`:
  - Title = `NPC_DATA[talkNpc].displayName`.
  - Bond = `state.npcs.bonds[talkNpc] ?? 5`; band = `bondBand(bond).name`.
  - Line = computed once per open / per "Talk" press: `pickDialog(talkNpc, null, bond, Math.random, state)`. Store the rolled line in local state so re-render doesn't reshuffle it; a "Talk" button re-rolls.
  - Optional "Give gift" affordance → `dispatch({ type: "GIVE_GIFT", payload: { npcId: talkNpc, itemKey } })` (existing action; updates bond + sets a bubble). Keep this minimal/out-of-scope-friendly.
  - Portrait: a placeholder (tinted circle or the building illustration) keyed by npcId; do NOT block on real art.

### 6. Slice-registration footgun — DECISION: no new reducer action needed
The talk surface reads state and calls `pickDialog` in React; it dispatches only the **existing** `GIVE_GIFT` (already handled in `coreReducer`, returns a fresh state ref → slices run). **If you instead choose to route the rolled line through the reducer** (e.g. a new `NPC/TALK` action that sets `state.bubble`), then per the footgun you MUST register it: handle it in `coreReducer` (returning new state makes `afterCore !== state`, so it works without listing), OR — if you make it slice-owned — add its type to `SLICE_PRIMARY_ACTIONS` in `src/state.ts` (line 1590) or it silently no-ops. **Run the `check-slice-action` skill on any new action type.** Recommendation: keep dialog rolling in React (no new action) to avoid the footgun entirely.

### 7. Persistence — DECISION: no SAVE_SCHEMA bump
`talkNpc` is transient React state (not in GameState). `state.bubble` is already VOLATILE. NPC bonds already persist via `state.npcs.bonds`. **Do not bump `SAVE_SCHEMA_VERSION`** — a bump wipes every save (no migration ladder; see doc 08). If you (unnecessarily) add a persisted field, you inherit the migration dependency.

### 8. Tests + verify (see Validation).

After code changes: `graphify update .`

## Success criteria

- [ ] `DIALOG_POOLS.tomas.reactive` is an array at the top level; `DIALOG_POOLS.tomas.winter` has no `reactive` key; `pickDialog("tomas", "summer", 5, rng, stateWithFirstOrderFlag)` can return the `tomas_first_order` reactive line.
- [ ] `NPC_HOME_BUILDING` maps all five `NPC_IDS` to valid `BUILDINGS[].id` values (`bakery/forge/apiary/chapel/hearth`).
- [ ] In the running game (home town), when a given home building is built, its NPC sprite appears standing beside it; when the building is NOT built, the NPC is absent.
- [ ] Tapping an NPC sprite opens the NPC-detail/talk surface showing display name, current bond value, bond-band name, and one in-character line.
- [ ] The "Talk" button re-rolls to a different (or same-pool) valid line without throwing or logging a `[dialog] missing …` warn.
- [ ] No NPC sprite is tappable while in building-placement mode (a placement tap never opens a talk surface).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass; no new console warnings from `pickDialog`.
- [ ] `SAVE_SCHEMA_VERSION` is unchanged; an existing save still loads.

## Validation — how to verify

### Gating (must pass before PR)
- `npm run lint` — clean.
- `npm run typecheck` — clean (TownScene import of `NPC_HOME_BUILDING`, new prop types, overlay types).
- `npm test` — all vitest green, including:
  - **Existing** `src/__tests__/npc-6.3.test.ts` (80-cell coverage) still passes (the Tomas move must not drop any band array).
  - **New** `src/__tests__/npc-living-town.test.ts` (node env, no canvas):
    - `NPC_HOME_BUILDING` covers every `NPC_IDS` entry and each value is in `new Set(BUILDINGS.map(b=>b.id))`.
    - Tomas reactive fix: `Array.isArray(DIALOG_POOLS.tomas.reactive)` is true; `DIALOG_POOLS.tomas.winter.reactive === undefined`; with a state where `story.flags.first_order` is set, a seeded `pickDialog("tomas", null, 5, rng, state)` can yield `tomas_first_order.text` (loop the rng / assert the reactive line is in the candidate set).
    - `pickDialog` never warns for any `(NPC_ID, null, band)` combination (spy on `console.warn`).
- `npm run build` — production build succeeds.

### Canvas e2e (informational — e2e is NOT in CI today, but run it)
- `npm run test:e2e` with a **new** spec `tests/e2e/living-town.spec.ts`:
  - Boot the game into the home town with at least the `bakery` (Mira) built (seed via the dev/grant path the other specs use, e.g. `dialog-draft.spec.ts` as a reference).
  - Drive the scene through `window.__phaserScene` to find Mira's sprite and emit `town.clicknpc`, OR click at her sprite's screen coords; assert the talk overlay appears with text containing "Mira".
  - Assert **zero console errors** (this gate already exists in the e2e harness and will catch a `pickDialog` warn or a Phaser texture issue).

### Manual in-game verify on THIS Windows host (preview_screenshot HANGS — do not use it)
- Spin a worktree Vite on a spare port with the correct base (worktree has no node_modules):
  `node ../../../node_modules/vite/bin/vite.js --port 5191 --base /puzzleDrag2/`
- In the browser console, drive state and inspect the scene:
  - `window.__hearthVisual.dispatch({ type: "DEV/ADD_GOLD", amount: 100000 })` then build the bakery via the Build UI (or grant via dev) so Mira's building exists.
  - `window.__phaserScene` is the TownScene — confirm `window.__phaserScene.npcSprites.size > 0` and that `npcSprites.get("mira")` exists once the bakery is built.
  - Emit a tap programmatically: `window.__phaserScene.events.emit("town.clicknpc", "mira")` and assert the React overlay appears (query the DOM + `getComputedStyle`, e.g. an element with the NPC name; assert via `document.querySelector` not a screenshot).
- Confirm the negative: before the bakery is built, `npcSprites.get("mira")` is undefined.

## Double-check / adversarial review

**Prove the previously-dead path now fires:**
- Tomas reactive: before the fix, no rng seed makes `pickDialog("tomas", …, state)` return `tomas_first_order` — add a test that this line is now reachable. That is the proof the bug was real and is fixed.
- Spatial NPCs: before this change, on the authored home map `spawnVillagers` no-ops (waypoints empty) and `npcSprites` doesn't exist. Assert `npcSprites.size` goes from 0 → ≥1 as buildings are built. This proves the placement is driven by `buildingsMap`, not the dead waypoint system.

**"Did I really wire it" checks:**
- The event must be bound *through the ref* in `TownPhaserCanvas` (not a stale closure) — verify by mounting town, building a building *after* boot, then tapping the new NPC; if the handler fires, the ref wiring is correct.
- NPCs must re-render on `town.update_built` (build/tier-up). Build a second NPC's building at runtime and confirm their sprite appears without a scene restart.

**Edge cases a skeptic will attack:**
- Placement mode: tap an NPC while placing a building → must NOT open the talk surface (input guard).
- Building destroyed/never built: NPC absent, no crash, no orphan sprite (clear `npcSprites` in `rebuildBuildingsAndPlots`).
- Non-home zones (quarry): `NPC_HOME_BUILDING` buildings may not exist there → NPCs simply don't appear; no crash. (Named NPCs are a home-town feature for now.)
- Two NPCs mapped to buildings on overlapping lots → depth-sort by `y` so they don't z-fight with the building sprite.
- `pickDialog` with an unexpected season string (capitalized) would warn → we pass `null`, sidestepping it; assert no warn in tests.
- Scene restart on tier-up (`TownPhaserCanvas` restarts the scene): NPCs must reappear after restart (they're drawn in `create`→`rebuildBuildingsAndPlots`). Verify after a `TIER_UP`.

**Rollback safety:** No persisted-shape change and no new reducer action (if you follow the recommendation), so reverting the TownScene/TownPhaserCanvas/Town.tsx/data.ts/dialog.ts edits fully restores prior behaviour. Existing saves are unaffected (no `SAVE_SCHEMA_VERSION` bump). The anonymous-walker system is untouched.

## Risks & gotchas

- **Tomas bug masks itself:** the `npc-6.3` coverage test still passes with `reactive` nested in `winter` because the four band arrays remain. Don't trust "tests green" as proof the bug is fixed — add the explicit reactive-reachability test.
- **Authored maps have no waypoints** (`townMaps.ts` `toPlan` → `waypoints: []`). Do NOT try to place named NPCs on waypoints — drive placement from `plan.lots` × `buildingsMap`.
- **Canvas has zero unit coverage** — `TownScene` is only exercised by e2e/visual (no jsdom canvas). Keep all *logic* (associations, dialog selection) in pure modules (`data.ts`, `dialog.ts`) that vitest can test; the canvas layer gets only the e2e tap test + live `window.__phaserScene` verify.
- **`pickDialog` season case:** pools use lowercase keys; `seasonNameInSession` returns capitalized. Pass `null` (recommended) or `.toLowerCase()`. A wrong-case season silently falls through to the season-agnostic branch but a bad npcId/season warns → trips the e2e console-error gate.
- **Slice footgun:** if you add a new reducer action, register it (`SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` in `src/state.ts`) or handle it in `coreReducer`; run the `check-slice-action` skill. The recommended design avoids this by rolling dialog in React.
- **No SAVE_SCHEMA bump.** Bumping `SAVE_SCHEMA_VERSION` (`src/constants.ts`) wipes every save (no migration; depends on doc 08's migration ladder). This project must not need one.
- **Bridge ref capture:** scene event handlers are bound once at `postBoot` and capture closures — always call through the `*Ref.current` pattern (see `onClickBuildingRef`), or a tap will fire a stale (or `undefined`) callback.
- **NPC_DATA is mutated by Dev Panel overrides** (`applyNpcOverrides`, data.ts:28) — keep `NPC_HOME_BUILDING` a *separate frozen* const so overrides can't corrupt the home mapping.
- **Visual goldens are NOT regenerable on this host** (DOM 3–5%, Phaser WebGL ~38% drift). Adding standing NPCs WILL change town goldens; do not regen here — re-baseline on a canonical host and justify the diff in the PR. Visual/e2e are not in CI today.
- **`character` atlas frame name:** idle frame is `"misa-front"` (TownScene line 569); reuse it for the standing pose. Per-NPC `setTint` is a cheap placeholder distinction until real sprites land.

## References

- `src/features/npcs/data.ts` — NPC ids, display names, gift prefs (no building field yet); add `NPC_HOME_BUILDING` here.
- `src/features/npcs/dialog.ts` — `DIALOG_POOLS`, `pickDialog`; the Tomas reactive nesting bug (fix first).
- `src/features/npcs/bond.ts` — `bondBand`, `applyGift`, `GIFT_DELTAS`.
- `src/ui/town/TownScene.ts` — `rebuildBuildingsAndPlots` (line 491, copy its tap pattern), `spawnVillagers` (line 556, the dead-on-authored-maps walker), `preload`/`createCharacterAnims` (atlas + idle frame).
- `src/ui/TownPhaserCanvas.tsx` — scene-event bridge via refs; add `onClickNpc` + `town.clicknpc` binding.
- `src/ui/Town.tsx` `TownView` — owns the canvas + overlays; add `talkNpc` state and the talk surface (model on the `purchaseBuilding` overlay).
- `src/ui/primitives/BrowserDetail.tsx` — `DetailPane`/`DetailActionButton` for the talk surface.
- `src/ui/town/townMaps.ts` — `toPlan` (waypoints/edges empty for authored maps); lot positions.
- `src/constants.ts` — `BUILDINGS[]` (`hearth` 783, `bakery` 786, `forge` 819, `apiary` 906, `chapel` 911); `SAVE_SCHEMA_VERSION` (do not bump).
- `src/state.ts` — order-fill/`GIVE_GIFT` dialog→bubble; `SLICE_PRIMARY_ACTIONS` (line 1590), `ALWAYS_RUN_SLICES` (line 1639); `SET_VIEW`/`OPEN_MODAL`.
- `src/state/persistence.ts` — `VOLATILE` set (`bubble` is volatile); version gate.
- `src/types/state.ts` — `NpcsState` (line 142); `Bubble` type.
- `src/features/zones/data.ts` — `seasonNameInSession` (line 118), `SESSION_SEASON_NAMES` (lowercase mismatch caveat).
- `src/router.ts` — `KNOWN_VIEWS`/`KNOWN_MODALS` (only if you make the surface a routed modal — out of scope).
- `src/__tests__/npc-6.3.test.ts` — 80-cell coverage (must stay green); model the new unit test alongside it.
- `tests/e2e/dialog-draft.spec.ts` — reference for an NPC/dialog e2e + dev-grant seeding.
- Skills: `check-slice-action` (any new action), `phaser-scene-debug` (React↔registry↔scene boundary), `growing-settlement-layout` (town map authoring context), `pre-pr-check`.
- Memory: "Live game preview verify" (`window.__phaserScene` / `window.__hearthVisual`; preview_screenshot hangs; worktree Vite on a spare port), "Visual goldens host limits".
- Companion docs: 01 (Tomas fix may already be applied there — re-check before fixing), 08 (save-migration ladder — only relevant if a persisted field is ever added).
