import { describe, it, expect } from "vitest";
import { rootReducer, initialState } from "../state.js";
import { computeWorkerEffects } from "../features/apprentices/effects.js";

// NOTE: CLOSE_SEASON also adds SEASON_END_BONUS_COINS = 25 (pre-Phase-4 mechanic).
// Expected coin values include that +25 bonus unless debt absorbs all available coins.
const BONUS = 25; // SEASON_END_BONUS_COINS

describe("Phase 4.4 — Wages on CLOSE_SEASON + debt rollover", () => {
  const base = initialState();

  // A: 100 coins, 1 Hilda, wage 15 → 85+25=110 coins, 0 debt, still hired
  it("A: wage deducted on CLOSE_SEASON, no debt", () => {
    const a0 = { ...base, coins: 100,
      workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 0, pool: 0 } };
    const a1 = rootReducer(a0, { type: "CLOSE_SEASON" });
    expect(a1.coins).toBe(100 - 15 + BONUS); // 110
    expect(a1.workers.debt).toBe(0);
    expect(a1.workers.hired.hilda).toBe(1);
  });

  // B: 10 coins, same Hilda → 0 coins + 25 bonus, 5 debt, still hired
  it("B: partial payment → debt incurred, worker NOT fired", () => {
    const b0 = { ...base, coins: 10,
      workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 0, pool: 0 } };
    const b1 = rootReducer(b0, { type: "CLOSE_SEASON" });
    // 10 coins, wage 15 → pay 10, debt 5; then BONUS added (debt=0? no, debt>0 so no bonus from workers, but SEASON_END is always added)
    expect(b1.coins).toBe(BONUS); // 0 from wages + 25 base bonus
    expect(b1.workers.debt).toBe(5);
    expect(b1.workers.hired.hilda).toBe(1);
  });

  // C: with debt, effects suppressed
  it("C: debt > 0 → effects suppressed", () => {
    const b0 = { ...base, coins: 10,
      workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 0, pool: 0 } };
    const b1 = rootReducer(b0, { type: "CLOSE_SEASON" });
    expect(computeWorkerEffects(b1).thresholdReduce.hay ?? 0).toBe(0);
  });

  // D: order auto-pays debt before crediting coins
  it("D: TURN_IN_ORDER auto-repays debt first", () => {
    const b0 = { ...base, coins: 0,
      workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 5, pool: 0 } };
    // Create a matching order manually
    const order = { id: "test-order", npc: "mira", key: "hay", need: 0, reward: 50, line: "" };
    const withOrder = { ...b0, orders: [order, ...b0.orders.slice(1)],
      inventory: { ...b0.inventory, hay: 100 } };
    const d1 = rootReducer(withOrder, { type: "TURN_IN_ORDER", id: "test-order" });
    expect(d1.workers.debt).toBe(0);
    expect(d1.coins).toBe(45); // 50 - 5 debt = 45 net
  });

  // E: effects resume after debt clears
  it("E: effects resume after debt cleared", () => {
    const b0 = { ...base, coins: 0,
      workers: { hired: { ...base.workers.hired, hilda: 1 }, debt: 5, pool: 0 } };
    const order = { id: "test-order2", npc: "mira", key: "hay", need: 0, reward: 50, line: "" };
    const withOrder = { ...b0, orders: [order, ...b0.orders.slice(1)],
      inventory: { ...b0.inventory, hay: 100 } };
    const d1 = rootReducer(withOrder, { type: "TURN_IN_ORDER", id: "test-order2" });
    expect(computeWorkerEffects(d1).thresholdReduce.hay).toBe(1);
  });

  // F: Tuck — 20 coins, wage 20, season_bonus +30 → 0 + 30 + 25 = 55 coins
  it("F: Tuck bonus paid after wages → net 0-20+30+25=35... wait: 20-20=0 wages, +30 bonus, +25 base = 55", () => {
    const f0 = { ...base, coins: 20,
      workers: { hired: { ...base.workers.hired, tuck: 1 }, debt: 0, pool: 0 } };
    const f1 = rootReducer(f0, { type: "CLOSE_SEASON" });
    // 20 - 20 (wage) + 30 (Tuck bonus) + 25 (base bonus) = 55
    expect(f1.coins).toBe(55);
    expect(f1.workers.debt).toBe(0);
  });

  // G: Tuck in debt — worker bonus suppressed but BASE bonus still applies
  it("G: Tuck with insufficient coins → debt, worker bonus suppressed", () => {
    const g0 = { ...base, coins: 5,
      workers: { hired: { ...base.workers.hired, tuck: 1 }, debt: 0, pool: 0 } };
    const g1 = rootReducer(g0, { type: "CLOSE_SEASON" });
    // 5 - 20 wage → debt 15; no Tuck bonus (debt>0); but +25 base bonus still lands
    expect(g1.coins).toBe(BONUS); // 0 + 25 base bonus
    expect(g1.workers.debt).toBe(15);
  });

  // H: multi-worker shortfall — 50 coins, hilda×3=45, pip×1=12, total=57
  it("H: multi-worker shortfall → correct debt", () => {
    const h0 = { ...base, coins: 50,
      workers: { hired: { ...base.workers.hired, hilda: 3, pip: 1 }, debt: 0, pool: 0 } };
    const h1 = rootReducer(h0, { type: "CLOSE_SEASON" });
    // 50 paid, 7 debt; +25 base bonus (added on top)
    expect(h1.coins).toBe(BONUS); // 0 from wages + 25 base
    expect(h1.workers.debt).toBe(7);
    expect(h1.workers.hired.hilda).toBe(3);
  });

  // SELL_RESOURCE auto-repays debt
  it("I: SELL_RESOURCE auto-repays debt before crediting coins", () => {
    const s0 = { ...base, coins: 0,
      workers: { hired: { ...base.workers.hired }, debt: 20, pool: 0 },
      inventory: { ...base.inventory, hay: 10 },
      market: { ...base.market, prices: { hay: { buy: 40, sell: 5 } } } };
    const s1 = rootReducer(s0, { type: "SELL_RESOURCE", payload: { key: "hay", qty: 10 } });
    // sale = 50, debt = 20, net coins = 30
    expect(s1.workers.debt).toBe(0);
    expect(s1.coins).toBe(30);
  });
});
