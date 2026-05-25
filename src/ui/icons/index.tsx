import { registerSvgIcons } from "../primitives/Icon.jsx";
import * as Tiles from "./tiles.jsx";
import * as Currencies from "./currencies.jsx";
import * as Tools from "./tools.jsx";
import * as Buildings from "./buildings.jsx";
import * as Hazards from "./hazards.jsx";
import * as Npcs from "./npcs.jsx";

export const DESIGN_ICONS_MAP = {
  "design.tile.grass":      ({ size, fill }) => <Tiles.TileGrass size={size} fill={fill}/>,
  "design.tile.hay":        ({ size, fill }) => <Tiles.TileHay size={size} fill={fill}/>,
  "design.tile.wheat":      ({ size, fill }) => <Tiles.TileWheat size={size} fill={fill}/>,
  "design.tile.dirt":       ({ size, fill }) => <Tiles.TileDirt size={size} fill={fill}/>,
  "design.tile.stone":      ({ size, fill }) => <Tiles.TileStone size={size} fill={fill}/>,
  "design.tile.ore":        ({ size, fill }) => <Tiles.TileOre size={size} fill={fill}/>,
  "design.tile.fish":       ({ size, fill }) => <Tiles.TileFish size={size} fill={fill}/>,
  "design.tile.horse":      ({ size, fill }) => <Tiles.TileHorse size={size} fill={fill}/>,
  "design.tile.rune":       ({ size, fill }) => <Tiles.TileRune size={size} fill={fill}/>,
  "design.tile.fire":       ({ size, fill }) => <Tiles.TileFire size={size} fill={fill}/>,
  "design.tile.ice":        ({ size, fill }) => <Tiles.TileIce size={size} fill={fill}/>,
  "design.tile.pearl":      ({ size, fill }) => <Tiles.TilePearl size={size} fill={fill}/>,

  "design.currency.coin":          ({ size, fill }) => <Currencies.CoinCoin size={size} fill={fill}/>,
  "design.currency.ember":         ({ size, fill }) => <Currencies.CoinEmber size={size} fill={fill}/>,
  "design.currency.ingot":         ({ size, fill }) => <Currencies.CoinIngot size={size} fill={fill}/>,
  "design.currency.gem":           ({ size, fill }) => <Currencies.CoinGem size={size} fill={fill}/>,
  "design.currency.hearth-token":  ({ size, fill }) => <Currencies.CoinHeirloom size={size} fill={fill}/>,
  "design.currency.building-token":({ size, fill }) => <Currencies.CoinRune size={size} fill={fill}/>,

  "design.tool.hoe":          ({ size, fill }) => <Tools.ToolHoe size={size} fill={fill}/>,
  "design.tool.watering-can": ({ size, fill }) => <Tools.ToolWater size={size} fill={fill}/>,
  "design.tool.rake":         ({ size, fill }) => <Tools.ToolRake size={size} fill={fill}/>,
  "design.tool.firebreak":    ({ size, fill }) => <Tools.ToolFirebreak size={size} fill={fill}/>,
  "design.tool.axe":          ({ size, fill }) => <Tools.ToolAxe size={size} fill={fill}/>,
  "design.tool.pick":         ({ size, fill }) => <Tools.ToolPick size={size} fill={fill}/>,
  "design.tool.flee-stone":   ({ size, fill }) => <Tools.ToolFleestone size={size} fill={fill}/>,
  "design.tool.net":          ({ size, fill }) => <Tools.ToolNet size={size} fill={fill}/>,

  "design.building.bakery":      ({ size, fill }) => <Buildings.BldgBakery size={size} fill={fill}/>,
  "design.building.smithy":      ({ size, fill }) => <Buildings.BldgSmithy size={size} fill={fill}/>,
  "design.building.scriptorium": ({ size, fill }) => <Buildings.BldgScriptorium size={size} fill={fill}/>,
  "design.building.tea-house":   ({ size, fill }) => <Buildings.BldgTea size={size} fill={fill}/>,
  "design.building.kitchen":     ({ size, fill }) => <Buildings.BldgKitchen size={size} fill={fill}/>,
  "design.building.market":      ({ size, fill }) => <Buildings.BldgMarket size={size} fill={fill}/>,
  "design.building.dock":        ({ size, fill }) => <Buildings.BldgDock size={size} fill={fill}/>,
  "design.building.silo":        ({ size, fill }) => <Buildings.BldgSilo size={size} fill={fill}/>,
  "design.building.inn":         ({ size, fill }) => <Buildings.BldgInn size={size} fill={fill}/>,
  "design.building.stable":      ({ size, fill }) => <Buildings.BldgStable size={size} fill={fill}/>,

  "design.hazard.rats":   ({ size, fill }) => <Hazards.HzRats size={size} fill={fill}/>,
  "design.hazard.fire":   ({ size, fill }) => <Hazards.HzFire size={size} fill={fill}/>,
  "design.hazard.frost":  ({ size, fill }) => <Hazards.HzFrost size={size} fill={fill}/>,
  "design.hazard.blight": ({ size, fill }) => <Hazards.HzBlight size={size} fill={fill}/>,
  "design.hazard.storm":  ({ size, fill }) => <Hazards.HzStorm size={size} fill={fill}/>,
  "design.hazard.keeper": ({ size, fill }) => <Hazards.HzKeeper size={size} fill={fill}/>,

  "design.npc.mira":  ({ size }) => <Npcs.NpcMira size={size}/>,
  "design.npc.bram":  ({ size }) => <Npcs.NpcBram size={size}/>,
  "design.npc.liss":  ({ size }) => <Npcs.NpcLiss size={size}/>,
  "design.npc.tomas": ({ size }) => <Npcs.NpcTomas size={size}/>,
  "design.npc.wren":  ({ size }) => <Npcs.NpcWren size={size}/>,
};

export function registerDesignIcons() {
  if (typeof registerSvgIcons === "function") {
    registerSvgIcons(DESIGN_ICONS_MAP);
  }
}
