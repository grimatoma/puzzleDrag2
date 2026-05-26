// Keepers tab — Dev Panel.
//
// Edits the biome-keeper encounters (src/keepers.js): names, the appearance
// threshold, and the Coexist / Drive Out dialogue + rewards. Patches are
// stored on `draft.keepers[type]` and merge into the live KEEPERS table at
// module load via `applyKeeperOverrides` in src/config/applyOverrides.js.
//
// Dialogue is edited as plain text — one line per textarea row; an empty
// textarea clears the override (reverts to the default in src/keepers.js).

import type { ReactNode } from "react";
import { KEEPERS } from "../../keepers.js";
import { COLORS, NumberField, TextField, TextArea, FieldRow, Card } from "../shared.jsx";
import type { BalanceDraft, TabProps } from "../index.jsx";

type KeeperType = "farm" | "mine" | "harbor";
const TYPE_LABELS: Record<KeeperType, string> = { farm: "Farm", mine: "Mine", harbor: "Harbor" };
const TYPES: KeeperType[] = ["farm", "mine", "harbor"];

interface KeeperPath {
  label: string;
  pitch: string[];
  embers?: number;
  coreIngots?: number;
}
interface KeeperRow {
  id: string;
  name: string;
  title: string;
  icon: string;
  appearsAfterBuildings: number;
  intro: string[];
  coexist: KeeperPath;
  driveout: KeeperPath;
}
type KeeperPathName = "coexist" | "driveout";
type KeeperOverride = Partial<{
  name: string;
  title: string;
  icon: string;
  appearsAfterBuildings: number;
  intro: string[];
  coexist: Partial<KeeperPath>;
  driveout: Partial<KeeperPath>;
}>;
const keepers = KEEPERS as unknown as Record<KeeperType, KeeperRow>;

function Label({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>{children}</div>;
}

// textarea string ⇄ array of non-empty trimmed lines
const linesToText = (arr: string[] | undefined): string => (Array.isArray(arr) ? arr.join("\n") : "");
const textToLines = (str: string): string[] => String(str ?? "").split("\n").map((s) => s.trim()).filter((s) => s.length > 0);

export default function KeepersTab({ draft, updateDraft }: TabProps) {
  function patchKeeper(type: KeeperType, fields: KeeperOverride) {
    updateDraft((d: BalanceDraft) => {
      d.keepers ??= {};
      const keepersDraft = d.keepers as Record<KeeperType, KeeperOverride>;
      const cur: KeeperOverride = keepersDraft[type] ?? {};
      const next: KeeperOverride & Record<string, unknown> = { ...cur, ...fields };
      if (fields.coexist) next.coexist = { ...(cur.coexist ?? {}), ...fields.coexist };
      if (fields.driveout) next.driveout = { ...(cur.driveout ?? {}), ...fields.driveout };
      // Prune empties so the exported patch stays minimal.
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v === undefined || v === null) { delete (next as Record<string, unknown>)[k]; continue; }
        if (Array.isArray(v) && v.length === 0) { delete (next as Record<string, unknown>)[k]; continue; }
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete keepersDraft[type];
      else keepersDraft[type] = next;
    });
  }

  function PathBlock({ type, path, p, k }: { type: KeeperType; path: KeeperPathName; p: KeeperOverride; k: KeeperRow }) {
    const pp: Partial<KeeperPath> = (p[path] ?? {}) as Partial<KeeperPath>;
    const kk: KeeperPath = k[path];
    const rewardKey: "embers" | "coreIngots" = path === "coexist" ? "embers" : "coreIngots";
    return (
      <div className="rounded-lg border p-2 mt-2" style={{ borderColor: COLORS.border, background: COLORS.parchmentDeep }}>
        <div className="text-[11px] font-bold mb-1" style={{ color: path === "coexist" ? "#3a7a1a" : "#6a5a3a" }}>
          {path === "coexist" ? "🤝 Coexist" : "⚔ Drive Out"}
        </div>
        <FieldRow label="Choice label">
          <TextField value={pp.label ?? kk.label} onChange={(v: string) => patchKeeper(type, { [path]: { label: v } })} width={240} />
        </FieldRow>
        <Label>Pitch (the keeper's response — one line per row)</Label>
        <TextArea rows={3} value={linesToText(pp.pitch ?? kk.pitch)} onChange={(v: string) => patchKeeper(type, { [path]: { pitch: textToLines(v).length ? textToLines(v) : undefined } })} />
        <FieldRow label={path === "coexist" ? "Embers reward" : "Core Ingots reward"}>
          <NumberField value={pp[rewardKey] ?? kk[rewardKey]} onChange={(v: number) => patchKeeper(type, { [path]: { [rewardKey]: v } })} min={0} max={9999} />
        </FieldRow>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        One keeper per settlement type. They appear once a settlement has at least the configured number of buildings.
      </div>
      {TYPES.map((type) => {
        const k = keepers[type];
        if (!k) return null;
        const draftKeepers = (draft.keepers ?? {}) as Record<KeeperType, KeeperOverride>;
        const p: KeeperOverride = draftKeepers[type] ?? {};
        const eff = {
          name: p.name ?? k.name, title: p.title ?? k.title, icon: p.icon ?? k.icon,
          appearsAfterBuildings: p.appearsAfterBuildings ?? k.appearsAfterBuildings,
          intro: p.intro ?? k.intro,
        };
        return (
          <Card key={type} title={`${eff.icon} ${eff.name} — ${TYPE_LABELS[type]}`}>
            <FieldRow label="Name"><TextField value={eff.name} onChange={(v: string) => patchKeeper(type, { name: v })} width={220} /></FieldRow>
            <FieldRow label="Title"><TextField value={eff.title} onChange={(v: string) => patchKeeper(type, { title: v })} width={220} /></FieldRow>
            <FieldRow label="Icon (emoji)"><TextField value={eff.icon} onChange={(v: string) => patchKeeper(type, { icon: v })} width={60} /></FieldRow>
            <FieldRow label="Appears after N buildings"><NumberField value={eff.appearsAfterBuildings} onChange={(v: number) => patchKeeper(type, { appearsAfterBuildings: v })} min={1} max={50} /></FieldRow>
            <Label>Intro (narration + the keeper's opening — one line per row)</Label>
            <TextArea rows={4} value={linesToText(eff.intro)} onChange={(v: string) => patchKeeper(type, { intro: textToLines(v).length ? textToLines(v) : undefined })} />
            <PathBlock type={type} path="coexist" p={p} k={k} />
            <PathBlock type={type} path="driveout" p={p} k={k} />
          </Card>
        );
      })}
    </div>
  );
}
