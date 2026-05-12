// Story · Dialogue tab — Balance Manager.
//
// Edits the *presentation* of story beats + side-events: title, scene, the
// single-line `body` or the multi-line `lines` ("speaker: text" per row, where
// `narrator` / an empty speaker means narration), and choice labels. Triggers,
// onComplete effects, and choice outcomes are deliberately not editable here —
// they drive game logic. Patches go to `draft.story.beats[beatId]` and merge
// into the live beats on next load via `applyStoryOverrides`.

import { useState } from "react";
import { STORY_BEATS, SIDE_BEATS, SCENE_THEMES } from "../../story.js";
import { COLORS, TextField, TextArea, Select, FieldRow, Card, SearchBar, SmallButton } from "../shared.jsx";

const ALL_BEATS = [
  ...STORY_BEATS.map((b) => ({ ...b, _group: `Act ${b.act ?? "?"}` })),
  ...SIDE_BEATS.map((b) => ({ ...b, _group: "Side events" })),
];
const SCENE_OPTS = [{ value: "", label: "— none —" }, ...Object.keys(SCENE_THEMES).map((k) => ({ value: k, label: `${k} — ${SCENE_THEMES[k].label}` }))];

const linesToText = (lines) => (Array.isArray(lines) ? lines.map((l) => `${l && l.speaker ? l.speaker : "narrator"}: ${l ? l.text : ""}`).join("\n") : "");
const textToLines = (str) => String(str ?? "").split("\n").filter((r) => r.trim().length > 0).map((row) => {
  const i = row.indexOf(": ");
  if (i > 0) {
    const sp = row.slice(0, i).trim();
    return { speaker: sp === "narrator" || sp === "" ? null : sp, text: row.slice(i + 2) };
  }
  return { speaker: null, text: row.trim() };
});

function Label({ children }) {
  return <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLORS.inkSubtle }}>{children}</div>;
}

export default function StoryTab({ draft, updateDraft }) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = ALL_BEATS.filter((b) => !q || b.id.toLowerCase().includes(q) || (b.title || "").toLowerCase().includes(q) || b._group.toLowerCase().includes(q));

  function patch(beatId, fields) {
    updateDraft((d) => {
      d.story ??= {};
      d.story.beats ??= {};
      const next = { ...(d.story.beats[beatId] ?? {}), ...fields };
      if (fields.choices) next.choices = { ...(d.story.beats[beatId]?.choices ?? {}), ...fields.choices };
      for (const k of Object.keys(next)) {
        const v = next[k];
        if (v === "" || v === undefined || v === null) { delete next[k]; continue; }
        if (Array.isArray(v) && v.length === 0) { delete next[k]; continue; }
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) delete next[k];
      }
      if (Object.keys(next).length === 0) delete d.story.beats[beatId];
      else d.story.beats[beatId] = next;
      if (Object.keys(d.story.beats).length === 0) delete d.story.beats;
      if (Object.keys(d.story).length === 0) delete d.story;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Link to the full visual tree editor */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border-2"
        style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>Visual Tree Editor</div>
          <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>
            Decision-tree canvas with pan/zoom, node cards, and branch edges
          </div>
        </div>
        <a
          href={import.meta.env.BASE_URL.replace(/\/$/, "") + "/story/"}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          <SmallButton variant="primary">Open Tree Editor ↗</SmallButton>
        </a>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Filter beats by id / title / act…" />
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        {filtered.length} of {ALL_BEATS.length} beats. Multi-line dialogue: one row per line, `speaker: text` (use `narrator` for narration).
      </div>
      {filtered.map((b) => {
        const p = (draft.story ?? {}).beats?.[b.id] ?? {};
        const eff = {
          title: p.title ?? b.title ?? b.id,
          scene: p.scene ?? b.scene ?? "",
          body: p.body ?? b.body ?? "",
          lines: Array.isArray(p.lines) ? p.lines : (b.lines ?? null),
        };
        return (
          <Card key={b.id} title={`${b._group} · ${b.id}`}>
            <FieldRow label="Title"><TextField value={eff.title} onChange={(v) => patch(b.id, { title: v })} width={260} /></FieldRow>
            <FieldRow label="Scene"><Select value={eff.scene} onChange={(v) => patch(b.id, { scene: v })} options={SCENE_OPTS} width={200} /></FieldRow>
            <Label>Body (single-line — used when there are no `lines`)</Label>
            <TextArea rows={2} value={eff.body} onChange={(v) => patch(b.id, { body: v })} placeholder="e.g. Mira: 'Bake a loaf with me.'" />
            <Label>Lines (multi-line dialogue — `speaker: text` per row)</Label>
            <TextArea rows={4} value={eff.lines ? linesToText(eff.lines) : ""} onChange={(v) => { const arr = textToLines(v); patch(b.id, { lines: arr.length ? arr : undefined }); }} placeholder={"narrator: She presses tongs into your palm.\nwren: Took you long enough."} />
            {Array.isArray(b.choices) && b.choices.length > 0 && (
              <>
                <Label>Choice labels</Label>
                {b.choices.map((c) => {
                  const lbl = p.choices?.[c.id]?.label ?? c.label;
                  return (
                    <FieldRow key={c.id} label={c.id} hint="label only — the outcome is fixed">
                      <TextField value={lbl} onChange={(v) => patch(b.id, { choices: { [c.id]: { label: v } } })} width={300} />
                    </FieldRow>
                  );
                })}
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
