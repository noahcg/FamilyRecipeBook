import { redirect } from "next/navigation";
import { EntryShell } from "@/components/layout/EntryShell";
import { NameCaptureForm } from "@/components/onboarding/NameCaptureForm";
import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { needsProfileName } from "@/lib/profileCompletion";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const user = await requireUser();
  const { next } = await searchParams;
  const candidate = getSafeRedirectPath(typeof next === "string" ? next : null, "/app");
  const nextPath = candidate.split("?")[0].replace(/\/+$/, "") === "/complete-profile" ? "/app" : candidate;
  if (!await needsProfileName(user.id)) redirect(nextPath);

  return (
    <EntryShell
      eyebrow="Welcome to Home Cooked"
      title="What should we call you?"
      description="Add the name your family will see. You can change it later in your profile."
      maxWidth="md"
    >
      <NameCaptureForm submitLabel="Continue" nextPath={nextPath} />
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="ghost" size="sm">Use a different account</Button>
      </form>
    </EntryShell>
  );
}
