import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers.js';

async function clearHearthStorage(page) {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('hearth-e2e-storage-cleared') === '1') return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith('hearth.'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.setItem('hearth-e2e-storage-cleared', '1');
    } catch {
      // Covered by boot failures if storage is unavailable.
    }
  });
}

async function gotoStory(page) {
  await page.goto('story/');
  await expect(page.getByText('Story Tree Editor')).toBeVisible();
}

async function dragNodeWithMouse(page, nodeId, dx, dy) {
  const handle = page.getByTestId(`story-node-${nodeId}`).getByTestId('story-node-drag-handle');
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

async function dragNodeWithTouch(page, nodeId, dx, dy) {
  const handle = page.getByTestId(`story-node-${nodeId}`).getByTestId('story-node-drag-handle');
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await handle.evaluate((el, start) => {
    const touch = new Touch({ identifier: 71, target: el, clientX: start.x, clientY: start.y });
    el.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true,
    }));
  }, { x, y });
  await page.evaluate((move) => {
    const touch = new Touch({ identifier: 71, target: document.body, clientX: move.x, clientY: move.y });
    window.dispatchEvent(new TouchEvent('touchmove', {
      touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true,
    }));
  }, { x: x + dx, y: y + dy });
  await page.evaluate((end) => {
    const touch = new Touch({ identifier: 71, target: document.body, clientX: end.x, clientY: end.y });
    window.dispatchEvent(new TouchEvent('touchend', {
      touches: [], targetTouches: [], changedTouches: [touch], bubbles: true, cancelable: true,
    }));
  }, { x: x + dx, y: y + dy });
}

test('story editor supports draft authoring, reorder, rename, preview, and drag persistence', async ({ page }, testInfo) => {
  const errors = collectPageErrors(page);
  await clearHearthStorage(page);
  await gotoStory(page);

  await page.getByTestId('story-new-beat').click();
  await page.getByTestId('story-draft-id-input').fill('e2e_story_branch');
  await page.getByTestId('story-draft-rename').click();
  await expect(page.getByTestId('story-node-e2e_story_branch')).toBeVisible();

  await page.getByTestId('story-add-choice').click();
  await page.getByTestId('story-choice-0-label').fill('First road');
  await page.getByTestId('story-add-choice').click();
  await page.getByTestId('story-choice-1-label').fill('Second road');
  await page.getByTestId('story-choice-1-up').click();
  await expect(page.getByTestId('story-choice-0-label')).toHaveValue('Second road');
  await expect(page.getByTestId('story-choice-1-label')).toHaveValue('First road');

  await page.getByTestId('story-inspector-preview').click();
  await expect(page.getByRole('dialog')).toContainText('Second road');
  await expect(page.getByRole('dialog')).toContainText('First road');
  await page.keyboard.press('Escape');

  await page.getByTestId('story-fit').click();
  await expect(page.getByTestId('story-node-e2e_story_branch')).toBeInViewport();

  if (testInfo.project.name !== 'iphone-landscape') {
    await dragNodeWithMouse(page, 'e2e_story_branch', 70, 22);
    await expect.poll(async () => page.evaluate(() => {
      const layout = JSON.parse(localStorage.getItem('hearth.story.layout') || '{}');
      return !!layout.e2e_story_branch;
    })).toBe(true);
  }

  await dragNodeWithTouch(page, 'e2e_story_branch', 36, 18);
  await expect.poll(async () => page.evaluate(() => {
    const layout = JSON.parse(localStorage.getItem('hearth.story.layout') || '{}');
    return Math.round(layout.e2e_story_branch?.x || 0);
  })).toBeGreaterThan(0);

  await page.getByTestId('story-save-draft').click();
  await expect.poll(async () => page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hearth.balance.draft') || '{}');
    const beat = draft.story?.newBeats?.find((b) => b.id === 'e2e_story_branch');
    return beat?.choices?.map((c) => c.label).join('|') || '';
  })).toBe('Second road|First road');

  expect(errors(), `runtime errors:\n${errors().join('\n')}`).toEqual([]);
});

test('flags tab creates custom flags and story warnings update around known flags and missing targets', async ({ page }) => {
  const errors = collectPageErrors(page);
  await clearHearthStorage(page);
  await page.goto('b/#/flags');
  await expect(page.getByText('Story Flags')).toBeVisible();

  await page.getByRole('button', { name: '+ New flag' }).click();
  await page.getByTestId('flag-id-input').fill('e2e_known_flag');
  await page.getByTestId('flag-rename').evaluate((el) => el.click());
  await page.getByTestId('flag-label-input').fill('E2E Known Flag');
  await page.getByTestId('flag-description-input').fill('A custom test flag authored through the Flags tab.');
  await page.getByTestId('flag-category-select').selectOption('story');
  await page.getByRole('button', { name: /Save Draft/ }).click();

  await expect.poll(async () => page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hearth.balance.draft') || '{}');
    return draft.flags?.new?.some((f) => f.id === 'e2e_known_flag' && f.label === 'E2E Known Flag' && f.category === 'story');
  })).toBe(true);

  await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hearth.balance.draft') || '{}');
    draft.story ??= {};
    draft.story.newBeats = [{
      id: 'e2e_warning_beat',
      title: 'E2E Warning Beat',
      lines: [{ speaker: 'wren', text: 'Warnings should explain broken links.' }],
      choices: [
        { id: 'choice_1', label: 'Known flag road', outcome: { setFlag: 'e2e_known_flag', queueBeat: 'e2e_missing_target' } },
      ],
    }];
    localStorage.setItem('hearth.balance.draft', JSON.stringify(draft));
  });

  await gotoStory(page);
  await page.getByText('E2E Warning Beat', { exact: true }).first().click();
  await expect(page.getByText('leads to missing beat "e2e_missing_target"')).toBeVisible();
  await expect(page.getByText('unregistered flag "e2e_known_flag"')).toHaveCount(0);

  await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hearth.balance.draft') || '{}');
    draft.story.newBeats[0].choices[0].outcome.setFlag = 'e2e_unknown_flag';
    localStorage.setItem('hearth.balance.draft', JSON.stringify(draft));
  });
  await page.reload();
  await expect(page.getByText('Story Tree Editor')).toBeVisible();
  await page.getByText('E2E Warning Beat', { exact: true }).first().click();
  await expect(page.getByText('unregistered flag "e2e_unknown_flag"')).toBeVisible();

  expect(errors(), `runtime errors:\n${errors().join('\n')}`).toEqual([]);
});
