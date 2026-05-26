import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SEASONS } from "../constants.js";
import { seasonIndexInSession } from "../features/zones/data.js";
import type { GameState } from "../types/state.js";

const HOLD_MS = 1100;

interface ShownState { seasonIdx: number; key: number }

export default function SeasonCinematic({ state }: { state: GameState }) {
  const onBoard = state.view === "board";
  // farmRun.turnBudget is a dynamic field outside the canonical FarmRun shape.
  const turnBudget = (state.farmRun?.turnBudget as number | undefined) ?? 0;
  const turnsUsed = state.turnsUsed ?? 0;
  const seasonIdx = onBoard ? seasonIndexInSession(turnsUsed, turnBudget || 1) : 0;
  const [shown, setShown] = useState<ShownState | null>(null);
  const prevSeasonRef = useRef(seasonIdx);
  const prevOnBoardRef = useRef(onBoard);

  useEffect(() => {
    const entered = onBoard && !prevOnBoardRef.current;
    const seasonChanged = onBoard && seasonIdx !== prevSeasonRef.current;
    prevOnBoardRef.current = onBoard;
    prevSeasonRef.current = seasonIdx;
    if (!onBoard) return;
    if (entered) return;
    if (!seasonChanged) return;
    const key = Math.random();
    setShown({ seasonIdx, key });
    const timer = setTimeout(() => setShown(null), HOLD_MS);
    return () => clearTimeout(timer);
  }, [seasonIdx, onBoard]);

  if (!shown) return null;
  if (typeof document === "undefined") return null;
  const season = SEASONS[shown.seasonIdx] ?? SEASONS[0];
  const tint = `#${season.bg.toString(16).padStart(6, "0")}`;
  const accent = `#${season.fill.toString(16).padStart(6, "0")}`;

  return createPortal(
    <div
      key={shown.key}
      aria-hidden="true"
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
    >
      <div
        className="absolute inset-0 season-cinematic-bg"
        style={{ background: `radial-gradient(circle at center, ${tint}cc 0%, transparent 70%)` }}
      />
      <div className="relative season-cinematic-card">
        <div
          className="text-[44px] font-bold leading-none m-0 text-cream"
          style={{ textShadow: `0 2px 0 rgba(0,0,0,0.5), 0 0 18px ${accent}88` }}
        >
          {season.name}
        </div>
      </div>
    </div>,
    document.body,
  );
}
