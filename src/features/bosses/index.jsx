import BossGallery from "./Gallery.jsx";
import FeaturePanel from "../../ui/primitives/FeaturePanel.jsx";

export const viewKey = "bosses";

export default function BossesScreen({ state }) {
  return (
    <FeaturePanel>
      <FeaturePanel.Body>
        <BossGallery state={state} />
      </FeaturePanel.Body>
    </FeaturePanel>
  );
}
