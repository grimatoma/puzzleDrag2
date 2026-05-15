// Story · Dialogue tab — Balance Manager.
//
// The text-form beat editor that used to live here has been retired in favour
// of the visual decision-tree editor at `/story/` (pan/zoom canvas, node cards,
// branch edges, side inspector). Both write to the same `draft.story.beats[…]`
// in the shared `hearth.balance.draft` localStorage key, so overrides flow
// through `applyStoryOverrides` identically — this tab now just points there.

import { useMemo, useState } from "react";
import { STORY_BEATS, SIDE_BEATS } from "../../story.js";
import { COLORS, SmallButton } from "../shared.jsx";
import { renderStoryMarkdown } from "../../storyEditor/exportMarkdown.js";
import { groupedStoryWarnings } from "../../storyEditor/shared.jsx";
import StatsPanel from "../../storyEditor/StatsPanel.jsx";

const STORY_EDITOR_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/story/";

function downloadMarkdown(md, filename = "hearthlands-story.md") {
  if (typeof document === "undefined") return;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StoryTab({ draft }) {
  const counts = `${STORY_BEATS.length} story beat${STORY_BEATS.length === 1 ? "" : "s"} · ${SIDE_BEATS.length} side event${SIDE_BEATS.length === 1 ? "" : "s"}`;
  const { total: warningTotal } = useMemo(() => groupedStoryWarnings(draft), [draft]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const markdown = useMemo(() => previewOpen ? renderStoryMarkdown(draft) : "", [draft, previewOpen]);
  const draftBeats = Array.isArray(draft?.story?.newBeats) ? draft.story.newBeats.length : 0;
  const draftBeatOverrides = Object.keys(draft?.story?.beats || {}).length;
  const suppressed = Array.isArray(draft?.story?.suppressedBeats) ? draft.story.suppressedBeats.length : 0;

  return (
    <div className="flex flex-col gap-4 max-w-[720px]">
      <div className="rounded-xl border-2 p-5" style={{ background: COLORS.parchment, borderColor: COLORS.border, boxShadow: "0 1px 0 rgba(0,0,0,0.08)" }}>
        <div className="text-[18px] font-bold" style={{ color: COLORS.ink }}>Story &amp; Dialogue · Visual Tree Editor</div>
        <p className="text-[13px] leading-relaxed mt-2" style={{ color: COLORS.inkLight }}>
          Beat editing lives in the full-page <b>decision-tree editor</b> — a pan/zoom canvas of every
          beat as a node card, with branch edges, a searchable beat list, and a side inspector. From there you can
          edit the title / scene / dialogue lines, <b>add · remove · re-label choices and edit their outcomes</b>
          {" "}(flags, bond, currency, branch target), <b>author whole new dialogue branches &amp; side beats</b>,
          and collapse / expand forks to tidy the map. It writes to the same draft as this Balance Manager
          (the <code style={{ fontFamily: "ui-monospace,monospace" }}>hearth.balance.draft</code> key) — beat patches go to
          {" "}<code style={{ fontFamily: "ui-monospace,monospace" }}>story.beats</code> and new beats to
          {" "}<code style={{ fontFamily: "ui-monospace,monospace" }}>story.newBeats</code>, both picked up by
          {" "}<code style={{ fontFamily: "ui-monospace,monospace" }}>applyStoryOverrides</code> on the game's next load.
        </p>
        <div className="text-[11px] italic mt-2" style={{ color: COLORS.inkSubtle }}>{counts}</div>
        <div className="mt-4 flex items-center gap-3">
          <a href={STORY_EDITOR_URL} target="_blank" rel="noopener noreferrer" className="no-underline">
            <SmallButton variant="primary">Open Story Editor ↗</SmallButton>
          </a>
          <a href={STORY_EDITOR_URL} className="text-[11px] underline" style={{ color: COLORS.inkSubtle }}>{STORY_EDITOR_URL}</a>
        </div>
      </div>

      <div className="rounded-xl border-2 p-4" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
        <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSubtle }}>
          Draft summary
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Beat patches", n: draftBeatOverrides },
            { label: "Author beats", n: draftBeats },
            { label: "Suppressed sides", n: suppressed },
            { label: "Validation issues", n: warningTotal, alarm: warningTotal > 0 },
          ].map((cell) => (
            <div key={cell.label}
              className="flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2"
              style={{
                background: cell.alarm ? "#fff0eb" : (cell.n > 0 ? "#fff5e6" : COLORS.parchmentDeep),
                borderColor: cell.alarm ? COLORS.red : (cell.n > 0 ? COLORS.ember : COLORS.border),
              }}>
              <div className="text-[20px] font-bold" style={{ color: cell.alarm ? COLORS.red : (cell.n > 0 ? COLORS.ember : COLORS.inkSubtle) }}>{cell.n}</div>
              <div className="text-[10px] uppercase tracking-wide font-bold text-center" style={{ color: COLORS.inkSubtle }}>{cell.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border-2 p-4" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
        <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSubtle }}>
          Story analytics
        </div>
        <StatsPanel draft={draft} />
      </div>

      <div className="rounded-xl border-2 p-4" style={{ background: COLORS.parchment, borderColor: COLORS.border }}>
        <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSubtle }}>
          Export script
        </div>
        <p className="text-[12px]" style={{ color: COLORS.inkLight }}>
          Render every beat (built-ins + draft overrides + author-created drafts) as a single markdown screenplay
          — handy for proofreading the full arc, sharing with a writer in Google Docs, or diffing two drafts in plain text.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <SmallButton variant="primary" onClick={() => downloadMarkdown(renderStoryMarkdown(draft))}>
            ⬇ Download story.md
          </SmallButton>
          <SmallButton onClick={() => setPreviewOpen((v) => !v)}>
            {previewOpen ? "Hide preview" : "Preview ↓"}
          </SmallButton>
        </div>
        {previewOpen && (
          <pre className="mt-3 text-[11px] font-mono p-3 rounded-lg border-2 overflow-auto"
            style={{ background: "#fff", borderColor: COLORS.border, color: COLORS.ink, maxHeight: 360, whiteSpace: "pre-wrap" }}>
            {markdown}
          </pre>
        )}
      </div>
    </div>
  );
}
