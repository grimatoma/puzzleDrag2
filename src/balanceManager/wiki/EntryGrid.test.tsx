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
