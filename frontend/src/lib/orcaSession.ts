import type {
  DecisionDependency,
  Evidence,
  MarineCommitment,
  MarineCommitmentCreate,
  ReevaluateResponse,
} from "../api/types";

export const DECISION_KEY = "orca:fisherman:current-decision";
export const COMMITMENT_KEY = "orca:fisherman:current-commitment";
export const COMMITMENT_ID_KEY = "orca:session:commitment-id";
export const LAST_MONITOR_KEY = "orca:session:last-monitor";
export const LAST_EVIDENCE_KEY = "orca:session:last-evidence";
export const MAP_LOCATION_KEY = "orca:session:map-location";
export const MAP_LOCATION_EVENT = "orca:map-location";
export const MARINE_INGEST_KEY = "orca:session:marine-ingest-key";
export const MARINE_INGEST_META_KEY = "orca:session:marine-ingest-meta";
export const TRIP_DRAFT_KEY = "orca:fisherman:trip-draft";

export type MapLocation = {
  lat: number;
  lon: number;
};

export function mapLocationKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function isValidMapLocation(
  lat: unknown,
  lon: unknown,
): lat is number {
  if (typeof lat !== "number" || typeof lon !== "number") {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lon < -180 || lon > 360) {
    return false;
  }
  return true;
}

export function saveMapLocation(lat: number, lon: number): void {
  if (!isValidMapLocation(lat, lon)) {
    return;
  }

  const current = readMapLocation();
  const same =
    current &&
    mapLocationKey(current.lat, current.lon) === mapLocationKey(lat, lon);

  const payload: MapLocation = { lat, lon };
  sessionStorage.setItem(MAP_LOCATION_KEY, JSON.stringify(payload));

  if (!same) {
    sessionStorage.removeItem(MARINE_INGEST_KEY);
    sessionStorage.removeItem(MARINE_INGEST_META_KEY);
  }

  const draft = readTripDraft() ?? emptyTripDraft();
  saveTripDraft({
    ...draft,
    from: payload,
  });

  window.dispatchEvent(new Event(MAP_LOCATION_EVENT));
}

export function readMapLocation(): MapLocation | null {
  try {
    const raw = sessionStorage.getItem(MAP_LOCATION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<MapLocation>;
    if (!isValidMapLocation(value.lat, value.lon)) {
      return null;
    }
    return { lat: value.lat, lon: value.lon };
  } catch {
    return null;
  }
}

export type Trip = {
  title: string;
  date: string;
  departure: string;
  returnTime: string;
  area: string;
  from?: MapLocation | null;
  to?: MapLocation | null;
};

export type LocalCommitment = {
  id: string;
  trip: Trip;
  status: "active";
  createdAt: string;
};

export function parseMapLocationValue(value: unknown): MapLocation | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const lat = record.lat ?? record.latitude;
  const lon = record.lon ?? record.lng ?? record.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }
  if (!isValidMapLocation(lat, lon)) {
    return null;
  }
  return { lat, lon };
}

export function parseTrip(value: unknown): Trip | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.title !== "string" ||
    typeof record.date !== "string" ||
    typeof record.departure !== "string" ||
    typeof record.returnTime !== "string" ||
    typeof record.area !== "string"
  ) {
    return null;
  }
  return {
    title: record.title,
    date: record.date,
    departure: record.departure,
    returnTime: record.returnTime,
    area: record.area,
    from: parseMapLocationValue(record.from),
    to: parseMapLocationValue(record.to),
  };
}

export function formatMapLocation(
  location: MapLocation | null | undefined,
): string {
  if (!location) {
    return "Unavailable";
  }
  return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
}

export function formatTripRoute(
  trip: Pick<Trip, "area" | "from" | "to">,
): string {
  if (trip.from && trip.to) {
    return `From ${formatMapLocation(trip.from)} → ${formatMapLocation(trip.to)}`;
  }
  if (trip.to) {
    return `To ${formatMapLocation(trip.to)}`;
  }
  return trip.area.trim() ? trip.area : "Unavailable";
}

export function tripRouteForMap(
  trip: Trip | null | undefined,
): { lat: number; lng: number }[] | undefined {
  if (!trip?.from || !trip?.to) {
    return undefined;
  }
  return [
    { lat: trip.from.lat, lng: trip.from.lon },
    { lat: trip.to.lat, lng: trip.to.lon },
  ];
}

export function emptyTripDraft(): Trip {
  return {
    title: "",
    date: "",
    departure: "",
    returnTime: "",
    area: "",
    from: null,
    to: null,
  };
}

export function readTripDraft(): Trip | null {
  try {
    const raw = localStorage.getItem(TRIP_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    return parseTrip(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTripDraft(trip: Trip): void {
  localStorage.setItem(TRIP_DRAFT_KEY, JSON.stringify(trip));
}

export function mergeTripDraft(patch: Partial<Trip>): Trip {
  const current = readTripDraft() ?? emptyTripDraft();
  const merged: Trip = {
    ...current,
    ...patch,
    from: patch.from !== undefined ? patch.from : current.from,
    to: patch.to !== undefined ? patch.to : current.to,
  };
  saveTripDraft(merged);
  return merged;
}

/** Live GPS only. Never a fallback center or leftover draft From. */
export function resolveTripFrom(
  _draftFrom?: MapLocation | null,
): MapLocation | null {
  return readMapLocation();
}

/** Persist current GPS From into the trip draft without touching To. */
export function syncTripDraftFromMap(): Trip {
  const current = readTripDraft() ?? emptyTripDraft();
  const from = readMapLocation();
  return mergeTripDraft({ from });
}

/** Fresh trip: keep live GPS From only, clear previous To and derived area. */
export function beginNewTripDraft(): Trip {
  const from = readMapLocation();
  const next: Trip = {
    ...emptyTripDraft(),
    from,
    to: null,
    area: "",
  };
  saveTripDraft(next);
  return next;
}

export function clearTripDestination(): Trip {
  const current = readTripDraft() ?? emptyTripDraft();
  const area =
    current.area.includes("→") || current.area.trim().startsWith("To ")
      ? ""
      : current.area;
  return mergeTripDraft({
    to: null,
    area,
  });
}

export function persistTripDestination(to: MapLocation): Trip {
  const from = readMapLocation();
  const current = readTripDraft() ?? emptyTripDraft();
  const generated = formatTripRoute({
    area: "",
    from,
    to,
  });
  const keepCustomArea =
    Boolean(current.area.trim()) &&
    !current.area.includes("→") &&
    !current.area.trim().startsWith("To ");

  return mergeTripDraft({
    from,
    to,
    area: keepCustomArea ? current.area : generated,
  });
}

export type VoiceContext = {
  role: "FISHERMAN";
  location: MapLocation | null;
  tripTitle: string | null;
  tripRoute: string | null;
  commitmentId: string | null;
};

export function buildVoiceContext(): VoiceContext {
  const commitment = readLocalCommitment();
  const decision = readDecision();
  const draft = readTripDraft();
  const trip = commitment?.trip ?? decision ?? draft;
  const location =
    trip?.to ??
    trip?.from ??
    readMapLocation();

  return {
    role: "FISHERMAN",
    location,
    tripTitle: trip?.title?.trim() ? trip.title : null,
    tripRoute: trip ? formatTripRoute(trip) : null,
    commitmentId: commitment?.id ?? null,
  };
}

export function withTripRouteArea(trip: Trip): Trip {
  const from = trip.from ?? null;
  const to = trip.to ?? null;
  const area =
    trip.area.trim() ||
    (from && to ? formatTripRoute({ area: "", from, to }) : trip.area);
  return { ...trip, area };
}

export function tripHasRequiredRoute(trip: Trip | null | undefined): boolean {
  return Boolean(trip?.from && trip?.to);
}

export function saveDecision(trip: Trip): void {
  localStorage.setItem(DECISION_KEY, JSON.stringify(trip));
}

export function readDecision(): Trip | null {
  try {
    const raw = localStorage.getItem(DECISION_KEY);
    if (!raw) return null;
    return parseTrip(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readLocalCommitment(): LocalCommitment | null {
  try {
    const raw = localStorage.getItem(COMMITMENT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalCommitment>;
    if (
      typeof value.id !== "string" ||
      typeof value.createdAt !== "string" ||
      !value.trip
    ) {
      return null;
    }
    const trip = parseTrip(value.trip);
    if (!trip) {
      return null;
    }
    return {
      id: value.id,
      status: "active",
      createdAt: value.createdAt,
      trip,
    };
  } catch {
    return null;
  }
}

export function saveLocalCommitment(record: LocalCommitment): void {
  localStorage.setItem(COMMITMENT_KEY, JSON.stringify(record));
  localStorage.setItem(COMMITMENT_ID_KEY, record.id);
}

export function clearLocalCommitment(): void {
  localStorage.removeItem(COMMITMENT_KEY);
  localStorage.removeItem(COMMITMENT_ID_KEY);
}

export function setActiveCommitmentId(id: string): void {
  localStorage.setItem(COMMITMENT_ID_KEY, id);
}

export function getActiveCommitmentId(): string | null {
  return (
    localStorage.getItem(COMMITMENT_ID_KEY) ??
    readLocalCommitment()?.id ??
    null
  );
}

/** Fishing-area To for INCOIS OSF ingest; GPS From only if To is missing. */
export function marineIngestLocation(): MapLocation | null {
  const trip =
    readLocalCommitment()?.trip ?? readDecision() ?? readTripDraft();
  if (trip?.to && isValidMapLocation(trip.to.lat, trip.to.lon)) {
    return trip.to;
  }
  return readMapLocation();
}

export function saveLastMonitor(result: ReevaluateResponse): void {
  sessionStorage.setItem(LAST_MONITOR_KEY, JSON.stringify(result));
}

export function clearLastMonitor(): void {
  sessionStorage.removeItem(LAST_MONITOR_KEY);
}

export function discardStaleMonitor(commitment: MarineCommitment): ReevaluateResponse | null {
  const last = readLastMonitor();
  if (
    last &&
    last.commitment_id === commitment.commitment_id &&
    last.state === commitment.state
  ) {
    return last;
  }
  clearLastMonitor();
  return null;
}

export function isolationFromCommitment(commitment: MarineCommitment): {
  affected_segment_ids: string[];
  unaffected_segment_ids: string[];
} {
  const affected = [
    ...new Set(
      commitment.dependencies
        .filter(
          (item) => item.status === "VIOLATED" || item.status === "AT_RISK",
        )
        .flatMap((item) => item.segment_ids),
    ),
  ];
  const unaffected = commitment.segments
    .map((segment) => segment.segment_id)
    .filter((segmentId) => !affected.includes(segmentId));
  return {
    affected_segment_ids: affected,
    unaffected_segment_ids: unaffected,
  };
}

export function monitorUiFromCommitment(
  commitment: MarineCommitment,
): "monitoring" | "changed" | "unavailable" {
  if (commitment.state === "VIOLATED" || commitment.state === "AT_RISK") {
    return "changed";
  }
  if (commitment.state === "UNVERIFIABLE") {
    return "unavailable";
  }
  return "monitoring";
}

export function readLastMonitor(): ReevaluateResponse | null {
  try {
    const raw = sessionStorage.getItem(LAST_MONITOR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReevaluateResponse;
  } catch {
    return null;
  }
}

export function saveLastEvidence(evidence: Evidence[]): void {
  sessionStorage.setItem(LAST_EVIDENCE_KEY, JSON.stringify(evidence));
}

export function readLastEvidence(): Evidence[] | null {
  try {
    const raw = sessionStorage.getItem(LAST_EVIDENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Evidence[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseTripDate(date: string, time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  const value = new Date(`${date}T${normalized}`);
  if (Number.isNaN(value.getTime())) {
    throw new Error("Trip date or time is invalid.");
  }
  return value;
}

export function formatSegmentIds(ids: string[]): string {
  if (ids.length === 0) {
    return "None";
  }
  return ids.join(", ");
}

export function monitorUiFromResult(
  result: ReevaluateResponse,
): "monitoring" | "changed" | "unavailable" {
  if (result.state === "VIOLATED" || result.state === "AT_RISK") {
    return "changed";
  }

  if (result.state === "UNVERIFIABLE") {
    return "unavailable";
  }

  return "monitoring";
}

export function buildCommitmentPayload(trip: Trip): MarineCommitmentCreate {
  const start = parseTripDate(trip.date, trip.departure);
  let end = parseTripDate(trip.date, trip.returnTime);
  if (end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  const span = end.getTime() - start.getTime();
  const mid1 = new Date(start.getTime() + span / 3);
  const mid2 = new Date(start.getTime() + (2 * span) / 3);
  const stamp = Date.now();

  return {
    commitment_id: `C-${stamp}`,
    stakeholder_type: "FISHERMAN",
    decision_type: "FISHING_TRIP",
    decision_summary: trip.title,
    segments: [
      {
        segment_id: "SEG-1",
        label: "Departure",
        start_time: start.toISOString(),
        end_time: mid1.toISOString(),
        required_conditions: {},
      },
      {
        segment_id: "SEG-2",
        label: "Fishing",
        start_time: mid1.toISOString(),
        end_time: mid2.toISOString(),
        required_conditions: {},
      },
      {
        segment_id: "SEG-3",
        label: "Return",
        start_time: mid2.toISOString(),
        end_time: end.toISOString(),
        required_conditions: {},
      },
    ],
    dependencies: [
      {
        dependency_id: `DEP-WAVE-${stamp}`,
        parameter: "wave_height",
        source: "INCOIS-OSF-WW3",
        valid_range: { min: 0, max: 2, risk_margin: 0.1 },
        temporal_resolution_h: 3,
        segment_ids: ["SEG-3"],
      },
    ],
    evidence: [],
    spatial_scope: (() => {
      const from = trip.from ?? readMapLocation();
      const to = trip.to ?? null;
      if (!from && !to) {
        return null;
      }
      return {
        from: from ? { lat: from.lat, lon: from.lon } : null,
        to: to ? { lat: to.lat, lon: to.lon } : null,
        fishing_area: trip.area,
      };
    })(),
  };
}

export function evidenceFromMonitorResult(
  result: ReevaluateResponse,
  dependencies: DecisionDependency[],
): Evidence[] {
  const byId = new Map(
    dependencies.map((item) => [item.dependency_id, item]),
  );

  const items: Evidence[] = [];

  for (const row of result.results) {
    const dependency = byId.get(row.dependency_id);
    if (!dependency || !row.evidence_id) {
      continue;
    }
    if (row.data_status !== "REAL" && row.data_status !== "SIMULATED") {
      continue;
    }
    if (row.current_value === null || row.current_value === undefined) {
      continue;
    }

    items.push({
      evidence_id: row.evidence_id,
      parameter: dependency.parameter,
      source: row.source || dependency.source,
      value: row.current_value,
      timestamp:
        row.observed_at ??
        row.timestamp ??
        new Date().toISOString(),
      data_status: row.data_status,
      temporal_resolution_h: dependency.temporal_resolution_h ?? 3,
    });
  }

  return items;
}

export function simulatedObservation(
  parameter: string,
  value: number,
  source = "ORCA-UI",
): Evidence {
  return {
    evidence_id: `E-${Date.now()}`,
    parameter,
    source,
    value,
    unit: parameter === "wind_speed" ? "m/s" : "m",
    timestamp: new Date().toISOString(),
    temporal_resolution_h: 3,
    data_status: "SIMULATED",
  };
}

export function unknownObservation(
  parameter: string,
  source = "ORCA-UI",
): Evidence {
  return {
    evidence_id: `E-${Date.now()}`,
    parameter,
    source,
    value: null,
    timestamp: new Date().toISOString(),
    temporal_resolution_h: 3,
    data_status: "UNKNOWN",
  };
}
