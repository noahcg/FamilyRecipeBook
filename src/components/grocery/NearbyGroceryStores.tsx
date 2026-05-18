"use client";

import { useState } from "react";
import {
  ExternalLink,
  LocateFixed,
  MapPin,
  Search,
  Star,
  Store,
} from "lucide-react";
import { Drawer } from "@/components/ui";
import { searchNearbyGroceryStores } from "@/lib/actions/grocery";
import type { NearbyStore } from "@/lib/types";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; latitude: number; longitude: number }
  | { status: "error"; message: string };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; stores: NearbyStore[]; usedQuery: string }
  | { status: "error"; message: string };

function formatDistance(meters: number | null): string | null {
  if (meters === null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function NearbyGroceryStores() {
  const [location, setLocation] = useState("");
  const [geo, setGeo] = useState<LocationState>({ status: "idle" });
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  function locateUser() {
    if (!navigator.geolocation) {
      setGeo({
        status: "error",
        message: "Location search is not available in this browser.",
      });
      return;
    }

    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: "ready",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setGeo({
          status: "error",
          message: "Could not get your location. Enter a city or ZIP instead.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const manual = location.trim();
    const hasManual = manual.length > 0;
    if (!hasManual && geo.status !== "ready") return;

    setDrawerOpen(true);
    setSearch({ status: "loading" });

    const result = await searchNearbyGroceryStores(
      hasManual
        ? { query: manual }
        : geo.status === "ready"
        ? { latitude: geo.latitude, longitude: geo.longitude }
        : {}
    );

    if (!result.success) {
      setSearch({ status: "error", message: result.error });
      return;
    }

    setSearch({
      status: "done",
      stores: result.data,
      usedQuery: hasManual ? manual : "your current location",
    });
  }

  const canSubmit = location.trim().length > 0 || geo.status === "ready";

  return (
    <>
      <section className="rounded-xl border border-line-soft bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
            <Store size={19} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Find nearby grocery stores
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  Search around your current location, or enter a city, ZIP, or
                  neighborhood.
                </p>
              </div>
              <button
                type="button"
                onClick={locateUser}
                disabled={geo.status === "loading"}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white-soft px-3 py-2 text-xs font-bold text-green-deep transition hover:bg-green-pale disabled:opacity-50"
              >
                <LocateFixed size={14} />
                {geo.status === "loading" ? "Locating..." : "Use my location"}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <MapPin
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  size={15}
                />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City, ZIP, or neighborhood"
                  className="input-cookbook h-10 w-full text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                  autoComplete="postal-code"
                />
              </div>
              <button
                type="submit"
                disabled={!canSubmit || search.status === "loading"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-deep text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Search grocery stores"
              >
                <Search size={16} />
              </button>
            </form>

            {geo.status === "error" && (
              <p className="mt-2 text-xs text-danger">{geo.message}</p>
            )}
            {geo.status === "ready" && location.trim().length === 0 && (
              <p className="mt-2 text-xs text-ink-muted">
                Using your current location. You can also type an address.
              </p>
            )}
          </div>
        </div>
      </section>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eyebrow="Grocery"
        title="Nearby stores"
      >
        {search.status === "done" && (
          <p className="-mt-3 mb-3 text-xs text-ink-muted">
            Near {search.usedQuery}
          </p>
        )}

        {search.status === "loading" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-ink-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-green-deep" />
            Searching nearby stores…
          </div>
        )}

        {search.status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <p className="text-sm font-semibold text-danger">{search.message}</p>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 text-sm font-bold text-green-deep hover:underline"
            >
              Close and try again
            </button>
          </div>
        )}

        {search.status === "done" && search.stores.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <p className="text-sm text-ink-muted">
              No grocery stores found near {search.usedQuery}. Try a different
              address.
            </p>
          </div>
        )}

        {search.status === "done" && search.stores.length > 0 && (
          <ul className="-mx-1 min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto pr-1">
            {search.stores.map((store) => (
              <StoreRow key={store.id} store={store} />
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}

function StoreRow({ store }: { store: NearbyStore }) {
  const distance = formatDistance(store.distanceMeters);
  return (
    <li className="px-1 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">{store.name}</p>
          {store.address && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
              {store.address}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {store.rating !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Star
                  size={12}
                  className="fill-accent-honey text-accent-honey"
                  strokeWidth={1.5}
                />
                {store.rating.toFixed(1)}
                {store.ratingCount !== null && (
                  <span className="font-normal text-ink-muted">
                    ({store.ratingCount.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            {distance && (
              <span className="font-semibold text-ink-muted">{distance}</span>
            )}
            {store.openNow === true && (
              <span className="rounded-sm bg-green-pale px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-deep">
                Open now
              </span>
            )}
            {store.openNow === false && (
              <span className="rounded-sm bg-line-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Closed
              </span>
            )}
          </div>
        </div>
        {store.googleMapsUri && (
          <a
            href={store.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white-soft px-2.5 py-1.5 text-xs font-bold text-green-deep transition hover:bg-green-pale"
          >
            Directions <ExternalLink size={12} />
          </a>
        )}
      </div>
    </li>
  );
}
