// Buildings tab — edit name, description, level requirement, and full
// resource cost map for every town building.

import { useState, useMemo } from "react";
import { BUILDINGS, BIOMES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea,
  SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";
import AbilitiesEditor from "../AbilitiesEditor.jsx";
import { BuildingIllustration } from "../../ui/Town.jsx";
import Icon from "../../ui/Icon.jsx";

const COST_KEYS = (() => {
  const out = new Set(["coins", "runes"]);
  for (const b of Object.values(BIOMES)) for (const r of b.resources) out.add(r.key);
  return [...out].sort();
})();

export default function BuildingsTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => BUILDINGS.filter((b) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return b.id.toLowerCase().includes(q) || (b.name || "").toLowerCase().includes(q);
    }),
    [search],
  );

  function patch(id, fields) {
    updateDraft((d) => {
      const cur = d.buildings[id] || {};
      const next = { ...cur, ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] === undefined) delete next[k];
      if (Object.keys(next).length === 0) delete d.buildings[id];
      else d.buildings[id] = next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter buildings…" />
        </div>
        <Pill>{filtered.length} of {BUILDINGS.length}</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((b) => {
          const p = draft.buildings[b.id] || {};
          const eff = {
            name: p.name ?? b.name,
            desc: p.desc ?? b.desc,
            cost: p.cost ?? b.cost ?? {},
            lv:   p.lv   ?? b.lv ?? 1,
            abilities: p.abilities ?? b.abilities ?? [],
          };
          const dirty = Object.keys(p).length > 0;

          return (
            <Card key={b.id} accent={dirty ? COLORS.ember : COLORS.border}>
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
                    onClick={() => updateDraft((d) => { delete d.buildings[b.id]; })}
                  >
                    revert
                  </SmallButton>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
                <div className="col-span-2">
                  <Label>Name</Label>
                  <TextField value={eff.name} onChange={(v) => patch(b.id, { name: v })} />
                </div>
                <div>
                  <Label>Required level</Label>
                  <NumberField value={eff.lv} min={1} max={20} width={60}
                    onChange={(v) => patch(b.id, { lv: v })} />
                </div>
              </div>

              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.inkSubtle }}>
                  Build cost
                </div>
                <CostEditor
                  cost={eff.cost}
                  onChange={(nextCost) => patch(b.id, { cost: nextCost })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  rows={2}
                  value={eff.desc}
                  onChange={(v) => patch(b.id, { desc: v })}
                />
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
                <AbilitiesEditor
                  scope="building"
                  abilities={eff.abilities}
                  onChange={(next) => patch(b.id, { abilities: next })}
                />
              </div>
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

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

function CostEditor({ cost, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const available = COST_KEYS.filter(
    (k) => !(k in cost) && k.toLowerCase().includes(query.toLowerCase())
  );

  function updateCost(resKey, qty) {
    const next = { ...cost };
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
                onChange={(v) => updateCost(resKey, v)}
              />
              <SmallButton variant="danger" onClick={() => updateCost(resKey, null)}>
                ✕
              </SmallButton>
            </div>
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          Add Cost
        </div>
        <SmallButton onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? "Hide" : "Search & Add"}
        </SmallButton>
      </div>

      {pickerOpen && (
        <div className="flex flex-col gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="px-2 py-1.5 rounded border text-[12px]"
            style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink }}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {available.map((k) => (
              <button
                key={k}
                onClick={() => {
                  updateCost(k, 1);
                  setQuery("");
                }}
                className="flex items-center gap-2 text-left p-2 rounded-lg border-2 transition-colors hover:opacity-90"
                style={{ background: COLORS.parchment, borderColor: COLORS.border }}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#e0d4be]">
                  <Icon iconKey={k} size={24} />
                </div>
                <div className="text-[12px] font-bold truncate flex-1 min-w-0" style={{ color: COLORS.ink }}>
                  {k}
                </div>
              </button>
            ))}
            {available.length === 0 && (
              <div className="text-[11px] italic px-1 col-span-full" style={{ color: COLORS.inkSubtle }}>
                No matching resources.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
