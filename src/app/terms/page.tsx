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
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of Home Cooked. By creating an account or using the service you
        agree to these Terms. <em>[Placeholder — replace with reviewed copy.]</em>
      </p>

      <LegalSection heading="1. Acceptance of terms">
        <p>
          TODO: State that using Home Cooked constitutes acceptance of these
          Terms and the Privacy Policy, who may use the service, and age
          requirements.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          TODO: Cover account registration, keeping credentials secure,
          responsibility for activity under the account, and termination.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content and the license you grant us">
        <p>
          TODO: Clarify that you retain ownership of the recipes, photos, notes,
          and other content you add, and that you grant Home Cooked the limited
          license needed to store, display, and share that content with the
          people you invite.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use & copyright (DMCA)">
        <p>
          TODO: Prohibit uploading content you do not have the right to share.
          Recipe ingredient lists and steps are generally not copyrightable, but
          headnotes, photographs, and other creative expression may be. If you
          believe content on Home Cooked infringes your copyright, send a
          takedown notice to our designated agent at{" "}
          <strong>TODO: copyright@your-domain</strong> including the required DMCA
          details. Describe repeat-infringer handling and counter-notice process.
        </p>
      </LegalSection>

      <LegalSection heading="5. Disclaimers">
        <p>
          TODO: Provide the service &ldquo;as is,&rdquo; disclaim warranties, and
          note that recipes and any AI-generated suggestions are provided for
          general use and are not dietary, allergy, or food-safety advice.
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitation of liability">
        <p>TODO: Standard limitation-of-liability language, reviewed by counsel.</p>
      </LegalSection>

      <LegalSection heading="7. Changes to these terms">
        <p>
          TODO: Explain how updates are communicated and that continued use
          constitutes acceptance of revised Terms.
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
