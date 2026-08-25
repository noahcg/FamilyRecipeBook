import { z } from "zod";

export const profileNameSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(100),
});

export type ProfileNameInput = z.infer<typeof profileNameSchema>;
