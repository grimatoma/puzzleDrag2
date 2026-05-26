// NPCs tab — Dev Panel.
//
// Edits townsfolk gift preferences (loves / likes — items that raise their bond
// fastest; `favoriteGift` is re-derived from `loves[0]`) and the four bond
// bands (name + the order-reward modifier at that band). Patches go to
// `draft.npcs` ({ byId: {...}, bands: [...] }) and merge into the live NPC_DATA
// / BOND_BANDS on next load via `applyNpcOverrides`. Loves/likes are entered as
// comma-separated item keys.

import { useMemo } from "react";
import { NPC_DATA, NPC_IDS, BOND_BANDS } from "../../features/npcs/data.js";
import { BIOMES, RECIPES } from "../../constants.js";
import { COLORS, TextField, NumberField, FieldRow, Card, SmallButton, SearchAndAddPicker } from "../shared.jsx";
import Icon from "../../ui/Icon.jsx";
import type { BalanceDraft, TabProps } from "../index.jsx";

interface NpcOverride {
  displayName?: string;
  loves?: string[];
  likes?: string[];
  [extra: string]: unknown;
}
interface BandOverride {
  name?: string;
  modifier?: number;
  [extra: string]: unknown;
}
interface NpcsDraftSlice {
  byId?: Record<string, NpcOverride>;
  bands?: BandOverride[];
}

export default function NpcsTab({ draft, updateDraft }: TabProps) {
  function patchNpc(id: string, fields: NpcOverride) {
    updateDraft((d: BalanceDraft) => {
      d.npcs ??= {};
      const npcs = d.npcs as NpcsDraftSlice;
      npcs.byId ??= {};
      const byId = npcs.byId;
      const next: NpcOverride & Record<string, unknown> = { ...(byId[id] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined || v === null) { delete (next as Record<string, unknown>)[k]; continue; }
        if (Array.isArray(v) && v.length === 0) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete byId[id];
      else byId[id] = next;
      if (Object.keys(byId).length === 0) delete npcs.byId;
      if (Object.keys(npcs).length === 0) delete (d as { npcs?: unknown }).npcs;
    });
  }
  function patchBand(i: number, fields: BandOverride) {
    updateDraft((d: BalanceDraft) => {
      d.npcs ??= {};
      const npcs = d.npcs as NpcsDraftSlice;
      npcs.bands ??= BOND_BANDS.map(() => ({} as BandOverride));
      const bands = npcs.bands;
      bands[i] = { ...(bands[i] ?? {}), ...fields };
      for (const k of Object.keys(bands[i])) {
        const v = (bands[i] as Record<string, unknown>)[k];
        if (v === "" || v == null) delete (bands[i] as Record<string, unknown>)[k];
      }
      if (bands.every((b: BandOverride) => Object.keys(b).length === 0)) delete npcs.bands;
      if (Object.keys(npcs).length === 0) delete (d as { npcs?: unknown }).npcs;
    });
  }

  const allResourceKeys = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of Object.values(BIOMES) as Array<{ tiles: Array<{ key: string }>; resources: Array<{ key: string }> }>) {
      for (const r of [...b.tiles, ...b.resources]) set.add(r.key);
    }
    for (const k of Object.keys(RECIPES)) set.add(k);
    return [...set].sort();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COLORS.inkSubtle }}>Gift preferences</div>
        {NPC_IDS.map((id) => {
          const d = NPC_DATA[id];
          if (!d) return null;
          const npcsDraft = (draft.npcs ?? {}) as NpcsDraftSlice;
          const p: NpcOverride = npcsDraft.byId?.[id] ?? {};
          const eff = {
            displayName: p.displayName ?? d.displayName,
            loves: Array.isArray(p.loves) ? p.loves : d.loves,
            likes: Array.isArray(p.likes) ? p.likes : d.likes,
          };
          return (
            <Card key={id}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden"
                  style={{ width: 48, height: 48, background: COLORS.parchmentDeep, border: `2px solid ${COLORS.border}` }}
                >
                  <Icon iconKey={`char_${id}`} size={44} />
                </div>
                <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: COLORS.inkSubtle }}>
                  {eff.displayName} ({id})
                </div>
              </div>
              <FieldRow label="Display name">
                <TextField value={eff.displayName} onChange={(v: string) => patchNpc(id, { displayName: v })} width={200} />
              </FieldRow>
              <div className="mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>Loves</div>
                  <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>big bond gain · first item is the favourite</div>
                </div>
                <ListEditor items={eff.loves} availableKeys={allResourceKeys} onChange={(v: string[]) => patchNpc(id, { loves: v })} />
              </div>
              <div className="mt-2 pt-2 border-t" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>Likes</div>
                  <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>medium bond gain</div>
                </div>
                <ListEditor items={eff.likes} availableKeys={allResourceKeys} onChange={(v: string[]) => patchNpc(id, { likes: v })} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Bond bands">
        <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
          A higher band multiplies order rewards (and unlocks bond-gated story beats). The 1–10 ranges are fixed.
        </div>
        {BOND_BANDS.map((band, i) => {
          const npcsDraft = (draft.npcs ?? {}) as NpcsDraftSlice;
          const p: BandOverride = npcsDraft.bands?.[i] ?? {};
          const name = p.name ?? band.name;
          const modifier = p.modifier ?? band.modifier;
          return (
            <FieldRow key={i} label={`Bond ${band.lo}–${band.hi}`} hint={`reward × ${modifier}`}>
              <div className="flex items-center gap-2">
                <TextField value={name} onChange={(v: string) => patchBand(i, { name: v })} width={110} />
                <NumberField value={modifier} onChange={(v: number) => patchBand(i, { modifier: v })} min={0} max={5} step={0.05} width={70} />
              </div>
            </FieldRow>
          );
        })}
      </Card>
    </div>
  );
}

function ListEditor({ items, availableKeys, onChange }: { items: string[]; availableKeys: string[]; onChange: (next: string[]) => void }) {
  const availableOptions = useMemo(() => {
    return availableKeys.filter((k) => !items.includes(k)).map((k) => ({
      id: k,
      searchText: k,
      renderNode: (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-[#e0d4be]">
            <Icon iconKey={k} size={18} />
          </div>
          <div className="text-[11px] font-bold truncate flex-1 min-w-0" style={{ color: COLORS.ink }}>
            {k}
          </div>
        </div>
      )
    }));
  }, [items, availableKeys]);

  function addItem(k: string) {
    onChange([...items, k]);
  }
  function removeItem(idx: number) {
    const next = [...items];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2 w-full mt-1">
      {items.length === 0 && (
        <div className="text-center py-2 text-[12px] italic rounded border border-dashed" style={{ borderColor: COLORS.border, color: COLORS.inkSubtle }}>
          No items added.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((k: string, i: number) => {
          const isValid = availableKeys.includes(k);
          return (
            <div
              key={`${k}-${i}`}
              className="flex items-center gap-1.5 pr-1 py-1 pl-1.5 rounded-lg border-2"
              style={{
                background: isValid ? COLORS.parchmentDeep : "#ffebe8",
                borderColor: isValid ? COLORS.border : COLORS.red,
              }}
            >
              {isValid ? (
                <Icon iconKey={k} size={16} />
              ) : (
                <span className="text-[14px]" title="Invalid item">⚠️</span>
              )}
              <span
                className="text-[12px] font-bold"
                style={{ color: isValid ? COLORS.ink : COLORS.redDeep }}
              >
                {k}
              </span>
              <SmallButton variant="ghost" onClick={() => removeItem(i)} className="!p-0.5 !border-0 text-red-600 hover:bg-red-100 rounded">
                ✕
              </SmallButton>
            </div>
          );
        })}
      </div>

      <SearchAndAddPicker
        label="Add Item"
        placeholder="Search items…"
        options={availableOptions}
        onSelect={addItem}
        gridClass="grid-cols-2 md:grid-cols-3"
      />
    </div>
  );
}
