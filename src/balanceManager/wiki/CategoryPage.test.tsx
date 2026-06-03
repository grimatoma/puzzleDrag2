// @vitest-environment jsdom
/**
 * CategoryPage.test.tsx — TDD suite for the concept/category article page.
 *
 * Written BEFORE the implementation (TDD-first). Uses real data; no fakes.
 *
 * Coverage:
 *  1. Schema-backed concept ("recipes") — renders label, Fields heading, and at
 *     least one entry card (key from getEntries()[0]).
 *  2. Status wiring — "bosses" concept shows PARTIAL in its StatusBadge.
 *  3. Entry navigation — clicking an entry card calls navigate with
 *     wikiNavTarget shape { tab: "<conceptId>", focus: "<conceptId>:<key>" }.
 *  4. Schema-backed concept with a function field ("hazards") — renders without
 *     throwing, shows the Fields heading, and shows the entry grid.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { CategoryPage } from "./CategoryPage.jsx";
import { CONCEPTS } from "./concepts.js";

afterEach(() => cleanup());

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderPage(
  conceptId: string,
  { navigate = vi.fn() } = {},
) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <CategoryPage conceptId={conceptId} />
    </BalanceNavProvider>,
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

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

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

describe("CategoryPage — definition lead", () => {
  it("renders a Definition heading with the concept blurb", () => {
    renderPage("tiles");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Definition");
    expect(body).toMatch(/Board pieces/i); // tiles blurb
  });
});
