import { expect, test } from '@playwright/test';
import { STORY_EDITOR_VISUAL_SCENARIOS } from '../../src/visualTesting/storyEditorMatrix.js';

const VISUAL_FIXED_NOW = 1_700_000_000_000;

async function installDeterminism(page) {
  await page.addInitScript(({ fixedNow }) => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => fixedNow;
    window.localStorage.clear();
  }, { fixedNow: VISUAL_FIXED_NOW });
}

async function runAction(page, action) {
  if (action.type === 'clickRole') {
    await page.getByRole(action.role, { name: new RegExp(action.name, 'i') }).first().click();
  }
  await page.waitForTimeout(action.waitMs ?? 150);
}

for (const scenario of STORY_EDITOR_VISUAL_SCENARIOS) {
  test(`${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(
      Boolean(scenario.skipProjects?.includes(testInfo.project.name)),
      `${scenario.id} is intentionally skipped for ${testInfo.project.name}`,
    );

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      consoleErrors.push(msg.text());
    });

    await installDeterminism(page);
    await page.goto('./story/');
    await page.waitForSelector('#root');
    await page.waitForTimeout(250);

    for (const action of scenario.actions ?? []) await runAction(page, action);

    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide', timeout: 60_000 });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
    expect(pageErrors, 'page errors').toEqual([]);
    expect(consoleErrors, 'console errors').toEqual([]);
  });
}
