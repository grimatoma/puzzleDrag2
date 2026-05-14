// E2E helpers for Hearthwood Vale.
//
// The app exposes a tiny test bridge only when Vite runs with VITE_E2E=1.
// That keeps production clean while making tests independent from React's
// private fiber internals.

import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const constantsPath = fileURLToPath(new URL('../../src/constants.js', import.meta.url));
const constantsSource = readFileSync(constantsPath, 'utf8');
const SAVE_SCHEMA_VERSION = Number(constantsSource.match(/export const SAVE_SCHEMA_VERSION = (\d+);/)?.[1]);
if (!Number.isFinite(SAVE_SCHEMA_VERSION)) {
  throw new Error('Could not read SAVE_SCHEMA_VERSION from src/constants.js');
}

// ─── Boot / setup ──────────────────────────────────────────────────────────

function normalizeBuiltForSave(built) {
  if (!built || typeof built !== 'object') return undefined;
  if (built.home || built.meadow || built.river || built.forest || built.mountain) return built;
  const home = { hearth: true, decorations: {}, _plots: { 0: 'hearth' } };
  for (const [id, value] of Object.entries(built)) {
    if (id === 'decorations' && value && typeof value === 'object') home.decorations = value;
    else if (id === '_plots' && value && typeof value === 'object') home._plots = value;
    else if (value) home[id] = value;
  }
  return { home };
}

function normalizeOverridesForSave(overrides = {}) {
  const baseStory = {
    act: 1,
    beat: 'act1_arrival',
    flags: { intro_seen: true, _fired_act1_arrival: true },
  };
  const out = { ...overrides, version: SAVE_SCHEMA_VERSION };
  out.story = {
    ...baseStory,
    ...(overrides.story || {}),
    flags: { ...baseStory.flags, ...(overrides.story?.flags || {}) },
    queuedBeat: null,
    beatQueue: [],
    sandbox: false,
  };
  const built = normalizeBuiltForSave(overrides.built);
  if (built) out.built = built;
  return out;
}

/**
 * Wipes any existing save and pre-seeds a quiet baseline:
 *   - tutorial flag set so the tutorial overlay doesn't auto-start
 *   - story intro fired so the act-1 modal doesn't grab focus
 *   - caller overrides shallow-merged on top, with legacy flat `built` values
 *     converted to the current zone-scoped `built.home` shape
 */
export async function seedQuietSave(page, overrides = {}) {
  await page.addInitScript(({ data }) => {
    try {
      if (localStorage.getItem('hearth.e2e.seeded') === '1') return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith('hearth.'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('hearth.tutorial.seen', '1');
      localStorage.setItem('hearth.e2e.seeded', '1');
      localStorage.setItem('hearth.save.v1', JSON.stringify(data));
    } catch {
      // Some browser modes disable localStorage; tests will fail at boot if so.
    }
  }, { data: normalizeOverridesForSave(overrides) });
}

export async function waitForAppBoot(page) {
  await page.waitForSelector('#root', { timeout: 15_000 });
  await page.waitForFunction(
    () => !!(window.__hearthE2E?.getState && window.__hearthE2E?.dispatch && window.__hearthE2E.getState()?.view),
    null,
    { timeout: 15_000 },
  );
  await page.waitForSelector('[data-testid="hud"]', { timeout: 15_000 });
  await closeStoryModalIfOpen(page);
}

export async function waitForBoardBoot(page) {
  await waitForState(page, (s) => s.view === 'board', { timeout: 10_000 });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15_000 });
  await page.waitForFunction(
    () => !!(window.__phaserScene && Array.isArray(window.__phaserScene.grid) && window.__phaserScene.grid.length > 0),
    null,
    { timeout: 15_000 },
  );
}

/** Back-compat alias for specs that only need app readiness. */
export async function waitForBoot(page) {
  await waitForAppBoot(page);
}

/** Wipe save + seed quiet flags + navigate + wait for the Town-first app. */
export async function gotoFresh(page, overrides = {}) {
  await seedQuietSave(page, overrides);
  await page.goto('/');
  await waitForAppBoot(page);
}

/** Legacy alias retained so older specs can seed before their own navigation. */
export async function clearSave(page) {
  await seedQuietSave(page);
}

export async function enterBoard(page, payload = {}) {
  await dispatchAction(page, {
    type: 'FARM/ENTER',
    payload: { selectedTiles: [], useFertilizer: false, ...payload },
  });
  await waitForBoardBoot(page);
}

// ─── Test bridge ────────────────────────────────────────────────────────────

export async function getReactState(page) {
  return await page.evaluate(() => {
    if (!window.__hearthE2E?.getState) {
      throw new Error('Missing window.__hearthE2E bridge. Start Vite with VITE_E2E=1.');
    }
    return window.__hearthE2E.getState();
  });
}

export async function dispatchAction(page, action) {
  await page.evaluate((act) => {
    if (!window.__hearthE2E?.dispatch) {
      throw new Error('Missing window.__hearthE2E bridge. Start Vite with VITE_E2E=1.');
    }
    window.__hearthE2E.dispatch(act);
  }, action);
  await page.waitForTimeout(0);
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
  throw new Error(`waitForState timed out after ${timeout}ms. Final state.view=${final?.view} modal=${final?.modal} queuedBeat=${final?.story?.queuedBeat?.id}`);
}

// ─── Modals / overlays ─────────────────────────────────────────────────────

/** Dismiss the story modal if it's present. No-op if not. */
export async function closeStoryModalIfOpen(page) {
  const modal = page.locator('[role="dialog"][aria-labelledby="story-modal-title"]');
  if (await modal.count() === 0) return;
  await dispatchAction(page, { type: 'STORY/DISMISS_MODAL' });
  await page.waitForTimeout(120);
}

// ─── Chains / board interaction ────────────────────────────────────────────

/**
 * Find a same-key chain of length `n` on the current board and play it through
 * the scene API. Returns `{ ok, type, length }` on success or `{ error }`.
 */
export async function triggerChainViaScene(page, length = 3) {
  const result = await page.evaluate(async (n) => {
    const scene = window.__phaserScene;
    if (!scene) return { error: 'no scene' };
    const grid = scene.grid;
    if (!grid?.length) return { error: 'no grid' };
    const tiles = grid.flat().filter(Boolean);
    if (!tiles.length) return { error: 'no tiles' };
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
  await page.waitForTimeout(700);
  return result;
}

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

export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  return () => errors;
}
