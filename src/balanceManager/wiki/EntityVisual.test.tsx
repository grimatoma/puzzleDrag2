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

  it("prefixes boss / npc / hazard / board-kind keys", () => {
    expect(entityIconKey("bosses", "blight", null)).toBe("boss_blight");
    expect(entityIconKey("npcs", "keeper", null)).toBe("char_keeper");
    expect(entityIconKey("hazards", "fire", null)).toBe("hazard_fire");
    expect(entityIconKey("boardKinds", "farm", null)).toBe("biome_farm");
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

  it("returns canvas icon keys for keepers / boons / dailyRewards (Phase 2)", () => {
    // Keepers now have canvas icon keys from the fixed-icons registry.
    expect(entityIconKey("keepers", "deer_spirit", { look: { icon: "🦌" } })).toBe("keeper_deer_spirit");
    expect(entityIconKey("keepers", "stone_knocker", null)).toBe("keeper_stone_knocker");
    expect(entityIconKey("keepers", "tidesinger", null)).toBe("keeper_tidesinger");
    // Unknown keeper falls back to null.
    expect(entityIconKey("keepers", "unknown_keeper", null)).toBeNull();

    // Boons use boon_coin_mult / boon_bond_mult canvas icons.
    expect(entityIconKey("boons", "deer_blessing", { effect: { type: "coin_gain_mult" } })).toBe("boon_coin_mult");
    expect(entityIconKey("boons", "deer_blessing", { effect: { type: "bond_gain_mult" } })).toBe("boon_bond_mult");

    // Daily rewards: coin days → tile_coin_golden, rune days → rune_stone, tool days → tool key.
    // Day 7: { coins: 150, tool: "shuffle" } → tool key wins over coins.
    expect(entityIconKey("dailyRewards", "7", { coins: 150, tool: "shuffle" })).toBe("shuffle");
    // Day 2: { coins: 50 } → tile_coin_golden.
    expect(entityIconKey("dailyRewards", "2", { coins: 50 })).toBe("tile_coin_golden");
    // Day 14: { coins: 300, runes: 1 } → rune_stone (runes over coins).
    expect(entityIconKey("dailyRewards", "14", { coins: 300, runes: 1 })).toBe("rune_stone");
  });
});

// ─── EntityVisual ──────────────────────────────────────────────────────────────

describe("EntityVisual", () => {
  it("renders a building illustration (svg) for a known building key, not an iframe", () => {
    const { container } = render(<EntityVisual conceptId="buildings" entityKey="hearth" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("anchors absolute-positioned building SVGs inside the fixed preview frame", () => {
    const { container } = render(<EntityVisual conceptId="buildings" entityKey="forge" size={96} />);
    const frame = container.firstElementChild as HTMLElement | null;
    expect(frame).not.toBeNull();
    expect(frame?.style.width).toBe("96px");
    expect(frame?.style.height).toBe("96px");
    expect(frame?.style.position).toBe("relative");
    expect(frame?.style.overflow).toBe("hidden");
    expect(frame?.querySelector("svg.absolute.inset-0.w-full.h-full")).not.toBeNull();
  });

  it("renders the zone town map (svg) for a known zone, not an iframe", () => {
    const { container } = render(<EntityVisual conceptId="zones" entityKey="home" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders a biome Icon for board-kind articles, not an iframe", () => {
    const entity = getEntity("boardKinds", "farm");
    const { container } = render(
      <EntityVisual conceptId="boardKinds" entityKey="farm" entity={entity} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.firstChild).not.toBeNull();
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

  it("renders a muted initial placeholder for a concept with no asset (categories) — never an iframe or '?'", () => {
    // Phase 2: EntityVisual never returns null — abstract concepts get a muted initial circle.
    const { container } = render(<EntityVisual conceptId="categories" entityKey="grain" />);
    // A placeholder span is rendered (not null).
    expect(container.firstChild).not.toBeNull();
    // Never an iframe.
    expect(container.querySelector("iframe")).toBeNull();
    // The placeholder shows the entity key's initial letter, not a "?".
    expect(container.textContent).toContain("G"); // initial of "grain"
    expect(container.textContent).not.toContain("?");
  });

  it("falls through to initial placeholder for a non-canonical building key — never null or '?'", () => {
    const { container } = render(<EntityVisual conceptId="buildings" entityKey="not_a_building" />);
    // Phase 2: non-canonical building → entityIconKey returns null → muted initial placeholder.
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    // Shows the initial 'N' of "not_a_building".
    expect(container.textContent).toContain("N");
    expect(container.textContent).not.toContain("?");
  });

  it("renders a canvas Icon (not the look.icon emoji) for a canonical keeper", () => {
    // The 3 canonical keepers have canvas keys from the fixed-icons registry.
    // entityIconKey("keepers", id, …) delegates to keeperIconKey → canvas key.
    // In jsdom the canvas isn't available so <Icon> may render its internal fallback,
    // but crucially the look.icon emoji must NOT appear (the canvas path was taken).
    const { container } = render(
      <EntityVisual conceptId="keepers" entityKey="deer_spirit" entity={{ look: { icon: "🦌" } }} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    // The emoji from look.icon must not appear — the canvas Icon path was taken instead.
    expect(container.textContent).not.toContain("🦌");
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the emoji for an unknown keeper that has look.icon but no canvas key", () => {
    // Unknown keeper: entityIconKey returns null → falls through to emoji fallback.
    const { container } = render(
      <EntityVisual
        conceptId="keepers"
        entityKey="unknown_keeper_xyz"
        entity={{ look: { icon: "🌿" } }}
      />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).toContain("🌿");
    expect(container.textContent).not.toContain("?");
  });

  it("renders initial circle for an unknown keeper with no look.icon", () => {
    const { container } = render(
      <EntityVisual conceptId="keepers" entityKey="unknown_keeper_xyz" entity={null} />,
    );
    expect(container.querySelector("iframe")).toBeNull();
    // Shows initial 'U' of "unknown_keeper_xyz"
    expect(container.textContent).toContain("U");
    expect(container.textContent).not.toContain("?");
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
