// Phase 5b — Type-tier workers panel.
//
// Renders inside the Townsfolk hub screen as the "Workers" tab. Each row
// shows the worker, hire / fire buttons, the per-hire effect summary, and
// the current count out of maxCount.
import { useState } from "react";
import { ITEMS } from "../../constants.js";
import { TYPE_WORKERS, nextHireCost, nextHireResourceCost } from "./data.js";
import Icon from "../../ui/Icon.jsx";
import DesignIcon from "../../ui/primitives/Icon.jsx";
import {
  AbilitySummary,
  BrowserDetailLayout,
  BrowserGrid,
  BrowserItemButton,
  CostGrid,
  DetailActionButton,
  DetailPane,
} from "../../ui/primitives/BrowserDetail.jsx";

function effectSummary(abilities, count, maxCount) {
  if (!abilities || abilities.length === 0) return "";
  const safeCount = Math.max(0, Math.min(count | 0, maxCount));
  const parts = abilities.map(ab => {
    const p = ab.params || {};
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

function WorkerBrowserItem({ worker, count, selected, onSelect }) {
  return (
    <BrowserItemButton
      selected={selected}
      icon={<Icon iconKey={worker.iconKey} size={32} />}
      title={worker.name}
      subtitle={worker.description}
      count={`${count}/${worker.maxCount}`}
      onClick={onSelect}
      aria-label={`View ${worker.name}`}
    />
  );
}

function WorkerDetail({ worker, count, state, dispatch }) {
  if (!worker) return <DetailPane empty="Select a worker type to inspect it." />;
  // Phase 6 — show the cost of the *next* hire so the player can see the
  // ramp build up. When the worker is already at maxCount the ramp call
  // is moot but we still pass `count` for a stable display.
  const coinCost = nextHireCost(worker, count);
  const resourceCost = nextHireResourceCost(worker, count);
  const inv = state?.inventory ?? {};
  const canPayResources = Object.entries(resourceCost).every(([key, amount]) => (inv[key] ?? 0) >= amount);
  const canHire = (state?.coins ?? 0) >= coinCost && canPayResources && count < worker.maxCount;
  const canFire = count > 0;
  const costEntries = [
    {
      key: "coins",
      label: "Coins",
      amount: coinCost,
      icon: <DesignIcon iconKey="design.currency.coin" size={18} />,
      have: state?.coins ?? 0,
      showHave: true,
      check: true,
    },
    ...Object.entries(resourceCost).map(([key, amount]) => ({
      key,
      label: ITEMS[key]?.label || key,
      amount,
      icon: <Icon iconKey={key} size={18} />,
      have: inv[key] ?? 0,
      showHave: true,
      check: true,
      ok: (inv[key] ?? 0) >= amount,
    })),
  ];
  return (
    <DetailPane
      eyebrow="Worker"
      title={worker.name}
      status={`${count} / ${worker.maxCount} hired`}
      description={worker.description}
      icon={<Icon iconKey={worker.iconKey} size={64} />}
      actions={
        <>
          <DetailActionButton
            tone="moss"
            disabled={!canHire}
            aria-label={`Hire ${worker.name} for ${coinCost} coins`}
            onClick={() => dispatch({ type: "WORKERS/HIRE", payload: { id: worker.id } })}
          >
            Hire
          </DetailActionButton>
          <DetailActionButton
            tone="iron"
            variant="soft"
            disabled={!canFire}
            aria-label={`Fire one ${worker.name}`}
            onClick={() => dispatch({ type: "WORKERS/FIRE", payload: { id: worker.id } })}
          >
            Fire
          </DetailActionButton>
        </>
      }
    >
      <CostGrid entries={costEntries} title="Next hire cost" />
      <div>
        <div className="hl-section-label mb-1.5">Current effect</div>
        <div className="hl-text-dim">{effectSummary(worker.abilities, count, worker.maxCount) || "No current effect."}</div>
      </div>
      <div>
        <div className="hl-section-label mb-1.5">Bonuses</div>
        <AbilitySummary abilities={worker.abilities} />
      </div>
    </DetailPane>
  );
}

export function WorkersPanel({ state, dispatch }) {
  const hired = state?.workers?.hired ?? {};
  const [selectedId, setSelectedId] = useState(TYPE_WORKERS[0]?.id ?? null);
  const selected = TYPE_WORKERS.find((w) => w.id === selectedId) ?? TYPE_WORKERS[0] ?? null;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-3">
      <div className="hl-text-dim px-1">
        Anonymous, stackable workers. Each hire reduces the listed chain
        (or recipe input) by a whole tile, stacking up to the max count.
      </div>
      <BrowserDetailLayout
        browser={
          <BrowserGrid min={180}>
            {TYPE_WORKERS.map((w) => (
              <WorkerBrowserItem
                key={w.id}
                worker={w}
                count={hired[w.id] ?? 0}
                selected={selected?.id === w.id}
                onSelect={() => setSelectedId(w.id)}
              />
            ))}
          </BrowserGrid>
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
    </div>
  );
}
