import { z } from "zod";

export const createBookSchema = z.object({
  title: z.string().min(1, "Give your book a title").max(100),
  description: z.string().max(500).optional(),
  cover_style: z.enum(["sage", "terracotta", "mustard", "forest", "clay"]),
  icon: z.string().min(1).max(40).optional(),
});

export const updateBookSchema = createBookSchema.partial();

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
