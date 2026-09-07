import {
  ArrowLeft,
  CloudSun,
  Droplets,
  Gauge,
  RefreshCw,
  Waves,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  formatMarineValue,
  formatObservedTime,
  marineFreshnessLabel,
  marineRecordStatus,
  marineSourceLabel,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function PublicConditions() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const waveLive = marineValueIsLive(state?.wave);
  const windLive = marineValueIsLive(state?.wind);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/public")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Public
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CloudSun size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Public
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Marine conditions
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              View public marine conditions when current verified data is
              available.
            </p>
          </div>
        </div>
      </header>

      {/* Status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Current status
        </p>

        <h2 className="mt-1 text-base font-semibold text-slate-950">
          {marineRecordStatus(state, loading, error)}
        </h2>

        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          {error
            ? error
            : state
              ? `${marineSourceLabel(state)} · observed ${formatObservedTime(state.timestamp)} · ${marineFreshnessLabel(state)}`
              : "No connected data. Select a location and persist a marine state before current conditions can be shown."}
        </p>
      </section>

      {/* Metrics */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Conditions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            No current values are being presented without verified source data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            icon={<Waves size={18} strokeWidth={1.9} />}
            label="Waves"
            value={formatMarineValue(state?.wave)}
            live={waveLive}
          />

          <Metric
            icon={<Wind size={18} strokeWidth={1.9} />}
            label="Wind"
            value={formatMarineValue(state?.wind)}
            live={windLive}
          />

          <Metric
            icon={<Droplets size={18} strokeWidth={1.9} />}
            label="Humidity"
          />

          <Metric
            icon={<Gauge size={18} strokeWidth={1.9} />}
            label="Pressure"
          />
        </div>
      </section>

      {/* Public safety */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Public safety information
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Official warnings should come from authorized sources. ORCA should
          preserve their source and freshness instead of presenting stale
          information as current.
        </p>

        <button
          type="button"
          onClick={() => navigate("/public/warnings")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View warnings
          <RefreshCw size={15} strokeWidth={1.9} />
        </button>
      </section>

      {/* Source status */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Source status
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <SourceRow
            label="Weather source"
            value={state?.wind?.source || "Unavailable"}
          />

          <SourceRow
            label="Ocean source"
            value={state?.wave?.source || "Unavailable"}
          />

          <SourceRow
            label="Public warning source"
            value={
              state?.hazards && state.hazards.length > 0
                ? "Marine state"
                : "Unavailable"
            }
          />
        </div>
      </section>
    </section>
  );
}

function Metric({
  icon,
  label,
  value = "Unavailable",
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
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

function SourceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="text-xs font-medium text-slate-400">
        {value}
      </span>
    </div>
  );
}

export default PublicConditions;