// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { resolveConceptId, ConceptRefForKey, formatFieldRefValue } from "./refs.js";

afterEach(() => cleanup());

describe("resolveConceptId", () => {
  it("resolves station field to buildings", () => {
    expect(resolveConceptId("bakery", { fieldName: "station" })).toBe("buildings");
  });

  it("resolves rec_bread as a recipe", () => {
    expect(resolveConceptId("rec_bread")).toBe("recipes");
  });
});

describe("ConceptRefForKey", () => {
  it("renders inline widget for flour", () => {
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        <ConceptRefForKey entityKey="flour" variant="inline" />
      </BalanceNavProvider>,
    );
    expect(container.querySelector(".wiki-concept-ref-inline")).not.toBeNull();
  });
});

describe("formatFieldRefValue", () => {
  it("returns inline ref for station string", () => {
    const node = formatFieldRefValue("station", "bakery");
    const { container } = render(
      <BalanceNavProvider focus={null} navigate={() => {}}>
        {node}
      </BalanceNavProvider>,
    );
    expect(container.querySelector(".wiki-concept-ref-inline")).not.toBeNull();
  });
});
