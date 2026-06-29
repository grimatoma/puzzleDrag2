// Phase 5b — Type-tier workers panel.
//
// Renders inside the Townsfolk hub screen as the "Workers" tab. Each row
// shows the worker, hire / fire buttons, the per-hire effect summary, and
// the current count out of maxCount.
import { useState, useMemo } from "react";
import { getItem } from "../../constants.js";
import { TYPE_WORKERS, nextHireCost, nextHireResourceCost } from "./data.js";
import { isWorkerReachable } from "../../game/reachability.js";
import type { WorkerAbility, WorkerDef } from "./data.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import {
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "../../ui/primitives/BrowserDetail.jsx";
import { useAccordion, ExpandRow } from "../../ui/primitives/ExpandList.jsx";
import type { Dispatch, GameState } from "../../types/state.js";
import { zoneInventory } from "../../state/zoneInventory.js";
import { inventoryQty } from "../../types/inventory.js";
import { CATEGORY_TO_SUBCATEGORY } from "../tileCollection/data.js";
import { BREAKPOINTS, useViewportBelow } from "../../ui/breakpoints.js";

// Section a worker by the board/role it serves, derived from its primary ability.
// Keeps the ~29-worker roster scannable without per-worker JSX.
type WorkerSection = "Farm" | "Mine" | "Water" | "Crafting" | "Promotion" | "Coin & Rune";

const SECTION_ORDER: WorkerSection[] = ["Farm", "Mine", "Water", "Crafting", "Promotion", "Coin & Rune"];

function sectionForWorker(worker: WorkerDef): WorkerSection {
  const ab = worker.abilities?.[0];
  if (!ab) return "Crafting";
  if (ab.id === "chain_redirect_category") return "Promotion";
  if (ab.id === "coin_bonus_flat" || ab.id === "coin_bonus_per_tile" || ab.id === "rune_support_reduce") return "Coin & Rune";
  if (ab.id === "recipe_input_reduce") return "Crafting";
  if (ab.id === "threshold_reduce_category") {
    const cat = String((ab.params as { category?: string })?.category ?? "");
    const sub = (CATEGORY_TO_SUBCATEGORY as Record<string, string>)[cat];
    if (sub === "mining") return "Mine";
    if (sub === "water") return "Water";
    return "Farm";
  }
  return "Crafting";
}

function effectSummary(abilities: WorkerAbility[] | null | undefined, count: number, maxCount: number): string {
  if (!abilities || abilities.length === 0) return "";
  const safeCount = Math.max(0, Math.min(count | 0, maxCount));
  const parts = abilities.map((ab) => {
    const p = (ab.params || {}) as Record<string, unknown>;
    const amount = Number(p.amount) || 0;
    switch (ab.id) {
      case "threshold_reduce_category": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.category} chain steps (max −${max})`;
      }
      case "threshold_reduce": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.target || p.key} chain steps (max −${max})`;
      }
      case "recipe_input_reduce": {
        const current = amount * safeCount;
        const max = amount * maxCount;
        return `−${current} ${p.input} for ${p.recipe} (max −${max})`;
      }
      default:
        return ab.id;
    }
  });
  return parts.join(" · ");
}

interface WorkerBrowserItemProps {
  worker: WorkerDef;
  count: number;
  selected: boolean;
  onSelect: () => void;
}

function WorkerBrowserItem({ worker, count, selected, onSelect }: WorkerBrowserItemProps) {
  return (
    <BrowserItemButton
      selected={selected}
      icon={<Icon iconKey={worker.look?.iconKey} size={32} title="" />}
      title={worker.name}
      subtitle={worker.description}
      count={`${count}/${worker.maxCount}`}
      status={undefined}
      onClick={onSelect}
      aria-label={`View ${worker.name}`}
    >
      {null}
    </BrowserItemButton>
  );
}

interface WorkerDetailProps {
  worker: WorkerDef | null;
  count: number;
  state: GameState;
  dispatch: Dispatch;
}

interface HireCostEntry {
  key: string;
  label: string;
  amount: number;
  icon: JSX.Element;
  have: number;
  showHave: boolean;
  check: boolean;
  ok?: boolean;
}

interface HireInfo {
  coinCost: number;
  costEntries: HireCostEntry[];
  canHire: boolean;
}

// Shared next-hire computation so the wide side panel and the mobile inline
// accordion render identical cost/effect/hire affordances.
function computeHireInfo(worker: WorkerDef, count: number, state: GameState): HireInfo {
  // Phase 6 — show the cost of the *next* hire so the player can see the
  // ramp build up. When the worker is already at maxCount the ramp call
  // is moot but we still pass `count` for a stable display.
  const coinCost = nextHireCost(worker, count);
  const resourceCost = nextHireResourceCost(worker, count);
  const inv = zoneInventory(state ?? { inventory: {}, farmRun: null, activeZone: "home", mapCurrent: "home" } as GameState);
  const canPayResources = Object.entries(resourceCost).every(([key, amount]) => inventoryQty(inv, key) >= amount);
  const villagersAvailable = state?.villagers ?? 0;
  const hasVillager = villagersAvailable >= 1;
  const canHire = (state?.coins ?? 0) >= coinCost && canPayResources && hasVillager && count < worker.maxCount;
  const costEntries: HireCostEntry[] = [
    {
      key: "coins",
      label: "Coins",
      amount: coinCost,
      icon: <DesignIcon iconKey="design.currency.coin" size={18} title="" />,
      have: state?.coins ?? 0,
      showHave: true,
      check: true,
    },
    {
      key: "villager",
      label: "Villager",
      amount: 1,
      icon: <Icon iconKey="ui_home" size={18} title="" />,
      have: villagersAvailable,
      showHave: true,
      check: true,
      ok: hasVillager,
    },
    ...Object.entries(resourceCost).map(([key, amount]) => ({
      key,
      label: getItem(key)?.label || key,
      amount,
      icon: <Icon iconKey={key} size={18} title="" />,
      have: inventoryQty(inv, key),
      showHave: true,
      check: true,
      ok: inventoryQty(inv, key) >= amount,
    })),
  ];
  return { coinCost, costEntries, canHire };
}

// Body shared between the side panel and the inline accordion: cost grid +
// effect summary + the Hire button.
function WorkerHireBody({ worker, count, state, dispatch }: WorkerDetailProps & { worker: WorkerDef }) {
  const { coinCost, costEntries, canHire } = computeHireInfo(worker, count, state);
  return (
    <>
      <CostGrid entries={costEntries as never[]} title="Next hire cost" />
      <div className="flex items-baseline gap-1.5">
        <span className="hl-section-label">Effect</span>
        <span className="hl-text-dim">{effectSummary(worker.abilities, count, worker.maxCount) || "None yet."}</span>
      </div>
      <DetailActionButton
        tone="moss"
        disabled={!canHire}
        aria-label={`Hire ${worker.name} for ${coinCost} coins`}
        onClick={() => dispatch({ type: "WORKERS/HIRE", payload: { id: worker.id } })}
      >
        Hire
      </DetailActionButton>
    </>
  );
}

function WorkerDetail({ worker, count, state, dispatch }: WorkerDetailProps) {
  if (!worker) return <DetailPane empty="Select a worker type to inspect it." title={undefined} eyebrow={undefined} icon={undefined} status={undefined} description={undefined} actions={undefined} headerActions={undefined}>{undefined}</DetailPane>;
  const { coinCost, costEntries, canHire } = computeHireInfo(worker, count, state);
  return (
    <DetailPane
      eyebrow={undefined}
      title={worker.name}
      status={`${count} / ${worker.maxCount} hired`}
      description={worker.description}
      icon={<Icon iconKey={worker.look?.iconKey} size={48} title="" />}
      headerActions={undefined}
      empty={undefined}
      actions={
        <DetailActionButton
          tone="moss"
          disabled={!canHire}
          aria-label={`Hire ${worker.name} for ${coinCost} coins`}
          onClick={() => dispatch({ type: "WORKERS/HIRE", payload: { id: worker.id } })}
        >
          Hire
        </DetailActionButton>
      }
    >
      <CostGrid entries={costEntries as never[]} title="Next hire cost" />
      <div className="flex items-baseline gap-1.5">
        <span className="hl-section-label">Effect</span>
        <span className="hl-text-dim">{effectSummary(worker.abilities, count, worker.maxCount) || "None yet."}</span>
      </div>
    </DetailPane>
  );
}

interface WorkersPanelProps {
  state: GameState;
  dispatch: Dispatch;
}

export function WorkersPanel({ state, dispatch }: WorkersPanelProps) {
  const hiredSource = state?.workers?.hired;
  const hired = useMemo(() => (hiredSource ?? {}) as Record<string, number>, [hiredSource]);
  // Static reachability: only surface a worker whose target family/recipe exists in the
  // configured game (mirrors visibleTools). The `|| hired > 0` guard keeps a worker the
  // player already employs from vanishing if scope shifts.
  const visibleWorkers = useMemo(
    () => TYPE_WORKERS.filter((w) => isWorkerReachable(w.id) || (hired[w.id] ?? 0) > 0),
    [hired],
  );
  const [selectedId, setSelectedId] = useState<string | null>(visibleWorkers[0]?.id ?? null);
  const selected = visibleWorkers.find((w) => w.id === selectedId) ?? visibleWorkers[0] ?? null;
  const totalHired = Object.values(hired).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const villagersAvailable = state?.villagers ?? 0;
  // Mobile portrait: collapse the two-pane browser/detail into inline
  // expand/collapse rows (matching the Inventory/Crafting tabs). The 720px
  // boundary is where BrowserDetailLayout already drops its side-by-side
  // layout (BREAKPOINTS.browserStack), so it's the natural switch point.
  const stacked = useViewportBelow(BREAKPOINTS.browserStack);
  // Accordion: which row is expanded inline (null = all collapsed). Kept
  // separate from `selectedId` so portrait opens with everything closed
  // rather than auto-expanding the first worker. Shared engine = same
  // open/close animation as the Inventory tab.
  const accordion = useAccordion();

  const sections = SECTION_ORDER.map((section) => ({
    section,
    workers: visibleWorkers.filter((w) => sectionForWorker(w) === section),
  })).filter((s) => s.workers.length > 0);

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-3">
      <div className="hl-board-head">
        <Icon iconKey="ui_build" size={34} title="" className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="hl-board-head__kicker">Hearthwood Vale</div>
          <div className="hl-board-head__title">Hands for Hire</div>
          <div className="hl-board-head__sub">Take on willing folk from around the vale — every hand shoulders part of the work.</div>
        </div>
        <span className="hl-board-pill">
          <Icon iconKey="ui_home" size={14} title="" /> {villagersAvailable} villager{villagersAvailable === 1 ? "" : "s"}
        </span>
        <span className="hl-board-pill">{totalHired} hired</span>
      </div>
      <div className="hl-text-faint px-1 text-[11px] leading-snug">
        Each hire costs 1 Villager plus materials. Build Housing Blocks in town to earn Villagers each season. Hires shave a tile off the listed chain (or an input off a recipe), stacking up to the max count.
      </div>
      {stacked ? (
        <div className="hl-browser-list flex-1 min-h-0 flex flex-col gap-3">
          {sections.map(({ section, workers }) => (
            <div key={section}>
              <div className="hl-section-label mb-1.5">{section}</div>
              <div className="flex flex-col gap-2">
                {workers.map((w) => {
                  const count = hired[w.id] ?? 0;
                  return (
                    <ExpandRow
                      key={w.id}
                      open={accordion.displayedKey === w.id}
                      isOpen={accordion.isOpen}
                      icon={<Icon iconKey={w.look?.iconKey} size={40} title="" />}
                      title={w.name}
                      subtitle={w.description}
                      meta={`${count}/${w.maxCount}`}
                      onToggle={() => accordion.select(w.id)}
                      onClosed={accordion.onClosed}
                      expandLabel={`View ${w.name}`}
                      collapseLabel={`Collapse ${w.name}`}
                    >
                      <WorkerHireBody worker={w} count={count} state={state} dispatch={dispatch} />
                    </ExpandRow>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BrowserDetailLayout
          toolbar={undefined}
          browser={
            <div className="flex flex-col gap-3">
              {sections.map(({ section, workers }) => (
                <div key={section}>
                  <div className="hl-section-label mb-1.5">{section}</div>
                  <BrowserGrid min={180}>
                    {workers.map((w) => (
                      <WorkerBrowserItem
                        key={w.id}
                        worker={w}
                        count={hired[w.id] ?? 0}
                        selected={selected?.id === w.id}
                        onSelect={() => setSelectedId(w.id)}
                      />
                    ))}
                  </BrowserGrid>
                </div>
              ))}
            </div>
          }
          detail={
            <WorkerDetail
              worker={selected}
              count={selected ? hired[selected.id] ?? 0 : 0}
              state={state}
              dispatch={dispatch}
            />
          }
        />
      )}
    </div>
  );
}
