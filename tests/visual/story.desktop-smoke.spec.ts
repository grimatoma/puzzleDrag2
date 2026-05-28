import { expect, test } from '@playwright/test';
import { STORY_EDITOR_VISUAL_SCENARIOS, STORY_EDITOR_VISUAL_SMOKE_SCENARIO_IDS } from '../../src/visualTesting/storyEditorMatrix.js';

const SMOKE_SCENARIOS = STORY_EDITOR_VISUAL_SMOKE_SCENARIO_IDS.map((id) => {
  const scenario = STORY_EDITOR_VISUAL_SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`Unknown story editor smoke scenario: ${id}`);
  return scenario;
});
for (const scenario of SMOKE_SCENARIOS) {
  test(`desktop smoke ${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.addInitScript(() => { window.localStorage.clear(); });
    await page.goto('./story/');
    await page.waitForSelector('#root');
    for (const action of scenario.actions ?? []) {
      await page.getByRole(action.role as "button", { name: new RegExp(action.name, "i") }).first().click();
    }
    await page.waitForTimeout(250);
    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide' });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
  });
}
