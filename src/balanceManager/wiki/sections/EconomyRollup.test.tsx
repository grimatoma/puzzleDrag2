// @vitest-environment jsdom
/**
 * EconomyRollup.test.tsx — TDD suite for the Buildings "Town economy" section.
 *
 * Uses real catalog data via analyseBuildingCosts({}) — no fakes.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { EconomyRollup } from "./EconomyRollup.jsx";
import { analyseBuildingCosts } from "../../buildingCosts.js";

afterEach(() => cleanup());

describe("EconomyRollup", () => {
  const { perResource, totals } = analyseBuildingCosts({});

  it("renders the section heading", () => {
    const { container } = render(<EconomyRollup />);
    expect(container.querySelector("#economy-rollup")).not.toBeNull();
    expect((container.textContent ?? "")).toMatch(/town economy/i);
  });

  it("renders the surviving currency metric card with the summed total", () => {
    const { container } = render(<EconomyRollup />);
    const body = container.textContent ?? "";
    // Buildings are resource-only after the PC2 cost port — coins are no longer
    // a building currency, so the coins card drops out. Runes survive (the
    // Magic Portal is rune-gated), so that currency card still renders.
    expect(totals.coins).toBe(0);
    expect(totals.runes).toBeGreaterThan(0);
    expect(body).toMatch(/runes/i);
    expect(body).toContain(totals.runes.toLocaleString("en-US"));
  });

  it("renders a per-resource bar with a 'used by N buildings' annotation", () => {
    const { container } = render(<EconomyRollup />);
    const body = container.textContent ?? "";
    expect(perResource.length).toBeGreaterThan(0);
    expect(body).toMatch(/resources required/i);

    // The top resource (sorted qty desc) and its usedBy count both render.
    const top = perResource[0];
    expect(body).toContain(top.qty.toLocaleString("en-US"));
    const n = top.usedBy.length;
    expect(body).toContain(`used by ${n} building${n === 1 ? "" : "s"}`);
  });
});
