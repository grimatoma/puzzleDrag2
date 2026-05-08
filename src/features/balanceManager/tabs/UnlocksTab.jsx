// Unlocks tab — set how each tile is discovered. The four discovery
// methods are: default (always available), chain (chain length of source),
// research (cumulative chain progress), and buy (coin cost).

import { useState, useMemo } from "react";
import { TILE_TYPES } from "../../tileCollection/data.js";
import { BIOMES } from "../../../constants.js";
import {
  COLORS, NumberField, Select, SmallButton, Pill, Card, SearchBar, TileSwatch,
} from "../shared.jsx";

const METHODS = [
  { value: "default",  label: "Default — always available" },
  { value: "chain",    label: "Chain — long enough chain of source resource" },
  { value: "research", label: "Research — cumulative chain progress" },
  { value: "buy",      label: "Buy — purchase with coins" },
];

function tileSwatchProps(tile) {
  for (const b of Object.values(BIOMES)) {
    for (const r of b.resources) {
      if (r.key === tile.baseResource) return { color: r.color, glyph: r.glyph };
    }
  }
  return { color: 0x888888, glyph: "?" };
}

export default function UnlocksTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");

  const allResourceKeys = useMemo(() => {
    const set = new Set();
    for (const b of Object.values(BIOMES)) for (const r of b.resources) set.add(r.key);
    return [...set].sort();
  }, []);

  const sourceOptions = useMemo(
    () => [{ value: "", label: "— pick source —" },
            ...allResourceKeys.map((k) => ({ value: k, label: k }))],
    [allResourceKeys],
  );

  const filtered = TILE_TYPES.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.id.toLowerCase().includes(q) || (t.displayName || "").toLowerCase().includes(q);
  });

  function patchUnlock(tileId, patch) {
    updateDraft((d) => {
      const merged = { ...(d.tileUnlocks[tileId] || {}), ...patch };
      d.tileUnlocks[tileId] = merged;
    });
  }

  function setMethod(tileId, method) {
    updateDraft((d) => {
      d.tileUnlocks[tileId] = { method };
    });
  }

  function revert(tileId) {
    updateDraft((d) => { delete d.tileUnlocks[tileId]; });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter tiles…" />
        </div>
        <Pill>{filtered.length} of {TILE_TYPES.length}</Pill>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((t) => {
          const draftUnlock = draft.tileUnlocks[t.id];
          const eff = draftUnlock || t.discovery || { method: "default" };
          const dirty = !!draftUnlock;
          const sw = tileSwatchProps(t);

          return (
            <Card key={t.id} accent={dirty ? COLORS.ember : COLORS.border}>
              <div className="flex items-start gap-3 mb-2">
                <TileSwatch color={sw.color} glyph={sw.glyph} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold" style={{ color: COLORS.ink }}>
                    {t.displayName}
                  </div>
                  <code className="font-mono text-[10px] px-1.5 py-0.5 rounded inline-block"
                    style={{ background: COLORS.parchmentDeep, color: COLORS.ember }}>
                    {t.id}
                  </code>
                </div>
                {dirty && <SmallButton variant="ghost" onClick={() => revert(t.id)}>revert</SmallButton>}
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <Label>Discovery method</Label>
                  <Select
                    value={eff.method}
                    options={METHODS}
                    onChange={(v) => setMethod(t.id, v)}
                  />
                </div>
                {eff.method === "chain" && (
                  <>
                    <div>
                      <Label>Source resource (chain its key)</Label>
                      <Select
                        value={eff.chainLengthOf ?? ""}
                        options={sourceOptions}
                        onChange={(v) => patchUnlock(t.id, { chainLengthOf: v })}
                      />
                    </div>
                    <div>
                      <Label>Required chain length</Label>
                      <NumberField
                        value={eff.chainLength ?? 6}
                        min={1}
                        max={50}
                        width={70}
                        onChange={(v) => patchUnlock(t.id, { chainLength: v })}
                      />
                    </div>
                  </>
                )}
                {eff.method === "research" && (
                  <>
                    <div>
                      <Label>Source resource</Label>
                      <Select
                        value={eff.researchOf ?? ""}
                        options={sourceOptions}
                        onChange={(v) => patchUnlock(t.id, { researchOf: v })}
                      />
                    </div>
                    <div>
                      <Label>Cumulative chain target</Label>
                      <NumberField
                        value={eff.researchAmount ?? 30}
                        min={1}
                        max={500}
                        width={80}
                        onChange={(v) => patchUnlock(t.id, { researchAmount: v })}
                      />
                    </div>
                  </>
                )}
                {eff.method === "buy" && (
                  <div>
                    <Label>Coin cost</Label>
                    <NumberField
                      value={eff.coinCost ?? 100}
                      min={0}
                      max={99999}
                      width={90}
                      onChange={(v) => patchUnlock(t.id, { coinCost: v })}
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No tiles match your filter.
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

