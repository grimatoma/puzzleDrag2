import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isDialogsDisabled } from "../featureFlags.js";

describe("isDialogsDisabled", () => {
  beforeEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
    localStorage.removeItem("hearth.disableDialogs");
  });

  afterEach(() => {
    delete globalThis.__HEARTH_DISABLE_DIALOGS__;
    localStorage.removeItem("hearth.disableDialogs");
    vi.unstubAllEnvs();
  });

  it("returns false by default in dev/test (dialogs on)", () => {
    expect(isDialogsDisabled()).toBe(false);
  });

  it("returns true by default in production builds (dialogs off)", () => {
    vi.stubEnv("PROD", true);
    expect(isDialogsDisabled()).toBe(true);
  });

  it("lets the global override re-enable dialogs in production", () => {
    vi.stubEnv("PROD", true);
    globalThis.__HEARTH_DISABLE_DIALOGS__ = false;
    expect(isDialogsDisabled()).toBe(false);
  });

  it("lets the localStorage flag re-enable dialogs in production", () => {
    vi.stubEnv("PROD", true);
    localStorage.setItem("hearth.disableDialogs", "0");
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
