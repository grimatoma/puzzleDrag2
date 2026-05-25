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

const ILLUSTRATIONS = {
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
};

export default function BuildingIllustration({ id, isBuilt }) {
  const Component = ILLUSTRATIONS[id];
  return Component ? <Component isBuilt={isBuilt} /> : null;
}
