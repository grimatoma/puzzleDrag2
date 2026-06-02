// @vitest-environment jsdom
/**
 * AchievementCard.test.tsx — TDD suite for the wiki achievement section.
 *
 * Uses real catalog data (ACHIEVEMENTS):
 *   - `first_steps` requires 1 chain and rewards 25 coins.
 *   - `champion` requires 4 boss defeats and rewards a magic_wand tool.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { AchievementCard, hasAchievementCard } from "./AchievementCard.jsx";
import { getEntity } from "../conceptEntities.js";

afterEach(() => cleanup());

function achievement(id: string) {
  const a = getEntity("achievements", id);
  if (a == null) throw new Error(`achievement ${id} not found`);
  return a as React.ComponentProps<typeof AchievementCard>["achievement"];
}

describe("AchievementCard — first_steps (coins reward)", () => {
  it("renders the heading, requirement, and the coins reward", () => {
    render(<AchievementCard achievement={achievement("first_steps")} />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Achievement");
    expect(body).toMatch(/requirement/i);
    expect(body).toMatch(/Complete your first chain/i);
    expect(body).toMatch(/1\/1 chains committed/i);
    expect(body).toMatch(/reward/i);
    expect(body).toMatch(/Coins/);
    expect(body).toContain("25");
  });
});

describe("AchievementCard — champion (tool reward)", () => {
  it("renders a tool reward (magic_wand)", () => {
    render(<AchievementCard achievement={achievement("champion")} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Defeat 4 seasonal bosses/i);
    // magic_wand resolves to its baked item icon + label via AmountChips
    expect(body).toMatch(/wand|Wand/i);
  });
});

describe("hasAchievementCard", () => {
  it("is true for a real achievement", () => {
    expect(hasAchievementCard(achievement("first_steps"))).toBe(true);
  });
  it("is false for null", () => {
    expect(hasAchievementCard(null)).toBe(false);
  });
});
