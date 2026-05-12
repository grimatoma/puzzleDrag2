// Keepers tab — Balance Manager.
//
// Edits the biome-keeper encounters (src/keepers.js): names, the appearance
// threshold, and the Coexist / Drive Out dialogue + rewards. Patches are
// stored on `draft.keepers[type]` and merge into the live KEEPERS table at
// module load via `applyKeeperOverrides` in src/config/applyOverrides.js.
//
// Dialogue is edited as plain text — one line per textarea row; an empty
// textarea clears the override (reverts to the default in src/keepers.js).

import { KEEPERS } from "../../keepers.js";
import { COLORS, NumberField, TextField, TextArea, FieldRow, Card } from "../shared.jsx";

const TYPE_LABELS = { farm: "Farm", mine: "Mine", harbor: "Harbor" };

function Label({ children }) {
  return <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>{children}</div>;
}

// textarea string ⇄ array of non-empty trimmed lines
const linesToText = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");
const textToLines = (str) => String(str ?? "").split("\n").map((s) => s.trim()).filter((s) => s.length > 0);

export default function KeepersTab({ draft, updateDraft }) {
  function patchKeeper(type, fields) {
    updateDraft((d) => {
      d.keepers ??= {};
      const cur = d.keepers[type] ?? {};
      const next = { ...cur, ...fields };
      if (fields.coexist) next.coexist = { ...(cur.coexist ?? {}), ...fields.coexist };
      if (fields.driveout) next.driveout = { ...(cur.driveout ?? {}), ...fields.driveout };
      // Prune empties so the exported patch stays minimal.
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v === "" || v === undefined || v === null) { delete next[k]; continue; }
        if (Array.isArray(v) && v.length === 0) { delete next[k]; continue; }
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.keepers[type];
      else d.keepers[type] = next;
    });
  }

  function PathBlock({ type, path, p, k }) {
    const pp = p[path] ?? {};
    const kk = k[path];
    const rewardKey = path === "coexist" ? "embers" : "coreIngots";
    return (
      <div className="rounded-lg border p-2 mt-2" style={{ borderColor: COLORS.border, background: COLORS.parchmentDeep }}>
        <div className="text-[11px] font-bold mb-1" style={{ color: path === "coexist" ? "#3a7a1a" : "#6a5a3a" }}>
          {path === "coexist" ? "🤝 Coexist" : "⚔ Drive Out"}
        </div>
        <FieldRow label="Choice label">
          <TextField value={pp.label ?? kk.label} onChange={(v) => patchKeeper(type, { [path]: { label: v } })} width={240} />
        </FieldRow>
        <Label>Pitch (the keeper's response — one line per row)</Label>
        <TextArea rows={3} value={linesToText(pp.pitch ?? kk.pitch)} onChange={(v) => patchKeeper(type, { [path]: { pitch: textToLines(v).length ? textToLines(v) : undefined } })} />
        <FieldRow label={path === "coexist" ? "Embers reward" : "Core Ingots reward"}>
          <NumberField value={pp[rewardKey] ?? kk[rewardKey]} onChange={(v) => patchKeeper(type, { [path]: { [rewardKey]: v } })} min={0} max={9999} />
        </FieldRow>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        One keeper per settlement type. They appear once a settlement has at least the configured number of buildings.
      </div>
      {["farm", "mine", "harbor"].map((type) => {
        const k = KEEPERS[type];
        if (!k) return null;
        const p = (draft.keepers ?? {})[type] ?? {};
        const eff = {
          name: p.name ?? k.name, title: p.title ?? k.title, icon: p.icon ?? k.icon,
          appearsAfterBuildings: p.appearsAfterBuildings ?? k.appearsAfterBuildings,
          intro: p.intro ?? k.intro,
        };
        return (
          <Card key={type} title={`${eff.icon} ${eff.name} — ${TYPE_LABELS[type]}`}>
            <FieldRow label="Name"><TextField value={eff.name} onChange={(v) => patchKeeper(type, { name: v })} width={220} /></FieldRow>
            <FieldRow label="Title"><TextField value={eff.title} onChange={(v) => patchKeeper(type, { title: v })} width={220} /></FieldRow>
            <FieldRow label="Icon (emoji)"><TextField value={eff.icon} onChange={(v) => patchKeeper(type, { icon: v })} width={60} /></FieldRow>
            <FieldRow label="Appears after N buildings"><NumberField value={eff.appearsAfterBuildings} onChange={(v) => patchKeeper(type, { appearsAfterBuildings: v })} min={1} max={50} /></FieldRow>
            <Label>Intro (narration + the keeper's opening — one line per row)</Label>
            <TextArea rows={4} value={linesToText(eff.intro)} onChange={(v) => patchKeeper(type, { intro: textToLines(v).length ? textToLines(v) : undefined })} />
            <PathBlock type={type} path="coexist" p={p} k={k} />
            <PathBlock type={type} path="driveout" p={p} k={k} />
          </Card>
        );
      })}
    </div>
  );
}
