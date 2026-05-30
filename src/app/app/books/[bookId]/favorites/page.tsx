import { redirect } from "next/navigation";

// Favorites are account-level now (every cookbook's favorites in one place).
// This per-book route is kept only so old links/bookmarks land in the right place.
export default function BookFavoritesRedirect() {
  redirect("/app/favorites");
}
