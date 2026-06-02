// @vitest-environment jsdom
/**
 * KeeperEncounter.test.tsx — TDD suite for the wiki keeper-encounter section.
 *
 * Uses real catalog data. `deer_spirit` (the farm keeper) offers Coexist
 * (+5 Embers) and Drive Out (+5 Core Ingots), so it exercises both outcome
 * cards and their reward numbers.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { KeeperEncounter, hasKeeperEncounter } from "./KeeperEncounter.jsx";
import { getEntity } from "../conceptEntities.js";

afterEach(() => cleanup());

function keeper(id: string) {
  const k = getEntity("keepers", id);
  if (k == null) throw new Error(`keeper ${id} not found`);
  return k as React.ComponentProps<typeof KeeperEncounter>["keeper"];
}

describe("KeeperEncounter — real keeper (deer_spirit)", () => {
  it("renders the heading and the keeper title + appears-after", () => {
    render(<KeeperEncounter keeper={keeper("deer_spirit")} />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Keeper encounter");
    expect(body).toMatch(/Keeper of Field & Herd/i);
    expect(body).toMatch(/Appears after/i);
    expect(body).toContain("4");
  });

  it("renders the Coexist card with the Embers reward", () => {
    render(<KeeperEncounter keeper={keeper("deer_spirit")} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/coexist/i);
    expect(body).toMatch(/Embers/);
    expect(body).toContain("+5");
  });

  it("renders the Drive Out card with the Core Ingots reward", () => {
    render(<KeeperEncounter keeper={keeper("deer_spirit")} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/drive out/i);
    expect(body).toMatch(/Core Ingots/);
  });
});

describe("hasKeeperEncounter", () => {
  it("is true for a keeper with outcomes", () => {
    expect(hasKeeperEncounter(keeper("deer_spirit"))).toBe(true);
  });
  it("is false for null / empty", () => {
    expect(hasKeeperEncounter(null)).toBe(false);
    expect(hasKeeperEncounter({})).toBe(false);
  });
});
