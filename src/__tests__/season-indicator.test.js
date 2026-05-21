import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { SeasonIndicator, SeasonIcon } from "../ui/puzzleBoard.jsx";
import { SeasonScene } from "../ui/seasonScenes.jsx";
import { reduce as settingsReduce } from "../features/settings/slice.js";

const baseProps = {
  turnsUsed: 3,
  turnBudget: 10,
  turnsRemaining: 7,
  seasonIdx: 0,
  seasonName: "Spring",
};

describe("settings — bespokeSeasonWidget toggle", () => {
  it("flips an undefined/false flag to true", () => {
    const state = { settings: {} };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.bespokeSeasonWidget).toBe(true);
  });

  it("flips true back to false", () => {
    const state = { settings: { bespokeSeasonWidget: true } };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.bespokeSeasonWidget).toBe(false);
  });

  it("does not affect unrelated settings keys", () => {
    const state = { settings: { sfxOn: true, bespokeSeasonWidget: false } };
    const next = settingsReduce(state, { type: "SETTINGS/TOGGLE", key: "bespokeSeasonWidget" });
    expect(next.settings.sfxOn).toBe(true);
    expect(next.settings.bespokeSeasonWidget).toBe(true);
  });
});

describe("SeasonIndicator — picks the right presentation", () => {
  it("renders the themed wheel when bespoke=false", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps, bespoke: false }));
    expect(html).toContain('data-testid="turns-left"');
    expect(html).toContain("Spring");
    // Wheel mode does not put role="img" on the SVG.
    expect(html).not.toContain('role="img"');
  });

  it("renders a bespoke scene when bespoke=true", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps, bespoke: true }));
    expect(html).toContain('data-testid="turns-left"');
    expect(html).toContain('role="status"');
    expect(html).toContain('role="img"');
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
    expect(match[1]).toBe("7"); // turnBudget 10 - turnsUsed 3
  });
});

describe("SeasonScene — dispatches to the right scene per season", () => {
  const seasons = [
    { idx: 0, name: "Spring", gradId: "hwv-spring-sky" },
    { idx: 1, name: "Summer", gradId: "hwv-summer-sky" },
    { idx: 2, name: "Autumn", gradId: "hwv-autumn-sky" },
    { idx: 3, name: "Winter", gradId: "hwv-winter-sky" },
  ];

  for (const { idx, name, gradId } of seasons) {
    it(`renders the ${name} scene for seasonIdx=${idx}`, () => {
      const html = renderToString(h(SeasonScene, { seasonIdx: idx, remaining: 5, name }));
      expect(html).toContain(gradId);
      expect(html.toUpperCase()).toContain(name.toUpperCase());
      expect(html).toContain('data-testid="turns-left"');
    });
  }

  it("falls back to the Spring scene for an unknown seasonIdx", () => {
    const html = renderToString(h(SeasonScene, { seasonIdx: 99, remaining: 5, name: "Spring" }));
    expect(html).toContain("hwv-spring-sky");
  });
});

describe("SeasonScene — aria-label", () => {
  it("uses singular when remaining=1", () => {
    const html = renderToString(h(SeasonScene, { seasonIdx: 0, remaining: 1, name: "Spring" }));
    expect(html).toMatch(/aria-label="Spring [^"]*1 turn left"/);
  });

  it("uses plural for any other count", () => {
    const html5 = renderToString(h(SeasonScene, { seasonIdx: 1, remaining: 5, name: "Summer" }));
    expect(html5).toMatch(/aria-label="Summer [^"]*5 turns left"/);

    const html0 = renderToString(h(SeasonScene, { seasonIdx: 1, remaining: 0, name: "Summer" }));
    expect(html0).toMatch(/aria-label="Summer [^"]*0 turns left"/);
  });
});

describe("SeasonScene — numeral matches remaining across ranges", () => {
  for (const n of [0, 1, 3, 7, 12]) {
    it(`shows ${n} when remaining=${n}`, () => {
      const html = renderToString(h(SeasonScene, { seasonIdx: 2, remaining: n, name: "Autumn" }));
      const match = html.match(/data-testid="turns-left"[^>]*>\s*(\d+)\s*</);
      expect(match?.[1]).toBe(String(n));
    });
  }
});

describe("SeasonIcon", () => {
  it("renders an SVG for each season index 0–3", () => {
    for (const kind of [0, 1, 2, 3]) {
      const html = renderToString(h(SeasonIcon, { kind }));
      expect(html).toContain("<svg");
    }
  });

  it("renders nothing for an unknown kind", () => {
    const html = renderToString(h(SeasonIcon, { kind: 99 }));
    expect(html).toBe("");
  });

  it("uses no emoji in the output", () => {
    for (const kind of [0, 1, 2, 3]) {
      const html = renderToString(h(SeasonIcon, { kind }));
      expect(html).not.toMatch(/🌸|☀️|🍂|❄️|☀|🌻|🌹/);
    }
  });
});
