import Button from "../../ui/primitives/Button.jsx";
import { ParchmentDialog } from "../../ui/primitives/Dialog.jsx";
import type { Dispatch, GameState } from "../../types/state";

export const modalKey = "festivals";

export default function FestivalsModal({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  if (state.modal !== "festivals") return null;
  const close = () => dispatch({ type: "CLOSE_MODAL" });
  return (
    <ParchmentDialog open onClose={close} size="sm">
      <ParchmentDialog.Title>Fairground</ParchmentDialog.Title>
      <ParchmentDialog.Body>
        <p className="text-body text-ink-mid">
          Festival events at the fairground are coming soon. For now, return to town and keep building the vale.
        </p>
      </ParchmentDialog.Body>
      <ParchmentDialog.Actions sticky>
        <Button tone="ember" size="md" onClick={close}>Back to town</Button>
      </ParchmentDialog.Actions>
    </ParchmentDialog>
  );
}
