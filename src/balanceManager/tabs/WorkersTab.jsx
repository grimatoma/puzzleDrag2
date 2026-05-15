// Workers tab — Phase 6 of the rule overhaul, abilities-aware revision.
//
// Edits the type-tier worker definitions: hire-cost ramp (coins / coinsStep /
// coinsMult), max count, and the abilities list. Patches are stored on
// `draft.workers[id]` and merge into the live `TYPE_WORKERS` array via
// `applyWorkerOverrides` in src/config/applyOverrides.js.

import { useMemo, useState } from "react";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import {
  COLORS, NumberField, SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";
import AbilitiesEditor from "../AbilitiesEditor.jsx";
import Icon from "../../ui/Icon.jsx";
import { workerCostLadder } from "../workerCosts.js";

const RAMP_TONE = {
  flat:      { bg: "rgba(43,34,24,0.06)",  fg: COLORS.inkLight },
  linear:    { bg: "rgba(226,178,74,0.18)", fg: "#7a5810" },
  geometric: { bg: "rgba(194,59,34,0.14)",  fg: COLORS.redDeep },
};

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

export default function WorkersTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => TYPE_WORKERS.filter((w) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return w.id.toLowerCase().includes(q) || (w.name || "").toLowerCase().includes(q);
    }),
    [search],
  );

  function patch(id, fields) {
    updateDraft((d) => {
      d.workers ??= {};
      const cur = d.workers[id] || {};
      const next = { ...cur, ...fields };
      for (const k of Object.keys(next)) {
        if (next[k] === undefined || next[k] === null) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.workers[id];
      else d.workers[id] = next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter workers…" />
        </div>
        <Pill>{filtered.length} of {TYPE_WORKERS.length}</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((w) => {
          const p = (draft.workers || {})[w.id] || {};
          const eff = {
            coins:      p.hireCost?.coins      ?? w.hireCost?.coins      ?? 0,
            coinsStep:  p.hireCost?.coinsStep  ?? w.hireCost?.coinsStep  ?? 0,
            coinsMult:  p.hireCost?.coinsMult  ?? w.hireCost?.coinsMult  ?? 1,
            maxCount:   p.maxCount ?? w.maxCount ?? 1,
            abilities:  p.abilities ?? w.abilities ?? [],
          };
          const dirty = Object.keys(p).length > 0;

          function patchHireCost(field, value) {
            const nextCost = { coins: eff.coins };
            if (eff.coinsStep > 0) nextCost.coinsStep = eff.coinsStep;
            if (eff.coinsMult !== 1) nextCost.coinsMult = eff.coinsMult;
            nextCost[field] = value;
            if ((nextCost.coinsStep ?? 0) <= 0) delete nextCost.coinsStep;
            if ((nextCost.coinsMult ?? 1) === 1) delete nextCost.coinsMult;
            patch(w.id, { hireCost: nextCost });
          }

          return (
            <Card key={w.id} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded"
                    style={{ width: 32, height: 32, background: COLORS.parchmentDeep }}
                  >
                    <Icon iconKey={w.iconKey} size={26} />
                  </div>
                  <code
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                  >
                    {w.id}
                  </code>
                  <span className="font-bold text-[13px]" style={{ color: COLORS.ink }}>{w.name}</span>
                </div>
                {dirty && (
                  <SmallButton
                    variant="ghost"
                    onClick={() => updateDraft((d) => { d.workers ??= {}; delete d.workers[w.id]; })}
                  >
                    revert
                  </SmallButton>
                )}
              </div>

              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mb-2">
                <div>
                  <Label>coins (base)</Label>
                  <NumberField
                    value={eff.coins} min={0} max={9999} width={80}
                    onChange={(v) => patchHireCost("coins", v)}
                  />
                </div>
                <div>
                  <Label>coinsStep (linear)</Label>
                  <NumberField
                    value={eff.coinsStep} min={0} max={999} width={80}
                    onChange={(v) => patchHireCost("coinsStep", v)}
                  />
                </div>
                <div>
                  <Label>coinsMult (geometric)</Label>
                  <NumberField
                    value={Number(eff.coinsMult.toFixed(3))}
                    min={1} max={3} step={0.05} width={80}
                    onChange={(v) => patchHireCost("coinsMult", v)}
                  />
                </div>
                <div>
                  <Label>maxCount</Label>
                  <NumberField
                    value={eff.maxCount} min={1} max={50} width={70}
                    onChange={(v) => patch(w.id, { maxCount: v })}
                  />
                </div>
              </div>

              <CostCurve worker={{ ...w,
                hireCost: { coins: eff.coins, coinsStep: eff.coinsStep > 0 ? eff.coinsStep : undefined, coinsMult: eff.coinsMult !== 1 ? eff.coinsMult : undefined },
                maxCount: eff.maxCount }} />

              <div className="mt-2 pt-3" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
                <AbilitiesEditor
                  scope="worker"
                  abilities={eff.abilities}
                  onChange={(next) => patch(w.id, { abilities: next })}
                />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No workers match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function CostCurve({ worker }) {
  const ladder = workerCostLadder(worker);
  if (!ladder || ladder.ladder.length === 0) return null;
  const tone = RAMP_TONE[ladder.ramp.kind] || RAMP_TONE.flat;
  const maxCost = Math.max(1, ...ladder.ladder.map((l) => l.cost));
  return (
    <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          Cost curve
        </span>
        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded"
          style={{ background: tone.bg, color: tone.fg }}
          title={ladder.ramp.hint}>
          {ladder.ramp.label}
        </span>
        <span className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>
          Σ {ladder.totalCost.toLocaleString()}◉ to max
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {ladder.ladder.map((row) => {
          const h = Math.max(2, Math.round((row.cost / maxCost) * 44));
          return (
            <div key={row.n} className="flex flex-col items-center" style={{ flex: 1 }} title={`Hire #${row.n + 1}: ${row.cost}◉ (Σ ${row.cumulative})`}>
              <div className="w-full rounded-t"
                style={{ height: h, background: tone.fg, opacity: 0.7 }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: COLORS.inkSubtle }}>
        <span>#1: {ladder.ladder[0].cost}◉</span>
        <span>#{ladder.ladder.length}: {ladder.ladder[ladder.ladder.length - 1].cost}◉</span>
      </div>
    </div>
  );
}
