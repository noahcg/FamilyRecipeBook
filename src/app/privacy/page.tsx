import type { Metadata } from "next";
import { BrandName, LegalPage, LegalSection } from "@/components/layout/LegalPage";
import { privacyEmail, privacyMailto } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Home Cooked collects, uses, and protects your data.",
};

const privacySections = [
  {
    title: "Information We Collect",
    body: (
      <>
        <p>
          We collect account details such as your name, email address, sign-in
          activity, and profile preferences. We also collect the recipes,
          cookbook names, photos, notes, family stories, ratings, favorites, meal
          plans, grocery items, invitations, and settings that you add to{" "}
          <BrandName />.
        </p>
        <p>
          Some features collect information only when you use them. Recipe idea
          prompts, recipe photos for import, optional AI provider settings, image
          search terms, and nearby grocery-store searches are processed so those
          features can work. Location is used only when you ask to find nearby
          stores or type a location for that search.
        </p>
      </>
    ),
  },
  {
    title: "How Information Is Used",
    body: (
      <p>
        We use your information to operate the app, keep you signed in, sync your
        cookbooks, send invitation and account emails, power recipe imports and
        AI idea features, build grocery and meal-planning views, improve
        reliability, prevent abuse, and comply with legal obligations. We do not
        sell your personal information.
      </p>
    ),
  },
  {
    title: "How Information Is Shared",
    body: (
      <>
        <p>
          Your cookbook content is shared with the people who have access to that
          cookbook. Outside your invited members, we share information with
          service providers that help run the app, such as authentication,
          database, storage, email, hosting, AI, image search, and location-search
          providers. They receive the information needed to perform their
          services.
        </p>
        <p>
          We may also disclose information if required by law, to protect the
          service, or to respond to security, fraud, or safety issues.
        </p>
      </>
    ),
  },
  {
    title: "Cookies, Analytics, and Local Storage",
    body: (
      <p>
        <BrandName /> uses necessary cookies and local storage to keep you signed
        in, remember app state, support offline recipes, and make core features
        work. Hosting and infrastructure providers may create standard server
        logs for security and reliability. We do not use advertising tracking
        cookies.
      </p>
    ),
  },
  {
    title: "Uploaded Content",
    body: (
      <p>
        Recipe photos, cookbook covers, imported files, and other uploaded
        content are stored so the app can display and process them. Avoid
        uploading images or documents that include private details you do not
        want visible to cookbook members. Some stored files may be accessible to
        anyone who has the direct file link.
      </p>
    ),
  },
  {
    title: "Data Retention",
    body: (
      <p>
        We keep account and cookbook information while your account is active or
        as needed to provide the service. You can delete recipes, cookbooks, and
        some settings in the app. Some records may remain for a limited time in
        backups, logs, security records, or where retention is needed for legal
        or operational reasons.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        We use reasonable technical and organizational measures to protect your
        information, including authentication, access controls, and provider
        security features. No online service can promise perfect security, so use
        care with invitations, shared devices, and the email account you use to
        sign in.
      </p>
    ),
  },
  {
    title: "Children's Privacy",
    body: (
      <p>
        <BrandName /> is intended for adults and household organizers, not for
        children creating accounts on their own. If you believe a child provided
        personal information without appropriate permission, contact us through
        the support channel in the app so we can review and delete it if needed.
      </p>
    ),
  },
  {
    title: "Changes and Contact",
    body: (
      <p>
        We may update this Privacy Policy as the app, providers, or legal
        requirements change. We will update the date above when we do. Questions
        or privacy requests can be sent to{" "}
        <a href={privacyMailto}>{privacyEmail}</a>. This plain-English page is
        practical product information and should not be treated as
        attorney-drafted legal advice.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy" lastUpdated="August 25, 2026">
      <p>
        This Privacy Policy explains what <BrandName /> collects, how that
        information is used, and when it is shared. The app is designed for
        private household recipe books, so recipes, photos, family notes, and
        invitations are treated as personal content.
      </p>

      {privacySections.map((section) => (
        <LegalSection key={section.title} title={section.title} body={section.body} />
      ))}
    </LegalPage>
  );
}
