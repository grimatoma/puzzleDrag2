import { describe, it, expect } from "vitest";
import { validateFlagId } from "../FlagsTab.jsx";

describe("validateFlagId", () => {
  it("requires a flag id", () => {
    const knownIds = new Set(["existing_flag"]);
    expect(validateFlagId("", "original_flag", knownIds)).toBe("Flag id is required.");
    expect(validateFlagId("   ", "original_flag", knownIds)).toBe("Flag id is required.");
  });

  it("enforces flag id format", () => {
    const knownIds = new Set(["existing_flag"]);
    expect(validateFlagId("Invalid-Name", "original_flag", knownIds)).toBe("Use lowercase letters, numbers, and underscores.");
    expect(validateFlagId("invalid name", "original_flag", knownIds)).toBe("Use lowercase letters, numbers, and underscores.");
    expect(validateFlagId("INVALID_NAME", "original_flag", knownIds)).toBe("Use lowercase letters, numbers, and underscores.");
  });

  it("checks for uniqueness against known ids", () => {
    const knownIds = new Set(["existing_flag", "another_flag"]);

    // Changing to an existing ID
    expect(validateFlagId("existing_flag", "original_flag", knownIds)).toBe("That flag id is already in use.");

    // Keeping the same ID is allowed even if it's in knownIds
    expect(validateFlagId("original_flag", "original_flag", new Set(["original_flag"]))).toBe("");
  });

  it("accepts valid and unique ids", () => {
    const knownIds = new Set(["existing_flag"]);
    expect(validateFlagId("new_valid_flag", "original_flag", knownIds)).toBe("");
    expect(validateFlagId("flag_123", "original_flag", knownIds)).toBe("");
  });
});
