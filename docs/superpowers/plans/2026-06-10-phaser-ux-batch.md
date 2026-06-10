# Phaser Game UX Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved 5-item UX batch — min-chain indicator in the chain panel, tool armed/fired audio cues, inventory-cap toast, hazard-vignette breathe, and hover-badge horizontal clamp.

**Architecture:** All five items are independent, additive changes to the existing React+Phaser pipeline. State→UI data flows through the existing `CHAIN_UPDATE` payload and `useAudio` transition watcher; Phaser-side feedback (toast trigger, vignette tween, badge clamp) stays inside `GameScene`. Pure logic (payload builder, tool-sound classification, toast cooldown) is extracted into Phaser-free modules so it's unit-testable, mirroring the `src/game/producedResource.ts` pattern.

**Tech Stack:** TypeScript, React, Phaser 3, Vitest, Playwright visual suite. Spec: `docs/superpowers/specs/2026-06-10-phaser-ux-batch-design.html`.

**Branch:** `claude/phaser-game-ux-768h70` (already checked out).

---

### Task 1: Min-chain indicator (payload + chain panel)

**Files:**
- Modify: `src/game/producedResource.ts` (add `minChain` to `ChainUpdatePayload`)
- Modify: `src/ui/puzzleBoard.tsx` (`ChainInfo` interface ~line 65; `ChainView` header ~line 271)
- Test: `src/__tests__/chainEmitUpdate.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the `describe("buildChainUpdatePayload", …)` block in `src/__tests__/chainEmitUpdate.test.ts`:

```ts
  it("exposes the effective min chain so the HUD can show 'N more'", () => {
    const payload = buildChainUpdatePayload({
      path: [{ res: { key: "tile_grass_grass", label: "Grass" } }],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 5,
    });
    expect(payload.minChain).toBe(5);
    expect(payload.valid).toBe(false);
  });

  it("keeps minChain in the empty-path payload", () => {
    const payload = buildChainUpdatePayload({
      path: [],
      nextUpgradeTile: () => null,
      effectiveThresholds: undefined,
      effectiveMinChain: 3,
    });
    expect(payload.minChain).toBe(3);
    expect(payload.valid).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/chainEmitUpdate.test.ts`
Expected: FAIL — `payload.minChain` is `undefined`.

- [ ] **Step 3: Implement the payload field**

In `src/game/producedResource.ts`, add `minChain: number;` to `ChainUpdatePayload` (after `valid: boolean;`), and add `minChain: effectiveMinChain,` to the returned object in `buildChainUpdatePayload` (after `valid,`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/chainEmitUpdate.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Surface it in ChainView**

In `src/ui/puzzleBoard.tsx`:

1. Add to the `ChainInfo` interface (after `valid: boolean;`):

```ts
  minChain?: number;
```

2. In `ChainView` (~line 231), after the `resourceLabel` const, add:

```ts
  const minChain = chainInfo.minChain ?? 3;
  const shortBy = Math.max(0, minChain - length);
  const tooShort = !chainInfo.valid && length > 0;
```

3. Replace the `PanelHeader` call:

```tsx
      <PanelHeader
        left="Chaining"
        right={tooShort ? `${shortBy} more to collect` : `${resourceLabel} chain`}
        accent={tooShort ? "#9a7b4f" : stage.accent}
      />
```

(`#9a7b4f` is the muted brown matching the invalid-path tint; the header flips back to the resource label the moment the chain reaches `minChain`.)

- [ ] **Step 6: Verify gates**

Run: `npm run typecheck && npx vitest run src/__tests__/chainEmitUpdate.test.ts`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/game/producedResource.ts src/ui/puzzleBoard.tsx src/__tests__/chainEmitUpdate.test.ts
git commit -m "UX: show 'N more to collect' in the chain panel while below min chain"
```

---

### Task 2: Tool armed / fired audio cues

**Files:**
- Create: `src/audio/toolSounds.ts`
- Modify: `src/audio/index.ts` (two `SOUNDS` entries)
- Modify: `src/audio/useAudio.tsx`
- Test: `src/__tests__/toolSounds.test.ts` (new)

**Background (verified in `src/state.ts`):** `USE_TOOL` arms a tool. Tap-target powers set `state.toolPending` and spend the charge later at `TOOL_FIRED`; instant powers spend the charge at `USE_TOOL` and briefly set `toolPending` until `TOOL_FIRED` clears it. Cancel paths (`CANCEL_TOOL` / `disarmAllTools`) clear `toolPending` — refunding the charge for instant arms (count goes back up), no count change for tap-target arms. So fire-vs-cancel is decidable from `(toolPending, tools[key])` transitions if we remember whether the charge was spent at arm time.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/toolSounds.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createToolSoundTracker } from "../audio/toolSounds.js";

const snap = (toolPending: string | null, tools: Record<string, number>) => ({ toolPending, tools });

describe("createToolSoundTracker", () => {
  it("reports 'armed' when a tap-target tool arms (no charge spent yet)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }))).toBe("armed");
  });

  it("reports 'fired' when a tap-target tool fires (charge spent on clear)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }));
    expect(step(snap("bomb", { bomb: 2 }), snap(null, { bomb: 1 }))).toBe("fired");
  });

  it("stays silent when a tap-target arm is cancelled (no count change)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2 }), snap("bomb", { bomb: 2 }));
    expect(step(snap("bomb", { bomb: 2 }), snap(null, { bomb: 2 }))).toBeNull();
  });

  it("reports 'fired' for an instant tool (charge spent at arm, none on clear)", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, { axe: 3 }), snap("axe", { axe: 2 }))).toBe("armed");
    expect(step(snap("axe", { axe: 2 }), snap(null, { axe: 2 }))).toBe("fired");
  });

  it("stays silent when an instant arm is cancelled (charge refunded)", () => {
    const step = createToolSoundTracker();
    step(snap(null, { axe: 3 }), snap("axe", { axe: 2 }));
    expect(step(snap("axe", { axe: 2 }), snap(null, { axe: 3 }))).toBeNull();
  });

  it("reports 'armed' again when arming transfers to a different tool", () => {
    const step = createToolSoundTracker();
    step(snap(null, { bomb: 2, rake: 1 }), snap("bomb", { bomb: 2, rake: 1 }));
    expect(step(snap("bomb", { bomb: 2, rake: 1 }), snap("rake", { bomb: 2, rake: 1 }))).toBe("armed");
  });

  it("returns null for no-op transitions", () => {
    const step = createToolSoundTracker();
    expect(step(snap(null, {}), snap(null, {}))).toBeNull();
    step(snap(null, { bomb: 1 }), snap("bomb", { bomb: 1 }));
    expect(step(snap("bomb", { bomb: 1 }), snap("bomb", { bomb: 1 }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/toolSounds.test.ts`
Expected: FAIL — module `../audio/toolSounds.js` not found.

- [ ] **Step 3: Implement the tracker**

Create `src/audio/toolSounds.ts`:

```ts
/**
 * Pure classifier for tool arm/fire/cancel sound triggers, fed by consecutive
 * game-state snapshots from useAudio. Phaser-free so it can be unit-tested.
 *
 * The reducer's contract (see USE_TOOL / TOOL_FIRED / disarmAllTools in
 * src/state.ts): tap-target powers spend their charge when fired, instant
 * powers spend it when armed and are refunded when cancelled. Tracking
 * whether the charge was spent at arm time lets us tell "fired" apart from
 * "cancelled" purely from (toolPending, tools[key]) transitions.
 */

export interface ToolSoundSnapshot {
  toolPending?: string | null;
  tools?: Record<string, number> | null;
}

export type ToolSoundEvent = "armed" | "fired" | null;

export function createToolSoundTracker(): (prev: ToolSoundSnapshot, next: ToolSoundSnapshot) => ToolSoundEvent {
  let armSpentCharge = false;
  const count = (s: ToolSoundSnapshot, key: string): number => s.tools?.[key] ?? 0;

  return function step(prev, next) {
    const pKey = prev.toolPending ?? null;
    const nKey = next.toolPending ?? null;

    if (nKey && nKey !== pKey) {
      // Newly armed (or arming transferred to another tool).
      armSpentCharge = count(next, nKey) < count(prev, nKey);
      return "armed";
    }
    if (pKey && !nKey) {
      const delta = count(next, pKey) - count(prev, pKey);
      const fired = delta < 0 || (delta === 0 && armSpentCharge);
      armSpentCharge = false;
      return fired ? "fired" : null;
    }
    return null;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/toolSounds.test.ts`
Expected: PASS (7 cases).

- [ ] **Step 5: Add the two sounds**

In `src/audio/index.ts`, append to `SOUNDS` (after the `pearlCapture` entry, keeping the comment style):

```ts
  // Tool armed — crisp two-note ready blip, distinct from chainStart's slide
  toolArmed: {
    steps: [
      { freq: 520, dur: 55, type: 'triangle', gain: 0.06, gap: 65 },
      { freq: 740, dur: 70, type: 'triangle', gain: 0.06, gap: 0, delay: 0.065 },
    ],
  },
  // Tool fired — low percussive thunk for the moment of impact
  toolFired: {
    steps: [{ freq: 280, freqEnd: 140, dur: 110, type: 'square', gain: 0.07 }],
  },
```

- [ ] **Step 6: Wire into useAudio**

In `src/audio/useAudio.tsx`:

1. Import: `import { createToolSoundTracker } from './toolSounds.js';`
2. Extend `AudioGameState` (after the `craftedTotals` line):

```ts
  toolPending?: string | null;
  tools?: Record<string, number>;
```

3. Inside `useAudio`, next to the existing `prev` ref:

```ts
  const toolTracker = useRef(createToolSoundTracker());
```

4. Inside the main `useEffect`, after the crafting-total block and before the tide block:

```ts
    // Tool armed / fired — classified from toolPending + charge-count transitions
    const toolEvent = toolTracker.current(
      { toolPending: p.toolPending, tools: p.tools },
      { toolPending: s.toolPending, tools: s.tools },
    );
    if (toolEvent === 'armed') play('toolArmed');
    if (toolEvent === 'fired') {
      play('toolFired');
      if (s?.settings?.hapticsOn && navigator.vibrate) {
        try { navigator.vibrate(30); } catch { /* unsupported */ }
      }
    }
```

- [ ] **Step 7: Verify gates**

Run: `npm run typecheck && npx vitest run src/__tests__/toolSounds.test.ts`
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/audio/toolSounds.ts src/audio/index.ts src/audio/useAudio.tsx src/__tests__/toolSounds.test.ts
git commit -m "UX: audible feedback when a tool is armed or fired"
```

---

### Task 3: Inventory-cap toast

> **AMENDED 2026-06-10 after code review.** The original task (below) wired a toast to `GameScene.collectPath`'s `overCap`, which review proved is dead code: the registry `inventory` mirror is zone-keyed so `inv[res.key]` is always undefined, and the real cap applies to the *produced resource*, not the tile key. The commit was reverted and replaced by a React hook that surfaces the reducer's actual clamp signal: `addCappedResourceMut` (src/state/helpers.ts) sets `seasonStats.capFloaters[key]` once per season per resource at the true clamp moment. New implementation: `src/ui/useCapToasts.tsx` — pure exported `newlyCappedKeys(prev, next)` diff helper (unit-tested in `src/__tests__/useCapToasts.test.ts`) plus a thin `useCapToasts(state)` hook calling `announce("<Label> storage full — extra is wasted", { tone: "warning", icon: "⚠️" })`, wired in `prototype.tsx` beside `useAudio(state)`. No cooldown gate needed — capFloaters resets at CLOSE_SEASON, providing per-season dedupe.

**Original task text (superseded, kept for the record):**

**Files:**
- Create: `src/game/capToastGate.ts`
- Modify: `src/GameScene.ts` (`collectPath`, ~line 1789 `overCap` site; class fields ~line 143; imports ~line 20)
- Test: `src/__tests__/capToastGate.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/capToastGate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createCooldownGate } from "../game/capToastGate.js";

describe("createCooldownGate", () => {
  it("allows the first event for a key", () => {
    const gate = createCooldownGate(10_000);
    expect(gate("hay", 1_000)).toBe(true);
  });

  it("suppresses repeats inside the window", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("hay", 5_000)).toBe(false);
  });

  it("allows again after the window elapses", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("hay", 11_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const gate = createCooldownGate(10_000);
    gate("hay", 1_000);
    expect(gate("plank", 1_001)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/capToastGate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the gate**

Create `src/game/capToastGate.ts`:

```ts
/**
 * Per-key cooldown gate for player-facing toasts fired from the Phaser scene
 * (e.g. "storage full" on capped chains). Pure + clock-injected so it can be
 * unit-tested without booting Phaser, mirroring producedResource.ts.
 */
export function createCooldownGate(windowMs: number): (key: string, now: number) => boolean {
  const lastShown = new Map<string, number>();
  return (key, now) => {
    const prev = lastShown.get(key);
    if (prev !== undefined && now - prev < windowMs) return false;
    lastShown.set(key, now);
    return true;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/capToastGate.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Trigger the toast from collectPath**

In `src/GameScene.ts`:

1. Add imports (near the other `./game/` imports, ~line 36):

```ts
import { createCooldownGate } from "./game/capToastGate.js";
import { announce } from "./a11y.js";
```

2. Add a class field next to `_hazardTimer` (~line 143):

```ts
  _capToastGate: (key: string, now: number) => boolean = createCooldownGate(10_000);
```

3. In `collectPath`, immediately after the `this.floatText(...)` call (~line 1800), add:

```ts
    // Storage-cap feedback: the float text's ⓘ is gone in under a second, so
    // surface a real toast (per-resource cooldown keeps repeat chains quiet).
    if (overCap && this._capToastGate(res.key, Date.now())) {
      announce(`${res.label} storage full — extra tiles lost`, { tone: "warning", icon: "⚠️" });
    }
```

(`announce` is a plain module function bridged to the React toast notifier in `src/a11y.ts`; it no-ops safely if the notifier isn't mounted.)

- [ ] **Step 6: Verify gates**

Run: `npm run typecheck && npx vitest run src/__tests__/capToastGate.test.ts`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/game/capToastGate.ts src/GameScene.ts src/__tests__/capToastGate.test.ts
git commit -m "UX: toast when a chain's gain hits the inventory cap"
```

---

### Task 4: Hazard vignette breathe (replace 120ms random repaint)

**Files:**
- Modify: `src/GameScene.ts` — `_updateHazardAtmosphere` (~lines 469–500) and the `_hazardTimer` class field (~line 143)

- [ ] **Step 1: Check for other `_hazardTimer` references**

Run: `grep -n "_hazardTimer" src/GameScene.ts`
Expected: only the class-field declaration and the two uses inside `_updateHazardAtmosphere`. If a teardown/shutdown path also references it, update that path to the new `_hazardBreathe` tween in the same way (stop + null).

- [ ] **Step 2: Replace the field and the method**

In `src/GameScene.ts`, replace the class field:

```ts
  _hazardTimer: Phaser.Time.TimerEvent | null = null;
```

with:

```ts
  _hazardBreathe: Phaser.Tweens.Tween | null = null;
```

Replace the whole `_updateHazardAtmosphere` body:

```ts
  _updateHazardAtmosphere() {
    const fire = getRegistry(this.registry, "hazardFire");
    const rats = getRegistry(this.registry, "hazardRats");
    const hasFire = !!(fire?.cells?.length);
    const hasRats = !!(rats?.length);

    if (this._hazardBreathe) { this._hazardBreathe.stop(); this._hazardBreathe = null; }
    this.hazardVignette.clear();
    this.hazardVignette.setAlpha(1);
    if (!hasFire && !hasRats) return;

    // Paint once at peak intensity, then breathe the layer's alpha with a slow
    // yoyo tween — the old 120ms timer repainted with fresh random alpha every
    // tick, which read as flicker rather than atmosphere.
    const w = this.scale.width;
    const h = this.scale.height;
    if (hasFire) {
      this.hazardVignette.fillStyle(0xff6600, 0.14);
      this.hazardVignette.fillRect(0, 0, w, h);
    }
    if (hasRats) {
      this.hazardVignette.fillStyle(0x666666, hasFire ? 0.05 : 0.12);
      this.hazardVignette.fillRect(0, 0, w, h);
    }
    this.hazardVignette.setAlpha(0.45);
    this._hazardBreathe = this.tweens.add({
      targets: this.hazardVignette,
      alpha: 1,
      duration: this._dur(1400),
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }
```

(Alpha breathes 0.45→1 over a 0.14-alpha fire fill, i.e. effective ~0.063–0.14 — the same intensity range the random repaint produced. Resize already re-invokes `_updateHazardAtmosphere` via the registry/layout path, which repaints at the new dimensions.)

- [ ] **Step 3: Verify gates**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual check**

Run: `npm run dev` (or use the dev-server skill), open `http://localhost:5173/puzzleDrag2/?visual=board-farm-fire-rats`, confirm the orange/gray vignette slowly breathes instead of flickering.

- [ ] **Step 5: Commit**

```bash
git add src/GameScene.ts
git commit -m "UX: hazard vignette breathes via a slow alpha tween instead of 120ms random repaints"
```

---

### Task 5: Hover badge horizontal clamp

**Files:**
- Modify: `src/GameScene.ts` — `_positionGrassHover` (~line 1938)

- [ ] **Step 1: Implement the clamp**

Replace `_positionGrassHover`:

```ts
  _positionGrassHover(x: number, y: number): void {
    if (!this.grassHover) return;
    const dpr = this.dpr;
    const ts = this.tileSize ?? 60;
    const minY = 26 * dpr;
    // Offset up by a full tile height + padding so the badge sits clearly
    // above the tile rather than overlapping it, and nudge right so it reads
    // as adjacent to the tile rather than centered on the cursor.
    // The badge is an 80×44 (css px) container centered on its position —
    // clamp the center so edge-column drags keep it fully on-canvas.
    const halfW = 40 * dpr;
    const pad = 4 * dpr;
    const rawX = x + ts * 0.55;
    const clampedX = Math.min(Math.max(rawX, halfW + pad), this.scale.width - halfW - pad);
    this.grassHover.setPosition(clampedX, Math.max(minY, y - ts * 0.9));
  }
```

(`80 * dpr` / `44 * dpr` are the badge dimensions from `showGrassHover`; keep `halfW` in sync if those change.)

- [ ] **Step 2: Verify gates**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual check**

With the dev server running, open `?visual=board-farm-idle` in a narrow viewport (~390px), drag a chain along the rightmost column, confirm the badge stays fully on-screen.

- [ ] **Step 4: Commit**

```bash
git add src/GameScene.ts
git commit -m "UX: keep the chain hover badge on-canvas during edge-column drags"
```

---

### Task 6: Visual scenario, full gates, goldens, PR

**Files:**
- Modify: `src/visualTesting/matrix.ts` (~line 76 scenario list; ~line 152 expectation overrides)
- Possibly refresh: `tests/visual/**__goldens__` (whatever `npm run test:visual:update` touches)

- [ ] **Step 1: Add the invalid-chain scenario**

In `src/visualTesting/matrix.ts`, after the `board-farm-chain-7` entry (~line 76), add:

```ts
  { id: "board-farm-chain-2-short", state: "boardFarm", hash: "#/board", actions: [api("holdChain", { key: "tile_grass_grass", length: 2 })], diff: canvasDiff },
```

And in `expectationOverrideById` (~line 152), add:

```ts
  "board-farm-chain-2-short": "A 2-tile chain is held; the chain panel header shows how many more tiles are needed to collect.",
```

- [ ] **Step 2: Run the full unit + static gates**

Run: `npm run lint && npm run typecheck && npm test`
Expected: all pass. Fix anything that fails before proceeding.

- [ ] **Step 3: Run the visual suite**

Run: `npm run test:visual`
Expected: failures ONLY for (a) the brand-new `board-farm-chain-2-short` scenario (no golden yet) and (b) chain-panel scenarios whose header text intentionally changed. Any other diff is a regression — fix it before continuing.

- [ ] **Step 4: Refresh goldens for intentional diffs and re-run**

Run: `npm run test:visual:update`, then `npm run test:visual`
Expected: green. Inspect the changed golden PNGs (`git diff --stat`) and confirm every one is explained by the chain-header change or the new scenario.

- [ ] **Step 5: Commit goldens + scenario**

```bash
git add src/visualTesting/matrix.ts tests/
git commit -m "UX: visual scenario for the short-chain 'N more to collect' header + refreshed goldens"
```

- [ ] **Step 6: Pre-PR validation and PR**

Use the `pre-pr-check` skill (runs lint+tests+build and generates the PR body in house style). Then:

```bash
git push -u origin claude/phaser-game-ux-768h70
```

Create the PR via the GitHub MCP tools (repo `grimatoma/puzzledrag2`, base `main`), **non-draft** per CLAUDE.md workflow (if the tool forces draft, promote immediately). Once CI-relevant checks are addressed, merge with a **merge commit** (never squash), per CLAUDE.md.
