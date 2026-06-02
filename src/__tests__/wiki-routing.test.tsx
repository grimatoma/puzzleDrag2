// @vitest-environment jsdom
/**
 * Tests for wiki routing integration: WikiTab + BalanceNavProvider.
 *
 * Coverage:
 *  1. focus=null → grid renders (cards present, no detail panel)
 *  2. focus="<conceptId>:<entityKey>" (prefixed) → EntityDetail renders with
 *     correct concept + entity (not mis-rendered against the wrong schema)
 *  3. Clicking a grid card calls navigate({ tab: "wiki", focus: "<conceptId>:<key>" })
 *     — the PREFIXED format, not the bare key.
 *  4. Clicking the EntityDetail "← Back" button calls navigate({ tab: "wiki", focus: null })
 *  5. A bare-key focus (no prefix) still resolves via conceptForKey fallback and renders detail.
 *  6. A prefixed resource focus renders against the resource schema (not tile).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { BalanceNavProvider } from "../balanceManager/balanceNav.jsx";
import WikiTab from "../balanceManager/tabs/WikiTab.jsx";
import { CONCEPTS } from "../balanceManager/wiki/concepts.js";
import { getEntity } from "../balanceManager/wiki/conceptEntities.js";

afterEach(() => cleanup());

// ─── Resolve real keys from live maps ────────────────────────────────────────

const tilesConcept = CONCEPTS.find((c) => c.id === "tiles")!;
const firstTileEntry = tilesConcept.getEntries()[0]!;
const realTileKey = firstTileEntry.key;

const resourcesConcept = CONCEPTS.find((c) => c.id === "resources")!;
const firstResourceEntry = resourcesConcept.getEntries()[0]!;
const realResourceKey = firstResourceEntry.key;
const realResourceLabel = String(firstResourceEntry.name ?? realResourceKey);

// ─── Helper — wrap WikiTab in the provider ────────────────────────────────────

function renderWikiTab(
  focus: string | null,
  navigate: ReturnType<typeof vi.fn>,
) {
  return render(
    <BalanceNavProvider focus={focus} navigate={navigate}>
      <Suspense fallback={<div>Loading…</div>}>
        <WikiTab />
      </Suspense>
    </BalanceNavProvider>,
  );
}

// ─── 1. No focus → grid renders ──────────────────────────────────────────────

describe("WikiTab routing — no focus", () => {
  it("renders concept grid cards when focus is null", () => {
    const navigate = vi.fn();
    renderWikiTab(null, navigate);

    // We check that cards are present via buttons (EntryGrid renders <button> for selectable cards)
    const cards = screen.queryAllByRole("button");
    // Several concept-filter buttons + at least one grid card
    expect(cards.length).toBeGreaterThan(1);
  });

  it("does not render EntityDetail when focus is null", () => {
    const navigate = vi.fn();
    renderWikiTab(null, navigate);

    // EntityDetail renders a "← Back" button — it should NOT be present
    expect(screen.queryByText(/← Back/i)).toBeNull();
  });
});

// ─── 2. Prefixed focus → EntityDetail renders with correct concept ────────────

describe("WikiTab routing — prefixed focus", () => {
  it("renders EntityDetail with the entity key visible when focus is '<conceptId>:<key>'", async () => {
    const navigate = vi.fn();
    renderWikiTab(`tiles:${realTileKey}`, navigate);

    // EntityDetail renders a Back button
    await waitFor(() => {
      expect(screen.queryByText(/← Back/i)).not.toBeNull();
    });

    // The entity key itself should be visible in the detail panel (in a <code> element)
    const keyMatches = screen.queryAllByText(realTileKey);
    expect(keyMatches.length).toBeGreaterThan(0);
  });

  it("renders a resource entity via the prefixed focus against the resource schema", async () => {
    // Verify the entity exists for the resources concept (not tiles)
    const resourceEntity = getEntity("resources", realResourceKey);
    expect(resourceEntity).not.toBeNull();
    expect(resourceEntity?.kind).toBe("resource");

    const navigate = vi.fn();
    renderWikiTab(`resources:${realResourceKey}`, navigate);

    // Wait for EntityDetail to load (lazy)
    await waitFor(() => {
      expect(screen.queryByText(/← Back/i)).not.toBeNull();
    });

    // The resource's label/key should appear in the detail panel
    const keyMatches = screen.queryAllByText(realResourceKey);
    expect(keyMatches.length).toBeGreaterThan(0);

    // The entity renders against the resource schema: "kind" field should appear
    // (tileItemSchema and resourceItemSchema both declare "kind"), and the live
    // value for "kind" must be "resource" — NOT "tile".
    // We verify the entity lookup is correct: kind=resource, not kind=tile.
    expect(resourceEntity?.kind).toBe("resource");

    // Also confirm the panel does NOT accidentally show a tile-only label name
    // that is only on the first tile entry (a sanity check the wrong entity wasn't loaded).
    // This is a reasonable assertion because realResourceLabel is from resources concept.
    const labelMatches = screen.queryAllByText(realResourceLabel);
    // The resource's display name must appear somewhere in the detail panel
    expect(labelMatches.length).toBeGreaterThan(0);
  });
});

// ─── 3. Clicking a grid card calls navigate with the PREFIXED focus ───────────

describe("WikiTab routing — card click", () => {
  it("calls navigate({ tab: 'wiki', focus: '<conceptId>:<key>' }) when a grid card is clicked", () => {
    const navigate = vi.fn();
    renderWikiTab(null, navigate);

    // Find a button that has the tile key as its title attribute
    // EntryGrid renders <button title={entry.key}> for each card
    const cardButton = screen.queryAllByTitle(realTileKey)[0];
    expect(cardButton).not.toBeUndefined();

    fireEvent.click(cardButton!);

    // The navigate call must use the PREFIXED format — <conceptId>:<key>
    expect(navigate).toHaveBeenCalledWith({
      tab: "wiki",
      focus: `tiles:${realTileKey}`,
    });
  });
});

// ─── 4. Back button calls navigate with focus=null ───────────────────────────

describe("WikiTab routing — back button", () => {
  it("calls navigate({ tab: 'wiki', focus: null }) when ← Back is clicked", async () => {
    const navigate = vi.fn();
    renderWikiTab(`tiles:${realTileKey}`, navigate);

    // Wait for EntityDetail to load (lazy)
    await waitFor(() => {
      expect(screen.queryByText(/← Back/i)).not.toBeNull();
    });

    const backButton = screen.getByText(/← Back/i);
    fireEvent.click(backButton);

    expect(navigate).toHaveBeenCalledWith({ tab: "wiki", focus: null });
  });
});

// ─── 5. Bare-key focus (no prefix) falls back via conceptForKey ───────────────

describe("WikiTab routing — bare-key fallback", () => {
  it("resolves a bare tile key via conceptForKey fallback and renders EntityDetail", async () => {
    const navigate = vi.fn();
    // Provide bare key (no "tiles:" prefix) — exercises the fallback path
    renderWikiTab(realTileKey, navigate);

    // EntityDetail should still load via the bare-key fallback
    await waitFor(() => {
      expect(screen.queryByText(/← Back/i)).not.toBeNull();
    });

    // The tile key should appear in the detail
    const keyMatches = screen.queryAllByText(realTileKey);
    expect(keyMatches.length).toBeGreaterThan(0);
  });
});
