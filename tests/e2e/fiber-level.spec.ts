import { test, expect } from "@playwright/test";
import { gotoFresh, getReactState, dispatchAction, waitForState, collectPageErrors } from "./helpers";

// Plays a full Fiber Crush level (L1 "First Fleece") to a win by driving real
// adjacent swaps through the forked FiberScene, then asserts the reward landed
// in the SAME economy (coins + zone inventory) the rest of the game uses.
test("Fiber Crush L1 plays to a win and credits the real economy", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectPageErrors(page);
  await gotoFresh(page);

  // The viewKey export makes #/fiber routable with no router.ts edit.
  await dispatchAction(page, { type: "SET_VIEW", view: "fiber" });
  await waitForState(page, (s) => s.view === "fiber");

  // Start L1 (unlocked by default).
  await dispatchAction(page, { type: "FIBER/START_LEVEL", levelId: "L1" });
  await waitForState(page, (s) => s.fiber?.active?.levelId === "L1");

  const coinsBefore = (await getReactState(page))?.coins ?? 0;

  // Wait for the forked scene to boot (distinct from the board's __phaserScene).
  await page.waitForFunction(
    () => !!(window as unknown as { __fiberScene?: unknown }).__fiberScene,
    null,
    { timeout: 15_000 },
  );

  // Auto-play: each legal swap clears ≥3 fibres (= wool), so the 40-wool goal is
  // met well inside the 20-move budget. Stop once the level is cleared (the view
  // dispatches FIBER/COMPLETE_LEVEL on win → unlockedLevel advances to 2).
  for (let i = 0; i < 40; i++) {
    const s = await getReactState(page);
    if ((s?.fiber?.unlockedLevel ?? 1) >= 2) break;
    const hasScene = await page.evaluate(
      () => !!(window as unknown as { __fiberScene?: { autoMove?: () => boolean } }).__fiberScene,
    );
    if (!hasScene) break;
    await page.evaluate(() => {
      const scene = (window as unknown as { __fiberScene?: { autoMove?: () => boolean } }).__fiberScene;
      scene?.autoMove?.();
    });
    await page.waitForTimeout(80);
  }

  const final = await getReactState(page);
  // Level cleared → next level unlocked.
  expect(final?.fiber?.unlockedLevel ?? 1).toBeGreaterThanOrEqual(2);
  // Reward landed in the real zone inventory + coins.
  const wool = (final?.inventory as Record<string, Record<string, number>> | undefined)?.home?.wool ?? 0;
  expect(wool).toBeGreaterThanOrEqual(20);
  expect((final?.coins as number | undefined) ?? 0).toBeGreaterThanOrEqual(coinsBefore + 120);

  expect(errors(), errors().join("\n")).toEqual([]);
});

// The main board (window.__phaserScene) must be untouched by Fiber (the fork promise).
test("Fiber Crush does not clobber the main board scene handle", async ({ page }) => {
  await gotoFresh(page);
  await dispatchAction(page, { type: "SET_VIEW", view: "fiber" });
  await waitForState(page, (s) => s.view === "fiber");
  await dispatchAction(page, { type: "FIBER/START_LEVEL", levelId: "L1" });
  await page.waitForFunction(
    () => !!(window as unknown as { __fiberScene?: unknown }).__fiberScene,
    null,
    { timeout: 15_000 },
  );
  const handles = await page.evaluate(() => ({
    board: !!(window as unknown as { __phaserScene?: unknown }).__phaserScene,
    fiber: !!(window as unknown as { __fiberScene?: unknown }).__fiberScene,
  }));
  expect(handles.board).toBe(true);
  expect(handles.fiber).toBe(true);
});
