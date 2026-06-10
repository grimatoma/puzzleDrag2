import { describe, it, expect } from "vitest";
import { newlyCappedKeys } from "../ui/useCapToasts.js";

describe("newlyCappedKeys", () => {
  it("returns keys that flipped to capped", () => {
    expect(newlyCappedKeys({}, { hay_bundle: true })).toEqual(["hay_bundle"]);
  });

  it("ignores keys that were already capped", () => {
    expect(newlyCappedKeys({ hay_bundle: true }, { hay_bundle: true })).toEqual([]);
  });

  it("ignores keys that reset (season rollover)", () => {
    expect(newlyCappedKeys({ hay_bundle: true }, {})).toEqual([]);
  });

  it("handles null/undefined snapshots", () => {
    expect(newlyCappedKeys(null, null)).toEqual([]);
    expect(newlyCappedKeys(undefined, { plank: true })).toEqual(["plank"]);
  });

  it("treats falsy values as not capped", () => {
    expect(newlyCappedKeys({ hay_bundle: false }, { hay_bundle: true })).toEqual(["hay_bundle"]);
    expect(newlyCappedKeys({}, { hay_bundle: 0 })).toEqual([]);
  });

  it("returns multiple newly capped keys", () => {
    expect(newlyCappedKeys({ a: true }, { a: true, b: true, c: true }).sort()).toEqual(["b", "c"]);
  });
});
