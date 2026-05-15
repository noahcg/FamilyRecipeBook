"use client";

import { createContext, useContext } from "react";

interface BookContextValue {
  bookTitle: string;
  books: { id: string; title: string; icon: string | null; cover_style: string | null }[];
  defaultBookId: string | null;
  isAdmin: boolean;
}

const BookContext = createContext<BookContextValue>({
  bookTitle: "Recipe Book",
  books: [],
  defaultBookId: null,
  isAdmin: false,
});

export function BookProvider({
  bookTitle,
  books = [],
  defaultBookId = null,
  isAdmin = false,
  children,
}: {
  bookTitle: string;
  books?: { id: string; title: string; icon: string | null; cover_style: string | null }[];
  defaultBookId?: string | null;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <BookContext.Provider value={{ bookTitle, books, defaultBookId, isAdmin }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  return useContext(BookContext);
}
