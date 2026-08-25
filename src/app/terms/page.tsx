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
      </>
    ),
  },
  {
    title: "Payments, If Applicable",
    body: (
      <p>
        <BrandName /> may offer paid plans, trials, or optional paid features in
        the future. If payments are added, the price, renewal terms, cancellation
        process, and refund rules will be shown before you buy. Until then, no
        payment terms apply unless they are presented in the product or in a
        separate written agreement.
      </p>
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
          <a href={supportMailto}>{supportEmail}</a>. This plain-English page is
          for practical product use and should not be treated as attorney-drafted
          legal advice.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" lastUpdated="August 25, 2026">
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
