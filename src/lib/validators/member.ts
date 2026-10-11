import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["contributor", "family"], {
    error: "Select a role",
  }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export const updateMemberRoleSchema = z.enum(["contributor", "family"]);

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
