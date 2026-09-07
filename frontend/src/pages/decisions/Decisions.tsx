import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Plus,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type Trip = {
  title: string;
  date: string;
  departure: string;
  returnTime: string;
  area: string;
};

const DECISION_KEY = "orca:fisherman:current-decision";

function readDecision(): Trip | null {
  try {
    const raw = localStorage.getItem(DECISION_KEY);

    if (!raw) {
      return null;
    }

    const value = JSON.parse(raw) as Partial<Trip>;

    if (
      typeof value.title !== "string" ||
      typeof value.date !== "string" ||
      typeof value.departure !== "string" ||
      typeof value.returnTime !== "string" ||
      typeof value.area !== "string"
    ) {
      return null;
    }

    return {
      title: value.title,
      date: value.date,
      departure: value.departure,
      returnTime: value.returnTime,
      area: value.area,
    };
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

function Decisions() {
  const navigate = useNavigate();

  const decision = useMemo(() => readDecision(), []);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            ORCA
          </p>

          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Decisions
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Decisions created in ORCA stay connected to their context,
            commitments and conditions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/fisherman/trip")}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">New decision</span>
          <span className="sm:hidden">New</span>
        </button>
      </header>

      {!decision ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Compass size={22} strokeWidth={1.9} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No decisions yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Start with a trip. ORCA will use the trip context to create the
              decision you want to evaluate.
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
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Current decision
                </p>

                <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
                  {decision.title}
                </h2>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <CheckCircle2 size={14} />
                Ready
              </span>
            </div>
          </div>

          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InfoCell
              icon={<CalendarDays size={17} strokeWidth={1.9} />}
              label="Trip date"
              value={formatDate(decision.date)}
            />

            <InfoCell
              icon={<Compass size={17} strokeWidth={1.9} />}
              label="Schedule"
              value={`${decision.departure}–${decision.returnTime}`}
            />

            <InfoCell
              icon={<CheckCircle2 size={17} strokeWidth={1.9} />}
              label="Status"
              value="Decision ready"
            />
          </div>

          <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
            <p className="text-xs font-medium text-slate-400">
              Fishing area
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-800">
              {decision.area}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              Review the evidence and dependencies attached to this decision.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/decisions/current")
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              View decision
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

export default Decisions;