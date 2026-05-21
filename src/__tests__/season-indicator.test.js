import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { SeasonIndicator } from "../ui/puzzleBoard.jsx";
import { SeasonStrip, seasonTurnRanges } from "../ui/seasonStrip.jsx";
import { reduce as settingsReduce } from "../features/settings/slice.js";

const baseProps = {
  turnsUsed: 3,
  turnBudget: 10,
  turnsRemaining: 7,
  seasonIdx: 1,
  seasonName: "Summer",
};

describe("seasonTurnRanges", () => {
  it("divides a 10-turn budget into 2/3/2/3", () => {
    const ranges = seasonTurnRanges(10);
    expect(ranges.map((r) => r.count)).toEqual([2, 3, 2, 3]);
    expect(ranges[0].end).toBe(2);
    expect(ranges[3].end).toBe(10);
  });

  it("sums each segment back to the budget", () => {
    for (const budget of [4, 8, 12, 16, 20]) {
      const ranges = seasonTurnRanges(budget);
      const sum = ranges.reduce((acc, r) => acc + r.count, 0);
      expect(sum, `budget=${budget}`).toBe(budget);
    }
  });

  it("clamps a zero budget to 1", () => {
    const ranges = seasonTurnRanges(0);
    expect(ranges[3].end).toBe(1);
  });
});

describe("settings — bespokeSeasonWidget toggle", () => {
  it("flips false → true", () => {
    const state = { settings: {} };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.bespokeSeasonWidget).toBe(true);
  });

  it("flips true → false", () => {
    const state = { settings: { bespokeSeasonWidget: true } };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.bespokeSeasonWidget).toBe(false);
  });

  it("does not affect unrelated keys", () => {
    const state = { settings: { sfxOn: true, bespokeSeasonWidget: false } };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.sfxOn).toBe(true);
    expect(next.settings.bespokeSeasonWidget).toBe(true);
  });
});

describe("SeasonIndicator — renders the strip in both modes", () => {
  it("renders a SeasonStrip when bespoke=false (compact)", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps, bespoke: false }));
    expect(html).toContain('data-testid="turns-left"');
    expect(html).toContain('role="status"');
    // Source-cased labels (CSS text-transform handles display casing).
    for (const name of ["Spring", "Summer", "Autumn", "Winter"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("turns left");
  });

  it("renders a SeasonStrip when bespoke=true (busy)", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps, bespoke: true }));
    expect(html).toContain('data-testid="turns-left"');
    expect(html).toContain('role="status"');
    for (const name of ["Spring", "Summer", "Autumn", "Winter"]) {
      expect(html).toContain(name);
    }
  });

  it("shows the remaining count in both modes", () => {
    for (const bespoke of [false, true]) {
      const html = renderToString(h(SeasonIndicator, { ...baseProps, bespoke }));
      const match = html.match(/data-testid="turns-left"[^>]*>\s*(\d+)\s*</);
      expect(match, `bespoke=${bespoke}`).not.toBeNull();
      expect(match[1]).toBe("7");
    }
  });

  it("falls back to derived remaining when turnsRemaining is missing", () => {
    const html = renderToString(
      h(SeasonIndicator, { ...baseProps, turnsRemaining: undefined, bespoke: false })
    );
    const match = html.match(/data-testid="turns-left"[^>]*>\s*(\d+)\s*</);
    expect(match[1]).toBe("7"); // 10 - 3
  });
});

describe("SeasonStrip — aria-label pluralization", () => {
  it("uses singular when remaining=1", () => {
    const html = renderToString(
      h(SeasonStrip, {
        turnsUsed: 9,
        turnBudget: 10,
        turnsRemaining: 1,
        seasonIdx: 3,
        seasonName: "Winter",
        busy: false,
      })
    );
    expect(html).toMatch(/aria-label="Winter [^"]*1 turn left"/);
  });

  it("uses plural for any other count", () => {
    const html5 = renderToString(
      h(SeasonStrip, {
        turnsUsed: 5,
        turnBudget: 10,
        turnsRemaining: 5,
        seasonIdx: 2,
        seasonName: "Autumn",
        busy: false,
      })
    );
    expect(html5).toMatch(/aria-label="Autumn [^"]*5 turns left"/);

    const html0 = renderToString(
      h(SeasonStrip, {
        turnsUsed: 10,
        turnBudget: 10,
        turnsRemaining: 0,
        seasonIdx: 3,
        seasonName: "Winter",
        busy: false,
      })
    );
    expect(html0).toMatch(/aria-label="Winter [^"]*0 turns left"/);
  });
});

describe("SeasonStrip — numeral matches remaining across ranges", () => {
  for (const n of [0, 1, 3, 7, 12]) {
    it(`shows ${n} when remaining=${n}`, () => {
      const html = renderToString(
        h(SeasonStrip, {
          turnsUsed: 0,
          turnBudget: Math.max(n, 1),
          turnsRemaining: n,
          seasonIdx: 0,
          seasonName: "Spring",
          busy: false,
        })
      );
      const match = html.match(/data-testid="turns-left"[^>]*>\s*(\d+)\s*</);
      expect(match?.[1]).toBe(String(n));
    });
  }
});

describe("SeasonStrip — emoji-free output", () => {
  it("never includes legacy season emoji", () => {
    for (const busy of [false, true]) {
      const html = renderToString(
        h(SeasonStrip, {
          turnsUsed: 3,
          turnBudget: 10,
          turnsRemaining: 7,
          seasonIdx: 1,
          seasonName: "Summer",
          busy,
        })
      );
      expect(html).not.toMatch(/🌸|☀️|🍂|❄️|🌻|🌹|🌷|🍁/);
    }
  });
});
