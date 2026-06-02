// @vitest-environment jsdom
/**
 * BossComparison.test.tsx — TDD suite for the Bosses "Boss comparison" section.
 *
 * Uses real catalog data via assessAllBosses({}) / BOSSES — no fakes.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { BossComparison } from "./BossComparison.jsx";
import { assessAllBosses, BOSS_TIER_LABEL } from "../../bossBalance.js";
import { BOSSES } from "../../../features/bosses/data.js";

afterEach(() => cleanup());

function renderTable({ navigate = vi.fn() } = {}) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <BossComparison />
    </BalanceNavProvider>,
  );
}

describe("BossComparison", () => {
  it("renders the section heading", () => {
    const { container } = renderTable();
    expect(container.querySelector("#boss-comparison")).not.toBeNull();
    expect(container.textContent ?? "").toMatch(/boss comparison/i);
  });

  it("renders one row per boss in BOSSES with its name", () => {
    const { container } = renderTable();
    const rows = container.querySelectorAll("tbody tr");
    expect(BOSSES.length).toBeGreaterThan(0);
    expect(rows.length).toBe(BOSSES.length);
    const body = container.textContent ?? "";
    for (const boss of BOSSES) {
      expect(body).toContain(boss.name);
    }
  });

  it("renders each boss's tier label and defeat target", () => {
    const { container } = renderTable();
    const body = container.textContent ?? "";
    for (const { boss, tier } of assessAllBosses({})) {
      const tierLabel = BOSS_TIER_LABEL[tier.id] ?? tier.label;
      expect(body).toContain(tierLabel);
      // amount× appears in the Target column.
      expect(body).toContain(`${boss.target?.amount}×`);
    }
  });

  it("clicking a boss row navigates to that boss's article", () => {
    const navigate = vi.fn();
    renderTable({ navigate });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(BOSSES.length);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "bosses",
        focus: `bosses:${BOSSES[0].id}`,
      }),
    );
  });
});
