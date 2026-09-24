import "server-only";

import { createClient } from "@/lib/supabase/server";
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
      "cookbook.share": false, "recipe.import": false, "recipe.autoOrganize": false,
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

export async function assertCanCreateRecipe(userId: string) {
  const entitlements = await getEffectiveEntitlements(userId);
  if (entitlements.maxRecipes === null) return;
  const supabase = await createClient();
  const { count } = await supabase.from("recipes").select("id", { count: "exact", head: true }).eq("created_by", userId);
  if ((count ?? 0) >= entitlements.maxRecipes) throw new EntitlementError("RECIPE_LIMIT_REACHED", "Free accounts include up to 50 saved recipes. Upgrade to Plus to keep saving.");
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_ai_allowance", { target_user_id: userId, target_period_start: currentPeriodStart(), allowance_limit: entitlements.maxAiIdeasPerPeriod, amount: quantity }).single();
  const result = data as { allowed?: boolean; remaining?: number } | null;
  if (error || !result?.allowed) throw new EntitlementError("AI_ALLOWANCE_EXHAUSTED", "You’ve used your AI recipe ideas for this allowance period. Upgrade to Plus for a higher allowance.");
  return result.remaining ?? 0;
}

export function entitlementFailure(error: unknown): ActionResult<never> {
  if (error instanceof EntitlementError) return { success: false, error: error.message };
  throw error;
}
