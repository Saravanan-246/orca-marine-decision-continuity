import {
  AlertTriangle,
  ArrowRight,
  Compass,
  MapPinned,
  Navigation,
  Ship,
  ShieldCheck,
  Waves,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  formatMarineValue,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function OperatorHome() {
  const navigate = useNavigate();
  const { state } = useLatestMarineState();

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Header */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          MARITIME OPERATOR
        </p>

        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Operations overview
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Keep vessels, routes and operational decisions in view as marine
          conditions change.
        </p>
      </section>

      {/* Operational summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={<Ship size={18} strokeWidth={1.9} />}
          label="Vessels"
          value="No fleet data"
        />

        <SummaryCard
          icon={<Navigation size={18} strokeWidth={1.9} />}
          label="Operations"
          value="No active data"
        />

        <SummaryCard
          icon={<Compass size={18} strokeWidth={1.9} />}
          label="Routes"
          value="No route data"
        />

        <SummaryCard
          icon={<AlertTriangle size={18} strokeWidth={1.9} />}
          label="Attention"
          value="No active alerts"
        />
      </section>

      {/* Active operation */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Ship size={18} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Active operations
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Current vessel activity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/operations")}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600"
          >
            View
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="px-4 py-5 sm:px-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              No active operation
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Active vessel operations will appear here once the operator
              account is connected to operational data.
            </p>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Ship size={18} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Fleet
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Vessel availability and status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/fleet")}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600"
          >
            Fleet
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
          <FleetState
            label="Available"
            value="—"
          />

          <FleetState
            label="At sea"
            value="—"
          />

          <FleetState
            label="Attention"
            value="—"
          />

          <FleetState
            label="Offline"
            value="—"
          />
        </div>
      </section>

      {/* Marine context */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Marine conditions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Conditions relevant to current operations
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/map")}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600"
          >
            Map
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ConditionTile
            icon={<Waves size={18} strokeWidth={1.9} />}
            label="Waves"
            value={formatMarineValue(state?.wave)}
            live={marineValueIsLive(state?.wave)}
          />

          <ConditionTile
            icon={<Wind size={18} strokeWidth={1.9} />}
            label="Wind"
            value={formatMarineValue(state?.wind)}
            live={marineValueIsLive(state?.wind)}
          />

          <ConditionTile
            icon={<MapPinned size={18} strokeWidth={1.9} />}
            label="Hazards"
            value="Unavailable"
          />
        </div>
      </section>

      {/* Decision attention */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Decision attention
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              ORCA surfaces operational decisions that may be affected by
              changing conditions.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Nothing needs attention
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              When a monitored dependency changes, the affected operation can
              be surfaced here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/decisions")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View decisions
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Map shortcut */}
      <button
        type="button"
        onClick={() => navigate("/operator/map")}
        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white sm:p-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <MapPinned size={19} strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">
            Open operations map
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            View vessels, routes and relevant marine context when connected.
          </p>
        </div>

        <ArrowRight
          size={17}
          strokeWidth={1.9}
          className="shrink-0 text-slate-400"
        />
      </button>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function FleetState({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-4 text-center sm:px-5">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-600">
        {value}
      </p>
    </div>
  );
}

function ConditionTile({
  icon,
  label,
  value,
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          live ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export default OperatorHome;