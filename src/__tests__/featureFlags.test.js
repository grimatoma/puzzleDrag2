import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDialogsDisabled } from "../featureFlags.js";

describe("isDialogsDisabled", () => {
  beforeEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
  });

  afterEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
  });

  it("returns false by default", () => {
    expect(isDialogsDisabled()).toBe(false);
  });

  it("returns true when __HEARTH_DISABLE_DIALOGS__ is set", () => {
    globalThis.__HEARTH_DISABLE_DIALOGS__ = true;
    expect(isDialogsDisabled()).toBe(true);
  });

  it("returns false when __HEARTH_DISABLE_DIALOGS__ is explicitly false", () => {
    globalThis.__HEARTH_DISABLE_DIALOGS__ = false;
    expect(isDialogsDisabled()).toBe(false);
  });
});
