import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPinned,
  ShipWheel,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  MAP_LOCATION_EVENT,
  formatMapLocation,
  formatTripRoute,
  mergeTripDraft,
  readCurrentTripDraft,
  readTripDraft,
  resolveTripFrom,
  syncTripDraftFromMap,
  TRIP_DRAFT_KEY,
  type MapLocation,
  type Trip,
  withTripRouteArea,
} from "../../lib/orcaSession";

function TripPlanner() {
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [departure, setDeparture] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [area, setArea] = useState("");
  const [fromPoint, setFromPoint] = useState<MapLocation | null>(null);
  const [toPoint, setToPoint] = useState<MapLocation | null>(null);
  const [error, setError] = useState("");

  const applyDraft = useCallback((draft: Trip) => {
    setTitle(draft.title);
    setDate(draft.date);
    setDeparture(draft.departure);
    setReturnTime(draft.returnTime);
    setArea(draft.area);
    setFromPoint(resolveTripFrom());
    setToPoint(draft.to ?? null);
  }, []);

  useEffect(() => {
    applyDraft(syncTripDraftFromMap());
  }, [applyDraft, location.key]);

  useEffect(() => {
    const syncFrom = () => {
      setFromPoint(resolveTripFrom());
    };
    window.addEventListener(MAP_LOCATION_EVENT, syncFrom);
    return () => {
      window.removeEventListener(MAP_LOCATION_EVENT, syncFrom);
    };
  }, []);

  const saveDraft = (): Trip => {
    const latest = readTripDraft();
    const from = resolveTripFrom();
    const to = latest?.to ?? toPoint ?? null;
    const routeArea =
      area.trim() ||
      (from && to ? formatTripRoute({ area: "", from, to }) : "");
    const patch: Partial<Trip> = {
      title: title.trim(),
      date,
      departure,
      returnTime,
      area: routeArea,
    };
    if (from) {
      patch.from = from;
    }
    if (to) {
      patch.to = to;
    }
    const saved = mergeTripDraft(patch);
    setFromPoint(resolveTripFrom());
    setToPoint(saved.to ?? null);
    if (!area.trim() && saved.area) {
      setArea(saved.area);
    }
    return saved;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const latest = readTripDraft();
    const from = resolveTripFrom();
    const to = latest?.to ?? toPoint ?? null;

    if (!title.trim()) {
      setError("Trip name is missing.");
      return;
    }

    if (!date) {
      setError("Trip date is missing.");
      return;
    }

    if (!departure) {
      setError("Departure time is missing.");
      return;
    }

    if (!returnTime) {
      setError("Return time is missing.");
      return;
    }

    if (!from) {
      setError("Current location is required as the trip From point.");
      return;
    }

    if (!to) {
      setError("Select a fishing area on the marine map before continuing.");
      return;
    }

    if (returnTime <= departure) {
      setError("Return time must be later than departure time.");
      return;
    }

    const areaValue =
      area.trim() || formatTripRoute({ area: "", from, to });

    mergeTripDraft({
      title: title.trim(),
      date,
      departure,
      returnTime,
      area: areaValue,
      from,
      to,
    });

    const persisted = readCurrentTripDraft();
    if (
      !persisted?.date ||
      !persisted.departure ||
      !persisted.returnTime ||
      !persisted.to
    ) {
      setError("Trip details could not be saved. Complete the planner and try again.");
      return;
    }

    const trip = withTripRouteArea(persisted);
    mergeTripDraft({
      title: trip.title,
      date: trip.date,
      departure: trip.departure,
      returnTime: trip.returnTime,
      area: trip.area,
      from: trip.from,
      to: trip.to,
    });
    setFromPoint(resolveTripFrom());
    setToPoint(trip.to ?? null);

    navigate("/fisherman/decisions", {
      state: {
        fromTripPlanner: true,
      },
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(TRIP_DRAFT_KEY);

    setTitle("");
    setDate("");
    setDeparture("");
    setReturnTime("");
    setArea("");
    setFromPoint(resolveTripFrom());
    setToPoint(null);
    setError("");
  };

  const isEditingFromMap = Boolean(
    (location.state as { fromMap?: boolean } | null)?.fromMap,
  );

  return (
    <section className="mx-auto w-full max-w-2xl">
      {/* Intro */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShipWheel size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Trip
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Plan your trip
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add the basic trip details. ORCA will use this context when the
              trip decision is evaluated.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white"
      >
        <div className="space-y-5 p-4 sm:p-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          {/* Trip name */}
          <div>
            <label
              htmlFor="trip-title"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Trip name
            </label>

            <input
              id="trip-title"
              name="tripTitle"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Morning fishing trip"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="trip-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Trip date
            </label>

            <div className="relative">
              <CalendarDays
                size={18}
                strokeWidth={1.9}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="trip-date"
                name="tripDate"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                required
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="departure-time"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Departure
              </label>

              <div className="relative">
                <Clock3
                  size={18}
                  strokeWidth={1.9}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="departure-time"
                  name="departureTime"
                  type="time"
                  value={departure}
                  onChange={(event) => setDeparture(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="return-time"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Expected return
              </label>

              <div className="relative">
                <Clock3
                  size={18}
                  strokeWidth={1.9}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="return-time"
                  name="returnTime"
                  type="time"
                  value={returnTime}
                  onChange={(event) => setReturnTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  required
                />
              </div>
            </div>
          </div>

          {/* Area */}
          <div>
            <label
              htmlFor="fishing-area"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Fishing area
            </label>

            <div className="relative">
              <MapPinned
                size={18}
                strokeWidth={1.9}
                className="pointer-events-none absolute left-4 top-4 text-slate-400"
              />

              <textarea
                id="fishing-area"
                name="fishingArea"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Describe the fishing area or select it from the marine map"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-12 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                required
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              From: {formatMapLocation(fromPoint)}. To: {formatMapLocation(toPoint)}.
            </p>

            <button
              type="button"
              onClick={() => {
                saveDraft();
                navigate("/fisherman/map", {
                  state: { fromTripPlanner: true },
                });
              }}
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              <MapPinned size={15} strokeWidth={1.9} />
              Choose from marine map
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button
            type="button"
            onClick={clearDraft}
            className="rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            Clear
          </button>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
          >
            Continue to decision
            <ArrowRight size={17} strokeWidth={2} />
          </button>
        </div>
      </form>

      {/* Context note */}
      <p className="mt-4 text-center text-xs leading-5 text-slate-400">
        Trip details are saved locally as a draft until the ORCA account
        service is connected.
      </p>

      {isEditingFromMap && (
        <p className="mt-2 text-center text-xs text-blue-500">
          Map fishing area {toPoint ? `saved at ${formatMapLocation(toPoint)}` : "is not selected yet"}.
        </p>
      )}
    </section>
  );
}

export default TripPlanner;
