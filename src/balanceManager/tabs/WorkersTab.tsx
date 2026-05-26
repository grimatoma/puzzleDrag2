// Workers tab — Phase 6 of the rule overhaul, abilities-aware revision.
//
// Edits the type-tier worker definitions: hire-cost ramp (coins / coinsStep /
// coinsMult), max count, and the abilities list. Patches are stored on
// `draft.workers[id]` and merge into the live `TYPE_WORKERS` array via
// `applyWorkerOverrides` in src/config/applyOverrides.js.

import React, { useMemo, useState } from "react";
import { TYPE_WORKERS } from "../../features/workers/data.js";
import {
  COLORS, NumberField, SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";
import AbilitiesEditor, { type AbilityInstance } from "../AbilitiesEditor.jsx";
import { CardAttachmentFooter, focusHighlightProps, useScrollToFocus } from "../relational.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import Icon from "../../ui/Icon.jsx";
import { ITEMS } from "../../constants.js";
import type { BalanceDraft, TabProps } from "../index.jsx";

interface WorkerOverride {
  hireCost?: WorkerHireCost;
  maxCount?: number;
  abilities?: AbilityInstance[];
  [extra: string]: unknown;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

function formatResources(resources: Record<string, number> | null | undefined): string {
  return Object.entries(resources || {}).map(([k, v]) => `${k}:${v}`).join(", ");
}

function parseResources(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  const items = ITEMS as unknown as Record<string, unknown>;
  for (const part of String(text || "").split(",")) {
    const [rawKey, rawValue] = part.split(":").map((s) => s?.trim());
    const value = Number(rawValue);
    if (rawKey && items[rawKey] && Number.isFinite(value) && value > 0) {
      out[rawKey] = Math.floor(value);
    }
  }
  return out;
}

interface WorkerHireCost {
  coins?: number;
  coinsStep?: number;
  coinsMult?: number;
  resources?: Record<string, number>;
  resourcesStepEvery?: number;
}

export default function WorkersTab({ draft, updateDraft, focus }: TabProps) {
  const { focus: navFocus } = useBalanceNav();
  const activeFocus = focus ?? navFocus;
  useScrollToFocus(activeFocus);

  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => TYPE_WORKERS.filter((w) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return w.id.toLowerCase().includes(q) || (w.name || "").toLowerCase().includes(q);
    }),
    [search],
  );

  function patch(id: string, fields: WorkerOverride) {
    updateDraft((d: BalanceDraft) => {
      d.workers ??= {};
      const workers = d.workers as Record<string, WorkerOverride>;
      const cur: WorkerOverride = workers[id] || {};
      const next: WorkerOverride & Record<string, unknown> = { ...cur, ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === undefined || v === null) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete workers[id];
      else workers[id] = next;
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
          const p: WorkerOverride = ((draft.workers || {})[w.id] as WorkerOverride | undefined) || {};
          const eff = {
            coins:      p.hireCost?.coins      ?? w.hireCost?.coins      ?? 0,
            coinsStep:  p.hireCost?.coinsStep  ?? w.hireCost?.coinsStep  ?? 0,
            coinsMult:  p.hireCost?.coinsMult  ?? w.hireCost?.coinsMult  ?? 1,
            resources:  p.hireCost?.resources  ?? w.hireCost?.resources  ?? {},
            resourcesStepEvery: p.hireCost?.resourcesStepEvery ?? w.hireCost?.resourcesStepEvery ?? 3,
            maxCount:   p.maxCount ?? w.maxCount ?? 1,
            abilities:  p.abilities ?? w.abilities ?? [],
          };
          const dirty = Object.keys(p).length > 0;

          function patchHireCost(field: keyof WorkerHireCost, value: number | Record<string, number>) {
            const nextCost: WorkerHireCost = { coins: eff.coins };
            if (eff.coinsStep > 0) nextCost.coinsStep = eff.coinsStep;
            if (eff.coinsMult !== 1) nextCost.coinsMult = eff.coinsMult;
            if (Object.keys(eff.resources).length > 0) nextCost.resources = eff.resources as Record<string, number>;
            if (eff.resourcesStepEvery > 0) nextCost.resourcesStepEvery = eff.resourcesStepEvery;
            (nextCost as Record<string, unknown>)[field] = value;
            if ((nextCost.coinsStep ?? 0) <= 0) delete nextCost.coinsStep;
            if ((nextCost.coinsMult ?? 1) === 1) delete nextCost.coinsMult;
            patch(w.id, { hireCost: nextCost });
          }

          const hi = focusHighlightProps(w.id, activeFocus);

          return (
            <Card key={w.id} id={hi.id} style={hi.ringStyle} accent={dirty || hi.isFocused ? COLORS.ember : COLORS.border}>
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
                    onClick={() => updateDraft((d: BalanceDraft) => { d.workers ??= {}; delete d.workers[w.id]; })}
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
                    onChange={(v: number) => patchHireCost("coins", v)}
                  />
                </div>
                <div>
                  <Label>coinsStep (linear)</Label>
                  <NumberField
                    value={eff.coinsStep} min={0} max={999} width={80}
                    onChange={(v: number) => patchHireCost("coinsStep", v)}
                  />
                </div>
                <div>
                  <Label>coinsMult (geometric)</Label>
                  <NumberField
                    value={Number(eff.coinsMult.toFixed(3))}
                    min={1} max={3} step={0.05} width={80}
                    onChange={(v: number) => patchHireCost("coinsMult", v)}
                  />
                </div>
                <div>
                  <Label>maxCount</Label>
                  <NumberField
                    value={eff.maxCount} min={1} max={50} width={70}
                    onChange={(v: number) => patch(w.id, { maxCount: v })}
                  />
                </div>
                <div>
                  <Label>resource step</Label>
                  <NumberField
                    value={eff.resourcesStepEvery} min={1} max={20} width={70}
                    onChange={(v: number) => patchHireCost("resourcesStepEvery", v)}
                  />
                </div>
                <div className="col-span-3">
                  <Label>resources (key:amount, ...)</Label>
                  <input
                    className="w-full rounded px-2 py-1 font-mono text-[11px]"
                    style={{ background: COLORS.parchmentDeep, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                    value={formatResources(eff.resources as Record<string, number>)}
                    onChange={(e) => patchHireCost("resources", parseResources(e.target.value))}
                    placeholder="tile_grass_hay:2, tile_tree_oak:1"
                  />
                </div>
              </div>

              <CardAttachmentFooter title="Attributes">
                <AbilitiesEditor
                  scope="worker"
                  abilities={eff.abilities}
                  onChange={(next: AbilityInstance[]) => patch(w.id, { abilities: next })}
                />
              </CardAttachmentFooter>
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
