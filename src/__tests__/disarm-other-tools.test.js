/**
 * Regression — only one tool may be "selected" (armed or used) at a time.
 * The UI helper `disarmOtherTools` dispatches CANCEL_TOOL (and, if fertilizer
 * is the leftover armed flag, USE_TOOL fertilizer for its self-disarm path)
 * before the new tool fires. These tests pin the reducer behavior those
 * dispatches rely on.
 */
import { describe, it, expect } from "vitest";
import { createInitialState, rootReducer } from "../state.js";

function withTools(overrides = {}) {
  const s = createInitialState();
  const { tools: toolOverrides, ...rest } = overrides;
  // Drop a single chicken tile so USE_TOOL bird_cage commits (empty board refunds).
  const grid = s.grid.map((row, ri) =>
    row.map((cell, ci) => (ri === 0 && ci === 0 ? { ...cell, key: "tile_bird_chicken" } : cell)),
  );
  return {
    ...s,
    grid,
    ...rest,
    tools: { ...s.tools, bomb: 1, fertilizer: 1, bird_cage: 1, ...(toolOverrides || {}) },
  };
}

describe("disarm-other-tools — single-armed invariant", () => {
  it("CANCEL_TOOL followed by USE_TOOL on a different tool leaves only the new tool active", () => {
    // bomb armed (tap-target), then user activates bird_cage.
    const s0 = { ...withTools(), toolPending: "bomb" };
    const s1 = rootReducer(s0, { type: "CANCEL_TOOL" });
    expect(s1.toolPending).toBeNull();
    expect(s1.tools.bomb).toBe(1); // tap-target arming spent no charge to refund

    const s2 = rootReducer(s1, { type: "USE_TOOL", key: "bird_cage" });
    expect(s2.toolPending).toBeNull();
    expect(s2.tools.bird_cage).toBe(0); // bird_cage consumed
  });

  it("USE_TOOL fertilizer disarms fertilizerActive and refunds the charge", () => {
    const s0 = { ...withTools({ tools: { fertilizer: 0 } }), fertilizerActive: true };
    const s1 = rootReducer(s0, { type: "USE_TOOL", key: "fertilizer" });
    expect(s1.fertilizerActive).toBe(false);
    expect(s1.tools.fertilizer).toBe(1); // refunded
  });

  it("dual-armed state (bomb + fertilizer) collapses to a single new tool after the disarm sequence", () => {
    // Player has both a tap-target tool armed AND fertilizer armed — exactly
    // the broken visual the screenshot showed. The UI dispatches CANCEL_TOOL,
    // then USE_TOOL fertilizer (disarm path), then USE_TOOL for the new tool.
    const s0 = {
      ...withTools({ tools: { fertilizer: 0 } }),
      toolPending: "bomb",
      fertilizerActive: true,
    };

    const s1 = rootReducer(s0, { type: "CANCEL_TOOL" });
    expect(s1.toolPending).toBeNull();
    expect(s1.fertilizerActive).toBe(true); // CANCEL_TOOL only handles toolPending

    const s2 = rootReducer(s1, { type: "USE_TOOL", key: "fertilizer" });
    expect(s2.fertilizerActive).toBe(false);
    expect(s2.tools.fertilizer).toBe(1); // refunded

    // After the disarm sequence, the new tool fires against a clean slate.
    const s3 = rootReducer(s2, { type: "USE_TOOL", key: "bird_cage" });
    expect(s3.toolPending).toBeNull();
    expect(s3.fertilizerActive).toBe(false);
    expect(s3.tools.bird_cage).toBe(0);
  });

  it("arming a tap-target tool while another is armed does not refund the prior tap-target (no charge was ever spent)", () => {
    // Edge case the disarm sequence relies on: CANCEL_TOOL on a tap-target
    // (bomb/rake/axe/magic_wand) leaves the count untouched.
    const s0 = { ...withTools({ tools: { rake: 1 } }), toolPending: "rake" };
    const s1 = rootReducer(s0, { type: "CANCEL_TOOL" });
    expect(s1.toolPending).toBeNull();
    expect(s1.tools.rake).toBe(1);
  });

  it("switching from one tap-target tool to another leaves the new tool armed", () => {
    // Regression: the in-board hotbar/grid single-tap used to call
    // disarmOtherTools without arming the new tool, leaving the player with
    // nothing selected after a switch. The CANCEL_TOOL + USE_TOOL sequence
    // the UI now dispatches must end with the new tool armed.
    const s0 = { ...withTools({ tools: { bomb: 1, rake: 1 } }), toolPending: "bomb" };
    const s1 = rootReducer(s0, { type: "CANCEL_TOOL" });
    const s2 = rootReducer(s1, { type: "USE_TOOL", key: "rake" });
    expect(s2.toolPending).toBe("rake");
    expect(s2.tools.bomb).toBe(1);
    expect(s2.tools.rake).toBe(1);
  });
});
