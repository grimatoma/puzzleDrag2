import { describe, expect, it } from "vitest";
import { seasonIndexInSession } from "../features/zones/data.ts";

describe("seasonIndexInSession", () => {
  it("divides a standard 10-turn budget into four seasons using remaining turns", () => {
    // Budget = 10
    // turnsRemaining = 10 - turnsUsed
    // > 7.5: turnsUsed 0, 1, 2 -> remaining 10, 9, 8 -> 0 (Spring)
    // > 5.0: turnsUsed 3, 4 -> remaining 7, 6 -> 1 (Summer)
    // > 2.5: turnsUsed 5, 6, 7 -> remaining 5, 4, 3 -> 2 (Autumn)
    // <= 2.5: turnsUsed 8, 9, 10 -> remaining 2, 1, 0 -> 3 (Winter)

    expect(seasonIndexInSession(0, 10)).toBe(0); // 10 remaining > 7.5
    expect(seasonIndexInSession(1, 10)).toBe(0); // 9 remaining > 7.5
    expect(seasonIndexInSession(2, 10)).toBe(0); // 8 remaining > 7.5

    expect(seasonIndexInSession(3, 10)).toBe(1); // 7 remaining > 5.0
    expect(seasonIndexInSession(4, 10)).toBe(1); // 6 remaining > 5.0

    expect(seasonIndexInSession(5, 10)).toBe(2); // 5 remaining > 2.5
    expect(seasonIndexInSession(6, 10)).toBe(2); // 4 remaining > 2.5
    expect(seasonIndexInSession(7, 10)).toBe(2); // 3 remaining > 2.5

    expect(seasonIndexInSession(8, 10)).toBe(3); // 2 remaining <= 2.5
    expect(seasonIndexInSession(9, 10)).toBe(3); // 1 remaining <= 2.5
    expect(seasonIndexInSession(10, 10)).toBe(3); // 0 remaining <= 2.5
  });

  it("handles a budget that divides evenly by 4", () => {
    // Budget = 12
    // > 9: turnsUsed 0, 1, 2 -> remaining 12, 11, 10 -> 0
    // > 6: turnsUsed 3, 4, 5 -> remaining 9, 8, 7 -> 1
    // > 3: turnsUsed 6, 7, 8 -> remaining 6, 5, 4 -> 2
    // <= 3: turnsUsed 9, 10, 11, 12 -> remaining 3, 2, 1, 0 -> 3

    expect(seasonIndexInSession(0, 12)).toBe(0);
    expect(seasonIndexInSession(2, 12)).toBe(0);

    expect(seasonIndexInSession(3, 12)).toBe(1);
    expect(seasonIndexInSession(5, 12)).toBe(1);

    expect(seasonIndexInSession(6, 12)).toBe(2);
    expect(seasonIndexInSession(8, 12)).toBe(2);

    expect(seasonIndexInSession(9, 12)).toBe(3);
    expect(seasonIndexInSession(11, 12)).toBe(3);
  });

  it("handles turnBudget <= 0 by returning 0", () => {
    expect(seasonIndexInSession(0, 0)).toBe(0);
    expect(seasonIndexInSession(5, -5)).toBe(0);
  });

  it("clamps turnsRemaining to 0 when turnsUsed > turnBudget", () => {
    // Budget 10, turnsUsed 15 -> remaining = max(0, 10-15) = 0 -> returns 3 (Winter)
    expect(seasonIndexInSession(15, 10)).toBe(3);
  });
});
