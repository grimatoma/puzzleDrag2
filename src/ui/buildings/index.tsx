import { memo } from "react";
import HearthIllustration from "./hearth.jsx";
import MillIllustration from "./mill.jsx";
import BakeryIllustration from "./bakery.jsx";
import InnIllustration from "./inn.jsx";
import GranaryIllustration from "./granary.jsx";
import LarderIllustration from "./larder.jsx";
import ForgeIllustration from "./forge.jsx";
import CaravanPostIllustration from "./caravan_post.jsx";
import KitchenIllustration from "./kitchen.jsx";
import WorkshopIllustration from "./workshop.jsx";
import PowderStoreIllustration from "./powder_store.jsx";
import PortalIllustration from "./portal.jsx";
import HousingIllustration from "./housing.jsx";
import SiloIllustration from "./silo.jsx";
import BarnIllustration from "./barn.jsx";
import HarborDockIllustration from "./harbor_dock.jsx";
import FishmongerIllustration from "./fishmonger.jsx";
import SmokehouseIllustration from "./smokehouse.jsx";
import ClockTowerIllustration from "./clock_tower.jsx";
import LighthouseIllustration from "./lighthouse.jsx";
import ApothecaryIllustration from "./apothecary.jsx";
import SawmillIllustration from "./sawmill.jsx";
import WatchtowerIllustration from "./watchtower.jsx";
import StableIllustration from "./stable.jsx";
import ApiaryIllustration from "./apiary.jsx";
import ChapelIllustration from "./chapel.jsx";
import BreweryIllustration from "./brewery.jsx";
import ObservatoryIllustration from "./observatory.jsx";

type IllustrationComponent = (props: { isBuilt?: boolean }) => JSX.Element;
// Each illustration is a large inline-SVG tree (some with CSS keyframe
// animations). Town renders all of them in a .map(), so without memoization any
// Town state change (hover, picker, setState) re-renders every building SVG and
// restarts its animations. Props here are primitives, so React.memo is fully
// effective.
const ILLUSTRATIONS: Record<string, IllustrationComponent> = {
  hearth: HearthIllustration,
  mill: MillIllustration,
  bakery: BakeryIllustration,
  inn: InnIllustration,
  granary: GranaryIllustration,
  larder: LarderIllustration,
  forge: ForgeIllustration,
  caravan_post: CaravanPostIllustration,
  kitchen: KitchenIllustration,
  workshop: WorkshopIllustration,
  powder_store: PowderStoreIllustration,
  portal: PortalIllustration,
  housing: HousingIllustration,
  housing2: HousingIllustration,
  housing3: HousingIllustration,
  silo: SiloIllustration,
  barn: BarnIllustration,
  harbor_dock: HarborDockIllustration,
  fishmonger: FishmongerIllustration,
  smokehouse: SmokehouseIllustration,
  clock_tower: ClockTowerIllustration,
  lighthouse: LighthouseIllustration,
  apothecary: ApothecaryIllustration,
  sawmill: SawmillIllustration,
  watchtower: WatchtowerIllustration,
  stable: StableIllustration,
  apiary: ApiaryIllustration,
  chapel: ChapelIllustration,
  brewery: BreweryIllustration,
  observatory: ObservatoryIllustration,
};

/** All building keys with an illustration (includes housing2/housing3 aliases). */
export const BUILDING_KEYS = Object.keys(ILLUSTRATIONS);

/**
 * Canonical building keys for the iso set — one entry per distinct illustration
 * (housing2/housing3 reuse the housing art, so they collapse to `housing`).
 */
export const CANONICAL_BUILDING_KEYS = BUILDING_KEYS.filter((k) => k !== "housing2" && k !== "housing3");

function BuildingIllustrationImpl({ id, isBuilt }: { id: string; isBuilt?: boolean }) {
  const Component = ILLUSTRATIONS[id];
  return Component ? <Component isBuilt={isBuilt} /> : null;
}

const BuildingIllustration = memo(BuildingIllustrationImpl);
export default BuildingIllustration;
