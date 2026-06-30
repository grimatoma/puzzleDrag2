import { test, expect } from '@playwright/test';
import { inv } from "../../src/testUtils/inventory.js";
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
  // rec_bread inputs are { flour: 3, eggs: 1 } (src/constants.ts RECIPES).
  await gotoFresh(page, {
    coins: 500,
    built: { bakery: true },
    inventory: { flour: 6, eggs: 2 },
  });
  await openCraftingTab(page, 'bakery');

  await selectRecipe(page, 'Bread Loaf');
  await detailCraftButton(page).click();

  await waitForState(page, (s) => (inv(s).bread ?? 0) >= 1);
  const s = await getReactState(page);
  expect(inv(s).flour).toBe(3);
  expect(inv(s).eggs).toBe(1);
  expect((s.craftedTotals?.bread ?? 0) + (s.craftedTotals?.rec_bread ?? 0)).toBe(1);
});

// Tool recipes (item.kind === "tool") route the crafted output to state.tools
// rather than inventory — the routing shipped in PR #274. We exercise it with
// REACHABLE workshop tools (rake / fruit_picker). The old water_pump/explosives
// recipes are SCOPED_OUT (deferred, see src/game/scopedOut.ts), so the crafting
// UI deliberately hides them — they can't drive this test.
test('Workshop: crafting rake credits state.tools, NOT inventory (PR #274 routing)', async ({ page }) => {
  // rec_rake inputs are { plank: 1 }; rake is a kind:"tool" recipe.
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { plank: 2 },
  });
  await openCraftingTab(page, 'workshop');

  await selectRecipe(page, 'Rake');
  await detailCraftButton(page).click();

  await waitForState(page, (s) => (s.tools?.rake ?? 0) >= 1);
  const s = await getReactState(page);
  // Routing assertion: credited to tools, NOT inventory under the recipe key.
  expect(inv(s).rake ?? 0).toBe(0);
  expect(inv(s).plank).toBe(1);
});

test('Workshop: crafting fruit_picker also routes to state.tools', async ({ page }) => {
  // rec_fruit_picker inputs are { plank: 2 }; fruit_picker is a kind:"tool" recipe.
  await gotoFresh(page, {
    coins: 500,
    built: { workshop: true },
    inventory: { plank: 3 },
  });
  await openCraftingTab(page, 'workshop');

  await selectRecipe(page, 'Fruit Picker');
  await detailCraftButton(page).click();

  await waitForState(page, (s) => (s.tools?.fruit_picker ?? 0) >= 1);
  const s = await getReactState(page);
  expect(inv(s).fruit_picker ?? 0).toBe(0);
  expect(inv(s).plank).toBe(1);
});

test('CRAFT button is disabled when inputs are missing', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: { bakery: true },
    inventory: { flour: 0, eggs: 0 },
  });
  await openCraftingTab(page, 'bakery');

  await selectRecipe(page, 'Bread Loaf');
  await expect(detailCraftButton(page)).toBeDisabled();
});

test('CRAFTING/CRAFT_RECIPE dispatch with no station built is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 500,
    built: {},
    inventory: { flour: 6, eggs: 2 },
  });
  await dispatchAction(page, { type: 'CRAFTING/CRAFT_RECIPE', recipeKey: 'bread' });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  expect(inv(s).bread ?? 0).toBe(0);
  expect(inv(s).flour).toBe(6);
});
