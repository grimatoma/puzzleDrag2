/**
 * Phase 7.1 — Daily quest slots (deterministic roll, tick, claim)
 * Tests run RED first; implementation in src/features/quests/templates.js + data.js
 */
import { describe, it, expect } from "vitest";
import { QUEST_TEMPLATES } from "../features/quests/templates.js";
import { rollQuests, tickQuest, claimQuest } from "../features/quests/data.js";
import { createInitialState } from "../state.js";

// ── helper ────────────────────────────────────────────────────────────────────
function freshState() {
  global.localStorage.clear();
  return createInitialState();
}

// ── 7.1.1 Template shape ──────────────────────────────────────────────────────
describe("7.1 QUEST_TEMPLATES", () => {
  it("covers all 5 categories", () => {
    const cats = new Set(QUEST_TEMPLATES.map((t) => t.category));
    expect(cats.has("collect")).toBe(true);
    expect(cats.has("craft")).toBe(true);
    expect(cats.has("order")).toBe(true);
    expect(cats.has("tool")).toBe(true);
    expect(cats.has("chain")).toBe(true);
  });

  it("has at least 12 templates", () => {
    expect(QUEST_TEMPLATES.length).toBeGreaterThanOrEqual(12);
  });

  it("every template has a sane target range", () => {
    for (const t of QUEST_TEMPLATES) {
      expect(t.targetMin).toBeGreaterThan(0);
      expect(t.targetMax).toBeGreaterThanOrEqual(t.targetMin);
    }
  });
});

// ── 7.1.2 rollQuests ──────────────────────────────────────────────────────────
describe("7.1 rollQuests", () => {
  it("returns exactly 6 quests", () => {
    const q = rollQuests("seed-A", 1, "spring");
    expect(Array.isArray(q)).toBe(true);
    expect(q.length).toBe(6);
  });

  it("every quest has the expected shape with xp locked at 20", () => {
    const q = rollQuests("seed-A", 1, "spring");
    for (const quest of q) {
      expect(quest.id).toBeTruthy();
      expect(quest.template).toBeTruthy();
      expect(quest.target).toBeGreaterThan(0);
      expect(quest.progress).toBe(0);
      expect(quest.claimed).toBe(false);
      expect(quest.reward.xp).toBe(20);
    }
  });

  it("is deterministic — same seed/year/season always returns the same quests", () => {
    const q1 = rollQuests("seed-A", 1, "spring");
    const q2 = rollQuests("seed-A", 1, "spring");
    expect(JSON.stringify(q1)).toBe(JSON.stringify(q2));
  });

  it("different season produces different quests", () => {
    const q1 = rollQuests("seed-A", 1, "spring");
    const q2 = rollQuests("seed-A", 1, "summer");
    expect(JSON.stringify(q1)).not.toBe(JSON.stringify(q2));
  });

  it("different year changes targets", () => {
    const a = rollQuests("seed-A", 1, "spring").map((q) => q.target);
    const b = rollQuests("seed-A", 2, "spring").map((q) => q.target);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("coins reward is coinBase + floor(target * coinPerUnit)", () => {
    const q = rollQuests("seed-A", 1, "spring");
    for (const quest of q) {
      const tpl = QUEST_TEMPLATES.find((t) => t.id === quest.template);
      const expected = tpl.coinBase + Math.floor(quest.target * tpl.coinPerUnit);
      expect(quest.reward.coins).toBe(expected);
    }
  });
});

// ── 7.1.3 tickQuest ───────────────────────────────────────────────────────────
describe("7.1 tickQuest", () => {
  const hayQuest = {
    id: "x", template: "collect_hay", category: "collect",
    key: "hay", target: 30, progress: 0, claimed: false,
    reward: { coins: 60, xp: 20 },
  };

  it("ticks collect quest by event amount on matching key", () => {
    const after = tickQuest(hayQuest, { type: "collect", key: "hay", amount: 7 });
    expect(after.progress).toBe(7);
  });

  it("is pure — original quest unchanged", () => {
    tickQuest(hayQuest, { type: "collect", key: "hay", amount: 7 });
    expect(hayQuest.progress).toBe(0);
  });

  it("does not tick on wrong resource key", () => {
    const r = tickQuest(hayQuest, { type: "collect", key: "wheat", amount: 5 });
    expect(r.progress).toBe(0);
  });

  it("does not tick on wrong event type", () => {
    const r = tickQuest(hayQuest, { type: "craft", item: "bread", count: 1 });
    expect(r.progress).toBe(0);
  });

  it("caps progress at target", () => {
    const r = tickQuest(hayQuest, { type: "collect", key: "hay", amount: 999 });
    expect(r.progress).toBe(hayQuest.target);
  });

  it("does not tick a claimed quest", () => {
    const claimed = { ...hayQuest, claimed: true };
    const r = tickQuest(claimed, { type: "collect", key: "hay", amount: 10 });
    expect(r.progress).toBe(0);
  });

  const craftQuest = {
    id: "c1", template: "craft_bread", category: "craft",
    item: "bread", target: 3, progress: 0, claimed: false,
    reward: { coins: 95, xp: 20 },
  };

  it("ticks craft quest on matching item", () => {
    const r = tickQuest(craftQuest, { type: "craft", item: "bread", count: 2 });
    expect(r.progress).toBe(2);
  });

  it("does not tick craft quest on wrong item", () => {
    const r = tickQuest(craftQuest, { type: "craft", item: "jam", count: 1 });
    expect(r.progress).toBe(0);
  });

  const orderQuest = {
    id: "o1", template: "orders_any", category: "order",
    target: 4, progress: 0, claimed: false,
    reward: { coins: 120, xp: 20 },
  };

  it("ticks order quest on any order event", () => {
    const r = tickQuest(orderQuest, { type: "order" });
    expect(r.progress).toBe(1);
  });

  const toolQuest = {
    id: "t1", template: "tool_scythe", category: "tool",
    tool: "scythe", target: 3, progress: 0, claimed: false,
    reward: { coins: 60, xp: 20 },
  };

  it("ticks tool quest on matching tool", () => {
    const r = tickQuest(toolQuest, { type: "tool", tool: "scythe" });
    expect(r.progress).toBe(1);
  });

  it("does not tick tool quest on wrong tool", () => {
    const r = tickQuest(toolQuest, { type: "tool", tool: "seedpack" });
    expect(r.progress).toBe(0);
  });

  const chainQuest = {
    id: "ch1", template: "chain_8", category: "chain",
    minLength: 8, target: 1, progress: 0, claimed: false,
    reward: { coins: 75, xp: 20 },
  };

  it("ticks chain quest when length >= minLength", () => {
    const r = tickQuest(chainQuest, { type: "chain", length: 10 });
    expect(r.progress).toBe(1);
  });

  it("does not tick chain quest when length < minLength", () => {
    const r = tickQuest(chainQuest, { type: "chain", length: 5 });
    expect(r.progress).toBe(0);
  });
});

// ── 7.1.4 claimQuest ─────────────────────────────────────────────────────────
describe("7.1 claimQuest", () => {
  it("rejects claim when progress < target", () => {
    const s = { ...freshState(), coins: 0,
      quests: [{ id: "q1", template: "collect_hay", category: "collect", key: "hay",
        target: 30, progress: 10, claimed: false, reward: { coins: 60, xp: 20 } }] };
    const r = claimQuest(s, "q1");
    expect(r.ok).toBe(false);
    expect(r.newState.coins).toBe(0);
    expect(r.newState.quests[0].claimed).toBe(false);
  });

  it("accepts claim when progress >= target — pays coins, flips claimed, reports xpGain", () => {
    const s = { ...freshState(), coins: 0,
      quests: [{ id: "q1", template: "collect_hay", category: "collect", key: "hay",
        target: 30, progress: 30, claimed: false, reward: { coins: 60, xp: 20 } }] };
    const r = claimQuest(s, "q1");
    expect(r.ok).toBe(true);
    expect(r.newState.coins).toBe(60);
    expect(r.newState.quests[0].claimed).toBe(true);
    expect(r.xpGain).toBe(20);
  });

  it("re-claim is a no-op — no double-pay", () => {
    const s0 = { ...freshState(), coins: 0,
      quests: [{ id: "q1", template: "collect_hay", category: "collect", key: "hay",
        target: 30, progress: 30, claimed: false, reward: { coins: 60, xp: 20 } }] };
    const r1 = claimQuest(s0, "q1");
    const r2 = claimQuest(r1.newState, "q1");
    expect(r2.ok).toBe(false);
    expect(r2.newState.coins).toBe(60);
  });

  it("returns ok:false with xpGain:0 when quest not found", () => {
    const s = { ...freshState(), quests: [] };
    const r = claimQuest(s, "nonexistent");
    expect(r.ok).toBe(false);
    expect(r.xpGain).toBe(0);
  });
});

// ── 7.1.5 state.quests initialised on fresh save ──────────────────────────────
describe("7.1 initialState quests", () => {
  it("fresh state has exactly 6 quests", () => {
    const s = freshState();
    expect(Array.isArray(s.quests)).toBe(true);
    expect(s.quests.length).toBe(6);
  });

  it("fresh state has a saveSeed string", () => {
    const s = freshState();
    expect(typeof s.saveSeed).toBe("string");
    expect(s.saveSeed.length).toBeGreaterThan(0);
  });
});
