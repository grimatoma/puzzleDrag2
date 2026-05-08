// Buildings tab — edit name, description, level requirement, and full
// resource cost map for every town building.

import { useState, useMemo } from "react";
import { BUILDINGS, BIOMES } from "../../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select,
  SmallButton, Pill, Card, SearchBar,
} from "../shared.jsx";

const COST_KEYS = (() => {
  const out = new Set(["coins", "runes"]);
  for (const b of Object.values(BIOMES)) for (const r of b.resources) out.add(r.key);
  return [...out].sort();
})();

const COST_OPTIONS = [
  { value: "", label: "— pick resource —" },
  ...COST_KEYS.map((k) => ({ value: k, label: k })),
];

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
          };
          const dirty = Object.keys(p).length > 0;

          return (
            <Card key={b.id} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
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
                <Label>Build cost</Label>
                <div className="flex flex-col gap-1">
                  {Object.entries(eff.cost).map(([resKey, qty]) => (
                    <div key={resKey} className="flex items-center gap-2">
                      <Select
                        value={resKey}
                        options={COST_OPTIONS}
                        onChange={(v) => {
                          const next = { ...eff.cost };
                          delete next[resKey];
                          if (v) next[v] = qty;
                          patch(b.id, { cost: next });
                        }}
                      />
                      <NumberField
                        value={qty}
                        min={0}
                        max={9999}
                        width={70}
                        onChange={(v) => patch(b.id, { cost: { ...eff.cost, [resKey]: v } })}
                      />
                      <SmallButton
                        variant="danger"
                        onClick={() => {
                          const next = { ...eff.cost };
                          delete next[resKey];
                          patch(b.id, { cost: next });
                        }}
                      >
                        ✕
                      </SmallButton>
                    </div>
                  ))}
                  <SmallButton
                    onClick={() => {
                      const empty = COST_KEYS.find((k) => !(k in eff.cost)) || "";
                      if (empty) patch(b.id, { cost: { ...eff.cost, [empty]: 1 } });
                    }}
                  >
                    + Add cost line
                  </SmallButton>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  rows={2}
                  value={eff.desc}
                  onChange={(v) => patch(b.id, { desc: v })}
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
