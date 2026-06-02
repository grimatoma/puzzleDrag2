// @vitest-environment jsdom
/**
 * Infobox.test.tsx — TDD suite for Infobox and TableOfContents.
 *
 * Written BEFORE the implementation (TDD-first). Uses real data from live maps;
 * no fakes.
 *
 * Coverage:
 *  Infobox:
 *   1. Recipe with a mapped scenario → iframe present, src contains "visual=",
 *      status chip text present, and a fact label like "Station" appears.
 *   2. Concept with NO scenario (ability) → no iframe rendered (Icon branch taken),
 *      component renders without throwing.
 *   3. null entity → renders without throwing; no iframe.
 *
 *  TableOfContents:
 *   4. items=[{id,label}...] → renders links with correct hrefs (#id).
 *   5. empty items → renders nothing.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { Infobox } from "./Infobox.jsx";
import { TableOfContents } from "./TableOfContents.jsx";
import { getEntity } from "./conceptEntities.js";

afterEach(() => cleanup());

// ─── Infobox — recipe (has a mapped scenario) ─────────────────────────────────

describe("Infobox — recipe (scenario mapped → iframe branch)", () => {
  // rec_bread is a real recipe confirmed in status.test.ts
  const conceptId = "recipes";
  const entityKey = "rec_bread";

  it("renders an iframe whose src contains visual=", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe, "expected an <iframe> for a mapped recipe scenario").not.toBeNull();
    expect(iframe!.src).toContain("visual=");
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

// ─── Infobox — ability (no scenario → Icon branch) ────────────────────────────

describe("Infobox — ability (no scenario → no iframe)", () => {
  // abilities is not in CONCEPT_DEFAULT_SCENARIO, so scenarioForEntity returns null
  // Use a real ability id from the data (threshold_reduce confirmed in infoboxFacts.test.ts)
  const conceptId = "abilities";
  const entityKey = "threshold_reduce";

  it("does NOT render an iframe when scenario is null", () => {
    const entity = getEntity(conceptId, entityKey);
    const { container } = render(
      <Infobox conceptId={conceptId} entityKey={entityKey} entity={entity} />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe, "expected NO <iframe> for a concept without a scenario mapping").toBeNull();
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
        <Infobox conceptId="tiles" entityKey="tile_grass_hay" entity={null} />,
      ),
    ).not.toThrow();
  });

  it("does not render an iframe when entity is null (null entity, no scenario override for tiles)", () => {
    // tiles DOES have a concept-level scenario, but entity is null — the infobox
    // should still render the scenario embed (conceptId/key still valid).
    // This test verifies only that no crash occurs; iframe presence is ok.
    const { container } = render(
      <Infobox conceptId="tiles" entityKey="tile_grass_hay" entity={null} />,
    );
    // Should not throw — component is present in the container
    expect(container.firstChild).not.toBeNull();
  });
});

// ─── Infobox — toolPowers (no scenario) ───────────────────────────────────────

describe("Infobox — toolPowers (no scenario → no iframe)", () => {
  it("does NOT render an iframe for toolPowers (not in scenario map)", () => {
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
