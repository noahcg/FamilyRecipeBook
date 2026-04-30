"use client";

import { useState } from "react";
import { LocateFixed, MapPin, Search, Store } from "lucide-react";

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; latitude: number; longitude: number }
  | { status: "error"; message: string };

function mapsQueryForManualLocation(location: string) {
  return `grocery stores near ${location.trim()}`;
}

function mapsQueryForCoordinates(latitude: number, longitude: number) {
  return `grocery stores near ${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function NearbyGroceryStores() {
  const [location, setLocation] = useState("");
  const [geo, setGeo] = useState<LocationState>({ status: "idle" });

  const manualQuery = location.trim() ? mapsQueryForManualLocation(location) : "";
  const coordinateQuery =
    geo.status === "ready"
      ? mapsQueryForCoordinates(geo.latitude, geo.longitude)
      : "";

  const activeQuery = manualQuery || coordinateQuery;

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeQuery) return;
    window.open(googleMapsUrl(activeQuery), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-xl border border-line-soft bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-deep">
          <Store size={19} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Find nearby grocery stores</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                Search around your current location, or enter a city, ZIP, or neighborhood.
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
              disabled={!activeQuery}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-deep text-ink-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Search grocery stores"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
