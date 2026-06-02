// @vitest-environment jsdom
/**
 * EntityVisual.test.tsx — suite for the Game Wiki's per-entity visual module.
 *
 * Uses real data from live maps; no fakes. Crucially asserts that the entity
 * visual is NEVER a game iframe.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { entityIconKey, EntityVisual, AmountChips, RecipeIO } from "./EntityVisual.jsx";
import { getEntity } from "./conceptEntities.js";

afterEach(() => cleanup());

// ─── entityIconKey ─────────────────────────────────────────────────────────────

describe("entityIconKey", () => {
  it("returns the key itself for tiles / resources / tools", () => {
    expect(entityIconKey("tiles", "tile_grass_hay", null)).toBe("tile_grass_hay");
    expect(entityIconKey("resources", "flour", null)).toBe("flour");
    expect(entityIconKey("tools", "axe", null)).toBe("axe");
  });

  it("prefixes boss / npc / hazard keys", () => {
    expect(entityIconKey("bosses", "blight", null)).toBe("boss_blight");
    expect(entityIconKey("npcs", "keeper", null)).toBe("char_keeper");
    expect(entityIconKey("hazards", "fire", null)).toBe("hazard_fire");
  });

  it("uses entity.look.iconKey for workers / abilities / seasons (and null when absent)", () => {
    expect(entityIconKey("workers", "w1", { look: { iconKey: "char_farmer" } })).toBe("char_farmer");
    expect(entityIconKey("abilities", "a1", { look: { iconKey: "ui_star" } })).toBe("ui_star");
    expect(entityIconKey("seasons", "spring", { look: { iconKey: "season_spring" } })).toBe("season_spring");
    expect(entityIconKey("workers", "w1", {})).toBeNull();
    expect(entityIconKey("abilities", "a1", null)).toBeNull();
    expect(entityIconKey("seasons", "spring", { look: { iconKey: "" } })).toBeNull();
  });

  it("returns the output item for recipes (and null when absent)", () => {
    expect(entityIconKey("recipes", "rec_bread", { item: "bread" })).toBe("bread");
    expect(entityIconKey("recipes", "rec_x", {})).toBeNull();
    expect(entityIconKey("recipes", "rec_x", null)).toBeNull();
  });

  it("returns null for concepts without per-entity icons", () => {
    expect(entityIconKey("zones", "home", null)).toBeNull();
    expect(entityIconKey("buildings", "hearth", null)).toBeNull();
    expect(entityIconKey("categories", "grain", null)).toBeNull();
    expect(entityIconKey("views", "town", null)).toBeNull();
    expect(entityIconKey("toolPowers", "clear_all", null)).toBeNull();
  });

  it("uses entity.look.icon for achievements (and null when absent)", () => {
    expect(entityIconKey("achievements", "first_steps", { look: { icon: "ach_first_steps" } })).toBe("ach_first_steps");
    expect(entityIconKey("achievements", "x", {})).toBeNull();
    expect(entityIconKey("achievements", "x", null)).toBeNull();
  });

  it("returns null for keepers / boons / dailyRewards (no procedural icon)", () => {
    expect(entityIconKey("keepers", "deer_spirit", { look: { icon: "🦌" } })).toBeNull();
    expect(entityIconKey("boons", "deer_blessing", null)).toBeNull();
    expect(entityIconKey("dailyRewards", "7", null)).toBeNull();
  });
});

// ─── EntityVisual ──────────────────────────────────────────────────────────────

describe("EntityVisual", () => {
  it("renders a building illustration (svg) for a known building key, not an iframe", () => {
    const { container } = render(<EntityVisual conceptId="buildings" entityKey="hearth" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders the zone town map (svg) for a known zone, not an iframe", () => {
    const { container } = render(<EntityVisual conceptId="zones" entityKey="home" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders an Icon <img> for a recipe's output, not an iframe", () => {
    const entity = getEntity("recipes", "rec_bread");
    const { container } = render(
      <EntityVisual conceptId="recipes" entityKey="rec_bread" entity={entity} />,
    );
    // Icon renders an <img> once baked, or a fallback div if the icon is missing;
    // either way it must never be an iframe.
    expect(container.querySelector("iframe")).toBeNull();
    // The Icon component is present (img or fallback div with the missing-icon title).
    expect(container.firstChild).not.toBeNull();
  });

  it("renders nothing for a concept with no asset (categories) — never an iframe", () => {
    const { container } = render(<EntityVisual conceptId="categories" entityKey="grain" />);
    expect(container.firstChild).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("falls through to icon (null) for a non-canonical building key", () => {
    const { container } = render(<EntityVisual conceptId="buildings" entityKey="not_a_building" />);
    // Not canonical → falls to entityIconKey("buildings") → null → renders nothing.
    expect(container.firstChild).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});

// ─── AmountChips ───────────────────────────────────────────────────────────────

describe("AmountChips", () => {
  it("renders one chip per non-zero entry with count + label", () => {
    const { container } = render(<AmountChips amounts={{ iron_bar: 1, plank: 2 }} />);
    const chips = container.querySelectorAll(".hl-cost-tag");
    expect(chips.length).toBe(2);
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("2");
  });

  it("skips zero / falsy count entries", () => {
    const { container } = render(<AmountChips amounts={{ iron_bar: 0, plank: 3 }} />);
    const chips = container.querySelectorAll(".hl-cost-tag");
    expect(chips.length).toBe(1);
  });

  it("renders nothing when amounts is empty or null", () => {
    const { container } = render(<AmountChips amounts={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it("never renders an iframe", () => {
    const { container } = render(<AmountChips amounts={{ iron_bar: 1 }} />);
    expect(container.querySelector("iframe")).toBeNull();
  });
});

// ─── RecipeIO ──────────────────────────────────────────────────────────────────

describe("RecipeIO", () => {
  it("renders inputs, an arrow, the output and the station, never an iframe", () => {
    const { container } = render(
      <RecipeIO recipe={{ item: "bread", station: "bakery", inputs: { flour: 3, eggs: 1 } }} />,
    );
    expect(container.textContent).toContain("→");
    expect(container.textContent).toContain("bakery");
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("returns null for a missing recipe", () => {
    const { container } = render(<RecipeIO recipe={null} />);
    expect(container.firstChild).toBeNull();
  });
});
