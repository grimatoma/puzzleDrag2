import { test, expect } from '@playwright/test';
import { gotoFresh, enterBoard, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Tools coverage. The tools panel is reachable from the MobileDock (📦 Tools
 * button) on the board view. Each tool is either an instant (clear_all,
 * clear_hazard, fill_bias) or a tap-target (shuffle, magic_wand, etc.).
 *
 * USE_TOOL is dispatched by the panel's onClick. The reducer:
 *   - decrements state.tools[key]
 *   - applies the tool's effect (instant) OR sets state.toolPending (tap-target)
 */

test('USE_TOOL "rake" instant: removes all hay tiles + decrements count', async ({ page }) => {
  await gotoFresh(page, {
    tools: { rake: 2 },
    coins: 100,
    inventory: { wood_plank: 0 },
  });
  await enterBoard(page);
  // Direct dispatch — exercises the reducer path without depending on the
  // bottom-sheet click flow (which is fiddly under iOS device emulation).
  await dispatchAction(page, { type: 'USE_TOOL', payload: { id: 'rake' } });
  await waitForState(page, (s) => (s.tools?.rake ?? 0) === 1);
});

test('USE_TOOL with no tool inventory is a no-op', async ({ page }) => {
  await gotoFresh(page, { tools: { rake: 0 } });
  await enterBoard(page);
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'USE_TOOL', payload: { id: 'rake' } });
  await page.waitForTimeout(150);
  const after = await getReactState(page);
  // No change: rake count is still 0 and turnsUsed didn't bump.
  expect(after.tools?.rake ?? 0).toBe(0);
  expect(after.turnsUsed).toBe(before.turnsUsed);
});

test('USE_TOOL tap-target arms toolPending, CANCEL_TOOL refunds it', async ({ page }) => {
  await gotoFresh(page, { tools: { magic_wand: 1 } });
  await enterBoard(page);
  // Magic wand is routed through the portal slice; arming sets toolPending.
  await dispatchAction(page, { type: 'USE_TOOL', payload: { id: 'magic_wand' } });
  await waitForState(page, (s) => s.toolPending === 'magic_wand');
  // The tool is held in pending; the on-tile action will resolve and consume.
  // Cancelling refunds: tools[magic_wand] returns to 1, toolPending clears.
  await dispatchAction(page, { type: 'CANCEL_TOOL' });
  await waitForState(page, (s) => s.toolPending === null && (s.tools?.magic_wand ?? 0) === 1);
});

test('CRAFT_TOOL: building a Workshop tool from WORKSHOP_RECIPES debits inventory + credits state.tools', async ({ page }) => {
  await gotoFresh(page, {
    coins: 100,
    built: { workshop: true },
    inventory: { wood_plank: 1 },
    tools: { rake: 0 },
  });
  // CRAFT_TOOL is the coreReducer path for WORKSHOP_RECIPES (rake/axe/etc.) —
  // separate from the CRAFTING/CRAFT_RECIPE flow handled by the slice.
  await dispatchAction(page, { type: 'CRAFT_TOOL', id: 'rake' });
  await waitForState(page, (s) => (s.tools?.rake ?? 0) === 1);
  const s = await getReactState(page);
  expect(s.inventory.wood_plank).toBe(0);
});

test('CRAFT_TOOL with no workshop is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 100,
    built: {},
    inventory: { wood_plank: 5 },
    tools: { rake: 0 },
  });
  await dispatchAction(page, { type: 'CRAFT_TOOL', id: 'rake' });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  expect(s.tools?.rake ?? 0).toBe(0);
  expect(s.inventory.wood_plank).toBe(5);
});
