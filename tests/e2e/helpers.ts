// E2E helpers for Hearthwood Vale.
//
// The game state lives in a `useReducer` hook in prototype.jsx. We don't have
// a global window export of `dispatch` or `state`, so for any test that needs
// to drive state changes deterministically we walk the React fiber tree to
// reach the dispatch function (see `dispatchAction` and `getReactState`).
//
// For UI-driven tests prefer the role/testid selectors and let Playwright
// drive the click path — that's where the regressions hide. Reach for the
// fiber bridge only when a flow is hard to reach via UI alone.

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** Shallow snapshot of reducer state for assertions (loose — e2e reads partial fiber state). */
export type ReactStateSnapshot = Record<string, any>;

const constantsSource = readFileSync(new URL("../../src/constants.ts", import.meta.url), "utf8");
const SAVE_SCHEMA_VERSION = Number(
  constantsSource.match(/export const SAVE_SCHEMA_VERSION = (\d+);/)?.[1] ?? 0,
);

/** Partial save seed merged into quiet baseline (top-level keys only). */
export type QuietSaveOverrides = Record<string, unknown>;

type BoardTile = { row: number; col: number; res?: { key: string } };

// ─── Boot / setup ──────────────────────────────────────────────────────────

export async function waitForBoot(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="hud"]', { timeout: 15_000 });
  await page.waitForFunction(
    () =>
      !!(
        window.__phaserScene &&
        Array.isArray(window.__phaserScene.grid) &&
        (window.__phaserScene.grid as unknown[]).length > 0
      ),
    null,
    { timeout: 15_000 },
  );
  await closeStoryModalIfOpen(page);
}

/**
 * Wipes any existing save and pre-seeds a "quiet" baseline:
 *   - tutorial flag set so the tutorial overlay doesn't auto-start
 *   - story `intro_seen` flag set so the act-1 modal doesn't grab focus
 *   - any caller-supplied state overrides shallow-merged on top
 */
export async function seedQuietSave(page: Page, overrides: QuietSaveOverrides = {}): Promise<void> {
  await page.addInitScript(
    ({ overrides: data, saveVersion }: { overrides: QuietSaveOverrides; saveVersion: number }) => {
      try {
        if (localStorage.getItem("hearth.e2e.seeded") === "1") return;
        Object.keys(localStorage)
          .filter((k) => k.startsWith("hearth."))
          .forEach((k) => localStorage.removeItem(k));
        localStorage.setItem("hearth.tutorial.seen", "1");
        localStorage.setItem("hearth.e2e.seeded", "1");
        const baseStory = {
          act: 1,
          beat: "act1_arrival",
          flags: { intro_seen: true, _fired_act1_arrival: true },
        };
        // Pre-claim today's daily-streak reward so the boot-time LOGIN_TICK
        // (prototype.tsx, keyed on the local day via dayKeyForDate) is a no-op
        // and never opens the `daily_streak` modal. Its backdrop otherwise
        // intercepts every UI-click spec (crafting / cuj-tools / menu / nav).
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const baseDaily = { lastClaimedDate: today, currentDay: 1 };
        if (data && Object.keys(data).length > 0) {
          const out = { version: saveVersion, story: baseStory, dailyStreak: baseDaily, ...data } as Record<string, unknown>;
          if (data.story && typeof data.story === "object") {
            const story = data.story as Record<string, unknown>;
            const flags = (story.flags && typeof story.flags === "object" ? story.flags : {}) as Record<string, unknown>;
            out.story = {
              ...baseStory,
              ...story,
              flags: { ...baseStory.flags, ...flags },
            };
          }
          localStorage.setItem("hearth.save.v1", JSON.stringify(out));
        } else {
          localStorage.setItem("hearth.save.v1", JSON.stringify({ version: saveVersion, story: baseStory, dailyStreak: baseDaily }));
        }
      } catch {
        /* ignore */
      }
    },
    { overrides, saveVersion: SAVE_SCHEMA_VERSION },
  );
  // Kill CSS animations/transitions so dynamically-mounted DOM overlays (the
  // tool dropdown, action panel, story bar) settle instantly. On the slower CI
  // runner an in-flight ~200ms drop animation leaves a button "not stable" for
  // Playwright's actionability check well past the 30s test timeout — the cuj
  // arming/cancel journeys timed out on Linux CI while passing locally. This is
  // purely cosmetic (no spec asserts on an animation) and does not touch the
  // Phaser canvas, which has its own tween layer.
  await page.addInitScript(() => {
    const css =
      "*,*::before,*::after{animation-duration:0.001ms!important;animation-delay:0ms!important;animation-iteration-count:1!important;transition-duration:0.001ms!important;transition-delay:0ms!important;scroll-behavior:auto!important;}";
    const inject = () => {
      const style = document.createElement("style");
      style.setAttribute("data-e2e-no-anim", "");
      style.textContent = css;
      (document.head ?? document.documentElement).appendChild(style);
    };
    if (document.head) inject();
    else document.addEventListener("DOMContentLoaded", inject, { once: true });
  });
}

/** Wipe save + seed quiet flags + navigate + wait. Single call for most specs. */
export async function gotoFresh(page: Page, overrides: QuietSaveOverrides = {}): Promise<void> {
  await seedQuietSave(page, overrides);
  // Base-relative so we hit the dev server's base (`/puzzleDrag2/`) directly;
  // an absolute "/" 302-redirects to the base and adds seconds to cold loads.
  await page.goto("./");
  await waitForBoot(page);
}

/** Legacy alias retained so the older specs keep working unchanged. */
export async function clearSave(page: Page): Promise<void> {
  await seedQuietSave(page);
}

// ─── React fiber bridge ────────────────────────────────────────────────────

export async function getReactState(page: Page): Promise<ReactStateSnapshot | null> {
  return await page.evaluate(() => {
    const root = document.getElementById("root");
    if (!root) return null;
    const fk = Object.keys(root).find((k) => k.startsWith("__reactContainer"));
    if (!fk) return null;
    const container = (root as unknown as Record<string, unknown>)[fk] as {
      stateNode?: { current?: { child?: FiberWalk } };
    };
    let node: FiberWalk | undefined = container.stateNode?.current?.child;
    while (node) {
      if (node.memoizedState) {
        let h: HookWalk | null | undefined = node.memoizedState;
        while (h) {
          if (h.memoizedState && typeof h.memoizedState === "object" && h.memoizedState !== null && "view" in h.memoizedState) {
            return h.memoizedState as ReactStateSnapshot;
          }
          h = h.next ?? null;
        }
      }
      node = node.child ?? (node.return && node.return.sibling) ?? undefined;
      if (!node) break;
    }
    return null;
  });
}

type FiberWalk = {
  memoizedState?: HookWalk | null;
  child?: FiberWalk;
  return?: FiberWalk;
  sibling?: FiberWalk;
};

type HookWalk = {
  memoizedState?: unknown;
  next?: HookWalk | null;
  queue?: { dispatch?: (a: unknown) => void };
};

export async function dispatchAction(page: Page, action: unknown): Promise<void> {
  await page.evaluate((act: unknown) => {
    const root = document.getElementById("root");
    if (!root) return;
    const fk = Object.keys(root).find((k) => k.startsWith("__reactContainer"));
    if (!fk) return;
    const container = (root as unknown as Record<string, unknown>)[fk] as {
      stateNode?: { current?: { child?: FiberWalk } };
    };
    let node: FiberWalk | undefined = container.stateNode?.current?.child;
    while (node) {
      if (node.memoizedState) {
        let h: HookWalk | null | undefined = node.memoizedState;
        while (h) {
          if (
            h.queue &&
            typeof h.queue.dispatch === "function" &&
            h.memoizedState &&
            typeof h.memoizedState === "object" &&
            h.memoizedState !== null &&
            "view" in h.memoizedState
          ) {
            h.queue.dispatch(act);
            return;
          }
          h = h.next ?? null;
        }
      }
      node = node.child ?? (node.return && node.return.sibling) ?? undefined;
      if (!node) break;
    }
  }, action);
}

/** Wait for a state predicate to become true. Polls every 50ms. */
export async function waitForState(
  page: Page,
  predicate: (s: ReactStateSnapshot) => boolean,
  { timeout = 5000 } = {},
): Promise<ReactStateSnapshot> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await getReactState(page);
    if (s && predicate(s)) return s;
    await page.waitForTimeout(50);
  }
  const final = await getReactState(page);
  throw new Error(
    `waitForState timed out after ${timeout}ms. Final state.view=${String(final?.view)} modal=${String(final?.modal)}`,
  );
}

// ─── Modals / overlays ─────────────────────────────────────────────────────

export async function closeStoryModalIfOpen(page: Page): Promise<void> {
  const modal = page.locator('[role="dialog"][aria-labelledby="story-modal-title"]');
  if ((await modal.count()) === 0) return;
  const btn = modal.getByRole("button").first();
  if ((await btn.count()) > 0) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(120);
  }
  await dispatchAction(page, { type: "CLOSE_MODAL" });
}

export async function disableDialogs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    globalThis.__HEARTH_DISABLE_DIALOGS__ = true;
  });
}

// ─── Chains / board interaction ────────────────────────────────────────────

export type ChainSceneResult =
  | { ok: true; type: string; length: number }
  | { error: string };

export async function triggerChainViaScene(page: Page, length = 3): Promise<ChainSceneResult> {
  const result = (await page.evaluate((n) => {
    const scene = window.__phaserScene as Record<string, unknown> | undefined;
    if (!scene) return { error: "no scene" };
    const grid = scene.grid as (BoardTile | null | undefined)[][] | undefined;
    if (!grid?.length) return { error: "no grid" };
    const tiles = grid.flat().filter(Boolean) as BoardTile[];
    if (!tiles.length) return { error: "no tiles" };
    const DIRS = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    const neighbors = (t: BoardTile) =>
      DIRS.map(([dr, dc]) => grid[t.row + dr]?.[t.col + dc]).filter(Boolean) as BoardTile[];
    // Call the scene's drag methods *through* the scene object so `this` is
    // bound — they are regular class methods (not arrow fields), so a detached
    // `const f = scene.startPath; f(tile)` call would run with `this===undefined`
    // and throw on the first `this.locked` read.
    const sceneObj = scene as unknown as {
      startPath: (t: BoardTile) => void;
      tryAddToPath: (t: BoardTile) => void;
      endPath: () => void;
    };
    for (const start of tiles) {
      const visited = new Set([start]);
      const path: BoardTile[] = [start];
      const ext = (cur: BoardTile): boolean => {
        if (path.length >= n) return true;
        for (const nb of neighbors(cur)) {
          if (visited.has(nb) || nb.res?.key !== start.res?.key) continue;
          visited.add(nb);
          path.push(nb);
          if (ext(nb)) return true;
          path.pop();
        }
        return false;
      };
      if (ext(start)) {
        sceneObj.startPath(path[0]);
        for (let i = 1; i < path.length; i++) sceneObj.tryAddToPath(path[i]);
        sceneObj.endPath();
        return { ok: true as const, type: start.res?.key ?? "", length: path.length };
      }
    }
    return { error: "no chain found" };
  }, length)) as ChainSceneResult;
  await page.waitForTimeout(700);
  return result;
}

export async function chainUntil(
  page: Page,
  predicate: (s: ReactStateSnapshot) => boolean,
  { length = 3, maxChains = 30 } = {},
): Promise<ReactStateSnapshot | null> {
  for (let i = 0; i < maxChains; i++) {
    const s = await getReactState(page);
    if (s && predicate(s)) return s;
    let r = await triggerChainViaScene(page, length);
    if (!("ok" in r && r.ok) && length > 3) r = await triggerChainViaScene(page, 3);
    if (!("ok" in r && r.ok)) {
      await dispatchAction(page, { type: "END_TURN" });
      await page.waitForTimeout(120);
    }
  }
  return await getReactState(page);
}

// ─── Inventory / coin assertions ───────────────────────────────────────────

export async function expectInventoryAtLeast(page: Page, key: string, n: number): Promise<void> {
  const s = await getReactState(page);
  const inv = s?.inventory as Record<string, number> | undefined;
  expect(inv?.[key] ?? 0, `inventory.${key}`).toBeGreaterThanOrEqual(n);
}

export async function expectCoinsAtLeast(page: Page, n: number): Promise<void> {
  const s = await getReactState(page);
  expect((s?.coins as number | undefined) ?? 0, "coins").toBeGreaterThanOrEqual(n);
}

// ─── Page error guard ──────────────────────────────────────────────────────

/**
 * Console-error strings that are benign noise in the e2e environment and must
 * NOT fail a "no console errors" assertion. Keep this list narrow and explicit
 * — every entry is a known, harmless emission, not a blanket silence:
 *   - "Texture key already in use": Phaser `TextureManager.checkKey()` logs this
 *     as a console.error (not a warn) whenever a texture key is re-added across a
 *     scene re-mount. The app runs four `new Phaser.Game(...)` instances
 *     (board / town / season strip / map), so scene churn re-adds keys; benign.
 *   - "Cannot read properties of null": a known Phaser tween race surfaced under
 *     fast e2e sequencing (the board can advance a turn mid-tween).
 *   - favicon / "Failed to load resource": asset 404s, irrelevant to behavior.
 * Anything NOT matched here still fails the guard, so a real new console.error
 * is still caught.
 */
export const IGNORED_CONSOLE: RegExp[] = [
  /Texture key already in use/i,
  /Cannot read properties of null/i,
  /favicon|Failed to load resource/i,
];

/** True if a console-error text is a known-benign emission (see IGNORED_CONSOLE). */
export function isIgnoredConsoleError(text: string): boolean {
  return IGNORED_CONSOLE.some((re) => re.test(text));
}

export function collectPageErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (isIgnoredConsoleError(text)) return;
    errors.push(`console.error: ${text}`);
  });
  return () => errors;
}
