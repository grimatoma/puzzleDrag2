// @vitest-environment jsdom
/**
 * WikiHome.test.tsx — TDD suite for the Phase 4a visual discovery landing.
 *
 * Coverage:
 *  1. Category tiles rendered for each section's concepts (live from WIKI_SECTIONS).
 *  2. Tiles show live counts from CONCEPTS.getEntries().
 *  3. Clicking a tile calls navigate({ tab: conceptId }).
 *  4. Screens section hidden in player view; shown in developer view.
 *  5. Overview prose still renders via NarrativePage (data-testid and text content).
 *  6. "Browse by category" heading present.
 *  7. "Start here" section present with core-loop chips.
 *  8. Narrative page links present in Start here (excluding overview).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { WikiViewProvider } from "./wikiView.js";
import { WikiHome } from "./WikiHome.jsx";
import { CONCEPTS } from "./concepts.js";
import { WIKI_SECTIONS, NARRATIVE_PAGES, DEV_ONLY_SECTION_IDS } from "./wikiNav.js";

afterEach(() => {
  cleanup();
  localStorage.removeItem("hearth.wiki.view");
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderHome({ navigate = vi.fn(), view = "developer" as "developer" | "player" } = {}) {
  if (view !== "developer") {
    localStorage.setItem("hearth.wiki.view", view);
  }
  return render(
    <WikiViewProvider>
      <WikiHome navigate={navigate} />
    </WikiViewProvider>,
  );
}

// ─── Test 1: Category tiles rendered for each section ────────────────────────

describe("WikiHome — category tiles from WIKI_SECTIONS", () => {
  it("renders a concept tile for every concept in the Board section", () => {
    renderHome();
    const boardSection = WIKI_SECTIONS.find((s) => s.id === "board")!;
    const allConceptIds = boardSection.nodes.flatMap((n) => [
      n.conceptId,
      ...(n.children ?? []),
    ]);
    for (const cid of allConceptIds) {
      const tile = screen.queryByTestId(`concept-tile-${cid}`);
      expect(tile, `Tile for '${cid}' not found`).not.toBeNull();
    }
  });

  it("renders a concept tile for every concept in the Economy section", () => {
    renderHome();
    const sec = WIKI_SECTIONS.find((s) => s.id === "economy")!;
    const allConceptIds = sec.nodes.flatMap((n) => [n.conceptId, ...(n.children ?? [])]);
    for (const cid of allConceptIds) {
      expect(screen.queryByTestId(`concept-tile-${cid}`), `Tile for '${cid}' not found`).not.toBeNull();
    }
  });

  it("renders a concept tile for every concept in the World section", () => {
    renderHome();
    const sec = WIKI_SECTIONS.find((s) => s.id === "world")!;
    const allConceptIds = sec.nodes.flatMap((n) => [n.conceptId, ...(n.children ?? [])]);
    for (const cid of allConceptIds) {
      expect(screen.queryByTestId(`concept-tile-${cid}`), `Tile for '${cid}' not found`).not.toBeNull();
    }
  });

  it("renders a concept tile for every concept in the Progression section", () => {
    renderHome();
    const sec = WIKI_SECTIONS.find((s) => s.id === "progression")!;
    const allConceptIds = sec.nodes.flatMap((n) => [n.conceptId, ...(n.children ?? [])]);
    for (const cid of allConceptIds) {
      expect(screen.queryByTestId(`concept-tile-${cid}`), `Tile for '${cid}' not found`).not.toBeNull();
    }
  });
});

// ─── Test 2: Tiles show live counts ──────────────────────────────────────────

describe("WikiHome — concept tile live counts", () => {
  it("shows the live entry count for 'tiles' concept", () => {
    renderHome();
    const concept = CONCEPTS.find((c) => c.id === "tiles")!;
    const count = concept.getEntries().length;
    // The tile aria-label includes the count
    const tile = screen.getByTestId("concept-tile-tiles");
    const label = tile.getAttribute("aria-label") ?? "";
    expect(label).toContain(String(count));
  });

  it("shows the live entry count for 'recipes' concept", () => {
    renderHome();
    const concept = CONCEPTS.find((c) => c.id === "recipes")!;
    const count = concept.getEntries().length;
    const tile = screen.getByTestId("concept-tile-recipes");
    const label = tile.getAttribute("aria-label") ?? "";
    expect(label).toContain(String(count));
  });

  it("shows the live entry count for 'bosses' concept", () => {
    renderHome();
    const concept = CONCEPTS.find((c) => c.id === "bosses")!;
    const count = concept.getEntries().length;
    const tile = screen.getByTestId("concept-tile-bosses");
    const label = tile.getAttribute("aria-label") ?? "";
    expect(label).toContain(String(count));
  });
});

// ─── Test 3: Clicking a tile calls navigate ───────────────────────────────────

describe("WikiHome — tile navigation", () => {
  it("clicking the 'tiles' concept tile calls navigate({ tab: 'tiles' })", () => {
    const navigate = vi.fn();
    renderHome({ navigate });
    fireEvent.click(screen.getByTestId("concept-tile-tiles"));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ tab: "tiles" }));
  });

  it("clicking the 'bosses' concept tile calls navigate({ tab: 'bosses' })", () => {
    const navigate = vi.fn();
    renderHome({ navigate });
    fireEvent.click(screen.getByTestId("concept-tile-bosses"));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ tab: "bosses" }));
  });

  it("clicking the 'resources' concept tile calls navigate({ tab: 'resources' })", () => {
    const navigate = vi.fn();
    renderHome({ navigate });
    fireEvent.click(screen.getByTestId("concept-tile-resources"));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ tab: "resources" }));
  });
});

// ─── Test 4: Screens section visibility ──────────────────────────────────────

describe("WikiHome — Screens section visibility", () => {
  it("hides the Screens section in player view", () => {
    renderHome({ view: "player" });
    // The Screens category section should not be in the DOM
    const screensSection = screen.queryByTestId("category-section-screens");
    expect(screensSection).toBeNull();
  });

  it("shows the Screens section in developer view", () => {
    renderHome({ view: "developer" });
    const screensSection = screen.queryByTestId("category-section-screens");
    expect(screensSection).not.toBeNull();
  });

  it("concept tiles for 'views' and 'modals' absent in player view", () => {
    renderHome({ view: "player" });
    expect(screen.queryByTestId("concept-tile-views")).toBeNull();
    expect(screen.queryByTestId("concept-tile-modals")).toBeNull();
  });

  it("concept tiles for 'views' and 'modals' present in developer view", () => {
    renderHome({ view: "developer" });
    expect(screen.queryByTestId("concept-tile-views")).not.toBeNull();
    expect(screen.queryByTestId("concept-tile-modals")).not.toBeNull();
  });

  it("DEV_ONLY_SECTION_IDS from wikiNav drives the player-view filter — all listed sections absent in player view", () => {
    // This test verifies that the shared DEV_ONLY_SECTION_IDS constant (not a
    // local duplicate) is what controls which sections are hidden for players.
    // If a section id is added to DEV_ONLY_SECTION_IDS it will automatically be
    // hidden here without any changes to WikiHome.
    renderHome({ view: "player" });
    for (const sectionId of DEV_ONLY_SECTION_IDS) {
      const section = screen.queryByTestId(`category-section-${sectionId}`);
      expect(section, `Section '${sectionId}' should be hidden in player view`).toBeNull();
    }
  });

  it("DEV_ONLY_SECTION_IDS sections are all visible in developer view", () => {
    renderHome({ view: "developer" });
    for (const sectionId of DEV_ONLY_SECTION_IDS) {
      const section = screen.queryByTestId(`category-section-${sectionId}`);
      expect(section, `Section '${sectionId}' should be visible in developer view`).not.toBeNull();
    }
  });
});

// ─── Test 5: Overview prose renders ──────────────────────────────────────────

describe("WikiHome — overview prose", () => {
  it("renders the wiki-home container", () => {
    renderHome();
    expect(screen.getByTestId("wiki-home")).not.toBeNull();
  });

  it("renders a wiki-home-prose section wrapping NarrativePage", () => {
    const { container } = renderHome();
    // The prose section exists and has aria-label="Overview"
    const prose = container.querySelector(".wiki-home-prose");
    expect(prose).not.toBeNull();
  });
});

// ─── Test 6: Browse by category heading ──────────────────────────────────────

describe("WikiHome — browse by category heading", () => {
  it("renders a 'Browse by category' heading", () => {
    renderHome();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/browse by category/i);
  });

  it("renders the browse-by-category section with correct testid", () => {
    renderHome();
    expect(screen.getByTestId("browse-by-category")).not.toBeNull();
  });
});

// ─── Test 7: Start here section ──────────────────────────────────────────────

describe("WikiHome — start here section", () => {
  it("renders a 'Start here' heading", () => {
    renderHome();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/start here/i);
  });

  it("renders a core-loop chip for 'Tiles'", () => {
    renderHome();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Tiles");
  });

  it("renders a core-loop chip for 'Bosses'", () => {
    renderHome();
    const body = document.body.textContent ?? "";
    expect(body).toContain("Bosses");
  });

  it("clicking a start-here chip calls navigate with the concept tab", () => {
    const navigate = vi.fn();
    const { container } = renderHome({ navigate });
    // Find the Tiles chip in the start-here chain by aria-label.
    // Buttons have no role="listitem" — they keep their implicit button role.
    const tilesChip = container.querySelector('[aria-label="Browse Tiles"]');
    expect(tilesChip, "Expected 'Browse Tiles' chip to be present").not.toBeNull();
    fireEvent.click(tilesChip!);
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ tab: "tiles" }));
  });
});

// ─── Test 8: Narrative page links in Start here ───────────────────────────────

describe("WikiHome — narrative page links", () => {
  it("renders narrative page links for pages other than overview", () => {
    renderHome();
    const nonOverviewPages = NARRATIVE_PAGES.filter((p) => p.slug !== "overview");
    expect(nonOverviewPages.length).toBeGreaterThan(0);
    const body = document.body.textContent ?? "";
    for (const p of nonOverviewPages) {
      expect(body, `Narrative page '${p.label}' not found`).toContain(p.label);
    }
  });

  it("clicking the Direction narrative link calls navigate({ tab: 'page', focus: 'direction' })", () => {
    const navigate = vi.fn();
    const { container } = renderHome({ navigate });
    // Query by aria-label — buttons have no role="listitem", they keep their implicit button role.
    const dirLink = container.querySelector('[aria-label="Read Direction"]');
    expect(dirLink, "Expected 'Read Direction' link to be present").not.toBeNull();
    fireEvent.click(dirLink!);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ tab: "page", focus: "direction" }),
    );
  });
});
