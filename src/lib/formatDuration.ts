// Formats a duration in minutes for display. Minutes alone reads fine under an
// hour, but at 60+ minutes we switch to hours (with any leftover minutes), so a
// recipe never shows e.g. "90 min".
//
//   45  -> "45 min"
//   60  -> "1 hr"
//   75  -> "1 hr 15 min"
//   null / 0 -> "" (callers decide their own empty-state label)
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}
