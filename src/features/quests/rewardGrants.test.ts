/**
 * Reward grant coverage for the richer quest reward bundle: runes, structural
 * perks, tile unlocks, and building unlocks. These flow through
 * grantQuestRewardExtras (shared by the deterministic and legacy claim paths) and,
 * for buildings, surface via globallyUnlockedBuildings.
 */
import { describe, it, expect } from "vitest";
import { grantQuestRewardExtras } from "./data.js";
import { globallyUnlockedBuildings } from "../zones/data.js";
import { createInitialState } from "../../state.js";
import type { GameState } from "../../types/state.js";

function fresh(): GameState {
  global.localStorage.clear();
  return createInitialState();
}

describe("grantQuestRewardExtras — richer reward kinds", () => {
  it("adds runes to the balance", () => {
    const s0 = fresh();
    const before = s0.runes ?? 0;
    const s1 = grantQuestRewardExtras(s0, { runes: 2 });
    expect(s1.runes).toBe(before + 2);
  });

  it("latches a structural perk flag in tools", () => {
    const s1 = grantQuestRewardExtras(fresh(), { structural: "goldSeal" });
    expect((s1.tools as Record<string, unknown>).goldSeal).toBe(true);
  });

  it("marks a valid unlockTile discovered, and ignores an unknown tile key", () => {
    const ok = grantQuestRewardExtras(fresh(), { unlockTile: "tile_cattle_triceratops" });
    expect(ok.tileCollection?.discovered?.tile_cattle_triceratops).toBe(true);

    const bad = grantQuestRewardExtras(fresh(), { unlockTile: "tile_not_a_real_tile" });
    expect(bad.tileCollection?.discovered?.tile_not_a_real_tile).toBeUndefined();
  });

  it("records a valid unlockBuilding, dedupes, and ignores an unknown id", () => {
    const s1 = grantQuestRewardExtras(fresh(), { unlockBuilding: "mill" });
    expect(s1.questUnlockedBuildings).toContain("mill");

    // Granting the same building again does not duplicate it.
    const s2 = grantQuestRewardExtras(s1, { unlockBuilding: "mill" });
    expect(s2.questUnlockedBuildings?.filter((b) => b === "mill")).toHaveLength(1);

    const bad = grantQuestRewardExtras(fresh(), { unlockBuilding: "not_a_building" });
    expect(bad.questUnlockedBuildings ?? []).not.toContain("not_a_building");
  });

  it("returns the same state reference when the reward carries no extras", () => {
    const s0 = fresh();
    expect(grantQuestRewardExtras(s0, { coins: 100, xp: 20 })).toBe(s0);
  });

  it("surfaces a quest-unlocked building through globallyUnlockedBuildings", () => {
    const s0 = fresh();
    // forge is gated behind a later cartography tier — not unlocked at game start.
    expect(globallyUnlockedBuildings(s0)).not.toContain("forge");
    const s1 = grantQuestRewardExtras(s0, { unlockBuilding: "forge" });
    expect(globallyUnlockedBuildings(s1)).toContain("forge");
  });
});
