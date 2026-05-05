import { AppShell } from "@/components/layout/AppShell";
import { requireProfile, requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui";
import { RenameBookForm } from "@/components/book/RenameBookForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const [profile, user, bookId, supabase] = await Promise.all([
    requireProfile(),
    requireUser(),
    getFirstBookId(),
    createClient(),
  ]);

  if (!bookId) redirect("/onboarding/create-book");

  const [bookRes, memberRes] = await Promise.all([
    supabase.from("recipe_books").select("title").eq("id", bookId).single(),
    supabase.from("book_members").select("role").eq("book_id", bookId).eq("user_id", user.id).single(),
  ]);

  const bookTitle = bookRes.data?.title ?? "";
  const isKeeper = memberRes.data?.role === "keeper";

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  return (
    <AppShell bookId={bookId} bookTitle={bookTitle}>
      <div className="px-5 pt-6 pb-10">
        <h1
          className="text-xl font-bold text-green-deep mb-6"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Account
        </h1>

        {/* Profile card */}
        <div className="recipe-card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0"
              style={{
                background: "var(--color-sage-soft)",
                color: "var(--color-deep-green)",
              }}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Profile"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>
            <div>
              <p
                className="font-bold text-green-deep"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {profile.full_name ?? "Your name"}
              </p>
              {profile.known_for && (
                <p className="text-sm text-ink-muted italic">
                  Known for: {profile.known_for}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Book settings */}
        {isKeeper && (
          <div className="recipe-card p-5 mb-6">
            <h2
              className="mb-4 text-base font-bold text-green-deep"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Recipe Book
            </h2>
            <RenameBookForm bookId={bookId} currentTitle={bookTitle} />
          </div>
        )}

        {/* Sign out */}
        <form action={signOut}>
          <Button type="submit" variant="secondary" fullWidth>
            Sign out
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
