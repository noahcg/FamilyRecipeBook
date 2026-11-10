import { requireUser } from "@/lib/auth";
import { requireProfileName } from "@/lib/profileCompletion";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  await requireProfileName(user.id, "/onboarding");
  return children;
}
