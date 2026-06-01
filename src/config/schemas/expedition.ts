import { z } from "zod";

export const expeditionOverrideSchema = z
  .object({
    foodTurns: z.record(z.string(), z.number().min(0)).optional(),
    meatFoods: z.array(z.string()).optional().describe("Replaced wholesale"),
  })
  .strict();
