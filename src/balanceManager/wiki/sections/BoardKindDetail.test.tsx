// @vitest-environment jsdom
/**
 * BoardKindDetail.test.tsx — TDD suite for the wiki board-kind detail section.
 *
 * Uses real catalog data (BIOMES + HAZARDS/FARM_HAZARD_META + SEASONS + ZONES).
 * Renders inside a BalanceNavProvider because the section calls useBalanceNav()
 * for navigable tile/danger/zone chips.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { getEntity } from "../conceptEntities.js";
import { BoardKindDetail, hasBoardKindDetail } from "./BoardKindDetail.jsx";

afterEach(() => cleanup());

function renderBoardKind(boardKindKey: string) {
  return render(
    <BalanceNavProvider focus={null} navigate={vi.fn()}>
      <BoardKindDetail
        boardKindKey={boardKindKey}
        boardKind={getEntity("boardKinds", boardKindKey) as never}
      />
    </BalanceNavProvider>,
  );
}

describe("BoardKindDetail", () => {
  it("hasBoardKindDetail is true for a board kind with tiles", () => {
    expect(hasBoardKindDetail(getEntity("boardKinds", "mine") as never)).toBe(true);
  });

  it("renders the four block headings for mine", () => {
    renderBoardKind("mine");
    expect(screen.getByText(/Tile roster/i)).toBeTruthy();
    expect(screen.getByText(/Dangers/i)).toBeTruthy();
    // Heading is "Seasons & turns"; the body paragraph also mentions "seasons",
    // so match the heading specifically to avoid a multiple-match error.
    expect(screen.getByText(/Seasons & turns/i)).toBeTruthy();
    expect(screen.getByText(/Zones using this board/i)).toBeTruthy();
  });

  it("shows mine hazards for mine, not farm hazards", () => {
    renderBoardKind("mine");
    expect(screen.getByText(/Cave-In/i)).toBeTruthy();
    expect(screen.queryByText(/Wolves/i)).toBeNull();
  });

  it("harbor renders a graceful no-hazards note", () => {
    renderBoardKind("fish");
    expect(screen.getByText(/no board hazards/i)).toBeTruthy();
  });
});
