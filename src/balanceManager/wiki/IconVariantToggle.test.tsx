// @vitest-environment jsdom
/**
 * IconVariantToggle.test.tsx — Unit tests for the Canvas ⇄ Pixel art switch.
 *
 * Verifies:
 *  1. Both options render with their labels.
 *  2. The active option is marked aria-pressed; the other is not.
 *  3. Clicking an option invokes onChange with that variant.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { IconVariantToggle } from "./IconVariantToggle.jsx";

afterEach(() => cleanup());

describe("IconVariantToggle", () => {
  it("renders both Canvas and Pixel art options", () => {
    render(<IconVariantToggle value="canvas" onChange={() => {}} />);
    expect(document.body.textContent).toContain("Canvas");
    expect(document.body.textContent).toContain("Pixel art");
  });

  it("marks the selected variant as aria-pressed", () => {
    const { getByText } = render(<IconVariantToggle value="pixel" onChange={() => {}} />);
    expect(getByText("Pixel art").getAttribute("aria-pressed")).toBe("true");
    expect(getByText("Canvas").getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with the clicked variant", () => {
    const onChange = vi.fn();
    const { getByText } = render(<IconVariantToggle value="canvas" onChange={onChange} />);
    fireEvent.click(getByText("Pixel art"));
    expect(onChange).toHaveBeenCalledWith("pixel");
  });
});
