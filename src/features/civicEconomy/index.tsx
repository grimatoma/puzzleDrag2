import { useEffect, useState } from "react";
import Button from "../../ui/primitives/Button.jsx";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import type { Dispatch, GameState } from "../../types/state";
import { getItem } from "../../constants.js";
import {
  civicClaimReady,
  mostProgressedZone,
  msUntilNextClaim,
  provisionsRoster,
  taxYield,
} from "./data.js";

export const modalKey = "town_hall";

function fmtCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function toolLabel(toolId: string): string {
  return (getItem(toolId)?.label as string | undefined) ?? toolId;
}

export default function TownHallModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  // Re-render every second so the cooldown countdown stays live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (state.modal !== "town_hall") return null;
  const close = () => dispatch({ type: "CLOSE_MODAL" });

  const ready = civicClaimReady(state, now);
  const remaining = msUntilNextClaim(state, now);
  const tax = taxYield(state);
  const roster = provisionsRoster(state);
  const rosterEntries = Object.entries(roster);
  const homeZone = mostProgressedZone(state);
  const pending = state.civicEconomy?.pendingProvisions ?? {};
  const hasPending = Object.keys(pending).length > 0;

  const claim = () => dispatch({ type: "CIVIC/CLAIM", payload: { now: Date.now() } });

  return (
    <ParchmentDialog open onClose={close} size="sm">
      <ParchmentDialog.Title>🏛 Town Hall</ParchmentDialog.Title>
      <ParchmentDialog.Body>
        <p className="text-body text-ink-mid">
          Your settlements pay tithes and provisions on a schedule. Collect what's owed.
        </p>

        <div className="mt-3 rounded-xl border-2 border-[color:var(--iron)] bg-[color:var(--cream)] p-3">
          <div className="hl-section-label">Tax (all settlements)</div>
          <div className="text-[15px] font-bold" style={{ color: "#5a3a20" }} data-testid="civic-tax">
            +{tax} coins
          </div>
        </div>

        <div className="mt-2 rounded-xl border-2 border-[color:var(--iron)] bg-[color:var(--cream)] p-3">
          <div className="hl-section-label">Provisions (most-progressed town)</div>
          {rosterEntries.length === 0 ? (
            <div className="text-[12px] italic" style={{ color: "var(--ink-soft)" }} data-testid="civic-provisions-empty">
              Build a workshop, mill, or forge in your strongest town to earn free tools.
            </div>
          ) : (
            <ul className="text-body text-ink-mid" data-testid="civic-provisions">
              {rosterEntries.map(([tool, amount]) => (
                <li key={tool}>+{amount} {toolLabel(tool)}</li>
              ))}
            </ul>
          )}
          <div className="mt-1 text-[11px] italic" style={{ color: "var(--ink-soft)" }}>
            Provisions arrive as a care-package crate on your next board — match it to claim.
          </div>
        </div>

        {hasPending ? (
          <p className="mt-2 text-[12px] font-bold" style={{ color: "var(--flame-frame)" }} data-testid="civic-pending">
            📦 A care package is waiting on your board!
          </p>
        ) : null}

        <p className="mt-2 text-[11px] italic" style={{ color: "var(--ink-soft)" }}>
          Strongest town: {homeZone}
        </p>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={ready ? claim : undefined} disabled={!ready} data-testid="civic-claim">
          {ready ? "Collect" : `Next in ${fmtCountdown(remaining)}`}
        </Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
