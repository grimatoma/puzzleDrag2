// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import PageKindBadge from "./PageKindBadge.jsx";

afterEach(() => cleanup());

describe("PageKindBadge", () => {
  it("renders the Concept label", () => {
    render(<PageKindBadge kind="concept" />);
    expect(document.body.textContent).toContain("Concept");
  });

  it("renders the Category label", () => {
    render(<PageKindBadge kind="category" />);
    expect(document.body.textContent).toContain("Category");
  });

  it("renders the Instance label", () => {
    render(<PageKindBadge kind="instance" />);
    expect(document.body.textContent).toContain("Instance");
  });
});
