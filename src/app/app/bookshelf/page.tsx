import { BookshelfPage } from "@/components/book/BookshelfPage";
import { AppShell } from "@/components/layout/AppShell";
import { getCookbookNavData } from "@/lib/actions/books";

export default async function BookshelfRoute() {
  const { books } = await getCookbookNavData();

  return (
    <AppShell>
      <BookshelfPage books={books} />
    </AppShell>
  );
}
