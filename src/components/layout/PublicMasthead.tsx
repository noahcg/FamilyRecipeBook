import Image from "next/image";
import { PublicHeader } from "@/components/layout/PublicHeader";

export function PublicMasthead({
  eyebrow,
  title,
  description,
  background,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  background: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative z-30 isolate overflow-hidden bg-cream">
      <Image src={background} alt="" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(247,243,233,.02)_0%,rgba(247,243,233,.06)_72%,var(--color-cream)_100%)]" />
      <PublicHeader />
      <section className="mx-auto flex min-h-[34rem] max-w-[1840px] flex-col items-center justify-center px-5 pb-24 pt-12 text-center sm:min-h-[42rem] sm:px-8 sm:pb-32 lg:min-h-[47rem] lg:px-12 lg:pb-36">
        <div className="flex items-center justify-center gap-5">
          <span className="h-px w-12 bg-green-sage/70 sm:w-16" />
          <p className="text-xs font-extrabold uppercase tracking-[0.38em] text-green-deep sm:text-sm">{eyebrow}</p>
          <span className="h-px w-12 bg-green-sage/70 sm:w-16" />
        </div>
        <h1 className="mt-6 max-w-[1100px] text-[clamp(2.75rem,5.4vw,5.5rem)] font-bold leading-[.98] tracking-[-.025em] text-green-forest-dark" style={{ fontFamily: "var(--font-playfair)" }}>{title}</h1>
        <p className="mx-auto mt-6 max-w-[1200px] text-balance text-[clamp(1.25rem,2.4vw,2.4rem)] font-semibold italic leading-[1.32] text-accent-terracotta" style={{ fontFamily: "var(--font-playfair)" }}>{description}</p>
        {children && <div className="mt-8">{children}</div>}
      </section>
    </div>
  );
}
