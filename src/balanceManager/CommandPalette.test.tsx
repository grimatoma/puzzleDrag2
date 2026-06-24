// @vitest-environment jsdom
/**
 * Tests for src/balanceManager/CommandPalette.tsx — the Cmd-K search modal.
 *
 * Coverage:
 *  1. search → article flow: typing filters, Enter calls onSelect with the
 *     highlighted CommandEntry (the contract WikiShell.handlePaletteSelect uses).
 *  2. Escape closes.
 *  3. Tab is trapped inside the dialog (focus can't escape to the page behind).
 *  4. Focus returns to whatever opened the palette when it closes.
 *  5. With an empty query, seeded recents render under a "Recent" header.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import CommandPalette from "./CommandPalette.jsx";
import { buildCommandIndex, entryKey } from "./commandPalette.js";

afterEach(() => {
  cleanup();
  try { localStorage.clear(); } catch { /* noop */ }
});

// A real, stable entry from the live index so the test tracks the catalog
// rather than a hardcoded id.
const SAMPLE = buildCommandIndex()[0];

describe("CommandPalette — search → select flow", () => {
  it("renders results for a query and selects the highlighted entry on Enter", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: SAMPLE.label } });

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0][0];
    expect(picked).toHaveProperty("tab");
    expect(picked).toHaveProperty("id");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} onSelect={() => {}} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps Tab so focus can't escape the dialog", () => {
    render(<CommandPalette open onClose={() => {}} onSelect={() => {}} />);
    // fireEvent returns false when the event was cancelled (preventDefault).
    const notCancelled = fireEvent.keyDown(screen.getByRole("combobox"), { key: "Tab" });
    expect(notCancelled).toBe(false);
  });
});

describe("CommandPalette — focus management", () => {
  it("restores focus to the opener when it closes", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { rerender } = render(<CommandPalette open onClose={() => {}} onSelect={() => {}} />);
    // Closing unmounts the inner palette, whose cleanup restores focus.
    rerender(<CommandPalette open={false} onClose={() => {}} onSelect={() => {}} />);
    expect(document.activeElement).toBe(opener);

    opener.remove();
  });

  it("marks the dialog aria-modal", () => {
    render(<CommandPalette open onClose={() => {}} onSelect={() => {}} />);
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });
});

describe("CommandPalette — recents (empty query)", () => {
  it("shows seeded recents under a Recent header", () => {
    localStorage.setItem("hearth.wiki.recents", JSON.stringify([entryKey(SAMPLE)]));
    render(<CommandPalette open onClose={() => {}} onSelect={() => {}} />);
    // Empty query → recents view. getByText throws if the header is absent.
    expect(screen.queryByText("Recent")).not.toBeNull();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("prompts to start typing when there are no recents", () => {
    render(<CommandPalette open onClose={() => {}} onSelect={() => {}} />);
    expect(screen.queryByText("Recent")).toBeNull();
    expect(screen.queryByText(/start typing/i)).not.toBeNull();
  });
});
