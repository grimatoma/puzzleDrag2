// @vitest-environment jsdom
/**
 * ReachabilityPathModal.test.tsx — the "how is this reachable?" graph popup.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../balanceNav.jsx";
import { ReachabilityPathModal } from "./ReachabilityPathModal.jsx";
import { wikiNavTarget } from "./WikiLinkButton.jsx";

afterEach(() => cleanup());

function renderModal(
  props: Partial<React.ComponentProps<typeof ReachabilityPathModal>> = {},
  navigate = vi.fn(),
) {
  const onClose = props.onClose ?? vi.fn();
  const result = render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <ReachabilityPathModal conceptId="recipes" entityKey="rec_bread" onClose={onClose} {...props} />
    </BalanceNavProvider>,
  );
  return { ...result, onClose, navigate };
}

describe("ReachabilityPathModal", () => {
  it("renders the dependency graph for a recipe with its station and a source", () => {
    renderModal();
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/how/i);
    expect(body).toMatch(/bread/i);
    // The station building node (bakery) and a terminal source (Home) appear.
    expect(body).toMatch(/bakery/i);
    expect(body).toMatch(/home/i);
    // At least one edge-relationship label is drawn.
    expect(body).toMatch(/crafted at|needs|unlocked|travel/i);
  });

  it("closes on backdrop click and on the close button", () => {
    const { onClose } = renderModal();
    fireEvent.click(document.body.querySelector(".wiki-cost-modal-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("navigates to a node's article and closes when a clickable node is clicked", () => {
    const { navigate, onClose } = renderModal();
    // The bakery node is a clickable cross-link button.
    const bakeryBtn = screen.getByTitle("buildings:bakery");
    fireEvent.click(bakeryBtn);
    expect(navigate).toHaveBeenCalledWith(wikiNavTarget("buildings", "bakery"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a graceful message for an un-gated concept (no path)", () => {
    renderModal({ conceptId: "zones", entityKey: "home" });
    expect(document.body.textContent).toMatch(/no reachability data/i);
  });
});
