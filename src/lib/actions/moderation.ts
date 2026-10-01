"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

const reasons = z.enum(["inappropriate_image", "harassment", "privacy_concern", "copyright_concern", "spam_scam", "other"]);
const targetTypes = z.enum(["recipe", "story", "cookbook", "membership"]);
const reportSchema = z.object({ targetType: targetTypes, targetId: z.string().uuid(), reasonCode: reasons, statement: z.string().trim().max(1000).optional() });
const actionSchema = z.object({ caseId: z.string().uuid(), action: z.enum(["hide", "restore", "remove_asset", "remove_recipe", "remove_story", "restrict_uploads", "remove_membership", "suspend", "ban", "resolve"]), reasonCode: reasons, internalNote: z.string().trim().min(3).max(2000), confirmed: z.literal(true) });

type CaseTarget = { targetType: z.infer<typeof targetTypes>; targetId: string; bookId: string | null; ownerId: string | null };

async function resolveReportTarget(targetType: z.infer<typeof targetTypes>, targetId: string): Promise<CaseTarget | null> {
  const db = await createClient();
  if (targetType === "recipe") {
    const { data } = await db.from("recipes").select("id,book_id,created_by").eq("id", targetId).maybeSingle();
    return data ? { targetType, targetId: data.id, bookId: data.book_id, ownerId: data.created_by } : null;
  }
  if (targetType === "story") {
    const { data } = await db.from("recipe_stories").select("id,author_id,recipes!inner(book_id)").eq("id", targetId).maybeSingle();
    const recipe = Array.isArray(data?.recipes) ? data?.recipes[0] : data?.recipes;
    return data && recipe ? { targetType, targetId: data.id, bookId: recipe.book_id, ownerId: data.author_id } : null;
  }
  if (targetType === "cookbook") {
    const { data } = await db.from("recipe_books").select("id,owner_id").eq("id", targetId).maybeSingle();
    return data ? { targetType, targetId: data.id, bookId: data.id, ownerId: data.owner_id } : null;
  }
  const { data } = await db.from("book_members").select("id,book_id,user_id").eq("id", targetId).maybeSingle();
  return data ? { targetType, targetId: data.id, bookId: data.book_id, ownerId: data.user_id } : null;
}

export async function submitModerationReport(input: unknown): Promise<ActionResult<{ caseId: string }>> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Choose a reason and keep the description under 1,000 characters." };
  const target = await resolveReportTarget(parsed.data.targetType, parsed.data.targetId);
  if (!target) return { success: false, error: "That item is unavailable or you do not have access to report it." };
  const service = createServiceClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await service.from("moderation_cases").select("id", { count: "exact", head: true }).eq("reported_by_user_id", user.id).gte("opened_at", hourAgo);
  if ((count ?? 0) >= 5) return { success: false, error: "You have reached the report limit. Please try again in an hour." };
  const { data, error } = await service.from("moderation_cases").insert({ target_type: target.targetType, target_id: target.targetId, cookbook_id: target.bookId, target_owner_user_id: target.ownerId, reported_by_user_id: user.id, reason_code: parsed.data.reasonCode, reporter_statement: parsed.data.statement || null }).select("id").single();
  if (error?.code === "23505") return { success: false, error: "You already have an open report for this item." };
  if (error || !data) return { success: false, error: "We could not submit your report. Please try again." };
  await service.from("moderation_case_events").insert({ case_id: data.id, actor_user_id: user.id, event_type: "reported", reason_code: parsed.data.reasonCode, safe_metadata_json: { source: "member_report" } });
  return { success: true, data: { caseId: data.id } };
}

export async function moderateCase(input: unknown): Promise<ActionResult<void>> {
  const actor = await requireAdmin();
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "A reason, internal note, and confirmation are required." };
  const service = createServiceClient();
  const { data: item, error } = await service.from("moderation_cases").select("*").eq("id", parsed.data.caseId).maybeSingle();
  if (error || !item) return { success: false, error: "Moderation case not found." };
  if (item.status === "critical_sensitive") return { success: false, error: "Critical-sensitive cases require the approved incident procedure and cannot be handled here." };
  const action = parsed.data.action;
  let decision: string | null = null;
  let status: string | null = null;
  let targetPath: string | null = null;
  if (action === "hide" && item.target_type === "recipe") {
    const { error: updateError } = await service.from("recipes").update({ moderation_hidden: true }).eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not hide this recipe." };
    decision = "restricted"; status = "hidden_pending_review"; targetPath = `/app/books/${item.cookbook_id}/recipes/${item.target_id}`;
  } else if (action === "restore" && item.target_type === "recipe") {
    const { error: updateError } = await service.from("recipes").update({ moderation_hidden: false }).eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not restore this recipe." };
    decision = "restored"; status = "resolved"; targetPath = `/app/books/${item.cookbook_id}/recipes/${item.target_id}`;
  } else if (action === "remove_asset" && item.target_type === "recipe") {
    const { error: updateError } = await service.from("recipes").update({ photo_url: null }).eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not unlink the image." };
    decision = "removed"; status = "resolved"; targetPath = `/app/books/${item.cookbook_id}/recipes/${item.target_id}`;
  } else if (action === "remove_recipe" && item.target_type === "recipe") {
    const { error: updateError } = await service.from("recipes").update({ moderation_hidden: true }).eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not remove this recipe." };
    decision = "removed"; status = "resolved";
  } else if (action === "remove_story" && item.target_type === "story") {
    const { error: updateError } = await service.from("recipe_stories").update({ moderation_hidden: true }).eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not remove this story." };
    decision = "removed"; status = "resolved";
  } else if (action === "restrict_uploads" && item.target_owner_user_id) {
    const { error: updateError } = await service.from("profiles").update({ moderation_upload_restricted: true }).eq("id", item.target_owner_user_id);
    if (updateError) return { success: false, error: "Could not restrict uploads." };
    decision = "restricted"; status = "resolved";
  } else if (action === "remove_membership" && item.target_type === "membership") {
    const { error: updateError } = await service.from("book_members").delete().eq("id", item.target_id);
    if (updateError) return { success: false, error: "Could not remove this membership." };
    decision = "removed"; status = "resolved";
  } else if ((action === "suspend" || action === "ban") && item.target_owner_user_id) {
    const { error: updateError } = await service.auth.admin.updateUserById(item.target_owner_user_id, { ban_duration: action === "ban" ? "876000h" : "720h" });
    if (updateError) return { success: false, error: "Could not update account access." };
    decision = action === "ban" ? "banned" : "suspended"; status = "resolved";
  } else if (action === "resolve") { decision = "no_action"; status = "resolved"; }
  else return { success: false, error: "That action is not available for this case target." };
  await service.from("moderation_cases").update({ status, decision, decision_by_admin_id: actor.id, internal_notes: parsed.data.internalNote, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", item.id);
  await service.from("moderation_case_events").insert({ case_id: item.id, actor_user_id: actor.id, event_type: `moderation_${action}`, reason_code: parsed.data.reasonCode, safe_metadata_json: { target_type: item.target_type } });
  await logAdminAction(service, { actorId: actor.id, action: `moderation_${action}`, targetType: item.target_type, targetId: item.target_id, summary: `Moderation ${action} on case ${item.id}`, metadata: { case_id: item.id, reason_code: parsed.data.reasonCode } });
  if (targetPath) revalidatePath(targetPath);
  revalidatePath("/app/admin/moderation");
  return { success: true, data: undefined };
}
