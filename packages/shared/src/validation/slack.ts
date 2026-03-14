import { z } from "zod";

export const slackSuggestionActionSchema = z.object({
  action: z.enum(["accept", "dismiss"]),
  title: z.string().min(1).max(500).optional(), // override title on accept
  priority: z.enum(["low", "medium", "high"]).optional(),
  effort: z.enum(["xs", "s", "m", "l", "xl"]).optional(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type SlackSuggestionAction = z.infer<typeof slackSuggestionActionSchema>;
