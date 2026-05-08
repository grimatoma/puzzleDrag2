// Workers tab — Phase 6 of the rule overhaul.
//
// Edits the type-tier worker definitions: hire-cost ramp (coins / coinsStep /
// coinsMult), max count, and the effect parameters. Patches are stored on
// `draft.workers[id]` and merge into the live `TYPE_WORKERS` array via
// `applyWorkerOverrides` in src/config/applyOverrides.js.

import { useMemo, useState } from "react";
import { TYPE_WORKERS } from "../../workers/data.js";
import { ZONE_CATEGORIES } from "../../zones/data.js";
import {
  COLORS, NumberField, Select, SmallButton, Pill, Card, SearchBar, TextArea,
} from "../shared.jsx";

// Effect-type catalog. Mirrors the cases handled by the apprentices
// aggregator. The shared form fields here drive the most common types
// (threshold / category / recipe-input). Anything more exotic falls back to
// the JSON editor below.
const EFFECT_TYPES = [
  { value: "threshold_reduce_category",
    label: "threshold_reduce_category — shave N off chain length for a category",
    fields: ["category", "from", "to"] },
  { value: "threshold_reduce",
    label: "threshold_reduce — shave N off chain length for a single tile key",
    fields: ["key", "from", "to"] },
  { value: "recipe_input_reduce",
    label: "recipe_input_reduce — drop recipe input requirement",
    fields: ["recipe", "input", "from", "to"] },
  { value: "pool_weight",
    label: "pool_weight — boost spawn weight for a tile key",
    fields: ["key", "amount"] },
  { value: "bonus_yield",
    label: "bonus_yield — extra resources per chain of a tile key",
    fields: ["key", "amount"] },
  { value: "season_bonus",
    label: "season_bonus — extra coins at season end",
    fields: ["key", "amount"] },
];

const EFFECT_TYPE_OPTIONS = EFFECT_TYPES.map((t) => ({ value: t.value, label: t.value }));
const CATEGORY_OPTIONS = [
  { value: "", label: "— pick category —" },
  ...ZONE_CATEGORIES.map((c) => ({ value: c, label: c })),
];

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

function isNumberField(name) {
  return name === "from" || name === "to" || name === "amount";
}

function effectField({ name, value, onChange }) {
  if (name === "category") {
    return (
      <Select
        value={value ?? ""}
        options={CATEGORY_OPTIONS}
        width={150}
        onChange={onChange}
      />
    );
  }
  if (isNumberField(name)) {
    return (
      <NumberField
        value={Number(value ?? 0)}
        min={0}
        max={9999}
        width={70}
        onChange={onChange}
      />
    );
  }
  // Plain text fallback for `key`, `recipe`, `input`, etc.
  return (
    <input
      className="font-mono text-[11px] px-2 py-1 rounded border"
      style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink, minWidth: 130 }}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
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
      // Drop empty top-level fields. Nested hireCost/effect objects are
      // kept as-is even when empty so the user can clear individual subfields.
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
            effect:     p.effect ?? w.effect ?? { type: "" },
          };
          const dirty = Object.keys(p).length > 0;
          const typeMeta = EFFECT_TYPES.find((t) => t.value === eff.effect.type);

          function patchHireCost(field, value) {
            const nextCost = { coins: eff.coins };
            if (eff.coinsStep > 0) nextCost.coinsStep = eff.coinsStep;
            if (eff.coinsMult !== 1) nextCost.coinsMult = eff.coinsMult;
            nextCost[field] = value;
            // Strip 0/1 defaults so the patch stays minimal.
            if ((nextCost.coinsStep ?? 0) <= 0) delete nextCost.coinsStep;
            if ((nextCost.coinsMult ?? 1) === 1) delete nextCost.coinsMult;
            patch(w.id, { hireCost: nextCost });
          }

          function patchEffect(field, value) {
            const nextEffect = { ...(eff.effect || {}) };
            nextEffect[field] = value;
            patch(w.id, { effect: nextEffect });
          }

          function changeEffectType(newType) {
            // Reset to a minimal stub when type changes so stale fields don't
            // bleed across cases.
            patch(w.id, { effect: { type: newType } });
          }

          return (
            <Card key={w.id} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 18 }}>{w.icon}</span>
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

              <div className="mb-2">
                <Label>Effect type</Label>
                <Select
                  value={eff.effect.type ?? ""}
                  options={[{ value: "", label: "— select —" }, ...EFFECT_TYPE_OPTIONS]}
                  onChange={changeEffectType}
                />
              </div>

              {typeMeta && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {typeMeta.fields.map((field) => (
                    <div key={field}>
                      <Label>{field}</Label>
                      {effectField({
                        name: field,
                        value: eff.effect[field],
                        onChange: (v) => patchEffect(field, isNumberField(field) ? Number(v) : v),
                      })}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Effect JSON (advanced)</Label>
                <TextArea
                  rows={3}
                  value={JSON.stringify(eff.effect ?? {}, null, 2)}
                  onChange={(text) => {
                    try {
                      const parsed = JSON.parse(text);
                      if (parsed && typeof parsed === "object") {
                        patch(w.id, { effect: parsed });
                      }
                    } catch {
                      // Ignore invalid JSON; the typed form fields keep working.
                    }
                  }}
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
