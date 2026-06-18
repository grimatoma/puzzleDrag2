// "The hearth kept burning while you were away" re-entry reward. This is a
// PURELY PRESENTATIONAL modal — the offline Warmth was already settled by the
// mount tick (EMBERGARDEN/TICK in prototype.tsx); this just surfaces how much
// accrued. It holds no redux state and persists nothing, so it never touches
// the save shape. prototype.tsx computes the figure once at mount and renders
// this when the player was away long enough to matter.
//
// Named WelcomeBack.tsx (not index.tsx) on purpose: the feature glob only picks
// up `index.{jsx,tsx}`, so this stays out of KNOWN_MODALS / deep links.

import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";

function fmtWarmth(n: number): string {
  return Math.floor(n).toLocaleString();
}

function fmtAway(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(sec)}s`;
}

export interface WelcomeBackInfo {
  gained: number;
  awaySec: number;
  capped: boolean;
}

interface WelcomeBackProps {
  info: WelcomeBackInfo;
  onClose: () => void;
  onView: () => void;
}

export default function WelcomeBack({ info, onClose, onView }: WelcomeBackProps) {
  return (
    <ParchmentDialog open onClose={onClose} size="sm" tone="parchment">
      <ParchmentDialog.Title>
        <span className="flex flex-col items-center text-center gap-1">
          <span className="uppercase tracking-[0.2em] text-micro text-ink-light font-semibold">Welcome back</span>
          <span className="block text-h2 font-bold text-ink">🔥 The hearth kept burning</span>
        </span>
      </ParchmentDialog.Title>
      <ParchmentDialog.Body className="flex flex-col items-center gap-2 text-center">
        <div className="text-body text-ink-light">
          {`You were away ${fmtAway(info.awaySec)}. Your settlement banked:`}
        </div>
        <div className="text-h1 font-bold tabular-nums text-ember leading-none">
          {`+${fmtWarmth(info.gained)} Warmth`}
        </div>
        {info.capped ? (
          <div className="text-micro text-ink-light italic">
            (capped at 8 hours of production — visit more often to lose nothing)
          </div>
        ) : null}
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="iron" size="md" variant="soft" onClick={onClose}>Stay</Button>
        <Button tone="ember" size="md" onClick={onView}>Tend the hearth</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
