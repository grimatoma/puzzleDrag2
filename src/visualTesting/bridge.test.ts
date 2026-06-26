// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installVisualTestingBridge } from "./bridge.js";

/**
 * Regression guard for the "town animations frozen for every player" bug.
 *
 * The bridge ships to every player (it powers the Dev Panel's Animations Demo
 * and the wiki's scenario captures), but `window.__HEARTH_VISUAL_TESTING__`
 * means "a deterministic visual golden is being captured — freeze all ambient
 * motion." TownScene reads that flag to bail out of its update loop and pause
 * every looping tween. So the flag must NOT be set on a normal page load —
 * only when a scenario is actually being driven (?visual=… / the manual panel),
 * or when the Playwright goldens set it themselves via addInitScript.
 */
describe("installVisualTestingBridge — visual-test flag gating", () => {
  afterEach(() => {
    delete window.__HEARTH_VISUAL_TESTING__;
    window.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  function install() {
    return installVisualTestingBridge({ getState: () => ({ view: "town" }), dispatch: vi.fn() });
  }

  it("does NOT mark the page as a visual-test run on a normal load", () => {
    window.history.replaceState(null, "", "/");
    const cleanup = install();
    expect(window.__HEARTH_VISUAL_TESTING__).toBeUndefined();
    cleanup();
  });

  it("marks the page as a visual-test run when a ?visual= scenario is active", () => {
    window.history.replaceState(null, "", "/?visual=board-anim-demo");
    const cleanup = install();
    expect(window.__HEARTH_VISUAL_TESTING__).toBe(true);
    cleanup();
  });

  it("marks the page as a visual-test run when the manual panel is requested", () => {
    window.history.replaceState(null, "", "/?visualPanel=1");
    const cleanup = install();
    expect(window.__HEARTH_VISUAL_TESTING__).toBe(true);
    cleanup();
  });
});
