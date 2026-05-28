import { describe, it, expect } from "vitest";
import { validateNewFlagId } from "../balanceManager/tabs/FlagsTab.js";

describe("validateNewFlagId", () => {
  it("returns 'Flag id is required.' for empty strings", () => {
    const knownIds = new Set(["foo", "bar"]);
    expect(validateNewFlagId("", "old_id", knownIds)).toBe("Flag id is required.");
    expect(validateNewFlagId("   ", "old_id", knownIds)).toBe("Flag id is required.");
  });

  it("returns an error for invalid flag id format", () => {
    const knownIds = new Set(["foo"]);
    const expectedError = "Use lowercase letters, numbers, and underscores.";

    // Uppercase
    expect(validateNewFlagId("invalid_ID", "old_id", knownIds)).toBe(expectedError);
    // Spaces
    expect(validateNewFlagId("invalid id", "old_id", knownIds)).toBe(expectedError);
    // Hyphens
    expect(validateNewFlagId("invalid-id", "old_id", knownIds)).toBe(expectedError);
    // Special chars
    expect(validateNewFlagId("invalid_id!", "old_id", knownIds)).toBe(expectedError);
    // Starting with number
    expect(validateNewFlagId("123_id", "old_id", knownIds)).toBe(expectedError);
  });

  it("returns an error if the new id is already in use by a different flag", () => {
    const knownIds = new Set(["existing_flag", "another_flag"]);
    expect(validateNewFlagId("existing_flag", "current_flag", knownIds))
      .toBe("That flag id is already in use.");
  });

  it("returns an empty string if the id matches the current id (even if in knownIds)", () => {
    const knownIds = new Set(["current_flag", "another_flag"]);
    // Since we're editing the flag, it's valid to keep its current name
    expect(validateNewFlagId("current_flag", "current_flag", knownIds)).toBe("");
  });

  it("returns an empty string for a valid, unique id", () => {
    const knownIds = new Set(["existing_flag"]);
    expect(validateNewFlagId("new_valid_flag", "current_flag", knownIds)).toBe("");
    expect(validateNewFlagId("a", "current_flag", knownIds)).toBe("");
    expect(validateNewFlagId("flag_123", "current_flag", knownIds)).toBe("");
  });
});
