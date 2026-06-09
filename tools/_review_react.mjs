// Live React capture for the parity review. Renders each visual scenario via the
// ?visual=<id> bridge and screenshots it at mobile-portrait. Output: tools/_review_caps/react/<id>.png
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:5173/puzzleDrag2/';
const OUT = 'tools/_review_caps/react';
fs.mkdirSync(OUT, { recursive: true });

const SCENARIOS = process.argv.slice(2);
if (SCENARIOS.length === 0) { console.error('pass scenario ids'); process.exit(1); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message));

for (const id of SCENARIOS) {
  try {
    await page.addInitScript(() => { window.__HEARTH_DISABLE_DIALOGS__ = true; });
    await page.goto(`${BASE}?visual=${id}`, { waitUntil: 'domcontentloaded' });
    // give the bridge + Phaser time, then freeze animations
    await page.waitForTimeout(1400);
    await page.evaluate(() => { try { window.__hearthVisual && window.__hearthVisual.freeze && window.__hearthVisual.freeze(); } catch (e) {} });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${id}.png` });
    console.log('ok', id);
  } catch (e) {
    console.log('ERR', id, e.message);
  }
}
await browser.close();
