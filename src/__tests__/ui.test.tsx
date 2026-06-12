// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import React from "react";
vi.mock("../ui/TownPhaserCanvas.jsx", () => ({ default: () => null }));
import { BottomNav } from "../ui";
import { TownBuildingTooltipContent } from "../ui/Town";
import type { GameState } from "../types/state";

describe("BottomNav", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders tabs correctly with given view selected", () => {
    const mockDispatch = vi.fn();
    const state = {
      orders: [],
      inventory: {}
    } as unknown as GameState;

    render(<BottomNav view="town" dispatch={mockDispatch} state={state} />);

    // Check if tabs are rendered
    expect(screen.getByText("Town")).toBeDefined();
    expect(screen.getByText("Inventory")).toBeDefined();
    expect(screen.getByText("Craft")).toBeDefined();
    expect(screen.getByText("Map")).toBeDefined();
    expect(screen.getByText("Townsfolk")).toBeDefined();

    // Check active tab visually
    const townTab = screen.getByRole("button", { name: "Town" });
    expect(townTab.getAttribute("aria-current")).toBe("page");

    const inventoryTab = screen.getByRole("button", { name: "Inventory" });
    expect(inventoryTab.getAttribute("aria-current")).toBeNull();
  });

  it("handles tab selection to dispatch SET_VIEW", () => {
    const mockDispatch = vi.fn();
    const state = {
      orders: [],
      inventory: {}
    } as unknown as GameState;

    render(<BottomNav view="town" dispatch={mockDispatch} state={state} />);

    const inventoryTab = screen.getByRole("button", { name: "Inventory" });
    fireEvent.click(inventoryTab);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SET_VIEW", view: "inventory" });

    const craftTab = screen.getByRole("button", { name: "Craft" });
    fireEvent.click(craftTab);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SET_VIEW", view: "crafting" });
  });

  it("renders orders badge when there are ready orders", () => {
    const mockDispatch = vi.fn();
    const state = {
      orders: [
        { key: "itemA", need: 2 },
        { key: "itemB", need: 3 }
      ],
      inventory: { home: { itemA: 5, itemB: 1 } },
      mapCurrent: "home",
      activeZone: "home",
      farmRun: null,
    } as unknown as GameState;

    render(<BottomNav view="town" dispatch={mockDispatch} state={state} />);

    // "itemA" is ready (5 >= 2), "itemB" is not (1 < 3). So count should be 1.
    const inventoryTab = screen.getByRole("button", { name: "Inventory" });
    const badgeText = within(inventoryTab).getByText("1");
    expect(badgeText).toBeDefined();
  });

  it("does not render orders badge when there are no ready orders", () => {
    const mockDispatch = vi.fn();
    const state = {
      orders: [
        { key: "itemA", need: 10 }
      ],
      inventory: { home: { itemA: 5 } },
      mapCurrent: "home",
      activeZone: "home",
      farmRun: null,
    } as unknown as GameState;

    render(<BottomNav view="town" dispatch={mockDispatch} state={state} />);

    const inventoryTab = screen.getByRole("button", { name: "Inventory" });
    const badgeText = within(inventoryTab).queryByText("1");
    expect(badgeText).toBeNull();
  });
});

describe("TownBuildingTooltipContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the standard high-contrast game tooltip text treatment for building names", () => {
    render(
      <TownBuildingTooltipContent
        data={{
          label: "Workshop",
          desc: "Crafts tools from raw materials.",
          color: "#3a2a1a",
        }}
      />,
    );

    const title = screen.getByText("Workshop");
    expect(Array.from(title.classList)).toContain("text-cream");
    expect(Array.from(title.classList)).toContain("text-body");
    expect(Array.from(title.classList)).toContain("font-bold");
    expect(title.getAttribute("style") ?? "").not.toContain("#3a2a1a");
    expect(Array.from(screen.getByText("Crafts tools from raw materials.").classList)).toContain("text-cream/80");
  });
});
