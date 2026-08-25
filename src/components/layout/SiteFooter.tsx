import Link from "next/link";
import { appVersion } from "@/lib/version";
import { supportMailto } from "@/lib/support";

/**
 * Site-wide footer for public/marketing surfaces (landing page + legal pages).
 * Intentionally NOT rendered inside the authenticated app, which has its own
 * chrome and mobile bottom nav.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col items-center gap-3 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:justify-between sm:px-8 lg:px-12">
        <p className="text-center sm:text-left">
          &copy; {year}{" "}
          <span className="font-semibold text-green-deep">Home Cooked</span>.
          Made with love. <span className="whitespace-nowrap">v{appVersion}</span>
        </p>
        <nav className="flex items-center gap-5">
          <a href={supportMailto} className="transition hover:text-green-deep">
            Contact
          </a>
          <Link href="/terms" className="transition hover:text-green-deep">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-green-deep">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
