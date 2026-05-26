// Tile Discovery Methods — reference catalog of every way a tile can be
// unlocked. Mirrors ToolPowersReferenceTab / AbilitiesReferenceTab.
//
// For each method: name, id, description, param schema, and the live list
// of tiles currently using it (pulled from TILE_TYPES). Read-only — the
// catalog is code-owned (src/config/tileDiscoveryMethods.js).

import { TILE_DISCOVERY_METHODS } from "../../config/tileDiscoveryMethods.js";
import { TILE_TYPES } from "../../features/tileCollection/data.js";
import { COLORS, Card } from "../shared.jsx";

function tilesUsing(methodId: string): string[] {
  return TILE_TYPES
    .filter((t) => t.discovery?.method === methodId)
    .map((t) => t.id)
    .sort();
}

function defaultLabel(p: { default?: unknown }): string {
  if (p.default === undefined) return "—";
  return String(p.default);
}

export default function TileDiscoveryReferenceTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-[12px]" style={{ color: COLORS.inkSubtle }}>
          Catalog of all tile discovery methods from <code>src/config/tileDiscoveryMethods.js</code>.
          A tile's <code>discovery.method</code> field picks one of these; the params on the same
          object configure it. Used by the Tiles editor's Discovery section and consumed at
          runtime in <code>src/state.js</code>, <code>src/state/helpers.js</code>, and{" "}
          <code>src/features/tileCollection/effects.js</code>.
        </div>
      </Card>

      {TILE_DISCOVERY_METHODS.map((method) => {
        const using = tilesUsing(method.id);
        return (
          <Card key={method.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <div className="text-[14px] font-bold" style={{ color: COLORS.ember }}>
                  {method.name}
                </div>
                <div className="font-mono text-[11px]" style={{ color: COLORS.inkSubtle }}>
                  {method.id}
                </div>
              </div>
              <div className="text-[10px] px-2 py-1 rounded border" style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}>
                {using.length} {using.length === 1 ? "tile" : "tiles"}
              </div>
            </div>

            <div className="text-[12px] italic mb-2" style={{ color: COLORS.inkSubtle }}>{method.desc}</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Config options</div>
                {(method.params?.length ?? 0) === 0 ? (
                  <div className="text-[11px]" style={{ color: COLORS.inkSubtle }}>No params.</div>
                ) : (
                  <ul className="text-[11px] list-disc pl-4" style={{ color: COLORS.inkSubtle }}>
                    {method.params.map((p) => (
                      <li key={p.key}>
                        <span className="font-mono" style={{ color: COLORS.ink }}>{p.key}</span>
                        {" "}({p.type}) — {p.label}; default: <span className="font-mono">{defaultLabel(p)}</span>
                        {p.type === "int" && (p.min !== undefined || p.max !== undefined) && (
                          <span> · range {p.min ?? 0}–{p.max ?? "∞"}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase mb-1" style={{ color: COLORS.ink }}>Tiles using this method</div>
                {using.length === 0 ? (
                  <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
                    No tiles currently use this method.
                  </div>
                ) : (
                  <div className="text-[11px] font-mono leading-relaxed" style={{ color: COLORS.ink }}>
                    {using.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
