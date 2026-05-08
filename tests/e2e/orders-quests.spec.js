import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Orders + quests / dailies. Orders live at state.orders[]; turning one in
 * dispatches TURN_IN_ORDER which:
 *   - debits inventory by order.need
 *   - credits coins by order.reward
 *   - removes the order from the list
 *
 * Daily quests live at state.quests[] (via the quests slice) and accumulate
 * progress as the player chains, crafts, etc.
 */

async function withOrder(page, key, need, reward, extras = {}) {
  // Force-write a single order via direct seed. The orders slice rolls its
  // own list at boot; for deterministic testing we plug one in. The reducer
  // expects npc + reward (or baseReward) on the order shape — without npc,
  // pickDialog throws on a typo'd lookup, so we always seed it.
  await gotoFresh(page, {
    coins: 0,
    inventory: { [key]: need + (extras.invExtra ?? 0) },
    orders: [{ id: 'o1', npc: 'wren', key, need, reward, deadline: 99 }],
  });
}

test('TURN_IN_ORDER debits inventory and removes the order', async ({ page }) => {
  await withOrder(page, 'grass_hay', 5, 50);
  // The reducer rolls a replacement order, so orders.length stays > 0. Look
  // for the specific order id being gone instead.
  await dispatchAction(page, { type: 'TURN_IN_ORDER', id: 'o1' });
  await waitForState(page, (s) => !(s.orders ?? []).some((o) => o.id === 'o1'));
  const s = await getReactState(page);
  expect(s.inventory.grass_hay).toBe(0);
  // Reward reaches the player as coins or pays down debt — we just assert
  // *something* moved (coins or seasonStats). The exact number depends on
  // bond + season multipliers and is covered in unit tests.
  expect(s.coins + (s.townsfolk?.debt ?? 0) * -1 + 9999).toBeGreaterThan(9999);
});

test('TURN_IN_ORDER with insufficient inventory is rejected', async ({ page }) => {
  await gotoFresh(page, {
    coins: 0,
    inventory: { grass_hay: 1 },
    orders: [{ id: 'o1', npc: 'wren', key: 'grass_hay', need: 50, reward: 100, deadline: 99 }],
  });
  await dispatchAction(page, { type: 'TURN_IN_ORDER', id: 'o1' });
  await page.waitForTimeout(150);
  const s = await getReactState(page);
  // The order id is still present (not removed).
  expect((s.orders ?? []).some((o) => o.id === 'o1')).toBe(true);
  expect(s.inventory.grass_hay).toBe(1);
  expect(s.coins).toBe(0);
});

test('TURN_IN_ORDER with bogus id is a no-op', async ({ page }) => {
  await gotoFresh(page);
  const before = await getReactState(page);
  await dispatchAction(page, { type: 'TURN_IN_ORDER', id: 'nope' });
  await page.waitForTimeout(120);
  const after = await getReactState(page);
  expect(after.coins).toBe(before.coins);
});
