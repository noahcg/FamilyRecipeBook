import { redirect } from "next/navigation";
import { getFirstBookId } from "@/lib/actions/books";

export default async function SettingsRedirectPage() {
  const bookId = await getFirstBookId();
  if (!bookId) redirect("/onboarding/create-book");
  redirect(`/app/books/${bookId}/settings`);
}
