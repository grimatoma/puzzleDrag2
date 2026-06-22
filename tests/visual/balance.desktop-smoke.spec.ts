import { expect, test } from '@playwright/test';
import { BALANCE_VISUAL_SCENARIOS, BALANCE_VISUAL_SMOKE_SCENARIO_IDS } from '../../src/visualTesting/balanceMatrix.js';

const SMOKE_SCENARIOS = BALANCE_VISUAL_SMOKE_SCENARIO_IDS.map((id) => BALANCE_VISUAL_SCENARIOS.find((s) => s.id === id));
for (const scenario of SMOKE_SCENARIOS) {
  test(`desktop smoke ${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    // Determinism: the /b/ bundle paints entity icons via Canvas, and some icon
    // draws (e.g. recipe steam) use Math.random — unseeded that makes the
    // recipes/ability/building goldens flake frame-to-frame. Seed Math.random +
    // Date.now exactly like the game visual harness so a single capture is
    // reproducible. (animations:'disabled' only freezes CSS/Web animations, not
    // canvas, so this is the missing piece for canvas icons.)
    await page.addInitScript(() => {
      window.localStorage.clear();
      let seed = 123456789;
      Math.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      Date.now = () => 1_700_000_000_000;
    });
    await page.goto(`./b/${scenario.hash || ''}`);
    await page.waitForSelector('#root');
    await page.waitForTimeout(250);
    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide' });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
  });
}
