import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReachabilityBadge } from "./ReachabilityBadge.js";

describe("ReachabilityBadge", () => {
  it("renders each reachability state with a distinct label, tier token and tone", () => {
    const reachable = renderToStaticMarkup(<ReachabilityBadge reach="reachable" />);
    const gated = renderToStaticMarkup(<ReachabilityBadge reach="gated" />);
    const unreachable = renderToStaticMarkup(<ReachabilityBadge reach="unreachable" />);

    expect(reachable).toContain("Reachable");
    expect(reachable).toContain("REACH");
    expect(gated).toContain("Gated");
    expect(gated).toContain("GATED");
    expect(unreachable).toContain("Unreachable");
    expect(unreachable).toContain("NO PATH");

    // Reuses StatusBadge's class so the pair styles identically.
    for (const html of [reachable, gated, unreachable]) expect(html).toContain("wiki-status-badge");
    // Distinct tones (green success vs red danger).
    expect(reachable).not.toEqual(unreachable);
  });

  it("renders an inert span by default and a button when onActivate is given", () => {
    const inert = renderToStaticMarkup(<ReachabilityBadge reach="reachable" />);
    const clickable = renderToStaticMarkup(<ReachabilityBadge reach="reachable" onActivate={() => {}} />);
    expect(inert).toContain("<span");
    expect(inert).not.toContain("wiki-status-badge--button");
    expect(clickable).toContain("<button");
    expect(clickable).toContain("wiki-status-badge--button");
  });
});
