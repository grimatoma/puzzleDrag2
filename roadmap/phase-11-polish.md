# Phase 11 — Polish & Accessibility

[← back to ROADMAP](../ROADMAP.md) · [GAME_SPEC](../GAME_SPEC.md)

**Goal (player experience):** The game becomes playable for the players Phases
0–10 left out. A color-blind farmer can finally tell hay from log from berry
without squinting. A keyboard-only player can drag chains, fire tools, and
finish the Phase 2 first beat without ever touching a mouse. A screen-reader
user hears Wren narrate the arrival modal and hears every chain commit, floater,
and quest claim in plain English. A vestibular-disorder player can flip one
toggle and the screen stops shaking, the stars stop swaying, and tiles stop
cascading — and all four toggles persist across sessions.

**Why now:** Phases 0–10 built the game; Phase 11 makes sure more people can
actually play it. Accessibility added late is always a retrofit, but doing it
*before* Phase 12's infrastructure means the test runner inherits a11y-aware
fixtures and the save migrations carry the new settings keys from day one.
This phase is also the last polish pass before sandbox players take over —
one shot at making the welcome wide.

**Entry check:** [Phase 10 Sign-off Gate](./phase-10-farm-depth.md#phase-10-sign-off-gate) complete.

> Standard 6-section task structure. See [ROADMAP.md → How to use this document](../ROADMAP.md).

---

### 11.1 — Color-blind palette toggle

**What this delivers:** A Settings panel exposes a "Color palette" dropdown
with four options — Default, Deuteranopia-friendly, Protanopia-friendly,
Tritanopia-friendly. Each option re-keys every tile fill colour and season
tint to a palette designed for that condition (Default keeps the existing
hexes byte-for-byte so screenshots and the Phase 0–10 visual baseline still
match). Selection persists in `localStorage` under the existing
`hearth.settings` key. The Phaser scene re-tints all on-screen tiles within
1 frame of the dropdown change — no full reload, no flash.

**Completion Criteria:**
- [ ] `src/settings.js` module exists, exports `INITIAL_SETTINGS`,
  `loadSettings()`, `saveSettings(state)`, and pure reducer `settingsReduce`
- [ ] `state.settings.palette` is one of `"default" | "deuteranopia" | "protanopia" | "tritanopia"`
- [ ] `PALETTES` constant in `src/constants.js` has 4 keys; every palette
  defines a color for every Farm + Mine resource (hay, wheat, grain, flour,
  log, plank, beam, berry, jam, egg, stone, cobble, block, ore, ingot, coal,
  coke, gem, cutgem, gold) AND every season (Spring/Summer/Autumn/Winter)
- [ ] `SET_PALETTE { id }` updates `state.settings.palette` and writes to
  `localStorage` synchronously
- [ ] `getTileColor(state, resourceKey)` returns the palette-correct hex —
  Default returns the existing `BIOMES.<biome>.resources[].color`
- [ ] `getSeasonColor(state, seasonName)` returns palette-correct season `bg`/`fill`/`accent`
- [ ] Phaser scene re-tints all `TileObj` sprites within 1 frame of `SET_PALETTE`
- [ ] Default palette colors equal existing constants byte-for-byte
- [ ] Each non-default palette achieves ≥3:1 contrast ratio between any two
  adjacent-pool tiles (hay vs log, hay vs berry, log vs berry, ore vs coal)
- [ ] Settings panel renders a 4-row dropdown; current selection has a
  checkmark; selecting a row dispatches `SET_PALETTE` and closes the dropdown

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { INITIAL_SETTINGS, loadSettings, settingsReduce } from "./settings.js";
import { PALETTES, BIOMES } from "./constants.js";
import { getTileColor, getSeasonColor } from "./settings.js";

// Initial shape
assert(INITIAL_SETTINGS.palette === "default", "default palette on first run");

// Palette table — 4 keys, every resource + season present in every palette
const IDS  = ["default", "deuteranopia", "protanopia", "tritanopia"];
const KEYS = ["hay","wheat","grain","flour","log","plank","beam","berry","jam",
  "egg","stone","cobble","block","ore","ingot","coal","coke","gem","cutgem","gold"];
IDS.forEach(id => {
  assert(PALETTES[id], `palette ${id} exists`);
  KEYS.forEach(k => assert(typeof PALETTES[id].tiles[k] === "number",
                           `palette ${id} defines hex for ${k}`));
  ["Spring","Summer","Autumn","Winter"].forEach(s =>
    assert(typeof PALETTES[id].seasons[s]?.bg === "number",
           `palette ${id} defines ${s} bg`));
});

// Default palette equals existing constants — no visual drift
const farmHay = BIOMES.farm.resources.find(r => r.key === "hay").color;
assert(PALETTES.default.tiles.hay === farmHay, "default hay equals BIOMES.farm hay");
const minOre = BIOMES.mine.resources.find(r => r.key === "ore").color;
assert(PALETTES.default.tiles.ore === minOre, "default ore equals BIOMES.mine ore");

// SET_PALETTE updates state
let s = INITIAL_SETTINGS;
s = settingsReduce(s, { type: "SET_PALETTE", id: "deuteranopia" });
assert(s.palette === "deuteranopia", "palette switched");

// getTileColor reads from current palette
const fakeState = { settings: { palette: "deuteranopia" }, biome: "farm" };
assert(getTileColor(fakeState, "hay") === PALETTES.deuteranopia.tiles.hay,
       "getTileColor honours active palette");

// localStorage round-trip
saveSettings({ palette: "tritanopia", reducedMotion: false });
const loaded = loadSettings();
assert(loaded.palette === "tritanopia", "palette persisted");

// Contrast — sampled adjacency pairs in each non-default palette
import { contrastRatio } from "./utils.js";
["deuteranopia","protanopia","tritanopia"].forEach(p => {
  const t = PALETTES[p].tiles;
  assert(contrastRatio(t.hay,   t.log)   >= 3.0, `${p}: hay vs log ≥ 3:1`);
  assert(contrastRatio(t.hay,   t.berry) >= 3.0, `${p}: hay vs berry ≥ 3:1`);
  assert(contrastRatio(t.log,   t.berry) >= 3.0, `${p}: log vs berry ≥ 3:1`);
  assert(contrastRatio(t.ore,   t.coal)  >= 3.0, `${p}: ore vs coal ≥ 3:1`);
});
```
Run — confirm: `Cannot find module './settings.js'`.

*Gameplay simulation (deuteranopic player, first session, level 1):*
The player has trouble distinguishing the existing hay (yellow-green) from
log (brown-orange) — on the default palette the two read as the same muddy
warm tone. They open Settings (gear icon top-right), scroll to "Color
palette", tap "Deuteranopia-friendly". Within 1 frame the entire board
re-paints — hay shifts to a clear straw-yellow, log to a deep navy-brown,
berry to a saturated magenta. They restart the chain they were mid-drag
and finish it cleanly. The next session, the palette is still
deuteranopia-friendly without re-selecting.

Designer reflection: *Does the deuteranopia palette feel "friendly" in its
own right (warm, harvest-themed) rather than "the alternate version of the
real game"? Are the contrast ratios actually verifiable with a simulation
tool, or are we trusting the hex picks?*

**Implementation:**
- New file `src/settings.js`:
  ```js
  import { STORAGE_KEYS, PALETTES } from "./constants.js";

  export const INITIAL_SETTINGS = {
    palette: "default",
    reducedMotion: null, // null = follow OS; true/false = user override
    keyboardCursor: { row: 0, col: 0, active: false },
  };

  export function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      return raw ? { ...INITIAL_SETTINGS, ...JSON.parse(raw) } : { ...INITIAL_SETTINGS };
    } catch { return { ...INITIAL_SETTINGS }; }
  }
  export function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s)); } catch {}
  }
  export function settingsReduce(state, action) {
    switch (action.type) {
      case "SET_PALETTE":         return { ...state, palette: action.id };
      case "SET_REDUCED_MOTION":  return { ...state, reducedMotion: action.value };
      case "SET_CURSOR":          return { ...state, keyboardCursor: { ...action.cursor } };
      default: return state;
    }
  }
  export function getTileColor(state, key) {
    const id = state?.settings?.palette ?? "default";
    return PALETTES[id]?.tiles?.[key] ?? PALETTES.default.tiles[key];
  }
  export function getSeasonColor(state, seasonName) {
    const id = state?.settings?.palette ?? "default";
    return PALETTES[id]?.seasons?.[seasonName] ?? PALETTES.default.seasons[seasonName];
  }
  ```
- `src/constants.js` — append `PALETTES` table. The `default` block reads
  back from `BIOMES` + `SEASONS` to guarantee zero visual drift; the three
  a11y palettes are hand-tuned for ≥3:1 luminance contrast on adjacency
  pairs (hay/log, hay/berry, log/berry, ore/coal):
  ```js
  // Phase 11 — locked: default palette MUST equal the existing hex constants.
  const _defaultTiles = Object.fromEntries(
    [...BIOMES.farm.resources, ...BIOMES.mine.resources].map(r => [r.key, r.color]));
  const _defaultSeasons = Object.fromEntries(
    SEASONS.map(s => [s.name, { bg: s.bg, fill: s.fill, accent: s.accent }]));
  export const PALETTES = {
    default:      { tiles: _defaultTiles, seasons: _defaultSeasons },
    deuteranopia: { tiles: { hay: 0xf0d860, log: 0x183058, berry: 0xc02080, /* … */ },
                    seasons: { Spring: { bg: 0x60b0c0, /* … */ }, /* … */ } },
    protanopia:   { /* L-cone-deficient hue separation */ },
    tritanopia:   { /* S-cone-deficient hue separation */ },
  };
  ```
- `src/utils.js` — add `contrastRatio(hexA, hexB)` (WCAG luminance formula).
- `src/GameScene.js` — replace `tile.color` reads in `TileObj` and the
  background painter with `getTileColor(state, key)` / `getSeasonColor(...)`.
  On `SET_PALETTE`, walk the live `TileObj` pool and call `repaint(state)`
  on each — finishes within one frame; no textures regenerated, only tints.
- `prototype.jsx` (or new `src/ui.jsx`) — Settings gear in HUD opens a
  panel with the four-row Color palette dropdown reading from `PALETTES`.

**Manual Verify Walk-through:**
1. Fresh save. Open Settings. Confirm "Color palette" defaults to Default.
2. Switch to Deuteranopia-friendly. Board re-paints within 1 frame (no
   reload). Hay reads straw-yellow; log reads navy.
3. Switch to Tritanopia-friendly. Season banner bg changes to that palette's Spring.
4. Refresh the page. Tritanopia-friendly still selected.
5. Console: `gameState.settings.palette === "tritanopia"`; `localStorage.getItem("hearth.settings")`
   parses to JSON containing `"palette":"tritanopia"`.
6. Switch back to Default. Hay returns to `0xa8c769` exactly — no drift.
7. `runSelfTests()` passes all 11.1 assertions.

---

### 11.2 — Keyboard chain construction

**What this delivers:** Every Phase 1 chain mechanic and Phase 1 / 10.1 tool
becomes reachable without a mouse. Arrow keys move a yellow focus ring
around the 6×7 board (one cell per keystroke, clamped at edges, no wrap).
Space adds the focused tile to the in-progress chain — but only if it's
adjacent to the previous tile under Phase 1 rules. Enter commits the chain
through the same `commitChain` path the mouse drag uses, so story triggers,
quests, achievements, and worker effects all tick identically. Escape
cancels the chain and clears state. Tab moves focus into and out of the
board so screen-reader users can reach the side-panel controls.

**Completion Criteria:**
- [ ] `state.settings.keyboardCursor = { row, col, active }` lives in the
  settings slice; default `{ row: 0, col: 0, active: false }`
- [ ] First Tab into the canvas sets `active: true` and renders a 4-px
  yellow focus ring (`0xffd34c`) around `(0, 0)`
- [ ] Arrow keys (Up/Down/Left/Right) move the cursor by one cell, **clamped**
  at edges (no wrap). Documented in code: clamp chosen over wrap so a
  screen-reader user always hears predictable cell coordinates.
- [ ] Space adds the focused tile to `state.chain` if it's adjacent to the
  last chain tile *and* matches Phase 1 chain rules (same key or upgrade
  endpoint logic). Non-adjacent or rule-violating Space → reject with
  "Not adjacent" announcement; chain unchanged.
- [ ] Enter commits the chain by dispatching the same `COMMIT_CHAIN` action
  the mouse drag uses
- [ ] Escape clears `state.chain` and announces "Chain cancelled."
- [ ] Tab leaves the canvas; sets `active: false`; ring hidden
- [ ] Phase 1 board tools (Scythe / Seedpack / Lockbox) and Phase 10.1 tools
  (Rake / Axe / Fertilizer) are firable via a tool-tray keyboard shortcut
  (`1`–`6` arms the matching tool; Space on the focused tile fires it)
- [ ] Keyboard-built chains fire the same events as mouse-drag chains —
  story triggers, quest progress, achievement counters, worker effects
- [ ] Cursor state persists across saves but resets `active: false` on load
  (so opening a save doesn't immediately steal focus)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { createInitialState, reduce } from "./state.js";
import { handleKeyboard } from "./features/a11y/keyboard.js";

// Cursor starts at (0,0), inactive
let s = createInitialState();
assert(s.settings.keyboardCursor.row === 0 && s.settings.keyboardCursor.col === 0,
       "cursor starts at (0,0)");
assert(s.settings.keyboardCursor.active === false, "cursor inactive on fresh save");

// Tab activates
s = handleKeyboard(s, { key: "Tab" });
assert(s.settings.keyboardCursor.active === true, "Tab activates cursor");

// Arrow keys — clamp at edges
s = handleKeyboard(s, { key: "ArrowRight" });
assert(s.settings.keyboardCursor.col === 1, "right → col 1");
s = handleKeyboard(s, { key: "ArrowDown" });
assert(s.settings.keyboardCursor.row === 1, "down → row 1");

// Clamp at top-left
let edge = createInitialState();
edge.settings.keyboardCursor = { row: 0, col: 0, active: true };
edge = handleKeyboard(edge, { key: "ArrowLeft" });
assert(edge.settings.keyboardCursor.col === 0, "left at col 0 clamps (no wrap)");
edge = handleKeyboard(edge, { key: "ArrowUp" });
assert(edge.settings.keyboardCursor.row === 0, "up at row 0 clamps");

// Clamp at bottom-right (6 cols, 7 rows per constants)
let br = createInitialState();
br.settings.keyboardCursor = { row: 6, col: 5, active: true };
br = handleKeyboard(br, { key: "ArrowRight" });
assert(br.settings.keyboardCursor.col === 5, "right at col 5 clamps");
br = handleKeyboard(br, { key: "ArrowDown" });
assert(br.settings.keyboardCursor.row === 6, "down at row 6 clamps");

// Space adds adjacent tile to chain
let sp = createInitialState();
sp.settings.keyboardCursor = { row: 0, col: 0, active: true };
sp.grid[0][0] = { key: "hay" }; sp.grid[0][1] = { key: "hay" };
sp = handleKeyboard(sp, { key: " " }); // start chain at (0,0)
assert(sp.chain.length === 1 && sp.chain[0].row === 0, "Space starts chain");
sp.settings.keyboardCursor.col = 1;
sp = handleKeyboard(sp, { key: " " });
assert(sp.chain.length === 2, "Space adds adjacent tile");

// Space on non-adjacent tile is rejected
let na = createInitialState();
na.settings.keyboardCursor = { row: 0, col: 0, active: true };
na.grid[0][0] = { key: "hay" }; na.grid[3][3] = { key: "hay" };
na = handleKeyboard(na, { key: " " });
na.settings.keyboardCursor = { row: 3, col: 3, active: true };
const beforeNA = JSON.stringify(na.chain);
na = handleKeyboard(na, { key: " " });
assert(JSON.stringify(na.chain) === beforeNA, "non-adjacent Space rejected");

// Enter commits via the same path as mouse drag
let en = createInitialState();
en.chain = [{ row: 0, col: 0, key: "hay" },
            { row: 0, col: 1, key: "hay" },
            { row: 0, col: 2, key: "hay" }];
en.settings.keyboardCursor = { row: 0, col: 2, active: true };
const beforeInv = en.inventory.hay ?? 0;
en = handleKeyboard(en, { key: "Enter" });
assert((en.inventory.hay ?? 0) > beforeInv, "Enter commits → inventory increased");
assert(en.chain.length === 0, "chain cleared after commit");

// Escape clears chain
let esc = createInitialState();
esc.chain = [{ row: 0, col: 0, key: "hay" }];
esc = handleKeyboard(esc, { key: "Escape" });
assert(esc.chain.length === 0, "Escape clears chain");

// Keyboard chain fires the same events as mouse drag (story trigger ticks)
import { evaluateStoryTriggers } from "./story.js";
let st = createInitialState();
st.story = { act: 1, beat: "act1_light_hearth", flags: { intro_seen: true } };
st.inventory.hay = 19;
st.chain = Array.from({ length: 3 }, (_, i) => ({ row: 0, col: i, key: "hay" }));
st.settings.keyboardCursor = { row: 0, col: 2, active: true };
st = handleKeyboard(st, { key: "Enter" });
const r = evaluateStoryTriggers(st.story,
  { type: "resource_total", key: "hay", amount: st.inventory.hay });
assert(st.inventory.hay >= 20, "keyboard chain credited inventory");
assert(r && r.firedBeat.id === "act1_light_hearth",
       "keyboard chain fires the same story trigger as a mouse chain");
```
Run — confirm: `Cannot find module './features/a11y/keyboard.js'`.

*Gameplay simulation (motor-impaired keyboard-only player, first session):*
The player can't grip a mouse comfortably and plays everything from the
keyboard. They open the game; arrival modal appears; they tap Enter to
dismiss. Wren's "bring me 20 hay" beat is the goal. They Tab into the
canvas; a yellow ring lights up cell (0, 0). Two ArrowRights, one
ArrowDown — ring at (1, 2). Space, ArrowRight, Space, ArrowRight, Space —
three hay tiles chained. Enter commits. Floater "+3 hay" rises. They
repeat seven times. On the seventh chain, hay total crosses 20; the
First Light modal opens and Mira slides into the NPC strip — same
animation a mouse player would see.

Designer reflection: *Does the focus ring read as "I am here" or as
"loading indicator"? Is the keystroke rhythm (arrow-arrow-Space-Enter)
fluid enough that a player can build a 6-tile chain in under 5 seconds,
or does it feel like typing a password every chain?*

**Implementation:**
- `src/state.js` — `createInitialState()` adds `chain: []` (already there
  from Phase 1) and `settings: { ...INITIAL_SETTINGS }`.
- New file `src/features/a11y/keyboard.js`:
  ```js
  import { COLS, ROWS } from "../../constants.js";
  import { isAdjacent, canExtendChain } from "../../utils.js";
  import { announce } from "../../a11y.js";

  const ARROWS = {
    ArrowUp:    (r, c) => [Math.max(0, r - 1), c],
    ArrowDown:  (r, c) => [Math.min(ROWS - 1, r + 1), c],
    ArrowLeft:  (r, c) => [r, Math.max(0, c - 1)],
    ArrowRight: (r, c) => [r, Math.min(COLS - 1, c + 1)],
  };
  export function handleKeyboard(state, ev) {
    const cur = state.settings.keyboardCursor;
    if (ev.key === "Tab")    return setCursor(state, { ...cur, active: !cur.active });
    if (!cur.active) return state;
    if (ARROWS[ev.key]) {
      const [r, c] = ARROWS[ev.key](cur.row, cur.col);
      return setCursor(state, { ...cur, row: r, col: c });
    }
    if (ev.key === " ")      return tryAddTile(state);
    if (ev.key === "Enter")  return commitFromKeyboard(state);
    if (ev.key === "Escape") { announce("Chain cancelled."); return { ...state, chain: [] }; }
    return state;
  }
  function tryAddTile(state) {
    const { row, col } = state.settings.keyboardCursor;
    const tile = state.grid[row][col];
    const last = state.chain[state.chain.length - 1];
    if (last && (!isAdjacent(last, { row, col }) || !canExtendChain(state.chain, tile))) {
      announce("Not adjacent."); return state;
    }
    return { ...state, chain: [...state.chain, { row, col, key: tile.key }] };
  }
  ```
- `src/GameScene.js` — in `create()` register a `keydown` handler that
  funnels through `handleKeyboard(state, ev)` and dispatches the same
  `COMMIT_CHAIN` action the mouse drag uses on Enter; render the focus
  ring as a 4-px yellow rectangle (`0xffd34c`) at
  `(382 + col * TILE, 96 + row * TILE)` whenever `keyboardCursor.active`;
  tool-tray keys (`1`–`6`) dispatch `USE_TOOL { key }` mirroring mouse arm.
- `prototype.jsx` — canvas gets `tabindex="0"` + visible `:focus-visible`.

**Manual Verify Walk-through:**
1. Open game. Press Tab. Yellow ring appears at top-left cell.
2. ArrowRight × 3, ArrowDown × 2. Ring at (2, 3). Press Space — chain
   shows tile (2, 3) selected.
3. ArrowRight, then Space. Chain extends if (2, 4) matches.
4. ArrowDown × 4 to a far tile, then Space. Chain does NOT extend
   (announcement "Not adjacent.").
5. Press Enter on a valid 3-chain. Floater rises; inventory ticks.
6. Build a keyboard chain that crosses 20 hay. First Light modal opens —
   proves event parity with mouse drag.
7. Press `1` to arm Scythe; navigate to hay; press Space. Tool fires;
   `turnsUsed` unchanged (Phase 1 contract held).
8. Press Escape mid-chain. Chain clears.
9. Press Tab. Ring vanishes; arrows no longer move cursor.
10. `runSelfTests()` passes all 11.2 assertions.

---

### 11.3 — Screen-reader announcements for floaters, modals, and chain results

**What this delivers:** Two ARIA live regions live in the React DOM
(`<div aria-live="polite">` for chain commits and floaters,
`<div aria-live="assertive">` for boss state changes and modal openings).
A helper `announce(text, urgency = "polite")` queues messages with a 200ms
debounce so a long chain commit doesn't pile six messages on top of each
other. Every player-visible event from Phases 1–10 gets a meaningful
announcement string — concrete numbers, no "click here" or "see screen."

**Completion Criteria:**
- [ ] `src/a11y.js` module exists, exports `announce(text, urgency?)`,
  `flushAnnouncements()`, and `getQueue()` for tests
- [ ] React shell renders `<div aria-live="polite" aria-atomic="true">` and
  `<div aria-live="assertive" aria-atomic="true">`, both `position: absolute;
  left: -9999px;` (off-screen but readable)
- [ ] `state.a11y.queue` (polite) and `state.a11y.urgent` (assertive) arrays
  hold pending announcements
- [ ] Consecutive `announce()` calls within 200ms coalesce — only the
  *latest* polite message wins; assertive messages never coalesce
- [ ] Chain commits announce: `"Collected 6 hay; 1 wheat upgrade spawned at the endpoint."`
  (counts come from the actual commit result; "; 1 wheat upgrade…" segment
  omitted if no upgrade)
- [ ] Floaters announce their full text: `"+5 coins from order delivery."`,
  `"+12 XP."`, `"Pest cleared! +15 coins."`
- [ ] Modal opens (Phase 2 story modals) announce assertively:
  `"Story beat: First Light. Wren says: The Hearth is alive again."`
  Modal focus moves to the Continue button so a screen reader picks it up
  without a manual Tab.
- [ ] Boss state changes (Phase 8) announce: `"Frostmaw is active. 30 logs needed in 10 turns."`
- [ ] Quest claims (Phase 7) announce: `"Quest claimed: Collect 30 hay. +50 coins, +20 XP."`
- [ ] Achievement unlocks announce: `"Achievement unlocked: Big Chain. +60 coins, +25 XP."`
- [ ] No `console.log`-only events — every UI-visible state change has a
  matching `announce` call

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { announce, flushAnnouncements, getQueue } from "./a11y.js";

// Basic enqueue
flushAnnouncements();
announce("hello");
const q = getQueue();
assert(q.polite.length === 1, "polite queue has 1");
assert(q.polite[0].text === "hello", "text matches");

// Debounce — two within 200ms coalesce to the LATEST polite message
flushAnnouncements();
announce("first");
announce("second");
const q2 = getQueue();
assert(q2.polite.length === 1, "two within 200ms coalesce");
assert(q2.polite[0].text === "second", "latest wins");

// Assertive bypasses debounce
flushAnnouncements();
announce("polite msg", "polite");
announce("URGENT", "assertive");
const q3 = getQueue();
assert(q3.polite.length === 1 && q3.urgent.length === 1,
       "assertive lives in its own queue");
assert(q3.urgent[0].text === "URGENT", "urgent preserved");

// Chain commit announcement string
import { formatChainAnnouncement } from "./a11y.js";
assert(formatChainAnnouncement({ key: "hay", collected: 6, upgrades: [] })
  === "Collected 6 hay.", "no-upgrade chain string");
assert(formatChainAnnouncement({ key: "hay", collected: 6,
                                 upgrades: [{ key: "wheat", count: 1 }] })
  === "Collected 6 hay; 1 wheat upgrade spawned at the endpoint.",
  "chain with upgrade string");

// Modal announcement helper
import { formatModalAnnouncement } from "./a11y.js";
const beat = { id: "act1_light_hearth", title: "First Light",
               body: "Wren: 'The Hearth is alive again.'" };
const text = formatModalAnnouncement(beat);
assert(text.startsWith("Story beat: First Light"), "starts with beat title");
assert(text.includes("Wren says"), "includes speaker");
assert(text.includes("The Hearth is alive again"), "includes body");

// Quest claim
import { formatQuestAnnouncement } from "./a11y.js";
const qa = formatQuestAnnouncement(
  { label: "Collect 30 hay", reward: { coins: 50, almanacXp: 20 } });
assert(qa === "Quest claimed: Collect 30 hay. +50 coins, +20 XP.",
       "quest claim string");
```
Run — confirm: `Cannot find module './a11y.js'` or
`formatChainAnnouncement is not exported`.

*Gameplay simulation (screen-reader user, NVDA on Windows, first session):*
The player loads the page. Within 500ms the screen reader says: *"Story
beat: A Cold Hearth. Wren says: The vale was abandoned years ago. Bring me
20 hay and we'll light the Hearth."* Focus is on the Continue button —
they press Enter to dismiss. They Tab into the board. Arrow Right Right
Down, Space, Right Space, Right Space, Enter. The screen reader says:
*"Collected 3 hay."* They build six more chains; on the seventh, the
reader says: *"Collected 4 hay."* — then 200ms later: *"Story beat: First
Light. Wren says: The Hearth is alive again. Mira will be here soon."*
They never look at the screen.

Designer reflection: *Are the announcements descriptive enough that a
sightless player can build a mental model of the board state, or are
they just status pings? Should the chain-commit announcement also include
the resulting inventory total (".. you now have 23 hay")?*

**Implementation:**
- New file `src/a11y.js`:
  ```js
  let _state = { polite: [], urgent: [], _lastPoliteTs: 0 };
  const DEBOUNCE_MS = 200;

  export function announce(text, urgency = "polite") {
    const now = Date.now();
    if (urgency === "assertive") { _state.urgent.push({ text, ts: now }); return; }
    if (now - _state._lastPoliteTs < DEBOUNCE_MS && _state.polite.length) {
      _state.polite[_state.polite.length - 1] = { text, ts: now };
    } else {
      _state.polite.push({ text, ts: now });
    }
    _state._lastPoliteTs = now;
  }
  export function flushAnnouncements() { _state = { polite: [], urgent: [], _lastPoliteTs: 0 }; }
  export function getQueue() { return _state; }

  export function formatChainAnnouncement({ key, collected, upgrades = [] }) {
    if (!upgrades.length) return `Collected ${collected} ${key}.`;
    const u = upgrades[0];
    return `Collected ${collected} ${key}; ${u.count} ${u.key} upgrade spawned at the endpoint.`;
  }
  export function formatModalAnnouncement(beat) {
    const m = beat.body.match(/^([A-Z][a-zA-Z ]+?):\s*['"]?(.+?)['"]?$/);
    return m ? `Story beat: ${beat.title}. ${m[1]} says: ${m[2]}`
             : `Story beat: ${beat.title}. ${beat.body}`;
  }
  export function formatQuestAnnouncement(quest) {
    const r = quest.reward ?? {}, parts = [];
    if (r.coins)     parts.push(`+${r.coins} coins`);
    if (r.almanacXp) parts.push(`+${r.almanacXp} XP`);
    return `Quest claimed: ${quest.label}. ${parts.join(", ")}.`;
  }
  ```
- `prototype.jsx` — render two off-screen `aria-live` regions (`polite`
  and `assertive`); a `useEffect` drains `getQueue()` every 100ms and
  writes the latest text into the matching DOM node.
- `src/GameScene.js`:
  - `commitChain()` → `announce(formatChainAnnouncement(result))` after collection.
  - `_renderModal()` → `announce(formatModalAnnouncement(beat), "assertive")`
    plus `continueButton.focus()` so the reader picks the Continue button up.
  - Boss spawn / quest claim / achievement unlock each call their matching
    formatter and `announce()`. Floater helper pipes its string through
    `announce()` once per pop.

**Manual Verify Walk-through:**
1. Open game with NVDA / VoiceOver / Orca running.
2. Arrival modal announced within 500ms of game ready, with Wren's full
   body text. Focus on Continue.
3. Press Enter to dismiss; Tab into board. Build a 4-hay chain — reader
   says "Collected 4 hay."
4. Build a 6-hay chain — reader says "Collected 6 hay; 1 wheat upgrade
   spawned at the endpoint."
5. Force a Phase 8 boss spawn via console. Urgent announcement reads the
   boss name + target.
6. Claim a quest. Reader says "Quest claimed: <label>. +X coins, +Y XP."
7. Spam-commit 4 chains within 800ms. Only the *latest* chain announcement
   is read (200ms debounce), not all four.
8. Inspect DOM: two `aria-live` regions with `aria-atomic="true"`.
9. `runSelfTests()` passes all 11.3 assertions.

---

### 11.4 — Motion-reduction setting

**What this delivers:** A Settings toggle "Reduced motion" — defaulting to
`window.matchMedia('(prefers-reduced-motion: reduce)').matches` on first
load. When on, the visual systems that move or shake become still or fast:
screen shake on chain commits is a no-op, the gold star marker on
upgraded tiles renders static (no sway tween), floaters travel 100ms
instead of 600ms, particle bursts (festival win, Mysterious Ore success,
achievement unlock) become a single 200ms glow, and tile collapse
completes instantly instead of cascading. The user toggle wins over the
OS preference once set.

**Completion Criteria:**
- [ ] `state.settings.reducedMotion` is `null | true | false` — `null`
  means "follow OS"; `true`/`false` means user override
- [ ] Helper `isReducedMotion(state)` returns
  `state.settings.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- [ ] Helper `getTweenDuration(state, baseMs)` returns `baseMs` when off,
  `Math.min(baseMs, 100)` when on (clamps long tweens, keeps 0ms zero)
- [ ] `screenShake(state, intensity)` returns immediately (no Phaser
  camera shake) when `isReducedMotion(state) === true`
- [ ] Star marker sway: when reduced, omit the `sway` tween and render
  the star as a static gold sprite at full opacity
- [ ] Floater drift duration uses `getTweenDuration(state, 600)`
- [ ] Particle bursts: when reduced, replace the emitter with a single
  rect that fades out over 200ms — emitter `count <= 0` (or `quantity = 0`)
  for the underlying Phaser particles object
- [ ] Tile collapse: when reduced, cells slide via `getTweenDuration(state, 240)`
  → 100ms drop instead of the full 240ms cascade
- [ ] `SET_REDUCED_MOTION { value }` reducer updates the setting and
  persists to `localStorage` synchronously
- [ ] On first run with no saved override (`reducedMotion === null`), the
  OS media query value seeds the *effective* setting without writing it
  to storage — so toggling the OS setting later still flows through
- [ ] Once the user explicitly flips the toggle, that override persists
  even if the OS setting changes (locked: user choice wins)

**Validation Spec — write before code:**

*Tests (red phase) — add to `runSelfTests()`:*
```js
import { settingsReduce, INITIAL_SETTINGS } from "./settings.js";
import { isReducedMotion, getTweenDuration, screenShake } from "./a11y.js";

// Default = null (follow OS)
assert(INITIAL_SETTINGS.reducedMotion === null, "default reducedMotion = null");

// User override sticks
let s = INITIAL_SETTINGS;
s = settingsReduce(s, { type: "SET_REDUCED_MOTION", value: true });
assert(s.reducedMotion === true, "user override true");
s = settingsReduce(s, { type: "SET_REDUCED_MOTION", value: false });
assert(s.reducedMotion === false, "user override false");

// isReducedMotion — explicit override wins
assert(isReducedMotion({ settings: { reducedMotion: true  } }) === true,  "true wins");
assert(isReducedMotion({ settings: { reducedMotion: false } }) === false, "false wins");

// getTweenDuration scaling
const off = { settings: { reducedMotion: false } };
const on  = { settings: { reducedMotion: true  } };
assert(getTweenDuration(off, 600) === 600, "off: passes through");
assert(getTweenDuration(on,  600) === 100, "on: clamps to 100");
assert(getTweenDuration(on,  50)  === 50,  "on: short tween unchanged");
assert(getTweenDuration(on,  0)   === 0,   "on: 0 stays 0");

// screenShake is a no-op when reduced
let shaken = 0;
const fakeCam = { shake: () => { shaken++; } };
screenShake(off, 200, fakeCam);
assert(shaken === 1, "off: shake fires");
screenShake(on, 200, fakeCam);
assert(shaken === 1, "on: shake suppressed");

// Particle burst quantity collapses
import { particleQuantity } from "./a11y.js";
assert(particleQuantity(off, 60) === 60, "off: full burst");
assert(particleQuantity(on,  60) === 0,  "on: no particles");

// Save/load round-trip preserves the explicit override
import { saveSettings, loadSettings } from "./settings.js";
saveSettings({ ...INITIAL_SETTINGS, reducedMotion: true });
const loaded = loadSettings();
assert(loaded.reducedMotion === true, "explicit override persists");

// First run: null in storage → loadSettings returns null (does not write OS value)
saveSettings({ ...INITIAL_SETTINGS, reducedMotion: null });
const fresh = loadSettings();
assert(fresh.reducedMotion === null, "null override persists as null");
```
Run — confirm: `getTweenDuration is not exported from './a11y.js'` (or
similar — the helpers don't exist yet).

*Gameplay simulation (vestibular-disorder player, sandbox session, year 3):*
The player gets motion-sick from screen shake; their OS already has
`prefers-reduced-motion: reduce` enabled, so the game opens with the
toggle already on. They commit a 9-chain — no shake, the floater rises
100ms (a quick "+9 hay" pulse), tiles collapse instantly into the gap.
A boss season triggers and Frostmaw appears; the freeze-column visual
fades in over 200ms instead of swirling. They win the boss; a static gold
glow flashes for 200ms instead of a 60-particle burst. They keep playing
for an hour without nausea. Mid-session, curious, they flip the toggle
*off* — the next chain commit shakes, particles burst, stars sway. They
flip it back on; the next chain is calm again.

Designer reflection: *Does "reduced motion" still feel celebratory on big
events (boss wins, achievement unlocks), or does the static glow read as
"the animation broke"? Should we keep audio cues at full volume when
motion is reduced, or does silence feel right alongside stillness?*

**Implementation:**
- `src/a11y.js` — append:
  ```js
  export function isReducedMotion(state) {
    const s = state?.settings?.reducedMotion;
    if (s === true || s === false) return s;
    if (typeof window !== "undefined" && window.matchMedia)
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return false;
  }
  export function getTweenDuration(state, baseMs) {
    if (!isReducedMotion(state)) return baseMs;
    return baseMs <= 100 ? baseMs : Math.min(baseMs, 100);
  }
  export function screenShake(state, intensity, camera) {
    if (isReducedMotion(state)) return;
    camera.shake(intensity, 0.005);
  }
  export function particleQuantity(state, base) {
    return isReducedMotion(state) ? 0 : base;
  }
  ```
- `src/GameScene.js` — replace every `this.cameras.main.shake(...)` with
  `screenShake(state, intensity, this.cameras.main)`; wrap every visual
  tween `duration: N` (floaters, collapse, star pulse, fade-ins) with
  `getTweenDuration(state, N)`. Gameplay-critical timings (turn delay,
  debounces) untouched. `TileObj.update` reads `isReducedMotion(state)`
  once per frame — when true, skips the sway delta and renders the star
  centred and static. Particle emitters pass `particleQuantity(state, 60)`
  as `quantity`; when 0, schedule a single 200ms rectangle fade instead.
- `src/settings.js` — `INITIAL_SETTINGS.reducedMotion` is `null`;
  `settingsReduce` handles `SET_REDUCED_MOTION { value }`. Save/load
  preserves `null` distinctly from `false` so the "no override yet" state
  is detectable.
- Settings panel UI — three-state toggle (Auto / On / Off) maps to
  `null / true / false`.

**Manual Verify Walk-through:**
1. Set OS preference `prefers-reduced-motion: reduce`. Open the game.
2. Settings panel "Reduced motion" reads "Auto" and effective state is On
   (no shake on chain commits).
3. Build a 6-hay chain — no shake, floater is ~100ms, tiles drop instantly.
4. Force a Phase 8 boss win — static gold glow, no particle burst.
5. Force an achievement unlock — static glow.
6. Toggle Reduced motion to Off. Next chain commit shakes; floater takes
   ~600ms; tiles cascade.
7. Toggle to On. Calm visuals return.
8. Refresh the page. Explicit override persists.
9. Disable OS `prefers-reduced-motion`. Explicit On override still wins.
10. Reset to Auto. Effective state follows OS again.
11. `runSelfTests()` passes all 11.4 assertions.

---

## Phase 11 Sign-off Gate

Play 4 polish-focused playthroughs from a fresh save: a *deuteranopia
session* (default → deuteranopia palette, complete the hearth beat), a
*keyboard-only session* (no mouse, complete the hearth beat and craft
one tool), a *screen-reader session* (NVDA or VoiceOver, dismiss arrival
modal and chain to first beat with eyes closed), and a *reduced-motion
session* (toggle on, play one full year, confirm zero shakes). Before
moving to Phase 12, confirm all:

- [ ] 11.1 Completion Criteria all checked
- [ ] 11.2 Completion Criteria all checked
- [ ] 11.3 Completion Criteria all checked
- [ ] 11.4 Completion Criteria all checked
- [ ] **A first-time deuteranopic player can distinguish hay vs. log vs.
  berry tiles within 2 seconds** — color contrast ratio ≥ 3:1 verified
  for every adjacent-pool pair in each non-default palette via the
  `contrastRatio` helper in `runSelfTests()`
- [ ] **A keyboard-only player can complete the Phase 2 first beat
  (collect 20 hay)** without touching the mouse — Tab into board, arrow
  + Space + Enter loop only, finishes in under 5 minutes
- [ ] **A screen-reader user hears a meaningful announcement within 500ms
  of every chain commit and modal open** — verified with NVDA / VoiceOver,
  no silent state changes
- [ ] **Toggling Reduced Motion on mid-session has visible effect within
  1 frame** — the next chain commit doesn't shake the screen, even if a
  shake was queued from the previous commit
- [ ] **All accessibility settings persist across page refresh** — palette,
  reducedMotion override, and keyboardCursor.row/col round-trip via
  `localStorage` (`active` correctly resets to `false` on load)
- [ ] **Locked rules upheld**: per-resource thresholds (Phase 1) untouched;
  story arc (Phase 2) untouched; no new gameplay mechanics or resources
  added; Phase 1 chain mechanic and tools all reachable via keyboard
- [ ] **Default palette is byte-for-byte identical** to the existing hex
  values — Phase 0–10 screenshots and visual baseline match
- [ ] `runSelfTests()` passes for all Phase 11 tests

*Designer gut-check: Does the game feel polished and welcoming to a wider
range of players, or does the accessibility layer feel bolted on — like
four separate features stapled to the side rather than four expressions
of one careful pass?*
