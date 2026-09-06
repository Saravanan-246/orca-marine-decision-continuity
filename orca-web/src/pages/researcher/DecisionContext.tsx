import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function DecisionContext() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/researcher")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Research
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Compass size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Decision context
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Examine the evidence and dependencies surrounding an ORCA
              decision.
            </p>
          </div>
        </div>
      </header>

      {/* Decision */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={19} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Decision
              </p>

              <h2 className="mt-1 truncate text-base font-semibold text-slate-950">
                No decision selected
              </h2>
            </div>
          </div>

          <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
            No context
          </span>
        </div>

        <div className="px-4 py-5 sm:px-6">
          <p className="text-sm leading-6 text-slate-500">
            Select an ORCA decision to inspect its supporting evidence,
            dependencies and marine context.
          </p>

          <button
            type="button"
            onClick={() => navigate("/decisions")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open decisions
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Context dimensions */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Context dimensions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Research views should preserve the relationships around a decision.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ContextCard
            icon={<CalendarDays size={18} strokeWidth={1.9} />}
            title="Time"
            description="When the decision was made and the conditions associated with it."
          />

          <ContextCard
            icon={<MapPinned size={18} strokeWidth={1.9} />}
            title="Location"
            description="The geographic area and route context surrounding the decision."
          />

          <ContextCard
            icon={<Waves size={18} strokeWidth={1.9} />}
            title="Marine evidence"
            description="Weather, ocean, PFZ and hazard information used as evidence."
          />

          <ContextCard
            icon={<ShieldCheck size={18} strokeWidth={1.9} />}
            title="Dependencies"
            description="Conditions that determine whether the decision remains valid."
          />
        </div>
      </section>

      {/* Lifecycle */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Decision lifecycle
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Lifecycle label="Decision" active />
          <Lifecycle label="Commitment" />
          <Lifecycle label="Monitoring" />
          <Lifecycle label="Impact" />
          <Lifecycle label="Repair" />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Research views can follow how evidence moves through the ORCA
          lifecycle without changing the operational decision itself.
        </p>
      </section>
    </section>
  );
}

function ContextCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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

function Lifecycle({
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

export default DecisionContext;