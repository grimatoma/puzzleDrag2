import { test, expect } from '@playwright/test';
import { clearSave, dispatchAction } from './helpers.js';

test.beforeEach(async ({ page }) => { await clearSave(page); });

test('canvas backing store renders at devicePixelRatio× CSS size', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { state: 'attached' });
  // Default view is "town" which wraps the board in an invisible container;
  // switch to board so the canvas has real layout dimensions to inspect.
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  await page.waitForTimeout(200);

  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const rect = c.getBoundingClientRect();
    const scene = window.__phaserScene;
    return {
      dpr: window.devicePixelRatio,
      attrW: c.width,
      attrH: c.height,
      cssW: rect.width,
      cssH: rect.height,
      sceneW: scene?.scale?.width,
      sceneH: scene?.scale?.height,
      sceneDpr: scene?.dpr,
    };
  });

  expect(Math.round(info.attrW)).toBe(Math.round(info.cssW * info.dpr));
  expect(Math.round(info.attrH)).toBe(Math.round(info.cssH * info.dpr));
  expect(info.sceneDpr).toBe(info.dpr);
  expect(info.sceneW).toBe(info.attrW);
  expect(info.sceneH).toBe(info.attrH);
});

test('pointer hit testing maps CSS coords through dpr to world space', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { state: 'attached' });
  await dispatchAction(page, { type: 'SET_VIEW', view: 'board' });
  await page.waitForTimeout(200);

  const result = await page.evaluate(() => {
    const scene = window.__phaserScene;
    const c = scene.game.canvas;
    const rect = c.getBoundingClientRect();
    const tile = scene.grid.flat().filter(Boolean)[10];
    const cssX = rect.left + tile.x * (rect.width / c.width);
    const cssY = rect.top + tile.y * (rect.height / c.height);
    const im = scene.input.manager;
    const pointer = im.mousePointer;
    im.transformPointer(pointer, cssX, cssY, false);
    const hits = im.hitTest(pointer, [tile.sprite], scene.cameras.main);
    return {
      pointerX: pointer.x, pointerY: pointer.y,
      tileX: tile.x, tileY: tile.y,
      hitCount: hits.length,
    };
  });

  expect(Math.abs(result.pointerX - result.tileX)).toBeLessThan(2);
  expect(Math.abs(result.pointerY - result.tileY)).toBeLessThan(2);
  expect(result.hitCount).toBe(1);
});
