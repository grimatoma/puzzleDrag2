import { describe, it, expect } from "vitest";
import { getObtainableResources, findUnobtainableResources } from "./obtainable.js";
import { RESOURCES } from "../constants.js";

describe("resource obtainability", () => {
  it("every defined resource is reachable (gather or craft)", () => {
    // The dev validation the balancing pass relies on: a resource may only exist
    // if the player can get it. A non-empty list here means a resource was added
    // (or its source removed) with no board/craft path — fix the data or this
    // test, never both silently.
    expect(findUnobtainableResources()).toEqual([]);
  });

  it("obtainable set is a superset of every defined resource key", () => {
    const obtainable = getObtainableResources();
    const obtainableObjects = new Set<object>();
    for (const [key, def] of Object.entries(RESOURCES)) {
      if (obtainable.has(key)) obtainableObjects.add(def as object);
    }
    for (const key of Object.keys(RESOURCES)) {
      const reachable =
        obtainable.has(key) ||
        obtainableObjects.has(RESOURCES[key as keyof typeof RESOURCES] as object);
      expect(reachable, `resource "${key}" should be obtainable`).toBe(true);
    }
  });
});
