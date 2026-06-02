// @vitest-environment jsdom
/**
 * BoonCard.test.tsx — TDD suite for the wiki boon section.
 *
 * Uses real catalog data. `deer_blessing` (farm/coexist) costs 3 Embers and
 * grants a 1.2× bond-gain multiplier, exercising the cost chip + effect read.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BoonCard, hasBoonCard } from "./BoonCard.jsx";
import { getEntity } from "../conceptEntities.js";

afterEach(() => cleanup());

function boon(id: string) {
  const b = getEntity("boons", id);
  if (b == null) throw new Error(`boon ${id} not found`);
  return b as React.ComponentProps<typeof BoonCard>["boon"];
}

describe("BoonCard — real boon (deer_blessing)", () => {
  it("renders the Boon heading and the cost in Embers", () => {
    render(<BoonCard boon={boon("deer_blessing")} />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Boon");
    expect(body).toMatch(/cost/i);
    expect(body).toMatch(/Embers/);
    expect(body).toContain("3");
  });

  it("renders the effect with a humanized type and a percentage", () => {
    render(<BoonCard boon={boon("deer_blessing")} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/effect/i);
    // bond_gain_mult → "Bond gain", mult 1.2 → "+20%"
    expect(body).toMatch(/Bond gain/i);
    expect(body).toContain("+20%");
  });

  it("renders the boon description as flavor", () => {
    render(<BoonCard boon={boon("deer_blessing")} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Villager bonds rise/i);
  });
});

describe("hasBoonCard", () => {
  it("is true for a real boon", () => {
    expect(hasBoonCard(boon("deer_blessing"))).toBe(true);
  });
  it("is false for null", () => {
    expect(hasBoonCard(null)).toBe(false);
  });
});
