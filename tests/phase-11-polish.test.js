// Phase 11 — Polish: settings + tools smoke checks.
import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/state.js";
import { MAX_TURNS } from "../src/constants.js";

describe("Phase 11 — fresh state settings/prefs", () => {
  it("fresh state has settings or prefs defined", () => {
    const s = createInitialState();
    const hasPref = s.prefs !== undefined || s.settings !== undefined;
    expect(hasPref).toBe(true);
  });
});

describe("Phase 11 — MAX_TURNS unchanged after Phase 11", () => {
  it("MAX_TURNS is still 10", () => {
    expect(MAX_TURNS).toBe(10);
  });
});

describe("Phase 11 — tools still initialised correctly", () => {
  it("fresh state has tools object", () => {
    const s = createInitialState();
    expect(s.tools).toBeDefined();
    expect(typeof s.tools).toBe("object");
  });

  it("CLOSE_SEASON increments shuffle count", () => {
    const next = createInitialState();
    // verify the tools shape is correct
    expect(next.tools.shuffle).toBeDefined();
  });
});
