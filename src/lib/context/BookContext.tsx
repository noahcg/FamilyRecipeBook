"use client";

import { createContext, useContext } from "react";

interface BookContextValue {
  bookTitle: string;
  books: { id: string; title: string; icon: string | null }[];
  defaultBookId: string | null;
}

const BookContext = createContext<BookContextValue>({
  bookTitle: "Recipe Book",
  books: [],
  defaultBookId: null,
});

export function BookProvider({
  bookTitle,
  books = [],
  defaultBookId = null,
  children,
}: {
  bookTitle: string;
  books?: { id: string; title: string; icon: string | null }[];
  defaultBookId?: string | null;
  children: React.ReactNode;
}) {
  return (
    <BookContext.Provider value={{ bookTitle, books, defaultBookId }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  return useContext(BookContext);
}
