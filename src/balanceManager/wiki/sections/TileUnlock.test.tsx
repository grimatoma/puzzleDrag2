// @vitest-environment jsdom
/**
 * TileUnlock.test.tsx — TDD suite for the wiki tile unlock section.
 *
 * Uses real catalog data:
 *   - tile_grain_wheat: chain discovery (chainLengthOf tile_grass_grass)
 *   - tile_grass_grass:   default discovery (available from the start)
 *   - non-tile id:      renders nothing
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { TileUnlock, hasTileUnlock } from "./TileUnlock.jsx";
import { TILE_TYPES_MAP } from "../../../features/tileCollection/data.js";

afterEach(() => cleanup());

function renderTile(tileId: string, navigate = vi.fn()) {
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <TileUnlock tileId={tileId} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate };
}

describe("TileUnlock — chain-discovery tile (tile_grain_wheat)", () => {
  it("renders the How to unlock heading and the chain method", () => {
    renderTile("tile_grain_wheat");
    const body = document.body.textContent ?? "";
    expect(body).toContain("How to unlock");
    expect(body).toMatch(/chain/i);
  });

  it("renders the required chain length and the prerequisite tile", () => {
    renderTile("tile_grain_wheat");
    const body = document.body.textContent ?? "";
    const d = (TILE_TYPES_MAP as Record<string, { discovery?: { chainLength?: number } }>)[
      "tile_grain_wheat"
    ].discovery!;
    // The concrete chain length param renders as "N×"
    expect(body).toContain(`${d.chainLength}×`);
    // Prerequisite tile (Grass) label renders
    expect(body).toMatch(/grass/i);
  });

  it("renders a navigable prerequisite chip via wikiNavTarget", () => {
    const { navigate } = renderTile("tile_grain_wheat");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.focus).toMatch(/^[a-zA-Z_]+:.+/);
    expect(arg.tab).toBe(arg.focus.slice(0, arg.focus.indexOf(":")));
  });
});

describe("TileUnlock — default-discovery tile (tile_grass_grass)", () => {
  it("renders 'from the start'", () => {
    renderTile("tile_grass_grass");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/from the start/i);
  });
});

describe("TileUnlock — research-discovery tile (tile_grass_spiky)", () => {
  it("renders the Research requirement with the cumulative amount and source", () => {
    renderTile("tile_grass_spiky");
    const body = document.body.textContent ?? "";
    // discovery: { method: "research", researchOf: "tile_grass_grass", researchAmount: 50 }
    expect(body).toMatch(/research/i);
    expect(body).toContain("50");
    expect(body).toMatch(/grass/i);
  });
});

describe("TileUnlock — buy-discovery tile (tile_bird_clover)", () => {
  it("renders the Buy requirement with the coin cost", () => {
    renderTile("tile_bird_clover");
    const body = document.body.textContent ?? "";
    // discovery: { method: "buy", coinCost: 200 }
    expect(body).toMatch(/buy for/i);
    expect(body).toContain("200");
    expect(body).toMatch(/coins/i);
  });
});

describe("TileUnlock — building-discovery tile (tile_veg_broccoli)", () => {
  it("renders the Build requirement referencing the building", () => {
    renderTile("tile_veg_broccoli");
    const body = document.body.textContent ?? "";
    // discovery: { method: "building", buildingId: "kitchen" }
    expect(body).toMatch(/build the/i);
    expect(body).toMatch(/kitchen/i);
  });
});

describe("TileUnlock — daily-discovery tile (tile_cattle_triceratops)", () => {
  it("renders the Day N login reward requirement", () => {
    renderTile("tile_cattle_triceratops");
    const body = document.body.textContent ?? "";
    // discovery: { method: "daily", day: 30 }
    expect(body).toMatch(/day/i);
    expect(body).toContain("30");
    expect(body).toMatch(/login reward/i);
  });
});

describe("TileUnlock — non-tile id", () => {
  it("renders nothing for an id not in the tile catalog", () => {
    const { container } = renderTile("not_a_tile_xyz");
    expect(hasTileUnlock("not_a_tile_xyz")).toBe(false);
    expect(container.querySelector("#tile-unlock")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});

describe("hasTileUnlock", () => {
  it("is true for a catalog tile", () => {
    expect(hasTileUnlock("tile_grain_wheat")).toBe(true);
  });
});

describe("TileUnlock — method links to its discovery-method page", () => {
  it("navigates to tileDiscoveryMethods on clicking the method", () => {
    const navigate = vi.fn();
    render(
      <BalanceNavProvider focus={null} navigate={navigate}>
        <TileUnlock tileId="tile_grain_wheat" />
      </BalanceNavProvider>,
    );
    // The method button exposes a friendly accessible name ("Go to <method>").
    const methodBtn = screen.getByRole("button", { name: /^Go to / });
    expect(methodBtn).toBeTruthy();
    fireEvent.click(methodBtn);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toMatchObject({ tab: "tileDiscoveryMethods" });
  });
});
