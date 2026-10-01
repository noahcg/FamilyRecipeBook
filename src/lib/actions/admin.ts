"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { isAdminEmail, requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { createMemberInviteEmail } from "@/lib/email/memberInviteTemplate";
import { getAppBaseUrl, getDefaultLogoUrl, sendEmail } from "@/lib/email/sendEmail";
import { createAccountRecipeArchive } from "@/lib/accountRecipeArchive";
import type { ActionResult } from "@/lib/types";

const inviteToBookSchema = z.object({
  bookId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["contributor", "family"]),
});

const accountActionSchema = z.object({
  userId: z.string().uuid(),
});

const suspendUserSchema = accountActionSchema.extend({
  duration: z.enum(["24h", "168h", "720h", "876000h"]),
});

const deleteUserSchema = accountActionSchema.extend({
  ownershipTransfers: z.array(z.object({
    bookId: z.string().uuid(),
    newOwnerId: z.string().uuid(),
  })).default([]),
});

export type AdminSuspendDuration = z.infer<typeof suspendUserSchema>["duration"];

const suspendDurationLabels: Record<AdminSuspendDuration, string> = {
  "24h": "1 day",
  "168h": "7 days",
  "720h": "30 days",
  "876000h": "indefinitely",
};

// These buckets namespace user-uploaded objects by `${userId}/`, as defined in
// upload.ts. Storage does not participate in Postgres foreign-key cascades.
const USER_STORAGE_BUCKETS = ["recipe-images", "avatars"] as const;

export type AdminInviteToBookInput = z.infer<typeof inviteToBookSchema>;

function inviterFirstName(fullName?: string | null) {
  const trimmed = fullName?.trim();
  if (!trimmed || trimmed.includes("@")) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

interface AdminActionLogEntry {
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

type ManageableUserResult =
  | { service: ReturnType<typeof createServiceClient>; email: string }
  | { service: ReturnType<typeof createServiceClient>; error: string };

export interface AccountDeletionImpact {
  privateCookbookCount: number;
  privateRecipeCount: number;
  sharedCookbooks: Array<{
    id: string;
    title: string;
    recipeCount: number;
    members: Array<{ id: string; name: string; role: string }>;
  }>;
  memberships: number;
  survivingContributions: number;
}

export interface OwnershipTransfer {
  bookId: string;
  newOwnerId: string;
}

async function listStoragePaths(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await service.storage.from(bucket).list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(error.message);
    const page = data ?? [];
    paths.push(...page.map((item) => `${prefix}/${item.name}`));
    if (page.length < pageSize) return paths;
  }
}

function chunks<T>(values: T[], size = 500): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function removeStoragePaths(
  service: ReturnType<typeof createServiceClient>,
  bucket: string,
  paths: string[]
): Promise<void> {
  for (const batch of chunks(paths)) {
    const { error } = await service.storage.from(bucket).remove(batch);
    if (error) throw new Error(error.message);
  }
}

export async function getAccountDeletionImpact(
  service: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<AccountDeletionImpact> {
  const [{ data: books, error: booksError }, { data: memberships, error: membershipsError }, { data: authoredRecipes, error: authoredError }] = await Promise.all([
    service
      .from("recipe_books")
      .select("id,title,members:book_members(user_id,role,profile:profiles(full_name))")
      .eq("owner_id", userId),
    service.from("book_members").select("book_id").eq("user_id", userId),
    service.from("recipes").select("book_id").eq("created_by", userId),
  ]);
  if (booksError || membershipsError || authoredError) {
    throw new Error(booksError?.message ?? membershipsError?.message ?? authoredError?.message);
  }

  const ownedBooks = (books ?? []) as Array<{
    id: string;
    title: string;
    members: Array<{ user_id: string; role: string; profile: { full_name: string | null } | { full_name: string | null }[] | null }> | null;
  }>;
  const recipeCounts = await Promise.all(ownedBooks.map(async (book) => {
    const { count, error } = await service.from("recipes").select("id", { count: "exact", head: true }).eq("book_id", book.id);
    if (error) throw new Error(error.message);
    return [book.id, count ?? 0] as const;
  }));
  const countByBook = new Map(recipeCounts);
  const sharedCookbooks: AccountDeletionImpact["sharedCookbooks"] = [];
  const privateBookIds: string[] = [];

  for (const book of ownedBooks) {
    const remainingMembers = (book.members ?? [])
      .filter((member) => member.user_id !== userId)
      .map((member) => ({
        id: member.user_id,
        name: (Array.isArray(member.profile) ? member.profile[0]?.full_name : member.profile?.full_name) ?? "Unnamed member",
        role: member.role,
      }));
    if (remainingMembers.length) {
      sharedCookbooks.push({
        id: book.id,
        title: book.title,
        recipeCount: countByBook.get(book.id) ?? 0,
        members: remainingMembers,
      });
    } else {
      privateBookIds.push(book.id);
    }
  }

  const privateRecipeCount = privateBookIds.reduce((total, bookId) => total + (countByBook.get(bookId) ?? 0), 0);
  const ownedIds = new Set(ownedBooks.map((book) => book.id));
  const survivingContributions = (authoredRecipes ?? []).filter((recipe) => !ownedIds.has(recipe.book_id)).length;
  return {
    privateCookbookCount: privateBookIds.length,
    privateRecipeCount,
    sharedCookbooks,
    memberships: (memberships ?? []).length,
    survivingContributions,
  };
}

/**
 * Append a row to the admin_actions audit log. Best-effort: the service-role
 * client bypasses RLS to write here, and a logging failure must never break the
 * underlying admin action. Never pass secrets (tokens, raw recipe content).
 */
export async function logAdminAction(
  service: ReturnType<typeof createServiceClient>,
  entry: AdminActionLogEntry
): Promise<void> {
  const { error } = await service.from("admin_actions").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    summary: entry.summary,
    metadata: entry.metadata ?? {},
  });
  if (error) {
    console.error("Failed to write admin_actions log:", error.message);
  }
}

/**
 * Looks up a target account and prevents platform administrators from being
 * acted on through the console. This keeps a typo or compromised admin session
 * from removing every configured recovery path.
 */
async function getManageableUser(userId: string): Promise<ManageableUserResult> {
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  const email = data.user?.email?.toLowerCase();

  if (error || !data.user || !email) {
    return { service, error: "That user could not be found." };
  }
  if (isAdminEmail(email)) {
    return {
      service,
      error: "Configured administrators cannot be managed from the admin console.",
    };
  }

  return { service, email };
}

/** Suspend a non-admin account. Supabase rejects sign-in while the ban is active. */
export async function suspendUser(input: {
  userId: string;
  duration: AdminSuspendDuration;
}): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  const parsed = suspendUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const target = await getManageableUser(parsed.data.userId);
  if ("error" in target) return { success: false, error: target.error };

  const { error } = await target.service.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: parsed.data.duration,
  });
  if (error) return { success: false, error: "Could not suspend this account. Please try again." };

  await logAdminAction(target.service, {
    actorId: adminUser.id,
    action: "suspend_user",
    targetType: "user",
    targetId: parsed.data.userId,
    summary: `Suspended ${target.email} for ${suspendDurationLabels[parsed.data.duration]}`,
    metadata: { userId: parsed.data.userId, email: target.email, duration: parsed.data.duration },
  });
  revalidatePath("/app/admin");
  revalidatePath(`/app/admin/users/${parsed.data.userId}`);
  return { success: true, data: undefined };
}

/** Lift a prior account suspension. */
export async function reinstateUser(input: { userId: string }): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  const parsed = accountActionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const target = await getManageableUser(parsed.data.userId);
  if ("error" in target) return { success: false, error: target.error };
  const { error } = await target.service.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: "none",
  });
  if (error) return { success: false, error: "Could not reinstate this account. Please try again." };

  await logAdminAction(target.service, {
    actorId: adminUser.id,
    action: "reinstate_user",
    targetType: "user",
    targetId: parsed.data.userId,
    summary: `Reinstated ${target.email}`,
    metadata: { userId: parsed.data.userId, email: target.email },
  });
  revalidatePath("/app/admin");
  revalidatePath(`/app/admin/users/${parsed.data.userId}`);
  return { success: true, data: undefined };
}

/**
 * Permanently delete a non-admin account and its data. This intentionally uses
 * a hard delete: the existing foreign-key migration cascades the account's
 * profile and authored data, matching the user's self-service deletion flow.
 */
export async function deleteUser(input: { userId: string; ownershipTransfers?: OwnershipTransfer[] }): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const target = await getManageableUser(parsed.data.userId);
  if ("error" in target) return { success: false, error: target.error };

  let impact: AccountDeletionImpact;
  try {
    impact = await getAccountDeletionImpact(target.service, parsed.data.userId);
  } catch {
    return { success: false, error: "Could not calculate this account's deletion impact. Nothing was deleted." };
  }

  const transferByBook = new Map(parsed.data.ownershipTransfers.map((transfer) => [transfer.bookId, transfer.newOwnerId]));
  if (impact.sharedCookbooks.some((book) => !transferByBook.has(book.id))) {
    return { success: false, error: "Transfer every shared cookbook to a current member before deleting this account." };
  }
  if (parsed.data.ownershipTransfers.length !== impact.sharedCookbooks.length) {
    return { success: false, error: "Ownership transfers do not match this account's shared cookbooks." };
  }
  for (const book of impact.sharedCookbooks) {
    const successor = transferByBook.get(book.id);
    if (!successor || !book.members.some((member) => member.id === successor)) {
      return { success: false, error: `Choose a current member to own “${book.title}”.` };
    }
  }

  const { data: deletion, error: lockError } = await target.service
    .from("account_deletions")
    .insert({ user_id: parsed.data.userId, initiated_by: adminUser.id, status: "processing", impact })
    .select("id")
    .single();
  if (lockError || !deletion) {
    return { success: false, error: "A deletion is already in progress for this account. Please wait before trying again." };
  }
  const fail = async (message: string, stage: "archive_status" | "email_status" | "storage_status" | "database_status" | "auth_status") => {
    await target.service.from("account_deletions").update({ status: "failed", [stage]: "failed", error: message }).eq("id", deletion.id);
    return { success: false as const, error: message };
  };

  const { data: privateBooks, error: privateBooksError } = await target.service
    .from("recipe_books")
    .select("id")
    .eq("owner_id", parsed.data.userId);
  if (privateBooksError) return fail("Could not confirm private cookbook ownership. The account was not deleted.", "database_status");
  const privateBookIds = (privateBooks ?? []).filter((book) => !transferByBook.has(book.id)).map((book) => book.id);

  // A deletion must be export-first. If we cannot create and deliver the
  // archive, leave every record and file in place rather than risking loss.
  let archive: Awaited<ReturnType<typeof createAccountRecipeArchive>>;
  try {
    archive = await createAccountRecipeArchive(target.service, parsed.data.userId, target.email, privateBookIds);
    await target.service.from("account_deletions").update({ archive_status: "created" }).eq("id", deletion.id);
    await sendEmail({
      to: target.email,
      subject: "Your Home Cooked account and recipe archive",
      html: `<p>An administrator has initiated permanent deletion of your Home Cooked account.</p><p>Your compact recipe archive is attached. It contains ${archive.recipeCount} recipe${archive.recipeCount === 1 ? "" : "s"} and preserves the recipe fields, ingredients, instructions, stories, and cookbook metadata that will be removed.</p><p>This archive delivery is a required safeguard: deletion will not begin unless this email is sent successfully. The attachment is a gzip-compressed JSON file (<code>.json.gz</code>). Keep it somewhere safe before extracting it with standard archive tools.</p>`,
      text: `An administrator has initiated permanent deletion of your Home Cooked account. Your compact recipe archive is attached. It contains ${archive.recipeCount} recipe${archive.recipeCount === 1 ? "" : "s"} and preserves the recipe fields, ingredients, instructions, stories, and cookbook metadata that will be removed. This archive delivery is a required safeguard: deletion will not begin unless this email is sent successfully. The attachment is a gzip-compressed JSON file (.json.gz). Keep it somewhere safe before extracting it with standard archive tools.`,
      attachments: [{
        filename: archive.filename,
        content: archive.content,
        contentType: "application/gzip",
      }],
    });
    await target.service.from("account_deletions").update({ email_status: "sent" }).eq("id", deletion.id);
  } catch (error) {
    console.error("Could not archive account before admin deletion:", error);
    return fail("Could not create and email the recipe archive. The account was not deleted.", "email_status");
  }

  // Transfer ownership before the profile is removed. A transferred cookbook
  // and every collaborator recipe in it therefore survive the account deletion.
  for (const [bookId, newOwnerId] of transferByBook) {
    const { error: ownerError } = await target.service.from("recipe_books").update({ owner_id: newOwnerId }).eq("id", bookId);
    const { error: memberError } = await target.service.from("book_members").update({ role: "keeper" }).eq("book_id", bookId).eq("user_id", newOwnerId);
    if (ownerError || memberError) return fail("Could not transfer shared cookbook ownership. The account was not deleted.", "database_status");
  }

  const { data: profile } = await target.service.from("profiles").select("full_name").eq("id", parsed.data.userId).maybeSingle();
  const displayName = profile?.full_name?.trim() || "Former member";
  const attributionUpdates = await Promise.all([
    target.service.from("recipes").update({ created_by: null, created_by_display_name: displayName }).eq("created_by", parsed.data.userId),
    target.service.from("recipe_stories").update({ author_id: null, author_display_name: displayName }).eq("author_id", parsed.data.userId),
  ]);
  if (attributionUpdates.some(({ error }) => error)) return fail("Could not preserve recipe attribution. The account was not deleted.", "database_status");

  // An image belongs to the surviving recipe, not the uploader. Remove only the
  // target's public images that are no longer referenced by any recipe.
  for (const bucket of USER_STORAGE_BUCKETS) {
    let paths: string[];
    try {
      paths = await listStoragePaths(target.service, bucket, parsed.data.userId);
    } catch {
      return fail("Could not list this user's files. The account was not deleted.", "storage_status");
    }
    if (paths.length) {
      let pathsToRemove = paths;
      if (bucket === "recipe-images") {
        const urls = paths.map((path) => target.service.storage.from(bucket).getPublicUrl(path).data.publicUrl);
        const referencedUrls = new Set<string | null>();
        for (const urlBatch of chunks(urls)) {
          const { data: referenced, error: referencesError } = await target.service.from("recipes").select("photo_url").in("photo_url", urlBatch);
          if (referencesError) return fail("Could not verify recipe image references. The account was not deleted.", "storage_status");
          for (const recipe of referenced ?? []) referencedUrls.add(recipe.photo_url);
        }
        pathsToRemove = paths.filter((_, index) => !referencedUrls.has(urls[index]));
      }
      try {
        await removeStoragePaths(target.service, bucket, pathsToRemove);
      } catch {
        return fail("Could not remove this user's files. The account was not deleted.", "storage_status");
      }
    }
  }

  // Private cookbook originals are tied to the recipe hierarchy; delete them
  // only when their recipe is being deleted with the cookbook.
  for (const bookId of privateBookIds) {
    const { data: recipes } = await target.service.from("recipes").select("id").eq("book_id", bookId);
    for (const recipe of recipes ?? []) {
      let originals: string[];
      try {
        originals = await listStoragePaths(target.service, "recipe-originals", recipe.id);
      } catch {
        return fail("Could not list private recipe originals. The account was not deleted.", "storage_status");
      }
      if (originals.length) {
        try {
          await removeStoragePaths(target.service, "recipe-originals", originals);
        } catch {
          return fail("Could not remove private recipe originals. The account was not deleted.", "storage_status");
        }
      }
    }
  }
  await target.service.from("account_deletions").update({ storage_status: "complete", database_status: "complete" }).eq("id", deletion.id);
  const { error } = await target.service.auth.admin.deleteUser(parsed.data.userId);
  if (error) return fail("Could not delete this account. Please try again.", "auth_status");

  await target.service.from("account_deletions").update({ status: "complete", auth_status: "complete", completed_at: new Date().toISOString() }).eq("id", deletion.id);

  await logAdminAction(target.service, {
    actorId: adminUser.id,
    action: "delete_user",
    targetType: "user",
    targetId: parsed.data.userId,
    summary: `Permanently deleted ${target.email} after emailing a ${archive.recipeCount}-recipe archive`,
    metadata: { userId: parsed.data.userId, email: target.email, archivedRecipeCount: archive.recipeCount },
  });
  revalidatePath("/app/admin");
  return { success: true, data: undefined };
}

/**
 * Admin-only: invite an existing user to a cookbook from the admin panel.
 *
 * This creates a pending invitation (and emails it) rather than writing a
 * book_members row directly — the person chooses to accept before the book lands
 * on their shelf. Mirrors the keeper invite flow in inviteMember, but scoped to
 * platform admins and operating via the service-role client.
 */
export async function inviteUserToBook(
  input: AdminInviteToBookInput
): Promise<ActionResult> {
  const adminUser = await requireAdmin();

  const parsed = inviteToBookSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { bookId, userId, role } = parsed.data;

  const service = createServiceClient();

  const [{ data: book, error: bookError }, { data: targetUser, error: userError }] =
    await Promise.all([
      service.from("recipe_books").select("id, title, owner_id").eq("id", bookId).single(),
      service.auth.admin.getUserById(userId),
    ]);

  if (bookError || !book) {
    return { success: false, error: "Cookbook not found." };
  }
  const targetEmail = targetUser?.user?.email?.toLowerCase();
  if (userError || !targetEmail) {
    return { success: false, error: "Could not find that person's email address." };
  }
  if (book.owner_id === userId) {
    return { success: false, error: "That person already owns this cookbook." };
  }

  // Being a platform admin does not grant the right to share someone else's
  // private cookbook. You can only invite people to books you own or keep.
  if (book.owner_id !== adminUser.id) {
    const { data: adminMembership } = await service
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", adminUser.id)
      .maybeSingle();
    if (adminMembership?.role !== "keeper") {
      return {
        success: false,
        error: "You can only invite people to cookbooks you own or keep.",
      };
    }
  }

  const { data: existingMember } = await service
    .from("book_members")
    .select("user_id")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existingMember) {
    return { success: false, error: "They're already a member of this cookbook." };
  }

  const { data: existingInvite } = await service
    .from("book_invitations")
    .select("id")
    .eq("book_id", bookId)
    .eq("email", targetEmail)
    .is("accepted_at", null)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();
  if (existingInvite) {
    return { success: false, error: "They already have a pending invite to this cookbook." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // A cookbook with invitations is, by definition, shared.
  await service.from("recipe_books").update({ sharing_enabled: true }).eq("id", bookId);

  const { error: inviteError } = await service.from("book_invitations").insert({
    book_id: bookId,
    email: targetEmail,
    role,
    token,
    invited_by: adminUser.id,
    expires_at: expiresAt,
  });
  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  const { data: inviterProfile } = await service
    .from("profiles")
    .select("full_name")
    .eq("id", adminUser.id)
    .single();

  try {
    const inviteUrl = `${getAppBaseUrl()}/invite/${token}`;
    const email = createMemberInviteEmail({
      inviteUrl,
      cookbookTitle: book.title ?? "a cookbook",
      inviterName: inviterFirstName(inviterProfile?.full_name),
      invitedEmail: targetEmail,
      role,
      expiresAt,
      logoUrl: getDefaultLogoUrl(),
    });
    await sendEmail({
      to: targetEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (emailError) {
    return {
      success: false,
      error:
        emailError instanceof Error
          ? `Invitation was created, but the email could not be sent: ${emailError.message}`
          : "Invitation was created, but the email could not be sent.",
    };
  }

  await logAdminAction(service, {
    actorId: adminUser.id,
    action: "invite_user_to_book",
    targetType: "book_invitation",
    targetId: bookId,
    summary: `Invited ${targetEmail} to "${book.title ?? "a cookbook"}" as ${role}`,
    metadata: { bookId, invitedUserId: userId, role, email: targetEmail },
  });

  revalidatePath("/app/admin");
  revalidatePath(`/app/books/${bookId}/members`);
  return { success: true, data: undefined };
}
