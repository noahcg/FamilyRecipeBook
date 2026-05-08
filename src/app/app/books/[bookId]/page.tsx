import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChefHat,
  ChevronRight,
  Lightbulb,
  Plus,
  Refrigerator,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui";
import { MemberAvatarStack } from "@/components/ui/MemberAvatarStack";
import { requireProfile } from "@/lib/auth";
import { getBookPageData } from "@/lib/actions/books";
import type { Profile, Recipe } from "@/lib/types";

interface Props {
  params: Promise<{ bookId: string }>;
}

interface HomeMember {
  user_id: string;
  profile: Pick<Profile, "full_name" | "avatar_url"> | null;
}

interface HomeRecipe extends Recipe {
  creator: Pick<Profile, "full_name"> | null;
  loveCount?: number;
}

const PANTRY_ITEMS = ["chicken thighs", "spinach", "lemons", "rice", "yogurt"];
const WEEK_DAYS = [
  { day: "M", planned: true },
  { day: "T", planned: true },
  { day: "W", planned: false },
  { day: "T", planned: true },
  { day: "F", planned: false },
  { day: "S", planned: false },
  { day: "S", planned: true },
];

function DashboardCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-line-soft bg-card/76 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function PageSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-line-soft pb-6 last:border-b-0 ${className}`}>
      {children}
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
      {children}
    </p>
  );
}

function QuickAction({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-b border-line-soft px-1 py-3 transition-colors last:border-b-0 hover:text-green-deep"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-paper-warm text-green-deep">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block truncate text-xs text-ink-muted">{detail}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-baseline gap-4">
      <div className="shrink-0">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h2
          className="mt-1 text-2xl font-bold leading-tight text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h2>
      </div>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

export default async function BookHomePage({ params }: Props) {
  const { bookId } = await params;
  const [data, profile] = await Promise.all([
    getBookPageData(bookId),
    requireProfile(),
  ]);
  if (!data) notFound();

  const { book, recent } = data;
  const latestRecipe = (recent as HomeRecipe[])[0] ?? null;
  const members = ((book.members ?? []) as HomeMember[]).map((member) => ({
    id: member.user_id,
    name: member.profile?.full_name ?? "Family",
    avatarUrl: member.profile?.avatar_url ?? undefined,
  }));
  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "there";
  const featuredTitle = latestRecipe?.title ?? "Lemon Rice Chicken Skillet";
  const featuredHref = latestRecipe
    ? `/app/books/${bookId}/recipes/${latestRecipe.id}`
    : `/app/books/${bookId}/ideas`;
  const featuredImage = latestRecipe?.photo_url ?? "/images/landing-cookbook-hero.png";

  return (
    <AppShell bookId={bookId}>
      <div className="min-h-dvh px-5 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1240px]">
          <header className="mb-7 grid gap-5 border-b border-line-soft pb-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <SectionEyebrow>Your family cookbook</SectionEyebrow>
              <h1
                className="mt-2 text-4xl font-bold leading-tight text-green-deep lg:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                What should we cook today?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                Welcome back, {firstName}. Here is a calm place to choose dinner, plan the week, and cook from what you already have.
              </p>
            </div>

            <DashboardCard className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-green-soft text-green-deep">
                  <ChefHat size={22} strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{firstName}&apos;s Kitchen</p>
                  <p className="text-xs text-ink-muted">{members.length || 1} cookbook member{members.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              {members.length > 0 && (
                <MemberAvatarStack members={members} maxVisible={4} size="sm" className="mt-4" />
              )}
            </DashboardCard>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-6">
              <DashboardCard className="overflow-hidden">
                <div className="grid min-h-[360px] lg:grid-cols-[minmax(0,1fr)_42%]">
                  <div className="flex flex-col justify-between p-5 sm:p-7">
                    <div>
                      <SectionEyebrow>Tonight made easy</SectionEyebrow>
                      <h2
                        className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-green-deep lg:text-4xl"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {featuredTitle}
                      </h2>
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
                        Suggested because your pantry snapshot already has rice, greens, citrus, and a quick protein path. It keeps dinner warm, simple, and weeknight-friendly.
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href={featuredHref}>
                        <Button variant="primary" size="md" className="rounded-md">
                          <UtensilsCrossed size={17} />
                          Start cooking
                        </Button>
                      </Link>
                      <Link href={`/app/books/${bookId}/ideas`}>
                        <Button variant="secondary" size="md" className="rounded-md">
                          <Sparkles size={17} />
                          Swap suggestion
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="relative min-h-[230px] overflow-hidden bg-green-pale lg:min-h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt=""
                      className="h-full w-full object-cover"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-sm bg-card/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon backdrop-blur-sm">
                      Dinner idea
                    </span>
                  </div>
                </div>
              </DashboardCard>

              <div className="grid gap-6 border-y border-line-soft py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="border-line-soft lg:border-r lg:pr-6">
                  <SectionHeader eyebrow="Smart kitchen notes" title="Small nudges" />
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-honey/20 text-accent-cinnamon">
                        <CalendarDays size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">Thursday dinner is still open.</p>
                        <p className="mt-0.5 text-sm text-ink-muted">Plan one easy meal before the week gets away.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-green-soft text-green-deep">
                        <ShoppingCart size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">You are missing 2 items for taco night.</p>
                        <p className="mt-0.5 text-sm text-ink-muted">Add tortillas and limes before shopping.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionHeader eyebrow="Pick up where you left off" title="Continue cooking" />
                  <div className="mt-4 flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-green-pale">
                      {latestRecipe?.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={latestRecipe.photo_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpenFallback />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="truncate text-xl font-bold text-green-deep"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {latestRecipe?.title ?? "Start with a saved recipe"}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                        {latestRecipe?.description ?? "Open your cookbook or ask AI for a dinner idea to begin."}
                      </p>
                      <Link href={featuredHref} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                        Continue <ChevronRight size={15} />
                      </Link>
                    </div>
                  </div>
                </section>
              </div>

              <PageSection>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <SectionEyebrow>What sounds good?</SectionEyebrow>
                    <h2
                      className="mt-2 text-2xl font-bold text-green-deep"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      Choose a dinner mood
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                    {[
                      ["Comfort", "warm and cozy"],
                      ["Quick", "under 30"],
                      ["Fresh", "bright and light"],
                      ["Something New", "surprise me"],
                    ].map(([label, hint]) => (
                      <Link
                        key={label}
                        href={`/app/books/${bookId}/ideas`}
                        className="rounded-sm border border-line-soft bg-white-soft/70 px-3 py-3 text-sm font-bold text-green-deep transition-colors hover:bg-green-pale"
                      >
                        {label}
                        <span className="mt-0.5 block text-xs font-semibold text-ink-soft">{hint}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </PageSection>
            </div>

            <aside className="space-y-6 xl:border-l xl:border-line-soft xl:pl-6">
              <PageSection>
                <SectionHeader eyebrow="Quick actions" title="Next move" />
                <div className="mt-4 space-y-1">
                  <QuickAction href={`/app/books/${bookId}/recipes/new`} icon={<Plus size={19} />} label="Add Recipe" detail="Save a family favorite" />
                  <QuickAction href={`/app/books/${bookId}/ideas`} icon={<Sparkles size={19} />} label="Ask AI" detail="Generate from your pantry" />
                  <QuickAction href={`/app/books/${bookId}/meal-plan`} icon={<CalendarDays size={19} />} label="Plan Week" detail="Fill the next few dinners" />
                  <QuickAction href={`/app/books/${bookId}/groceries`} icon={<ShoppingCart size={19} />} label="Groceries" detail="Review the shopping list" />
                </div>
              </PageSection>

              <PageSection>
                <SectionHeader eyebrow="Pantry snapshot" title="Cook from these" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {PANTRY_ITEMS.map((item) => (
                    <span key={item} className="rounded-sm bg-green-pale px-3 py-1 text-sm font-semibold text-green-deep">
                      {item}
                    </span>
                  ))}
                </div>
                <Link href={`/app/books/${bookId}/ideas`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-green-deep hover:underline">
                  Cook from what you have <ChevronRight size={15} />
                </Link>
              </PageSection>

              <PageSection>
                <SectionHeader eyebrow="Weekly snapshot" title="The week ahead" />
                <p className="mt-2 text-2xl font-bold text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
                  3 meals planned · 2 open days
                </p>
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((item, index) => (
                    <Link
                      key={`${item.day}-${index}`}
                      href={`/app/books/${bookId}/meal-plan`}
                      className={`flex aspect-square items-center justify-center rounded-sm text-xs font-bold ${
                        item.planned
                          ? "bg-green-deep text-ink-inverse"
                          : "border border-dashed border-line text-ink-soft"
                      }`}
                    >
                      {item.day}
                    </Link>
                  ))}
                </div>
              </PageSection>

              <DashboardCard className="overflow-hidden">
                <div className="p-5">
                  <SectionEyebrow>Inspiration</SectionEyebrow>
                  <h2
                    className="mt-2 text-2xl font-bold leading-tight text-green-deep"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Make Sunday feel special
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Ask for a slow, generous dinner that still leaves room for leftovers.
                  </p>
                  <Link href={`/app/books/${bookId}/ideas`}>
                    <Button variant="secondary" size="sm" className="mt-4 rounded-md">
                      <Lightbulb size={15} />
                      Get inspired
                    </Button>
                  </Link>
                </div>
                <div className="h-2 bg-gradient-to-r from-accent-honey via-accent-terracotta to-green-sage" />
              </DashboardCard>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function BookOpenFallback() {
  return <Refrigerator size={28} strokeWidth={1.3} className="text-green-sage" />;
}
