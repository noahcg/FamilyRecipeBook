import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";
import { isAdminEmail } from "@/lib/admin";
import { AccountProvider } from "@/lib/context/AccountContext";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure authenticated
  const user = await requireUser();
  // Confine users without a book to onboarding — they can't reach app pages
  // or nav until they've joined or created their first cookbook.
  const bookId = await getFirstBookId();
  if (!bookId) {
    redirect("/onboarding");
  }
  // Admin status is account-level, so it must be available on the global pages
  // (Home, My Recipes, …) that have no per-book context.
  return <AccountProvider isAdmin={isAdminEmail(user.email)}>{children}</AccountProvider>;
}
