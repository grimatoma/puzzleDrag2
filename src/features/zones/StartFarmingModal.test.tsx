// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import StartFarmingModal from "./StartFarmingModal.js";
import type { GameState } from "../../types/state";

// The "home" zone exposes <= 8 categories, so every slot is locked and a click
// on the slot itself opens the variant chooser (no pencil button). A slot with
// only a single discovered variant has nothing to swap to — clicking it must
// NOT open a dead-end chooser modal.
function farmState(discovered: Record<string, boolean>, active: Record<string, string | null>): GameState {
  return {
    activeZone: "home",
    coins: 1000,
    tools: { fertilizer: 0 },
    tileCollection: {
      discovered,
      activeByCategory: active,
    },
  } as unknown as GameState;
}

describe("StartFarmingModal variant chooser gating", () => {
  afterEach(() => cleanup());

  it("opens the chooser when a locked slot has more than one discovered variant", () => {
    render(
      <StartFarmingModal
        state={farmState(
          { tile_grain_wheat: true, tile_grain_corn: true },
          { grain: "tile_grain_wheat" },
        )}
        dispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Grain selected/ }));
    expect(screen.queryByText("Choose Grain tile")).not.toBeNull();
  });

  it("does not open the chooser when a locked slot has only one discovered variant", () => {
    render(
      <StartFarmingModal
        state={farmState(
          { tile_grass_grass: true },
          { grass: "tile_grass_grass" },
        )}
        dispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Grass selected/ }));
    expect(screen.queryByText("Choose Grass tile")).toBeNull();
  });
});
