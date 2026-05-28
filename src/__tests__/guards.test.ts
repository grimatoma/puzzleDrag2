import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertTile, assertResource, assertTool, isTile, isResource, isTool } from "../types/guards.js";
import { ITEMS } from "../constants.js";

describe("guards assertions", () => {
  beforeEach(() => {
    // Inject some fake entries into ITEMS for testing
    ITEMS["fake_tile"] = { kind: "tile" };
    ITEMS["fake_resource"] = { kind: "resource" };
    ITEMS["fake_tool"] = { kind: "tool" };
    ITEMS["fake_other"] = { kind: "something_else" };
  });

  afterEach(() => {
    delete ITEMS["fake_tile"];
    delete ITEMS["fake_resource"];
    delete ITEMS["fake_tool"];
    delete ITEMS["fake_other"];
    vi.restoreAllMocks();
  });

  it("isTile, isResource, isTool pure predicates", () => {
    expect(isTile("fake_tile")).toBe(true);
    expect(isTile("fake_resource")).toBe(false);

    expect(isResource("fake_resource")).toBe(true);
    expect(isResource("fake_tile")).toBe(false);

    expect(isTool("fake_tool")).toBe(true);
    expect(isTool("fake_resource")).toBe(false);
  });

  it("assertTile", () => {
    expect(() => assertTile("fake_tile")).not.toThrow();
    expect(() => assertTile("fake_resource")).toThrowError(/Expected ITEMS\["fake_resource"\] to have kind="tile" but got "resource"./);
    expect(() => assertTile("non_existent")).toThrowError(/Expected ITEMS\["non_existent"\] to have kind="tile" but got "\(missing\)"./);
  });

  it("assertResource", () => {
    expect(() => assertResource("fake_resource")).not.toThrow();
    expect(() => assertResource("fake_tool")).toThrowError(/Expected ITEMS\["fake_tool"\] to have kind="resource" but got "tool"./);
    expect(() => assertResource("non_existent")).toThrowError(/Expected ITEMS\["non_existent"\] to have kind="resource" but got "\(missing\)"./);
  });

  it("assertTool", () => {
    expect(() => assertTool("fake_tool")).not.toThrow();
    expect(() => assertTool("fake_tile")).toThrowError(/Expected ITEMS\["fake_tile"\] to have kind="tool" but got "tile"./);
    expect(() => assertTool("non_existent")).toThrowError(/Expected ITEMS\["non_existent"\] to have kind="tool" but got "\(missing\)"./);
  });
});

describe("guards assertions - production environment", () => {
  beforeEach(() => {
    ITEMS["fake_tile"] = { kind: "tile" };
    ITEMS["fake_resource"] = { kind: "resource" };
    vi.stubEnv('DEV', '');
  });

  afterEach(() => {
    delete ITEMS["fake_tile"];
    delete ITEMS["fake_resource"];
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not throw in prod, but logs warning once per key", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Should not throw in PROD
    expect(() => assertTile("fake_resource")).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[guards] Expected ITEMS["fake_resource"] to have kind="tile" but got "resource".');

    // Second call with same key/expected should not warn again
    expect(() => assertTile("fake_resource")).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Call with different key should warn
    expect(() => assertTile("non_existent_2")).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
