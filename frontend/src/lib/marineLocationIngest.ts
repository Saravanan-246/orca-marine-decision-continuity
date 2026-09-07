import { ingestOsfState } from "../api/orca";
import type { MarineState } from "../api/types";
import {
  MARINE_INGEST_KEY,
  MARINE_INGEST_META_KEY,
  type MapLocation,
  isValidMapLocation,
  mapLocationKey,
  marineIngestLocation,
} from "./orcaSession";

export type MarineIngestMeta = {
  requested: MapLocation;
  grid: MapLocation | null;
  data_status: string;
  freshness: string | null;
};

let inflightIngest: {
  key: string;
  promise: Promise<MarineState>;
} | null = null;

function readLastIngestedKey(): string | null {
  return sessionStorage.getItem(MARINE_INGEST_KEY);
}

function writeLastIngestedKey(key: string): void {
  sessionStorage.setItem(MARINE_INGEST_KEY, key);
}

export function clearMarineIngestCache(): void {
  sessionStorage.removeItem(MARINE_INGEST_KEY);
  sessionStorage.removeItem(MARINE_INGEST_META_KEY);
  inflightIngest = null;
}

export function readMarineIngestMeta(): MarineIngestMeta | null {
  try {
    const raw = sessionStorage.getItem(MARINE_INGEST_META_KEY);
    if (!raw) {
      return null;
    }
    const value = JSON.parse(raw) as Partial<MarineIngestMeta>;
    if (
      !value.requested ||
      !isValidMapLocation(value.requested.lat, value.requested.lon)
    ) {
      return null;
    }
    const grid =
      value.grid &&
      isValidMapLocation(value.grid.lat, value.grid.lon)
        ? value.grid
        : null;
    return {
      requested: value.requested,
      grid,
      data_status: value.data_status ?? "UNKNOWN",
      freshness: value.freshness ?? null,
    };
  } catch {
    return null;
  }
}

function saveMarineIngestMeta(
  requested: MapLocation,
  state: MarineState,
): void {
  const gridLat = state.location?.lat;
  const gridLon = state.location?.lon;
  const meta: MarineIngestMeta = {
    requested,
    grid:
      isValidMapLocation(gridLat, gridLon)
        ? { lat: gridLat as number, lon: gridLon as number }
        : null,
    data_status: state.data_status ?? "UNKNOWN",
    freshness: state.freshness ?? null,
  };
  sessionStorage.setItem(MARINE_INGEST_META_KEY, JSON.stringify(meta));
}

function gridLocationFromState(state: MarineState): MapLocation | null {
  const lat = state.location?.lat;
  const lon = state.location?.lon;
  if (!isValidMapLocation(lat, lon)) {
    return null;
  }
  return { lat: lat as number, lon: lon as number };
}

export function locationsMatch(
  left: MapLocation,
  right: MapLocation,
): boolean {
  return mapLocationKey(left.lat, left.lon) === mapLocationKey(right.lat, right.lon);
}

/**
 * Ingest OSF for the requested GPS point at most once per unchanged
 * lat/lon (4-decimal precision). Concurrent callers share one POST.
 */
export async function ensureMarineStateIngested(
  location: MapLocation | null = marineIngestLocation(),
): Promise<MarineState | null> {
  if (!location) {
    return null;
  }

  const key = mapLocationKey(location.lat, location.lon);

  if (readLastIngestedKey() === key) {
    return null;
  }

  if (inflightIngest?.key === key) {
    return inflightIngest.promise;
  }

  const promise = ingestOsfState(location.lat, location.lon)
    .then((state) => {
      writeLastIngestedKey(key);
      saveMarineIngestMeta(location, state);
      return state;
    })
    .finally(() => {
      if (inflightIngest?.key === key) {
        inflightIngest = null;
      }
    });

  inflightIngest = { key, promise };
  return promise;
}

export function requestedLocationLabel(meta: MarineIngestMeta | null): string {
  if (!meta) {
    return "Unavailable";
  }
  const { lat, lon } = meta.requested;
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

export function gridLocationLabel(meta: MarineIngestMeta | null): string {
  if (!meta?.grid) {
    return "No valid ocean grid value";
  }
  const { lat, lon } = meta.grid;
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

export function ingestUsedDifferentGridPoint(meta: MarineIngestMeta | null): boolean {
  if (!meta?.grid) {
    return false;
  }
  return !locationsMatch(meta.requested, meta.grid);
}

export { gridLocationFromState };
