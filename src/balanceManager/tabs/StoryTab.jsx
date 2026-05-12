// Story · Dialogue tab — Balance Manager.
//
// The text-form beat editor that used to live here has been retired in favour
// of the visual decision-tree editor at `/story/` (pan/zoom canvas, node cards,
// branch edges, side inspector). Both write to the same `draft.story.beats[…]`
// in the shared `hearth.balance.draft` localStorage key, so overrides flow
// through `applyStoryOverrides` identically — this tab now just points there.

import { STORY_BEATS, SIDE_BEATS } from "../../story.js";
import { COLORS, SmallButton } from "../shared.jsx";

const STORY_EDITOR_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/story/";

export default function StoryTab() {
  const counts = `${STORY_BEATS.length} story beat${STORY_BEATS.length === 1 ? "" : "s"} · ${SIDE_BEATS.length} side event${SIDE_BEATS.length === 1 ? "" : "s"}`;
  return (
    <div className="flex flex-col gap-4 max-w-[640px]">
      <div className="rounded-xl border-2 p-5" style={{ background: COLORS.parchment, borderColor: COLORS.border, boxShadow: "0 1px 0 rgba(0,0,0,0.08)" }}>
        <div className="text-[18px] font-bold" style={{ color: COLORS.ink }}>Story &amp; Dialogue · Visual Tree Editor</div>
        <p className="text-[13px] leading-relaxed mt-2" style={{ color: COLORS.inkLight }}>
          Beat editing now lives in the full-page <b>decision-tree editor</b> — a pan/zoom canvas of every
          beat as a node card, with branch edges, a searchable beat list, and a side inspector for the
          title / scene / dialogue lines / choice labels. It writes to the same draft as this Balance
          Manager (the <code style={{ fontFamily: "ui-monospace,monospace" }}>hearth.balance.draft</code> key),
          so edits flow through <code style={{ fontFamily: "ui-monospace,monospace" }}>applyStoryOverrides</code> exactly
          as before — just bring your edits over there.
        </p>
        <div className="text-[11px] italic mt-2" style={{ color: COLORS.inkSubtle }}>{counts}</div>
        <div className="mt-4 flex items-center gap-3">
          <a href={STORY_EDITOR_URL} target="_blank" rel="noopener noreferrer" className="no-underline">
            <SmallButton variant="primary">Open Story Editor ↗</SmallButton>
          </a>
          <a href={STORY_EDITOR_URL} className="text-[11px] underline" style={{ color: COLORS.inkSubtle }}>{STORY_EDITOR_URL}</a>
        </div>
      </div>
      <div className="text-[11px] italic" style={{ color: COLORS.inkSubtle }}>
        Tip: the <b>Simulate</b> tab (next to this one) walks a beat from any start state and records the path + outcomes.
      </div>
    </div>
  );
}
