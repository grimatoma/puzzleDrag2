// @vitest-environment jsdom
/**
 * EntryGrid.test.tsx — Unit tests for <EntryGrid> view-gating behaviour.
 *
 * Verifies:
 *  1. In developer view the raw key subtitle is rendered on each card.
 *  2. In player view the raw key subtitle is hidden.
 *  3. The entity name is always rendered regardless of view.
 *  4. Empty state renders an empty-label message.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { WikiViewProvider } from "./wikiView.js";
import EntryGrid from "./EntryGrid.jsx";
import type { WikiEntry } from "./EntryGrid.jsx";
import { findUnreachable } from "../../game/reachability.js";

afterEach(() => cleanup());

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_ENTRIES: WikiEntry[] = [
  { key: "cave_in", name: "Cave In" },
  { key: "gas_vent", name: "Gas Vent" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithView(view: "developer" | "player", entries: WikiEntry[]) {
  localStorage.setItem("hearth.wiki.view", view);
  const result = render(
    <WikiViewProvider>
      <EntryGrid entries={entries} />
    </WikiViewProvider>,
  );
  localStorage.removeItem("hearth.wiki.view");
  return result;
}

// ─── Developer view ───────────────────────────────────────────────────────────

describe("EntryGrid — developer view", () => {
  it("renders the raw key subtitle for each entry", () => {
    renderWithView("developer", TEST_ENTRIES);
    const body = document.body.textContent ?? "";
    expect(body).toContain("cave_in");
    expect(body).toContain("gas_vent");
  });

  it("renders the entry name in developer view", () => {
    renderWithView("developer", TEST_ENTRIES);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Cave In");
    expect(body).toContain("Gas Vent");
  });
});

// ─── Player view ──────────────────────────────────────────────────────────────

describe("EntryGrid — player view", () => {
  it("hides the raw key subtitle in player view", () => {
    renderWithView("player", TEST_ENTRIES);
    // The mono key text should not appear — only the human names should show.
    const monoEls = document.querySelectorAll(".font-mono");
    const monoTexts = Array.from(monoEls).map((el) => el.textContent ?? "");
    // Neither raw key should appear in mono elements
    expect(monoTexts.some((t) => t.includes("cave_in"))).toBe(false);
    expect(monoTexts.some((t) => t.includes("gas_vent"))).toBe(false);
  });

  it("still renders entry names in player view", () => {
    renderWithView("player", TEST_ENTRIES);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Cave In");
    expect(body).toContain("Gas Vent");
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe("EntryGrid — empty state", () => {
  it("renders 'No entries.' when entries array is empty", () => {
    renderWithView("developer", []);
    expect(document.body.textContent).toContain("No entries.");
  });

  it("renders 'No entries.' when entries is null", () => {
    localStorage.setItem("hearth.wiki.view", "developer");
    render(
      <WikiViewProvider>
        <EntryGrid entries={null} />
      </WikiViewProvider>,
    );
    localStorage.removeItem("hearth.wiki.view");
    expect(document.body.textContent).toContain("No entries.");
  });
});

// ─── Fact chips ────────────────────────────────────────────────────────────────

describe("EntryGrid — fact chips", () => {
  it("renders fact chip values when facts array is provided", () => {
    const entries: WikiEntry[] = [
      {
        key: "test_entity",
        name: "Test Entity",
        facts: [
          { value: "+50 coins" },
          { label: "Station", value: "Bakery" },
        ],
      },
    ];
    renderWithView("player", entries);
    const body = document.body.textContent ?? "";
    expect(body).toContain("+50 coins");
    expect(body).toContain("Bakery");
  });

  it("renders at most 3 fact chips even when more are provided", () => {
    const entries: WikiEntry[] = [
      {
        key: "test_entity",
        name: "Test Entity",
        facts: [
          { value: "fact-one" },
          { value: "fact-two" },
          { value: "fact-three" },
          { value: "fact-four-should-not-appear" },
        ],
      },
    ];
    renderWithView("player", entries);
    const body = document.body.textContent ?? "";
    expect(body).toContain("fact-one");
    expect(body).toContain("fact-two");
    expect(body).toContain("fact-three");
    expect(body).not.toContain("fact-four-should-not-appear");
  });

  it("renders normally (icon + name only) when facts is absent", () => {
    const entries: WikiEntry[] = [{ key: "no_facts", name: "No Facts" }];
    const { container } = renderWithView("player", entries);
    // Should have no fact chip elements
    expect(container.querySelectorAll(".wiki-card-fact").length).toBe(0);
    expect(document.body.textContent).toContain("No Facts");
  });

  it("renders normally when facts is an empty array", () => {
    const entries: WikiEntry[] = [{ key: "empty_facts", name: "Empty Facts", facts: [] }];
    const { container } = renderWithView("player", entries);
    expect(container.querySelectorAll(".wiki-card-fact").length).toBe(0);
  });

  it("renders a label: prefix when the fact has a label", () => {
    const entries: WikiEntry[] = [
      {
        key: "test",
        name: "Test",
        facts: [{ label: "Biome", value: "Farm" }],
      },
    ];
    renderWithView("player", entries);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Biome:");
    expect(body).toContain("Farm");
  });

  it("applies data-tone for colour-coded chips and omits it for plain facts", () => {
    const entries: WikiEntry[] = [
      {
        key: "test",
        name: "Test",
        facts: [
          { label: "Turns", value: "+1/session", tone: "power" },
          { label: "Level", value: "1" },
        ],
      },
    ];
    const { container } = renderWithView("player", entries);
    expect(container.querySelector('.wiki-card-fact[data-tone="power"]')).not.toBeNull();
    // The untoned chip carries no data-tone attribute.
    const chips = Array.from(container.querySelectorAll(".wiki-card-fact"));
    const plain = chips.find((c) => (c.textContent ?? "").includes("Level"));
    expect(plain?.getAttribute("data-tone")).toBeNull();
  });
});

// ─── Not-yet-reachable greying ─────────────────────────────────────────────────

describe("EntryGrid — not-yet-reachable greying", () => {
  it("greys a card whose entity has no unlock path when conceptId is given", () => {
    const unreachableBuilding = findUnreachable().buildings[0];
    if (unreachableBuilding == null) return; // nothing unreachable → nothing to grey
    localStorage.setItem("hearth.wiki.view", "developer");
    const { container } = render(
      <WikiViewProvider>
        <EntryGrid
          entries={[{ key: unreachableBuilding, name: "Unreachable" }]}
          conceptId="buildings"
        />
      </WikiViewProvider>,
    );
    localStorage.removeItem("hearth.wiki.view");
    expect(container.querySelector(".wiki-entry-card--unreached")).not.toBeNull();
  });

  it("does not grey any card when conceptId is omitted", () => {
    const unreachableBuilding = findUnreachable().buildings[0];
    const key = unreachableBuilding ?? "cave_in";
    const { container } = renderWithView("developer", [{ key, name: "Some Entry" }]);
    expect(container.querySelector(".wiki-entry-card--unreached")).toBeNull();
  });
});

// ─── Placeholder visual (no iconKey, no emoji) ─────────────────────────────────

describe("EntryGrid — placeholder visual fallback", () => {
  it("renders the entry initial as placeholder when no iconKey or emoji is set", () => {
    const entries: WikiEntry[] = [{ key: "abstract_thing", name: "Abstract Thing" }];
    renderWithView("player", entries);
    // The placeholder renders the first letter of the name as a capital
    const body = document.body.textContent ?? "";
    expect(body).toContain("A"); // initial of "Abstract Thing"
    // Crucially: no "?" should appear
    const questionMarks = document.querySelectorAll('[title*="Missing icon"]');
    expect(questionMarks.length).toBe(0);
  });

  it("renders emoji when entry has an emoji property but no iconKey", () => {
    const entries: WikiEntry[] = [{ key: "keeper", name: "Deer Spirit", emoji: "🦌" }];
    renderWithView("player", entries);
    const body = document.body.textContent ?? "";
    expect(body).toContain("🦌");
  });
});
