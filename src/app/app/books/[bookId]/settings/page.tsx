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

  const [bookRes, memberRes] = await Promise.all([
    supabase.from("recipe_books").select("title").eq("id", bookId).single(),
    supabase
      .from("book_members")
      .select("role")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .single(),
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
      isKeeper={memberRes.data.role === "keeper"}
      aiSettings={aiSettings}
      cloudflareConfigured={cloudflareConfigured}
    />
  );
}
