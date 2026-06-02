// @vitest-environment jsdom
/**
 * Tests for src/balanceManager/wiki/FieldsTable.tsx
 *
 * Coverage:
 *  1. showValue=false → no "Value" column header in the rendered output.
 *  2. showValue=true (default) + entity provided → "Value" header present and
 *     the entity's field value is rendered in the table.
 *  3. Default entity=null when showValue omitted → "Value" header present but
 *     every cell shows the "—" placeholder (no live entity).
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { FieldsTable } from "./FieldsTable.jsx";
import type { FieldDoc } from "../schemaDoc.js";

afterEach(() => cleanup());

// Minimal field fixture
const FIELDS: FieldDoc[] = [
  { field: "a", type: "string", optional: false, description: "d" },
  { field: "b", type: "number", optional: true, description: "e" },
];

describe("FieldsTable — showValue=false", () => {
  it("does NOT render a Value column header", () => {
    render(<FieldsTable fields={FIELDS} showValue={false} />);
    // "Value" should not appear anywhere in the table headers
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    expect(allTh).not.toContain("Value");
  });

  it("renders the other expected column headers", () => {
    render(<FieldsTable fields={FIELDS} showValue={false} />);
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    for (const col of ["Field", "Type", "Req", "Default", "Description"]) {
      expect(allTh, `Expected "${col}" column header to be present`).toContain(col);
    }
  });

  it("renders the field names in the table body", () => {
    render(<FieldsTable fields={FIELDS} showValue={false} />);
    expect(screen.getByText("a")).toBeDefined();
    expect(screen.getByText("b")).toBeDefined();
  });
});

describe("FieldsTable — showValue=true (default) with entity", () => {
  const entity = { a: "hello", b: 42 };

  it("renders a Value column header", () => {
    render(<FieldsTable fields={FIELDS} entity={entity} />);
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    expect(allTh).toContain("Value");
  });

  it("renders the live entity value for string field", () => {
    render(<FieldsTable fields={FIELDS} entity={entity} />);
    expect(screen.getByText("hello")).toBeDefined();
  });

  it("renders the live entity value for number field", () => {
    render(<FieldsTable fields={FIELDS} entity={entity} />);
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders all expected columns including Value and Description", () => {
    render(<FieldsTable fields={FIELDS} entity={entity} />);
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    for (const col of ["Field", "Type", "Req", "Default", "Value", "Description"]) {
      expect(allTh, `Expected "${col}" column header`).toContain(col);
    }
  });
});

describe("FieldsTable — chip-aware values for cost-like fields", () => {
  const CHIP_FIELDS: FieldDoc[] = [
    { field: "cost", type: "object", optional: false, description: "build cost" },
  ];

  it("renders AmountChips (icon+count+label) for a flat Record<string, number> cost field", () => {
    render(<FieldsTable fields={CHIP_FIELDS} entity={{ cost: { wood: 3, coins: 50 } }} />);
    const body = document.body.textContent ?? "";
    // Counts and labels are surfaced via chips rather than raw JSON.
    expect(body).toContain("3");
    expect(body).toContain("50");
    // Should NOT fall back to the JSON-y serialization for these fields.
    expect(body).not.toContain('{"wood":3,"coins":50}');
  });

  it("falls back to JSON for non-numeric object values", () => {
    render(<FieldsTable fields={CHIP_FIELDS} entity={{ cost: { wood: "lots" } }} />);
    const body = document.body.textContent ?? "";
    expect(body).toContain('{"wood":"lots"}');
  });
});

describe("FieldsTable — showValue omitted (defaults true), entity=null (default)", () => {
  it("renders a Value column header even when entity is null", () => {
    render(<FieldsTable fields={FIELDS} />);
    const allTh = Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim());
    expect(allTh).toContain("Value");
  });

  it("renders the field names", () => {
    render(<FieldsTable fields={FIELDS} />);
    expect(screen.getByText("a")).toBeDefined();
    expect(screen.getByText("b")).toBeDefined();
  });

  it("renders zero editable controls (read-only invariant)", () => {
    const { container } = render(<FieldsTable fields={FIELDS} entity={null} showValue={false} />);
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});
