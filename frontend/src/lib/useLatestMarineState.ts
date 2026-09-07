import { useEffect, useState } from "react";

import { readApiError } from "../api/client";
import { getLatestMarineState } from "../api/orca";
import type { MarineState, MarineValue } from "../api/types";
import { ensureMarineStateIngested } from "./marineLocationIngest";
import {
  MAP_LOCATION_EVENT,
  marineIngestLocation,
} from "./orcaSession";

export type MarineDisplayKind =
  | "REAL"
  | "SIMULATED"
  | "ASSUMED"
  | "UNKNOWN"
  | "UNAVAILABLE";

function hasDisplayValue(value: MarineValue | undefined): boolean {
  if (!value) {
    return false;
  }
  const raw = value.value;
  if (raw === null || raw === undefined || raw === "") {
    return false;
  }
  if (typeof raw === "number" && Number.isNaN(raw)) {
    return false;
  }
  return true;
}

function formatAmount(raw: unknown, unit: string | null | undefined): string {
  const numeric = typeof raw === "number" ? raw : Number(raw);
  const amount = Number.isFinite(numeric)
    ? String(Math.round(numeric * 100) / 100)
    : String(raw);
  return unit ? `${amount} ${unit}` : amount;
}

export function marineValueKind(
  value: MarineValue | undefined,
): MarineDisplayKind {
  if (!value) {
    return "UNAVAILABLE";
  }

  const status = value.data_status ?? "UNKNOWN";
  if (!hasDisplayValue(value)) {
    if (status === "UNKNOWN") {
      return "UNKNOWN";
    }
    return "UNAVAILABLE";
  }

  if (
    status === "REAL" ||
    status === "SIMULATED" ||
    status === "ASSUMED" ||
    status === "UNKNOWN"
  ) {
    return status;
  }

  return "UNKNOWN";
}

export function formatMarineValue(value: MarineValue | undefined): string {
  const kind = marineValueKind(value);
  if (kind === "UNAVAILABLE") {
    return "Unavailable";
  }
  if (kind === "UNKNOWN" && !hasDisplayValue(value)) {
    return "Unknown";
  }
  if (!value || !hasDisplayValue(value)) {
    return "Unavailable";
  }

  if (kind === "REAL") {
    return formatAmount(value.value, value.unit);
  }

  const text = formatAmount(value.value, value.unit);
  if (kind === "SIMULATED") {
    return `${text} (simulated)`;
  }
  if (kind === "ASSUMED") {
    return `${text} (assumed)`;
  }
  return "Unknown";
}

export function marineValueIsLive(value: MarineValue | undefined): boolean {
  const kind = marineValueKind(value);
  return kind === "REAL" || kind === "SIMULATED" || kind === "ASSUMED";
}

export function formatObservedTime(iso: string | undefined): string {
  if (!iso) {
    return "Unavailable";
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function marineSourceLabel(state: MarineState | null): string {
  if (!state) {
    return "No connected data";
  }
  return (
    state.wave?.source ||
    state.wind?.source ||
    state.sources?.[0] ||
    "Unavailable"
  );
}

export function marineFreshnessLabel(state: MarineState | null): string {
  if (!state) {
    return "No connected data";
  }
  const text = state.freshness?.trim();
  return text ? text : "Unavailable";
}

export function marineRecordStatus(
  state: MarineState | null,
  loading: boolean,
  error: string | null,
): string {
  if (loading) {
    return "Checking source…";
  }
  if (error) {
    return "Source error";
  }
  if (!state) {
    return "No connected data";
  }
  return state.data_status ?? "UNKNOWN";
}

export function overallStatusNote(
  state: MarineState | null,
  loading: boolean,
  error: string | null,
): string {
  if (loading) {
    return "Checking the marine state endpoint…";
  }
  if (error) {
    return error;
  }
  if (!state) {
    return "No connected data. Wave, wind and related values stay unavailable until GET /marine/state/latest returns a marine state.";
  }
  return `Latest marine state ${state.state_id} is ${state.data_status ?? "UNKNOWN"}.`;
}

export function useLatestMarineState() {
  const [state, setState] = useState<MarineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const location = marineIngestLocation();

      try {
        await ensureMarineStateIngested(location);

        const latest = await getLatestMarineState();
        if (!cancelled) {
          setState(latest);
          setError(null);
        }
      } catch (cause) {
        if (cancelled) {
          return;
        }
        try {
          const latest = await getLatestMarineState();
          if (!cancelled) {
            setState(latest);
            setError(latest ? null : readApiError(cause));
          }
        } catch {
          if (!cancelled) {
            setState(null);
            setError(readApiError(cause));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const onLocation = () => {
      setLoading(true);
      void load();
    };

    window.addEventListener(MAP_LOCATION_EVENT, onLocation);

    return () => {
      cancelled = true;
      window.removeEventListener(MAP_LOCATION_EVENT, onLocation);
    };
  }, []);

  return { state, loading, error };
}
