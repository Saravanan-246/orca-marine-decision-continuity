import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileClock,
  GitCompare,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type HistoryEvent = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "decision" | "commitment" | "impact" | "repair";
};

const history: HistoryEvent[] = [];

function eventIcon(type: HistoryEvent["type"]) {
  switch (type) {
    case "decision":
      return FileClock;

    case "commitment":
      return ShieldCheck;

    case "impact":
      return GitCompare;

    case "repair":
      return CheckCircle2;
  }
}

function History() {
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
            <FileClock size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              History
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Trace how decisions and commitments change over time.
            </p>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Decision history
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Historical events from connected ORCA records.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FileClock size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No history records
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Historical decision events will appear here when the connected
              ORCA record store contains them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((event) => {
              const Icon = eventIcon(event.type);

              return (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={18} strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {event.title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {event.description}
                    </p>

                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock3 size={13} />
                      {event.time}
                    </p>
                  </div>

                  <ChevronRight
                    size={17}
                    strokeWidth={1.9}
                    className="mt-1 shrink-0 text-slate-400"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* History dimensions */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HistoryDimension
          icon={<CalendarDays size={17} strokeWidth={1.9} />}
          label="Time"
        />

        <HistoryDimension
          icon={<FileClock size={17} strokeWidth={1.9} />}
          label="Decisions"
        />

        <HistoryDimension
          icon={<GitCompare size={17} strokeWidth={1.9} />}
          label="Changes"
        />

        <HistoryDimension
          icon={<ShieldCheck size={17} strokeWidth={1.9} />}
          label="Repairs"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          History preserves the decision story
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Research should be able to trace the original decision, the change
          that affected it, the response and the resulting state.
        </p>
      </section>
    </section>
  );
}

function HistoryDimension({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-400">
        No records
      </p>
    </div>
  );
}

export default History;