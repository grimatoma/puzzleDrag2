// Resources tab — edit per-resource fields (label, value, next, glyph,
// description, color). The icon picker is a dropdown of every key
// registered in the procedural icon registry.

import { useState, useMemo } from "react";
import { BIOMES } from "../../constants.js";
import {
  COLORS, NumberField, TextField, TextArea, Select, ColorField,
  SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";

const BIOME_TABS = [
  { id: "farm", label: "Farm",   icon: "🌾" },
  { id: "mine", label: "Mine",   icon: "⛏" },
  { id: "fish", label: "Harbor", icon: "🐟" },
];

export default function ResourcesTab({ draft, updateDraft }) {
  const [biome, setBiome] = useState("farm");
  const [search, setSearch] = useState("");

  const resources = BIOMES[biome]?.resources ?? [];

  const allResourceKeys = useMemo(() => {
    const keys = new Set();
    for (const b of Object.values(BIOMES)) {
      for (const r of b.resources) keys.add(r.key);
    }
    return [...keys].sort();
  }, []);

  const nextOptions = useMemo(
    () => [{ value: "", label: "— none (terminal) —" },
            ...allResourceKeys.map((k) => ({ value: k, label: k }))],
    [allResourceKeys],
  );

  const filtered = resources.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.key.toLowerCase().includes(q) || (r.label || "").toLowerCase().includes(q);
  });

  function patchResource(key, fields) {
    updateDraft((d) => {
      const cur = d.resources[key] || {};
      const next = { ...cur, ...fields };
      // Drop empty patches to keep the JSON tidy.
      for (const k of Object.keys(next)) {
        if (next[k] === "" || next[k] === undefined) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.resources[key];
      else d.resources[key] = next;
    });
  }

  function patchDescription(tileId, value) {
    updateDraft((d) => {
      if (!value) delete d.tileDescriptions[tileId];
      else d.tileDescriptions[tileId] = value;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Biome switcher + search */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-shrink-0">
          {BIOME_TABS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBiome(b.id)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg border-2 transition-colors"
              style={
                biome === b.id
                  ? { background: COLORS.ember, borderColor: COLORS.emberDeep, color: "#fff" }
                  : { background: COLORS.parchmentDeep, borderColor: COLORS.border, color: COLORS.inkLight }
              }
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={`Filter ${BIOMES[biome]?.name ?? ""} resources by key or label…`} />
        </div>
        <Pill>{filtered.length} of {resources.length}</Pill>
      </div>

      {/* Resource list */}
      <div className="flex flex-col gap-2">
        {filtered.map((r) => {
          const patch = draft.resources[r.key] || {};
          // Effective (preview) values combine the runtime resource (which already
          // includes any committed overrides) with the in-progress draft patch.
          const eff = {
            label:       patch.label       ?? r.label,
            color:       patch.color       ?? r.color,
            dark:        patch.dark        ?? r.dark,
            value:       patch.value       ?? r.value,
            next:        patch.next        ?? r.next ?? "",
            glyph:       patch.glyph       ?? r.glyph ?? "",
            description: patch.description ?? r.description ?? "",
          };
          const tileDescPatch = draft.tileDescriptions[r.key];
          const tileDesc = tileDescPatch ?? eff.description;
          const dirty = Object.keys(patch).length > 0 || tileDescPatch !== undefined;

          return (
            <Card key={r.key} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex gap-3">
                <TileSwatch color={eff.color} glyph={eff.glyph} size={48} />
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {/* Key (read-only) */}
                  <div className="col-span-2 flex items-center gap-2 mb-1">
                    <code
                      className="font-mono text-[11px] px-1.5 py-0.5 rounded"
                      style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                    >
                      {r.key}
                    </code>
                    {dirty && <Pill color="#fff" bg={COLORS.ember}>edited</Pill>}
                    {dirty && (
                      <SmallButton
                        variant="ghost"
                        onClick={() => {
                          updateDraft((d) => {
                            delete d.resources[r.key];
                            delete d.tileDescriptions[r.key];
                          });
                        }}
                      >
                        revert
                      </SmallButton>
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <Label>Label</Label>
                    <TextField value={eff.label} onChange={(v) => patchResource(r.key, { label: v })} />
                  </div>
                  {/* Glyph */}
                  <div>
                    <Label>Glyph (emoji)</Label>
                    <TextField value={eff.glyph} onChange={(v) => patchResource(r.key, { glyph: v })} />
                  </div>

                  {/* Sale value */}
                  <div>
                    <Label>Sale value</Label>
                    <NumberField value={eff.value} min={0} max={9999}
                      onChange={(v) => patchResource(r.key, { value: v })} width={80} />
                  </div>
                  {/* Color */}
                  <div>
                    <Label>Color</Label>
                    <ColorField value={eff.color} onChange={(v) => patchResource(r.key, { color: v })} />
                  </div>

                  {/* Next-tier upgrade */}
                  <div className="col-span-2">
                    <Label>Next-tier upgrade target</Label>
                    <Select value={eff.next} options={nextOptions}
                      onChange={(v) => patchResource(r.key, { next: v })} />
                  </div>

                  {/* Resource description */}
                  <div className="col-span-2">
                    <Label>Resource description (BIOMES)</Label>
                    <TextArea
                      rows={2}
                      value={eff.description}
                      placeholder="Short flavor text shown in tooltips."
                      onChange={(v) => patchResource(r.key, { description: v })}
                    />
                  </div>

                  {/* Tile description (used by tile collection screen) */}
                  <div className="col-span-2">
                    <Label>Tile-collection description</Label>
                    <TextArea
                      rows={2}
                      value={tileDesc}
                      placeholder="Long-form description for the Tile Collection screen."
                      onChange={(v) => patchDescription(r.key, v)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No resources match your filter.
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
