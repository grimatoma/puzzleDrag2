// Zones tab — Dev Panel.
//
// Edits per-zone settings: name, board flags (hasFarm/hasMine/hasWater),
// buildings list, baseTurns, entry cost, upgrade map, and per-session-season
// drop-rate percentages.
//
// Patches are stored on `draft.zones[zoneId]`. They merge into the live
// ZONES table at module load via `applyZoneOverrides` in
// src/config/applyOverrides.js.

import { useMemo, useState } from "react";
import { ZONES, ZONE_CATEGORIES, ZONE_UPGRADE_TARGET_GOLD } from "../../features/zones/data.js";
import { BUILDINGS } from "../../constants.js";
import {
  COLORS, NumberField, Select, SmallButton, Pill, Card, SearchBar, SearchAndAddPicker,
} from "../shared.jsx";
import { BuildingIllustration } from "../../ui/Town.jsx";

const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];

const TARGET_OPTIONS = [
  { value: "", label: "— none —" },
  ...ZONE_CATEGORIES.map((c) => ({ value: c, label: c })),
  { value: ZONE_UPGRADE_TARGET_GOLD, label: "gold (board-only tile)" },
];

function Label({ children: any }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>
      {children}
    </div>
  );
}

function Toggle({ value: any, onChange: any, label: any }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 text-[10px] font-bold transition-colors"
      style={{
        background:   value ? "#91bf24" : COLORS.parchmentDeep,
        borderColor:  value ? "#6a9010" : COLORS.border,
        color:        value ? "#fff" : COLORS.inkSubtle,
      }}
    >
      <span>{value ? "✓" : "○"}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ZonesTab({ draft: any, updateDraft: any }) {
  const [search, setSearch] = useState("");
  const zoneList = useMemo(() => Object.values(ZONES), []);
  const buildingById = useMemo(
    () => Object.fromEntries(BUILDINGS.map((b) => [b.id, b])),
    [],
  );
  const filtered = useMemo(
    () => zoneList.filter((z) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return z.id.toLowerCase().includes(q) || (z.name || "").toLowerCase().includes(q);
    }),
    [search, zoneList],
  );

  function patch(zoneId: any, fields: any) {
    updateDraft((d: any) => {
      d.zones ??= {};
      const cur = d.zones[zoneId] || {};
      const next = { ...cur, ...fields };
      // Drop empty fields so the patch stays minimal.
      for (const k of Object.keys(next)) {
        if (next[k] === "" || next[k] === undefined || next[k] === null) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.zones[zoneId];
      else d.zones[zoneId] = next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter zones…" />
        </div>
        <Pill>{filtered.length} of {zoneList.length}</Pill>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((z) => {
          const p = (draft.zones || {})[z.id] || {};
          const eff = {
            name:          p.name          ?? z.name          ?? z.id,
            hasFarm:       p.hasFarm       ?? z.hasFarm       ?? false,
            hasMine:       p.hasMine       ?? z.hasMine       ?? false,
            hasWater:      p.hasWater      ?? z.hasWater      ?? false,
            buildings:     p.buildings     ?? z.buildings     ?? [],
            baseTurns:     p.baseTurns     ?? z.baseTurns ?? 10,
            entryCoins:    (p.entryCost?.coins) ?? (z.entryCost?.coins ?? 50),
            upgradeMap:    p.upgradeMap    ?? z.upgradeMap    ?? {},
            seasonDrops:   p.seasonDrops   ?? z.seasonDrops   ?? {},
          };
          const dirty = Object.keys(p).length > 0;
          const sourceCats = Array.from(new Set([
            ...Object.keys(eff.upgradeMap),
            ...ZONE_CATEGORIES,
          ]));

          return (
            <Card key={z.id} accent={dirty ? COLORS.ember : COLORS.border}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <code
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}
                  >
                    {z.id}
                  </code>
                  <span className="font-bold text-[13px]" style={{ color: COLORS.ink }}>{eff.name}</span>
                </div>
                {dirty && (
                  <SmallButton
                    variant="ghost"
                    onClick={() => updateDraft((d: any) => { d.zones ??= {}; delete d.zones[z.id]; })}
                  >
                    revert
                  </SmallButton>
                )}
              </div>

              {/* Name */}
              <div className="mb-3">
                <Label>Display name</Label>
                <input
                  type="text"
                  value={eff.name}
                  onChange={(e) => patch(z.id, { name: e.target.value })}
                  className="w-full text-[11px] px-2 py-1 rounded border outline-none"
                  style={{
                    background: COLORS.parchmentDeep,
                    borderColor: COLORS.border,
                    color: COLORS.ink,
                  }}
                />
              </div>

              {/* Board toggles */}
              <div className="mb-3">
                <Label>Available puzzle boards</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Toggle
                    value={eff.hasFarm}
                    label="🌾 Farm"
                    onChange={(v: any) => patch(z.id, { hasFarm: v })}
                  />
                  <Toggle
                    value={eff.hasMine}
                    label="⛏ Mine"
                    onChange={(v: any) => patch(z.id, { hasMine: v })}
                  />
                  <Toggle
                    value={eff.hasWater}
                    label="⚓ Harbor"
                    onChange={(v: any) => patch(z.id, { hasWater: v })}
                  />
                </div>
              </div>

              {/* Buildings */}
              <div className="mb-3">
                <Label>Buildings available in this town ({eff.buildings.length})</Label>
                <BuildingsPicker
                  selectedIds={eff.buildings}
                  buildingById={buildingById}
                  onChange={(next: any) => patch(z.id, { buildings: next })}
                />
              </div>

              {/* Turn budget + entry cost */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                <div>
                  <Label>Base turns</Label>
                  <NumberField
                    value={eff.baseTurns}
                    min={4}
                    max={64}
                    width={70}
                    onChange={(v: any) => patch(z.id, { baseTurns: v })}
                  />
                </div>
                <div>
                  <Label>Entry cost (coins)</Label>
                  <NumberField
                    value={eff.entryCoins}
                    min={0}
                    max={9999}
                    width={80}
                    onChange={(v: any) => patch(z.id, { entryCost: { coins: v } })}
                  />
                </div>
              </div>

              {/* Upgrade map */}
              <div className="mb-3">
                <Label>Upgrade map · chain redirect</Label>
                <div className="flex flex-col gap-1">
                  {sourceCats.map((src) => (
                    <div key={src} className="flex items-center gap-2">
                      <code
                        className="font-mono text-[11px] px-1.5 py-0.5 rounded min-w-[110px]"
                        style={{ background: COLORS.parchmentDeep, color: COLORS.ink }}
                      >
                        {src}
                      </code>
                      <span style={{ color: COLORS.inkSubtle }}>→</span>
                      <Select
                        value={eff.upgradeMap[src] ?? ""}
                        options={TARGET_OPTIONS}
                        width={180}
                        onChange={(v: any) => {
                          const next = { ...eff.upgradeMap };
                          if (!v) delete next[src];
                          else next[src] = v;
                          patch(z.id, { upgradeMap: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Season drops */}
              <div>
                <Label>Season drops · % per category</Label>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: COLORS.border }}>
                  <table className="min-w-full text-[10px]">
                    <thead>
                      <tr style={{ background: COLORS.parchmentDeep }}>
                        <th
                          className="text-left px-2 py-1.5 font-bold whitespace-nowrap"
                          style={{ color: COLORS.ink, borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          Tile Type
                        </th>
                        {SEASON_NAMES.map((season) => (
                          <th
                            key={season}
                            className="text-left px-2 py-1.5 font-bold whitespace-nowrap"
                            style={{ color: COLORS.ink, borderBottom: `1px solid ${COLORS.border}` }}
                          >
                            {season}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ZONE_CATEGORIES.map((cat) => (
                        <tr key={cat}>
                          <td className="px-2 py-1.5 align-middle" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                            <code
                              className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: COLORS.parchmentDeep, color: COLORS.ink }}
                            >
                              {cat}
                            </code>
                          </td>
                          {SEASON_NAMES.map((season) => {
                            const table = eff.seasonDrops[season] ?? {};
                            return (
                              <td
                                key={`${cat}-${season}`}
                                className="px-2 py-1.5 align-middle"
                                style={{ borderBottom: `1px solid ${COLORS.border}` }}
                              >
                                <NumberField
                                  value={Number(((table[cat] ?? 0)).toFixed(3))}
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  width={70}
                                  onChange={(v: any) => {
                                    const nextTable = { ...table };
                                    if (v <= 0) delete nextTable[cat];
                                    else nextTable[cat] = v;
                                    const nextDrops = { ...eff.seasonDrops, [season]: nextTable };
                                    patch(z.id, { seasonDrops: nextDrops });
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr style={{ background: COLORS.parchmentDeep }}>
                        <td className="px-2 py-1.5 font-bold" style={{ color: COLORS.ink }}>Total</td>
                        {SEASON_NAMES.map((season) => {
                          const table = eff.seasonDrops[season] ?? {};
                          const total = Object.values(table).reduce((a, b) => a + (Number(b) || 0), 0);
                          return (
                            <td key={`total-${season}`} className="px-2 py-1.5">
                              <Pill>{total.toFixed(2)}</Pill>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] mt-2" style={{ color: COLORS.inkSubtle }}>
                  Each season's percentages are normalised by the spawn sampler;
                  setting them to sum to 1.0 keeps the math intuitive but the
                  engine accepts any non-negative weights.
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No zones match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function BuildingIcon({ id: any, size = 28 }) {
  return (
    <div
      className="relative shrink-0 rounded border overflow-hidden"
      style={{ width: size, height: size, borderColor: COLORS.border, background: COLORS.parchment }}
      aria-hidden
    >
      <BuildingIllustration id={id} isBuilt />
    </div>
  );
}

function BuildingsPicker({ selectedIds: any, buildingById: any, onChange: any }) {
  const selected = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds : []),
    [selectedIds],
  );

  const pickerOptions = useMemo(() => {
    const taken = new Set(selected);
    return BUILDINGS
      .filter((b) => !taken.has(b.id))
      .map((b) => ({
        id: b.id,
        searchText: `${b.id} ${b.name} ${b.desc || ""} ${b.biome || ""}`,
        renderNode: (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <BuildingIcon id={b.id} size={32} />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <div className="text-[12px] font-bold truncate w-full" style={{ color: COLORS.ink }}>
                {b.name}
              </div>
              <div className="text-[10px] font-mono truncate w-full" style={{ color: COLORS.inkSubtle }}>
                {b.id}
              </div>
            </div>
          </div>
        ),
      }));
  }, [selected]);

  function addBuilding(id: any) {
    if (selected.includes(id)) return;
    onChange([...selected, id]);
  }

  function removeBuilding(id: any) {
    onChange(selected.filter((bid) => bid !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length === 0 ? (
        <div
          className="text-center py-3 text-[11px] italic rounded-lg border-2 border-dashed"
          style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}
        >
          No buildings added. Pick one below.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const b = buildingById[id];
            return (
              <div
                key={id}
                className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg border"
                style={{
                  background: "rgba(145,191,36,0.15)",
                  borderColor: "#6a9010",
                  color: "#3a5010",
                }}
              >
                <BuildingIcon id={id} size={24} />
                <span className="text-[11px] font-bold">
                  {b ? b.name : id}
                </span>
                <button
                  onClick={() => removeBuilding(id)}
                  className="ml-0.5 text-[11px] font-bold rounded px-1 leading-none hover:opacity-80"
                  style={{ color: COLORS.red }}
                  title={`Remove ${b ? b.name : id}`}
                  aria-label={`Remove ${b ? b.name : id}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <SearchAndAddPicker
        label="Add building"
        placeholder="Search buildings by name, id, or biome…"
        options={pickerOptions}
        onSelect={addBuilding}
        gridClass="grid-cols-1 md:grid-cols-2"
      />
    </div>
  );
}
