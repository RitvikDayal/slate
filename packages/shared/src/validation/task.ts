import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export const taskEffortSchema = z.enum(["xs", "s", "m", "l", "xl"]);
export const taskStatusSchema = z.enum(["pending", "in_progress", "done", "cancelled"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: taskPrioritySchema.default("medium"),
  effort: taskEffortSchema.optional(),
  estimated_minutes: z.number().int().positive().optional(),
  is_movable: z.boolean().default(true),
  scheduled_date: z.string().date().optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
  due_date: z.string().date().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
