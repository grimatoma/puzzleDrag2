import { describe, it, expect } from "vitest";
import { parseHash, buildHash, routeFromState } from "../router.js";
import { gameReducer, initialState } from "../state.js";

describe("router.parseHash", () => {
  it("returns the default route for an empty hash", () => {
    expect(parseHash("")).toEqual({ view: "town", modal: null, viewParams: {}, modalParams: {} });
    expect(parseHash("#")).toEqual({ view: "town", modal: null, viewParams: {}, modalParams: {} });
    expect(parseHash("#/")).toEqual({ view: "town", modal: null, viewParams: {}, modalParams: {} });
  });

  it("parses a known view", () => {
    expect(parseHash("#/inventory")).toEqual({
      view: "inventory",
      modal: null,
      viewParams: {},
      modalParams: {},
    });
  });

  it("falls back to town for an unknown view", () => {
    expect(parseHash("#/notARealView").view).toBe("town");
  });

  it("expands the tiles alias to tileCollection", () => {
    expect(parseHash("#/tiles").view).toBe("tileCollection");
  });

  it("captures tile-wiki sub and category segments", () => {
    expect(parseHash("#/tiles/farm/grass")).toEqual({
      view: "tileCollection",
      modal: null,
      viewParams: { sub: "farm", cat: "grass" },
      modalParams: {},
    });
  });

  it("captures the crafting tab", () => {
    expect(parseHash("#/crafting/tools")).toEqual({
      view: "crafting",
      modal: null,
      viewParams: { tab: "tools" },
      modalParams: {},
    });
  });

  it("parses a modal query", () => {
    expect(parseHash("#/town?modal=menu")).toEqual({
      view: "town",
      modal: "menu",
      viewParams: {},
      modalParams: {},
    });
  });

  it("parses a modal with a settings sub-tab", () => {
    expect(parseHash("#/town?modal=menu&tab=settings")).toEqual({
      view: "town",
      modal: "menu",
      viewParams: {},
      modalParams: { tab: "settings" },
    });
  });

  it("ignores unknown modals", () => {
    expect(parseHash("#/town?modal=phony").modal).toBe(null);
  });
});

describe("router.buildHash", () => {
  it("emits a default hash for an empty descriptor", () => {
    expect(buildHash({})).toBe("#/town");
  });

  it("encodes view + view params for the tile wiki", () => {
    expect(buildHash({ view: "tileCollection", viewParams: { sub: "farm", cat: "grass" } }))
      .toBe("#/tiles/farm/grass");
  });

  it("only emits the cat segment when sub is also present", () => {
    expect(buildHash({ view: "tileCollection", viewParams: { cat: "grass" } }))
      .toBe("#/tiles");
  });

  it("encodes modal queries with sub-tab", () => {
    expect(buildHash({ view: "town", modal: "menu", modalParams: { tab: "about" } }))
      .toBe("#/town?modal=menu&tab=about");
  });

  it("round-trips via parseHash for the supported shapes", () => {
    const cases = [
      { view: "town", modal: null, viewParams: {}, modalParams: {} },
      { view: "inventory", modal: null, viewParams: {}, modalParams: {} },
      { view: "crafting", modal: null, viewParams: { tab: "tools" }, modalParams: {} },
      { view: "tileCollection", modal: null, viewParams: { sub: "mine", cat: "mine_stone" }, modalParams: {} },
      { view: "town", modal: "menu", viewParams: {}, modalParams: { tab: "settings" } },
      { view: "board", modal: "boss", viewParams: {}, modalParams: {} },
    ];
    for (const route of cases) {
      expect(parseHash(buildHash(route))).toEqual(route);
    }
  });
});

describe("router.routeFromState", () => {
  it("projects view + craftingTab onto the route", () => {
    const state = { view: "crafting", modal: null, craftingTab: "tools", viewParams: {} };
    expect(routeFromState(state)).toEqual({
      view: "crafting",
      modal: null,
      viewParams: { tab: "tools" },
      modalParams: {},
    });
  });

  it("projects tile-wiki viewParams", () => {
    const state = { view: "tileCollection", modal: null, viewParams: { sub: "fish", cat: "fish" } };
    expect(routeFromState(state)).toEqual({
      view: "tileCollection",
      modal: null,
      viewParams: { sub: "fish", cat: "fish" },
      modalParams: {},
    });
  });

  it("projects settingsTab as modalParams.tab when modal is menu", () => {
    const state = { view: "town", modal: "menu", settingsTab: "about", viewParams: {} };
    expect(routeFromState(state)).toEqual({
      view: "town",
      modal: "menu",
      viewParams: {},
      modalParams: { tab: "about" },
    });
  });

  it("omits settingsTab=main from modalParams (default tab is unhashed)", () => {
    const state = { view: "town", modal: "menu", settingsTab: "main", viewParams: {} };
    expect(routeFromState(state).modalParams).toEqual({});
  });
});

describe("ROUTE/APPLY reducer integration", () => {
  // Mark tutorial seen so the tutorial slice doesn't auto-start a modal on the
  // first dispatch and overwrite our route-driven modal field.
  const seenTutorial = (s) => ({ ...s, tutorial: { ...s.tutorial, seen: true } });

  it("sets view and clears modal", () => {
    const s0 = seenTutorial(initialState());
    const s1 = gameReducer(s0, {
      type: "ROUTE/APPLY",
      route: { view: "inventory", modal: null, viewParams: {}, modalParams: {} },
    });
    expect(s1.view).toBe("inventory");
    expect(s1.modal).toBe(null);
  });

  it("sets crafting tab from viewParams", () => {
    const s0 = seenTutorial(initialState());
    const s1 = gameReducer(s0, {
      type: "ROUTE/APPLY",
      route: { view: "crafting", modal: null, viewParams: { tab: "tools" }, modalParams: {} },
    });
    expect(s1.view).toBe("crafting");
    expect(s1.craftingTab).toBe("tools");
  });

  it("opens menu modal with a settings sub-tab", () => {
    const s0 = seenTutorial(initialState());
    const s1 = gameReducer(s0, {
      type: "ROUTE/APPLY",
      route: { view: "town", modal: "menu", viewParams: {}, modalParams: { tab: "about" } },
    });
    expect(s1.modal).toBe("menu");
    expect(s1.settingsTab).toBe("about");
  });

  it("stores tile-wiki sub-route in viewParams", () => {
    const s0 = seenTutorial(initialState());
    const s1 = gameReducer(s0, {
      type: "ROUTE/APPLY",
      route: { view: "tileCollection", modal: null, viewParams: { sub: "mine", cat: "mine_gem" }, modalParams: {} },
    });
    expect(s1.view).toBe("tileCollection");
    expect(s1.viewParams).toEqual({ sub: "mine", cat: "mine_gem" });
  });
});

describe("SET_VIEW_PARAMS reducer", () => {
  // Tutorial slice auto-opens a modal on first dispatch when unseen — out of
  // scope for these reducer tests, so mark it seen.
  const baseState = () => {
    const s = initialState();
    return { ...s, tutorial: { ...s.tutorial, seen: true } };
  };

  it("merges new params into existing viewParams", () => {
    const s0 = baseState();
    const s1 = gameReducer(s0, { type: "SET_VIEW_PARAMS", params: { sub: "farm" } });
    expect(s1.viewParams).toMatchObject({ sub: "farm" });
    const s2 = gameReducer(s1, { type: "SET_VIEW_PARAMS", params: { cat: "grass" } });
    expect(s2.viewParams).toMatchObject({ sub: "farm", cat: "grass" });
  });

  it("supports clearing a param by passing null", () => {
    const s0 = { ...baseState(), viewParams: { sub: "farm", cat: "grass" } };
    const s1 = gameReducer(s0, { type: "SET_VIEW_PARAMS", params: { cat: null } });
    expect(s1.viewParams.sub).toBe("farm");
    expect(s1.viewParams.cat).toBe(null);
  });
});

describe("SET_VIEW resets viewParams between distinct views", () => {
  const baseState = () => {
    const s = initialState();
    return { ...s, tutorial: { ...s.tutorial, seen: true } };
  };

  it("clears viewParams when the view changes", () => {
    const s0 = { ...baseState(), view: "tileCollection", viewParams: { sub: "farm", cat: "grass" } };
    const s1 = gameReducer(s0, { type: "SET_VIEW", view: "inventory" });
    expect(s1.view).toBe("inventory");
    expect(s1.viewParams).toEqual({});
  });

  it("preserves viewParams when staying on the same view", () => {
    const s0 = { ...baseState(), view: "tileCollection", viewParams: { sub: "farm", cat: "grass" } };
    const s1 = gameReducer(s0, { type: "SET_VIEW", view: "tileCollection" });
    expect(s1.viewParams).toEqual({ sub: "farm", cat: "grass" });
  });
});
