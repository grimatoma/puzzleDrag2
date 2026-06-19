import { expect, test } from '@playwright/test';
import { BALANCE_VISUAL_SCENARIOS, BALANCE_VISUAL_SMOKE_SCENARIO_IDS } from '../../src/visualTesting/balanceMatrix.js';

const SMOKE_SCENARIOS = BALANCE_VISUAL_SMOKE_SCENARIO_IDS.map((id) => BALANCE_VISUAL_SCENARIOS.find((s) => s.id === id));
for (const scenario of SMOKE_SCENARIOS) {
  test(`desktop smoke ${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.addInitScript(() => { window.localStorage.clear(); });
    await page.goto(`./b/${scenario.hash || ''}`);
    await page.waitForSelector('#root');
    // The wiki main content is lazy-loaded behind <Suspense>; under parallel
    // CPU load a fixed wait can screenshot the "Loading…" fallback. Wait for the
    // resolved content wrapper instead so captures are deterministic.
    await page.waitForSelector('.wiki-reveal', { state: 'attached' });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'));
    await page.waitForTimeout(250);
    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide' });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
  });
}
