import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure authenticated
  await requireUser();
  // Confine users without a book to onboarding — they can't reach app pages
  // or nav until they've joined or created their first cookbook.
  const bookId = await getFirstBookId();
  if (!bookId) {
    redirect("/onboarding");
  }
  return <>{children}</>;
}
