// @vitest-environment jsdom
/**
 * ZoneDetail.test.tsx — TDD suite for the wiki zone "drop rates & upgrades" section.
 *
 * Uses real catalog data (features/zones/data.js):
 *   - home: FARM_SEASON_DROPS_TEMPERATE + an upgradeMap (grass → birds, …)
 *   - an empty synthetic zone: no drops, no upgradeMap → renders nothing
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ZoneDetail, hasZoneDetail } from "./ZoneDetail.jsx";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { ZONES } from "../../../features/zones/data.js";

afterEach(() => cleanup());

describe("ZoneDetail — home zone (real drops + upgradeMap)", () => {
  const home = ZONES.home as unknown as React.ComponentProps<typeof ZoneDetail>["zone"];

  it("hasZoneDetail is true for home", () => {
    expect(hasZoneDetail(ZONES.home)).toBe(true);
  });

  it("renders the section heading and the season drop-rate table header", () => {
    const { container } = render(<ZoneDetail zone={home} />);
    const body = container.textContent ?? "";
    expect(container.querySelector("#zone-detail")).not.toBeNull();
    expect(body).toMatch(/drop rates/i);
    expect(body).toMatch(/season drop rates/i);
  });

  it("renders one row per season present in the drops", () => {
    const { container } = render(<ZoneDetail zone={home} />);
    const body = container.textContent ?? "";
    for (const season of Object.keys(ZONES.home.boards.farm!.seasonDrops)) {
      expect(body).toContain(season);
    }
  });

  it("renders the drop percentage cells (e.g. Spring grass 38%)", () => {
    const { container } = render(<ZoneDetail zone={home} />);
    const body = container.textContent ?? "";
    // FARM_SEASON_DROPS_TEMPERATE Spring.grass = 0.38 → "38%"
    expect(body).toContain("38%");
  });

  it("renders at least one upgrade-map arrow (grass → birds)", () => {
    const { container } = render(<ZoneDetail zone={home} />);
    const body = container.textContent ?? "";
    expect(body).toMatch(/chain upgrades/i);
    // The arrow glyph appears once per upgrade pair.
    expect(body).toContain("→");
    // Source category "grass" is humanized to "Grass".
    expect(body).toContain("Grass");
  });

  it("renders category tags as buttons that navigate to the category wiki page", () => {
    const navigate = vi.fn();
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={navigate}>
        <ZoneDetail zone={home} />
      </BalanceNavProvider>,
    );
    // Find the "Grass" category button (appears as a column header / upgrade source).
    const grassBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("Grass"),
    );
    expect(grassBtn).toBeDefined();
    fireEvent.click(grassBtn!);
    expect(navigate).toHaveBeenCalledWith({ tab: "categories", focus: "categories:grass" });
  });
});

describe("ZoneDetail — empty zone", () => {
  const emptyZone = { boards: { farm: { seasonDrops: { Spring: {}, Summer: {}, Autumn: {}, Winter: {} }, upgradeMap: {} } } };

  it("hasZoneDetail is false and renders nothing", () => {
    expect(hasZoneDetail(emptyZone)).toBe(false);
    const { container } = render(
      <ZoneDetail zone={emptyZone as React.ComponentProps<typeof ZoneDetail>["zone"]} />,
    );
    expect(container.querySelector("#zone-detail")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });

  it("hasZoneDetail is false for null", () => {
    expect(hasZoneDetail(null)).toBe(false);
  });
});
