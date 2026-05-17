import { notFound } from "next/navigation";
import { SettingsPageContent } from "@/components/settings/SettingsPageContent";
import { getAISettings } from "@/lib/actions/aiSettings";
import { requireProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ bookId: string }>;
}

export default async function BookSettingsPage({ params }: Props) {
  const { bookId } = await params;
  const [profile, user, supabase, aiSettings] = await Promise.all([
    requireProfile(),
    requireUser(),
    createClient(),
    getAISettings(),
  ]);

  const [bookRes, bookPrefsRes, memberRes, settingsRes, sharedMemberRes, pendingInviteRes] = await Promise.all([
    supabase.from("recipe_books").select("title,sharing_enabled").eq("id", bookId).single(),
    supabase.from("recipe_books").select("cover_style,sharing_enabled").eq("id", bookId).single(),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("default_book_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("book_members")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .neq("role", "keeper"),
    supabase
      .from("book_invitations")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId)
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString()),
  ]);

  if (!bookRes.data || !memberRes.data) notFound();

  const cloudflareConfigured = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN
  );

  return (
    <SettingsPageContent
      profile={profile}
      bookId={bookId}
      bookTitle={bookRes.data.title}
      bookCoverStyle={bookPrefsRes.data?.cover_style ?? "sage"}
      sharingEnabled={bookRes.data.sharing_enabled ?? false}
      sharingBlockerCount={(sharedMemberRes.count ?? 0) + (pendingInviteRes.count ?? 0)}
      isDefaultBook={settingsRes.data?.default_book_id === bookId}
      bookPreferencesReady={!bookPrefsRes.error && !settingsRes.error}
      sharingPreferencesReady={!bookRes.error && !sharedMemberRes.error && !pendingInviteRes.error}
      isKeeper={memberRes.data.role === "keeper"}
      aiSettings={aiSettings}
      cloudflareConfigured={cloudflareConfigured}
    />
  );
}
