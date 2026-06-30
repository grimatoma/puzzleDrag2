// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import DailyStreakModal from "../features/dailyStreak/index.js";
import type { GameState } from "../types/state";

// Second dead layer of (a): even with the dispatch wired, `state.modal =
// "daily_streak"` rendered nothing until this feature existed. These tests
// prove the modal renders its reward and dismisses via CLOSE_MODAL.
function modalState(): GameState {
  return {
    modal: "daily_streak",
    modalParams: { day: 7, reward: { coins: 150, tool: "shuffle", amount: 1 } },
    dailyStreak: { lastClaimedDate: "2026-01-07", currentDay: 7 },
  } as unknown as GameState;
}

describe("DailyStreakModal", () => {
  afterEach(() => cleanup());

  it("renders the day and reward when modal is daily_streak", () => {
    render(<DailyStreakModal state={modalState()} dispatch={vi.fn()} />);
    expect(screen.getByText("Daily Reward — Day 7")).toBeDefined();
    expect(screen.getByTestId("daily-streak-day").textContent).toContain("7");
    const reward = screen.getByTestId("daily-streak-reward").textContent ?? "";
    expect(reward).toContain("150 coins");
    expect(reward).toContain("shuffle");
  });

  it("dispatches CLOSE_MODAL when Collect is clicked", () => {
    const dispatch = vi.fn();
    render(<DailyStreakModal state={modalState()} dispatch={dispatch} />);
    fireEvent.click(screen.getByText("Collect"));
    expect(dispatch).toHaveBeenCalledWith({ type: "CLOSE_MODAL" });
  });

  // The modal auto-opens on login (LOGIN_TICK), so focus moves programmatically.
  // If focus landed on the Collect button, the browser's :focus-visible heuristic
  // paints an ember ring on the (ember) primary button — the doubled-border bug.
  // Focus must land on the dialog container instead.
  it("moves focus to the dialog container, not the Collect button", () => {
    render(<DailyStreakModal state={modalState()} dispatch={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    expect(document.activeElement).not.toBe(screen.getByText("Collect").closest("button"));
  });

  it("renders nothing when the active modal is not daily_streak", () => {
    const state = { modal: "festivals" } as unknown as GameState;
    const { container } = render(<DailyStreakModal state={state} dispatch={vi.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Daily Reward/)).toBeNull();
  });
});
