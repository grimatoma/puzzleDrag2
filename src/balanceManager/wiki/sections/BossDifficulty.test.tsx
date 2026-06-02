// @vitest-environment jsdom
/**
 * BossDifficulty.test.tsx — TDD suite for the wiki boss difficulty section.
 *
 * Uses real catalog data. `frostmaw` targets `tile_tree_oak` ×30 in winter
 * with a freeze_columns modifier, so it exercises the tier chip, per-turn
 * read (30 / 10 = 3), the defeat-target resource chip, season, and modifier.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { BossDifficulty, hasBossDifficulty } from "./BossDifficulty.jsx";
import { BOSSES } from "../../../features/bosses/data.js";

afterEach(() => cleanup());

function bossById(id: string) {
  const b = BOSSES.find((x) => x.id === id);
  if (b == null) throw new Error(`boss ${id} not found`);
  return b;
}

function renderBoss(id: string, navigate = vi.fn()) {
  const boss = bossById(id);
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <BossDifficulty boss={boss} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate, boss };
}

describe("BossDifficulty — real boss (frostmaw)", () => {
  it("renders the Difficulty heading and a tier label chip", () => {
    renderBoss("frostmaw");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Difficulty");
    // 30 / 10 = 3 per turn → "Gentle" tier (≤3)
    expect(body).toMatch(/gentle/i);
  });

  it("renders the per-turn target (~3) and the season", () => {
    renderBoss("frostmaw");
    const body = document.body.textContent ?? "";
    expect(body).toContain("~3");
    expect(body).toMatch(/per turn/i);
    expect(body).toMatch(/winter/i);
  });

  it("renders the defeat-target amount and the modifier label", () => {
    renderBoss("frostmaw");
    const body = document.body.textContent ?? "";
    // amount× resource
    expect(body).toContain("30×");
    expect(body).toMatch(/freezes columns/i);
  });

  it("renders a navigable defeat-target chip that navigates via wikiNavTarget", () => {
    const { navigate } = renderBoss("frostmaw");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.focus).toMatch(/^[a-zA-Z_]+:.+/);
    expect(arg.tab).toBe(arg.focus.slice(0, arg.focus.indexOf(":")));
  });
});

describe("hasBossDifficulty", () => {
  it("is true for a boss with a defeat target", () => {
    expect(hasBossDifficulty(bossById("frostmaw"))).toBe(true);
  });
  it("is false for a boss with no target", () => {
    expect(hasBossDifficulty({ id: "x", target: { amount: 0 } })).toBe(false);
    expect(hasBossDifficulty(null)).toBe(false);
  });
});
