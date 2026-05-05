import { createClient } from "@/lib/supabase/server";
import { BookProvider } from "@/lib/context/BookContext";

interface Props {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}

export default async function BookLayout({ children, params }: Props) {
  const { bookId } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("recipe_books")
    .select("title")
    .eq("id", bookId)
    .single();

  return <BookProvider bookTitle={book?.title ?? "Recipe Book"}>{children}</BookProvider>;
}
