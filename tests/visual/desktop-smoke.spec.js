import { expect, test } from "@playwright/test";
import {
  VISUAL_DESKTOP_SMOKE_SCENARIO_IDS,
  VISUAL_SCENARIOS,
} from "../../src/visualTesting/matrix.js";

const VISUAL_FIXED_NOW = 1_700_000_000_000;
const SMOKE_SCENARIOS = VISUAL_DESKTOP_SMOKE_SCENARIO_IDS.map((id) => {
  const scenario = VISUAL_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown desktop smoke visual scenario: ${id}`);
  return scenario;
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function installDeterminism(page) {
  await page.addInitScript(({ fixedNow }) => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    window.__HEARTH_DISABLE_DIALOGS__ = true; // Suppress auto-triggered dialogs/story beats
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => fixedNow;
    window.localStorage.clear();
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  }, { fixedNow: VISUAL_FIXED_NOW });
}

async function waitForVisualReady(page, scenario) {
  await page.waitForFunction(() => window.__hearthVisual?.ready);
  await page.evaluate(() => window.__hearthVisual.ready);
  await page.waitForSelector('[data-visual-root="app"]');
  if (scenario.hash === "#/board" || scenario.state?.startsWith?.("board")) {
    await page.waitForFunction(() => window.__phaserScene?.grid?.flat?.().filter(Boolean).length >= 36);
    await page.evaluate(() => window.__hearthVisual.syncScene());
  }
  await page.waitForTimeout(200);
}

async function runAction(page, action) {
  switch (action.type) {
    case "clickRole": {
      const name = action.namePattern
        ? new RegExp(action.namePattern, "i")
        : new RegExp(`^${escapeRegExp(action.name)}$`, "i");
      await page.getByRole(action.role, { name }).first().click();
      break;
    }
    case "clickRoleLast": {
      const name = action.namePattern
        ? new RegExp(action.namePattern, "i")
        : new RegExp(`^${escapeRegExp(action.name)}$`, "i");
      await page.getByRole(action.role, { name }).last().click();
      break;
    }
    case "clickText":
      await page.getByText(action.text, { exact: false }).filter({ visible: true }).first().click();
      break;
    case "hoverText":
      await page.getByText(action.text, { exact: false }).filter({ visible: true }).first().hover();
      break;
    case "checkLabel":
      await page.getByRole("checkbox", { name: new RegExp(escapeRegExp(action.text), "i") }).first().check();
      break;
    case "fillPlaceholder":
      await page.getByPlaceholder(action.placeholder).first().fill(action.value);
      break;
    case "api":
      await page.evaluate(({ method, args }) => window.__hearthVisual[method](args), action);
      break;
    default:
      throw new Error(`Unknown visual action: ${action.type}`);
  }
  await page.waitForTimeout(action.waitMs ?? 150);
}

for (const scenario of SMOKE_SCENARIOS) {
  test(`desktop smoke ${scenario.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop smoke runs only on desktop.");
    test.skip(
      scenario.skipProjects?.includes(testInfo.project.name),
      `${scenario.id} is intentionally skipped for ${testInfo.project.name}`,
    );

    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (/favicon|Failed to load resource/i.test(text)) return;
      consoleErrors.push(text);
    });

    await installDeterminism(page);
    await page.goto(`./?visual=${encodeURIComponent(scenario.id)}`);
    await waitForVisualReady(page, scenario);

    for (const action of scenario.actions ?? []) {
      await runAction(page, action);
    }

    await page.evaluate(() => window.__hearthVisual.freeze());
    await page.waitForTimeout(120);

    const screenshot = await page.locator('[data-visual-root="app"]').screenshot({
      animations: "disabled",
      caret: "hide",
      timeout: 60_000,
    });
    expect(screenshot).toMatchSnapshot(`${scenario.id}.png`, {
      ...scenario.diff,
    });
    expect(pageErrors, "page errors").toEqual([]);
    expect(consoleErrors, "console errors").toEqual([]);
  });
}
