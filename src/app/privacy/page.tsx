import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Home Cooked collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="TODO — set on publish">
      <p>
        This Privacy Policy explains what information Home Cooked collects, how we
        use it, and the choices you have. <em>[Placeholder — replace with reviewed
        copy.]</em>
      </p>

      <LegalSection heading="1. Information we collect">
        <p>
          TODO: List the data you collect — account details (name, email),
          recipes and photos you upload, family/cookbook membership and
          invitations, meal plans and grocery lists, and usage/device data.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <p>
          TODO: Explain uses — operating the service, syncing across devices,
          sending invitation and account emails, improving the product, and
          keeping accounts secure.
        </p>
      </LegalSection>

      <LegalSection heading="3. Third-party services">
        <p>
          TODO: Disclose the processors you rely on and what they handle, e.g.
          Supabase (authentication, database, and photo storage), Resend
          (invitation and account email), your hosting/analytics provider, and
          the AI provider used for recipe idea suggestions. Link their policies.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data sharing">
        <p>
          TODO: Clarify that content is shared only with the family/cookbook
          members you invite, and that Home Cooked does not sell personal data.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>TODO: Describe how long data is kept and what happens when you delete content or close your account.</p>
      </LegalSection>

      <LegalSection heading="6. Your rights and choices">
        <p>
          TODO: Cover access, correction, export, and deletion rights, plus any
          region-specific rights (e.g. GDPR/CCPA) and how to exercise them.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children's privacy">
        <p>TODO: State the minimum age and how you handle data of minors.</p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about your privacy? Contact us at{" "}
          <strong>TODO: privacy@your-domain</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
