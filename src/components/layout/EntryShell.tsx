import Link from "next/link";
import { BookOpen, Heart, UsersRound } from "lucide-react";
import { clsx } from "clsx";
import { BrandLockup } from "@/components/ui/BrandLockup";

interface EntryShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  framed?: boolean;
  sideTitle?: string;
  sideDescription?: string;
  sideNote?: string;
  sideImageSrc?: string;
  sideImageAlt?: string;
  sideImagePosition?: string;
}

const maxWidthClass = {
  sm: "max-w-[900px]",
  md: "max-w-[1040px]",
  lg: "max-w-[1180px]",
  xl: "max-w-[1320px]",
};

export function EntryShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  backHref,
  backLabel = "Back",
  maxWidth = "md",
  framed = true,
  sideTitle = "Recipes, stories, and family notes in one place.",
  sideDescription = "Home Cooked keeps the meals worth remembering close to the people who made them matter.",
  sideNote = "Sunday dinner, Grandma's apple pie, and the recipes everyone asks for.",
  sideImageSrc = "/images/entry/sign-in.jpg",
  sideImageAlt = "Open recipe notebook on a kitchen counter",
  sideImagePosition = "center",
}: EntryShellProps) {
  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className={clsx("relative z-10 mx-auto w-full", maxWidthClass[maxWidth])}>
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Home Cooked home" className="block w-[12rem] sm:w-[14rem]">
            <BrandLockup />
          </Link>
          {backHref && (
            <Link
              href={backHref}
              className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm font-extrabold text-green-deep shadow-xs transition hover:bg-white-soft"
            >
              {backLabel}
            </Link>
          )}
        </header>

        <main className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.72fr)] lg:items-start">
          <section>
            <div className="mb-6">
              {eyebrow && (
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-accent-cinnamon">
                  {eyebrow}
                </p>
              )}
              <h1
                className="mt-2 text-[2.35rem] font-bold leading-[1.02] text-green-deep sm:text-5xl"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                  {description}
                </p>
              )}
            </div>

            <div className={framed ? "recipe-card p-5 sm:p-6" : undefined}>
              {children}
            </div>
            {footer}
          </section>

          <aside className="hidden lg:block">
            <div className="recipe-card relative overflow-hidden p-7">
              <div className="relative overflow-visible pb-8">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-paper-warm shadow-[0_18px_45px_rgba(57,45,25,0.10)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sideImageSrc}
                    alt={sideImageAlt}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: sideImagePosition }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,250,240,0.04),rgba(36,79,59,0.10))]"
                  />
                </div>
                <div className="absolute -bottom-1 right-5 rotate-[4deg] rounded-lg border border-line bg-paper px-4 py-3 shadow-[0_12px_28px_rgba(57,45,25,0.10)]">
                  <p
                    className="max-w-[190px] text-xl leading-tight text-accent-cinnamon"
                    style={{ fontFamily: "var(--font-caveat)" }}
                  >
                    {sideNote}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-line-soft pt-6">
                <p
                  className="max-w-sm text-2xl font-bold leading-tight text-green-deep"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {sideTitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {sideDescription}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  [BookOpen, "Recipes"],
                  [Heart, "Memories"],
                  [UsersRound, "Family"],
                ].map(([Icon, label]) => (
                  <div key={label as string} className="rounded-md border border-line-soft bg-white-soft/65 p-3">
                    <Icon
                      aria-hidden="true"
                      className="mx-auto text-green-deep"
                      size={18}
                      strokeWidth={1.7}
                    />
                    <p className="mt-1 text-xs font-extrabold text-ink-muted">{label as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
