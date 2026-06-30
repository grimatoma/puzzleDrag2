// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InventoryGrid } from "./Inventory.js";
import { getItem } from "../constants.js";
import type { GameState } from "../types/state.js";

// jsdom lacks ResizeObserver, which AutoFitText (used by the browser rows and
// detail pane) constructs on mount. A no-op stub keeps the render from throwing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// A bare state with just the slices InventoryGrid reads (tools / market / built).
const baseState = { tools: {}, market: { prices: {} }, built: {} } as unknown as GameState;

afterEach(() => cleanup());

describe("inventory detail panel descriptions", () => {
  it("shows a resource's description in the wide detail pane", () => {
    const dirtDesc = getItem("dirt")?.desc;
    expect(dirtDesc).toBeTruthy();

    render(
      <InventoryGrid
        inventory={{ dirt: 5 }}
        biomeKey="farm"
        state={baseState}
        dispatch={vi.fn()}
        // Narrow to a single resource so it auto-selects into the detail pane.
        query="Dirt"
        sort="alpha"
        compact={false}
        viewMode="list"
      />,
    );

    expect(screen.getByText(dirtDesc as string)).not.toBeNull();
  });

  it("shows a description in the compact expanded list row", () => {
    const dirtDesc = getItem("dirt")?.desc;

    render(
      <InventoryGrid
        inventory={{ dirt: 5 }}
        biomeKey="farm"
        state={baseState}
        dispatch={vi.fn()}
        query="Dirt"
        sort="alpha"
        compact
        viewMode="list"
      />,
    );

    // Compact list rows start collapsed — expand the row to reveal its details.
    fireEvent.click(screen.getByRole("button", { name: /View Dirt/ }));
    expect(screen.getByText(dirtDesc as string)).not.toBeNull();
  });
});
