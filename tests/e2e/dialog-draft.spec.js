import { test, expect } from '@playwright/test';
import { dispatchAction, seedQuietSave, waitForAppBoot } from './helpers.js';

test('balance draft dialog is consumed by the game runtime', async ({ page }) => {
  await seedQuietSave(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('hearth.balance.draft', JSON.stringify({
        version: 1,
        story: {
          newBeats: [{
            id: 'e2e_draft_dialog',
            title: 'E2E Draft Dialog',
            lines: [{ speaker: 'wren', text: 'Draft dialog loaded.' }],
            trigger: { type: 'building_built', id: 'e2e_marker' },
          }],
        },
      }));
    } catch {}
  });

  await page.goto('/');
  await waitForAppBoot(page);
  await dispatchAction(page, { type: 'BUILD', building: { id: 'e2e_marker', name: 'E2E Marker', cost: {} } });

  await expect(page.getByText('Draft dialog loaded.')).toBeVisible();
  await expect(page.getByText('WREN')).toBeVisible();
});
