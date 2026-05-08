import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Hazards. Rats are the farm-biome pest; chaining 3+ rat tiles clears them
 * and credits +5◉ per rat. Fire spawns on the mine biome; chaining a fire
 * tile or using explosives clears it.
 *
 * We seed the state directly because the spawn paths depend on board RNG
 * and inventory thresholds — the slice math is what we're verifying here.
 */

test('Rat chain of 3 clears the rats and rewards coins', async ({ page }) => {
  await gotoFresh(page, {
    coins: 0,
    biome: 'farm',
    biomeKey: 'farm',
    hazards: { rats: [
      { row: 0, col: 0, age: 1 },
      { row: 0, col: 1, age: 1 },
      { row: 0, col: 2, age: 1 },
    ] },
  });
  // COMMIT_CHAIN with three rat tiles — the rat path captures and clears.
  await dispatchAction(page, {
    type: 'COMMIT_CHAIN',
    chain: [
      { key: 'rat', row: 0, col: 0 },
      { key: 'rat', row: 0, col: 1 },
      { key: 'rat', row: 0, col: 2 },
    ],
  });
  await waitForState(page, (s) => (s.hazards?.rats ?? []).length === 0);
  const s = await getReactState(page);
  // 3 rats × RAT_CLEAR_REWARD_PER (=5) = 15 coins.
  expect(s.coins).toBe(15);
});

test('Rat chain shorter than 3 is rejected (no reward, rats remain)', async ({ page }) => {
  await gotoFresh(page, {
    coins: 0,
    biome: 'farm',
    biomeKey: 'farm',
    hazards: { rats: [
      { row: 0, col: 0, age: 1 },
      { row: 0, col: 1, age: 1 },
    ] },
  });
  await dispatchAction(page, {
    type: 'COMMIT_CHAIN',
    chain: [
      { key: 'rat', row: 0, col: 0 },
      { key: 'rat', row: 0, col: 1 },
    ],
  });
  await page.waitForTimeout(200);
  const s = await getReactState(page);
  expect(s.coins).toBe(0);
  expect((s.hazards?.rats ?? []).length).toBe(2);
});

test('Mixed chain (rat + non-rat) is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 0,
    biome: 'farm',
    biomeKey: 'farm',
    hazards: { rats: [
      { row: 0, col: 0, age: 1 },
      { row: 0, col: 1, age: 1 },
      { row: 0, col: 2, age: 1 },
    ] },
  });
  await dispatchAction(page, {
    type: 'COMMIT_CHAIN',
    chain: [
      { key: 'rat', row: 0, col: 0 },
      { key: 'rat', row: 0, col: 1 },
      { key: 'grass_hay', row: 0, col: 2 },
    ],
  });
  await page.waitForTimeout(200);
  const s = await getReactState(page);
  expect(s.coins).toBe(0);
  expect((s.hazards?.rats ?? []).length).toBe(3);
});
