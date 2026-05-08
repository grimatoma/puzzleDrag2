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

import { expect } from '@playwright/test';

// ─── Boot / setup ──────────────────────────────────────────────────────────

export async function waitForBoot(page) {
  // Phaser is lazy-loaded. Wait for the HUD (always rendered) and for the
  // GameScene to have built its grid. Polling for window.__phaserScene + grid
  // is more reliable than text content, which moves around between layouts.
  await page.waitForSelector('[data-testid="hud"]', { timeout: 15_000 });
  await page.waitForFunction(
    () => !!(window.__phaserScene && Array.isArray(window.__phaserScene.grid) && window.__phaserScene.grid.length > 0),
    null,
    { timeout: 15_000 },
  );
  // The story modal can intercept early clicks on first session — dismiss it
  // if present so callers don't have to litter `closeStoryModal` everywhere.
  await closeStoryModalIfOpen(page);
}

/**
 * Wipes any existing save and pre-seeds a "quiet" baseline:
 *   - tutorial flag set so the tutorial overlay doesn't auto-start
 *   - story `intro_seen` flag set so the act-1 modal doesn't grab focus
 *   - any caller-supplied state overrides shallow-merged on top
 *
 * Pass overrides like `{ inventory: { wood_plank: 5 }, built: { workshop: true } }`
 * to seed a state that lets you exercise a downstream feature without first
 * grinding chains. Keys merge top-level only — nested objects are replaced
 * wholesale.
 */
export async function seedQuietSave(page, overrides = {}) {
  // The init script runs on every navigation (including page.reload). We
  // gate seeding on a `hearth.e2e.seeded` marker so an in-flight save
  // produced during the test isn't clobbered when the page reloads —
  // the persistence path tests need that round-trip to actually work.
  await page.addInitScript((data) => {
    try {
      if (localStorage.getItem('hearth.e2e.seeded') === '1') return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith('hearth.'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('hearth.tutorial.seen', '1');
      localStorage.setItem('hearth.e2e.seeded', '1');
      const baseStory = { act: 1, beat: 'act1_arrival', flags: { intro_seen: true, _fired_act1_arrival: true } };
      // SAVE_SCHEMA_VERSION must match src/constants.js — the loader discards
      // saves whose version doesn't match and falls back to a fresh state.
      // Bump this whenever you bump SAVE_SCHEMA_VERSION in constants.
      const SAVE_VERSION = 20;
      if (data && Object.keys(data).length > 0) {
        const out = { version: SAVE_VERSION, story: baseStory, ...data };
        if (data.story) {
          out.story = {
            ...baseStory,
            ...data.story,
            flags: { ...baseStory.flags, ...(data.story.flags || {}) },
          };
        }
        localStorage.setItem('hearth.save.v1', JSON.stringify(out));
      } else {
        localStorage.setItem('hearth.save.v1', JSON.stringify({ version: SAVE_VERSION, story: baseStory }));
      }
    } catch {}
  }, overrides);
}

/** Wipe save + seed quiet flags + navigate + wait. Single call for most specs. */
export async function gotoFresh(page, overrides = {}) {
  await seedQuietSave(page, overrides);
  await page.goto('/');
  await waitForBoot(page);
}

/** Legacy alias retained so the older specs keep working unchanged. */
export async function clearSave(page) {
  await seedQuietSave(page);
}

// ─── React fiber bridge ────────────────────────────────────────────────────

export async function getReactState(page) {
  return await page.evaluate(() => {
    const root = document.getElementById('root');
    const fk = Object.keys(root).find((k) => k.startsWith('__reactContainer'));
    let node = root[fk].stateNode.current.child;
    while (node) {
      if (node.memoizedState) {
        let h = node.memoizedState;
        while (h) {
          if (h.memoizedState && typeof h.memoizedState === 'object' && 'view' in h.memoizedState) {
            return h.memoizedState;
          }
          h = h.next;
        }
      }
      node = node.child || (node.return && node.return.sibling);
      if (!node) break;
    }
    return null;
  });
}

export async function dispatchAction(page, action) {
  await page.evaluate((act) => {
    const root = document.getElementById('root');
    const fk = Object.keys(root).find((k) => k.startsWith('__reactContainer'));
    let node = root[fk].stateNode.current.child;
    while (node) {
      if (node.memoizedState) {
        let h = node.memoizedState;
        while (h) {
          if (h.queue && typeof h.queue.dispatch === 'function' && h.memoizedState && 'view' in h.memoizedState) {
            h.queue.dispatch(act);
            return;
          }
          h = h.next;
        }
      }
      node = node.child || (node.return && node.return.sibling);
      if (!node) break;
    }
  }, action);
}

/** Wait for a state predicate to become true. Polls every 50ms. */
export async function waitForState(page, predicate, { timeout = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await getReactState(page);
    if (s && predicate(s)) return s;
    await page.waitForTimeout(50);
  }
  const final = await getReactState(page);
  throw new Error(`waitForState timed out after ${timeout}ms. Final state.view=${final?.view} modal=${final?.modal}`);
}

// ─── Modals / overlays ─────────────────────────────────────────────────────

/** Dismiss the story modal if it's present. No-op if not. */
export async function closeStoryModalIfOpen(page) {
  const modal = page.locator('[role="dialog"][aria-labelledby="story-modal-title"]');
  if (await modal.count() === 0) return;
  // The story modal renders an explicit close/continue button.
  const btn = modal.getByRole('button').first();
  if (await btn.count() > 0) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(120);
  }
  // Belt-and-braces: dispatch CLOSE_MODAL in case the click missed.
  await dispatchAction(page, { type: 'CLOSE_MODAL' });
}

// ─── Chains / board interaction ────────────────────────────────────────────

/**
 * Find a same-key chain of length `n` on the current board (4-direction
 * adjacency, mirroring the runtime's path validator) and play it through
 * the scene API. Returns `{ ok, type, length }` on success or
 * `{ error }` on failure.
 */
export async function triggerChainViaScene(page, length = 3) {
  const result = await page.evaluate(async (n) => {
    const scene = window.__phaserScene;
    if (!scene) return { error: 'no scene' };
    const grid = scene.grid;
    if (!grid?.length) return { error: 'no grid' };
    const tiles = grid.flat().filter(Boolean);
    if (!tiles.length) return { error: 'no tiles' };
    // 8-direction adjacency mirrors GameScene.tryAddToPath (which accepts
    // diagonals). Restricting to 4-direction here misses many valid chains
    // and exhausts the helper after 2-3 plays even though the board is full.
    const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const neighbors = (t) => DIRS.map(([dr, dc]) => grid[t.row + dr]?.[t.col + dc]).filter(Boolean);
    for (const start of tiles) {
      const visited = new Set([start]);
      const path = [start];
      const ext = (cur) => {
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
        scene.startPath(path[0]);
        for (let i = 1; i < path.length; i++) scene.tryAddToPath(path[i]);
        scene.endPath();
        return { ok: true, type: start.res.key, length: path.length };
      }
    }
    return { error: 'no chain found' };
  }, length);
  // Allow Phaser to settle (collapse + reducer flush). Collapse animations
  // run ~250-400ms; refill is debounced to next frame. 600ms is comfortably
  // past both, so the next call sees a stable grid with new tiles.
  await page.waitForTimeout(700);
  return result;
}

/**
 * Repeatedly chain on the current board until `predicate(state)` is true,
 * or `maxChains` attempts have been made. Returns the final state.
 *
 * If a chain can't be formed at the given length, falls back to length 3 and
 * eventually dispatches END_TURN to keep progress moving.
 */
export async function chainUntil(page, predicate, { length = 3, maxChains = 30 } = {}) {
  for (let i = 0; i < maxChains; i++) {
    const s = await getReactState(page);
    if (s && predicate(s)) return s;
    let r = await triggerChainViaScene(page, length);
    if (!r.ok && length > 3) r = await triggerChainViaScene(page, 3);
    if (!r.ok) {
      await dispatchAction(page, { type: 'END_TURN' });
      await page.waitForTimeout(120);
    }
  }
  return await getReactState(page);
}

// ─── Inventory / coin assertions ───────────────────────────────────────────

export async function expectInventoryAtLeast(page, key, n) {
  const s = await getReactState(page);
  expect(s.inventory?.[key] ?? 0, `inventory.${key}`).toBeGreaterThanOrEqual(n);
}

export async function expectCoinsAtLeast(page, n) {
  const s = await getReactState(page);
  expect(s.coins ?? 0, 'coins').toBeGreaterThanOrEqual(n);
}

// ─── Page error guard ──────────────────────────────────────────────────────
/**
 * Hook a `pageerror` + `console.error` listener and return a getter that
 * resolves to the collected list. Use at the top of a test:
 *
 *   const errors = collectPageErrors(page);
 *   …test body…
 *   expect(errors(), 'no runtime errors').toEqual([]);
 */
export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  return () => errors;
}
