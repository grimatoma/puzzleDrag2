import { z } from "zod";

export const seasonLookSchema = z
  .object({
    iconKey: z.string().describe("Icon registry key for the season badge"),
    bg: z.number().describe("Background color (0xRRGGBB)"),
    fill: z.number().describe("Fill/primary color (0xRRGGBB)"),
    accent: z.number().describe("Accent color (0xRRGGBB)"),
  })
  .describe("Season visual appearance");

export const seasonEntrySchema = z
  .object({
    name: z.string().describe("Season display name"),
    look: seasonLookSchema,
  })
  .describe("One entry in the SEASONS cycle");

export type SeasonEntry = z.infer<typeof seasonEntrySchema>;
