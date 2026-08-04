import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Home Cooked.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="TODO — set on publish">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
        of Home Cooked, operated by <strong>[TODO: legal entity name]</strong>{" "}
        (&ldquo;Home Cooked,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By
        creating an account or using the service you agree to these Terms and to
        our Privacy Policy.
      </p>
      <p>
        <em>
          This copy is a working draft prepared for legal review. It is not yet
          the final, binding agreement.
        </em>
      </p>

      <LegalSection heading="1. Acceptance of terms">
        <p>
          By accessing or using Home Cooked you agree to these Terms and to our
          Privacy Policy. If you do not agree, do not use the service. You must be
          at least <strong>[TODO: minimum age, e.g. 13]</strong> years old, and old
          enough to form a binding contract in your jurisdiction, to create an
          account. If you use Home Cooked on behalf of a household or family, you
          confirm you are authorized to do so.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You are responsible for keeping your login credentials secure and for
          all activity that happens under your account. Please notify us promptly
          of any unauthorized use. You may stop using Home Cooked at any time and
          may delete individual recipes and cookbooks from within the app. To
          close your account entirely, contact us at{" "}
          <strong>TODO: support@your-domain</strong>. We may suspend or terminate
          accounts that violate these Terms or that create risk for other users.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content and the license you grant us">
        <p>
          You retain ownership of the recipes, photos, stories, notes, and other
          content you add to Home Cooked (&ldquo;Your Content&rdquo;). You grant us
          a limited, non-exclusive license to host, store, reproduce, and display
          Your Content solely to operate the service — including sharing it with
          the family members you invite to your cookbooks. This license ends when
          you delete Your Content or close your account, except for content
          already shared with others and for reasonable backup retention.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use & copyright (DMCA)">
        <p>
          You agree not to upload content you do not have the right to share, and
          not to use Home Cooked to infringe others&rsquo; rights, break the law,
          or harm the service or its users. Recipe ingredient lists and basic
          steps are generally not protected by copyright, but headnotes,
          photographs, and other creative expression may be — only upload such
          material if you own it or have permission.
        </p>
        <p>
          If you believe content on Home Cooked infringes your copyright, send a
          takedown notice to our designated agent at{" "}
          <strong>TODO: copyright@your-domain</strong> including: identification of
          the copyrighted work, identification of the allegedly infringing
          material and its location, your contact information, a statement of good-
          faith belief that the use is unauthorized, a statement under penalty of
          perjury that your notice is accurate and that you are authorized to act,
          and your physical or electronic signature. We respond to valid notices,
          provide a counter-notice process, and terminate repeat infringers.
        </p>
      </LegalSection>

      <LegalSection heading="5. Disclaimers">
        <p>
          Home Cooked is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind, whether express or
          implied, to the fullest extent permitted by law. Recipes and any
          AI-generated suggestions are provided for general use only and are{" "}
          <strong>
            not dietary, nutritional, allergy, or food-safety advice
          </strong>
          . Always use your own judgment and consult a qualified professional
          where appropriate, and check ingredients for allergens and safe
          preparation.
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Home Cooked and its operators
          will not be liable for any indirect, incidental, special, consequential,
          or punitive damages, or for any loss of data, arising out of or relating
          to your use of the service. <strong>[TODO: confirm cap on liability and
          governing-law / jurisdiction language with counsel.]</strong>
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes to these terms">
        <p>
          We may update these Terms from time to time. When we make material
          changes we will update the &ldquo;Last updated&rdquo; date above and,
          where appropriate, notify you. Your continued use of Home Cooked after an
          update means you accept the revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about these Terms? Contact us at{" "}
          <strong>TODO: support@your-domain</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
