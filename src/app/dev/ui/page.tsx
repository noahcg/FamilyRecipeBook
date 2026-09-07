import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiCatalog } from "@/components/ui/UiCatalog";

export const metadata: Metadata = {
  title: "UI Library",
  description: "Home Cooked's development-only visual component catalog.",
  robots: { index: false, follow: false },
};

/** Development-only living reference for the shared Home Cooked UI library. */
export default function UiLibraryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <UiCatalog />;
}
