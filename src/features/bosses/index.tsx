import BossGallery from "./Gallery.jsx";
import { FeaturePanel } from "../_shared/uiTypes.js";
import type { GameState, Dispatch } from "../../types/state.js";

export const viewKey = "bosses";

interface BossesScreenProps {
  state: GameState;
  dispatch?: Dispatch;
}

export default function BossesScreen({ state }: BossesScreenProps) {
  return (
    <FeaturePanel>
      <FeaturePanel.Body>
        <BossGallery state={state} />
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
