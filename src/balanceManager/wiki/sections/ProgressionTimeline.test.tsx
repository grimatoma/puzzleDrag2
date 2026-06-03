// @vitest-environment jsdom
/**
 * ProgressionTimeline.test.tsx — TDD suite for the Tiles "Progression & unlock
 * map" wiki overview section.
 *
 * Uses real catalog data (features/tileCollection/data.js + the discovery
 * methods config). No fakes.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import {
  ProgressionTimeline,
  ProgressionTimelineContent,
} from "./ProgressionTimeline.jsx";
import { TILE_TYPES } from "../../../features/tileCollection/data.js";

afterEach(() => cleanup());

function renderContent({ navigate = vi.fn() } = {}) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <ProgressionTimelineContent />
    </BalanceNavProvider>,
  );
}

function renderSection({ navigate = vi.fn() } = {}) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <ProgressionTimeline />
    </BalanceNavProvider>,
  );
}

describe("ProgressionTimelineContent — tier bands + legend + chips", () => {
  it("renders tier band headings (Tier 0 Starters and at least one higher tier)", () => {
    const { container } = renderContent();
    const body = container.textContent ?? "";
    expect(body).toMatch(/Tier 0/);
    expect(body).toMatch(/Starters/);
    // The real catalog has tiles beyond tier 0.
    expect(body).toMatch(/Tier 3/);
  });

  it("renders a discovery-method legend with the 'Unlock method' label", () => {
    const { container } = renderContent();
    const body = container.textContent ?? "";
    expect(body).toMatch(/unlock method/i);
  });

  it("renders the friendly method names (Default + Chain) as badges", () => {
    const { container } = renderContent();
    const body = container.textContent ?? "";
    // Default tiles exist (tile_grass_grass) and chain tiles exist (wheat).
    expect(body).toContain("Default");
    expect(body).toContain("Chain");
  });

  it("renders a navigable tile chip carrying its displayName", () => {
    renderContent();
    // tile_grass_grass → "Grass", default discovery → present in tier 0.
    const chip = screen.getByTitle("tiles:tile_grass_grass");
    expect(chip).not.toBeNull();
    expect(chip.textContent ?? "").toContain("Grass");
  });

  it("a tile chip navigates to its wiki article via wikiNavTarget", () => {
    const navigate = vi.fn();
    renderContent({ navigate });
    fireEvent.click(screen.getByTitle("tiles:tile_grass_grass"));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ tab: "tiles", focus: "tiles:tile_grass_grass" }),
    );
  });

  it("renders one chip per tile in the catalog", () => {
    renderContent();
    // Every tile id appears as a button titled tiles:<id>.
    expect(screen.getByTitle(`tiles:${TILE_TYPES[0].id}`)).not.toBeNull();
  });
});

describe("ProgressionTimeline — collapsed-by-default section", () => {
  it("renders the 'Progression & unlock map' summary", () => {
    const { container } = renderSection();
    expect(container.querySelector("#progression-timeline")).not.toBeNull();
    expect((container.textContent ?? "")).toMatch(/progression & unlock map/i);
  });

  it("does not mount the heavy content until opened", () => {
    renderSection();
    // Collapsed by default — no tile chips and no legend label rendered yet.
    expect(screen.queryByTitle("tiles:tile_grass_grass")).toBeNull();
    expect(document.body.textContent ?? "").not.toMatch(/unlock method/i);
  });

  it("mounts the content (legend + chips) after clicking the summary", () => {
    const { container } = renderSection();
    const summary = container.querySelector("summary")!;
    fireEvent.click(summary);
    expect(screen.getByTitle("tiles:tile_grass_grass")).not.toBeNull();
    expect(document.body.textContent ?? "").toMatch(/unlock method/i);
  });
});
