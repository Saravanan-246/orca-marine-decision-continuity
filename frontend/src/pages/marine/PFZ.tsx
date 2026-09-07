import {
  ArrowLeft,
  Fish,
  MapPinned,
  RefreshCw,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  formatMarineValue,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function PFZ() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const pfzValue = formatMarineValue(state?.pfz);

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
            <Fish size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Potential fishing zones
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              View PFZ information when an authorized and current source is
              available.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPinned size={19} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              PFZ status
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {loading
                ? "Checking PFZ source…"
                : error
                  ? "PFZ source request failed"
                  : pfzValue === "Unavailable"
                    ? "No verified PFZ data"
                    : pfzValue}
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {error
                ? error
                : "ORCA does not create a fishing zone just to fill the map. A PFZ appears only when a valid source provides current information."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            PFZ context
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            When available, PFZ information can provide context alongside
            marine conditions and trip location.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          <InfoRow label="Area" value="Unavailable" />
          <InfoRow label="Source" value={state?.pfz?.source ?? state?.sources?.[0] ?? "Unavailable"} />
          <InfoRow label="Issued" value={state?.timestamp ?? "Unavailable"} />
          <InfoRow label="Freshness" value={state?.freshness ?? "Unknown"} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Waves
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Use PFZ with context
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              A PFZ is one marine input. ORCA can combine available marine
              evidence with the trip decision and its dependencies.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <RefreshCw
          size={16}
          strokeWidth={1.9}
          className="text-slate-400"
        />

        <p className="text-xs leading-5 text-slate-500">
          PFZ information is source-dependent and should always carry its
          freshness context.
        </p>
      </div>
    </section>
  );
}

function InfoRow({
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

export default PFZ;