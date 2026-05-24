import { describe, expect, it } from "vitest";
import { INVENTORY_SOURCE_TAGS, INVENTORY_TAGS, sourceTagsForItem, tagsForItemKey } from "../features/inventory/tags.js";

describe("inventory tags", () => {
  it("tags gathered resources as resources", () => {
    expect(tagsForItemKey("flour")).toContain(INVENTORY_TAGS.RESOURCE);
  });

  it("tags tools as tools", () => {
    expect(tagsForItemKey("fertilizer")).toContain(INVENTORY_TAGS.TOOL);
  });

  it("supports multi-tag food cargo items", () => {
    const tags = tagsForItemKey("supplies");
    expect(tags).toContain(INVENTORY_TAGS.FOOD);
    expect(tags).toContain(INVENTORY_TAGS.CARGO);
  });

  it("falls back to generic item tag for unknown or plain items", () => {
    expect(tagsForItemKey("widget")).toContain(INVENTORY_TAGS.ITEM);
  });

  it("supports source tags for biome and crafted origins", () => {
    expect(sourceTagsForItem("flour")).toContain(INVENTORY_SOURCE_TAGS.FARM);
    const sourceTags = sourceTagsForItem("bread", { recipesByOutput: { bread: [{}] } });
    expect(sourceTags).toContain(INVENTORY_SOURCE_TAGS.CRAFTED);
  });
});
