import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";
import { isAdminEmail } from "@/lib/admin";
import { AccountProvider } from "@/lib/context/AccountContext";
import { RouteHistoryTracker } from "@/components/layout/RouteHistoryTracker";
import { getEffectiveEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure authenticated
  const user = await requireUser();
  // Confine users without a book to onboarding — they can't reach app pages
  // or nav until they've joined or created their first cookbook.
  const bookId = await getFirstBookId();
  if (!bookId) {
    redirect("/onboarding");
  }
  // Admin status is account-level, so it must be available on the global pages
  // (Home, All Recipes, …) that have no per-book context.
  const billing = await getEffectiveEntitlements(user.id);
  const supabase = await createClient();
  const { data: unitSettings } = await supabase.from("user_settings").select("metric_units").eq("user_id", user.id).maybeSingle();
  return (
    <AccountProvider isAdmin={isAdminEmail(user.email)} plan={billing.plan} initialMetricUnits={unitSettings?.metric_units ?? false}>
      <RouteHistoryTracker />
      {children}
    </AccountProvider>
  );
}
