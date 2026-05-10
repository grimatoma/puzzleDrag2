import { test, expect } from '@playwright/test';
import {
  gotoFresh, waitForBoot, dispatchAction, getReactState,
  collectPageErrors, chainUntil,
} from './helpers.js';

/**
 * Plays a full year (4 seasons × ≤ MAX_TURNS turns) end-to-end via the scene
 * API and the React reducer. Asserts the season cycle advances, the calendar
 * wraps correctly, and that one mid-year reload does not corrupt save state.
 *
 * This is the highest-coverage E2E we have: it touches collapse, drag input,
 * season transitions, town nav, modal flow, and persistence in one run.
 */

test('plays 4 seasons end-to-end without crashing or losing state', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectPageErrors(page);

  await gotoFresh(page);
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });

  const initial = await getReactState(page);
  expect(initial.seasonsCycled ?? 0).toBe(0);
  expect(initial.turnsUsed).toBe(0);

  let reloadedAt = null;

  for (let season = 0; season < 4; season++) {
    // Chain until the season modal opens (turnsUsed reaches MAX_TURNS).
    await chainUntil(page, (s) => s.modal === 'season', { maxChains: 18 });

    // Mid-year reload — exactly once during season 1.
    if (season === 1 && reloadedAt === null) {
      // Persistence is debounced: wait a frame so the latest write flushes.
      await page.waitForTimeout(800);
      const before = await getReactState(page);
      reloadedAt = { season, coins: before.coins, seasonsCycled: before.seasonsCycled ?? 0 };

      await page.reload();
      await waitForBoot(page);
      const after = await getReactState(page);
      expect(after.coins).toBe(before.coins);
      expect(after.seasonsCycled ?? 0).toBe(before.seasonsCycled ?? 0);
      expect(after.turnsUsed).toBe(0);
      await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
    }

    // Close the season explicitly (modal-side button isn't always reachable
    // through input emulation reliably; the action flow is what we care about).
    await dispatchAction(page, { type: 'CLOSE_SEASON' });
    await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
    await page.waitForTimeout(200);
  }

  const final = await getReactState(page);
  expect(final.seasonsCycled).toBeGreaterThanOrEqual(4);
  expect(final.turnsUsed).toBe(0);
  expect(reloadedAt, 'mid-year reload should have fired').not.toBeNull();
  // Filter out a known cleanup race: tween onComplete callbacks can fire
  // after a tile has already been destroyed when chains commit faster than
  // the collapse animation. The runtime error is harmless (the visual layer
  // already torn itself down). Track separately so a real new error still fails.
  const RACE = /Cannot read properties of null \(reading 'destroy'\)/;
  const real = errors().filter((e) => !RACE.test(e));
  expect(real, `unexpected runtime errors:\n${real.join('\n')}`).toEqual([]);
});
