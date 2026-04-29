import Link from "next/link";
import { BookOpen, Heart, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Save family recipes",
    body: "Capture every dish with ingredients, instructions, and the story behind it.",
  },
  {
    icon: Heart,
    title: "Add stories and memories",
    body: "Each recipe holds a memory. Add notes, photos, and the moments that made it special.",
  },
  {
    icon: Users,
    title: "Bring family into the book",
    body: "Invite everyone to view, react, and add their own memories to every recipe.",
  },
  {
    icon: Sparkles,
    title: "Build collections",
    body: "Group recipes into collections for holidays, quick meals, Sunday dinners, and more.",
  },
];

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
        {/* Cookbook illustration */}
        <div className="flex items-end justify-center gap-3 mb-10">
          {[
            { style: "sage", rotate: "-rotate-6" },
            { style: "terracotta", rotate: "rotate-0 scale-110" },
            { style: "mustard", rotate: "rotate-6" },
          ].map(({ style, rotate }, i) => (
            <div
              key={i}
              className={`relative rounded-xl border-2 shadow-sm flex flex-col justify-end p-3 ${rotate} transition-transform`}
              style={{
                width: 72,
                height: 92,
                background:
                  style === "sage"
                    ? "var(--color-sage-pale)"
                    : style === "terracotta"
                    ? "#FADDD6"
                    : "#FAE8C0",
                borderColor:
                  style === "sage"
                    ? "var(--color-sage-soft)"
                    : style === "terracotta"
                    ? "#E76F51"
                    : "#F2B348",
              }}
            >
              <BookOpen
                size={20}
                strokeWidth={1.25}
                style={{
                  color:
                    style === "sage"
                      ? "var(--color-sage)"
                      : style === "terracotta"
                      ? "#E76F51"
                      : "#F2B348",
                  opacity: 0.5,
                  marginBottom: 4,
                }}
              />
              <div
                className="h-1.5 rounded-full mb-1"
                style={{
                  background:
                    style === "sage"
                      ? "var(--color-sage-soft)"
                      : style === "terracotta"
                      ? "#F2A48A"
                      : "#F5CC7A",
                  width: "70%",
                }}
              />
              <div
                className="h-1 rounded-full"
                style={{
                  background:
                    style === "sage"
                      ? "var(--color-sage-soft)"
                      : style === "terracotta"
                      ? "#F2A48A"
                      : "#F5CC7A",
                  width: "50%",
                  opacity: 0.6,
                }}
              />
            </div>
          ))}
        </div>

        <h1
          className="text-4xl sm:text-hero font-bold text-green-deep leading-tight mb-4"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Made with love.
          <br />
          <span className="italic text-accent-terracotta">Shared for generations.</span>
        </h1>

        <p className="text-ink-muted text-lg leading-relaxed mb-10 max-w-md">
          Create a family recipe book, save the meals that matter, and bring
          everyone into the story.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/sign-up" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" fullWidth>
              Start your recipe book
            </Button>
          </Link>
          <Link href="/sign-in" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" fullWidth>
              Sign in
            </Button>
          </Link>
        </div>

        <p
          className="mt-8 text-sm"
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

      {/* Feature cards — 4 cards */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="recipe-card p-6">
            <Icon size={22} strokeWidth={1.5} className="text-green-sage mb-3" />
            <h3
              className="font-bold text-green-deep mb-1 text-sm"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {title}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
