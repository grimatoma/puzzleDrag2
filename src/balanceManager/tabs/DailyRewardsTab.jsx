// Daily Rewards tab — Balance Manager.
//
// Tunes the coin / rune amounts on the 30-day login reward track. Tool drops
// and tile unlocks aren't editable here. Patches go to `draft.dailyRewards[day]`
// and merge into the live DAILY_REWARDS table on next load via
// `applyDailyRewardOverrides`.

import { DAILY_REWARDS } from "../../constants.js";
import { COLORS, NumberField, FieldRow, Card } from "../shared.jsx";

const DAYS = Object.keys(DAILY_REWARDS).map(Number).sort((a, b) => a - b);

export default function DailyRewardsTab({ draft, updateDraft }) {
  function patch(day, fields) {
    updateDraft((d) => {
      d.dailyRewards ??= {};
      const key = String(day);
      const next = { ...(d.dailyRewards[key] ?? {}), ...fields };
      for (const k of Object.keys(next)) if (next[k] === "" || next[k] == null) delete next[k];
      if (Object.keys(next).length === 0) delete d.dailyRewards[key];
      else d.dailyRewards[key] = next;
      if (Object.keys(d.dailyRewards).length === 0) delete d.dailyRewards;
    });
  }
  return (
    <Card title="30-day login rewards">
      <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
        Coins / runes per day. Days with a 🎁 also drop a tool or unlock a tile (not shown — left as-is).
      </div>
      {DAYS.map((day) => {
        const base = DAILY_REWARDS[day] ?? {};
        const p = (draft.dailyRewards ?? {})[String(day)] ?? {};
        const coins = p.coins ?? base.coins ?? 0;
        const runes = p.runes ?? base.runes ?? 0;
        const extra = base.tool || base.unlockTile ? " 🎁" : "";
        return (
          <FieldRow key={day} label={`Day ${day}${extra}`} hint={base.tool ? `tool: ${base.tool}${base.unlockTile ? `, unlock: ${base.unlockTile}` : ""}` : base.unlockTile ? `unlock: ${base.unlockTile}` : undefined}>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>coins</span>
              <NumberField value={coins} onChange={(v) => patch(day, { coins: v })} min={0} max={99999} width={80} />
              <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>runes</span>
              <NumberField value={runes} onChange={(v) => patch(day, { runes: v })} min={0} max={999} width={60} />
            </div>
          </FieldRow>
        );
      })}
    </Card>
  );
}
