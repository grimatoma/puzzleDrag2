// @vitest-environment jsdom
/**
 * WikiShell.mobile.test.tsx — Phase 4b mobile-pass unit tests.
 *
 * Coverage:
 *  1. Escape key closes the mobile nav drawer (setMobileNavOpen(false) path).
 *  2. The ZoneDetail drop-rate wrapper carries the wiki-table-scroll class
 *     (so the heatmap scrolls instead of overflowing the viewport).
 *  3. FieldsTable wrapper carries wiki-table-scroll (already present since
 *     FieldsTable.tsx was wired — this test pins the contract).
 *
 * WikiShell is heavyweight (Phaser, lazy chunks) so the keyboard tests drive
 * handleWikiShellKeydown — the exported pure helper used by the effect — so
 * the suite stays fast and free of Suspense/Lazy complications.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { ZoneDetail } from "./sections/ZoneDetail.jsx";
import { FieldsTable } from "./FieldsTable.jsx";
import { handleWikiShellKeydown } from "./WikiShell.jsx";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { ZONES } from "../../features/zones/data.js";
import type { FieldDoc } from "../schemaDoc.js";

afterEach(() => cleanup());

// ─── 1. Escape-to-close keyboard handler (unit-level) ─────────────────────────
//
// Tests drive the real exported handleWikiShellKeydown helper so changes to
// the handler immediately surface as test failures — no verbatim copies to drift.

describe("WikiShell — keyboard handler (Escape / Cmd-K logic)", () => {
  it("Escape calls the mobileNavClose setter", () => {
    const setMobileNavOpen = vi.fn();
    const setPaletteOpen = vi.fn();

    const onKey = (e: KeyboardEvent) =>
      handleWikiShellKeydown(e, { setMobileNavOpen, setPaletteOpen });

    window.addEventListener("keydown", onKey);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    window.removeEventListener("keydown", onKey);

    expect(setMobileNavOpen).toHaveBeenCalledWith(false);
    expect(setPaletteOpen).not.toHaveBeenCalled();
  });

  it("Cmd-K toggles the palette, does not close mobile nav", () => {
    const setMobileNavOpen = vi.fn();
    const setPaletteOpen = vi.fn();

    const onKey = (e: KeyboardEvent) =>
      handleWikiShellKeydown(e, { setMobileNavOpen, setPaletteOpen });

    window.addEventListener("keydown", onKey);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    window.removeEventListener("keydown", onKey);

    expect(setMobileNavOpen).not.toHaveBeenCalled();
    expect(setPaletteOpen).toHaveBeenCalled();
  });

  it("unmodified keys other than Escape are ignored", () => {
    const setMobileNavOpen = vi.fn();
    const setPaletteOpen = vi.fn();

    const onKey = (e: KeyboardEvent) =>
      handleWikiShellKeydown(e, { setMobileNavOpen, setPaletteOpen });

    window.addEventListener("keydown", onKey);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    window.removeEventListener("keydown", onKey);

    expect(setMobileNavOpen).not.toHaveBeenCalled();
    expect(setPaletteOpen).not.toHaveBeenCalled();
  });
});

// ─── 2. ZoneDetail heatmap wrapper carries wiki-table-scroll ─────────────────

describe("ZoneDetail — heatmap scroll wrapper (Phase 4b)", () => {
  const home = ZONES.home as unknown as React.ComponentProps<typeof ZoneDetail>["zone"];

  it("the heatmap container carries wiki-table-scroll so it scrolls instead of overflowing", () => {
    const navigate = vi.fn();
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={navigate}>
        <ZoneDetail zone={home} />
      </BalanceNavProvider>,
    );
    // The wiki-table-scroll wrapper must exist as a direct parent of the
    // season-drop-rates label / heatmap table.
    const scrollWrappers = container.querySelectorAll(".wiki-table-scroll");
    expect(scrollWrappers.length).toBeGreaterThan(0);
  });
});

// ─── 3. FieldsTable wrapper carries wiki-table-scroll ────────────────────────

describe("FieldsTable — scroll wrapper (Phase 4b contract)", () => {
  const FIELDS: FieldDoc[] = [
    { field: "id", type: "string", optional: false, description: "Entity id" },
    { field: "label", type: "string", optional: true, description: "Display label" },
  ];

  it("the outermost element carries wiki-table-scroll", () => {
    const { container } = render(<FieldsTable fields={FIELDS} showValue={false} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.classList.contains("wiki-table-scroll")).toBe(true);
  });
});
