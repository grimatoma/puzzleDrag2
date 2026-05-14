import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Crafting flow coverage. The crafting screen lives at view='crafting'
 * (opened by the 🔨 Craft nav button or by clicking a station card in town).
 *
 * Each station tab (bakery / larder / forge / workshop) renders the recipes
 * with `recipe.station === <tab>`. The CRAFT button dispatches
 * CRAFTING/CRAFT_RECIPE and either credits state.inventory[recipeKey] or
 * (for tool recipes — water_pump, explosives) credits state.tools[recipe.tool].
 * The latter is the routing fix shipped in #274.
 */

async function openCraftingTab(page, tab) {
  await dispatchAction(page, { type: 'SET_VIEW', view: 'crafting', craftingTab: tab });
  await waitForState(page, (s) => s.view === 'crafting');
  await page.waitForTimeout(150);
}

test('Bakery: crafting bread debits flour+egg and credits inventory.bread', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { bakery: true },
    inventory: { grain_flour: 6, bird_egg: 2 },
  });
  await openCraftingTab(page, 'bakery');

  // The recipe card wraps "Bread Loaf" three ancestors deep — span > flex-col >
  // outer card. Reach the card and click its CRAFT button.
  const breadRow = page.getByText('Bread Loaf').locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
  await breadRow.getByRole('button', { name: 'CRAFT' }).click();

  await waitForState(page, (s) => (s.inventory?.bread ?? 0) >= 1);
  const s = await getReactState(page);
  expect(s.inventory.grain_flour).toBe(3);
  expect(s.inventory.bird_egg).toBe(1);
  expect((s.craftedTotals?.rec_bread ?? 0) + (s.craftedTotals?.bread ?? 0)).toBe(1);
});

test('Workshop: crafting water_pump credits state.tools, NOT inventory (PR #274 routing)', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { wood_plank: 2, mine_stone: 2 },
    level: 3, // tier-2 recipes require level ≥ 3
  });
  await openCraftingTab(page, 'workshop');

  const row = page.getByText('Water Pump').locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
  await row.getByRole('button', { name: 'CRAFT' }).click();

  await waitForState(page, (s) => (s.tools?.water_pump ?? 0) >= 1);
  const s = await getReactState(page);
  // Routing assertion: NOT in inventory under the recipe key.
  expect(s.inventory?.water_pump ?? 0).toBe(0);
  expect(s.inventory.wood_plank).toBe(1);
  expect(s.inventory.mine_stone).toBe(1);
});

test('Workshop: crafting explosives also routes to state.tools', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { grass_hay: 2, mine_dirt: 2 },
    level: 3,
  });
  await openCraftingTab(page, 'workshop');

  const row = page.getByText('Explosives').locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
  await row.getByRole('button', { name: 'CRAFT' }).click();

  await waitForState(page, (s) => (s.tools?.explosives ?? 0) >= 1);
  const s = await getReactState(page);
  expect(s.inventory?.explosives ?? 0).toBe(0);
});

test('CRAFT button is disabled when inputs are missing', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { bakery: true },
    inventory: { grain_flour: 0, bird_egg: 0 },
  });
  await openCraftingTab(page, 'bakery');

  const breadRow = page.getByText('Bread Loaf').locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
  const btn = breadRow.getByRole('button', { name: /CRAFT|No station|🔒/ });
  await expect(btn).toBeDisabled();
});

test('CRAFTING/CRAFT_RECIPE dispatch with no station built is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: {},
    inventory: { grain_flour: 6, bird_egg: 2 },
  });
  await dispatchAction(page, { type: 'CRAFTING/CRAFT_RECIPE', recipeKey: 'bread' });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  expect(s.inventory?.bread ?? 0).toBe(0);
  expect(s.inventory.grain_flour).toBe(6);
});
