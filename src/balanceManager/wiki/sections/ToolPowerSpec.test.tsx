// @vitest-environment jsdom
/**
 * ToolPowerSpec.test.tsx — TDD suite for the wiki tool-power "Specification" section.
 *
 * Uses real catalog data (config/toolPowers.js):
 *   - clear_row: isTapTarget true, params [rowSpan(default 1)],
 *     defaultBoardAnim { anim: "sweep", ms: 220 }
 *   - reshuffle_board: isTapTarget false, no params (still renders — has desc)
 *   - a no-spec object → renders nothing
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { ToolPowerSpec, hasToolPowerSpec } from "./ToolPowerSpec.jsx";
import { TOOL_POWERS } from "../../../config/toolPowers.js";

afterEach(() => cleanup());

function powerById(id: string) {
  return TOOL_POWERS.find((p) => p.id === id)!;
}

describe("ToolPowerSpec — clear_row (tap-target power)", () => {
  const clearRow = powerById("clear_row");

  it("hasToolPowerSpec is true", () => {
    expect(hasToolPowerSpec(clearRow)).toBe(true);
  });

  it("renders the Specification heading and the real description", () => {
    const { container } = render(<ToolPowerSpec power={clearRow} />);
    const body = container.textContent ?? "";
    expect(container.querySelector("#tool-power-spec")).not.toBeNull();
    expect(body).toMatch(/specification/i);
    expect(body).toContain(clearRow.desc);
  });

  it("renders the tap-target badge as Yes and the board animation", () => {
    const { container } = render(<ToolPowerSpec power={clearRow} />);
    const body = container.textContent ?? "";
    expect(body).toMatch(/tap target\?yes/i);
    // defaultBoardAnim { anim: "sweep", ms: 220 }
    expect(body).toContain("sweep");
    expect(body).toContain("220ms");
  });

  it("renders the param key and default", () => {
    const { container } = render(<ToolPowerSpec power={clearRow} />);
    const body = container.textContent ?? "";
    expect(body).toContain("rowSpan");
    // rowSpan default 1
    expect(body).toContain("1");
  });
});

describe("ToolPowerSpec — reshuffle_board (no params, not tap-target)", () => {
  const reshuffle = powerById("reshuffle_board");

  it("renders Tap target? No and 'No tunable parameters.'", () => {
    const { container } = render(<ToolPowerSpec power={reshuffle} />);
    const body = container.textContent ?? "";
    expect(body).toMatch(/tap target\?no/i);
    expect(body).toMatch(/no tunable parameters/i);
  });
});

describe("ToolPowerSpec — no-spec object", () => {
  it("hasToolPowerSpec is false and renders nothing", () => {
    expect(hasToolPowerSpec({})).toBe(false);
    expect(hasToolPowerSpec(null)).toBe(false);
    const { container } = render(<ToolPowerSpec power={{}} />);
    expect(container.querySelector("#tool-power-spec")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});
