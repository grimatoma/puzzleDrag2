// @vitest-environment jsdom
/**
 * WorkerComparison.test.tsx — TDD suite for the Workers "Worker comparison"
 * section.
 *
 * Uses real catalog data via TYPE_WORKERS — no fakes.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { BalanceNavProvider } from "../../balanceNav.jsx";
import { WorkerComparison } from "./WorkerComparison.jsx";
import { TYPE_WORKERS } from "../../../features/workers/data.js";

afterEach(() => cleanup());

function renderTable({ navigate = vi.fn() } = {}) {
  return render(
    <BalanceNavProvider focus={null} navigate={navigate}>
      <WorkerComparison />
    </BalanceNavProvider>,
  );
}

describe("WorkerComparison", () => {
  it("renders the section heading", () => {
    const { container } = renderTable();
    expect(container.querySelector("#worker-comparison")).not.toBeNull();
    expect(container.textContent ?? "").toMatch(/worker comparison/i);
  });

  it("renders one row per worker in TYPE_WORKERS with name + role + base coins", () => {
    const { container } = renderTable();
    const rows = container.querySelectorAll("tbody tr");
    expect(TYPE_WORKERS.length).toBeGreaterThan(0);
    expect(rows.length).toBe(TYPE_WORKERS.length);
    const body = container.textContent ?? "";
    for (const w of TYPE_WORKERS) {
      expect(body).toContain(w.name);
      expect(body).toContain(w.role);
      expect(body).toContain(String(w.hireCost.coins));
    }
  });

  it("clicking a worker row navigates to that worker's article", () => {
    const navigate = vi.fn();
    renderTable({ navigate });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(TYPE_WORKERS.length);
    fireEvent.click(buttons[0]);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: "workers",
        focus: `workers:${TYPE_WORKERS[0].id}`,
      }),
    );
  });
});
