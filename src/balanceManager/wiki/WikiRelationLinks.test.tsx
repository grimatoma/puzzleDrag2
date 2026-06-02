// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { WikiRelationLinks } from "./WikiRelationLinks.jsx";
import type { WikiLink } from "../relations.js";

afterEach(() => cleanup());

const LINKS: WikiLink[] = [
  { conceptId: "abilities", key: "grant_tool", label: "Grant Tool" },
  { conceptId: "recipes", key: "rec_bread", label: "Bread" },
];

describe("WikiRelationLinks", () => {
  it("renders plain text links without concept cards", () => {
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <WikiRelationLinks links={LINKS} />
      </BalanceNavProvider>,
    );
    expect(container.querySelectorAll(".wiki-relation-link").length).toBe(2);
    expect(container.querySelector(".wiki-concept-ref-card")).toBeNull();
  });
});
