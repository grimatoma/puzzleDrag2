import { describe, it, expect } from "vitest";
import { z } from "zod";
import { describeSchema } from "../balanceManager/schemaDoc.js";

describe("describeSchema nested objects", () => {
  it("exposes child fields for a nested object field", () => {
    const schema = z.object({
      label: z.string(),
      look: z
        .object({
          color: z.number().describe("Primary fill"),
          dark: z.number().describe("Outline"),
        })
        .describe("Visual appearance"),
    });
    const doc = describeSchema(schema);
    const look = doc.fields.find((f) => f.field === "look");
    expect(look).toBeDefined();
    expect(look!.children).toBeDefined();
    expect(look!.children!.map((c) => c.field)).toEqual(["color", "dark"]);
    expect(look!.children!.find((c) => c.field === "color")!.description).toBe("Primary fill");
  });

  it("leaves non-object fields without children", () => {
    const doc = describeSchema(z.object({ label: z.string() }));
    expect(doc.fields[0].children).toBeUndefined();
  });
});
