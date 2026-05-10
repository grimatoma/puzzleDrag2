// Shared abilities editor used by Buildings / Workers / Powers tabs.
// Renders the list of abilities currently attached to an entity, lets the
// designer add/remove/edit them, and offers a picker of catalog entries
// whose `scope` includes the entity kind.
//
// The component is dumb — it stores nothing. The parent owns the abilities
// array (typically pulled from the live entity merged with a local draft)
// and supplies an `onChange(newAbilities)` callback.

import {
  abilitiesForScope, getAbility, defaultParamsFor,
} from "../config/abilities.js";
import { useMemo, useState } from "react";
import { BIOMES } from "../constants.js";
import { CATEGORIES } from "../features/tileCollection/data.js";
import { filterAbilityCatalog } from "./abilityPicker.js";
import { COLORS, NumberField, Select, SmallButton, Card } from "./shared.jsx";

function resourceKeyOptions() {
  const set = new Set();
  for (const b of Object.values(BIOMES)) for (const r of b.resources) set.add(r.key);
  return [
    { value: "", label: "— pick resource —" },
    ...[...set].sort().map((k) => ({ value: k, label: k })),
  ];
}

function categoryOptions() {
  return [
    { value: "", label: "— pick category —" },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
  ];
}

function biomeOptions() {
  return [
    { value: "", label: "— pick biome —" },
    ...Object.keys(BIOMES).map((k) => ({ value: k, label: k })),
  ];
}

function toolOptions() {
  // Tool keys live alongside state.tools — we don't have an authoritative
  // catalog. Provide the common ones and let designers type others freely.
  return [
    { value: "", label: "— pick tool —" },
    { value: "bomb", label: "bomb" },
    { value: "shovel", label: "shovel" },
    { value: "magic_wand", label: "magic_wand" },
    { value: "magic_seed", label: "magic_seed" },
  ];
}

function hazardOptions() {
  // Hazards aren't centrally enumerated — provide free text + common ids.
  return [
    { value: "", label: "— pick hazard —" },
    { value: "rats", label: "rats" },
    { value: "wolves", label: "wolves" },
    { value: "fire", label: "fire" },
    { value: "deadly_pests", label: "deadly_pests" },
    { value: "gas_vent", label: "gas_vent" },
    { value: "cave_in", label: "cave_in" },
  ];
}

function ParamField({ param, value, onChange }) {
  switch (param.type) {
    case "int":
      return (
        <NumberField
          value={Number(value ?? param.default ?? 0)}
          min={param.min ?? 0}
          max={param.max ?? 9999}
          width={80}
          onChange={(v) => onChange(Number(v))}
        />
      );
    case "float":
      return (
        <NumberField
          value={Number(value ?? param.default ?? 0)}
          min={param.min ?? 0}
          max={param.max ?? 1}
          step={0.05}
          width={80}
          onChange={(v) => onChange(Number(v))}
        />
      );
    case "resourceKey":
      return (
        <Select value={value ?? ""} options={resourceKeyOptions()} onChange={onChange} />
      );
    case "category":
      return (
        <Select value={value ?? ""} options={categoryOptions()} onChange={onChange} />
      );
    case "biome":
      return (
        <Select value={value ?? ""} options={biomeOptions()} onChange={onChange} />
      );
    case "tool":
      return (
        <Select value={value ?? ""} options={toolOptions()} onChange={onChange} />
      );
    case "hazard":
      return (
        <Select value={value ?? ""} options={hazardOptions()} onChange={onChange} />
      );
    case "recipe":
    default:
      return (
        <input
          className="font-mono text-[11px] px-2 py-1 rounded border"
          style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink, minWidth: 120 }}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * Props:
 *   scope:      "building" | "worker" | "tile"
 *   abilities:  Array<{ id, params, trigger? }>
 *   onChange:   (newAbilities) => void
 */
export default function AbilitiesEditor({ scope, abilities, onChange }) {
  const list = Array.isArray(abilities) ? abilities : [];
  const catalog = abilitiesForScope(scope);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredCatalog = useMemo(() => {
    return filterAbilityCatalog(catalog, query);
  }, [catalog, query]);

  function add(abilityId) {
    const def = getAbility(abilityId);
    if (!def) return;
    onChange([...list, { id: abilityId, params: defaultParamsFor(abilityId) }]);
  }

  function removeAt(idx) {
    onChange(list.filter((_, i) => i !== idx));
  }

  function updateParam(idx, key, value) {
    onChange(list.map((a, i) => i === idx ? { ...a, params: { ...(a.params || {}), [key]: value } } : a));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
        Abilities ({list.length})
      </div>

      {list.length === 0 && (
        <div
          className="text-center py-3 text-[12px] italic rounded-lg border-2 border-dashed"
          style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}
        >
          No abilities attached. Pick one below.
        </div>
      )}

      {list.map((inst, idx) => {
        const def = getAbility(inst?.id);
        if (!def) {
          return (
            <Card key={idx}>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: COLORS.red }}>
                  ⚠ Unknown ability id: <code>{inst?.id}</code>
                </span>
                <SmallButton variant="danger" onClick={() => removeAt(idx)}>remove</SmallButton>
              </div>
            </Card>
          );
        }
        return (
          <Card key={idx}>
            <div className="flex items-start justify-between mb-1.5 gap-2">
              <div>
                <div className="text-[13px] font-bold" style={{ color: COLORS.ember }}>
                  {def.icon} {def.name}
                </div>
                <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                  {def.desc}
                </div>
              </div>
              <SmallButton variant="danger" onClick={() => removeAt(idx)}>✕</SmallButton>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {def.params.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color: COLORS.ink }}>
                    {p.label}
                  </span>
                  <ParamField
                    param={p}
                    value={inst.params?.[p.key]}
                    onChange={(v) => updateParam(idx, p.key, v)}
                  />
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
          Add ability
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
            placeholder="Search abilities by name, id, or description…"
            className="px-2 py-1.5 rounded border text-[12px]"
            style={{ background: "#fffaf1", borderColor: COLORS.border, color: COLORS.ink }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredCatalog.map((def) => (
              <button
                key={def.id}
                onClick={() => add(def.id)}
                className="flex flex-col items-start text-left p-2 rounded-lg border-2 transition-colors hover:opacity-90"
                style={{ background: COLORS.parchment, borderColor: COLORS.border }}
              >
                <div className="text-[12px] font-bold" style={{ color: COLORS.ember }}>
                  {def.icon} {def.name}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: COLORS.inkSubtle }}>
                  {def.id}
                </div>
                <div className="text-[10px] italic mt-0.5" style={{ color: COLORS.inkSubtle }}>
                  {def.desc}
                </div>
              </button>
            ))}
            {filteredCatalog.length === 0 && (
              <div className="text-[11px] italic px-1" style={{ color: COLORS.inkSubtle }}>
                No matching abilities.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
