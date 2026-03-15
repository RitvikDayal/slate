import { z } from "zod";

export const createListSchema = z.object({
  title: z.string().min(1).max(200),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  parent_list_id: z.string().uuid().optional(),
  position: z.number().optional(),
});

export const updateListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  icon: z.string().max(10).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  parent_list_id: z.string().uuid().nullable().optional(),
  position: z.number().optional(),
  is_archived: z.boolean().optional(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
