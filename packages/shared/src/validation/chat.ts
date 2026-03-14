import { z } from "zod";

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
