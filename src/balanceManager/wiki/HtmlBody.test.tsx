// @vitest-environment jsdom
/**
 * HtmlBody.test.tsx — TDD suite for HtmlBody, WikiLinkButton, GameScreenEmbed.
 *
 * Written BEFORE the implementation (TDD-first). All tests should fail until
 * the implementation files are created.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import HtmlBody, { slugify } from "./HtmlBody.jsx";

afterEach(() => cleanup());

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderHtml(html: string, navigate = vi.fn()) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <HtmlBody source={html} />
    </BalanceNavProvider>,
  );
}

// ─── slugify ─────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips non-alphanumeric characters", () => {
    // Runs of non-alphanumeric characters collapse to a single hyphen.
    expect(slugify("A & B: (test)")).toBe("a-b-test");
  });

  it("empty string returns empty string", () => {
    expect(slugify("")).toBe("");
  });
});

// ─── Heading rendering (slugified id) ────────────────────────────────────────

describe("HtmlBody — headings", () => {
  it("renders h2 text and assigns a slugified id", () => {
    const { container } = renderHtml("<h2>Hello</h2>");
    const h2 = container.querySelector("h2");
    expect(h2).not.toBeNull();
    expect(h2!.textContent).toBe("Hello");
    expect(h2!.id).toBe("hello");
  });

  it("renders h1 with slugified id", () => {
    const { container } = renderHtml("<h1>My Heading</h1>");
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.id).toBe("my-heading");
  });

  it("renders h3 with slugified id", () => {
    const { container } = renderHtml("<h3>Sub Section</h3>");
    const h3 = container.querySelector("h3");
    expect(h3).not.toBeNull();
    expect(h3!.id).toBe("sub-section");
  });
});

// ─── data-wiki anchor → WikiLinkButton ───────────────────────────────────────

describe("HtmlBody — data-wiki anchor", () => {
  it("renders a button for a resolvable data-wiki anchor", () => {
    const navigate = vi.fn();
    renderHtml('<a data-wiki="buildings:bakery">Bakery</a>', navigate);

    // Should render a button (RefButton) with the display text
    const btn = screen.getByRole("button", { name: /Bakery/i });
    expect(btn).toBeDefined();
  });

  it("clicking the data-wiki button calls navigate with the concept tab and correct focus", () => {
    const navigate = vi.fn();
    renderHtml('<a data-wiki="buildings:bakery">Bakery</a>', navigate);

    const btn = screen.getByRole("button", { name: /Bakery/i });
    fireEvent.click(btn);

    // Phase-5 contract (wikiNavTarget): each concept routes to its OWN tab.
    expect(navigate).toHaveBeenCalledWith({
      tab: "buildings",
      focus: "buildings:bakery",
    });
  });

  it("unresolvable data-wiki target renders inert text, not a button", () => {
    renderHtml('<a data-wiki="totally_unknown_xyz_concept:no_key">Ghost</a>');
    // Should not throw and should not render a button
    expect(screen.queryByRole("button", { name: /Ghost/i })).toBeNull();
    // Should render the text somewhere as a span
    expect(screen.getByText("Ghost")).toBeDefined();
  });
});

// ─── [[wikilink]] text parsing → WikiLinkButton ───────────────────────────────

describe("HtmlBody — wikilink text expansion", () => {
  it("renders a WikiLinkButton for a resolvable bare key in double-brackets", () => {
    // "bread" is a real resource key
    renderHtml("<p>Bake [[bread]] daily.</p>");

    // The text "bread" should appear as a button
    const btn = screen.getByRole("button", { name: /bread/i });
    expect(btn).toBeDefined();
  });

  it("renders surrounding text alongside the wikilink button", () => {
    renderHtml("<p>Bake [[bread]] daily.</p>");

    // "Bake" and "daily." should be plain text
    expect(screen.getByText(/Bake/)).toBeDefined();
    expect(screen.getByText(/daily\./)).toBeDefined();
  });

  it("renders [[buildings:bakery|Bakery]] with display text as button", () => {
    renderHtml("<p>Visit [[buildings:bakery|Bakery]] now.</p>");
    const btn = screen.getByRole("button", { name: /Bakery/i });
    expect(btn).toBeDefined();
  });
});

// ─── data-game-visual → GameScreenEmbed (static screenshot) ──────────────────

describe("HtmlBody — data-game-visual embed", () => {
  it("renders a static image (not an iframe) for a data-game-visual div", () => {
    const { container } = renderHtml(
      '<div data-game-visual="board-farm-idle">fallback text</div>',
    );
    expect(container.querySelector("iframe")).toBeNull();
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("alt")).toContain("board-farm-idle");
  });

  it("does NOT render the children of data-game-visual (replaced by embed)", () => {
    renderHtml('<div data-game-visual="board-farm-idle">fallback text</div>');
    expect(screen.queryByText("fallback text")).toBeNull();
  });

  it("image has lazy loading attribute", () => {
    const { container } = renderHtml(
      '<div data-game-visual="board-farm-idle"></div>',
    );
    const img = container.querySelector("img");
    expect(img!.getAttribute("loading")).toBe("lazy");
  });

  it("renders nothing for a data-game-visual id with no bundled screenshot", () => {
    const { container } = renderHtml(
      '<div data-game-visual="no-such-scenario">fallback text</div>',
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByText("fallback text")).toBeNull();
  });
});

// ─── data-wiki-tier-ladder → live TierLadderTable ────────────────────────────

describe("HtmlBody — data-wiki-tier-ladder embed", () => {
  it("renders a live table of the home zone's tier ladder (rung names from code)", () => {
    const { container } = renderHtml('<div data-wiki-tier-ladder="home"></div>');
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    // The 6-rung home ladder Camp→Manor is read live from ZONES; the prose
    // never types these names, so they prove the embed pulls from code.
    expect(container.textContent).toContain("Camp");
    expect(container.textContent).toContain("Manor");
  });

  it("ignores children and shows a note for an unknown zone id", () => {
    const { container } = renderHtml(
      '<div data-wiki-tier-ladder="not_a_zone">fallback</div>',
    );
    expect(screen.queryByText("fallback")).toBeNull();
    expect(container.textContent).toMatch(/Unknown zone/i);
  });
});

// ─── data-wiki-fact → live WikiFact scalar ───────────────────────────────────

describe("HtmlBody — data-wiki-fact embed", () => {
  it("renders the live rung count for the home zone", () => {
    // home has a 6-rung ladder in code; the fact must read it live, not "3".
    const { container } = renderHtml(
      '<span data-wiki-fact="zone.home.rungCount"></span>',
    );
    expect(container.textContent).toBe("6");
  });

  it("renders a visible marker (not a crash) for an unknown fact key", () => {
    const { container } = renderHtml(
      '<span data-wiki-fact="zone.home.bogus"></span>',
    );
    expect(container.textContent).toContain("zone.home.bogus");
  });
});

// ─── Security: script/style stripping ────────────────────────────────────────

describe("HtmlBody — security stripping", () => {
  it("does NOT render script elements", () => {
    const { container } = renderHtml("<script>alert(1)</script><p>Safe</p>");
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByText("alert(1)")).toBeNull();
  });

  it("does NOT render style elements", () => {
    const { container } = renderHtml(
      "<style>body { color: red; }</style><p>Safe</p>",
    );
    expect(container.querySelector("style")).toBeNull();
  });

  it("drops on* attribute handlers from elements", () => {
    const { container } = renderHtml(
      '<p onclick="alert(1)">Click me</p>',
    );
    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    // onclick should not be present as an attribute on the rendered element
    expect(p!.getAttribute("onclick")).toBeNull();
  });
});

// ─── Plain HTML passthrough ───────────────────────────────────────────────────

describe("HtmlBody — plain markup passthrough", () => {
  it("renders a ul with li children", () => {
    const { container } = renderHtml("<ul><li>one</li><li>two</li></ul>");
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("one");
    expect(items[1].textContent).toBe("two");
  });

  it("renders a paragraph with plain text", () => {
    renderHtml("<p>Hello world</p>");
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders strong and em elements", () => {
    const { container } = renderHtml("<p><strong>Bold</strong> and <em>italic</em></p>");
    expect(container.querySelector("strong")?.textContent).toBe("Bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
  });

  it("wraps output in a div.wiki-html container", () => {
    const { container } = renderHtml("<p>test</p>");
    expect(container.querySelector("div.wiki-html")).not.toBeNull();
  });

  it("passes through class attribute (as className in React)", () => {
    const { container } = renderHtml('<p class="note">noted</p>');
    const p = container.querySelector("p.note");
    expect(p).not.toBeNull();
  });

  it("renders inline style strings as element styles", () => {
    const { container } = renderHtml('<p style="color: red; font-size: 12px">styled</p>');
    const p = container.querySelector("p");
    expect(p!.style.color).toBe("red");
    expect(p!.style.fontSize).toBe("12px");
  });
});

// ─── SVG passthrough ──────────────────────────────────────────────────────────

describe("HtmlBody — SVG passthrough", () => {
  it("renders an SVG element via dangerouslySetInnerHTML", () => {
    const { container } = renderHtml(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle r="5"/></svg>',
    );
    // Should appear inside a <span> wrapper
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    // The svg should exist inside the container
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("strips <script> inside SVG but preserves other SVG children", () => {
    const { container } = renderHtml(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>',
    );
    // The SVG span wrapper should still be rendered
    expect(container.querySelector("span")).not.toBeNull();
    // No <script> should survive inside the rendered output
    expect(container.querySelector("script")).toBeNull();
    // The raw text "alert(1)" must not appear anywhere in the output
    expect(container.innerHTML).not.toContain("alert(1)");
    // The <circle> element should be preserved
    expect(container.querySelector("circle")).not.toBeNull();
  });
});

// ─── Security: javascript:/vbscript: URL blocking ────────────────────────────

describe("HtmlBody — javascript:/vbscript: URL blocking", () => {
  it("strips javascript: href from anchor elements", () => {
    const { container } = renderHtml('<a href="javascript:alert(1)">x</a>');
    const a = container.querySelector("a");
    expect(a).not.toBeNull();
    // The href must either be absent or not start with javascript:
    const href = a!.getAttribute("href");
    expect(href === null || !href.toLowerCase().startsWith("javascript:")).toBe(true);
  });

  it("strips vbscript: href from anchor elements", () => {
    const { container } = renderHtml('<a href="vbscript:MsgBox(1)">x</a>');
    const a = container.querySelector("a");
    expect(a).not.toBeNull();
    const href = a!.getAttribute("href");
    expect(href === null || !href.toLowerCase().startsWith("vbscript:")).toBe(true);
  });

  it("preserves a normal https: href on anchor elements", () => {
    const { container } = renderHtml('<a href="https://example.com">link</a>');
    const a = container.querySelector("a");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe("https://example.com");
  });
});

// ─── Empty source ─────────────────────────────────────────────────────────────

describe("HtmlBody — edge cases", () => {
  it("renders without crashing on empty source", () => {
    const { container } = renderHtml("");
    expect(container.querySelector("div.wiki-html")).not.toBeNull();
  });

  it("renders without crashing on whitespace-only source", () => {
    expect(() => renderHtml("   ")).not.toThrow();
  });
});
