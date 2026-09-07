import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPinned,
  Navigation,
  Ship,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type OperationStatus = "active" | "attention" | "planned";

type Operation = {
  id: string;
  name: string;
  vessel: string;
  route: string;
  schedule: string;
  status: OperationStatus;
};

const operations: Operation[] = [];

function Operations() {
  const navigate = useNavigate();

  const active = operations.filter(
    (operation) => operation.status === "active",
  ).length;

  const attention = operations.filter(
    (operation) => operation.status === "attention",
  ).length;

  const planned = operations.filter(
    (operation) => operation.status === "planned",
  ).length;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/operator")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Operations
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Ship size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Operator
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Operations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Keep current vessel operations, schedules and route context in one
              place.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Summary label="Active" value={active} />
        <Summary label="Attention" value={attention} />
        <Summary label="Planned" value={planned} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Current operations
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Vessel operations from the connected operator workspace.
          </p>
        </div>

        {operations.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Navigation size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No operation data available
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Operations will appear here when vessel and route information is
              connected to the operator account.
            </p>

            <button
              type="button"
              onClick={() => navigate("/operator/fleet")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open fleet
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {operations.map((operation) => (
              <button
                key={operation.id}
                type="button"
                className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Ship size={19} strokeWidth={1.9} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {operation.name}
                    </p>

                    <StatusBadge status={operation.status} />
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Vessel: {operation.vessel}</p>
                    <p>Route: {operation.route}</p>
                    <p>Schedule: {operation.schedule}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Operations and ORCA decisions
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              An operational change should be connected to the vessel, route
              and decision it affects rather than becoming an isolated alert.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OperationStatus;
}) {
  const styles: Record<OperationStatus, string> = {
    active: "bg-emerald-50 text-emerald-700",
    attention: "bg-amber-50 text-amber-700",
    planned: "bg-blue-50 text-blue-700",
  };

  const labels: Record<OperationStatus, string> = {
    active: "Active",
    attention: "Attention",
    planned: "Planned",
  };

  return (
    <span
      className={[
        "rounded-lg px-2.5 py-1 text-[10px] font-semibold",
        styles[status],
      ].join(" ")}
    >
      {labels[status]}
    </span>
  );
}

export default Operations;