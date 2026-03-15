import { z } from "zod";

export const createAttachmentSchema = z.object({
  type: z.enum(["file", "link"]),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().positive().optional(),
  thumbnail_url: z.string().url().optional(),
  position: z.number().optional(),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
