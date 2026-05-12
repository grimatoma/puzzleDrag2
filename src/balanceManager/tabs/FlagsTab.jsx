// Balance Manager · Flags tab — read-only audit of every story flag.
//
// Story flags have no registry: a flag pops into existence the moment a beat's
// `onComplete.setFlag` or a choice's `outcome.setFlag` fires (`state.story.flags`
// starts `{}`, default-false). This tab scans STORY_BEATS + SIDE_BEATS for every
// flag that's set/cleared and pairs it with a curated list of the codebase reads
// (`state.story.flags.X` references that aren't derivable from the beat data),
// so you can spot orphans — "set but never read" (dead flag / typo) and "read
// but never set" (broken guard). Editing flag metadata (descriptions, defaults,
// rename) would need a real FLAGS registry in the game first — out of scope here.

import { useState, useMemo } from "react";
import { STORY_BEATS, SIDE_BEATS, firedFlagKey } from "../../story.js";
import { COLORS } from "../shared.jsx";

// Curated reads — `state.story.flags.X` references in slices / triggers / UI
// that the beat data can't tell us about. Keep in sync with the codebase.
const FLAG_READS = {
  festival_announced:   [{ where: "src/story.js", note: "act3_win trigger guard" }, { where: "src/ui/Hud.jsx", note: "festival larder progress HUD" }],
  isWon:                [{ where: "src/ui/Hud.jsx", note: "win banner + sandbox affordances" }],
  mine_unlocked:        [{ where: "src/state.js", note: "gates mine-only actions" }],
  keeper_choice_made:   [{ where: "src/features/boss/slice.js", note: "post-Frostmaw audit-boss flavour" }],
  keeper_path_coexist:  [{ where: "src/features/boss/slice.js", note: "Coexist audit-boss line" }],
  keeper_path_driveout: [{ where: "src/features/boss/slice.js", note: "Drive-out audit-boss line" }],
  frostmaw_active:      [{ where: "src/features/boss/slice.js", note: "audit-boss cadence gate" }, { where: "src/features/bosses/Gallery.jsx", note: "boss gallery state" }],
};

function flagCategory(name) {
  if (name.startsWith("_fired_")) return { id: "auto",  label: "Auto · system",  color: COLORS.slate };
  if (name.startsWith("keeper_")) return { id: "keep",  label: "Frostmaw arc",   color: "#7a8b5e" };
  if (name.startsWith("mira_"))   return { id: "mira",  label: "Mira arc",       color: "#c9863a" };
  const progression = new Set(["intro_seen", "hearth_lit", "first_craft", "first_iron", "mill_built", "frostmaw_active", "mine_revealed", "mine_unlocked", "caravan_open", "festival_announced", "isWon"]);
  if (progression.has(name) || name.endsWith("_built") || name.endsWith("_lit") || name.endsWith("_active")) return { id: "story", label: "Progression", color: COLORS.emberDeep };
  return { id: "misc", label: "Misc", color: COLORS.inkSubtle };
}

const ALL_BEATS = [
  ...STORY_BEATS.map((b) => ({ ...b, _group: b.act ? `Act ${b.act}` : "Story" })),
  ...SIDE_BEATS.map((b) => ({ ...b, _group: "Side events" })),
];

/** Scan beat data → { name → { name, setBy:[], clearedBy:[], readBy:[] } }. */
function collectFlags() {
  const flags = {};
  const ensure = (name) => (flags[name] ||= { name, setBy: [], clearedBy: [], readBy: [] });
  const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  for (const b of ALL_BEATS) {
    for (const k of asList(b.onComplete?.setFlag)) ensure(k).setBy.push({ type: "beat", beatId: b.id, beatTitle: b.title || b.id });
    if (!b.onComplete?.setFlag) ensure(firedFlagKey(b.id)).setBy.push({ type: "auto", beatId: b.id, beatTitle: b.title || b.id, note: "implicit fired marker" });
    for (const c of b.choices || []) {
      for (const k of asList(c.outcome?.setFlag)) ensure(k).setBy.push({ type: "choice", beatId: b.id, beatTitle: b.title || b.id, choiceId: c.id, choiceLabel: c.label });
      for (const k of asList(c.outcome?.clearFlag)) ensure(k).clearedBy.push({ type: "choice", beatId: b.id, beatTitle: b.title || b.id, choiceId: c.id, choiceLabel: c.label });
    }
  }
  for (const f of Object.values(flags)) {
    if (FLAG_READS[f.name]) f.readBy = FLAG_READS[f.name].slice();
    if (f.name.startsWith("_fired_")) f.readBy.push({ where: "src/story.js", note: "beat-progress tracking (isBeatComplete / nextPendingBeat)" });
  }
  for (const k of Object.keys(FLAG_READS)) if (!flags[k]) flags[k] = { name: k, setBy: [], clearedBy: [], readBy: FLAG_READS[k].slice() };
  return Object.values(flags).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function CatDot({ name }) {
  return <span className="inline-block rounded-[2px] flex-shrink-0" style={{ width: 8, height: 8, background: flagCategory(name).color }} />;
}
function Tag({ children, color = COLORS.inkSubtle, bg = COLORS.parchmentDeep }) {
  return <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color, background: bg, border: `1px solid ${color}33` }}>{children}</span>;
}
function SourceLine({ s }) {
  const isChoice = s.type === "choice";
  return (
    <div className="text-[11px] leading-snug" style={{ color: COLORS.ink }}>
      <span style={{ color: isChoice ? COLORS.emberDeep : COLORS.inkSubtle, fontWeight: 700 }}>{isChoice ? "▶ " : s.type === "auto" ? "○ " : "● "}</span>
      <span>{s.beatTitle}</span>
      <span style={{ color: COLORS.inkSubtle, fontFamily: "ui-monospace,monospace" }}> · {s.beatId}{isChoice ? `:${s.choiceId}` : ""}</span>
    </div>
  );
}

// ─── Inspector ───────────────────────────────────────────────────────────────

function Inspector({ flag }) {
  if (!flag) return <div className="flex-1 grid place-items-center text-[12px] italic" style={{ color: COLORS.inkSubtle }}>Select a flag to inspect.</div>;
  const cat = flagCategory(flag.name);
  const setCount = flag.setBy.length, readCount = flag.readBy.length;
  return (
    <div className="w-[360px] flex-shrink-0 border-l-2 overflow-y-auto p-4 flex flex-col gap-4" style={{ background: "#fff", borderColor: COLORS.border }}>
      <div>
        <div className="flex items-center gap-1.5 mb-1"><CatDot name={flag.name} /><span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cat.color }}>{cat.label}</span></div>
        <div className="text-[16px] font-bold break-all" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.ink }}>{flag.name}</div>
        <div className="text-[10px] italic mt-1" style={{ color: COLORS.inkSubtle }}>Boolean · default <b>false</b> on a new run (flags aren't persisted in a registry).</div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-baseline justify-between" style={{ color: COLORS.inkSubtle }}><span>Set by</span><span style={{ fontFamily: "ui-monospace,monospace" }}>{setCount}</span></div>
        {setCount === 0 ? (
          <div className="rounded-lg p-2 text-[11px] leading-snug" style={{ background: "rgba(194,59,34,0.06)", border: "1px dashed rgba(194,59,34,0.35)" }}>
            <b style={{ color: COLORS.redDeep }}>✕ Nothing sets this flag.</b><br /><span style={{ color: COLORS.inkSubtle }} className="italic">It's only referenced by a read — likely a typo or dead guard.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {flag.setBy.map((s, i) => (
              <div key={i} className="rounded-lg p-2" style={{ background: s.type === "choice" ? "rgba(214,97,42,0.06)" : COLORS.parchment, border: `1px solid ${s.type === "choice" ? "rgba(214,97,42,0.3)" : COLORS.border}` }}>
                <div className="flex items-center gap-1.5 mb-0.5"><Tag color={s.type === "choice" ? COLORS.emberDeep : COLORS.inkSubtle}>{s.type === "choice" ? "Choice outcome" : s.type === "auto" ? "Implicit fired marker" : "Beat onComplete"}</Tag><span className="ml-auto text-[9px]" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.inkSubtle }}>{s.beatId}</span></div>
                <div className="text-[12px]" style={{ color: COLORS.ink }}>{s.beatTitle}</div>
                {s.type === "choice" && <div className="text-[10px] italic mt-0.5" style={{ color: COLORS.inkSubtle }}>“{s.choiceLabel}”</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {flag.clearedBy.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: COLORS.inkSubtle }}>Cleared by · {flag.clearedBy.length}</div>
          <div className="flex flex-col gap-1">{flag.clearedBy.map((s, i) => <SourceLine key={i} s={s} />)}</div>
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-baseline justify-between" style={{ color: COLORS.inkSubtle }}><span>Read by</span><span style={{ fontFamily: "ui-monospace,monospace" }}>{readCount}</span></div>
        {readCount === 0 ? (
          <div className="rounded-lg p-2 text-[11px] leading-snug" style={{ background: "rgba(226,178,74,0.10)", border: "1px dashed rgba(226,178,74,0.5)" }}>
            <b style={{ color: "#7a5810" }}>⚠ Nothing reads this flag yet.</b><br /><span style={{ color: COLORS.inkSubtle }} className="italic">It's recorded but has no effect — wire it to a trigger guard or a feature slice.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {flag.readBy.map((r, i) => (
              <div key={i} className="rounded-lg p-2" style={{ background: COLORS.parchment, border: `1px solid ${COLORS.border}` }}>
                <div className="text-[11px] font-bold" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.ink }}>{r.where}</div>
                <div className="text-[10px] italic mt-0.5" style={{ color: COLORS.inkSubtle }}>{r.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

const CATS = [
  { id: "all",   label: "All" },
  { id: "story", label: "Progression" },
  { id: "keep",  label: "Frostmaw arc" },
  { id: "mira",  label: "Mira arc" },
  { id: "auto",  label: "Auto" },
  { id: "misc",  label: "Misc" },
];

export default function FlagsTab() {
  const allFlags = useMemo(() => collectFlags(), []);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [onlyOrphans, setOnlyOrphans] = useState(false);
  const [includeFired, setIncludeFired] = useState(false);
  const [sel, setSel] = useState(null);

  const orphanSet = (f) => f.setBy.length > 0 && f.readBy.length === 0;
  const orphanRead = (f) => f.setBy.length === 0 && f.readBy.length > 0;

  const setNeverRead = allFlags.filter(orphanSet).filter((f) => !f.name.startsWith("_fired_"));
  const readNeverSet = allFlags.filter(orphanRead);

  const query = q.trim().toLowerCase();
  const shown = allFlags.filter((f) => {
    if (!includeFired && f.name.startsWith("_fired_")) return false;
    if (cat !== "all" && flagCategory(f.name).id !== cat) return false;
    if (onlyOrphans && !(orphanSet(f) || orphanRead(f))) return false;
    if (query && !f.name.toLowerCase().includes(query)) return false;
    return true;
  });
  const selectedFlag = shown.find((f) => f.name === sel) || null;
  const catCount = (id) => allFlags.filter((f) => (includeFired || !f.name.startsWith("_fired_")) && (id === "all" || flagCategory(f.name).id === id)).length;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Header + diagnostics */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg border-2 flex-shrink-0" style={{ background: COLORS.parchmentDeep, borderColor: COLORS.border }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: COLORS.ink }}>Story Flags</div>
          <div className="text-[10px] italic" style={{ color: COLORS.inkSubtle }}>Read-only audit — booleans set by beats/choices, read by triggers, slices &amp; UI gates. (No registry: editable metadata would need a FLAGS table in the game first.)</div>
        </div>
        <div className="flex items-center gap-2 ml-1">
          <span className="text-[20px] font-bold" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.ink }}>{shown.length}</span>
          <span className="text-[11px]" style={{ color: COLORS.inkSubtle }}>shown / {allFlags.length}</span>
          {setNeverRead.length > 0 && <Tag color="#7a5810" bg="rgba(226,178,74,0.18)">⚠ {setNeverRead.length} set · never read</Tag>}
          {readNeverSet.length > 0 && <Tag color={COLORS.redDeep} bg="rgba(194,59,34,0.10)">✕ {readNeverSet.length} read · never set</Tag>}
        </div>
        <div className="ml-auto relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search flag name…" className="pl-7 pr-2 py-1.5 text-[12px] rounded-lg border-2 outline-none w-[220px]" style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink }} />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: COLORS.inkSubtle }}>🔍</span>
        </div>
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg border flex-shrink-0" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
        <span className="text-[10px] font-bold uppercase tracking-wide mr-1" style={{ color: COLORS.inkSubtle }}>Filter</span>
        {CATS.map((c) => {
          const active = cat === c.id;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-colors"
              style={{ background: active ? COLORS.ink : "#fff", color: active ? "#fff" : COLORS.ink, borderColor: active ? COLORS.ink : COLORS.border }}>
              {c.id !== "all" && <span className="inline-block rounded-[2px]" style={{ width: 6, height: 6, background: flagCategory(c.id === "keep" ? "keeper_x" : c.id === "mira" ? "mira_x" : c.id === "auto" ? "_fired_x" : c.id === "story" ? "intro_seen" : "zz").color }} />}
              {c.label}<span className="text-[9px]" style={{ fontFamily: "ui-monospace,monospace", opacity: 0.7 }}>{catCount(c.id)}</span>
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.inkSubtle }}><input type="checkbox" checked={onlyOrphans} onChange={(e) => setOnlyOrphans(e.target.checked)} /> only orphans</label>
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.inkSubtle }}><input type="checkbox" checked={includeFired} onChange={(e) => setIncludeFired(e.target.checked)} /> include <span style={{ fontFamily: "ui-monospace,monospace", color: COLORS.ink }}>_fired_*</span></label>
      </div>

      {/* Table + inspector */}
      <div className="flex-1 min-h-0 flex rounded-lg border-2 overflow-hidden" style={{ borderColor: COLORS.border }}>
        <div className="flex-1 min-w-0 flex flex-col" style={{ background: COLORS.parchment }}>
          <div className="grid gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-wide flex-shrink-0" style={{ gridTemplateColumns: "minmax(0,1.4fr) 120px minmax(0,1.2fr) minmax(0,1.2fr)", background: COLORS.parchmentDeep, borderBottom: `1px solid ${COLORS.border}`, color: COLORS.inkSubtle }}>
            <span>Flag name</span><span>Category</span><span>Set by</span><span>Read by</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {shown.length === 0 && <div className="p-4 text-[12px] italic" style={{ color: COLORS.inkSubtle }}>No flags match.</div>}
            {shown.map((f) => {
              const cInfo = flagCategory(f.name);
              const isSel = f.name === sel;
              return (
                <button key={f.name} onClick={() => setSel(f.name)} className="w-full text-left grid gap-2 px-3 py-2 items-start transition-colors"
                  style={{ gridTemplateColumns: "minmax(0,1.4fr) 120px minmax(0,1.2fr) minmax(0,1.2fr)", background: isSel ? "rgba(214,97,42,0.08)" : "transparent", borderBottom: `1px solid ${COLORS.border}55`, borderLeft: `3px solid ${isSel ? COLORS.ember : "transparent"}` }}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <CatDot name={f.name} />
                    <span className="text-[12px] font-bold truncate" style={{ fontFamily: "ui-monospace,monospace", color: COLORS.ink }} title={f.name}>{f.name}</span>
                    {orphanSet(f) && !f.name.startsWith("_fired_") && <span title="set but never read" style={{ color: "#b88a10", fontSize: 11 }}>⚠</span>}
                    {orphanRead(f) && <span title="read but never set" style={{ color: COLORS.redDeep, fontSize: 11 }}>✕</span>}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: cInfo.color }}>{cInfo.label}</span>
                  <span className="min-w-0">
                    {f.setBy.length === 0 ? <span className="text-[10px] italic" style={{ color: COLORS.redDeep }}>nothing</span>
                      : f.setBy.slice(0, 2).map((s, i) => <SourceLine key={i} s={s} />)}
                    {f.setBy.length > 2 && <span className="text-[9px] italic" style={{ color: COLORS.inkSubtle }}>+{f.setBy.length - 2} more</span>}
                  </span>
                  <span className="min-w-0">
                    {f.readBy.length === 0 ? <span className="text-[10px] italic" style={{ color: "#b88a10" }}>nothing yet</span>
                      : f.readBy.slice(0, 2).map((r, i) => <div key={i} className="text-[10px] truncate" style={{ color: COLORS.inkSubtle }}><span style={{ fontFamily: "ui-monospace,monospace" }}>{r.where}</span> · {r.note}</div>)}
                    {f.readBy.length > 2 && <span className="text-[9px] italic" style={{ color: COLORS.inkSubtle }}>+{f.readBy.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Inspector flag={selectedFlag} />
      </div>
    </div>
  );
}
