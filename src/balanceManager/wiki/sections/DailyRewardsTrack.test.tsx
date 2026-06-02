// @vitest-environment jsdom
/**
 * DailyRewardsTrack.test.tsx — TDD suite for the wiki daily-reward section.
 *
 * Uses real catalog data (DAILY_REWARDS):
 *   - Day 7 grants 150 coins + a shuffle tool.
 *   - Day 30 grants coins + runes + unlocks tile_cattle_triceratops (a link).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { DailyRewardsTrack, hasDailyReward } from "./DailyRewardsTrack.jsx";
import { getEntity } from "../conceptEntities.js";

afterEach(() => cleanup());

function day(key: string) {
  const d = getEntity("dailyRewards", key);
  if (d == null) throw new Error(`day ${key} not found`);
  return d as React.ComponentProps<typeof DailyRewardsTrack>["day"];
}

function renderDay(key: string, navigate = vi.fn()) {
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <DailyRewardsTrack day={day(key)} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate };
}

describe("DailyRewardsTrack — day 7 (coins + tool)", () => {
  it("renders the Reward heading, day number, coins, and the tool", () => {
    renderDay("7");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Reward");
    expect(body).toContain("7");
    expect(body).toMatch(/Coins/);
    expect(body).toContain("150");
    // shuffle tool — its label resolves via iconLabel
    expect(body).toMatch(/shuffle|Shuffle/i);
  });
});

describe("DailyRewardsTrack — day 30 (unlock tile link)", () => {
  it("renders an Unlocks chip that navigates to the tile article", () => {
    const { navigate } = renderDay("30");
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Unlocks/i);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.tab).toBe("tiles");
    expect(arg.focus).toBe("tiles:tile_cattle_triceratops");
  });
});

describe("hasDailyReward", () => {
  it("is true for a granting day", () => {
    expect(hasDailyReward(day("7"))).toBe(true);
  });
  it("is false for null / empty", () => {
    expect(hasDailyReward(null)).toBe(false);
    expect(hasDailyReward({ day: 99 })).toBe(false);
  });
});
