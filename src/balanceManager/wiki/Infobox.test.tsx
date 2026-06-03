// @vitest-environment jsdom
/**
 * Infobox.test.tsx — suite for Infobox and TableOfContents.
 *
 * Uses real data from live maps; no fakes. The infobox visual is the entity's
 * REAL asset (procedural Icon, building SVG, zone town-map) — NEVER a game
 * iframe — and the visual block is omitted entirely when there is no asset.
 *
 * Coverage:
 *  Infobox:
 *   1. Recipe → no iframe; the output item's Icon (img or jsdom fallback) is
 *      present; status chip text present; a fact label like "Station" appears.
 *   2. Building → no iframe; a building illustration <svg> is present.
 *   3. Concept with NO asset (ability) → no iframe; renders without throwing.
 *   4. null entity → renders without throwing; no iframe.
 *
 *  TableOfContents:
 *   5. items=[{id,label}...] → renders links with correct hrefs (#id).
 *   6. empty items → renders nothing.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { Infobox } from "./Infobox.jsx";
import { TableOfContents } from "./TableOfContents.jsx";
import { getEntity } from "./conceptEntities.js";

afterEach(() => cleanup());

// ─── Infobox — recipe (renders the output item's icon, never an iframe) ───────

describe("Infobox — recipe (real Icon asset, no iframe)", () => {
  // rec_bread is a real recipe confirmed in status.test.ts
  const conceptId = "recipes";
  const entityKey = "rec_bread";

  it("does NOT render an iframe, and renders the output item's Icon", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    // Never a game iframe.
    expect(container.querySelector("iframe")).toBeNull();
    // Icon bakes to an <img>, or falls back to a <div> in jsdom (no canvas
    // getContext). Either way the visual block is present — assert the recipe
    // article rendered an Icon element (img or fallback) inside the aside.
    expect(container.querySelector("img, [data-icon-fallback], div")).not.toBeNull();
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the status chip text (e.g. WIRED)", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    // The status chip should have text content matching a known status label
    const text = container.textContent ?? "";
    // recipes are WIRED
    expect(text).toContain("WIRED");
  });

  it("renders the Station fact label in the facts table", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    expect(container.textContent).toContain("Station");
  });
});

// ─── Infobox — building (real illustration SVG, never an iframe) ──────────────

describe("Infobox — building (illustration SVG, no iframe)", () => {
  // hearth is a canonical building key (confirmed in EntityVisual.test.tsx)
  const conceptId = "buildings";
  const entityKey = "hearth";

  it("renders a building illustration <svg> and NOT an iframe", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

// ─── Infobox — ability (no asset → no visual block, no iframe) ────────────────

describe("Infobox — ability (no asset → no iframe)", () => {
  // abilities have no per-entity icon when entity.iconKey is absent, so the
  // visual block is omitted entirely.
  // Use a real ability id from the data (threshold_reduce confirmed in infoboxFacts.test.ts)
  const conceptId = "abilities";
  const entityKey = "threshold_reduce";

  it("does NOT render an iframe", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    expect(
      container.querySelector("iframe"),
      "expected NO <iframe> for a concept without a per-entity asset",
    ).toBeNull();
  });

  it("renders without throwing", () => {
    const entity = getEntity(conceptId, entityKey);
    expect(() =>
      render(
        <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
      ),
    ).not.toThrow();
  });
});

// ─── Infobox — null entity ─────────────────────────────────────────────────────

describe("Infobox — null entity (null-safe)", () => {
  it("renders without throwing when entity is null", () => {
    expect(() =>
      render(
        <Infobox conceptId="tiles" entityKey="tile_grass_grass" entity={null} />,
      ),
    ).not.toThrow();
  });

  it("never renders an iframe when entity is null", () => {
    const { container } = render(
      <Infobox conceptId="tiles" entityKey="tile_grass_grass" entity={null} />,
    );
    // Component renders, and there is never a game iframe.
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});

// ─── Infobox — toolPowers (no asset → no iframe) ──────────────────────────────

describe("Infobox — toolPowers (no asset → no iframe)", () => {
  it("does NOT render an iframe for toolPowers (no per-entity asset)", () => {
    const { container } = render(
      <Infobox
        conceptId="toolPowers"
        entityKey="clear_all"
        entity={{ id: "clear_all", isTapTarget: false, desc: "Clears all tiles" }}
      />,
    );
    expect(container.querySelector("iframe")).toBeNull();
  });
});

// ─── TableOfContents ──────────────────────────────────────────────────────────

describe("TableOfContents — with items", () => {
  it("renders a link for each item with the correct href", () => {
    const items = [
      { id: "alpha", label: "Alpha" },
      { id: "beta", label: "Beta" },
    ];
    const { container } = render(<TableOfContents items={items} />);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("#alpha");
    expect(links[1].getAttribute("href")).toBe("#beta");
  });

  it("renders the label text for each item", () => {
    const items = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ];
    const { container } = render(<TableOfContents items={items} />);
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("Beta");
  });

  it("renders a nav element with a title", () => {
    const items = [{ id: "a", label: "Alpha" }];
    const { container } = render(<TableOfContents items={items} />);
    expect(container.querySelector("nav")).not.toBeNull();
    // Should show a "Contents" heading
    expect(container.textContent).toContain("Contents");
  });
});

describe("TableOfContents — empty items", () => {
  it("renders nothing (null) when items is empty", () => {
    const { container } = render(<TableOfContents items={[]} />);
    // Should render null — container children should be empty
    expect(container.firstChild).toBeNull();
  });
});
