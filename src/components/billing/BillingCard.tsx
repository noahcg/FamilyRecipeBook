import { BillingButton } from "@/components/billing/BillingButton";
import { PlusPlanDialog } from "@/components/billing/PlusPlanDialog";
import type { BillingStatus } from "@/lib/entitlements";

export function BillingCard({ billing }: { billing: BillingStatus }) {
  const isPlus = billing.plan === "plus";
  return <section className="scroll-mt-6 border-b border-line-soft pb-8">
    <div className="mb-4 flex items-baseline gap-4"><h2 className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Plan &amp; billing</h2><span className="h-px flex-1 bg-line-soft" /></div>
    <div className="recipe-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:flex-1"><p className="font-bold text-green-deep">{isPlus ? "Home Cooked Plus" : "Home Cooked Free"}</p><p className="mt-1 text-sm text-ink-muted">{billing.tier === "grandfathered" ? "Lifetime Plus access granted by Home Cooked." : isPlus ? billing.cancel_at_period_end
        ? `Renewal canceled. Plus access through ${billing.current_period_end ? new Date(billing.current_period_end).toLocaleDateString() : "the current paid period"}.`
        : `Renews annually${billing.current_period_end ? ` on ${new Date(billing.current_period_end).toLocaleDateString()}` : ""}.`
        : billing.refunded_at ? "Your Plus payment was refunded and Plus access has ended. Your saved content remains in your account." : "One cookbook, 50 saved recipes, sharing with up to 3 Family members, and 5 AI ideas per month."}</p>{!isPlus && <PlusPlanDialog />}</div>
      {billing.tier === "grandfathered" ? null : isPlus ? <BillingButton mode="portal" className="whitespace-nowrap">Manage Billing</BillingButton> : <BillingButton className="whitespace-nowrap">Upgrade to Plus</BillingButton>}
    </div>
  </section>;
}
