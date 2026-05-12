// NPCs tab — Balance Manager.
//
// Edits townsfolk gift preferences (loves / likes — items that raise their bond
// fastest; `favoriteGift` is re-derived from `loves[0]`) and the four bond
// bands (name + the order-reward modifier at that band). Patches go to
// `draft.npcs` ({ byId: {...}, bands: [...] }) and merge into the live NPC_DATA
// / BOND_BANDS on next load via `applyNpcOverrides`. Loves/likes are entered as
// comma-separated item keys.

import { NPC_DATA, NPC_IDS, BOND_BANDS } from "../../features/npcs/data.js";
import { COLORS, TextField, NumberField, FieldRow, Card } from "../shared.jsx";

const listToText = (arr) => (Array.isArray(arr) ? arr.join(", ") : "");
const textToList = (str) => String(str ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0);

export default function NpcsTab({ draft, updateDraft }) {
  function patchNpc(id, fields) {
    updateDraft((d) => {
      d.npcs ??= {};
      d.npcs.byId ??= {};
      const next = { ...(d.npcs.byId[id] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v === "" || v === undefined || v === null) { delete next[k]; continue; }
        if (Array.isArray(v) && v.length === 0) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.npcs.byId[id];
      else d.npcs.byId[id] = next;
      if (Object.keys(d.npcs.byId).length === 0) delete d.npcs.byId;
      if (Object.keys(d.npcs).length === 0) delete d.npcs;
    });
  }
  function patchBand(i, fields) {
    updateDraft((d) => {
      d.npcs ??= {};
      d.npcs.bands ??= BOND_BANDS.map(() => ({}));
      d.npcs.bands[i] = { ...(d.npcs.bands[i] ?? {}), ...fields };
      for (const k of Object.keys(d.npcs.bands[i])) {
        if (d.npcs.bands[i][k] === "" || d.npcs.bands[i][k] == null) delete d.npcs.bands[i][k];
      }
      if (d.npcs.bands.every((b) => Object.keys(b).length === 0)) delete d.npcs.bands;
      if (Object.keys(d.npcs).length === 0) delete d.npcs;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COLORS.inkSubtle }}>Gift preferences</div>
        {NPC_IDS.map((id) => {
          const d = NPC_DATA[id];
          if (!d) return null;
          const p = (draft.npcs ?? {}).byId?.[id] ?? {};
          const eff = {
            displayName: p.displayName ?? d.displayName,
            loves: Array.isArray(p.loves) ? p.loves : d.loves,
            likes: Array.isArray(p.likes) ? p.likes : d.likes,
          };
          return (
            <Card key={id} title={`${eff.displayName} (${id})`}>
              <FieldRow label="Display name"><TextField value={eff.displayName} onChange={(v) => patchNpc(id, { displayName: v })} width={200} /></FieldRow>
              <FieldRow label="Loves" hint="big bond gain · first item is the favourite"><TextField value={listToText(eff.loves)} onChange={(v) => patchNpc(id, { loves: textToList(v) })} width={260} /></FieldRow>
              <FieldRow label="Likes" hint="medium bond gain"><TextField value={listToText(eff.likes)} onChange={(v) => patchNpc(id, { likes: textToList(v) })} width={260} /></FieldRow>
            </Card>
          );
        })}
      </div>

      <Card title="Bond bands">
        <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
          A higher band multiplies order rewards (and unlocks bond-gated story beats). The 1–10 ranges are fixed.
        </div>
        {BOND_BANDS.map((band, i) => {
          const p = (draft.npcs ?? {}).bands?.[i] ?? {};
          const name = p.name ?? band.name;
          const modifier = p.modifier ?? band.modifier;
          return (
            <FieldRow key={i} label={`Bond ${band.lo}–${band.hi}`} hint={`reward × ${modifier}`}>
              <div className="flex items-center gap-2">
                <TextField value={name} onChange={(v) => patchBand(i, { name: v })} width={110} />
                <NumberField value={modifier} onChange={(v) => patchBand(i, { modifier: v })} min={0} max={5} step={0.05} width={70} />
              </div>
            </FieldRow>
          );
        })}
      </Card>
    </div>
  );
}
