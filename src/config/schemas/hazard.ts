import { z } from "zod";

export const hazardEntrySchema = z
  .object({
    id: z.string().describe("Stable hazard id"),
    name: z.string().describe("Display name"),
    description: z.string().describe("What the hazard does"),
    clearInstruction: z.string().describe("How the player clears it"),
    weight: z.number().describe("Spawn weight in the hazard roll"),
    durationTurns: z.number().optional().describe("Turns before it expires (if timed)"),
    spawn: z
      .custom<(grid: unknown[][], rng: () => number) => Record<string, unknown>>(
        (v) => typeof v === "function",
        { message: "spawn must be a function" },
      )
      .describe("Function that places the hazard on the board"),
    look: z
      .object({ icon: z.string().describe("Emoji shown for the hazard") })
      .describe("Hazard visual appearance"),
  })
  .passthrough()
  .describe("One mine hazard definition");
export type HazardEntry = z.infer<typeof hazardEntrySchema>;
