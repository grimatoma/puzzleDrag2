import { z } from "zod";

export const expeditionOverrideSchema = z
  .object({
    foodTurns: z.record(z.string().min(1), z.number().int().min(0)).optional(),
    meatFoods: z.array(z.string().min(1)).optional().describe("Replaced wholesale"),
  })
  .strict();
