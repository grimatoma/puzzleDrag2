import { expect, test } from '@playwright/test';
import { BALANCE_VISUAL_SCENARIOS, BALANCE_VISUAL_SMOKE_SCENARIO_IDS } from '../../src/visualTesting/balanceMatrix.js';

const VISUAL_FIXED_NOW = 1_700_000_000_000;

// Mirror the determinism the full balance spec installs (seeded RNG + frozen
// clock) so noise-using icon bakes and any date/random-driven copy render the
// same every run.
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

const SMOKE_SCENARIOS = BALANCE_VISUAL_SMOKE_SCENARIO_IDS.map((id) => BALANCE_VISUAL_SCENARIOS.find((s) => s.id === id));
for (const scenario of SMOKE_SCENARIOS) {
  test(`desktop smoke ${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await installDeterminism(page);
    await page.goto(`./b/${scenario.hash || ''}`);
    await page.waitForSelector('#root');
    // The Dev Panel loads its display/body/mono faces from Google Fonts with
    // `display=swap`. A fixed 250ms wait races that swap: the golden could be
    // captured with fallback metrics and the verify run with the web font (or
    // vice-versa), shifting every glyph and blowing past the 2% diff budget.
    // Wait for fonts to settle so both captures are in the same painted state.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide' });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
  });
}
