import { z } from "zod";

export const createCollectionSchema = z.object({
  title: z.string().min(1, "Collection needs a name").max(100),
  description: z.string().max(300).optional(),
  icon: z.string().max(10).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
