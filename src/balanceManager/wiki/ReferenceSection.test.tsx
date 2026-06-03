// @vitest-environment jsdom
/**
 * ReferenceSection.test.tsx — Unit tests for the <ReferenceSection> component.
 *
 * Verifies:
 *  1. In developer view, renders children inside a collapsible <details>.
 *  2. In player view, renders nothing (returns null).
 *  3. Custom heading is rendered.
 *  4. defaultOpen prop controls the initial open state.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { WikiViewProvider } from "./wikiView.js";
import { ReferenceSection } from "./ReferenceSection.jsx";

afterEach(() => cleanup());

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Render <ReferenceSection> inside a WikiViewProvider whose initial view is
 * pre-set via localStorage (the same mechanism WikiViewProvider reads on init).
 */
function renderWithView(
  view: "developer" | "player",
  ui: React.ReactNode,
) {
  // Seed localStorage so WikiViewProvider initialises to the desired view.
  localStorage.setItem("hearth.wiki.view", view);
  const result = render(
    <WikiViewProvider>
      {ui}
    </WikiViewProvider>,
  );
  localStorage.removeItem("hearth.wiki.view");
  return result;
}

// ─── Developer view ───────────────────────────────────────────────────────────

describe("ReferenceSection — developer view", () => {
  it("renders children inside a <details> element", () => {
    const { container } = renderWithView(
      "developer",
      <ReferenceSection>
        <p id="test-child">Schema data here</p>
      </ReferenceSection>,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(container.querySelector("#test-child")).not.toBeNull();
  });

  it("renders the default heading 'Field reference & data'", () => {
    renderWithView(
      "developer",
      <ReferenceSection>
        <span>content</span>
      </ReferenceSection>,
    );
    expect(document.body.textContent).toContain("Field reference & data");
  });

  it("renders a custom heading when provided", () => {
    renderWithView(
      "developer",
      <ReferenceSection heading="Schema reference (developer)">
        <span>content</span>
      </ReferenceSection>,
    );
    expect(document.body.textContent).toContain("Schema reference (developer)");
  });

  it("opens the <details> by default (defaultOpen=true)", () => {
    const { container } = renderWithView(
      "developer",
      <ReferenceSection defaultOpen>
        <span>content</span>
      </ReferenceSection>,
    );
    const details = container.querySelector("details");
    expect(details?.open).toBe(true);
  });

  it("starts closed when defaultOpen=false", () => {
    const { container } = renderWithView(
      "developer",
      <ReferenceSection defaultOpen={false}>
        <span>content</span>
      </ReferenceSection>,
    );
    const details = container.querySelector("details");
    expect(details?.open).toBe(false);
  });
});

// ─── Player view ──────────────────────────────────────────────────────────────

describe("ReferenceSection — player view", () => {
  it("renders nothing (returns null) in player view", () => {
    const { container } = renderWithView(
      "player",
      <ReferenceSection>
        <p id="should-be-hidden">Schema data here</p>
      </ReferenceSection>,
    );
    expect(container.querySelector("#should-be-hidden")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
  });

  it("does not render the heading text in player view", () => {
    renderWithView(
      "player",
      <ReferenceSection heading="Field reference & data">
        <span>content</span>
      </ReferenceSection>,
    );
    expect(document.body.textContent).not.toContain("Field reference & data");
  });
});
