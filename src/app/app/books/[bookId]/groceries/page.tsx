import { redirect } from "next/navigation";

// Groceries are account-level now (one household list). This per-book route is
// kept only so old links/bookmarks land in the right place.
export default function BookGroceriesRedirect() {
  redirect("/app/groceries");
}
