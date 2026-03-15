import { z } from "zod";

export const filterFieldSchema = z.enum([
  "priority",
  "due_date",
  "labels",
  "list_id",
  "effort",
  "is_completed",
  "source",
  "created_at",
]);

export const filterOpSchema = z.enum([
  "eq",
  "neq",
  "lt",
  "gt",
  "lte",
  "gte",
  "contains",
  "is_empty",
  "is_not_empty",
]);

export const filterRuleSchema = z.object({
  field: filterFieldSchema,
  op: filterOpSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export const savedViewFiltersSchema = z.array(filterRuleSchema).max(20);

export const createSavedViewSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  filters: savedViewFiltersSchema,
  sort_by: z.string().max(50).default("due_date:asc"),
  is_pinned: z.boolean().default(false),
});

export const updateSavedViewSchema = createSavedViewSchema.partial().extend({
  position: z.number().optional(),
});

export type FilterField = z.infer<typeof filterFieldSchema>;
export type FilterOp = z.infer<typeof filterOpSchema>;
export type FilterRule = z.infer<typeof filterRuleSchema>;
export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;
export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>;
