import { describe, it, expect } from "vitest";
import { BOSSES, bossReward } from "../features/bosses/data.js";

describe("8.2 — Boss reward scaling", () => {
  const fm = BOSSES.find((b) => b.id === "frostmaw");
  const qm = BOSSES.find((b) => b.id === "quagmire");
  const os = BOSSES.find((b) => b.id === "old_stoneface");

  it("failed boss: 0 coins, 0 runes, defeated false", () => {
    const r = bossReward(fm, 29, 1);
    expect(r.defeated).toBe(false);
    expect(r.coins).toBe(0);
    expect(r.runes).toBe(0);
  });

  it("year 1 exact-target = 200 coins + 1 rune", () => {
    const r = bossReward(fm, 30, 1);
    expect(r.defeated).toBe(true);
    expect(r.coins).toBe(200);
    expect(r.runes).toBe(1);
  });

  it("year 1 1.5× target (45 logs) = 250 coins", () => {
    expect(bossReward(fm, 45, 1).coins).toBe(250);
  });

  it("year 1 2× target (60 logs) = 300 coins (cap)", () => {
    expect(bossReward(fm, 60, 1).coins).toBe(300);
  });

  it("year 1 3× target (90 logs) also caps at 300 coins", () => {
    expect(bossReward(fm, 90, 1).coins).toBe(300);
  });

  it("year 2 base = 400 coins", () => {
    expect(bossReward(fm, 30, 2).coins).toBe(400);
  });

  it("year 2 2× = 600 coins", () => {
    expect(bossReward(fm, 60, 2).coins).toBe(600);
  });

  it("year 3 1.5× = 750 coins", () => {
    expect(bossReward(fm, 45, 3).coins).toBe(750);
  });

  it("quagmire exact year 1 = 200 coins", () => {
    expect(bossReward(qm, 50, 1).coins).toBe(200);
  });

  it("quagmire 2× year 1 = 300 coins", () => {
    expect(bossReward(qm, 100, 1).coins).toBe(300);
  });

  it("stoneface 1.2× year 1 = 220 coins (margin 0.2)", () => {
    expect(bossReward(os, 24, 1).coins).toBe(220);
  });

  it("year 5 fail still pays 0", () => {
    expect(bossReward(fm, 25, 5).coins).toBe(0);
  });
});
