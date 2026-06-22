import { expect, test } from "@playwright/test";
import { VISUAL_SCENARIOS } from "../../src/visualTesting/matrix.js";

const VISUAL_FIXED_NOW = 1_700_000_000_000;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function installDeterminism(page, scenario) {
  const disableDialogs = !scenario?.enableDialogs;
  await page.addInitScript(({ fixedNow, disableDialogs }) => {
    window.__HEARTH_VISUAL_TESTING__ = true;
    // Most scenarios suppress auto-triggered dialogs/story beats. Scenarios whose payload
    // IS a dialog (story beats, toast bubbles) set `enableDialogs` so the gated modal renders
    // instead of capturing an empty town — see VisualScenario.enableDialogs in matrix.ts.
    window.__HEARTH_DISABLE_DIALOGS__ = disableDialogs;
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Date.now = () => fixedNow;
    window.localStorage.clear();
    window.localStorage.setItem("hearth.tutorial.seen", "1");
  }, { fixedNow: VISUAL_FIXED_NOW, disableDialogs });
}

async function waitForVisualReady(page, scenario) {
  await page.waitForFunction(() => window.__hearthVisual?.ready);
  await page.evaluate(() => window.__hearthVisual.ready);
  await page.waitForSelector('[data-visual-root="app"]');
  if (scenario.hash === "#/board" || scenario.state?.startsWith?.("board")) {
    // Wait for the board to populate. A full 6×6 board is 36 tiles, but hazard
    // boards (cave-ins/rubble) legitimately leave a few cells empty — e.g.
    // board-mine-hazards stabilises at 34 — so requiring exactly 36 would hang.
    // 30 still rejects an empty / half-dealt board while tolerating hazards.
    await page.waitForFunction(() => window.__phaserScene?.grid?.flat?.().filter(Boolean).length >= 30);
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

for (const scenario of VISUAL_SCENARIOS) {
  test(`${scenario.id} — ${scenario.expectation}`, async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "expectation", description: scenario.expectation });
    console.log(`[visual] ${scenario.id}: ${scenario.expectation}`);
    test.skip(testInfo.project.name === "desktop", "Full visual tests run only on mobile projects.");
    test.skip(
      Boolean(scenario.skipProjects?.includes(testInfo.project.name)),
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

    await installDeterminism(page, scenario);
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
