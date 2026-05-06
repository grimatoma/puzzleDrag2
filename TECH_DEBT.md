# Tech Debt Report — puzzleDrag2
_Generated 2026-05-06_

---

## Summary

| Category | Count | Severity |
|---|---|---|
| Giant files (god classes) | 3 | Critical |
| Long functions (>50 lines) | 6+ | High |
| Magic numbers / hard-coded values | 100+ | Medium |
| Missing abstractions | 6 | Medium |
| Tight coupling | 8 | Medium |
| Missing error handling | 7 locations | Medium |
| Performance issues | 7 | Medium |
| Unused / dead code | 5+ | Low |
| Inconsistent naming | 20+ locations | Low |
| Missing documentation | Entire codebase | Low |

---

## Critical

### 1. God Files

**`src/ui.jsx` — 1,646 lines, ~30 components**

A single file contains HUD, SidePanel, Orders, Tools, Town view, Modals, and NPC interactions. This makes diffs enormous, hinders code navigation, and forces unrelated logic to share a module.

Recommended split:
```
src/ui/
  HUD.jsx
  SidePanel.jsx
  Orders.jsx
  Tools.jsx
  Town/
    TownView.jsx
    BuildingCard.jsx
    NpcDialog.jsx
  modals/
    SeasonEndModal.jsx
    AchievementModal.jsx
  Inventory.jsx
```

**`src/textures.js` — 1,576 lines**

`drawTileIcon()` is ~1,200 lines — a single function with a switch containing 20+ resource types, each branch 50–150 lines of raw canvas operations. It is effectively untestable and impossible to extend safely.

Recommended split:
```
src/textures/
  index.js          (makeTextures, drawTileIcon dispatcher)
  farmTiles.js      (wheat, carrot, apple, …)
  mineTiles.js      (stone, iron, gold, …)
  uiSprites.js      (season badges, UI decorations)
  shapes.js         (shared shape helpers: roundRect, star, gem, …)
```

**`src/GameScene.js` — 594 lines**

One Phaser `Scene` subclass handles board layout, tile rendering, drag-chain input, path drawing, collapse animation, juice/feedback, and biome switching. Responsibilities need separation.

Recommended extractions:
- `BoardRenderer` — tile placement, board fill, collapse animation
- `ChainPath` — path geometry, overlay drawing, upgrade ticks
- `InputHandler` — pointer down/move/up, long-press, hover

---

## High

### 2. Long Functions

| Function | File | Approx. lines | Problem |
|---|---|---|---|
| `drawTileIcon()` | textures.js | ~1,200 | Monolithic switch; one branch per resource |
| `coreReducer()` | state.js | ~250 | Giant switch; complex nested logic per case |
| `redrawPath()` | GameScene.js | ~113 | Nested loops + tweens + conditionals, depth 6 |
| `PhaserMount()` | prototype.jsx | ~96 | Phaser init + registry setup + event binding in one effect |
| `makeTextures()` | textures.js | ~140 | Creates all textures; should be parametric |

### 3. Repeated Logic — Bubble Creation (15+ call sites)

`{ id: Date.now(), npc, text, ms }` is constructed inline throughout `state.js`:

```js
// state.js lines 170, 181, 223–228, 261, 262, 280, 287, 292, 297, 328, 334, 347, 361, 395
{ id: Date.now(), npc: "baker", text: "Thanks!", ms: 1800 }
```

Fix: add one factory function to `utils.js`:
```js
export const bubble = (npc, text, ms = 1800) => ({ id: Date.now(), npc, text, ms });
```

### 4. No Color / Theme Constants

Hex color values appear in 40+ locations across `GameScene.js`, `textures.js`, `ui.jsx`, and `constants.js` with no names:

```js
// GameScene.js
0xffd248, 0xff6d00, 0xfff4c2
// textures.js — hundreds of instances
```

Fix: create `src/theme.js`:
```js
export const COLORS = {
  golden:   0xffd248,
  orange:   0xff6d00,
  cream:    0xfff4c2,
  // …
};
```

---

## Medium

### 5. Magic Numbers Without Explanation

Selected examples (there are 100+):

| Location | Value | Problem |
|---|---|---|
| GameScene.js line 452 | `>= 6 ? 2 : 1` | Chain doubling threshold unexplained |
| GameScene.js line 532 | `0.0025 + (len-3) * 0.0028` | Shake intensity formula; units unknown |
| GameScene.js line 209 | `y - 500 - Between(0,100)` | Why 500? Why cap 100? |
| GameScene.js line 212 | `initial ? 450 + r*28 : 210` | Magic durations |
| state.js line 65 | `Math.random() < 0.30` | 30% crafted-item chance, no constant |
| state.js line 79 | `res.value < 3 ? 8 : 4` | Unexplained need thresholds |
| prototype.jsx line 21 | `Math.min(dpr, 3)` | Why cap at 3? |
| ui.jsx line 369 | `setTimeout(..., 500)` | Long-press ms; needs `LONG_PRESS_MS` |

All of these belong in `constants.js` or inline named variables with a comment.

### 6. Tight Coupling

| Coupling | Detail |
|---|---|
| `ui.jsx` → Phaser | `window.__phaserScene?.shuffleBoard()` called at lines 209, 468, 548. A global reference prevents proper GC and breaks testability. |
| Phaser → React | State changes require both reducer dispatch AND Phaser registry writes (prototype.jsx 92–95, GameScene.js 62–68). Double-update pattern is fragile. |
| State → 9 feature slices | Core reducer composes slices at import time; adding or removing a feature requires touching state.js directly. |
| localStorage → reducer | Persistence logic is embedded inside the game reducer (state.js 14–38) rather than at the app boundary. |

Fix for `__phaserScene`: pass a `ref` or callback from `prototype.jsx` down through props or React context instead of attaching it to `window`.

### 7. Missing Error Handling

| Location | Risk |
|---|---|
| state.js 20–26 | `localStorage` reads swallow all exceptions silently — no logging |
| prototype.jsx 27–30 | Phaser load error only `console.error`s; UI stays on "Loading…" forever |
| textures.js ~line 45 | No null check on `canvas.getContext('2d')` |
| GameScene.js line 183 | Missing resource returns fallback silently; should warn |
| state.js 71, 78 | Recipe / NPC lookups assume data exists; no validation |

### 8. Performance Issues

| Issue | Location | Fix |
|---|---|---|
| `resourceByKey()` is O(n) scan of all biomes | state.js line 43 | Cache in a `Map` at init |
| `DUST_MOTES` array created inside component render | ui.jsx ~line 169 | Move outside component |
| 41+ `style={{}}` inline object literals in JSX | ui.jsx throughout | Replace with Tailwind classes or CSS modules |
| `CompactOrders` re-renders entire order list on every state change | ui.jsx 219–245 | Wrap in `React.memo`, memoize callbacks |
| Full path redraw on every tile pointer-enter | GameScene.js redrawPath | Only redraw delta (last segment) |
| `window.__phaserScene` global prevents GC of Phaser instance | prototype.jsx 69 | Use React ref |

### 9. Inconsistent Naming

| Pattern | Examples |
|---|---|
| Private-field prefixes (`_`, `__`) inconsistent | `_prevPathLen`, `_destroying`, `__phaserScene` |
| Abbreviated single-letter variables | `o` (order), `r` (resource), `t` (tile), `m` (mote), `s` (scene) |
| Event name styles mixed | `"chain-collected"`, `"chain-update"`, `"changedata-biomeKey"` |
| camelCase vs. no convention in data keys | `orderIdSeq`, `turnsUsed`, `seasonStats` |

---

## Low

### 10. Dead / Suspicious Code

| Location | Issue |
|---|---|
| GameScene.js line 65 | `_p` parameter captured but never used |
| GameScene.js lines 51–52 + 57–58 | Same pointer event attached to both `canvas` and `document` — likely duplicate |
| TileObj.js line 67 | Checks `angle !== 0` then unconditionally sets to 0; condition may be redundant |
| state.js line 136 | `turnsUsed: 0` on load silently resets season progress — intentional? |

### 11. Missing Documentation

- No JSDoc on any exported function
- No architecture notes in CLAUDE.md explaining why Phaser registry is used instead of React context
- Chain-length multiplier formula (`len * (len >= 6 ? 2 : 1)`) has no comment
- Sway/shake parameter formulas have no comment

---

## Priority Refactoring Order

1. **Split `ui.jsx`** into feature directories — highest impact, removes ~50% of code from a single file
2. **Split `textures.js` / `drawTileIcon()`** — extract per-resource drawing into separate files
3. **Create `src/theme.js`** — centralise all color constants, eliminating 40+ magic hex values
4. **Extract `bubble()` factory** — 3-line change, eliminates 15+ duplicate object literals
5. **Remove `window.__phaserScene`** — replace with React ref or context callback
6. **Extract `BoardRenderer` and `ChainPath` from `GameScene`** — improves testability and isolation
7. **Add error boundaries and `localStorage` error logging** — prevents silent failure
8. **Memoize `CompactOrders` and other expensive render paths** — easy wins with `React.memo`
9. **Name all magic numbers** in `constants.js` or local named variables
10. **Add JSDoc to public exports** — low effort, high discoverability benefit
