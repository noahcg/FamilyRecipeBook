import Link from "next/link";
import { BookOpen, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="app-paper-bg paper-texture min-h-screen flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <BookOpen size={20} strokeWidth={1.75} className="text-green-sage" />
          <span
            className="text-green-deep font-bold text-lg"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Family Recipe Book
          </span>
        </div>
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-2xl mx-auto w-full">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-md"
          style={{ background: "var(--color-sage-soft)" }}
        >
          <BookOpen size={36} strokeWidth={1.5} className="text-green-deep" />
        </div>

        <h1
          className="text-4xl sm:text-hero font-bold text-green-deep leading-tight mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Your family&rsquo;s recipes,
          <br />
          <span className="italic text-accent-terracotta">together forever.</span>
        </h1>

        <p className="text-ink-muted text-lg leading-relaxed mb-10 max-w-md">
          Create a recipe book, fill it with the dishes your family loves, and
          bring everyone in to preserve the stories behind each one.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" fullWidth>
              Create your recipe book
            </Button>
          </Link>
          <Link href="/sign-in" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" fullWidth>
              Sign in
            </Button>
          </Link>
        </div>

        <p
          className="mt-6 text-sm"
          style={{
            fontFamily: "var(--font-caveat)",
            color: "var(--color-cinnamon)",
            fontSize: "1.15rem",
          }}
        >
          &ldquo;A recipe has no soul. You, as the cook, must bring soul to the
          recipe.&rdquo;
        </p>
      </main>

      {/* Value props */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-20 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: BookOpen,
            title: "One book, every recipe",
            body: "Add recipes with ingredients, instructions, and the story behind each dish.",
          },
          {
            icon: Users,
            title: "Bring family in",
            body: "Invite family members to view, react, and add their own notes and memories.",
          },
          {
            icon: Heart,
            title: "Keep it alive",
            body: "React with love, mark favorites, and add notes so every recipe stays warm.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="recipe-card p-6">
            <Icon
              size={24}
              strokeWidth={1.5}
              className="text-green-sage mb-3"
            />
            <h3
              className="font-bold text-green-deep mb-1"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {title}
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
