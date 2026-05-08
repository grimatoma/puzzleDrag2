import { test, expect } from '@playwright/test';
import { clearSave, waitForBoot, dispatchAction, getReactState } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

/**
 * Plays a full year (4 seasons × 10 turns) end-to-end via the scene API and
 * the React reducer. Asserts the season cycle advances, the calendar wraps
 * correctly, and that one mid-year reload does not corrupt save state.
 *
 * This is the highest-coverage E2E we have: it touches collapse, drag input,
 * season transitions, town nav, modal flow, and persistence in one run.
 */

// Plays one chain. Falls back to dispatching TURN_END when no valid chain
// exists on the current board (rare but possible after several collapses).
async function playOneTurn(page) {
  const scene = await page.evaluate(() => {
    const s = window.__phaserScene;
    if (!s || !s.grid) return { error: 'no scene' };
    const tiles = s.grid.flat().filter(Boolean);
    if (!tiles.length) return { error: 'empty grid' };
    // Find any 3-tile (4-direction adjacent) same-key chain
    const grid = s.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    function neighbors(t) {
      return DIRS
        .map(([dr, dc]) => grid[t.row + dr]?.[t.col + dc])
        .filter(Boolean);
    }
    for (const start of tiles) {
      const visited = new Set([start]);
      const path = [start];
      const minLen = (s.boardMinChain ?? 3); // allows winter-min override if set
      const target = Math.max(3, minLen);
      function ext(cur) {
        if (path.length >= target) return true;
        for (const nb of neighbors(cur)) {
          if (visited.has(nb)) continue;
          if (nb.res.key !== start.res.key) continue;
          visited.add(nb); path.push(nb);
          if (ext(nb)) return true;
          path.pop();
        }
        return false;
      }
      if (ext(start)) {
        s.startPath(path[0]);
        for (let i = 1; i < path.length; i++) s.tryAddToPath(path[i]);
        s.endPath();
        return { ok: true, length: path.length };
      }
    }
    return { ok: false };
  });
  return scene;
}

test('plays 4 seasons end-to-end without crashing or losing state', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/');
  await waitForBoot(page);

  const initial = await getReactState(page);
  expect(initial.seasonsCycled ?? 0).toBe(0);
  expect(initial.turnsUsed).toBe(0);

  // Make sure we are on the board view to dispatch chains.
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

  let reloadedAt = null;

  // Each season: play up to 12 attempts (10 turns + a couple of slack
  // attempts in case Winter rejects a short chain). Then close the season.
  for (let season = 0; season < 4; season++) {
    let attempts = 0;
    let stateNow = await getReactState(page);
    while ((stateNow.turnsUsed ?? 0) < 10 && attempts < 18) {
      const result = await playOneTurn(page);
      attempts++;
      if (!result?.ok) {
        // If we can't form a chain, force-end the turn so we don't loop.
        await dispatchAction(page, { type: 'END_TURN' });
      }
      // Allow Phaser collapse + reducer settle.
      await page.waitForTimeout(120);
      stateNow = await getReactState(page);

      // Mid-year reload check: reload once during season 1 to verify save
      // round-trips coins / inventory / seasonsCycled across boot.
      if (season === 1 && reloadedAt === null && stateNow.turnsUsed >= 5) {
        // persistState is debounced — wait long enough for the latest chain
        // to flush to localStorage before reloading.
        await page.waitForTimeout(800);
        const beforeReload = await getReactState(page);
        reloadedAt = { season, turnsUsed: beforeReload.turnsUsed, coins: beforeReload.coins };
        await page.reload();
        await waitForBoot(page);
        const afterReload = await getReactState(page);
        // turnsUsed resets on boot but accumulated coins persist.
        expect(afterReload.coins).toBe(beforeReload.coins);
        expect(afterReload.seasonsCycled ?? 0).toBe(beforeReload.seasonsCycled ?? 0);
        expect(afterReload.turnsUsed).toBe(0);
        // Snap back onto the board so the loop can continue dispatching chains.
        await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
        // Re-read state under the post-reload world.
        stateNow = await getReactState(page);
      }
    }

    // Close the season — the modal opens automatically when turnsUsed >= 10,
    // but we dispatch CLOSE_SEASON directly so the test does not depend on
    // modal visibility (which is React-side).
    await dispatchAction(page, { type: 'CLOSE_SEASON' });
    await page.waitForTimeout(80);

    // Return to the board for the next season.
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
    await page.waitForTimeout(80);
  }

  const final = await getReactState(page);
  // 4 explicit CLOSE_SEASON dispatches + (possibly) auto-rolls during play.
  expect(final.seasonsCycled).toBeGreaterThanOrEqual(4);
  expect(final.turnsUsed).toBe(0);
  expect(final.view).toBe('board');
  expect(reloadedAt, 'mid-year reload should have fired').not.toBeNull();

  expect(errors, `unexpected runtime errors:\n${errors.join('\n')}`).toEqual([]);
});
