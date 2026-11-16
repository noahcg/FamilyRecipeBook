import { z } from "zod";
import { BOOK_COVER_COLORS } from "@/lib/bookCovers";

export const collectionSlugSchema = z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens for the link.");

export const configureCollectionSchema = z.object({
  bookId: z.uuid(),
  slug: collectionSlugSchema,
  title: z.string().trim().min(1, "Give the collection a title.").max(120),
  description: z.string().trim().min(1, "Describe the collection for visitors.").max(2000),
  coverStyle: z.string().refine((value) => BOOK_COVER_COLORS.some((color) => color.hex === value), "Choose a cookbook cover color."),
  published: z.boolean(),
});

export type ConfigureCollectionInput = z.infer<typeof configureCollectionSchema>;
