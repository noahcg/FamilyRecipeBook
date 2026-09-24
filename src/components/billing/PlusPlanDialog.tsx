"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BillingButton } from "@/components/billing/BillingButton";
import { Dialog } from "@/components/ui";

const plusFeatures = [
  "Create unlimited cookbooks and save unlimited recipes",
  "Share entire cookbooks with family and friends",
  "Import recipes from websites, PDFs, Paprika, and more",
  "Paste a recipe and let Home Cooked organize it for you",
  "Plan meals and build your grocery list",
  "Get more AI-inspired recipe ideas",
  "Share recipes as polished PDFs",
];

export function PlusPlanDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-2 text-sm font-bold text-accent-cinnamon hover:underline"
      >
        See what Plus includes
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Home Cooked Plus" className="max-h-[90vh] overflow-y-auto">
        <p className="text-sm leading-relaxed text-ink-muted">
          Everything you love about Home Cooked, with more ways to save, share, and plan.
        </p>
        <div className="mt-4 flex items-baseline gap-2 border-b border-line-soft pb-4">
          <span className="text-4xl font-bold leading-none text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>
            $14.99
          </span>
          <span className="text-sm text-ink-muted">/ year</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {plusFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted">
              <Check aria-hidden="true" className="mt-1 shrink-0 text-accent-terracotta" size={16} strokeWidth={3} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <BillingButton className="w-full !rounded-full">Get Plus for $14.99 / Year</BillingButton>
          <p className="mt-2 text-center text-xs text-ink-soft">You’ll confirm payment through Stripe Checkout.</p>
        </div>
      </Dialog>
    </>
  );
}
