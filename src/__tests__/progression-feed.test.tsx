// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceManager/balanceNav.jsx";
import { ProgressionFeedContent } from "../balanceManager/wiki/sections/ProgressionFeed.js";

afterEach(() => cleanup());

function renderContent() {
  return render(
    <BalanceNavProvider focus={null} navigate={() => {}}>
      <ProgressionFeedContent />
    </BalanceNavProvider>,
  );
}

describe("ProgressionFeedContent", () => {
  it("renders milestone headlines and an unlocked row", () => {
    renderContent();
    expect(screen.getByText(/Arrive at Hearthwood Vale/i)).toBeTruthy();
    expect(screen.getByText(/Found the Cracked Quarry/i)).toBeTruthy();
  });
  it("shows a status chip for a PLANNED milestone", () => {
    renderContent();
    // 'Found Saltspray Harbor' is PLANNED
    expect(screen.getAllByText(/PLANNED/i).length).toBeGreaterThan(0);
  });
});
