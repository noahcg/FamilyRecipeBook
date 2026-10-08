import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getPublicSharedRecipe } from "@/lib/actions/recipeShares";
import { PublicSharedRecipe } from "@/components/recipe/PublicSharedRecipe";
import { createClient } from "@/lib/supabase/server";

export default async function SharedRecipePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const [recipe, user] = await Promise.all([getPublicSharedRecipe(shareId), getUser()]);
  if (!recipe) notFound();
  let metricUnits: boolean | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("user_settings").select("metric_units").eq("user_id", user.id).maybeSingle();
    metricUnits = data?.metric_units ?? false;
  }
  return <PublicSharedRecipe recipe={recipe} shareId={shareId} authenticated={Boolean(user)} metricUnits={metricUnits} />;
}
