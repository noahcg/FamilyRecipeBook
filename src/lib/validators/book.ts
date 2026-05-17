import { z } from "zod";

const bookFields = {
  title: z.string().min(1, "Give your book a title").max(100),
  description: z.string().max(500).optional(),
  cover_style: z.enum(["sage", "terracotta", "mustard", "forest", "clay"]),
  icon: z.string().min(1).max(40).optional(),
  sharing_enabled: z.boolean(),
};

export const createBookSchema = z.object({
  ...bookFields,
  sharing_enabled: bookFields.sharing_enabled.optional(),
});

export const updateBookSchema = z.object(bookFields).partial();

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
