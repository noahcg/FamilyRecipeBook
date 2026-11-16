import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";
import { isAdminEmail } from "@/lib/admin";
import { AccountProvider } from "@/lib/context/AccountContext";
import { RouteHistoryTracker } from "@/components/layout/RouteHistoryTracker";
import { getEffectiveEntitlements } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { requireProfileName } from "@/lib/profileCompletion";
import { getOfficialCollectionLibrary } from "@/lib/officialCollections";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure authenticated
  const user = await requireUser();
  await requireProfileName(user.id, "/app");
  // A free official collection is enough to use the app. Its readers do not
  // need to create a personal cookbook or acquire family membership first.
  const bookId = await getFirstBookId();
  if (!bookId && (await getOfficialCollectionLibrary()).length === 0) {
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
