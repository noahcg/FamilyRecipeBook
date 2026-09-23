"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/ui/BrandLockup";

const links = [
  { href: "/our-story", label: "Our Story" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-8">
      <div className="flex w-full items-center justify-between gap-3">
        <Link href="/" aria-label="Home Cooked home" className="shrink-0">
          <BrandLockup className="brand-lockup--homepage" />
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-white/55 bg-paper-soft/78 p-1.5 shadow-[0_8px_24px_rgba(75,53,31,0.1)] backdrop-blur-sm sm:gap-3 sm:p-2 lg:gap-5">
          <nav aria-label="Public navigation" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold transition sm:px-4 ${
                isActive(link.href)
                  ? "text-green-deep underline decoration-accent-terracotta decoration-2 underline-offset-4"
                  : "text-green-deep hover:bg-green-pale hover:text-green-forest-dark"
              }`}
            >
              {link.label}
            </Link>
          ))}
          </nav>

          <Link
            href="/sign-in"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-green-forest-dark px-4 text-sm font-extrabold text-ink-inverse shadow-[var(--shadow-xs)] transition hover:bg-green-deep active:translate-y-px sm:px-5"
          >
            Sign In
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-line text-green-deep transition hover:border-green-deep hover:bg-green-pale lg:hidden"
          >
            {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="public-mobile-menu" className="absolute inset-x-4 top-[calc(100%-0.25rem)] rounded-2xl border border-line-soft bg-paper-soft p-3 shadow-[var(--shadow-lg)] sm:inset-x-8 lg:hidden">
          <nav aria-label="Mobile public navigation" className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-xl px-4 py-3 text-base font-extrabold transition ${
                  isActive(link.href) ? "bg-green-pale text-green-deep" : "text-ink-muted hover:bg-green-pale hover:text-green-deep"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
