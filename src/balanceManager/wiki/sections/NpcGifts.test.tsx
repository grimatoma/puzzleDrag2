// @vitest-environment jsdom
/**
 * NpcGifts.test.tsx — TDD suite for the wiki NPC gift-preferences section.
 *
 * Uses real catalog data. `mira` loves [flour, bread] and likes [honey, jam];
 * a synthetic NPC id with no NPC_DATA entry renders nothing.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { NpcGifts, hasNpcGifts } from "./NpcGifts.jsx";

afterEach(() => cleanup());

function renderNpc(npcId: string, navigate = vi.fn()) {
  const r = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <NpcGifts npcId={npcId} />
    </BalanceNavProvider>,
  );
  return { ...r, navigate };
}

describe("NpcGifts — NPC with gift preferences (mira)", () => {
  it("renders the Gift preferences heading with Loves and Likes rows", () => {
    renderNpc("mira");
    const body = document.body.textContent ?? "";
    expect(body).toContain("Gift preferences");
    expect(body).toMatch(/loves/i);
    expect(body).toMatch(/likes/i);
  });

  it("renders the loved + liked item labels", () => {
    renderNpc("mira");
    const body = document.body.textContent ?? "";
    // mira loves flour + bread, likes honey + jam
    expect(body).toMatch(/flour/i);
    expect(body).toMatch(/bread/i);
    expect(body).toMatch(/honey/i);
    expect(body).toMatch(/jam/i);
  });

  it("renders navigable gift chips that navigate via wikiNavTarget", () => {
    const { navigate } = renderNpc("mira");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const arg = navigate.mock.calls[0][0] as { tab: string; focus: string };
    expect(arg.focus).toMatch(/^[a-zA-Z_]+:.+/);
    expect(arg.tab).toBe(arg.focus.slice(0, arg.focus.indexOf(":")));
  });
});

describe("NpcGifts — NPC with no preferences", () => {
  it("renders nothing for an unknown NPC id", () => {
    const { container } = renderNpc("nobody_unknown_npc");
    expect(hasNpcGifts("nobody_unknown_npc")).toBe(false);
    expect(container.querySelector("#npc-gifts")).toBeNull();
    expect((container.textContent ?? "").trim()).toBe("");
  });
});

describe("hasNpcGifts", () => {
  it("is true for an NPC with loves/likes", () => {
    expect(hasNpcGifts("mira")).toBe(true);
  });
});
