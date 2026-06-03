// @vitest-environment jsdom
/**
 * StatusBadge.test.tsx — Unit tests for the <StatusBadge> component.
 *
 * Verifies:
 *  1. Each WikiStatus tier renders the correct plain-language player label.
 *  2. The raw tier appears as a visible mono suffix for developers.
 *  3. The ARIA label accurately reflects the status.
 *  4. The compact variant renders without throwing.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { StatusBadge } from "./StatusBadge.jsx";
import type { WikiStatus } from "./status.js";

afterEach(() => cleanup());

// ─── Label coverage ───────────────────────────────────────────────────────────

const CASES: Array<[WikiStatus, string]> = [
  ["WIRED",    "In game now"],
  ["PARTIAL",  "Partly in"],
  ["STUB",     "Placeholder"],
  ["DOC-ONLY", "Designed"],
  ["PLANNED",  "On the roadmap"],
];

describe("StatusBadge — player labels", () => {
  for (const [status, expectedLabel] of CASES) {
    it(`renders "${expectedLabel}" for ${status}`, () => {
      render(<StatusBadge status={status} />);
      expect(document.body.textContent).toContain(expectedLabel);
    });
  }
});

// ─── Raw tier visibility ──────────────────────────────────────────────────────

describe("StatusBadge — raw tier suffix", () => {
  for (const [status] of CASES) {
    it(`renders the raw tier "${status}" as a visible suffix`, () => {
      const { container } = render(<StatusBadge status={status} />);
      const tierEl = container.querySelector(".wiki-status-badge__tier");
      expect(tierEl).not.toBeNull();
      expect(tierEl!.textContent).toBe(status);
    });
  }
});

// ─── ARIA label ───────────────────────────────────────────────────────────────

describe("StatusBadge — ARIA label", () => {
  for (const [status, expectedLabel] of CASES) {
    it(`has aria-label "Status: ${expectedLabel}" for ${status}`, () => {
      const { container } = render(<StatusBadge status={status} />);
      const badge = container.querySelector(".wiki-status-badge");
      expect(badge).not.toBeNull();
      expect(badge!.getAttribute("aria-label")).toBe(`Status: ${expectedLabel}`);
    });
  }
});

// ─── Compact variant ──────────────────────────────────────────────────────────

describe("StatusBadge — compact variant", () => {
  it("renders without throwing in compact mode", () => {
    expect(() => render(<StatusBadge status="WIRED" compact />)).not.toThrow();
  });

  it("applies the compact CSS class when compact=true", () => {
    const { container } = render(<StatusBadge status="WIRED" compact />);
    const badge = container.querySelector(".wiki-status-badge");
    expect(badge?.className).toContain("wiki-status-badge--compact");
  });

  it("does not apply the compact class when compact is omitted", () => {
    const { container } = render(<StatusBadge status="WIRED" />);
    const badge = container.querySelector(".wiki-status-badge");
    expect(badge?.className).not.toContain("--compact");
  });
});
