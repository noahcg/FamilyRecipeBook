"use client";

import { createContext, useContext } from "react";

interface BookContextValue {
  bookTitle: string;
}

const BookContext = createContext<BookContextValue>({ bookTitle: "Recipe Book" });

export function BookProvider({
  bookTitle,
  children,
}: {
  bookTitle: string;
  children: React.ReactNode;
}) {
  return <BookContext.Provider value={{ bookTitle }}>{children}</BookContext.Provider>;
}

export function useBook() {
  return useContext(BookContext);
}
