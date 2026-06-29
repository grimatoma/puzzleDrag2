import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/state.js";
import { getCategoryViewModel, getTileDetailViewModel } from "../src/features/tileCollection/effects.js";

describe("tile detail view models", () => {
  it("exposes detail data for locked, buyable, and active tiles", () => {
    const state = createInitialState();

    const grassRows = getCategoryViewModel(state, "grass");
    const hay = grassRows.find((r) => r.id === "tile_grass_grass");
    expect(hay).toMatchObject({
      locked: false,
      active: true,
      action: "toggle",
      description: expect.any(String),
    });

    const activeDetail = getTileDetailViewModel(state, "tile_grass_grass");
    expect(activeDetail).toMatchObject({
      action: "active",
      actionLabel: "Active",
      actionDisabled: true,
      effects: expect.any(Object),
    });

    const buyDetail = getTileDetailViewModel(state, "tile_bird_dodo");
    expect(buyDetail).toMatchObject({
      locked: true,
      action: "buy",
      actionLabel: "Buy 250◉",
      description: expect.any(String),
    });

    const researchDetail = getTileDetailViewModel(state, "tile_flower_water_lily");
    expect(researchDetail).toMatchObject({
      locked: true,
      action: "research",
      researchProgress: 0,
      // No research focus selected → the toggle invites the player to start, and is actionable.
      researching: false,
      actionLabel: "Research this",
      actionDisabled: false,
    });
  });
});
