import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";

export type PlanKey = "free" | "plus";
export type BillingTier = "free" | "plus" | "grandfathered";
export type FeatureKey =
  | "recipe.create"
  | "cookbook.create"
  | "recipe.share"
  | "cookbook.share"
  | "recipe.import"
  | "recipe.autoOrganize"
  | "recipe.pdfExport"
  | "mealPlanner"
  | "grocery"
  | "ai.recipeIdeas";

export const PLAN_DEFINITIONS = {
  free: {
    maxCookbooks: 1,
    maxRecipes: 50,
    maxAiIdeasPerPeriod: 5,
    features: {
      "recipe.create": true, "cookbook.create": true, "recipe.share": true,
      "cookbook.share": true, "recipe.import": false, "recipe.autoOrganize": false,
      "recipe.pdfExport": false, mealPlanner: false, grocery: false, "ai.recipeIdeas": true,
    },
  },
  plus: {
    maxCookbooks: null,
    maxRecipes: null,
    maxAiIdeasPerPeriod: 50,
    features: {
      "recipe.create": true, "cookbook.create": true, "recipe.share": true,
      "cookbook.share": true, "recipe.import": true, "recipe.autoOrganize": true,
      "recipe.pdfExport": true, mealPlanner: true, grocery: true, "ai.recipeIdeas": true,
    },
  },
} as const satisfies Record<PlanKey, { maxCookbooks: number | null; maxRecipes: number | null; maxAiIdeasPerPeriod: number; features: Record<FeatureKey, boolean> }>;

export type BillingStatus = {
  plan: PlanKey;
  tier: BillingTier;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  grandfathered_at: string | null;
};
export class EntitlementError extends Error {
  constructor(public readonly code: "FEATURE_REQUIRES_PLUS" | "RECIPE_LIMIT_REACHED" | "COOKBOOK_LIMIT_REACHED" | "AI_ALLOWANCE_EXHAUSTED", message: string) { super(message); }
}

export function planForStatus(status: string | null | undefined): PlanKey {
  return status === "active" || status === "trialing" ? "plus" : "free";
}

export async function getEffectiveEntitlements(userId: string): Promise<BillingStatus & { maxCookbooks: number | null; maxRecipes: number | null; maxAiIdeasPerPeriod: number }> {
  const supabase = await createClient();
  const { data } = await supabase.from("billing_accounts").select("plan,status,current_period_end,cancel_at_period_end,stripe_customer_id,grandfathered_plus,grandfathered_at").eq("user_id", userId).maybeSingle();
  const tier: BillingTier = data?.grandfathered_plus === true
    ? "grandfathered"
    : planForStatus(data?.status ?? data?.plan);
  const plan: PlanKey = tier === "free" ? "free" : "plus";
  const definition = PLAN_DEFINITIONS[plan];
  return { plan, tier, status: data?.status ?? "free", current_period_end: data?.current_period_end ?? null, cancel_at_period_end: data?.cancel_at_period_end ?? false, stripe_customer_id: data?.stripe_customer_id ?? null, grandfathered_at: data?.grandfathered_at ?? null, maxCookbooks: definition.maxCookbooks, maxRecipes: definition.maxRecipes, maxAiIdeasPerPeriod: definition.maxAiIdeasPerPeriod };
}

export async function canUseFeature(userId: string, feature: FeatureKey) {
  const entitlements = await getEffectiveEntitlements(userId);
  return PLAN_DEFINITIONS[entitlements.plan].features[feature];
}

export async function assertFeatureAccess(userId: string, feature: FeatureKey) {
  if (!(await canUseFeature(userId, feature))) throw new EntitlementError("FEATURE_REQUIRES_PLUS", "This feature is included with Plus.");
}

export async function assertCanCreateCookbook(userId: string) {
  const entitlements = await getEffectiveEntitlements(userId);
  if (entitlements.maxCookbooks === null) return;
  const supabase = await createClient();
  const { count } = await supabase.from("recipe_books").select("id", { count: "exact", head: true }).eq("owner_id", userId);
  if ((count ?? 0) >= entitlements.maxCookbooks) throw new EntitlementError("COOKBOOK_LIMIT_REACHED", "Free accounts include one cookbook. Upgrade to Plus for unlimited cookbooks.");
}

export type BookRecipeAccess = {
  allowed: boolean;
  canContribute: boolean;
  ownerHasPlus: boolean;
  isOwner: boolean;
  isEligibleFreeBook: boolean;
  used: number;
  limit: number | null;
};

export async function getBookRecipeAccess(bookId: string, userId: string): Promise<BookRecipeAccess> {
  const admin = createServiceClient();
  const [{ data: book }, { data: membership }] = await Promise.all([
    admin.from("recipe_books").select("owner_id").eq("id", bookId).maybeSingle(),
    admin.from("book_members").select("role").eq("book_id", bookId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!book || !membership) {
    return { allowed: false, canContribute: false, ownerHasPlus: false, isOwner: false, isEligibleFreeBook: false, used: 0, limit: null };
  }

  const [{ data: billing }, { data: oldestBook }, { count }] = await Promise.all([
    admin.from("billing_accounts").select("status,grandfathered_plus").eq("user_id", book.owner_id).maybeSingle(),
    admin.from("recipe_books").select("id").eq("owner_id", book.owner_id).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1).maybeSingle(),
    admin.from("recipes").select("id", { count: "exact", head: true }).eq("book_id", bookId),
  ]);
  const ownerHasPlus = billing?.grandfathered_plus === true || billing?.status === "active" || billing?.status === "trialing";
  const isOwner = book.owner_id === userId;
  const hasRole = membership.role === "keeper" || membership.role === "contributor";
  const isEligibleFreeBook = oldestBook?.id === bookId;
  const used = count ?? 0;
  const limit = ownerHasPlus ? null : 50;
  const canContribute = hasRole && (ownerHasPlus || (isOwner && isEligibleFreeBook));
  const allowed = canContribute && (limit === null || used < limit);

  return { allowed, canContribute, ownerHasPlus, isOwner, isEligibleFreeBook, used, limit };
}

export async function assertCanCreateRecipe(userId: string, bookId: string) {
  const access = await getBookRecipeAccess(bookId, userId);
  if (access.allowed) return;
  if (!access.ownerHasPlus && !access.isOwner) {
    throw new EntitlementError("FEATURE_REQUIRES_PLUS", "The cookbook owner needs Plus before Contributors can add recipes.");
  }
  if (!access.ownerHasPlus && !access.isEligibleFreeBook) {
    throw new EntitlementError("FEATURE_REQUIRES_PLUS", "Free recipe saving is available in your oldest cookbook. Upgrade to Plus to add recipes to this one.");
  }
  if (access.limit !== null && access.used >= access.limit) {
    throw new EntitlementError("RECIPE_LIMIT_REACHED", "This Free cookbook already has 50 recipes. Upgrade to Plus to keep saving.");
  }
  throw new EntitlementError("FEATURE_REQUIRES_PLUS", "You don't have permission to add recipes to this cookbook.");
}

function currentPeriodStart() { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10); }
export async function getAiAllowance(userId: string) {
  const entitlements = await getEffectiveEntitlements(userId);
  const supabase = await createClient();
  const { data } = await supabase.from("ai_allowance_usage").select("quantity_used").eq("user_id", userId).eq("feature", "ai.recipeIdeas").eq("period_start", currentPeriodStart()).maybeSingle();
  return { limit: entitlements.maxAiIdeasPerPeriod, used: data?.quantity_used ?? 0, remaining: Math.max(entitlements.maxAiIdeasPerPeriod - (data?.quantity_used ?? 0), 0) };
}

export async function consumeAiAllowance(userId: string, quantity = 1) {
  const entitlements = await getEffectiveEntitlements(userId);
  // The allowance limit is trusted server configuration, never a client RPC argument.
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("consume_ai_allowance", { target_user_id: userId, target_period_start: currentPeriodStart(), allowance_limit: entitlements.maxAiIdeasPerPeriod, amount: quantity }).single();
  const result = data as { allowed?: boolean; remaining?: number } | null;
  if (error || !result?.allowed) throw new EntitlementError("AI_ALLOWANCE_EXHAUSTED", "You’ve used your AI recipe ideas for this allowance period. Upgrade to Plus for a higher allowance.");
  return result.remaining ?? 0;
}

export function entitlementFailure(error: unknown): ActionResult<never> {
  if (error instanceof EntitlementError) return { success: false, error: error.message };
  throw error;
}

export type BookSharingAllowance = {
  isFree: boolean;
  canShare: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
};

// The RPC checks Keeper access and returns only sharing limits, never the
// owner's private billing account. Missing migrations/errors fail closed.
export async function getBookSharingAllowance(bookId: string): Promise<BookSharingAllowance> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_book_sharing_allowance", { target_book_id: bookId }).single();
  if (error || !data) throw new Error("Could not load cookbook sharing limits. Please try again.");
  const allowance = data as { can_share: boolean; is_free: boolean; used: number; seat_limit: number | null; remaining: number | null };
  return { isFree: allowance.is_free, canShare: allowance.can_share, used: allowance.used, limit: allowance.seat_limit, remaining: allowance.remaining };
}
