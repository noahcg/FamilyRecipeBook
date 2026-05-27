import type { BookRole } from "./database";

export type * from "./database";

/* ─── Action result types ───────────────────────────────────── */

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/* ─── Cookbook shelf preview ─────────────────────────────────── */

export interface BookPreview {
  recipeCount: number;
  memberCount: number;
  categories: { name: string; count: number }[];
  recipes: { id: string; title: string; category: string | null }[];
  lastUpdated: string | null;
}

/* The category alias used in joined Supabase selects. Convenience type for code
 * that needs to read a recipe's category name via the FK join. */
export type RecipeCategoryRef = { id: string; name: string } | null;

/* ─── Recipe copy / move targets ─────────────────────────────── */

export interface RecipeTransferTarget {
  id: string;
  title: string;
  role: BookRole;
}

/* ─── Nearby grocery store search ───────────────────────────── */

export interface NearbyStore {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  googleMapsUri: string | null;
  distanceMeters: number | null;
}
