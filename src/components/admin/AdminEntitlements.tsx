"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { Crown, Search, ShieldOff, Sparkles, Users } from "lucide-react";
import { Badge, Button, Card, Dialog, EmptyState, Input, Select } from "@/components/ui";
import { setUserGrandfatheredPlus } from "@/lib/actions/admin";
import type { BillingTier } from "@/lib/entitlements";

export interface AdminEntitlementRow {
  id: string;
  name: string;
  email: string | null;
  tier: BillingTier;
  launchSignupNumber: number | null;
}

export function AdminEntitlements({ rows }: { rows: AdminEntitlementRow[] }) {
  const router = useRouter();
  const headingId = useId();
  const [isPending, startTransition] = useTransition();
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminEntitlementRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | BillingTier | "first50">("all");
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const filteredRows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return rows.filter((row) => (
      (filter === "all" || (filter === "first50" ? row.launchSignupNumber !== null : row.tier === filter))
      && `${row.name} ${row.email ?? ""}`.toLocaleLowerCase().includes(search)
    ));
  }, [rows, query, filter]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredRows.length / pageSize) - 1));
  const visibleRows = filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function changeAccess(row: AdminEntitlementRow) {
    const enabled = row.tier !== "grandfathered";
    if (enabled) {
      applyChange(row, true);
      return;
    }
    setConfirming(row);
  }

  function applyChange(row: AdminEntitlementRow, enabled: boolean) {
    startTransition(async () => {
      setWorkingId(row.id);
      setMessage(null);
      setConfirming(null);
      try {
        const result = await setUserGrandfatheredPlus(row.id, enabled);
        if (!result.success) setMessage(result.error);
        router.refresh();
      } catch {
        setMessage("Could not confirm the change. Refresh and check the account before trying again.");
      } finally {
        setWorkingId(null);
      }
    });
  }

  return (
    <section className="mt-6" aria-labelledby={headingId}>
      <Card padded={false} className="overflow-hidden">
      <div className="px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={headingId} className="text-2xl font-bold leading-tight text-green-deep" style={{ fontFamily: "var(--font-playfair)" }}>Account tiers</h2>
          <Badge variant="sage">{rows.length} {rows.length === 1 ? "account" : "accounts"}</Badge>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          Manage lifetime Plus access for your members.
        </p>
        {message && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{message}</p>}
        {rows.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="w-full sm:max-w-xs">
              <Input
                type="search"
                aria-label="Find an account"
                placeholder="Find a name or email"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                rightElement={<Search size={17} aria-hidden="true" className="text-ink-soft" />}
                className="min-h-11 py-2 text-sm"
              />
            </div>
            <Select
              aria-label="Filter accounts"
              value={filter}
              onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(0); }}
              className="min-h-11 py-2 text-sm"
            >
              <option value="all">All accounts</option>
              <option value="first50">First 50 signups</option>
              <option value="free">Free</option>
              <option value="plus">Plus</option>
              <option value="grandfathered">Grandfathered</option>
            </Select>
          </div>
        )}
      </div>
      <p className="sr-only" role="status">{filteredRows.length} {filteredRows.length === 1 ? "account" : "accounts"} found.</p>
      {visibleRows.length > 0 ? (
      <ul className="grid gap-px border-t border-line-soft bg-line-soft sm:grid-cols-2 xl:grid-cols-3">
        {visibleRows.map((row) => {
          const granted = row.tier === "grandfathered";
          const paid = row.tier === "plus";
          return (
            <li key={row.id} className="flex min-w-0 flex-col gap-3 bg-card p-4 sm:p-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{row.name}</p>
                <p className="truncate text-xs text-ink-muted">{row.email ?? "No email on file"}</p>
                {row.launchSignupNumber && <p className="text-xs font-bold text-green-deep">First 50 signup #{row.launchSignupNumber}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={granted ? "mustard" : paid ? "sage" : "family"} className="gap-1">
                  {granted ? <Sparkles size={12} /> : null}
                  {granted ? "Grandfathered" : paid ? "Plus" : "Free"}
                </Badge>
                <Button
                  size="sm"
                  variant={granted ? "danger" : "secondary"}
                  disabled={isPending || workingId === row.id}
                  loading={workingId === row.id}
                  className="min-h-11"
                  aria-label={`${granted ? "Revoke lifetime Plus from" : "Grant lifetime Plus to"} ${row.name}`}
                  onClick={() => changeAccess(row)}
                >
                  {granted ? <ShieldOff size={14} /> : <Crown size={14} />}
                  {granted ? "Revoke" : "Grant lifetime Plus"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      ) : (
        <EmptyState
          icon={rows.length ? <Search size={26} aria-hidden="true" className="text-green-sage" /> : <Users size={26} aria-hidden="true" className="text-green-sage" />}
          title={rows.length ? "No matching accounts" : "No accounts yet"}
          description={rows.length ? "Try another name or email, or clear your filters." : "Accounts will appear here when people join."}
          className="border-t border-line-soft !py-8"
          action={rows.length ? <Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={() => { setQuery(""); setFilter("all"); setPage(0); }}>Clear filters</Button> : undefined}
        />
      )}
      {filteredRows.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <p className="text-sm text-ink-muted">Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredRows.length)} of {filteredRows.length}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={(currentPage + 1) * pageSize >= filteredRows.length} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}
      </Card>
      <Dialog
        open={confirming !== null}
        onClose={() => (isPending ? undefined : setConfirming(null))}
        title="Revoke lifetime Plus access?"
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {confirming?.name} will lose lifetime Plus access. Their account will use any active paid plan, or return to Free. Their recipes and cookbooks will remain intact.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirming(null)}
          >
            Keep access
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isPending}
            disabled={isPending || !confirming}
            onClick={() => confirming && applyChange(confirming, false)}
          >
            Revoke access
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
