// @vitest-environment jsdom
/**
 * ZoneTierLadder.test.tsx — suite for the wiki zone "settlement tiers & upgrade
 * costs" section.
 *
 * Uses real catalog data (features/zones/data.js):
 *   - quarry: 6-rung mine ladder with a per-rung upgradeCost → full cost table
 *   - caves:  flat mine zone (no tiers)                       → "single-tier" note
 *   - crossroads: no board (event node)                       → renders nothing
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { ZoneTierLadder, hasZoneTierLadder } from "./ZoneTierLadder.jsx";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { ZONES } from "../../../features/zones/data.js";

afterEach(() => cleanup());

function renderZone(zoneId: string) {
  const zone = ZONES[zoneId] as unknown as React.ComponentProps<typeof ZoneTierLadder>["zone"];
  return render(
    <BalanceNavProvider focus={null} navigate={() => {}}>
      <ZoneTierLadder zoneId={zoneId} zone={zone} />
    </BalanceNavProvider>,
  );
}

describe("hasZoneTierLadder — settlement gate", () => {
  it("is true for board settlements (home/quarry/caves/harbor/mirefen)", () => {
    for (const id of ["home", "quarry", "caves", "harbor", "mirefen"]) {
      expect(hasZoneTierLadder(ZONES[id]), id).toBe(true);
    }
  });

  it("is false for non-settlement nodes (crossroads/fairground/pit/oldcapital)", () => {
    for (const id of ["crossroads", "fairground", "pit", "oldcapital"]) {
      expect(hasZoneTierLadder(ZONES[id]), id).toBe(false);
    }
  });

  it("is false for null/undefined", () => {
    expect(hasZoneTierLadder(null)).toBe(false);
    expect(hasZoneTierLadder(undefined)).toBe(false);
  });
});

describe("ZoneTierLadder — tiered zone (quarry)", () => {
  it("renders the section heading and a live per-rung upgrade-cost table", () => {
    const { container } = renderZone("quarry");
    expect(container.querySelector("#zone-tier-ladder")).not.toBeNull();
    const body = container.textContent ?? "";
    expect(body).toMatch(/settlement tiers/i);
    // TierLadderTable column header + real quarry rung names read live from code.
    expect(body).toMatch(/upgrade cost/i);
    expect(body).toContain("Dig Site");
    expect(body).toContain("Foundry City");
    // The ladder is a real <table>.
    expect(container.querySelector("table")).not.toBeNull();
  });
});

describe("ZoneTierLadder — flat settlement (caves)", () => {
  it("renders a single-tier note instead of a cost table", () => {
    const { container } = renderZone("caves");
    expect(container.querySelector("#zone-tier-ladder")).not.toBeNull();
    const body = container.textContent ?? "";
    expect(body).toMatch(/single-tier/i);
    expect(body).toMatch(/no per-tier/i);
    // No ladder table is rendered for a flat zone.
    expect(container.querySelector("table")).toBeNull();
  });
});

describe("ZoneTierLadder — non-settlement node (crossroads)", () => {
  it("renders nothing", () => {
    const { container } = renderZone("crossroads");
    expect(container.querySelector("#zone-tier-ladder")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});
