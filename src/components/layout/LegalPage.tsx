import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared layout for the public legal pages (Terms, Privacy). Provides the paper
 * background, brand header, a visible DRAFT banner, a readable prose column, and
 * the site footer. Content passed in is placeholder scaffold pending legal review.
 */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="app-paper-bg paper-texture flex min-h-screen flex-col text-ink">
      <header className="relative z-10 mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-8">
        <Link href="/" aria-label="Home Cooked home" className="block w-[12rem] sm:w-[14rem]">
          <BrandLockup />
        </Link>
        <Link
          href="/"
          className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm font-extrabold text-green-deep shadow-xs transition hover:bg-white-soft"
        >
          Back
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[46rem] flex-1 px-4 pb-16 pt-4 sm:px-8 lg:px-12">
        <h1
          className="text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: {lastUpdated}</p>

        <div
          role="note"
          className="mt-6 flex items-start gap-3 rounded-lg border border-accent-cinnamon/40 bg-[#f5df9e]/30 px-4 py-3 text-sm text-ink"
        >
          <AlertTriangle
            aria-hidden="true"
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-accent-cinnamon"
          />
          <p>
            <strong>Draft — pending legal review.</strong> This is placeholder
            text and is not the final, binding {title.toLowerCase()}. Replace it
            with reviewed legal copy before launch.
          </p>
        </div>

        <div className="legal-prose mt-8 space-y-8 text-[1.02rem] leading-relaxed text-ink-muted">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** A single titled section within a legal page. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-xl font-bold text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}
