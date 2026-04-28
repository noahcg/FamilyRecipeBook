export type * from "./database";

/* ─── Action result types ───────────────────────────────────── */

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
