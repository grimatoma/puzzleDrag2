import { describe, it, expect } from "vitest";
import { bodyFor } from "./htmlContent.js";

describe("board-kind authored bodies", () => {
  it.each(["farm", "mine", "fish"])("has an authored body for %s", (k) => {
    const body = bodyFor("boardKinds", k);
    expect(typeof body).toBe("string");
    expect((body as string).length).toBeGreaterThan(0);
  });
  it("mine body mentions the Mysterious Ore countdown", () => {
    expect(bodyFor("boardKinds", "mine")).toMatch(/Mysterious Ore/i);
  });
  it("fish body mentions tides", () => {
    expect(bodyFor("boardKinds", "fish")).toMatch(/tide/i);
  });
});
