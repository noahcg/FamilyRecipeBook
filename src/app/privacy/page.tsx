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
        Home Cooked is a private space for families to keep and share their
        recipes. This Privacy Policy explains what information we collect, how we
        use it, who we share it with, and the choices you have. It applies to the
        Home Cooked website and app operated by{" "}
        <strong>[TODO: legal entity name]</strong> (&ldquo;Home Cooked,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;).
      </p>
      <p>
        <em>
          This copy is a working draft prepared for legal review. It is not yet
          the final, binding policy.
        </em>
      </p>

      <LegalSection heading="1. Information we collect">
        <p>We collect the following categories of information.</p>
        <p>
          <strong>Account details.</strong> When you create an account we collect
          your name, email address, and a password (which is stored in a hashed
          form we cannot read).
        </p>
        <p>
          <strong>Content you add.</strong> The recipes, photos, cookbooks,
          chapters, ingredient lists, cooking steps, source attributions
          (&ldquo;who is this from?&rdquo;), stories, notes and memories, ratings,
          favorites, meal-plan entries, and grocery-list items that you create or
          upload. Recipe photos and cookbook covers are stored as files.
        </p>
        <p>
          <strong>Family and sharing information.</strong> When you invite someone
          to a cookbook we collect the email address you provide for them and the
          role you assign, and we record who has joined which cookbooks.
        </p>
        <p>
          <strong>Recipe-idea prompts.</strong> When you use the AI recipe-idea
          feature, we process the text you enter (for example, what is in your
          pantry, timing, dietary needs, or who you are cooking for). When you
          import a recipe from a photo, we process that photo to read the recipe.
        </p>
        <p>
          <strong>Settings.</strong> Your preferences, and — if you choose to
          connect your own AI provider — the provider you select and the API key
          you enter.
        </p>
        <p>
          <strong>Location, only when you ask for it.</strong> If you use the
          &ldquo;find grocery stores near me&rdquo; feature, we use your device
          location or a location you type in to search for nearby stores. We do
          not track your location in the background.
        </p>
        <p>
          <strong>Information collected automatically.</strong> To keep you signed
          in we use strictly necessary authentication cookies. Our hosting and
          infrastructure providers generate standard server logs (such as IP
          address and request metadata) for security and reliability. We do{" "}
          <strong>not</strong> use advertising or analytics tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <p>We use the information above to:</p>
        <ul>
          <li>operate Home Cooked and sync your cookbooks across your devices;</li>
          <li>
            let you share cookbooks with the family members you invite, and send
            the related invitation, confirmation, and account emails;
          </li>
          <li>
            generate recipe ideas, read recipes you import from photos, suggest
            recipe images, and find nearby grocery stores when you request it;
          </li>
          <li>keep accounts secure, prevent abuse, and troubleshoot problems;</li>
          <li>comply with our legal obligations.</li>
        </ul>
        <p>
          We do not use your recipes, photos, or family content to train our own
          advertising or profiling systems, and we do not sell your personal
          information.
        </p>
      </LegalSection>

      <LegalSection heading="3. Third-party services">
        <p>
          We rely on a small number of service providers to run Home Cooked. Each
          receives only the data needed for its function, and each has its own
          privacy policy.
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentication, database, and photo
            storage. Holds your account details and the content you add.{" "}
            <a href="https://supabase.com/privacy">Privacy policy</a>.
          </li>
          <li>
            <strong>Resend</strong> — sends invitation and account emails; receives
            the recipient email address and name.{" "}
            <a href="https://resend.com/legal/privacy-policy">Privacy policy</a>.
          </li>
          <li>
            <strong>Cloudflare Workers AI</strong> — powers recipe-idea
            suggestions by default; receives your prompt text and cookbook
            category names.{" "}
            <a href="https://www.cloudflare.com/privacypolicy/">Privacy policy</a>.
          </li>
          <li>
            <strong>OpenAI</strong> and <strong>Anthropic</strong> — optional AI
            providers used when configured; receive your prompt text and, for
            photo recipe import, the recipe photo you upload.{" "}
            <a href="https://openai.com/policies/privacy-policy">OpenAI</a>
            {" · "}
            <a href="https://www.anthropic.com/legal/privacy">Anthropic</a>.
          </li>
          <li>
            <strong>Pexels</strong> — supplies stock recipe images; receives a
            short search phrase (used only when you have not uploaded your own
            photo).{" "}
            <a href="https://www.pexels.com/privacy-policy/">Privacy policy</a>.
          </li>
          <li>
            <strong>Google Places</strong> — finds nearby grocery stores; receives
            your device location or typed location when you use that feature.{" "}
            <a href="https://policies.google.com/privacy">Privacy policy</a>.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the application and generates standard
            server logs.{" "}
            <a href="https://vercel.com/legal/privacy-policy">Privacy policy</a>.
          </li>
        </ul>
        <p>
          If you connect your own AI provider, your prompts are sent to that
          provider under your own account and their terms.
        </p>
      </LegalSection>

      <LegalSection heading="4. How your information is shared">
        <p>
          Your recipes and cookbook content are private to you and are shared only
          with the family members you invite to a cookbook, according to the role
          you give them. We share personal information with the service providers
          listed above so they can perform their functions, and we may disclose
          information if required by law or to protect the safety and rights of
          our users. <strong>We do not sell your personal information.</strong>
        </p>
        <p>
          Please note that recipe photos and cookbook covers are stored so that
          anyone with the direct file link can view the image. Avoid uploading
          images that contain information you do not want shared this way.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We keep your information for as long as your account is active. You can
          delete individual recipes and cookbooks at any time from within the app;
          deleting them removes that content. To close your account and delete
          your associated data, contact us at{" "}
          <strong>TODO: privacy@your-domain</strong> and we will process the
          request. Some records may be retained for a limited period where needed
          for security, backups, or legal compliance.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights and choices">
        <p>
          Depending on where you live, you may have the right to access, correct,
          export, or delete your personal information, and to object to or restrict
          certain processing. Residents of the EEA/UK (GDPR) and California (CCPA)
          have specific rights, including the right not to be discriminated against
          for exercising them. To make a request, contact us at{" "}
          <strong>TODO: privacy@your-domain</strong>. You can update most of your
          content directly in the app at any time.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children's privacy">
        <p>
          Home Cooked is intended for adults and is not directed to children under{" "}
          <strong>[TODO: minimum age, e.g. 13]</strong>. We do not knowingly
          collect personal information from children under that age. If you believe
          a child has provided us information, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we make
          material changes we will update the &ldquo;Last updated&rdquo; date above
          and, where appropriate, notify you.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Questions about your privacy? Contact us at{" "}
          <strong>TODO: privacy@your-domain</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
