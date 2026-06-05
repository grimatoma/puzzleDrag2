// @vitest-environment jsdom
/**
 * CategoryPage.test.tsx — TDD suite for the concept/category article page.
 *
 * Phase 1 layout: gallery-first.
 *  - Hero (title + blurb + StatusBadge + stat chips) leads.
 *  - Entity gallery ("Entries (N)") appears BEFORE the field reference.
 *  - The redundant standalone "Definition" section is gone.
 *  - Field reference is at the very bottom (developer view only).
 *
 * Coverage:
 *  1. Schema-backed concept ("recipes") — renders label, Fields heading, and at
 *     least one entry card (key from getEntries()[0]).
 *  2. Status wiring — "bosses" concept shows PARTIAL in its StatusBadge.
 *  3. Entry navigation — clicking an entry card calls navigate with
 *     wikiNavTarget shape { tab: "<conceptId>", focus: "<conceptId>:<key>" }.
 *  4. Schema-backed concept with a function field ("hazards") — renders without
 *     throwing, shows the Fields heading, and shows the entry grid.
 *  5. Phase 1 layout order — gallery before field reference; stat chips present.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { WikiViewProvider } from "./wikiView.js";
import { CategoryPage } from "./CategoryPage.jsx";
import { CONCEPTS } from "./concepts.js";

afterEach(() => {
  cleanup();
  localStorage.removeItem("hearth.wiki.view");
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderPage(
  conceptId: string,
  { navigate = vi.fn() } = {},
) {
  return render(
    <WikiViewProvider>
      <BalanceNavProvider focus={null} navigate={navigate}>
        <CategoryPage conceptId={conceptId} />
      </BalanceNavProvider>
    </WikiViewProvider>,
  );
}

/**
 * Render with a specific wiki view mode pre-set via localStorage.
 * WikiViewProvider reads from localStorage on initialisation.
 */
function renderPageWithView(
  conceptId: string,
  view: "developer" | "player",
  { navigate = vi.fn() } = {},
) {
  localStorage.setItem("hearth.wiki.view", view);
  return render(
    <WikiViewProvider>
      <BalanceNavProvider focus={null} navigate={navigate}>
        <CategoryPage conceptId={conceptId} />
      </BalanceNavProvider>
    </WikiViewProvider>,
  );
}

// ─── Test 1: Schema-backed concept renders label, Fields, and entry ───────────

describe("CategoryPage — recipes (schema-backed concept)", () => {
  it("renders the concept label", () => {
    renderPage("recipes");
    const body = document.body.textContent ?? "";
    // "Recipes" is the label for the recipes concept
    expect(body).toContain("Recipes");
  });

  it("renders a 'Fields' heading from ConceptFields", () => {
    renderPage("recipes");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/fields/i);
  });

  it("renders at least one entry card from getEntries()", () => {
    renderPage("recipes");
    const concept = CONCEPTS.find((c) => c.id === "recipes")!;
    const firstKey = concept.getEntries()[0].key;
    const body = document.body.textContent ?? "";
    // The first entry's key should appear somewhere in the rendered page
    expect(body).toContain(firstKey);
  });

  it("renders the concept blurb", () => {
    renderPage("recipes");
    const concept = CONCEPTS.find((c) => c.id === "recipes")!;
    const body = document.body.textContent ?? "";
    expect(body).toContain(concept.blurb);
  });

  it("renders an 'Entries' heading showing the count", () => {
    renderPage("recipes");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/entries/i);
  });

  it("renders zero editable controls", () => {
    const { container } = renderPage("recipes");
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});

describe("CategoryPage — buildings (schema-backed concept)", () => {
  it("renders the concept label 'Buildings'", () => {
    renderPage("buildings");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Buildings");
  });

  it("renders a Fields heading", () => {
    renderPage("buildings");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/fields/i);
  });

  it("renders at least one entry card from getEntries()", () => {
    renderPage("buildings");
    const concept = CONCEPTS.find((c) => c.id === "buildings")!;
    const firstKey = concept.getEntries()[0].key;
    const body = document.body.textContent ?? "";
    expect(body).toContain(firstKey);
  });

  it("renders the 'Town economy' overview section", () => {
    const { container } = renderPage("buildings");
    expect(container.querySelector("#economy-rollup")).not.toBeNull();
    expect(document.body.textContent ?? "").toMatch(/town economy/i);
  });

  it("renders an inline-SVG illustration inside every building entry card", () => {
    // Regression: buildings have no baked icon texture, so the grid must render
    // each building's inline-SVG illustration via EntityVisual. Previously only
    // the few buildings with a station icon (bakery/forge/larder/workshop/portal)
    // showed art; the rest fell back to an empty "?" placeholder.
    renderPage("buildings");
    const concept = CONCEPTS.find((c) => c.id === "buildings")!;
    // Sample buildings that previously rendered no icon, plus a housing alias.
    for (const key of ["barn", "apiary", "observatory", "housing2"]) {
      expect(
        concept.getEntries().some((e) => e.key === key),
        `expected a "${key}" building entry`,
      ).toBe(true);
      const card = screen.getByTitle(key);
      expect(card.querySelector("svg"), `expected an <svg> illustration in the "${key}" card`).not.toBeNull();
    }
  });
});

// ─── Test 2: Status wiring ────────────────────────────────────────────────────

describe("CategoryPage — bosses (PARTIAL status badge)", () => {
  it("renders the player label and tier token for PARTIAL status", () => {
    renderPage("bosses");
    // statusForConcept("bosses") === "PARTIAL"
    // StatusBadge renders both the human-readable player label and the raw tier token
    const body = document.body.textContent ?? "";
    expect(body).toContain("Partly in"); // player label for PARTIAL
    expect(body).toContain("PARTIAL");   // raw tier token (always shown)
  });

  it("renders the Bosses label", () => {
    renderPage("bosses");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Bosses");
  });

  it("renders the 'Boss comparison' overview section", () => {
    const { container } = renderPage("bosses");
    expect(container.querySelector("#boss-comparison")).not.toBeNull();
    expect(document.body.textContent ?? "").toMatch(/boss comparison/i);
  });
});

describe("CategoryPage — workers (Worker comparison overview)", () => {
  it("renders the 'Worker comparison' overview section", () => {
    const { container } = renderPage("workers");
    expect(container.querySelector("#worker-comparison")).not.toBeNull();
    expect(document.body.textContent ?? "").toMatch(/worker comparison/i);
  });
});

// ─── Test 3: Entry navigation ─────────────────────────────────────────────────

describe("CategoryPage — entry navigation (wikiNavTarget)", () => {
  it("clicking an entry card calls navigate with { tab: '<conceptId>', focus: '<conceptId>:<key>' }", () => {
    const navigate = vi.fn();
    renderPage("bosses", { navigate });

    const concept = CONCEPTS.find((c) => c.id === "bosses")!;
    const firstEntry = concept.getEntries()[0];
    const expectedFocus = `bosses:${firstEntry.key}`;

    // The Boss-comparison overview table now precedes the entry grid, so the
    // entry card is no longer the first button on the page. Entry cards are
    // titled with the bare entry key (EntryGrid uses title={entry.key}); the
    // comparison rows title themselves "bosses:<id>". Target the entry card.
    const card = screen.getByTitle(firstEntry.key);
    fireEvent.click(card);

    // Phase-5 contract: each concept routes to its OWN tab (the conceptId).
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "bosses",
        focus: expectedFocus,
      }),
    );
  });

  it("navigate focus string matches conceptId:key pattern", () => {
    const navigate = vi.fn();
    renderPage("recipes", { navigate });

    const concept = CONCEPTS.find((c) => c.id === "recipes")!;
    const firstEntry = concept.getEntries()[0];
    const card = screen.getByTitle(firstEntry.key);
    fireEvent.click(card);

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "recipes",
        focus: expect.stringMatching(/^recipes:.+/),
      }),
    );
  });
});

// ─── Test 4: No-schema concept ────────────────────────────────────────────────

describe("CategoryPage — hazards (definition-schema concept)", () => {
  it("renders without throwing", () => {
    expect(() => renderPage("hazards")).not.toThrow();
  });

  it("renders a 'Fields' heading from ConceptFields", () => {
    renderPage("hazards");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/fields/i);
  });

  it("renders the entry grid (hazard entries visible)", () => {
    renderPage("hazards");
    const concept = CONCEPTS.find((c) => c.id === "hazards")!;
    const entries = concept.getEntries();
    expect(entries.length).toBeGreaterThan(0);
    const body = document.body.textContent ?? "";
    // At least one hazard entry key should appear
    expect(body).toContain(entries[0].key);
  });

  it("renders the Hazards label", () => {
    renderPage("hazards");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Hazards");
  });
});

describe("CategoryPage — tiles (grouped sub-category layout)", () => {
  it("renders multiple sub-category band headings (Farm + Mining)", () => {
    renderPage("tiles");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Farm");
    expect(body).toContain("Mining");
  });

  it("renders the total Entries count heading", () => {
    renderPage("tiles");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/entries/i);
  });

  it("renders the 'Progression & unlock map' overview section", () => {
    const { container } = renderPage("tiles");
    expect(container.querySelector("#progression-timeline")).not.toBeNull();
    expect(document.body.textContent ?? "").toMatch(/progression & unlock map/i);
  });
});

describe("CategoryPage — seasons (definition schema concept)", () => {
  it("renders without throwing", () => {
    expect(() => renderPage("seasons")).not.toThrow();
  });

  it("renders a ConceptFields fields table (seasons now has a schema)", () => {
    renderPage("seasons");
    const tables = document.querySelectorAll("table");
    expect(tables.length).toBeGreaterThan(0);
  });

  it("renders at least one season entry", () => {
    renderPage("seasons");
    const concept = CONCEPTS.find((c) => c.id === "seasons")!;
    const firstKey = concept.getEntries()[0].key;
    const body = document.body.textContent ?? "";
    expect(body).toContain(firstKey);
  });
});

// ─── Phase 1 layout: gallery before field reference ──────────────────────────

describe("CategoryPage — Phase 1 layout order", () => {
  it("renders the blurb in the hero (no standalone Definition section)", () => {
    renderPage("tiles");
    const body = document.body.textContent ?? "";
    // Blurb still present — now inside the hero card, not a separate section
    expect(body).toMatch(/Board pieces/i); // tiles blurb
    // There should be NO standalone "Definition" heading (that section is gone)
    expect(body).not.toContain("Definition");
  });

  it("gallery ('Entries') appears before the field reference in the DOM", () => {
    const { container } = renderPage("recipes");
    const gallery = container.querySelector("[data-testid='wiki-entry-gallery']");
    const reference = container.querySelector("[data-testid='wiki-field-reference']");
    expect(gallery).not.toBeNull();
    expect(reference).not.toBeNull();
    // Node.DOCUMENT_POSITION_FOLLOWING (4) means reference comes after gallery
    const position = gallery!.compareDocumentPosition(reference!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders hero stat chips for recipes (count + stations)", () => {
    const { container } = renderPage("recipes");
    const chips = container.querySelectorAll(".wiki-stat-chip");
    expect(chips.length).toBeGreaterThanOrEqual(1);
    // At minimum the entry count chip is present
    const chipText = Array.from(chips).map((c) => c.textContent ?? "").join(" ");
    expect(chipText).toMatch(/entries|stations/i);
  });

  it("renders hero stat chips for tiles (count + biomes)", () => {
    const { container } = renderPage("tiles");
    const chips = container.querySelectorAll(".wiki-stat-chip");
    expect(chips.length).toBeGreaterThanOrEqual(2);
    const chipText = Array.from(chips).map((c) => c.textContent ?? "").join(" ");
    expect(chipText).toMatch(/species/i);
    expect(chipText).toMatch(/biomes/i);
  });

  it("field reference is absent in player view (ReferenceSection hidden)", () => {
    const { container } = renderPageWithView("recipes", "player");
    const html = container.innerHTML;
    expect(html).not.toContain("Field reference");
  });
});

// ─── Phase 3: --wiki-accent CSS variable applied to page root ─────────────────

describe("CategoryPage — Phase 3 per-concept accent wiring", () => {
  it("sets --wiki-accent inline style on the root element for 'tiles' (board section → green)", () => {
    const { container } = renderPage("tiles");
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    // The style attribute should contain --wiki-accent set to a color
    const style = root!.getAttribute("style") ?? root!.style.cssText;
    expect(style).toMatch(/--wiki-accent/);
  });

  it("sets --wiki-accent inline style on the root element for 'npcs' (world section → violet)", () => {
    const { container } = renderPage("npcs");
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    const style = root!.getAttribute("style") ?? root!.style.cssText;
    expect(style).toMatch(/--wiki-accent/);
  });

  it("accent for 'tiles' differs from accent for 'npcs'", () => {
    const { container: ctTiles } = renderPage("tiles");
    const { container: ctNpcs } = renderPage("npcs");
    const rootTiles = ctTiles.firstElementChild as HTMLElement;
    const rootNpcs = ctNpcs.firstElementChild as HTMLElement;
    const styleTiles = rootTiles.getAttribute("style") ?? "";
    const styleNpcs = rootNpcs.getAttribute("style") ?? "";
    expect(styleTiles).not.toBe(styleNpcs);
  });
});
