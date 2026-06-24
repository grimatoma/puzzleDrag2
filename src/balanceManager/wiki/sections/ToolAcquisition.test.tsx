// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { ToolAcquisition, hasToolAcquisition, toolAcquisitionRows } from "./ToolAcquisition.jsx";

afterEach(() => cleanup());

describe("ToolAcquisition", () => {
  it("always offers the section for a tool article", () => {
    expect(hasToolAcquisition("bomb")).toBe(true);
  });

  it("surfaces the building that generates the bomb", () => {
    const rows = toolAcquisitionRows("bomb");
    // Powder Store grants bomb (season) and provisions it via the Town Hall.
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.key.startsWith("grant:") || r.key.startsWith("civic:"))).toBe(true);

    render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <ToolAcquisition toolId="bomb" />
      </BalanceNavProvider>,
    );
    expect(document.body.textContent ?? "").toMatch(/how to get it/i);
  });

  it("lists a craft station for a crafted tool (axe)", () => {
    const rows = toolAcquisitionRows("axe");
    expect(rows.some((r) => r.key.startsWith("craft:"))).toBe(true);
  });
});
