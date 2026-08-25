import Link from "next/link";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function BrandName() {
  return <span className="whitespace-nowrap font-semibold text-green-deep">Home Cooked</span>;
}

export function LegalPage({ eyebrow, title, lastUpdated, children }: LegalPageProps) {
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
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-accent-cinnamon">
          {eyebrow}
        </p>
        <h1
          className="text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] text-green-deep"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: {lastUpdated}</p>

        <div className="legal-prose recipe-card mt-8 space-y-8 p-5 text-[1.02rem] leading-relaxed text-ink-muted sm:p-7">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-xl font-bold text-green-deep"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {title}
      </h2>
      <div className="space-y-3">{body}</div>
    </section>
  );
}
