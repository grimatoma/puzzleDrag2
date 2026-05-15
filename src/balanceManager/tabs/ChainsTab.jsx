// Chains tab — visualises the per-item upgrade graph (ITEMS[*].next).
// Each chain is rendered as a horizontal flow from root → next → … →
// terminal with per-tier value, threshold, and a callout for chains that
// merge multiple sources (e.g. several vegetables → "soup").
//
// The data is read straight from the live constants module (so it reflects
// any committed-file + localStorage-draft overrides at import time).

import ChainsView from "../ChainsView.jsx";
import { COLORS, Card } from "../shared.jsx";

export default function ChainsTab() {
  return (
    <div className="flex flex-col gap-3">
      <Card title="Upgrade chains" accent={COLORS.ember}>
        <p className="text-[12px]" style={{ color: COLORS.inkLight }}>
          Every item with a <code style={{ fontFamily: "ui-monospace,monospace" }}>.next</code> pointer rolls into the
          next tier when its chain count exceeds its <code style={{ fontFamily: "ui-monospace,monospace" }}>UPGRADE_THRESHOLDS</code> entry. The view below walks every chain root → terminal so
          you can spot dead-end tiers, over-long ramps, or unintended merges between resources.
        </p>
      </Card>
      <ChainsView />
    </div>
  );
}
