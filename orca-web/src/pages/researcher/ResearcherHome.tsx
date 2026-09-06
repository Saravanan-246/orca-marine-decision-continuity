import {
  ArrowRight,
  BarChart3,
  Compass,
  FileSearch,
  History,
  MapPinned,
  Microscope,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function ResearcherHome() {
  const navigate = useNavigate();

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          RESEARCHER
        </p>

        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Marine research workspace
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Explore marine evidence, observations and the decision context behind
          changing conditions.
        </p>
      </header>

      {/* Quick access */}
      <section className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          icon={<FileSearch size={19} strokeWidth={1.9} />}
          title="Evidence"
          description="Inspect available marine evidence and source state."
          onClick={() => navigate("/researcher/evidence")}
        />

        <ActionCard
          icon={<Waves size={19} strokeWidth={1.9} />}
          title="Observations"
          description="Review marine observations from connected sources."
          onClick={() => navigate("/researcher/observations")}
        />

        <ActionCard
          icon={<Compass size={19} strokeWidth={1.9} />}
          title="Decision context"
          description="Trace the evidence and dependencies around decisions."
          onClick={() =>
            navigate("/researcher/decision-context")
          }
        />

        <ActionCard
          icon={<History size={19} strokeWidth={1.9} />}
          title="History"
          description="Follow changes across the decision lifecycle."
          onClick={() => navigate("/researcher/history")}
        />
      </section>

      {/* Research overview */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Microscope size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Research overview
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Current research workspace state.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          <OverviewItem
            icon={<FileSearch size={17} strokeWidth={1.9} />}
            label="Evidence"
            value="No records"
          />

          <OverviewItem
            icon={<Waves size={17} strokeWidth={1.9} />}
            label="Observations"
            value="No records"
          />

          <OverviewItem
            icon={<BarChart3 size={17} strokeWidth={1.9} />}
            label="Changes"
            value="No records"
          />

          <OverviewItem
            icon={<History size={17} strokeWidth={1.9} />}
            label="History"
            value="No records"
          />
        </div>
      </section>

      {/* Research map */}
      <button
        type="button"
        onClick={() => navigate("/researcher/map")}
        className="group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white sm:p-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <MapPinned size={19} strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">
              Research map
            </p>

            <ArrowRight
              size={16}
              strokeWidth={1.9}
              className="shrink-0 text-slate-400 transition group-hover:text-blue-600"
            />
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Explore the spatial context of marine observations and evidence.
          </p>
        </div>
      </button>

      {/* Research principle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          Research through traceability
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          ORCA should let researchers follow the relationship between marine
          evidence, decisions, changes and repairs without exposing private
          operational controls.
        </p>
      </section>
    </section>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-50 sm:p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {title}
          </h2>

          <ArrowRight
            size={16}
            strokeWidth={1.9}
            className="shrink-0 text-slate-400 transition group-hover:text-blue-600"
          />
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </button>
  );
}

function OverviewItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-4 sm:px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        {icon}
      </div>

      <p className="mt-2 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {value}
      </p>
    </div>
  );
}

export default ResearcherHome;