export type * from "./database";

/* ─── Action result types ───────────────────────────────────── */

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
