// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import ProgressionPage from "./ProgressionPage.js";
import { progressionPoints } from "../../../config/progression/cumulative.js";
import { PROGRESSION_TRIGGERS } from "../../../config/progression/index.js";

afterEach(cleanup);

describe("ProgressionPage", () => {
  it("renders the spine, a cumulative report and the obtainability check", () => {
    const { container, getByText } = render(<ProgressionPage />);
    // Heading + obtainability panel always present.
    expect(getByText("Progression & Unlocks")).toBeTruthy();
    expect(getByText("Resource obtainability check")).toBeTruthy();
    // Spine renders selectable milestone buttons.
    const spineButtons = container.querySelectorAll('[aria-label^="Show state at "]');
    expect(spineButtons.length).toBeGreaterThan(0);
  });

  it("renders the FULL timeline — a selectable node for every progression point, not just milestones", () => {
    const { container } = render(<ProgressionPage />);
    const nodes = container.querySelectorAll('[aria-label^="Show state at "]');
    // One node per point in the flattened spine (milestones + their build steps).
    expect(nodes.length).toBe(progressionPoints().length);
    // And that is strictly more than the milestone count, i.e. the non-milestone
    // build steps are present (the full vertical timeline, not the collapsed spine).
    const milestoneCount = PROGRESSION_TRIGGERS.filter((t) => t.milestone).length;
    expect(progressionPoints().length).toBeGreaterThan(milestoneCount);
  });

  it("shows each step's own unlocks inline on the timeline", () => {
    const { container } = render(<ProgressionPage />);
    // The per-node unlock rows are marked with a ➜ lead-in; the full timeline
    // surfaces what unlocks at each step (the restored feed detail).
    expect(container.textContent).toContain("➜");
  });

  it("selecting a later milestone updates the cumulative report", () => {
    const { container, getByLabelText } = render(<ProgressionPage />);
    const quarry = getByLabelText("Show state at Found the Cracked Quarry (Zone 2)");
    fireEvent.click(quarry);
    // The report heading echoes the selected milestone label.
    expect(container.textContent).toContain("Found the Cracked Quarry (Zone 2)");
    // Founding the quarry pulls in its entry cost line.
    expect(container.textContent).toContain("quarry");
  });

  it("the costs filter narrows the report to cost sections", () => {
    const { getByRole, container } = render(<ProgressionPage />);
    // The section title is a div; only the filter chip is a button by this name.
    fireEvent.click(getByRole("button", { name: "Zone & tier costs" }));
    expect(container.textContent).toContain("Running entry cost");
  });
});
