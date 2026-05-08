"use client";

import { createContext, useContext } from "react";

interface BookContextValue {
  bookTitle: string;
  books: { id: string; title: string }[];
}

const BookContext = createContext<BookContextValue>({
  bookTitle: "Recipe Book",
  books: [],
});

export function BookProvider({
  bookTitle,
  books = [],
  children,
}: {
  bookTitle: string;
  books?: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <BookContext.Provider value={{ bookTitle, books }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  return useContext(BookContext);
}
