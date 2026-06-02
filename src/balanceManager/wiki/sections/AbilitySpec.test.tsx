// @vitest-environment jsdom
/**
 * AbilitySpec.test.tsx — TDD suite for the wiki ability "Specification" section.
 *
 * Uses real catalog data (config/abilities.js):
 *   - bonus_yield: trigger on_chain_collect, channel bonusYield,
 *     scope [worker, tile, building], params [target, amount(default 1)]
 *   - a no-spec object → renders nothing
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { AbilitySpec, hasAbilitySpec } from "./AbilitySpec.jsx";
import { ABILITIES } from "../../../config/abilities.js";

afterEach(() => cleanup());

function abilityById(id: string) {
  return ABILITIES.find((a) => a.id === id)!;
}

describe("AbilitySpec — bonus_yield (real ability)", () => {
  const bonusYield = abilityById("bonus_yield");

  it("hasAbilitySpec is true", () => {
    expect(hasAbilitySpec(bonusYield)).toBe(true);
  });

  it("renders the Specification heading and the real description", () => {
    const { container } = render(<AbilitySpec ability={bonusYield} />);
    const body = container.textContent ?? "";
    expect(container.querySelector("#ability-spec")).not.toBeNull();
    expect(body).toMatch(/specification/i);
    expect(body).toContain(bonusYield.desc);
  });

  it("renders the param keys and a default value", () => {
    const { container } = render(<AbilitySpec ability={bonusYield} />);
    const body = container.textContent ?? "";
    // params: target (resourceKey), amount (int, default 1)
    expect(body).toContain("target");
    expect(body).toContain("amount");
    expect(body).toContain("resourceKey");
    // amount default is 1
    expect(body).toContain("1");
  });

  it("renders the trigger, channel, and scope badges", () => {
    const { container } = render(<AbilitySpec ability={bonusYield} />);
    const body = container.textContent ?? "";
    // trigger on_chain_collect → "On Chain Collect"
    expect(body).toMatch(/on chain collect/i);
    // channel rendered verbatim
    expect(body).toContain("bonusYield");
    // scopes humanized — at least Worker / Tile / Building
    expect(body).toMatch(/worker/i);
    expect(body).toMatch(/building/i);
  });
});

describe("AbilitySpec — no-spec object", () => {
  it("hasAbilitySpec is false and renders nothing", () => {
    expect(hasAbilitySpec({})).toBe(false);
    expect(hasAbilitySpec(null)).toBe(false);
    const { container } = render(<AbilitySpec ability={{}} />);
    expect(container.querySelector("#ability-spec")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});
