import { test, expect } from '@playwright/test';
import { seedQuietSave, dispatchAction, waitForBoot } from './helpers';

test('balance draft dialog is consumed by the game runtime', async ({ page }) => {
  // Quiet baseline save (current schema; tutorial, story intro, and the
  // daily-streak modal all suppressed) so nothing else owns the modal slot
  // when the authored beat fires.
  await seedQuietSave(page);
  // Layer the Dev-Panel / Story-Editor draft on top + opt back into dialogs.
  // seedQuietSave's init script runs first (it wipes hearth.* then writes the
  // save), so set the draft in a later init script that survives that wipe. The
  // runtime reads draft.story into BALANCE_OVERRIDES.story → setStoryOverrides at
  // boot, injecting the beat into the side lane. Notes on current main:
  //   • Side beats fire on a `when` Cond tree (src/story.ts sideTriggerMatches);
  //     the legacy `trigger:` field is no longer evaluated.
  //   • Dialogs are SUPPRESSED by default in every environment
  //     (src/featureFlags.ts isDialogsDisabled), so a dialog test must turn them on.
  //   • A continue-only, single-line beat renders as the lightweight bottom bar
  //     (which shows only the line, not the title). Two+ lines route it to the
  //     center-stage StoryModal that renders the `#story-modal-title`.
  await page.addInitScript(() => {
    globalThis.__HEARTH_DISABLE_DIALOGS__ = false;
    localStorage.setItem('hearth.balance.draft', JSON.stringify({
      version: 1,
      story: {
        newBeats: [{
          id: 'e2e_draft_dialog',
          title: 'E2E Draft Dialog',
          lines: [
            { speaker: 'wren', text: 'Draft dialog loaded.' },
            { speaker: 'wren', text: 'The authored beat reached the runtime.' },
          ],
          when: {
            all: [
              { fact: 'event.type', op: 'eq', value: 'building_built' },
              { fact: 'event.id', op: 'eq', value: 'e2e_marker' },
            ],
          },
        }],
      },
    }));
  });

  await page.goto('/');
  await waitForBoot(page);
  await dispatchAction(page, { type: 'BUILD', building: { id: 'e2e_marker', name: 'E2E Marker', cost: {} } });

  await expect(page.getByText('E2E Draft Dialog')).toBeVisible();
  await expect(page.getByText('Draft dialog loaded.')).toBeVisible();
});
