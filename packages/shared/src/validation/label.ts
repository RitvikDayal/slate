import { z } from "zod";

export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
