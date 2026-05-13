// Story Tree Editor — the side inspector.
// Edits the selected beat: presentation (title / scene / body / lines), the
// full choice list (add / remove / label / whitelisted outcome — flags, bond,
// currency, queueBeat target), the **trigger** (when the dialog fires — full
// game-event vocabulary, incl. `flag_set`) + `repeat`, and — for author-created
// draft beats — onComplete.setFlag, plus delete.

import { useState } from "react";
import {
  C, NPCS, NPC_KEYS, Portrait, actColor, triggerSummary,
  SCENE_OPTS, linesToText, textToLines,
  effectiveBeat, effectiveChoices, allBeatIds, findIncomingChoice,
  FieldLabel, TextInput, Btn,
} from "./shared.jsx";
import { STORY_FLAGS } from "../flags.js";

// ─── tiny styled atoms ───────────────────────────────────────────────────────

const selStyle = {
  padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`,
  background: "#fff", font: "400 11px/1 system-ui", color: C.ink, outline: "none",
};

function Section({ title, hint, children, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6,
      borderTop: `1px ${accent ? "solid" : "dashed"} ${accent || C.border}`, paddingTop: 10 }}>
      <FieldLabel hint={hint}>{title}</FieldLabel>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ font: "600 9px/1.2 system-ui", color: C.inkSubtle, width: 64, flexShrink: 0,
        textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>{children}</div>
    </div>
  );
}

/** Text-backed number input — keeps the typed string locally so fractional /
 *  in-progress entry ("0.", "-") doesn't fight a controlled `value`. Re-syncs
 *  when the upstream value changes for an unrelated reason (e.g. switching beats)
 *  via the documented "adjust state during render" pattern. */
function NumberField({ value, onCommit, step = "1", placeholder = "", width = 56 }) {
  const [txt, setTxt] = useState(value == null ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    const cur = txt.trim() === "" ? undefined : Number(txt);
    const norm = (v) => (v == null || Number.isNaN(v)) ? undefined : v;
    if (norm(cur) !== norm(value)) setTxt(value == null ? "" : String(value));
  }
  const commit = (s) => {
    const t = String(s).trim();
    if (t === "" || t === "-" || t === "." || t === "-.") { onCommit(undefined); return; }
    const n = Number(t);
    onCommit(Number.isFinite(n) ? n : undefined);
  };
  return (
    <input type="text" inputMode="decimal" value={txt} placeholder={placeholder}
      onChange={(e) => { setTxt(e.target.value); commit(e.target.value); }}
      title={`step ${step}`}
      style={{ width, padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`,
        background: "#fff", font: "400 11px/1 system-ui", color: C.ink, outline: "none", textAlign: "right" }} />
  );
}

// ─── flag chip list ──────────────────────────────────────────────────────────

const asFlagArr = (v) => (Array.isArray(v) ? v.slice() : (typeof v === "string" && v ? [v] : []));
const packFlags = (arr) => {
  const c = [];
  for (const s of arr) { const t = String(s ?? "").trim(); if (t && !c.includes(t)) c.push(t); }
  return c.length === 0 ? undefined : (c.length === 1 ? c[0] : c);
};

function FlagTags({ value, onChange, placeholder = "flag_name", tone = C.emberDeep }) {
  const arr = asFlagArr(value);
  const [draftFlag, setDraftFlag] = useState("");
  const add = () => { const t = draftFlag.trim(); if (t && !arr.includes(t)) onChange(packFlags([...arr, t])); setDraftFlag(""); };
  return (
    <>
      {arr.map((f) => (
        <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 3px 2px 6px", borderRadius: 999, background: `${tone}1a`, border: `1px solid ${tone}55`,
          font: "600 9.5px/1 ui-monospace,monospace", color: tone }}>
          ⚐ {f}
          <button onClick={() => onChange(packFlags(arr.filter((x) => x !== f)))}
            style={{ border: "none", background: "transparent", color: tone, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "0 1px" }}>×</button>
        </span>
      ))}
      <input value={draftFlag} placeholder={placeholder}
        onChange={(e) => setDraftFlag(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
        style={{ flex: "1 1 70px", minWidth: 64, padding: "3px 6px", borderRadius: 5, border: `1px solid ${C.border}`,
          background: "#fff", font: "400 10px/1 ui-monospace,monospace", color: C.ink, outline: "none" }} />
    </>
  );
}

// ─── outcome editor ──────────────────────────────────────────────────────────

const CURRENCIES = [
  { key: "embers",     icon: "✸", label: "Embers" },
  { key: "coreIngots", icon: "◈", label: "Core Ingots" },
  { key: "gems",       icon: "◆", label: "Gems" },
];

function cleanOutcome(o) {
  const next = { ...(o || {}) };
  for (const k of Object.keys(next)) {
    const v = next[k];
    if (v === undefined || v === null || v === "") { delete next[k]; continue; }
    if (Array.isArray(v) && v.length === 0) { delete next[k]; continue; }
    if (k === "bondDelta" && (!v || typeof v !== "object" || !v.npc)) delete next[k];
  }
  return Object.keys(next).length ? next : undefined;
}

function OutcomeEditor({ outcome, draft, currentBeatId, onChange, onNewBranch }) {
  const o = outcome || {};
  const set = (patch) => onChange(cleanOutcome({ ...o, ...patch }));
  const bond = o.bondDelta && typeof o.bondDelta === "object" ? o.bondDelta : {};
  const beatOpts = allBeatIds(draft).filter((id) => id !== currentBeatId);
  const queueKnown = o.queueBeat ? beatOpts.includes(o.queueBeat) : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "8px 9px", borderRadius: 7,
      background: "rgba(43,34,24,0.03)", border: `1px solid ${C.border}55` }}>
      <Row label="Set flags"><FlagTags value={o.setFlag} onChange={(v) => set({ setFlag: v })} placeholder="flag_set" /></Row>
      <Row label="Clear flags"><FlagTags value={o.clearFlag} onChange={(v) => set({ clearFlag: v })} placeholder="flag_clear" tone={C.inkSubtle} /></Row>
      <Row label="Bond Δ">
        <select value={bond.npc || ""} style={selStyle}
          onChange={(e) => set({ bondDelta: e.target.value ? { npc: e.target.value, amount: Number.isFinite(bond.amount) ? bond.amount : 1 } : undefined })}>
          <option value="">— none —</option>
          {NPC_KEYS.map((k) => <option key={k} value={k}>{NPCS[k].name}</option>)}
        </select>
        <NumberField step="0.5" width={56} value={bond.npc ? bond.amount : undefined}
          onCommit={(n) => bond.npc && set({ bondDelta: { npc: bond.npc, amount: Number.isFinite(n) ? n : 0 } })} />
      </Row>
      <Row label="Currency">
        {CURRENCIES.map((c) => (
          <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <span title={c.label} style={{ font: "600 10px/1 system-ui", color: C.inkSubtle }}>{c.icon}</span>
            <NumberField step="1" width={44} value={Number.isFinite(o[c.key]) ? o[c.key] : undefined}
              onCommit={(n) => set({ [c.key]: Number.isFinite(n) ? Math.trunc(n) : undefined })} />
          </span>
        ))}
      </Row>
      <Row label="Leads to">
        <select style={{ ...selStyle, flex: 1, minWidth: 0 }}
          value={o.queueBeat ? (queueKnown ? o.queueBeat : "__missing") : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__new") { if (onNewBranch) onNewBranch(); return; }   // creates + wires + selects the new beat
            if (v === "__missing") return;
            set({ queueBeat: v || undefined });
          }}>
          <option value="">— none (ends here) —</option>
          {o.queueBeat && !queueKnown && <option value="__missing">⚠ {o.queueBeat} (missing)</option>}
          {beatOpts.map((id) => {
            const t = effectiveBeat(id, draft)?.title || id;
            return <option key={id} value={id}>{t} · {id}</option>;
          })}
          <option value="__new">✦ New branch beat…</option>
        </select>
      </Row>
    </div>
  );
}

// ─── one choice card ─────────────────────────────────────────────────────────

function ChoiceCard({ index, choice, draft, currentBeatId, onChange, onDelete, onNewBranch }) {
  const o = choice.outcome || {};
  const target = o.queueBeat;
  return (
    <div style={{ borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
        background: "rgba(214,97,42,0.07)", borderBottom: `1px solid ${C.border}66` }}>
        <span style={{ width: 17, height: 17, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
          background: C.ember, color: "#fff", font: "700 9px/1 ui-monospace,monospace" }}>{"ABCDEFGH"[index] || "•"}</span>
        <span style={{ font: "600 9px/1 ui-monospace,monospace", color: C.emberDeep }}>{choice.id}</span>
        {target && <span style={{ marginLeft: 4, font: "500 9px/1 system-ui", color: C.inkSubtle }}>→ {target}</span>}
        <button onClick={onDelete} title="Delete this choice"
          style={{ marginLeft: "auto", border: "none", background: "transparent", color: C.redDeep,
            cursor: "pointer", font: "700 13px/1 system-ui", padding: "0 2px" }}>×</button>
      </div>
      <div style={{ padding: "7px 8px", display: "flex", flexDirection: "column", gap: 7 }}>
        <TextInput value={choice.label} placeholder="Choice label (player-facing)"
          onChange={(e) => onChange({ ...choice, label: e.target.value })} style={{ font: "400 11.5px/1.3 Georgia,serif" }} />
        <OutcomeEditor outcome={o} draft={draft} currentBeatId={currentBeatId}
          onChange={(nextOutcome) => onChange({ ...choice, outcome: nextOutcome })}
          onNewBranch={() => onNewBranch(choice.id)} />
      </div>
    </div>
  );
}

// ─── choices block ───────────────────────────────────────────────────────────

function ChoicesBlock({ beatId, draft, onEditBeat, onNewBranch }) {
  const choices = effectiveChoices(beatId, draft);
  const writeChoices = (arr) => onEditBeat(beatId, { choices: arr.length ? arr : undefined });

  const usedIds = new Set(choices.map((c) => c.id));
  const nextId = () => { let i = 1; while (usedIds.has(`choice_${i}`)) i += 1; return `choice_${i}`; };

  return (
    <Section title="Choices" accent={C.ember} hint={`(${choices.length} — player picks one; outcome is whitelisted)`}>
      {choices.length === 0 && (
        <div style={{ font: "italic 400 11px/1.4 Georgia,serif", color: C.inkSubtle }}>
          No choices — this beat shows a single “Continue”. Add one to make it a fork.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {choices.map((c, i) => (
          <ChoiceCard key={c.id} index={i} choice={c} draft={draft} currentBeatId={beatId}
            onChange={(nextChoice) => writeChoices(choices.map((x, j) => (j === i ? nextChoice : x)))}
            onDelete={() => writeChoices(choices.filter((_, j) => j !== i))}
            onNewBranch={(choiceId) => onNewBranch(beatId, choiceId)} />
        ))}
      </div>
      <Btn tone="ember" style={{ alignSelf: "flex-start" }}
        onClick={() => writeChoices([...choices, { id: nextId(), label: "New choice" }])}>+ Add choice</Btn>
    </Section>
  );
}

// ─── trigger editor (all beats) ──────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: "none",                 label: "— no trigger (queued by a choice) —" },
  { value: "flag_set",             label: "After a flag is set" },
  { value: "resource_total",       label: "Resource total ≥ N" },
  { value: "resource_total_multi", label: "Several resource totals ≥ N" },
  { value: "craft_made",           label: "An item is crafted" },
  { value: "building_built",       label: "A building is built" },
  { value: "boss_defeated",        label: "A boss is defeated" },
  { value: "bond_at_least",        label: "NPC bond ≥ N (resolves at settle)" },
  { value: "act_entered",          label: "An act is entered" },
  { value: "all_buildings_built",  label: "All buildings are built" },
  { value: "session_start",        label: "Every session start" },
  { value: "session_ended",        label: "Every session end" },
];
const FLAG_OPTIONS = STORY_FLAGS.map((f) => f.id);

function defaultTriggerFor(type) {
  switch (type) {
    case "flag_set":             return { type: "flag_set", flag: FLAG_OPTIONS[0] || "hearth_lit" };
    case "resource_total":       return { type: "resource_total", key: "wood_log", amount: 10 };
    case "resource_total_multi": return { type: "resource_total_multi", req: { wood_log: 10 } };
    case "craft_made":           return { type: "craft_made", item: "bread" };
    case "building_built":       return { type: "building_built", id: "mill" };
    case "boss_defeated":        return { type: "boss_defeated", id: "frostmaw" };
    case "bond_at_least":        return { type: "bond_at_least", npc: "wren", amount: 8 };
    case "act_entered":          return { type: "act_entered", act: 2 };
    case "all_buildings_built":  return { type: "all_buildings_built" };
    case "session_start":        return { type: "session_start" };
    case "session_ended":        return { type: "session_ended" };
    default:                     return undefined;
  }
}

const taStyle = { padding: "5px 7px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
  font: "400 11px/1.4 ui-monospace,monospace", color: C.ink, outline: "none", resize: "vertical", boxSizing: "border-box" };

function TriggerFields({ trigger, onChange }) {
  const t = trigger;
  switch (t.type) {
    case "flag_set":
    case "flag_cleared":
      return (
        <Row label="Flag">
          <input list="story-flag-options" style={{ ...selStyle, flex: 1, fontFamily: "ui-monospace,monospace" }} value={t.flag || ""}
            placeholder="flag_name" onChange={(e) => onChange({ ...t, flag: e.target.value })} />
          <datalist id="story-flag-options">{FLAG_OPTIONS.map((f) => <option key={f} value={f} />)}</datalist>
        </Row>
      );
    case "resource_total":
      return (
        <Row label="Resource">
          <input style={{ ...selStyle, flex: 1, fontFamily: "ui-monospace,monospace" }} value={t.key || ""} placeholder="e.g. wood_log"
            onChange={(e) => onChange({ ...t, key: e.target.value })} />
          <span style={{ font: "600 11px/1 system-ui", color: C.inkSubtle }}>≥</span>
          <NumberField step="1" width={56} value={Number.isFinite(t.amount) ? t.amount : undefined}
            onCommit={(n) => onChange({ ...t, amount: Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1 })} />
        </Row>
      );
    case "resource_total_multi": {
      const text = Object.entries(t.req || {}).map(([k, v]) => `${k} ${v}`).join("\n");
      return (
        <Row label="Resources">
          <textarea rows={3} value={text} placeholder={"wood_log 20\niron_ingot 5"} style={{ ...taStyle, flex: 1 }}
            onChange={(e) => {
              const req = {};
              for (const line of e.target.value.split("\n")) {
                const m = line.trim().match(/^(\S+)\s+(\d+)$/);
                if (m) req[m[1]] = Number(m[2]);
              }
              onChange({ type: "resource_total_multi", req });
            }} />
        </Row>
      );
    }
    case "craft_made":
      return (
        <Row label="Item">
          <input style={{ ...selStyle, flex: 1, fontFamily: "ui-monospace,monospace" }} value={t.item || ""} placeholder="recipe id, e.g. bread"
            onChange={(e) => onChange(t.count > 1 ? { type: "craft_made", item: e.target.value, count: t.count } : { type: "craft_made", item: e.target.value })} />
          <span style={{ font: "600 11px/1 system-ui", color: C.inkSubtle }}>×</span>
          <NumberField step="1" width={44} value={Number.isFinite(t.count) && t.count > 1 ? t.count : undefined}
            onCommit={(n) => onChange(Number.isFinite(n) && n > 1 ? { type: "craft_made", item: t.item || "", count: Math.trunc(n) } : { type: "craft_made", item: t.item || "" })} />
        </Row>
      );
    case "building_built":
      return <Row label="Building"><input style={{ ...selStyle, flex: 1, fontFamily: "ui-monospace,monospace" }} value={t.id || ""} placeholder="building id, e.g. mill" onChange={(e) => onChange({ type: "building_built", id: e.target.value })} /></Row>;
    case "boss_defeated":
      return <Row label="Boss"><input style={{ ...selStyle, flex: 1, fontFamily: "ui-monospace,monospace" }} value={t.id || ""} placeholder="boss id, e.g. frostmaw" onChange={(e) => onChange({ type: "boss_defeated", id: e.target.value })} /></Row>;
    case "bond_at_least":
      return (
        <Row label="Bond ≥">
          <select style={selStyle} value={t.npc || "wren"} onChange={(e) => onChange({ type: "bond_at_least", npc: e.target.value, amount: t.amount || 8 })}>
            {NPC_KEYS.map((k) => <option key={k} value={k}>{NPCS[k].name}</option>)}
          </select>
          <NumberField step="1" width={50} value={Number.isFinite(t.amount) ? t.amount : 8}
            onCommit={(n) => onChange({ type: "bond_at_least", npc: t.npc || "wren", amount: Number.isFinite(n) && n > 0 ? Math.trunc(n) : 8 })} />
        </Row>
      );
    case "act_entered":
      return (
        <Row label="Act">
          <select style={selStyle} value={t.act || 2} onChange={(e) => onChange({ type: "act_entered", act: Number(e.target.value) })}>
            <option value={1}>I</option><option value={2}>II</option><option value={3}>III</option>
          </select>
        </Row>
      );
    default:
      return null; // session_start / session_ended / all_buildings_built — no extra args
  }
}

function TriggerEditor({ beatId, beat, isMainChain, onEditBeat }) {
  const t = beat?.trigger;
  const type = t?.type || "none";
  const setTrigger = (next) => onEditBeat(beatId, { trigger: next ?? undefined });
  return (
    <Section title="Trigger" accent={isMainChain ? undefined : C.ember}
      hint={isMainChain ? "(built-in story beat — overriding the trigger can break act order; “no trigger” reverts to the built-in)" : "(when does this dialog fire?)"}>
      <Row label="When">
        <select style={{ ...selStyle, flex: 1, minWidth: 0 }} value={type}
          onChange={(e) => { const v = e.target.value; setTrigger(v === "none" ? undefined : defaultTriggerFor(v)); }}>
          {TRIGGER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Row>
      {t && <TriggerFields trigger={t} onChange={(next) => setTrigger(next)} />}
      {!isMainChain && (
        <Row label="Repeat">
          <label style={{ display: "flex", alignItems: "center", gap: 6, font: "400 11px/1.3 system-ui", color: type === "none" ? C.inkSubtle : C.inkLight }}>
            <input type="checkbox" checked={!!beat.repeat} disabled={type === "none"}
              onChange={(e) => onEditBeat(beatId, { repeat: e.target.checked || undefined })} />
            re-fires every time the trigger matches {type === "none" ? "(needs a trigger)" : (t && ["resource_total", "resource_total_multi", "bond_at_least", "flag_set", "flag_cleared"].includes(t.type) ? "— at most once per settle for state conditions" : "")}
          </label>
        </Row>
      )}
    </Section>
  );
}

// ─── inspector shell ─────────────────────────────────────────────────────────

export default function Inspector({ beatId, draft, isDraft, onEditBeat, onNewBranch, onDeleteBeat, onSelect, onPreview }) {
  const beat = effectiveBeat(beatId, draft);
  if (!beat) {
    return (
      <div style={{ width: 340, flexShrink: 0, background: C.parchment, borderLeft: `2px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ font: "italic 400 12px/1.5 Georgia,serif", color: C.inkSubtle, textAlign: "center" }}>
          Select a beat on the canvas or in the sidebar to inspect and edit it.
        </p>
      </div>
    );
  }

  const valTitle = beat.title ?? beatId;
  const valScene = beat.scene ?? "";
  const valBody  = beat.body ?? "";
  const valLines = Array.isArray(beat.lines) ? beat.lines : null;

  const ts = triggerSummary(beat);
  const ring = actColor(beat);
  const isSide = !!(beat.side || !beat.act);
  const incoming = findIncomingChoice(beatId, draft);
  const unreached = isDraft && !beat.trigger && !incoming;

  return (
    <div style={{ width: 340, flexShrink: 0, background: C.parchment, borderLeft: `2px solid ${C.border}`,
      display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* header */}
      <div style={{ padding: "11px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999, background: ring, color: "#fff",
            font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {isDraft ? "DRAFT BEAT" : isSide ? "SIDE BEAT" : `ACT ${["", "I", "II", "III"][beat.act] || beat.act}`}
          </span>
          {beat.choices?.length > 0 && (
            <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999, background: "rgba(214,97,42,0.14)",
              color: C.emberDeep, font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              FORK · {beat.choices.length}
            </span>
          )}
          {(beat.resolution || (isSide && !beat.trigger && !beat.choices?.length)) && (
            <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 999, background: "rgba(90,90,90,0.1)",
              color: C.inkSubtle, font: "700 8px/1 system-ui", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              RESOLUTION
            </span>
          )}
          <button onClick={() => onPreview && onPreview(beatId)} title="Preview this dialogue (walk the branch)"
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999,
              border: `1.5px solid ${C.emberDeep}`, background: C.ember, color: "#fff", font: "700 9px/1 system-ui",
              letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>▶ Preview</button>
          <span style={{ width: "100%", textAlign: "right", marginTop: 2, font: "500 9px/1 ui-monospace,monospace", color: C.inkSubtle }}>{beatId}</span>
        </div>
        {ts && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 7px", borderRadius: 6,
            background: ts.kind === "queued-code" ? "rgba(168,64,16,0.08)" : "rgba(43,34,24,0.06)",
            border: `1px solid ${ts.kind === "queued-code" ? "rgba(168,64,16,0.2)" : "rgba(43,34,24,0.12)"}`, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.inkSubtle }}>{ts.icon}</span>
            <span style={{ font: "600 9px/1 system-ui", letterSpacing: "0.06em", textTransform: "uppercase",
              color: ts.kind === "queued-code" ? C.emberDeep : C.inkSubtle }}>TRIGGER</span>
            <span style={{ font: "400 10px/1 system-ui", color: C.inkLight }}>{ts.label}</span>
          </div>
        )}
        {incoming && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, font: "400 10px/1.3 system-ui", color: C.inkSubtle }}>
            <span>↩ queued by</span>
            <button onClick={() => onSelect(incoming.parentId)}
              style={{ border: "none", background: "transparent", color: C.inkLight, cursor: "pointer", font: "600 10px/1.3 system-ui", textDecoration: "underline", padding: 0 }}>
              {incoming.parent?.title || incoming.parentId}
            </button>
            <span style={{ font: "400 9px/1 ui-monospace,monospace" }}>· “{incoming.choice?.label}”</span>
          </div>
        )}
        {unreached && (
          <div style={{ marginTop: 4, padding: "4px 7px", borderRadius: 6, background: "rgba(226,178,74,0.14)",
            border: "1px dashed rgba(226,178,74,0.6)", font: "400 10px/1.35 system-ui", color: "#7a5810" }}>
            ⚠ Nothing leads here. Point a choice’s “Leads to” at <code style={{ fontFamily: "ui-monospace,monospace" }}>{beatId}</code>, or give this beat a bond trigger.
          </div>
        )}
      </div>

      {/* fields */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <FieldLabel>Title</FieldLabel>
          <TextInput value={valTitle} onChange={(e) => onEditBeat(beatId, { title: e.target.value })} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <FieldLabel>Scene</FieldLabel>
          <select value={valScene} onChange={(e) => onEditBeat(beatId, { scene: e.target.value })}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 12px/1 system-ui", color: C.ink, outline: "none" }}>
            {SCENE_OPTS.map((o) => <option key={o.value || "_none"} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <FieldLabel hint="(single line — used only if Lines is empty)">Body</FieldLabel>
          <textarea rows={2} value={valBody} placeholder="e.g. Mira: 'Bake a loaf with me.'"
            onChange={(e) => onEditBeat(beatId, { body: e.target.value })}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 11px/1.4 system-ui", color: C.ink, outline: "none", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <FieldLabel hint="(one “speaker: text” per row — narrator for narration)">Lines</FieldLabel>
          <textarea rows={6} value={valLines ? linesToText(valLines) : ""}
            placeholder={"narrator: She presses tongs into your palm.\nwren: Took you long enough."}
            onChange={(e) => { const arr = textToLines(e.target.value); onEditBeat(beatId, { lines: arr.length ? arr : undefined }); }}
            style={{ padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff",
              font: "400 11px/1.45 system-ui", color: C.ink, outline: "none", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
        </label>

        <ChoicesBlock beatId={beatId} draft={draft} onEditBeat={onEditBeat} onNewBranch={onNewBranch} />

        <TriggerEditor beatId={beatId} beat={beat} isMainChain={!isSide} onEditBeat={onEditBeat} />

        {isDraft ? (
          <>
            <Section title="On complete · setFlag" hint="(flags marked true when this beat finishes)">
              <Row label="Flags"><FlagTags value={beat.onComplete?.setFlag}
                onChange={(v) => onEditBeat(beatId, { onComplete: v ? { setFlag: v } : null })} placeholder="flag_on_done" /></Row>
            </Section>
            <Section title="Danger zone">
              <Btn tone="danger" style={{ alignSelf: "flex-start" }}
                onClick={() => { if (typeof window === "undefined" || window.confirm(`Delete draft beat “${beat.title || beatId}”? Choices pointing here will be unlinked.`)) onDeleteBeat(beatId); }}>
                🗑 Delete this beat
              </Btn>
            </Section>
          </>
        ) : (
          beat.onComplete && (
            <Section title="Built-in onComplete" hint="(read-only — edit in src/story.js)">
              {Object.entries(beat.onComplete).map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 6 }}>
                  <span style={{ font: "600 9px/1.5 ui-monospace,monospace", color: C.inkSubtle, flexShrink: 0 }}>{k}:</span>
                  <span style={{ font: "400 9px/1.5 ui-monospace,monospace", color: C.inkLight }}>{typeof v === "object" ? JSON.stringify(v) : (Array.isArray(v) ? v.join(", ") : String(v))}</span>
                </div>
              ))}
            </Section>
          )
        )}

        {/* speakers preview */}
        {valLines && valLines.some((l) => l.speaker) && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: -4 }}>
            <span style={{ font: "600 8px/1 system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSubtle }}>Speakers</span>
            {[...new Set(valLines.map((l) => l.speaker).filter(Boolean))].map((sp) => (
              <span key={sp} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Portrait npcKey={sp} size={16} />
                <span style={{ font: "500 9px/1 system-ui", color: NPCS[sp]?.color || C.inkLight }}>{NPCS[sp]?.name || sp}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
