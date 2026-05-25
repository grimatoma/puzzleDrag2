import { describe, it, expect } from "vitest";
import { KNOWN_VIEWS } from "../router.js";

const featureModules = import.meta.glob("../features/*/index.{jsx,tsx,js}", { eager: true });

describe("router KNOWN_VIEWS", () => {
  it("includes every feature viewKey export", () => {
    const exported = new Set();
    for (const mod of Object.values(featureModules)) {
      if (mod.viewKey) exported.add(mod.viewKey);
    }
    for (const key of exported) {
      expect(KNOWN_VIEWS.has(key), `missing viewKey ${key}`).toBe(true);
    }
  });
});
