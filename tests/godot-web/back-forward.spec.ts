import { test, expect } from "@playwright/test";

// Browser Back/Forward navigation for the Godot Web (HTML5/WASM) build.
//
// Proves the History bridge wired in godot/scenes/Main.gd (_setup_browser_history /
// _sync_history / _on_browser_popstate) actually drives the modal nav from the
// browser chrome on a real web export. The whole round-trip is observed through the
// URL hash — the bridge mirrors _router.current_modal() onto `location.hash`
// (`#/<id>`), so the hash is a faithful proxy for which screen is open. No canvas
// clicks and no production test-hooks: we navigate purely via the browser History
// (deep-link load + page.goBack/goForward), exactly as a player's Back button would.
//
// Companion to boot.spec.ts (which proves the engine boots at all). Pure nav-state
// logic (id parsing, apply_deeplink) is covered headlessly by
// godot/tests/run_router_tests.gd; this is the one web-only integration smoke.

const READY = () => (window as any).__hearthGodotReady === true;

test("Godot Web: launch normalizes the history entry to the board", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));

  // Plain launch (no deep link).
  await page.goto("http://localhost:4327/");
  await page.waitForFunction(READY, null, { timeout: 90_000 });

  // _setup_browser_history replaceState's the launch entry to "#/board" so Back from
  // the first opened screen is well-defined. Give the engine a beat to run _ready.
  await page.waitForFunction(() => window.location.hash === "#/board", null, {
    timeout: 30_000,
  });

  expect(pageErrors, pageErrors.map((e) => e.message).join("\n")).toHaveLength(0);
});

test("Godot Web: deep link opens a modal and Back/Forward toggle it", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));

  // Launch straight onto the Inventory screen via the hash deep link.
  await page.goto("http://localhost:4327/#/inventory");
  await page.waitForFunction(READY, null, { timeout: 90_000 });

  // The deferred initial deep-link opens Inventory; _sync_history then pushes a
  // "#/inventory" history entry above the normalized "#/board" base.
  await page.waitForFunction(() => window.location.hash === "#/inventory", null, {
    timeout: 30_000,
  });

  // Browser Back → the bridge's popstate handler routes "board" through apply_deeplink,
  // closing the modal. The hash collapses back to the board.
  await page.goBack();
  await page.waitForFunction(() => window.location.hash === "#/board", null, {
    timeout: 30_000,
  });

  // Browser Forward → reopens Inventory; the hash returns to "#/inventory".
  await page.goForward();
  await page.waitForFunction(() => window.location.hash === "#/inventory", null, {
    timeout: 30_000,
  });

  expect(pageErrors, pageErrors.map((e) => e.message).join("\n")).toHaveLength(0);
});
