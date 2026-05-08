// Chains tab — visualises every chain (root → terminal) and exposes full
// editing: per-step upgrade-threshold, the `next` pointer of every step,
// adding/removing steps, and dissolving (or creating) whole chains.
//
// Resources themselves cannot be added or removed via overrides; the chain
// shape is purely the wiring of `next` pointers between existing resources.
// Changing a step's `next` to "—" makes it terminal. Linking two terminals
// creates a new chain. Clearing every `next` in a chain dissolves it.

import React, { useState, useMemo } from "react"; // React used for Fragment
import { BIOMES, UPGRADE_THRESHOLDS } from "../../../constants.js";
import { COLORS, NumberField, SmallButton, Pill, Card, SearchBar, TileSwatch, Select } from "../shared.jsx";

function buildResourceMap() {
  const map = {};
  for (const b of Object.values(BIOMES)) {
    for (const r of b.resources) map[r.key] = r;
  }
  return map;
}

// Effective next for a resource, given the draft override (which may set
// `next` to null explicitly to clear it).
function effectiveNext(resourceMap, draft, key) {
  const patch = draft?.resources?.[key];
  if (patch && Object.prototype.hasOwnProperty.call(patch, "next")) {
    return patch.next || null;
  }
  return resourceMap[key]?.next || null;
}

function buildChains(resourceMap, draft) {
  // A "chain" is a sequence whose entry point has nothing pointing to it via
  // `next`. Walk from each root via the (draft-aware) `next` pointer.
  const incoming = new Set();
  for (const r of Object.values(resourceMap)) {
    const n = effectiveNext(resourceMap, draft, r.key);
    if (n) incoming.add(n);
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
      const nKey = effectiveNext(resourceMap, draft, cur.key);
      cur = nKey ? resourceMap[nKey] : null;
    }
    if (seq.length >= 1) chains.push(seq);
  }
  // Sort: longer chains first, then alphabetical by root.
  chains.sort((a, b) => b.length - a.length || a[0].key.localeCompare(b[0].key));
  return chains;
}

export default function ChainsTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const [showSingletons, setShowSingletons] = useState(false);
  const resourceMap = useMemo(() => buildResourceMap(), []);
  const chains = useMemo(() => buildChains(resourceMap, draft), [resourceMap, draft]);

  // Dropdown options: every resource key, plus a "terminal" sentinel.
  const allResourceKeys = useMemo(
    () => Object.keys(resourceMap).sort(),
    [resourceMap],
  );
  const nextOptions = useMemo(
    () => [
      { value: "", label: "— terminal —" },
      ...allResourceKeys.map((k) => ({ value: k, label: k })),
    ],
    [allResourceKeys],
  );

  const visibleChains = chains.filter((seq) => {
    if (!showSingletons && seq.length < 2) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return seq.some((r) =>
      r.key.toLowerCase().includes(q) || (r.label || "").toLowerCase().includes(q));
  });

  const multiChainCount = chains.filter((s) => s.length >= 2).length;
  const singletonCount = chains.length - multiChainCount;

  function setThreshold(key, value) {
    updateDraft((d) => {
      if (!Number.isFinite(value) || value < 1) {
        delete d.upgradeThresholds[key];
      } else {
        d.upgradeThresholds[key] = Math.floor(value);
      }
    });
  }

  // Set or clear `next` on a single resource. Stores explicit `null` so the
  // override layer can distinguish "make terminal" from "no override".
  function setNextPointer(resKey, nextKey) {
    updateDraft((d) => {
      const cur = d.resources[resKey] || {};
      const liveNext = resourceMap[resKey]?.next ?? null;
      const newNext = nextKey || null;
      const merged = { ...cur };
      if (newNext === liveNext) {
        // Reverting to baseline — drop the override key entirely.
        delete merged.next;
      } else {
        merged.next = newNext;
      }
      if (Object.keys(merged).length === 0) delete d.resources[resKey];
      else d.resources[resKey] = merged;
    });
  }

  // Dissolve a whole chain: clear `next` on every step in the sequence so
  // they all become singletons.
  function dissolveChain(seq) {
    if (seq.length < 2) return;
    if (!confirm(`Dissolve the "${seq.map((r) => r.label).join(" → ")}" chain?\n\nEvery step will become a terminal singleton. Resources are not deleted.`)) return;
    updateDraft((d) => {
      for (const r of seq) {
        const cur = d.resources[r.key] || {};
        const liveNext = resourceMap[r.key]?.next ?? null;
        const merged = { ...cur };
        if (liveNext === null) {
          delete merged.next;
        } else {
          merged.next = null;
        }
        if (Object.keys(merged).length === 0) delete d.resources[r.key];
        else d.resources[r.key] = merged;
      }
    });
  }

  // Splice a single step out of a chain by re-pointing its predecessor at
  // its successor. The spliced step becomes a singleton (its own `next`
  // is cleared so it doesn't head a parallel sub-chain).
  function spliceStep(seq, idx) {
    const step = seq[idx];
    const successor = seq[idx + 1] || null;
    if (idx === 0) {
      // No predecessor — clearing this step's `next` is what "remove from
      // chain" means for a root. The successor (if any) becomes a new root.
      setNextPointer(step.key, "");
      return;
    }
    const predecessor = seq[idx - 1];
    updateDraft((d) => {
      // Re-point predecessor → successor.
      {
        const cur = d.resources[predecessor.key] || {};
        const liveNext = resourceMap[predecessor.key]?.next ?? null;
        const newNext = successor ? successor.key : null;
        const merged = { ...cur };
        if (newNext === liveNext) delete merged.next;
        else merged.next = newNext;
        if (Object.keys(merged).length === 0) delete d.resources[predecessor.key];
        else d.resources[predecessor.key] = merged;
      }
      // Clear this step's `next`.
      {
        const cur = d.resources[step.key] || {};
        const liveNext = resourceMap[step.key]?.next ?? null;
        const merged = { ...cur };
        if (liveNext === null) delete merged.next;
        else merged.next = null;
        if (Object.keys(merged).length === 0) delete d.resources[step.key];
        else d.resources[step.key] = merged;
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter chains by resource key or label…" />
        </div>
        <label
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 cursor-pointer text-[11px] font-bold"
          style={{
            background: showSingletons ? COLORS.ember : COLORS.parchmentDeep,
            borderColor: showSingletons ? COLORS.emberDeep : COLORS.border,
            color: showSingletons ? "#fff" : COLORS.inkLight,
          }}
        >
          <input
            type="checkbox"
            checked={showSingletons}
            onChange={(e) => setShowSingletons(e.target.checked)}
            className="h-3 w-3"
          />
          show singletons
        </label>
        <Pill>{multiChainCount} chains · {singletonCount} singletons</Pill>
      </div>

      <div
        className="text-[11px] italic px-3 py-2 rounded-lg border-2"
        style={{ background: "#fff7e6", borderColor: COLORS.border, color: COLORS.inkSubtle }}
      >
        Tip: every step has a <b>Next →</b> picker. Choose another resource to extend the chain, or
        “— terminal —” to end it. Use <b>+ Add step</b> after the last tile to append a node, the
        <b> ✕</b> on a step to splice it out, or <b>Delete chain</b> on the header to dissolve a whole
        chain back into singletons. Toggle <b>show singletons</b> to start a brand-new chain from
        any standalone resource.
      </div>

      <div className="flex flex-col gap-3">
        {visibleChains.map((seq) => (
          <ChainCard
            key={seq[0].key}
            seq={seq}
            draft={draft}
            resourceMap={resourceMap}
            nextOptions={nextOptions}
            allResourceKeys={allResourceKeys}
            onSetThreshold={setThreshold}
            onSetNext={setNextPointer}
            onDissolve={() => dissolveChain(seq)}
            onSpliceStep={(idx) => spliceStep(seq, idx)}
          />
        ))}
        {visibleChains.length === 0 && (
          <div className="text-center py-8 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>
            No chains match your filter.
          </div>
        )}
      </div>
    </div>
  );
}

function ChainCard({
  seq, draft, resourceMap, nextOptions, allResourceKeys,
  onSetThreshold, onSetNext, onDissolve, onSpliceStep,
}) {
  const tail = seq[seq.length - 1];
  const dirtyNext = (key) => {
    const patch = draft?.resources?.[key];
    return !!(patch && Object.prototype.hasOwnProperty.call(patch, "next"));
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[12px] font-bold" style={{ color: COLORS.ember }}>
          {seq.map((r) => r.label).join(" → ")}
          {seq.length === 1 && (
            <span className="ml-2 font-normal italic" style={{ color: COLORS.inkSubtle }}>
              (singleton — add a step below to start a chain)
            </span>
          )}
        </div>
        {seq.length >= 2 && (
          <SmallButton variant="danger" onClick={onDissolve} title="Clear every `next` in this chain">
            🗑 Delete chain
          </SmallButton>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {seq.map((r, i) => {
          const isTerminal = i === seq.length - 1;
          const live = UPGRADE_THRESHOLDS[r.key];
          const draftThr = draft.upgradeThresholds[r.key];
          const value = draftThr ?? live;
          const dirtyThr = draftThr !== undefined && draftThr !== live;
          const successor = isTerminal ? null : seq[i + 1];
          const next = successor ? successor.key : "";
          const dirtyN = dirtyNext(r.key);

          return (
            <React.Fragment key={r.key}>
              <div
                className="flex flex-col gap-1 px-2 py-2 rounded-lg border-2"
                style={{
                  background: (dirtyThr || dirtyN) ? "#fff5e6" : "#fff",
                  borderColor: (dirtyThr || dirtyN) ? COLORS.ember : COLORS.border,
                  minWidth: 200,
                }}
              >
                <div className="flex items-center gap-2">
                  <TileSwatch color={r.color} glyph={r.glyph} size={26} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-bold truncate" style={{ color: COLORS.ink }}>
                      {r.label}
                    </span>
                    <code className="font-mono text-[10px] truncate" style={{ color: COLORS.inkSubtle }}>{r.key}</code>
                  </div>
                  {seq.length >= 2 && (
                    <SmallButton
                      variant="ghost"
                      title={i === 0
                        ? "Detach this root from the chain (clears its `next`)."
                        : "Splice this step out — predecessor re-points to the successor."}
                      onClick={() => onSpliceStep(i)}
                    >
                      ✕
                    </SmallButton>
                  )}
                </div>

                {!isTerminal && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>chain ≥</span>
                    <NumberField
                      value={value}
                      min={1}
                      max={50}
                      width={56}
                      onChange={(v) => onSetThreshold(r.key, v)}
                    />
                    {dirtyThr && (
                      <SmallButton
                        variant="ghost"
                        title="Revert threshold"
                        onClick={() => onSetThreshold(r.key, NaN)}
                      >
                        ↺
                      </SmallButton>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
                    Next →
                  </span>
                  <Select
                    value={next}
                    options={nextOptions}
                    onChange={(v) => onSetNext(r.key, v)}
                    width={130}
                  />
                  {dirtyN && (
                    <SmallButton
                      variant="ghost"
                      title="Revert next-pointer to baseline"
                      onClick={() => {
                        // Reverting requires reaching into the draft; do it
                        // by setting back to the live value, which will drop
                        // the override key inside setNextPointer.
                        const live = resourceMap[r.key]?.next ?? "";
                        onSetNext(r.key, live);
                      }}
                    >
                      ↺
                    </SmallButton>
                  )}
                </div>
              </div>
              {!isTerminal && (
                <span className="text-[18px] font-bold" style={{ color: COLORS.inkSubtle }}>→</span>
              )}
            </React.Fragment>
          );
        })}

        <AddStepButton
          tailKey={tail.key}
          allResourceKeys={allResourceKeys}
          onAdd={(nextKey) => onSetNext(tail.key, nextKey)}
        />
      </div>
    </Card>
  );
}

function AddStepButton({ tailKey, allResourceKeys, onAdd }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("");
  const options = useMemo(
    () => [
      { value: "", label: "— pick a resource —" },
      ...allResourceKeys.filter((k) => k !== tailKey).map((k) => ({ value: k, label: k })),
    ],
    [allResourceKeys, tailKey],
  );

  if (!open) {
    return (
      <SmallButton variant="primary" onClick={() => setOpen(true)} title="Append a step to this chain">
        + Add step
      </SmallButton>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border-2"
      style={{ background: "#fff", borderColor: COLORS.ember }}>
      <Select value={pick} options={options} onChange={setPick} width={140} />
      <SmallButton
        variant="success"
        disabled={!pick}
        onClick={() => {
          if (!pick) return;
          onAdd(pick);
          setOpen(false);
          setPick("");
        }}
      >
        ✓
      </SmallButton>
      <SmallButton variant="ghost" onClick={() => { setOpen(false); setPick(""); }}>
        ✕
      </SmallButton>
    </div>
  );
}
