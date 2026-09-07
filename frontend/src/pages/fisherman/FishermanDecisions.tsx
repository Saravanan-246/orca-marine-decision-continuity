import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  formatTripRoute,
  mergeTripDraft,
  readDecision,
  readTripDraft,
  resolveTripFrom,
  saveDecision,
  syncTripDraftFromMap,
  tripHasRequiredRoute,
  type Trip,
  withTripRouteArea,
} from "../../lib/orcaSession";

type LocationState = {
  fromTripPlanner?: boolean;
  trip?: Trip;
};

type DecisionStatus = "draft" | "ready" | "created";

function formatTripDate(value: string) {
  if (!value) {
    return "Date not set";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function loadPersistedTrip(fromNavigation: Trip | null): Trip | null {
  if (fromNavigation) {
    const from = resolveTripFrom(fromNavigation.from);
    const normalized = withTripRouteArea({
      ...fromNavigation,
      from,
    });
    return mergeTripDraft(normalized);
  }

  const synced = syncTripDraftFromMap();
  const draft = readTripDraft();
  const decision = readDecision();

  if (draft && tripHasRequiredRoute(draft)) {
    return withTripRouteArea(draft);
  }

  if (decision) {
    const from = resolveTripFrom(decision.from);
    return withTripRouteArea({ ...decision, from });
  }

  if (draft?.title || draft?.date || draft?.departure || draft?.returnTime) {
    return withTripRouteArea(synced);
  }

  return null;
}

function MyDecisions() {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = (location.state ?? {}) as LocationState;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [status, setStatus] = useState<DecisionStatus>("draft");
  const [error, setError] = useState("");

  useEffect(() => {
    const loaded = loadPersistedTrip(locationState.trip ?? null);
    setTrip(loaded);
    setStatus(loaded ? (readDecision() ? "created" : "ready") : "draft");
    setError("");
  }, [location.key, locationState.trip]);

  const handleCreateDecision = () => {
    setError("");

    if (!trip) {
      return;
    }

    const from = resolveTripFrom(trip.from);
    const normalized = withTripRouteArea({ ...trip, from });

    if (!tripHasRequiredRoute(normalized)) {
      setError(
        "Complete the trip route before creating a decision. Select From on the map and choose a fishing area as To.",
      );
      return;
    }

    if (!normalized.date || !normalized.departure || !normalized.returnTime) {
      setError("Complete the trip schedule before creating a decision.");
      return;
    }

    mergeTripDraft(normalized);
    saveDecision(normalized);
    setTrip(normalized);
    setStatus("created");
  };

  const handleStartTrip = () => {
    syncTripDraftFromMap();
    navigate("/fisherman/trip");
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
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
            <Compass size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Decision
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              My decisions
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Turn a trip plan into an ORCA decision that can later be monitored
              against its conditions.
            </p>
          </div>
        </div>
      </header>

      {!trip ? (
        /* Empty state */
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Compass size={22} strokeWidth={1.9} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No trip decision yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Start with a trip plan. ORCA will use that context to create the
              decision you want to evaluate.
            </p>

            <button
              type="button"
              onClick={handleStartTrip}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
            >
              Plan a trip
              <ArrowRight size={17} strokeWidth={2} />
            </button>
          </div>
        </section>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          {/* Decision summary */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Trip decision
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {trip.title}
                  </h2>
                </div>

                {status === "created" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 size={14} />
                    Created
                  </span>
                ) : (
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    Ready
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <TripDetail
                icon={<Clock3 size={17} strokeWidth={1.9} />}
                label="Schedule"
                value={`${formatTripDate(trip.date)} · ${trip.departure}–${trip.returnTime}`}
              />

              <TripDetail
                icon={<MapPinned size={17} strokeWidth={1.9} />}
                label="Fishing area"
                value={formatTripRoute(trip)}
              />
            </div>
          </section>

          {/* What ORCA will evaluate */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Sparkles size={17} strokeWidth={1.9} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    What ORCA will evaluate
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    The actual marine evidence will come from the connected
                    ORCA services.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
              <EvaluationItem
                icon={<Waves size={17} strokeWidth={1.9} />}
                title="Marine conditions"
                description="Wave, wind and relevant ocean conditions"
              />

              <EvaluationItem
                icon={<MapPinned size={17} strokeWidth={1.9} />}
                title="Area and hazards"
                description="Relevant location and hazard context"
              />

              <EvaluationItem
                icon={<Compass size={17} strokeWidth={1.9} />}
                title="Trip context"
                description="Schedule, area and route context"
              />

              <EvaluationItem
                icon={<ShieldCheck size={17} strokeWidth={1.9} />}
                title="Decision dependencies"
                description="Conditions the decision may depend on"
              />
            </div>
          </section>

          {/* Created state */}
          {status === "created" && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                  <CheckCircle2 size={18} strokeWidth={2} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">
                    Decision created
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Your trip context is now ready for the next ORCA stage:
                    evaluating evidence and creating the commitment.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Action */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {status === "created"
                    ? "Continue the ORCA lifecycle"
                    : "Create this decision"}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {status === "created"
                    ? "The next step will connect this decision to its commitment and dependencies."
                    : "This records the trip context locally until the real decision API is connected."}
                </p>
              </div>

              {status === "created" ? (
                <button
                  type="button"
                  onClick={() => navigate("/fisherman/commitment")}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
                >
                  Continue
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateDecision}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
                >
                  Create decision
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

type TripDetailProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function TripDetail({ icon, label, value }: TripDetailProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium leading-5 text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

type EvaluationItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function EvaluationItem({
  icon,
  title,
  description,
}: EvaluationItemProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default MyDecisions;
