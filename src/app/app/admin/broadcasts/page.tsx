import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import {
  getBroadcastAudienceCount,
  listRecentBroadcasts,
} from "@/lib/actions/broadcasts";
import { BroadcastComposer } from "@/components/admin/BroadcastComposer";

function formatDateTime(value: string | null) {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function BroadcastsPage() {
  await requireAdmin();

  const [audienceResult, recentResult] = await Promise.all([
    getBroadcastAudienceCount(),
    listRecentBroadcasts(),
  ]);

  const audienceCount = audienceResult.success ? audienceResult.data : 0;
  const recent = recentResult.success ? recentResult.data : [];

  return (
    <div className="app-paper-bg paper-texture min-h-screen px-5 py-8">
      <main className="mx-auto max-w-[1180px]">
        <div className="mb-7 border-b border-line-soft pb-6">
          <Link href="/app/admin" className="text-sm font-bold text-green-deep hover:underline">
            Back to console
          </Link>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-accent-cinnamon">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-ink">Broadcasts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Send a product announcement to everyone with a confirmed account who hasn&apos;t opted
            out of announcement emails.
          </p>
          {!audienceResult.success ? (
            <p className="mt-3 text-sm font-bold text-danger">
              Could not load the audience: {audienceResult.error}
            </p>
          ) : null}
        </div>

        <section>
          <BroadcastComposer audienceCount={audienceCount} />
        </section>

        <section className="mt-8">
          <div className="recipe-card flex max-h-[34rem] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-line-soft px-5 py-4">
              <h2 className="text-base font-black text-ink">Recent broadcasts</h2>
              <p className="mt-1 text-xs text-ink-muted">The last 20 announcements sent.</p>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted">No broadcasts sent yet.</p>
              ) : (
                recent.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-green-pale text-green-deep">
                      <ScrollText size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{entry.subject}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {entry.recipientCount.toLocaleString()} sent
                        {entry.failedCount > 0
                          ? ` · ${entry.failedCount.toLocaleString()} failed`
                          : ""}{" "}
                        · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
