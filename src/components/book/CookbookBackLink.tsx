import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface CookbookBackLinkProps {
  bookId: string;
  label?: string;
  href?: string;
  className?: string;
}

export function CookbookBackLink({
  bookId,
  label = "Cookbook contents",
  href,
  className = "",
}: CookbookBackLinkProps) {
  return (
    <Link
      href={href ?? `/app/books/${bookId}/recipes`}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-bold text-green-deep transition-colors hover:text-green-forest ${className}`}
    >
      <ArrowLeft size={15} strokeWidth={2} />
      {label}
    </Link>
  );
}
