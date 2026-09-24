import Link from "next/link";
import { BillingButton } from "@/components/billing/BillingButton";
import type { BillingStatus } from "@/lib/entitlements";

export function BillingCard({ billing }: { billing: BillingStatus }) {
  const isPlus = billing.plan === "plus";
  return <section className="scroll-mt-6 border-b border-line-soft pb-8">
    <div className="mb-4 flex items-baseline gap-4"><h2 className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Plan &amp; billing</h2><span className="h-px flex-1 bg-line-soft" /></div>
    <div className="recipe-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-bold text-green-deep">{isPlus ? "Home Cooked Plus" : "Home Cooked Free"}</p><p className="mt-1 text-sm text-ink-muted">{isPlus ? `Status: ${billing.status}${billing.current_period_end ? ` · renews ${new Date(billing.current_period_end).toLocaleDateString()}` : ""}${billing.cancel_at_period_end ? " · cancellation scheduled" : ""}` : "One cookbook, 50 saved recipes, and 5 AI ideas per month."}</p>{!isPlus && <Link href="/pricing" className="mt-2 inline-block text-sm font-bold text-accent-cinnamon hover:underline">See what Plus includes</Link>}</div>
      {isPlus ? <BillingButton mode="portal">Manage Billing</BillingButton> : <BillingButton>Upgrade to Plus</BillingButton>}
    </div>
  </section>;
}
