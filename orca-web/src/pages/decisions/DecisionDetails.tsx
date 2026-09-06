import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
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

function DecisionDetails() {
  const navigate = useNavigate();
  const decision = readDecision();

  if (!decision) {
    return (
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/decisions")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Decisions
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <FileText size={22} strokeWidth={1.9} />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-950">
            No decision available
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Create a trip decision first. Its details will appear here.
          </p>

          <button
            type="button"
            onClick={() => navigate("/fisherman/trip")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Plan a trip
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/decisions")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Decisions
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Decision details
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {decision.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {formatDate(decision.date)}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <CheckCircle2 size={14} />
            Ready
          </span>
        </div>
      </header>

      {/* Context */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Decision context
          </h2>
        </div>

        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <ContextItem
            icon={<Clock3 size={17} />}
            label="Schedule"
            value={`${decision.departure}–${decision.returnTime}`}
          />

          <ContextItem
            icon={<MapPinned size={17} />}
            label="Fishing area"
            value={decision.area}
          />
        </div>
      </section>

      {/* Evidence */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Evidence
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Marine evidence used to evaluate this decision.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <EvidenceRow
            name="Marine conditions"
            status="Evaluation pending live data"
          />

          <EvidenceRow
            name="Area and hazards"
            status="Evaluation pending live data"
          />

          <EvidenceRow
            name="Trip context"
            status="Available"
          />
        </div>
      </section>

      {/* Dependencies */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Dependencies
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Conditions that can influence whether this decision remains
              valid.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <DependencyRow
            icon={<Waves size={16} />}
            name="Wave"
          />

          <DependencyRow
            icon={<Waves size={16} />}
            name="Wind"
          />

          <DependencyRow
            icon={<MapPinned size={16} />}
            name="Marine hazards"
          />

          <DependencyRow
            icon={<MapPinned size={16} />}
            name="Area and route"
          />
        </div>
      </section>

      {/* Lifecycle */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          ORCA lifecycle
        </h2>

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          <LifecycleItem label="Decision" active />
          <LifecycleItem label="Commitment" />
          <LifecycleItem label="Monitoring" />
          <LifecycleItem label="Impact" />
          <LifecycleItem label="Repair" />
        </div>
      </section>

      {/* Next action */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Waves size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Next: create a commitment
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Once the decision is accepted, its conditions can be represented
              as a commitment for continuous monitoring.
            </p>

            <button
              type="button"
              onClick={() => navigate("/commitment")}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue to commitment
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

function ContextItem({
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

        <p className="mt-1 break-words text-sm font-medium leading-5 text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function EvidenceRow({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm font-medium text-slate-700">
        {name}
      </span>

      <span className="text-right text-xs font-medium text-slate-400">
        {status}
      </span>
    </div>
  );
}

function DependencyRow({
  icon,
  name,
}: {
  icon: React.ReactNode;
  name: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <span className="text-slate-400">
        {icon}
      </span>

      <span className="text-sm font-medium text-slate-700">
        {name}
      </span>
    </div>
  );
}

function LifecycleItem({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl px-3 py-3 text-center text-xs font-medium",
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-400",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export default DecisionDetails;