// Hearthkeeping (idle layer) screen. A React DOM view — deliberately NOT a
// Phaser scene — so it stays in the unit-testable layer and out of the
// un-regenerable visual-goldens path.
//
// Exporting `viewKey` auto-registers "embergarden" in KNOWN_VIEWS (router.ts)
// and makes this mount when state.view === "embergarden" (ui.tsx). No manual
// edit to KNOWN_VIEWS.

import Button from "../../ui/primitives/Button.jsx";
import Pill from "../../ui/primitives/Pill.jsx";
import ProgressTrack from "../../ui/primitives/ProgressTrack.jsx";
import MetricCard, { MetricGrid } from "../../ui/primitives/MetricCard.jsx";
import type { GameState, Dispatch } from "../../types/state.js";
import type { EmbergardenState } from "./slice.js";
import {
  GENERATORS,
  generatorCost,
  generatorRate,
  generatorUnlocked,
  totalWarmthPerSec,
  hearthlightMult,
  hearthlightFromLifetime,
  hearthlightBoardCoinBonus,
  HEARTHLIGHT_BOARD_COIN_CAP,
  REKINDLE_MIN_LIFETIME_WARMTH,
} from "./data.js";

export const viewKey = "embergarden";

function fmt(n: number): string {
  const v = Math.floor(n);
  if (v < 10000) return v.toLocaleString();
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 100_000 ? 1 : 0)}k`;
  return `${(v / 1_000_000).toFixed(2)}M`;
}

function fmtRate(n: number): string {
  if (n === 0) return "0";
  if (n < 1) return n.toFixed(2);
  if (n < 100) return n.toFixed(1);
  return fmt(n);
}

interface GeneratorRowProps {
  def: (typeof GENERATORS)[number];
  level: number;
  eg: EmbergardenState;
  dispatch: Dispatch;
}

function GeneratorRow({ def, level, eg, dispatch }: GeneratorRowProps) {
  const unlocked = generatorUnlocked(def, eg.lifetimeWarmth);
  const cost = generatorCost(def, level);
  const rateNow = generatorRate(def, level) * hearthlightMult(eg.hearthlight);
  const canAfford = eg.warmth >= cost;

  if (!unlocked) {
    return (
      <div className="rounded-md border border-iron-soft/40 bg-paper/50 p-3 opacity-70">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-lg font-semibold text-ink">🔒 {def.name}</span>
          <Pill tone="iron" size="sm">{`Unlocks at ${fmt(def.unlockAtWarmthLifetime)} lifetime Warmth`}</Pill>
        </div>
        <div className="text-caption text-ink-light mt-1">{def.blurb}</div>
        <div className="mt-2">
          <ProgressTrack
            value={Math.min(eg.lifetimeWarmth, def.unlockAtWarmthLifetime)}
            max={def.unlockAtWarmthLifetime}
            tone="ember"
            size="sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-iron-soft/60 bg-paper p-3 flex items-stretch gap-3">
      <div className="flex flex-col items-center justify-center px-1 min-w-[3rem]">
        <span className="text-micro uppercase tracking-widest text-ink-light">Lv</span>
        <span className="text-h2 font-bold tabular-nums text-ink leading-none">{level}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-body-lg font-semibold text-ink truncate">{def.name}</div>
        <div className="text-caption text-ink-light truncate">{def.blurb}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Pill tone="ember" size="sm">{`+${fmtRate(rateNow)} Warmth/s`}</Pill>
        </div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <Button
          tone="moss"
          size="sm"
          disabled={!canAfford}
          onClick={() => dispatch({ type: "EMBERGARDEN/BUY_GENERATOR", payload: { id: def.id, now: Date.now() } })}
        >
          {`Stoke · ${fmt(cost)}`}
        </Button>
        <span className="text-micro text-ink-light mt-1">Warmth</span>
      </div>
    </div>
  );
}

interface RekindlePanelProps {
  eg: EmbergardenState;
  dispatch: Dispatch;
}

function RekindlePanel({ eg, dispatch }: RekindlePanelProps) {
  const reward = hearthlightFromLifetime(eg.lifetimeWarmth);
  const ready = eg.lifetimeWarmth >= REKINDLE_MIN_LIFETIME_WARMTH && reward > 0;
  const idleMultPct = Math.round((hearthlightMult(eg.hearthlight) - 1) * 100);
  const boardBonusPct = Math.round(hearthlightBoardCoinBonus(eg.hearthlight) * 100);
  const idleCapped = hearthlightMult(eg.hearthlight) >= 2;
  const boardCapped = hearthlightBoardCoinBonus(eg.hearthlight) >= HEARTHLIGHT_BOARD_COIN_CAP;

  return (
    <div className="rounded-md border border-ember/40 bg-ember/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-body-lg font-bold text-ink">Rekindle</div>
        <Pill tone="gold" size="sm">{`${eg.hearthlight} Hearthlight`}</Pill>
      </div>
      <div className="text-caption text-ink-light mt-1">
        Bank this cycle's Warmth as permanent <b>Hearthlight</b>: every generator resets, but
        Hearthlight never does. It buffs idle output and your next board run.
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone="ember" size="sm">{`Idle ×${(1 + idleMultPct / 100).toFixed(2)}${idleCapped ? " (max)" : ""}`}</Pill>
        <Pill tone="gold" size="sm">{`Board coins +${boardBonusPct}%${boardCapped ? " (max)" : ""}`}</Pill>
      </div>
      {!ready ? (
        <div className="mt-2">
          <ProgressTrack value={eg.lifetimeWarmth} max={REKINDLE_MIN_LIFETIME_WARMTH} tone="ember" size="sm" />
          <div className="text-micro text-ink-light mt-1">
            {`${fmt(eg.lifetimeWarmth)} / ${fmt(REKINDLE_MIN_LIFETIME_WARMTH)} lifetime Warmth to Rekindle`}
          </div>
        </div>
      ) : null}
      <div className="mt-3">
        <Button
          tone="ember"
          size="md"
          block
          disabled={!ready}
          onClick={() => dispatch({ type: "EMBERGARDEN/REKINDLE", payload: { now: Date.now() } })}
        >
          {ready ? `Rekindle for +${reward} Hearthlight` : "Rekindle — not yet"}
        </Button>
      </div>
    </div>
  );
}

interface EmbergardenScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function EmbergardenScreen({ state, dispatch }: EmbergardenScreenProps) {
  const eg = state.embergarden;
  if (!eg) return null;
  const perSec = totalWarmthPerSec(eg.levels, eg.hearthlight);

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: "linear-gradient(180deg, #2a1a12 0%, #3c2415 100%)" }}>
      <div className="max-w-[760px] mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="hl-title flex items-center gap-2 text-paper">🔥 Hearthkeeping</div>
            <div className="text-caption" style={{ color: "#e8c9a0" }}>
              The hearth keeps burning while you're away. Warmth fuels itself — stoke it, then Rekindle for a lasting boon.
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
            className="rounded-lg px-3 py-1.5 font-bold text-caption text-white shrink-0"
            style={{ background: "var(--btn-earth-bg)", border: "2px solid var(--btn-earth-edge)" }}
          >
            ← Back to Town
          </button>
        </div>

        <MetricGrid className="!grid-cols-2 md:!grid-cols-2 mb-3">
          <MetricCard label="Warmth" value={fmt(eg.warmth)} tone="ember" />
          <MetricCard label="Per second" value={`+${fmtRate(perSec)}`} tone={perSec > 0 ? "success" : "muted"} />
        </MetricGrid>

        <div className="flex flex-col gap-2 mb-3">
          {GENERATORS.map((def) => (
            <GeneratorRow key={def.id} def={def} level={eg.levels[def.id] ?? 0} eg={eg} dispatch={dispatch} />
          ))}
        </div>

        <RekindlePanel eg={eg} dispatch={dispatch} />
      </div>
    </div>
  );
}
