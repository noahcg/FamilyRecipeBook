import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase()));
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdminEmail(user.email)) {
    notFound();
  }

  return user;
}

export function isAdminConfigured() {
  return getAdminEmails().length > 0;
}
