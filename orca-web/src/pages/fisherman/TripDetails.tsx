import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  formatTripRoute,
  parseTrip,
  type Trip,
} from "../../lib/orcaSession";

const DECISION_KEY = "orca:fisherman:current-decision";

function readTrip(): Trip | null {
  try {
    const raw = localStorage.getItem("orca:fisherman:trip-draft");
    if (!raw) {
      return null;
    }
    return parseTrip(JSON.parse(raw));
  } catch {
    return null;
  }
}

function formatDate(value: string) {
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

function TripDetails() {
  const navigate = useNavigate();

  const trip = useMemo(() => readTrip(), []);

  const createDecisionAndContinue = () => {
    if (!trip) {
      navigate("/fisherman/trip");
      return;
    }

    localStorage.setItem(DECISION_KEY, JSON.stringify(trip));

    navigate("/fisherman/decisions", {
      state: {
        trip,
        fromTripDetails: true,
      },
    });
  };

  if (!trip) {
    return (
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Home
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Compass size={22} strokeWidth={1.9} />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-950">
            No trip details yet
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Plan a trip first. Once the trip exists, its details and decision
            context will appear here.
          </p>

          <button
            type="button"
            onClick={() => navigate("/fisherman/trip")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Plan a trip
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Home
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Compass size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Trip
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {trip.title}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review the trip before turning it into an ORCA decision.
            </p>
          </div>
        </div>
      </header>

      {/* Trip summary */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Trip summary
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            {trip.title}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2">
          <Detail
            icon={<CalendarDays size={17} strokeWidth={1.9} />}
            label="Date"
            value={formatDate(trip.date)}
          />

          <Detail
            icon={<Clock3 size={17} strokeWidth={1.9} />}
            label="Time"
            value={`${trip.departure}–${trip.returnTime}`}
          />

          <Detail
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            label="Fishing area"
            value={formatTripRoute(trip)}
          />

          <Detail
            icon={<Compass size={17} strokeWidth={1.9} />}
            label="Planning state"
            value="Trip planned"
          />
        </div>
      </section>

      {/* Decision preparation */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Prepare the decision
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                ORCA will use this trip context when the decision is evaluated.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          <PreparationItem
            title="Marine conditions"
            description="Wave, wind and relevant ocean information."
            icon={<Waves size={17} strokeWidth={1.9} />}
          />

          <PreparationItem
            title="Location context"
            description="Fishing area and available map information."
            icon={<MapPinned size={17} strokeWidth={1.9} />}
          />

          <PreparationItem
            title="Trip schedule"
            description="Departure and expected return time."
            icon={<Clock3 size={17} strokeWidth={1.9} />}
          />

          <PreparationItem
            title="Dependencies"
            description="Conditions that may determine whether the decision remains valid."
            icon={<ShieldCheck size={17} strokeWidth={1.9} />}
          />
        </div>
      </section>

      {/* Action */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Ready to evaluate this trip?
        </h2>

        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          Continue to the decision stage. ORCA will keep this trip context
          attached to the decision.
        </p>

        <button
          type="button"
          onClick={createDecisionAndContinue}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
        >
          Continue to decision
          <ArrowRight size={17} />
        </button>
      </section>
    </section>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-6">
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

function PreparationItem({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
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

export default TripDetails;