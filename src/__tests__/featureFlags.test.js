import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDialogsDisabled } from "../featureFlags.js";

describe("isDialogsDisabled", () => {
  beforeEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
    localStorage.removeItem("hearth.disableDialogs");
  });

  afterEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
    localStorage.removeItem("hearth.disableDialogs");
  });

  it("returns false by default (dialogs on)", () => {
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

  it("respects persisted localStorage flag", () => {
    localStorage.setItem("hearth.disableDialogs", "0");
    expect(isDialogsDisabled()).toBe(false);

    localStorage.setItem("hearth.disableDialogs", "1");
    expect(isDialogsDisabled()).toBe(true);
  });
});
