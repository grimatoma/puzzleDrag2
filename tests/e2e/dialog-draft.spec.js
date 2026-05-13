import { test, expect } from '@playwright/test';
import { dispatchAction, waitForBoot } from './helpers.js';

test('balance draft dialog is consumed by the game runtime', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('hearth.'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('hearth.tutorial.seen', '1');
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
      localStorage.setItem('hearth.save.v1', JSON.stringify({
        version: 20,
        story: { act: 1, beat: 'act1_arrival', flags: { intro_seen: true, _fired_act1_arrival: true } },
      }));
    } catch {}
  });

  await page.goto('/');
  await waitForBoot(page);
  await dispatchAction(page, { type: 'BUILD', building: { id: 'e2e_marker', name: 'E2E Marker', cost: {} } });

  await expect(page.getByText('E2E Draft Dialog')).toBeVisible();
  await expect(page.getByText('Draft dialog loaded.')).toBeVisible();
});
