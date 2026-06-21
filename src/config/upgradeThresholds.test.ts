import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("upgradeThresholds.ts stays import-free (cycle guard)", () => {
  it("has no import/require statements", () => {
    const path = fileURLToPath(new URL("./upgradeThresholds.ts", import.meta.url));
    const src = readFileSync(path, "utf8");
    expect(/^\s*import\s/m.test(src)).toBe(false);
    expect(/\brequire\s*\(/.test(src)).toBe(false);
  });
});
