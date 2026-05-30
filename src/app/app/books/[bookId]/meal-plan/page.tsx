import { redirect } from "next/navigation";

// Meal planning is account-level now (one household plan across all cookbooks).
// This per-book route is kept only so old links/bookmarks land in the right place.
export default function BookMealPlanRedirect() {
  redirect("/app/meal-plan");
}
