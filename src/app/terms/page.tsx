import type { Metadata } from "next";
import { BrandName, LegalPage, LegalSection } from "@/components/layout/LegalPage";
import { supportEmail, supportMailto } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Home Cooked.",
};

const termsSections = [
  {
    title: "Use of the Service",
    body: (
      <>
        <p>
          <BrandName /> helps households collect recipes, preserve family stories,
          plan meals, build grocery lists, and invite trusted people into shared
          cookbooks. Please use the service only for lawful personal or household
          purposes, and do not interfere with the app, other accounts, or the
          security of the service.
        </p>
        <p>
          Recipe ideas, imported recipe text, nearby-store suggestions, and other
          automated features are offered for convenience. They are not dietary,
          allergy, nutrition, medical, or food-safety advice. Always review
          ingredients, preparation steps, temperatures, and allergens before
          cooking or sharing a recipe.
        </p>
      </>
    ),
  },
  {
    title: "Account Access",
    body: (
      <p>
        You are responsible for the activity that happens through your account
        and for keeping access to your email secure. If you invite someone to a
        cookbook, make sure you intend for them to see the recipes, photos, notes,
        meal plans, and other content available in that cookbook.
      </p>
    ),
  },
  {
    title: "User Content",
    body: (
      <>
        <p>
          You keep ownership of the recipes, photos, notes, stories, ratings,
          grocery items, and other content you add. You give <BrandName /> the
          limited permission needed to host, store, display, process, back up, and
          share that content according to your cookbook settings and invitations.
        </p>
        <p>
          Only upload or import content that you have the right to use. Recipe
          facts and ingredient lists may be simple, but photos, headnotes, scans,
          source articles, and family stories can belong to someone else. You are
          responsible for the content you add and for respecting others&apos;
          rights and privacy.
        </p>
        <p>
          Content contributed to a shared cookbook becomes part of that cookbook.
          If your account is deleted, recipes and stories you contributed to a
          cookbook that remains may stay with the cookbook. We may remove the
          active account link while retaining a historical display name so members
          can understand the contribution&apos;s context.
        </p>
      </>
    ),
  },
  {
    title: "Account Suspension and Deletion",
    body: (
      <>
        <p>
          We may suspend an account to protect the service, its members, or their
          content. Suspension restricts access but does not by itself change
          cookbook ownership or delete content.
        </p>
        <p>
          Deleting an account removes personal account data and private content.
          A shared cookbook with other members must be transferred to a remaining
          member before its owner can be deleted; it is not removed merely because
          its owner leaves. For administrator-initiated deletion, we may send a
          compact archive of the cookbook content that will be removed to the
          account email before deletion proceeds. Email delivery and attachment
          size limits can prevent deletion from continuing.
        </p>
      </>
    ),
  },
  {
    title: "Reporting and Content Safety",
    body: (
      <>
        <p>
          You can report content you believe is inappropriate, harassing, invasive
          of privacy, infringing, or spam. Reports are handled privately; the
          reported person is not told who submitted a report.
        </p>
        <p>
          We may hide content while reviewing a report, remove only the affected
          content, restrict uploads, remove a member from a shared cookbook, or
          restrict account access for repeated or serious misuse. Where appropriate,
          we may provide a way to request review of a reversible decision.
        </p>
      </>
    ),
  },
  {
    title: "Paid Plans and Billing",
    body: (
      <>
        <p>
          <BrandName /> offers a free plan and an optional Plus subscription. Plus
          is currently offered at <strong>$24.99 per year</strong>, with the
          features and limits shown on the pricing page before you subscribe.
          Prices may change for future renewals, and any change will be shown or
          communicated as required by law.
        </p>
        <p>
          Plus subscriptions renew annually unless you cancel before the next
          renewal. Checkout and payment processing are handled by Stripe. You
          can update payment details, view invoices, or cancel through the
          Billing Portal available in your account settings. Cancellation stops
          the next renewal; it does not delete your recipes, cookbooks, or other
          saved content. Unless a refund is issued, access to Plus features
          continues through the current paid subscription period and will then
          follow the Free plan limits.
        </p>
        <p>
          Refunds are described below. Any additional credit, tax, or
          consumer-cancellation rights are governed by applicable law. For billing help,
          contact support promptly with the email address on your account.
        </p>
      </>
    ),
  },
  {
    title: "Refunds",
    body: (
      <>
        <p>
          We want you to be happy with <BrandName />. If you purchase Home Cooked
          Plus and decide it isn&apos;t right for you, contact us at{" "}
          <a href={supportMailto}>{supportEmail}</a> within 30 days of your
          initial purchase for a full refund.
        </p>
        <p>
          After 30 days, subscription payments are generally non-refundable.
          We may issue refunds at our discretion in cases such as duplicate
          charges, billing errors, or other exceptional circumstances.
        </p>
        <p>
          Canceling your subscription prevents future renewal charges. Unless a
          refund is issued, you&apos;ll continue to have access to Plus features
          through the end of your current paid subscription period.
        </p>
        <p>
          This policy does not limit any cancellation or refund rights you have
          under applicable law.
        </p>
      </>
    ),
  },
  {
    title: "Availability and Changes",
    body: (
      <p>
        We work to keep <BrandName /> useful and reliable, but the service may be
        unavailable at times for maintenance, provider outages, security work, or
        product changes. We may add, remove, or change features as the app
        evolves, including AI, import, storage, and sharing features.
      </p>
    ),
  },
  {
    title: "Limitation of Liability",
    body: (
      <p>
        To the fullest extent allowed by law, <BrandName /> and its operators are
        not liable for indirect, incidental, special, consequential, or punitive
        damages, or for lost data, lost profits, recipe mistakes, food-preparation
        issues, or third-party service problems related to your use of the app.
        Some places do not allow certain limits, so parts of this section may not
        apply to you.
      </p>
    ),
  },
  {
    title: "Changes and Contact",
    body: (
      <>
        <p>
          We may update these Terms as the service changes. When we make material
          updates, we will revise the date above and provide notice when it is
          practical. Continuing to use <BrandName /> after an update means you
          accept the revised Terms.
        </p>
        <p>
          Questions about these Terms can be sent to{" "}
          <a href={supportMailto}>{supportEmail}</a>.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" lastUpdated="October 5, 2026">
      <p>
        These Terms explain the basic rules for using <BrandName />. By creating
        an account or using the service, you agree to these Terms and to our
        Privacy Policy.
      </p>

      {termsSections.map((section) => (
        <LegalSection key={section.title} title={section.title} body={section.body} />
      ))}
    </LegalPage>
  );
}
