import {
  AlertTriangle,
  ArrowRight,
  CloudSun,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { hazardRecords } from "../../lib/roleWorkspace";
import {
  formatMarineValue,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function PublicHome() {
  const navigate = useNavigate();
  const { state } = useLatestMarineState();
  const hazards = hazardRecords(state?.hazards);
  const waveLive = marineValueIsLive(state?.wave);
  const windLive = marineValueIsLive(state?.wind);

  return (
    <section className="space-y-5 sm:space-y-6">
      {/* Header */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          PUBLIC
        </p>

        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Marine information
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          View verified marine conditions, map context and important warnings
          available for the public.
        </p>
      </section>

      {/* Primary actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          icon={<MapPinned size={19} strokeWidth={1.9} />}
          title="Explore marine map"
          description="View the marine area and available public map context."
          onClick={() => navigate("/public/map")}
        />

        <ActionCard
          icon={<CloudSun size={19} strokeWidth={1.9} />}
          title="Marine conditions"
          description="Check available weather and ocean information."
          onClick={() => navigate("/public/conditions")}
        />
      </section>

      {/* Current status */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Current marine status
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Public information is shown only when a verified source is
              available.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <StatusItem
            icon={<Waves size={17} strokeWidth={1.9} />}
            label="Ocean"
            value={formatMarineValue(state?.wave)}
            live={waveLive}
          />

          <StatusItem
            icon={<CloudSun size={17} strokeWidth={1.9} />}
            label="Weather"
            value={formatMarineValue(state?.wind)}
            live={windLive}
          />

          <StatusItem
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
            label="Warnings"
            value={
              hazards.length > 0
                ? "Connected hazard data"
                : "No connected data"
            }
          />
        </div>
      </section>

      {/* Public warning */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Public warnings
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {hazards.length > 0
                ? hazards.map((item) => item.title).join(" · ")
                : "Verified public warnings will appear here when an authorized source provides them."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/public/warnings")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              View warnings
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Trust message */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          Information, not assumptions
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          ORCA does not present unavailable marine data as current conditions.
          Public information carries the state of its underlying source.
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

function StatusItem({
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
    <div className="px-3 py-4 sm:px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        {icon}
      </div>

      <p className="mt-2 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-xs font-semibold",
          live ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export default PublicHome;