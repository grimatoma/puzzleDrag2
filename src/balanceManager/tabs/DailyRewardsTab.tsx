// Daily Rewards tab — Dev Panel.
//
// Tunes the coin / rune amounts on the 30-day login reward track. Tool drops
// and tile unlocks aren't editable here. Patches go to `draft.dailyRewards[day]`
// and merge into the live DAILY_REWARDS table on next load via
// `applyDailyRewardOverrides`.

import { DAILY_REWARDS } from "../../constants.js";
import { COLORS, NumberField, FieldRow, Card } from "../shared.jsx";
import type { BalanceDraft } from "../index.jsx";

interface DailyRewardEntry {
  coins?: number;
  runes?: number;
  tool?: string;
  amount?: number;
  unlockTile?: string;
}
const DAYS: number[] = Object.keys(DAILY_REWARDS).map(Number).sort((a, b) => a - b);

export default function DailyRewardsTab({ draft, updateDraft }: { draft: BalanceDraft; updateDraft: (updater: (draft: BalanceDraft) => void) => void }) {
  function patch(day: number, fields: DailyRewardEntry) {
    updateDraft((d) => {
      const rewards = (d.dailyRewards ?? {}) as Record<string, DailyRewardEntry>;
      d.dailyRewards = rewards;
      const key = String(day);
      const next: DailyRewardEntry = { ...(rewards[key] ?? {}), ...fields };
      for (const k of Object.keys(next)) {
        const v = (next as Record<string, unknown>)[k];
        if (v === "" || v == null) delete (next as Record<string, unknown>)[k];
      }
      if (Object.keys(next).length === 0) delete rewards[key];
      else rewards[key] = next;
      if (Object.keys(rewards).length === 0) d.dailyRewards = {};
    });
  }
  const dailyRewards = DAILY_REWARDS as unknown as Record<number, DailyRewardEntry>;
  return (
    <Card title="30-day login rewards">
      <div className="text-[11px] italic mb-1" style={{ color: COLORS.inkSubtle }}>
        Coins / runes per day. Days with a 🎁 also drop a tool or unlock a tile (not shown — left as-is).
      </div>
      {DAYS.map((day) => {
        const base = dailyRewards[day] ?? {};
        const draftRewards = (draft.dailyRewards ?? {}) as Record<string, DailyRewardEntry>;
        const p = draftRewards[String(day)] ?? {};
        const coins = p.coins ?? base.coins ?? 0;
        const runes = p.runes ?? base.runes ?? 0;
        const extra = base.tool || base.unlockTile ? " 🎁" : "";
        return (
          <FieldRow key={day} label={`Day ${day}${extra}`} hint={base.tool ? `tool: ${base.tool}${base.unlockTile ? `, unlock: ${base.unlockTile}` : ""}` : base.unlockTile ? `unlock: ${base.unlockTile}` : undefined}>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>coins</span>
              <NumberField value={coins} onChange={(v: number) => patch(day, { coins: v })} min={0} max={99999} width={80} />
              <span className="text-[10px]" style={{ color: COLORS.inkSubtle }}>runes</span>
              <NumberField value={runes} onChange={(v: number) => patch(day, { runes: v })} min={0} max={999} width={60} />
            </div>
          </FieldRow>
        );
      })}
    </Card>
  );
}
