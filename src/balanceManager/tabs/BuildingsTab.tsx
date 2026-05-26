// Buildings tab — edit name, description, level requirement, and full
// resource cost map for every town building.

import React, { useState, useMemo } from "react";
import { BUILDINGS, BIOMES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea,
  SmallButton, Pill, Card, SearchBar, SearchAndAddPicker,
} from "../shared.jsx";
import AbilitiesEditor, { type AbilityInstance } from "../AbilitiesEditor.jsx";
import { CardAttachmentFooter, focusHighlightProps, useScrollToFocus } from "../relational.jsx";
import { useBalanceNav } from "../balanceNav.jsx";
import { BuildingIllustration } from "../../ui/Town.jsx";
import Icon from "../../ui/Icon.jsx";
import { analyseBuildingCosts } from "../buildingCosts.js";
import MetricCard from "../../ui/primitives/MetricCard.jsx";
import type { BalanceDraft, TabProps } from "../index.jsx";

type CostMap = Record<string, number>;

interface BuildingOverride {
  name?: string;
  desc?: string;
  cost?: CostMap;
  lv?: number;
  abilities?: AbilityInstance[];
  [extra: string]: unknown;
}

interface BuildingDef {
  id: string;
  name: string;
  desc: string;
  cost: CostMap;
  lv: number;
  biome?: string;
  abilities?: AbilityInstance[];
  [extra: string]: unknown;
}

// Canonical cost-key list, derived from the live data (every biome resource +
// the two currencies) — never hardcoded. Feeds the CostEditor's add picker.
const COST_KEYS = (() => {
  const out = new Set(["coins", "runes"]);
  for (const b of Object.values(BIOMES)) for (const r of [...b.tiles, ...b.resources]) out.add(r.key);
  return [...out].sort();
})();

export default function BuildingsTab({ draft, updateDraft, focus }: TabProps) {
  const { focus: navFocus } = useBalanceNav();
  const activeFocus = focus ?? navFocus;
  useScrollToFocus(activeFocus);

  const [search, setSearch] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const analysis = useMemo(() => analyseBuildingCosts(), []);

  const buildings = BUILDINGS as unknown as readonly BuildingDef[];

  const filtered = useMemo(
    () => buildings.filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return b.id.toLowerCase().includes(q) || (b.name || "").toLowerCase().includes(q);
    }),
    [search, buildings],
  );

  function patch(id: string, fields: BuildingOverride) {
    updateDraft((d: BalanceDraft) => {
      const buildingsMap = d.buildings as Record<string, BuildingOverride>;
      const cur: BuildingOverride = buildingsMap[id] || {};
      const next: BuildingOverride = { ...cur, ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete buildingsMap[id];
      else buildingsMap[id] = next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter buildings…" />
        </div>
        <SmallButton onClick={() => setAnalysisOpen((v) => !v)}>
          {analysisOpen ? "Hide" : "Show"} cost summary
        </SmallButton>
        <Pill>{filtered.length} of {BUILDINGS.length}</Pill>
      </div>

      {analysisOpen && (
        <Card title="Total town cost — every building summed">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <CostStat label="Coins" value={analysis.totals.coins.toLocaleString()} accent="warm" />
            <CostStat label="Runes" value={analysis.totals.runes} accent="cool" />
            <CostStat label="Embers" value={analysis.totals.embers} accent="warm" />
            <CostStat label="Core ingots" value={analysis.totals.coreIngots} accent="cool" />
          </div>
          <div className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: COLORS.inkSubtle }}>
            Resources demanded ({analysis.perResource.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {analysis.perResource.map((r) => (
              <div key={r.key} className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.ink }}>
                <Icon iconKey={r.key} size={14} />
                <span className="font-bold" style={{ minWidth: 130 }}>{r.label}</span>
                <span className="font-mono" style={{ color: COLORS.emberDeep, minWidth: 60 }}>{r.qty.toLocaleString()}</span>
                <span className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>
                  used by {r.usedBy.length} building{r.usedBy.length === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((b) => {
          const p: BuildingOverride = (draft.buildings[b.id] as BuildingOverride | undefined) || {};
          const eff = {
            name: p.name ?? b.name,
            desc: p.desc ?? b.desc,
            cost: p.cost ?? b.cost ?? {},
            lv:   p.lv   ?? b.lv ?? 1,
            abilities: p.abilities ?? b.abilities ?? [],
          };
          const dirty = Object.keys(p).length > 0;
          const hi = focusHighlightProps(b.id, activeFocus);

          return (
            <Card key={b.id} id={hi.id} style={hi.ringStyle} accent={dirty || hi.isFocused ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="relative shrink-0 rounded border overflow-hidden"
                    style={{ width: 36, height: 36, borderColor: COLORS.border, background: COLORS.parchment }}
                    title={`${eff.name} icon`}
                  >
                    <BuildingIllustration id={b.id} isBuilt />
                  </div>
                  <code
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                  >
                    {b.id}
                  </code>
                  <Pill>lv ≥ {eff.lv}</Pill>
                  {b.biome && <Pill>{b.biome}</Pill>}
                </div>
                {dirty && (
                  <SmallButton
                    variant="ghost"
                    onClick={() => updateDraft((d: BalanceDraft) => { delete d.buildings[b.id]; })}
                  >
                    revert
                  </SmallButton>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
                <div className="col-span-2">
                  <Label>Name</Label>
                  <TextField value={eff.name} onChange={(v: string) => patch(b.id, { name: v })} />
                </div>
                <div>
                  <Label>Required level</Label>
                  <NumberField value={eff.lv} min={1} max={20} width={60}
                    onChange={(v: number) => patch(b.id, { lv: v })} />
                </div>
              </div>

              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>
                  Build cost
                </div>
                <CostEditor
                  cost={eff.cost}
                  onChange={(nextCost: CostMap) => patch(b.id, { cost: nextCost })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  rows={2}
                  value={eff.desc}
                  onChange={(v: string) => patch(b.id, { desc: v })}
                />
              </div>

              <CardAttachmentFooter title="Attributes">
                <AbilitiesEditor
                  scope="building"
                  abilities={eff.abilities}
                  onChange={(next: AbilityInstance[]) => patch(b.id, { abilities: next })}
                />
              </CardAttachmentFooter>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No buildings match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

function CostEditor({ cost, onChange }: { cost: CostMap; onChange: (next: CostMap) => void }) {
  const availableOptions = useMemo(() => {
    return COST_KEYS.filter((k) => !(k in cost)).map((k) => ({
      id: k,
      searchText: k,
      renderNode: (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#e0d4be]">
            <Icon iconKey={k} size={24} />
          </div>
          <div className="text-[12px] font-bold truncate flex-1 min-w-0" style={{ color: COLORS.ink }}>
            {k}
          </div>
        </div>
      )
    }));
  }, [cost]);

  function updateCost(resKey: string, qty: number | null) {
    const next: CostMap = { ...cost };
    if (qty === null || qty === undefined || qty <= 0) {
      delete next[resKey];
    } else {
      next[resKey] = qty;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.keys(cost).length === 0 && (
        <div
          className="text-center py-3 text-[12px] italic rounded-lg border-2 border-dashed"
          style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}
        >
          No costs added.
        </div>
      )}

      {Object.entries(cost).map(([resKey, qty]) => (
        <Card key={resKey}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon iconKey={resKey} size={20} />
              <span className="text-[12px] font-bold" style={{ color: COLORS.ink }}>
                {resKey}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NumberField
                value={qty}
                min={1}
                max={9999}
                width={70}
                onChange={(v: number) => updateCost(resKey, v)}
              />
              <SmallButton variant="danger" onClick={() => updateCost(resKey, null)}>
                ✕
              </SmallButton>
            </div>
          </div>
        </Card>
      ))}

      <SearchAndAddPicker
        label="Add Cost"
        placeholder="Search resources…"
        options={availableOptions}
        onSelect={(k: string) => updateCost(k, 1)}
        gridClass="grid-cols-2 md:grid-cols-3"
      />
    </div>
  );
}


function CostStat({ label, value, accent }: { label: React.ReactNode; value: React.ReactNode; accent?: string }) {
  return <MetricCard label={label} value={value} hint={null} tone={accent === "warm" ? "ember" : "success"} />;
}
