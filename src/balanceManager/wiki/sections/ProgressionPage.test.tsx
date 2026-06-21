// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import ProgressionPage from "./ProgressionPage.js";

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
