import { clsx } from "clsx";

interface BrandLockupProps {
  className?: string;
  compact?: boolean;
}

export function BrandLockup({ className, compact = false }: BrandLockupProps) {
  return (
    <span className={clsx("brand-lockup", compact && "brand-lockup--compact", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/homecooked.svg" alt="Home Cooked Recipe Platform" className="brand-lockup__image" />
    </span>
  );
}
