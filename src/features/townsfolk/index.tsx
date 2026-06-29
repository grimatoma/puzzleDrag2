import { WorkersPanel } from "../workers/index.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";
import type { Dispatch, GameState } from "../../types/state.js";

export const viewKey = "townsfolk";

interface TownsfolkScreenProps {
  state: GameState;
  dispatch: Dispatch;
}

// Townsfolk is the workers roster. Quests live in their own top-level tab
// (see BottomNav in src/ui.tsx) rather than as a sub-tab here.
export default function TownsfolkScreen({ state, dispatch }: TownsfolkScreenProps) {
  return (
    <FeaturePanel>
      <FeaturePanel.Body>
        <div className="w-full h-full min-h-0 mx-auto">
          <WorkersPanel state={state} dispatch={dispatch} />
        </div>
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
