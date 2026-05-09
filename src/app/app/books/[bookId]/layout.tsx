import { createClient } from "@/lib/supabase/server";
import { BookProvider } from "@/lib/context/BookContext";
import { getUserBooks } from "@/lib/actions/books";
import { requireUser } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}

export default async function BookLayout({ children, params }: Props) {
  const { bookId } = await params;
  const supabase = await createClient();
  const user = await requireUser();
  const [{ data: book }, books, { data: settings }] = await Promise.all([
    supabase
      .from("recipe_books")
      .select("title")
      .eq("id", bookId)
      .single(),
    getUserBooks(),
    supabase
      .from("user_settings")
      .select("default_book_id")
      .eq("user_id", user.id)
      .single(),
  ]);

  const defaultBookId = settings?.default_book_id ?? null;
  const sortedBooks = [...books].sort((a, b) => {
    if (a.id === defaultBookId) return -1;
    if (b.id === defaultBookId) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <BookProvider
      bookTitle={book?.title ?? "Recipe Book"}
      books={sortedBooks.map((userBook) => ({
        id: userBook.id,
        title: userBook.title,
        icon: userBook.icon,
      }))}
      defaultBookId={defaultBookId}
    >
      {children}
    </BookProvider>
  );
}
