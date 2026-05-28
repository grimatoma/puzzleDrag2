import { expect, test } from '@playwright/test';
import { BALANCE_VISUAL_SCENARIOS } from '../../src/visualTesting/balanceMatrix.js';

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

for (const scenario of BALANCE_VISUAL_SCENARIOS) {
  test(`${scenario.id}`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      consoleErrors.push(msg.text());
    });

    await installDeterminism(page);
    await page.goto(`./b/${scenario.hash || ''}`);
    await page.waitForSelector('#root');
    await page.waitForTimeout(250);

    const screenshot = await page.locator('#root').screenshot({ animations: 'disabled', caret: 'hide', timeout: 60_000 });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, { ...scenario.diff });
    expect(pageErrors, 'page errors').toEqual([]);
    expect(consoleErrors, 'console errors').toEqual([]);
  });
}
