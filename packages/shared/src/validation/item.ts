import { z } from "zod";

const itemTypeSchema = z.enum(["task", "note", "heading"]);
const itemPrioritySchema = z.enum(["none", "low", "medium", "high"]);
const itemEffortSchema = z.enum(["xs", "s", "m", "l", "xl"]);

export const createItemSchema = z.object({
  list_id: z.string().uuid(),
  parent_item_id: z.string().uuid().optional(),
  type: itemTypeSchema.optional().default("task"),
  title: z.string().max(500).default(""),
  content_json: z.record(z.unknown()).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priority: itemPrioritySchema.optional().default("none"),
  effort: itemEffortSchema.optional(),
  estimated_minutes: z.number().int().positive().optional(),
  recurrence_rule: z.string().optional(),
  position: z.number().optional(),
  source: z.enum(["manual", "slack", "ai_suggested"]).optional().default("manual"),
  source_ref: z.record(z.unknown()).optional(),
  label_ids: z.array(z.string().uuid()).optional(),
});

export const updateItemSchema = z.object({
  title: z.string().max(500).optional(),
  content_json: z.record(z.unknown()).nullable().optional(),
  type: itemTypeSchema.optional(),
  is_completed: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reminder_at: z.string().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  priority: itemPrioritySchema.optional(),
  effort: itemEffortSchema.nullable().optional(),
  estimated_minutes: z.number().int().positive().nullable().optional(),
  position: z.number().optional(),
  is_movable: z.boolean().optional(),
  scheduled_date: z.string().nullable().optional(),
  scheduled_start: z.string().nullable().optional(),
  scheduled_end: z.string().nullable().optional(),
  ai_notes: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  label_ids: z.array(z.string().uuid()).optional(),
});

export const reorderItemsSchema = z.union([
  z.object({
    list_id: z.string().uuid(),
    orderedIds: z.array(z.string().uuid()),
  }),
  z.object({
    list_id: z.string().uuid(),
    items: z.array(
      z.object({
        id: z.string().uuid(),
        position: z.number(),
      })
    ),
  }),
]);

export const moveItemSchema = z.object({
  target_list_id: z.string().uuid(),
  position: z.number().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
export type MoveItemInput = z.infer<typeof moveItemSchema>;
