import { redirect } from "next/navigation";
import { getFirstBookId } from "@/lib/actions/books";

export default async function AppPage() {
  const bookId = await getFirstBookId();
  if (bookId) {
    redirect(`/app/books/${bookId}`);
  } else {
    redirect("/onboarding/create-book");
  }
}
