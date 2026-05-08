// Chains tab — visualises every chain (root → terminal) and exposes the
// upgrade-threshold for each step. Designers can adjust how many tiles a
// chain needs before it upgrades, without renaming things.

import React, { useState, useMemo } from "react"; // React used for Fragment
import { BIOMES, UPGRADE_THRESHOLDS } from "../../../constants.js";
import { COLORS, NumberField, SmallButton, Pill, Card, SearchBar, TileSwatch } from "../shared.jsx";

function buildResourceMap() {
  const map = {};
  for (const b of Object.values(BIOMES)) {
    for (const r of b.resources) map[r.key] = r;
  }
  return map;
}

function buildChains(resourceMap) {
  // A "chain" is a sequence whose entry point has nothing pointing to it via
  // `next`. Walk from each root via the `next` pointer.
  const incoming = new Set();
  for (const r of Object.values(resourceMap)) {
    if (r.next) incoming.add(r.next);
  }
  const roots = Object.values(resourceMap).filter((r) => !incoming.has(r.key));
  const chains = [];
  for (const root of roots) {
    const seq = [];
    let cur = root;
    const seen = new Set();
    while (cur && !seen.has(cur.key)) {
      seq.push(cur);
      seen.add(cur.key);
      cur = cur.next ? resourceMap[cur.next] : null;
    }
    if (seq.length >= 1) chains.push(seq);
  }
  // Sort: longer chains first, then alphabetical by root.
  chains.sort((a, b) => b.length - a.length || a[0].key.localeCompare(b[0].key));
  return chains;
}

export default function ChainsTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const resourceMap = useMemo(() => buildResourceMap(), []);
  const chains = useMemo(() => buildChains(resourceMap), [resourceMap]);

  const filteredChains = chains.filter((seq) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return seq.some((r) =>
      r.key.toLowerCase().includes(q) || (r.label || "").toLowerCase().includes(q));
  });

  function setThreshold(key, value) {
    updateDraft((d) => {
      if (!Number.isFinite(value) || value < 1) {
        delete d.upgradeThresholds[key];
      } else {
        d.upgradeThresholds[key] = Math.floor(value);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter chains by resource key or label…" />
        </div>
        <Pill>{filteredChains.length} chains</Pill>
      </div>

      <div className="flex flex-col gap-3">
        {filteredChains.map((seq) => (
          <Card key={seq[0].key}>
            <div className="text-[12px] font-bold mb-2" style={{ color: COLORS.ember }}>
              {seq.map((r) => r.label).join(" → ")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {seq.map((r, i) => {
                const isTerminal = i === seq.length - 1;
                const live = UPGRADE_THRESHOLDS[r.key];
                const draftVal = draft.upgradeThresholds[r.key];
                const value = draftVal ?? live;
                const dirty = draftVal !== undefined && draftVal !== live;
                return (
                  <React.Fragment key={r.key}>
                    <div
                      className="flex items-center gap-2 px-2 py-1 rounded-lg border-2"
                      style={{
                        background: dirty ? "#fff5e6" : "#fff",
                        borderColor: dirty ? COLORS.ember : COLORS.border,
                      }}
                    >
                      <TileSwatch color={r.color} glyph={r.glyph} size={26} />
                      <div className="flex flex-col">
                        <code className="font-mono text-[10px]" style={{ color: COLORS.inkSubtle }}>{r.key}</code>
                        {!isTerminal ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>chain ≥</span>
                            <NumberField
                              value={value}
                              min={1}
                              max={50}
                              width={56}
                              onChange={(v) => setThreshold(r.key, v)}
                            />
                            {dirty && (
                              <SmallButton
                                variant="ghost"
                                title="Revert to current"
                                onClick={() => setThreshold(r.key, NaN)}
                              >
                                ↺
                              </SmallButton>
                            )}
                          </div>
                        ) : (
                          <Pill>terminal</Pill>
                        )}
                      </div>
                    </div>
                    {!isTerminal && (
                      <span className="text-[18px] font-bold" style={{ color: COLORS.inkSubtle }}>→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Card>
        ))}
        {filteredChains.length === 0 && (
          <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No chains match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
