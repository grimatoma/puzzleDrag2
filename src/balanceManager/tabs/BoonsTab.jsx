// Boons tab — Balance Manager.
//
// Read-only browser over the boon catalogs (see src/features/boons/data.js).
// Each catalog row shows the id, name, description, cost and effect. The
// table is keyed by `${type}_${path}` (e.g. farm_coexist).
//
// Editing wires up in a follow-up: add an `applyBoonOverrides` to
// src/config/applyOverrides.js (paralleling applyKeeperOverrides), then this
// tab can edit name/desc/cost/effect params.

import { BOONS } from "../../features/boons/data.js";
import { COLORS, Card } from "../shared.jsx";

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
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Read-only browser. Boons are purchased in-game from the Boons screen after the player faces a settlement's keeper. Editing names / costs / effects wires up in a follow-up.
      </div>
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
                {list.map((b) => (
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
