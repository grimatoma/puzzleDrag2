// @vitest-environment jsdom
//
// The Dev Panel (`/b/`) is a read-only viewer for the game's effective
// config (Phase 1 of the wiki project). The shared field primitives in
// `src/balanceManager/shared.tsx` are the load-bearing piece: making them
// render static display instead of inputs is what makes all ~20 tabs
// non-editable. These tests lock that invariant in so a later phase can't
// silently reintroduce an editable control or a live `onChange`.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import {
  TextField,
  NumberField,
  TextArea,
  Select,
  ColorField,
} from "../balanceManager/shared.js";

afterEach(() => cleanup());

describe("Dev Panel field primitives are read-only", () => {
  it("TextField renders its value as text, not an <input>", () => {
    const onChange = vi.fn();
    const { container } = render(<TextField value="bread loaf" onChange={onChange} />);
    expect(screen.getByText("bread loaf")).toBeDefined();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("NumberField renders its value as text, not a number <input>", () => {
    const { container } = render(<NumberField value={42} />);
    expect(screen.getByText("42")).toBeDefined();
    expect(container.querySelector("input")).toBeNull();
  });

  it("TextArea renders its value as text, not a <textarea>", () => {
    const { container } = render(<TextArea value="multi\nline" />);
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });

  it("Select renders the matching option label as text, not a <select>", () => {
    const options = [
      { value: "a", label: "Apple" },
      { value: "b", label: "Banana" },
    ];
    const { container } = render(<Select value="b" options={options} />);
    expect(screen.getByText("Banana")).toBeDefined();
    expect(container.querySelector("select")).toBeNull();
  });

  it("ColorField renders a swatch + hex, not a color <input>", () => {
    const { container } = render(<ColorField value={0xd6612a} />);
    expect(screen.getByText("#D6612A")).toBeDefined();
    expect(container.querySelector("input")).toBeNull();
  });

  it("the whole field set renders zero editable controls", () => {
    const options = [{ value: "x", label: "Ex" }];
    const { container } = render(
      <div>
        <TextField value="t" />
        <NumberField value={1} />
        <TextArea value="ta" />
        <Select value="x" options={options} />
        <ColorField value={0} />
      </div>,
    );
    expect(container.querySelectorAll("input, select, textarea").length).toBe(0);
  });
});
