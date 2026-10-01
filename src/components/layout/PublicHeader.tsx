"use client";

import Link from "next/link";
import { BookOpen, CircleDollarSign, Heart, Home, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/ui/BrandLockup";

const links = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/our-story", label: "Our Story", icon: Heart },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/pricing", label: "Pricing", icon: CircleDollarSign },
];

export function PublicHeader() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1360px] items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-8">
      <div className="flex w-full items-center justify-between gap-3">
        <Link href="/" aria-label="Home Cooked home" className="shrink-0">
          <BrandLockup className="brand-lockup--homepage" />
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-white/55 bg-paper-soft/78 p-1.5 shadow-[0_8px_24px_rgba(75,53,31,0.1)] backdrop-blur-sm lg:flex lg:gap-5 lg:p-2">
          <nav aria-label="Public navigation" className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href, link.exact) ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-bold transition sm:px-4 ${
                isActive(link.href, link.exact)
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
        </div>
      </div>

      <nav aria-label="Mobile public navigation" className="fixed inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 px-2 sm:px-4 lg:hidden">
        <div className="mx-auto flex h-[62px] w-max max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-[30px] border border-green-deep bg-green-forest-dark p-1.5 shadow-[0_10px_28px_rgba(31,58,45,0.24),inset_0_1px_0_rgba(255,252,246,0.10)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-1.5 transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none ${
                  active
                    ? "min-w-[88px] bg-white-soft text-green-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_4px_12px_rgba(14,35,25,0.20)]"
                    : "min-w-[60px] text-ink-inverse hover:bg-green-deep hover:text-ink-inverse"
                }`}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.2 : 1.75} />
                <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/sign-in"
            aria-label="Sign in"
            className="relative flex h-full min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[24px] px-1.5 text-ink-inverse transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-none hover:bg-green-deep hover:text-ink-inverse"
          >
            <LogIn aria-hidden="true" size={19} strokeWidth={1.75} />
            <span className="max-w-[84px] truncate text-[10px] font-bold leading-none">Sign In</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
