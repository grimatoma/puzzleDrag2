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
    </div>
  );
}
