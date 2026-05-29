// forge — the approved reference building for the iso set.
// Re-exports the Premium true-iso forge study (the canonical "after" quality
// bar: clean multi-detail brick smithy, unobstructed furnace/anvil hero
// details, slate hip roof, animated fire/embers/lantern). New buildings should
// match this finish. See `.claude/skills/iso-building/SKILL.md`.

import IsoForgePremium from "../variants/IsoForgePremium.jsx";
import type { IsoBuildingMeta } from "../buildingMeta.js";

export const meta: IsoBuildingMeta = {
  status: "approved",
  plot: "normal",
  notes: "Reference building. Premium true-iso smithy — the quality bar for the whole set.",
};

export default IsoForgePremium;
