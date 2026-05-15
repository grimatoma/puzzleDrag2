// Boons tab — Balance Manager.
//
// Read-only browser over the boon catalogs (see src/features/boons/data.js).
// Each catalog row shows the id, name, description, cost and effect. The
// table is keyed by `${type}_${path}` (e.g. farm_coexist).
//
// Editing wires up in a follow-up: add an `applyBoonOverrides` to
// src/config/applyOverrides.js (paralleling applyKeeperOverrides), then this
// tab can edit name/desc/cost/effect params.

import { useMemo, useState } from "react";
import { BOONS } from "../../features/boons/data.js";
import { COLORS, Card, SearchBar } from "../shared.jsx";

function summariseBoons() {
  let totalCount = 0;
  let totalEmbers = 0;
  let totalCore = 0;
  const perCatalog = [];
  for (const [catalogKey, list] of Object.entries(BOONS || {})) {
    let embers = 0;
    let core = 0;
    for (const b of list) {
      embers += b?.cost?.embers || 0;
      core += b?.cost?.coreIngots || 0;
    }
    totalCount += list.length;
    totalEmbers += embers;
    totalCore += core;
    perCatalog.push({ catalogKey, count: list.length, embers, core });
  }
  return { totalCount, totalEmbers, totalCore, perCatalog };
}

const PATH_LABEL = { coexist: "🤝 Coexist", driveout: "⚔ Drive Out" };
const TYPE_LABEL = { farm: "Farm", mine: "Mine", harbor: "Harbor" };

function CostStr({ cost }) {
  const parts = [];
  if ((cost.embers ?? 0) > 0) parts.push(`🔥 ${cost.embers}`);
  if ((cost.coreIngots ?? 0) > 0) parts.push(`▣ ${cost.coreIngots}`);
  return <span style={{ color: COLORS.ink }}>{parts.join(" · ")}</span>;
}

function EffectStr({ effect }) {
  if (!effect) return <span style={{ color: COLORS.inkSubtle }}>—</span>;
  return (
    <span style={{ color: COLORS.ink }}>
      <code style={{ background: COLORS.parchmentDeep, padding: "1px 4px", borderRadius: 4 }}>{effect.type}</code>
      {effect.params && Object.entries(effect.params).map(([k, v]) => <> · {k}={String(v)}</>)}
    </span>
  );
}

export default function BoonsTab() {
  const summary = useMemo(summariseBoons, []);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
            style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}>
            <div className="text-[18px] font-bold" style={{ color: COLORS.ink }}>{summary.totalCount}</div>
            <div className="text-[10px] uppercase font-bold" style={{ color: COLORS.inkSubtle }}>Total boons</div>
          </div>
          <div className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
            style={{ background: "rgba(214,97,42,0.10)", borderColor: COLORS.ember }}>
            <div className="text-[18px] font-bold" style={{ color: COLORS.emberDeep }}>🔥 {summary.totalEmbers}</div>
            <div className="text-[10px] uppercase font-bold" style={{ color: COLORS.inkSubtle }}>Total embers</div>
          </div>
          <div className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
            style={{ background: "rgba(150,165,190,0.14)", borderColor: COLORS.border }}>
            <div className="text-[18px] font-bold" style={{ color: COLORS.inkLight }}>▣ {summary.totalCore}</div>
            <div className="text-[10px] uppercase font-bold" style={{ color: COLORS.inkSubtle }}>Total core ingots</div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {summary.perCatalog.map((row) => (
            <div key={row.catalogKey} className="flex items-center gap-3 text-[11px]">
              <code className="font-mono" style={{ color: COLORS.emberDeep, minWidth: 110 }}>{row.catalogKey}</code>
              <span style={{ color: COLORS.inkLight }}>{row.count} boon{row.count === 1 ? "" : "s"}</span>
              <span className="font-mono" style={{ color: COLORS.inkSubtle, minWidth: 80 }}>🔥 {row.embers}</span>
              <span className="font-mono" style={{ color: COLORS.inkSubtle, minWidth: 80 }}>▣ {row.core}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Read-only browser. Boons are purchased in-game from the Boons screen after the player faces a settlement's keeper. Editing names / costs / effects wires up in a follow-up.
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Filter by id, name, description, effect…" />
      {Object.entries(BOONS).map(([catalogKey, list]) => {
        const [type, path] = catalogKey.split("_");
        return (
          <Card key={catalogKey} title={`${TYPE_LABEL[type] ?? type} · ${PATH_LABEL[path] ?? path}`}>
            <table className="w-full text-[12px]" style={{ color: COLORS.ink }}>
              <thead>
                <tr style={{ background: COLORS.parchmentDeep }}>
                  <th className="text-left px-2 py-1" style={{ fontSize: 10 }}>ID</th>
                  <th className="text-left px-2 py-1" style={{ fontSize: 10 }}>Name</th>
                  <th className="text-left px-2 py-1" style={{ fontSize: 10 }}>Cost</th>
                  <th className="text-left px-2 py-1" style={{ fontSize: 10 }}>Effect</th>
                  <th className="text-left px-2 py-1" style={{ fontSize: 10 }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {list.filter((b) => {
                  if (!q) return true;
                  return (b.id || "").toLowerCase().includes(q) || (b.name || "").toLowerCase().includes(q)
                    || (b.desc || "").toLowerCase().includes(q) || (b.effect?.type || "").toLowerCase().includes(q);
                }).map((b) => (
                  <tr key={b.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td className="px-2 py-1"><code style={{ fontSize: 11 }}>{b.id}</code></td>
                    <td className="px-2 py-1 font-bold">{b.name}</td>
                    <td className="px-2 py-1"><CostStr cost={b.cost ?? {}} /></td>
                    <td className="px-2 py-1"><EffectStr effect={b.effect} /></td>
                    <td className="px-2 py-1 leading-snug" style={{ maxWidth: 320 }}>{b.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}
