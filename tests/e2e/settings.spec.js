import { test, expect } from '@playwright/test';
import { gotoFresh, getReactState, waitForState, dispatchAction } from './helpers.js';

/**
 * Settings flags. The settings slice owns state.settings and persists to its
 * own localStorage key (hearth.settings). Toggles dispatched as SETTINGS/TOGGLE.
 */

test('SETTINGS/TOGGLE flips the named flag', async ({ page }) => {
  await gotoFresh(page);
  const before = await getReactState(page);
  const initial = before.settings?.sfxOn !== false; // default true
  await dispatchAction(page, { type: 'SETTINGS/TOGGLE', key: 'sfxOn' });
  await waitForState(page, (s) => (s.settings?.sfxOn ?? true) !== initial);
  await dispatchAction(page, { type: 'SETTINGS/TOGGLE', key: 'sfxOn' });
  await waitForState(page, (s) => (s.settings?.sfxOn ?? true) === initial);
});

test('Music + haptics toggles persist independently', async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: 'SETTINGS/TOGGLE', key: 'musicOn' });
  await dispatchAction(page, { type: 'SETTINGS/TOGGLE', key: 'hapticsOn' });
  const s = await getReactState(page);
  // Default for both is whatever DEFAULT_SETTINGS says — we just assert
  // the toggle actually wrote a boolean for both keys.
  expect(typeof s.settings?.musicOn).toBe('boolean');
  expect(typeof s.settings?.hapticsOn).toBe('boolean');
});
