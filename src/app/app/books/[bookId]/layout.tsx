import { createClient } from "@/lib/supabase/server";
import { BookProvider } from "@/lib/context/BookContext";
import { getUserBooks } from "@/lib/actions/books";

interface Props {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}

export default async function BookLayout({ children, params }: Props) {
  const { bookId } = await params;
  const supabase = await createClient();
  const [{ data: book }, books] = await Promise.all([
    supabase
      .from("recipe_books")
      .select("title")
      .eq("id", bookId)
      .single(),
    getUserBooks(),
  ]);

  return (
    <BookProvider
      bookTitle={book?.title ?? "Recipe Book"}
      books={books.map((userBook) => ({ id: userBook.id, title: userBook.title }))}
    >
      {children}
    </BookProvider>
  );
}
