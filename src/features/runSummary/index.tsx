import { NPCS } from "../../constants.js";
import { displayZoneName } from "../zones/data.js";
import { iconLabel } from "../../textures/iconRegistry.js";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import Button from "../../ui/primitives/Button.jsx";
import Pill from "../../ui/primitives/Pill.jsx";
import ProgressTrack from "../../ui/primitives/ProgressTrack.jsx";
import ResourceCell from "../../ui/primitives/ResourceCell.jsx";
import MetricCard, { MetricGrid } from "../../ui/primitives/MetricCard.jsx";
import Icon from "../../ui/Icon.jsx";
import type { GameState, Dispatch } from "../../types/state.js";
import type { BeatTriggered, BiggestChainSnapshot, RunSummary as RunSummaryState } from "./slice.js";

export const modalKey = "runSummary";
export const alwaysMounted = true;

const BIOME_TITLES: Record<string, string> = {
  farm: "Harvest complete",
  mine: "Mine sealed",
  fish: "Voyage returned",
};

const BIOME_TAGLINES: Record<string, string> = {
  farm: "The home vale kept its word.",
  mine: "The deep stones gave up their lode.",
  fish: "The boats came in heavy.",
};

function pickTitle(biome: string): string {
  return BIOME_TITLES[biome] || "Run complete";
}

function pickTagline(biome: string): string {
  return BIOME_TAGLINES[biome] || "The journey ended.";
}

function npcName(key: string): string {
  return (NPCS as Record<string, { name?: string } | undefined>)[key]?.name || key;
}

function formatDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

function BestMomentCard({ best }: { best: BiggestChainSnapshot | null }) {
  if (!best || !best.count) return null;
  const label = best.key ? (iconLabel(best.key) || best.key) : "Chain";
  return (
    <div className="rounded-md border border-iron-soft/60 bg-paper p-3 flex items-stretch gap-3">
      <div className="flex flex-col items-center justify-center px-2">
        {best.key ? <Icon iconKey={best.key} size={40} /> : null}
        <span className="mt-1 text-h2 font-bold tabular-nums text-ink leading-none">{`x${best.count}`}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="uppercase tracking-widest text-micro text-ink-light">Best moment</div>
        <div className="text-body-lg font-semibold text-ink truncate">{`${label} chain · ${best.count} tiles`}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Pill tone="gold" size="sm">{`+${best.coinGain || 0} coins`}</Pill>
          {best.upgrades > 0 ? <Pill tone="ember" size="sm">{`+${best.upgrades} upgrade${best.upgrades === 1 ? "" : "s"}`}</Pill> : null}
        </div>
      </div>
    </div>
  );
}

function ChainsHeadline({ chainsPlayed, biggest }: { chainsPlayed: number; biggest: BiggestChainSnapshot | null }) {
  const longest = biggest?.count ?? 0;
  return (
    <MetricGrid className="!grid-cols-2 md:!grid-cols-2">
      <MetricCard label="Chains played" value={chainsPlayed} />
      <MetricCard label="Longest" value={longest ? `x${longest}` : "—"} tone={longest ? "ember" : "muted"} />
    </MetricGrid>
  );
}

function ResourceTally({ resources }: { resources: Record<string, number> | null | undefined }) {
  const entries = Object.entries(resources || {}).filter(([, v]: [string, number]) => v > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="uppercase tracking-widest text-micro text-ink-light mb-1.5">What you brought home</div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {entries.slice(0, 8).map(([k, n]: [string, number]) => (
          <ResourceCell key={k} resourceKey={k} count={n} density="micro" />
        ))}
      </div>
    </div>
  );
}

function BondRow({ npc, delta }: { npc: string; delta: number }) {
  const tone = delta > 0 ? "moss" : "ember";
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-iron-soft/30 last:border-b-0">
      <Icon iconKey={`char_${npc}`} size={24} />
      <span className="flex-1 text-body text-ink truncate">{npcName(npc)}</span>
      <Pill tone={tone} size="sm">{`Bond ${formatDelta(delta)}`}</Pill>
    </div>
  );
}

function BondsBlock({ bondDeltas }: { bondDeltas: Record<string, number> | null | undefined }) {
  const entries = Object.entries(bondDeltas || {}).filter(([, v]: [string, number]) => Math.abs(v) >= 0.1);
  if (entries.length === 0) return null;
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return (
    <div>
      <div className="uppercase tracking-widest text-micro text-ink-light mb-1.5">What the vale noticed</div>
      <div className="rounded-md border border-iron-soft/40 bg-paper/60 px-3 py-1">
        {entries.map(([npc, delta]: [string, number]) => (
          <BondRow key={npc} npc={npc} delta={delta} />
        ))}
      </div>
    </div>
  );
}

function BeatsBlock({ beats }: { beats: BeatTriggered[] | null | undefined }) {
  const list: BeatTriggered[] = (beats || []).filter((b: BeatTriggered) => !!b && !!b.title);
  if (list.length === 0) return null;
  return (
    <div>
      <div className="uppercase tracking-widest text-micro text-ink-light mb-1.5">Story beats</div>
      <div className="flex flex-wrap gap-1.5">
        {list.slice(0, 6).map((b: BeatTriggered) => (
          <Pill key={b.id} tone="gold" size="sm">{b.title}</Pill>
        ))}
      </div>
    </div>
  );
}

function SuppliesLine({ supply, fertilizerUsed }: { supply: Record<string, number> | null | undefined; fertilizerUsed: boolean }) {
  const entries = Object.entries(supply || {}).filter(([, v]: [string, number]) => v > 0);
  if (entries.length === 0 && !fertilizerUsed) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-body text-ink-light">
      <span className="uppercase tracking-widest text-micro text-ink-light">Supplies consumed:</span>
      {entries.map(([k, n]: [string, number]) => (
        <Pill key={k} tone="iron" size="sm" leading={<Icon iconKey={k} size={14} />}>{`x${n}`}</Pill>
      ))}
      {fertilizerUsed ? <Pill tone="moss" size="sm">Fertilizer</Pill> : null}
    </div>
  );
}

interface RunSummaryProps {
  state: GameState;
  dispatch: Dispatch;
}

export default function RunSummary({ state, dispatch }: RunSummaryProps) {
  const s = state as GameState & { runSummary?: RunSummaryState; biomeKey?: string };
  const run = s.runSummary;
  if (!run || !run.open) return null;

  const biome: string = run.biome || s.biomeKey || "farm";
  const title = pickTitle(biome);
  const tagline = pickTagline(biome);
  const turnsBudget = run.turnsAtStart || 0;
  const zoneName = run.zoneId ? displayZoneName(state, run.zoneId) : null;

  const close = () => {
    dispatch({ type: "RUN_SUMMARY/CLOSE" });
    dispatch({ type: "CLOSE_SEASON" });
  };

  return (
    <ParchmentDialog open onClose={close} size="md" tone="parchment">
      <ParchmentDialog.Title>
        <span className="flex flex-col items-center text-center gap-1">
          <span className="uppercase tracking-[0.2em] text-micro text-ink-light font-semibold">{title}</span>
          <span className="block text-h2 font-bold text-ink">{tagline}</span>
          {zoneName ? (
            <span className="block italic text-body text-ink-light font-normal">
              {zoneName}{turnsBudget ? ` · ${turnsBudget} turns spent` : ""}
            </span>
          ) : null}
        </span>
      </ParchmentDialog.Title>
      <ParchmentDialog.Body className="flex flex-col gap-3">
        <ChainsHeadline chainsPlayed={run.chainsPlayed} biggest={run.biggestChain} />
        {run.biggestChain ? (
          <ProgressTrack
            value={run.biggestChain.count}
            max={Math.max(run.biggestChain.count, 10)}
            tone="gold"
            size="sm"
          />
        ) : null}
        <BestMomentCard best={run.biggestChain} />
        <ResourceTally resources={run.resourcesGained} />
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <div>
            <div className="uppercase tracking-widest text-micro text-ink-light">Upgrades crafted</div>
            <div className="text-body-lg font-bold tabular-nums text-ink">{run.totalUpgrades || 0}</div>
          </div>
          <div className="text-right">
            <div className="uppercase tracking-widest text-micro text-ink-light">Coins gained</div>
            <div className="text-body-lg font-bold tabular-nums text-gold">{`+${run.totalCoinGain || 0}`}</div>
          </div>
        </div>
        <BondsBlock bondDeltas={run.bondDeltas} />
        <BeatsBlock beats={run.beatsTriggered} />
        <SuppliesLine supply={run.suppliesConsumed} fertilizerUsed={run.fertilizerUsed} />
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={close}>Return to Town</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
