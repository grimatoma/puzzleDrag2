import { expect, test } from "@playwright/test";

const VISUAL_FIXED_NOW = 1_700_000_000_000;

async function installDeterminism(page) {
  await page.addInitScript(({ fixedNow }) => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    let seed = 987654321;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => fixedNow;
    window.localStorage.clear();
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  }, { fixedNow: VISUAL_FIXED_NOW });
}

test("visual negative control catches a deliberate diff", async ({ page }) => {
  test.skip(!process.env.VISUAL_NEGATIVE, "Set VISUAL_NEGATIVE=1 to run the deliberate visual diff check.");

  await installDeterminism(page);
  await page.goto("./?visual=shell-town-fresh");
  await page.waitForFunction(() => window.__hearthVisual?.ready);
  await page.evaluate(() => window.__hearthVisual.ready);
  await page.evaluate(() => {
    const shell = document.querySelector("[data-testid='app-shell']");
    if (!(shell instanceof HTMLElement)) return;
    shell.style.boxShadow = "inset 0 0 0 20px rgb(220, 20, 60)";
    window.__hearthVisual.freeze();
  });

  let failed = false;
  try {
    const screenshot = await page.locator('[data-visual-root="app"]').screenshot({
      animations: "disabled",
      caret: "hide",
      timeout: 60_000,
    });
    expect(screenshot).toMatchSnapshot("shell-town-fresh.png", {
      maxDiffPixelRatio: 0.008,
      threshold: 0.2,
    });
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
});
