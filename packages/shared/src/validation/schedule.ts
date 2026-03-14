import { z } from "zod";

export const scheduleSlotTypeSchema = z.enum(["calendar_event", "task", "break", "focus"]);

export const scheduleSlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  type: scheduleSlotTypeSchema,
  ref_id: z.string().uuid().nullable(),
  title: z.string(),
  notes: z.string().nullable(),
});

export const dailyScheduleStatusSchema = z.enum(["draft", "active", "completed"]);

export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
