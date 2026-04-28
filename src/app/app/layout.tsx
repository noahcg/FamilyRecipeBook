import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getFirstBookId } from "@/lib/actions/books";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure authenticated
  await requireUser();
  return <>{children}</>;
}
