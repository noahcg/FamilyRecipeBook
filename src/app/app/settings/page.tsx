import { GlobalSettingsPageContent } from "@/components/settings/SettingsPageContent";
import { getAISettings } from "@/lib/actions/aiSettings";
import { getGroceryDayLabelPref } from "@/lib/actions/grocery";
import { isAdminEmail } from "@/lib/admin";
import { requireProfile, requireUser } from "@/lib/auth";
import { getEffectiveEntitlements } from "@/lib/entitlements";

export default async function GlobalSettingsPage() {
  const [profile, user, aiSettings] = await Promise.all([
    requireProfile(),
    requireUser(),
    getAISettings(),
  ]);
  const billing = await getEffectiveEntitlements(user.id);
  const groceryDayLabels = billing.plan === "plus" ? await getGroceryDayLabelPref() : false;

  const cloudflareConfigured = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN
  );

  return (
    <GlobalSettingsPageContent
      profile={profile}
      isAdmin={isAdminEmail(user.email)}
      aiSettings={aiSettings}
      cloudflareConfigured={cloudflareConfigured}
      groceryDayLabels={groceryDayLabels}
      billing={billing}
    />
  );
}
