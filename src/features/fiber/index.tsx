import { useEffect, useState } from "react";
import type { Dispatch, GameState, FiberSliceState } from "../../types/state.js";
import {
  FIBER_LEVELS,
  fiberLevelById,
  objectiveProgress,
  computeStars,
  type FiberLevel,
} from "../../game/fiber/levels.js";
import { getItem } from "../../constants.js";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import FiberCanvas from "./FiberCanvas.jsx";

export const viewKey = "fiber";

const DEFAULT_FIBER: FiberSliceState = { unlockedLevel: 1, stars: {}, active: null };

interface FiberResult {
  levelId: string;
  won: boolean;
  stars: number;
  level: FiberLevel;
}

interface FiberViewProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function FiberView({ state, dispatch }: FiberViewProps) {
  const fiber = state.fiber ?? DEFAULT_FIBER;
  const active = fiber.active;
  const [result, setResult] = useState<FiberResult | null>(null);

  // When the active run reaches a terminal status, snapshot the outcome and
  // dispatch COMPLETE_LEVEL (which lands rewards in the real economy and clears
  // `active`). The snapshot drives the result card below.
  const activeStatus = active?.status;
  const activeLevelId = active?.levelId;
  const activeMovesUsed = active?.movesUsed ?? 0;
  useEffect(() => {
    if (!activeLevelId || !activeStatus || activeStatus === "playing") return;
    const level = fiberLevelById(activeLevelId);
    if (!level) return;
    const won = activeStatus === "won";
    const stars = won ? computeStars(level, activeMovesUsed) : 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- snapshot the terminal outcome before COMPLETE_LEVEL clears `active`; fires once per run (deps go terminal → null)
    setResult({ levelId: activeLevelId, won, stars, level });
    dispatch({ type: "FIBER/COMPLETE_LEVEL", levelId: activeLevelId, won, stars });
  }, [activeStatus, activeLevelId, activeMovesUsed, dispatch]);

  if (result) {
    return (
      <FiberResultCard
        result={result}
        onContinue={() => setResult(null)}
        onRetry={() => { setResult(null); dispatch({ type: "FIBER/START_LEVEL", levelId: result.levelId }); }}
        onLeave={() => { setResult(null); dispatch({ type: "FIBER/EXIT" }); }}
      />
    );
  }

  if (active && active.status === "playing") {
    return <FiberActiveLevel dispatch={dispatch} fiber={fiber} />;
  }

  return <FiberLevelSelect fiber={fiber} dispatch={dispatch} />;
}

function StarRow({ n }: { n: number }) {
  return (
    <span className="text-amber-400" aria-label={`${n} stars`}>
      {"★".repeat(n)}<span className="text-iron/40">{"★".repeat(Math.max(0, 3 - n))}</span>
    </span>
  );
}

function FiberLevelSelect({ fiber, dispatch }: { fiber: FiberSliceState; dispatch: Dispatch }) {
  return (
    <FeaturePanel className="z-10">
      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div className="hl-board-head flex-shrink-0">
            <span className="text-[26px] leading-none flex-shrink-0" aria-hidden>🧶</span>
            <div className="flex-1 min-w-0">
              <div className="hl-board-head__kicker">Weaver's Loft</div>
              <div className="hl-board-head__title">Fiber Crush</div>
              <div className="hl-board-head__sub">Swap adjacent fibres to make lines of three. Clear the goal before you run out of moves.</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIBER_LEVELS.map((level, i) => {
              const ordinal = i + 1;
              const unlocked = ordinal <= fiber.unlockedLevel;
              const stars = fiber.stars[level.id] ?? 0;
              return (
                <button
                  key={level.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && dispatch({ type: "FIBER/START_LEVEL", levelId: level.id })}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    unlocked
                      ? "bg-parchment-dim border-iron hover:border-ember/70 hover:bg-parchment-soft"
                      : "bg-iron-deep/20 border-iron/40 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-ink">{unlocked ? "" : "🔒 "}{level.name}</div>
                    {stars > 0 && <StarRow n={stars} />}
                  </div>
                  <div className="text-[12px] text-ink-soft mt-1">
                    {level.objectives.map((o) => o.label).join(" · ")}
                  </div>
                  <div className="text-[11px] text-ink-soft/80 mt-1 tabular-nums">
                    {level.moves} moves · reward {level.reward.coins}◉
                    {Object.entries(level.reward.resources).map(([k, v]) => ` · ${v} ${getItem(k)?.label ?? k}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}

function FiberActiveLevel({ dispatch, fiber }: { dispatch: Dispatch; fiber: FiberSliceState }) {
  const active = fiber.active!;
  const level = fiberLevelById(active.levelId);
  if (!level) return null;
  return (
    <FeaturePanel className="z-10">
      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 flex flex-col gap-2">
          {/* HUD: objectives + moves left */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => dispatch({ type: "FIBER/EXIT" })}
              className="rounded-lg px-2 py-1 text-[12px] font-semibold border border-iron bg-parchment-dim text-ink hover:bg-parchment-soft"
              aria-label="Leave Fiber Crush"
            >
              ◀ Leave
            </button>
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
              {level.objectives.map((o, i) => {
                const cur = Math.min(o.count, objectiveProgress(o, active.progress));
                const done = cur >= o.count;
                return (
                  <span key={i} className={`text-[12px] font-semibold tabular-nums ${done ? "text-moss" : "text-ink"}`}>
                    {done ? "✓ " : ""}{o.label}: {cur}/{o.count}
                  </span>
                );
              })}
            </div>
            <span className="hl-board-pill tabular-nums" data-testid="fiber-moves-left">
              {active.movesLeft} moves
            </span>
          </div>
          {/* Board */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            <div className="relative" style={{ width: "min(100%, 70vh)", aspectRatio: "1 / 1" }}>
              <FiberCanvas
                key={active.levelId}
                level={level}
                locked={active.status !== "playing"}
                dispatch={dispatch}
              />
            </div>
          </div>
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}

function FiberResultCard({ result, onContinue, onRetry, onLeave }: {
  result: FiberResult;
  onContinue: () => void;
  onRetry: () => void;
  onLeave: () => void;
}) {
  const { won, stars, level } = result;
  return (
    <FeaturePanel className="z-10">
      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 flex items-center justify-center p-4">
          <div className="hl-card max-w-[420px] w-full text-center p-5">
            <div className="text-[40px] leading-none mb-2">{won ? "🧶" : "💢"}</div>
            <div className="hl-card-title text-[20px] mb-1">{won ? "Cloth woven!" : "Out of moves"}</div>
            <div className="hl-card-meta mb-3">{level.name}</div>
            {won && (
              <>
                <div className="mb-2"><StarRow n={stars} /></div>
                <div className="text-[13px] text-ink-soft mb-3">
                  Earned {level.reward.coins}◉
                  {Object.entries(level.reward.resources).map(([k, v]) => ` · ${v} ${getItem(k)?.label ?? k}`)}
                </div>
              </>
            )}
            <div className="flex items-center justify-center gap-2">
              {won ? (
                <button type="button" onClick={onContinue} className="rounded-lg px-4 py-2 font-bold text-[13px] bg-moss text-white hover:opacity-90">
                  Continue
                </button>
              ) : (
                <button type="button" onClick={onRetry} className="rounded-lg px-4 py-2 font-bold text-[13px] bg-ember text-white hover:opacity-90">
                  Try again
                </button>
              )}
              <button type="button" onClick={onLeave} className="rounded-lg px-4 py-2 font-bold text-[13px] border border-iron bg-parchment-dim text-ink hover:bg-parchment-soft">
                Leave
              </button>
            </div>
          </div>
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
