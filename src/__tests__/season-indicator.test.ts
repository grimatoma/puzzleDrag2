import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { SeasonIndicator } from "../ui/puzzleBoard.jsx";

const baseProps = {
  turnsUsed: 3,
  turnBudget: 10,
  turnsRemaining: 7,
  seasonIdx: 1,
  seasonName: "Summer",
};

// SeasonIndicator renders the Phaser strip behind a Suspense boundary. Under
// SSR (renderToString) the lazy child never resolves, so we exercise the
// fallback placeholder — which still honours the `role="status"` /
// `data-testid="turns-left"` contracts the rest of the app relies on.
describe("SeasonIndicator — fallback placeholder", () => {
  it("exposes the status role and turns-left testid", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps }));
    expect(html).toContain('data-testid="turns-left"');
    expect(html).toContain('role="status"');
  });

  it("shows the remaining count", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps }));
    const match = html.match(/data-testid="turns-left"[^>]*>\s*(\d+)\s*</);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe("7");
  });

  it("pluralizes the aria-label", () => {
    const plural = renderToString(h(SeasonIndicator, { ...baseProps, turnsRemaining: 5 }));
    expect(plural).toMatch(/aria-label="Summer [^"]*5 turns left"/);

    const singular = renderToString(
      h(SeasonIndicator, { ...baseProps, seasonName: "Winter", turnsRemaining: 1 })
    );
    expect(singular).toMatch(/aria-label="Winter [^"]*1 turn left"/);
  });

  it("emits no legacy season emoji", () => {
    const html = renderToString(h(SeasonIndicator, { ...baseProps }));
    expect(html).not.toMatch(/🌸|☀️|🍂|❄️|🌻|🌹|🌷|🍁/);
  });
});
