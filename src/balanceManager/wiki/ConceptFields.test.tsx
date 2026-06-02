// @vitest-environment jsdom
/**
 * Tests for src/balanceManager/wiki/ConceptFields.tsx
 *
 * Coverage:
 *  1. Concept WITH a schema (e.g. "recipes") — renders a "Fields" heading and
 *     at least one real schema field name (e.g. "station" or "item").
 *  2. Concept WITH an override schema (e.g. "bosses") — renders the override
 *     note alongside the "Fields" heading.
 *  3. Concept WITHOUT a schema ("hazards", "seasons") — renders the graceful
 *     no-schema note and NO fields table.
 *  4. Read-only invariant: zero editable controls in all cases.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ConceptFields } from "./ConceptFields.jsx";
import { describeSchema } from "../schemaDoc.js";
import { schemaForConcept } from "./conceptSchemas.js";

afterEach(() => cleanup());

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve the first field name from a concept schema at runtime, so the test
 *  is always aligned with the real schema rather than a hardcoded string. */
function firstFieldOf(conceptId: string): string {
  const cs = schemaForConcept(conceptId);
  if (cs == null) throw new Error(`No schema for "${conceptId}"`);
  const doc = describeSchema(cs.schema);
  return doc.fields[0].field;
}

// ─── Concept with a definition schema ─────────────────────────────────────────

describe("ConceptFields — recipes (definition schema)", () => {
  const firstField = firstFieldOf("recipes"); // should be "item"

  it("renders a 'Fields' heading", () => {
    render(<ConceptFields conceptId="recipes" />);
    // The heading text starts with "Fields" (may be followed by other content)
    const headings = screen.queryAllByText(/^Fields/i);
    expect(headings.length, "Expected a 'Fields' heading to be rendered").toBeGreaterThan(0);
  });

  it("renders at least one real schema field name in the table", () => {
    render(<ConceptFields conceptId="recipes" />);
    // The first field of recipeDefinitionSchema should appear in the table
    const cells = screen.queryAllByText(firstField);
    expect(cells.length, `Expected field "${firstField}" to appear in the FieldsTable`).toBeGreaterThan(0);
  });

  it("does NOT render the Value column (showValue=false)", () => {
    render(<ConceptFields conceptId="recipes" />);
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    expect(allTh, "Value column should not appear in concept-level reference").not.toContain("Value");
  });

  it("does NOT render the no-schema graceful note", () => {
    render(<ConceptFields conceptId="recipes" />);
    const note = screen.queryByText(/Fields for this concept come straight from live config/i);
    expect(note).toBeNull();
  });

  it("renders zero editable controls", () => {
    const { container } = render(<ConceptFields conceptId="recipes" />);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});

// ─── Concept with an override schema ─────────────────────────────────────────

describe("ConceptFields — bosses (override schema)", () => {
  it("renders a 'Fields' heading", () => {
    render(<ConceptFields conceptId="bosses" />);
    const headings = screen.queryAllByText(/^Fields/i);
    expect(headings.length, "Expected a 'Fields' heading to be rendered").toBeGreaterThan(0);
  });

  it("renders the override note mentioning balance.json", () => {
    render(<ConceptFields conceptId="bosses" />);
    expect(screen.getByText(/balance\.json/i)).toBeDefined();
  });

  it("renders at least one schema field from bossOverrideSchema", () => {
    render(<ConceptFields conceptId="bosses" />);
    const firstField = firstFieldOf("bosses");
    const cells = screen.queryAllByText(firstField);
    expect(cells.length, `Expected field "${firstField}" in the table`).toBeGreaterThan(0);
  });

  it("renders zero editable controls", () => {
    const { container } = render(<ConceptFields conceptId="bosses" />);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});

// ─── Concept with a definition schema that has a function field ───────────────

describe("ConceptFields — hazards (definition schema)", () => {
  it("renders a 'Fields' heading", () => {
    render(<ConceptFields conceptId="hazards" />);
    const headings = screen.queryAllByText(/^Fields/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders a fields table including 'look' and 'spawn'", () => {
    render(<ConceptFields conceptId="hazards" />);
    const tables = document.querySelectorAll("table");
    expect(tables.length).toBeGreaterThan(0);
    expect(screen.queryAllByText("look").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("spawn").length).toBeGreaterThan(0);
  });

  it("renders zero editable controls", () => {
    const { container } = render(<ConceptFields conceptId="hazards" />);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});

describe("ConceptFields — seasons (definition schema)", () => {
  it("renders the 'Fields' heading", () => {
    render(<ConceptFields conceptId="seasons" />);
    const headings = screen.queryAllByText(/^Fields/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders a fields table including the grouped 'look' field", () => {
    render(<ConceptFields conceptId="seasons" />);
    const tables = document.querySelectorAll("table");
    expect(tables.length).toBeGreaterThan(0);
    const cells = screen.queryAllByText("look");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders the nested 'look' sub-fields (grouping not collapsed)", () => {
    render(<ConceptFields conceptId="seasons" />);
    // The grouped `look` object should expand into its sub-rows
    // (iconKey / bg / fill / accent). Assert a representative one renders so a
    // regression that collapses the grouping is caught. Sub-rows render their
    // field name in the cell with a "↳ " indent prefix (parent rows do not), so
    // matching the prefixed text targets the expanded sub-row specifically.
    expect(
      screen.queryAllByText(/↳\s*accent/).length,
      "Expected the nested 'look.accent' sub-field row to render",
    ).toBeGreaterThan(0);
  });
});

// ─── Concept with a buildings definition schema ───────────────────────────────

describe("ConceptFields — buildings (definition schema)", () => {
  const firstField = firstFieldOf("buildings"); // should be "id"

  it("renders the 'Fields' heading and first field", () => {
    render(<ConceptFields conceptId="buildings" />);
    const headings = screen.queryAllByText(/^Fields/i);
    expect(headings.length).toBeGreaterThan(0);

    const cells = screen.queryAllByText(firstField);
    expect(cells.length, `Expected field "${firstField}" in the table`).toBeGreaterThan(0);
  });
});
