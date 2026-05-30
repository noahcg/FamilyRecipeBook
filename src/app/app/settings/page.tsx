import { GlobalSettingsPageContent } from "@/components/settings/SettingsPageContent";
import { getAISettings } from "@/lib/actions/aiSettings";
import { getGroceryDayLabelPref } from "@/lib/actions/grocery";
import { isAdminEmail } from "@/lib/admin";
import { requireProfile, requireUser } from "@/lib/auth";

export default async function GlobalSettingsPage() {
  const [profile, user, aiSettings, groceryDayLabels] = await Promise.all([
    requireProfile(),
    requireUser(),
    getAISettings(),
    getGroceryDayLabelPref(),
  ]);

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
    />
  );
}
