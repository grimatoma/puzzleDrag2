import { test, expect } from '@playwright/test';
import { inv } from "../src/testUtils/inventory.js";
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers';

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

async function selectRecipe(page, name) {
  await page.getByRole('button', { name: new RegExp(`View recipe ${name}`, 'i') }).click();
  await page.waitForTimeout(100);
}

function detailCraftButton(page) {
  return page.locator('.hl-detail-pane').getByRole('button', { name: /^Craft$/i });
}

test('Bakery: crafting bread debits flour+egg and credits inventory.bread', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { bakery: true },
    inventory: { grain_flour: 6, bird_egg: 2 },
  });
  await openCraftingTab(page, 'bakery');

  await selectRecipe(page, 'Bread Loaf');
  await detailCraftButton(page).click();

  await waitForState(page, (s) => (s.inventory?.bread ?? 0) >= 1);
  const s = await getReactState(page);
  expect(inv(s).grain_flour).toBe(3);
  expect(inv(s).bird_egg).toBe(1);
  expect((s.craftedTotals?.bread ?? 0) + (s.craftedTotals?.rec_bread ?? 0)).toBe(1);
});

test('Workshop: crafting water_pump credits state.tools, NOT inventory (PR #274 routing)', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { home: { wood_plank: 2, tile_mine_stone: 2 } },
    level: 3, // tier-2 recipes require level ≥ 3
  });
  await openCraftingTab(page, 'workshop');

  await selectRecipe(page, 'Water Pump');
  await detailCraftButton(page).click();

  await waitForState(page, (s) => (s.tools?.water_pump ?? 0) >= 1);
  const s = await getReactState(page);
  // Routing assertion: NOT in inventory under the recipe key.
  expect(s.inventory?.water_pump ?? 0).toBe(0);
  expect(inv(s).wood_plank).toBe(1);
  expect(inv(s).tile_mine_stone).toBe(1);
});

test('Workshop: crafting explosives also routes to state.tools', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { home: { tile_grass_hay: 2, tile_special_dirt: 2 } },
    level: 3,
  });
  await openCraftingTab(page, 'workshop');

  await selectRecipe(page, 'Explosives');
  await detailCraftButton(page).click();

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

  await selectRecipe(page, 'Bread Loaf');
  await expect(detailCraftButton(page)).toBeDisabled();
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
  expect(inv(s).grain_flour).toBe(6);
});
