import Button from "../../ui/primitives/Button.jsx";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import type { Dispatch, GameState } from "../../types/state";

export const modalKey = "daily_streak";

type DailyReward = { coins?: number; runes?: number; tool?: string; amount?: number; unlockTile?: string };

export default function DailyStreakModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  if (state.modal !== "daily_streak") return null;
  const day = (state.modalParams?.day as number) ?? state.dailyStreak?.currentDay ?? 1;
  const reward = (state.modalParams?.reward ?? {}) as DailyReward;
  const close = () => dispatch({ type: "CLOSE_MODAL" });
  return (
    <ParchmentDialog open onClose={close} size="sm">
      <ParchmentDialog.Title>Daily Reward — Day {day}</ParchmentDialog.Title>
      <ParchmentDialog.Body>
        <p className="text-body text-ink-mid" data-testid="daily-streak-day">You're on a {day}-day streak.</p>
        <ul className="text-body text-ink-mid" data-testid="daily-streak-reward">
          {reward.coins ? <li>+{reward.coins} coins</li> : null}
          {reward.runes ? <li>+{reward.runes} runes</li> : null}
          {reward.tool ? <li>+{reward.amount ?? 1} {reward.tool} tool</li> : null}
          {reward.unlockTile ? <li>Unlocked a new tile!</li> : null}
        </ul>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={close}>Collect</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
