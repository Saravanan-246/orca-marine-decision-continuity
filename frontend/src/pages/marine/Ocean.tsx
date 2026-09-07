import {
  ArrowLeft,
  Compass,
  Gauge,
  Navigation,
  RefreshCw,
  Waves,
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

function Ocean() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const waveLive = marineValueIsLive(state?.wave);
  const currentLive = marineValueIsLive(state?.current);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/marine")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Marine
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Waves size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Ocean
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              View ocean conditions relevant to your marine area.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Ocean state
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {marineRecordStatus(state, loading, error)}
            </p>
          </div>

          <Waves
            size={19}
            className="text-blue-600"
            strokeWidth={1.9}
          />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-950">
            {error
              ? "Ocean source request failed"
              : waveLive
                ? "Connected ocean observation"
                : "No connected ocean observation"}
          </p>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {error
              ? error
              : waveLive
                ? `${marineSourceLabel(state)} · observed ${formatObservedTime(state?.timestamp)}`
                : "ORCA will display ocean observations only when a verified source is available for the relevant location."}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Ocean conditions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            These values can become evidence for a decision when available.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <OceanMetric
            icon={<Waves size={18} strokeWidth={1.9} />}
            label="Wave height"
            value={formatMarineValue(state?.wave)}
            live={waveLive}
          />

          <OceanMetric
            icon={<Navigation size={18} strokeWidth={1.9} />}
            label="Wave direction"
          />

          <OceanMetric
            icon={<Compass size={18} strokeWidth={1.9} />}
            label="Current"
            value={formatMarineValue(state?.current)}
            live={currentLive}
          />

          <OceanMetric
            icon={<Gauge size={18} strokeWidth={1.9} />}
            label="Sea level"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Observation status
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          <StatusRow label="Source" value={marineSourceLabel(state)} />
          <StatusRow
            label="Observed"
            value={state ? formatObservedTime(state.timestamp) : "Unavailable"}
          />
          <StatusRow label="Freshness" value={marineFreshnessLabel(state)} />
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
        <RefreshCw
          size={16}
          strokeWidth={1.9}
          className="text-slate-400"
        />

        <p className="text-xs leading-5 text-slate-500">
          Ocean observations are never presented as current when their source
          state is unknown.
        </p>
      </div>
    </section>
  );
}

function OceanMetric({
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

function StatusRow({
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

export default Ocean;