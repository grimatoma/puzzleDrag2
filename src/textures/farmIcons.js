// Farm biome tile icon drawing functions
import { drawNatureIcon } from "./farm/nature.js";
import { drawGrainsIcon } from "./farm/grains.js";
import { drawWoodIcon } from "./farm/wood.js";
import { drawProduceIcon } from "./farm/produce.js";
import { drawAnimalsIcon } from "./farm/animals.js";
import { drawProcessedIcon } from "./farm/processed.js";

const FARM_HANDLED_KEYS = new Set([
  "grass_hay", "grain_wheat", "grain", "grain_flour",
  "wood_log", "wood_plank", "wood_beam",
  "berry", "berry_jam",
  "bird_egg", "grass_meadow", "grass_spiky",
  "bird_turkey", "bird_clover", "bird_melon",
  "veg_carrot", "veg_eggplant", "veg_turnip", "veg_beet",
  "veg_cucumber", "veg_squash", "veg_mushroom", "veg_pepper", "veg_broccoli",
  "soup",
]);

export function drawFarmTileIcon(ctx, key) {
  if (!FARM_HANDLED_KEYS.has(key)) return false;

  return (
    drawNatureIcon(ctx, key) ||
    drawGrainsIcon(ctx, key) ||
    drawWoodIcon(ctx, key) ||
    drawProduceIcon(ctx, key) ||
    drawAnimalsIcon(ctx, key) ||
    drawProcessedIcon(ctx, key)
  );
}
