import { describe, it, expect } from "vitest";
import { evaluateStoryTriggers, INITIAL_STORY_STATE } from "../story.js";

// ─── 2.5 — Harvest Festival win condition ────────────────────────────────────

// All flags set except festival_announced (pre-announce state).
// Arrival beats now stamp their roster flags directly, so nextPendingBeat can
// skip them once those flags are present.
const preAnnounceFlags = {
  intro_seen: true,
  first_harvest: true,
  hearth_lit: true,
  first_order: true,
  granary_built: true,
  home_keeper_resolved: true,
  bram_arrived: true,
  first_iron: true,
  quarry_foothold: true,
  liss_arrived: true,
  mine_revealed: true,
  mine_unlocked: true,
  caravan_open: true,
  // festival_announced: missing intentionally
};

const preAnnounce = {
  ...INITIAL_STORY_STATE,
  act: 3,
  beat: "act3_win",
  flags: preAnnounceFlags,
};

const postAnnounce = {
  ...preAnnounce,
  flags: { ...preAnnounceFlags, festival_announced: true },
};

const fullTotals = { grass_hay: 50, grain_wheat: 50, grain: 50, berry: 50, wood_log: 50 };

describe("2.5 — win beat gating", () => {
  it("win does NOT fire before festival announced, even with 50/50/50/50/50", () => {
    const r = evaluateStoryTriggers(
      preAnnounce,
      { type: "resource_total_multi" },
      fullTotals
    );
    expect(r).toBeNull();
  });

  it("win fires when festival_announced=true and totals all met", () => {
    const r = evaluateStoryTriggers(
      postAnnounce,
      { type: "resource_total_multi" },
      fullTotals
    );
    expect(r).not.toBeNull();
    expect(r.firedBeat.id).toBe("act3_win");
  });

  it("win fires with isWon in newFlags", () => {
    const r = evaluateStoryTriggers(
      postAnnounce,
      { type: "resource_total_multi" },
      fullTotals
    );
    expect(r.newFlags.isWon).toBe(true);
  });

  it("49 log does NOT trigger win", () => {
    const short = { ...fullTotals, wood_log: 49 };
    const r = evaluateStoryTriggers(
      postAnnounce,
      { type: "resource_total_multi" },
      short
    );
    expect(r).toBeNull();
  });

  it("49 hay does NOT trigger win", () => {
    const short = { ...fullTotals, grass_hay: 49 };
    const r = evaluateStoryTriggers(
      postAnnounce,
      { type: "resource_total_multi" },
      short
    );
    expect(r).toBeNull();
  });
});
