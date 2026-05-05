"use client";

import { useBook } from "@/lib/context/BookContext";

export function BookName({ className }: { className?: string }) {
  const { bookTitle } = useBook();
  return <span className={className}>{bookTitle}</span>;
}
