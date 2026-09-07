import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  MapPinned,
  Navigation,
  Ship,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type VesselState = {
  name: string;
  status: "available" | "at-sea" | "attention" | "offline";
};

const STATUS_TEXT: Record<VesselState["status"], string> = {
  available: "Available",
  "at-sea": "At sea",
  attention: "Needs attention",
  offline: "Offline",
};

function VesselDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const vessel: VesselState = {
    name: id ? `Vessel ${id}` : "Vessel",
    status: "offline",
  };

  const isAttention = vessel.status === "attention";
  const isAtSea = vessel.status === "at-sea";

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/operator/fleet")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Fleet
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Ship size={21} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                Vessel
              </p>

              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {vessel.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {id ?? "No vessel identifier"}
              </p>
            </div>
          </div>

          <span
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
              vessel.status === "available"
                ? "bg-emerald-50 text-emerald-700"
                : vessel.status === "at-sea"
                  ? "bg-blue-50 text-blue-700"
                  : vessel.status === "attention"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {STATUS_TEXT[vessel.status]}
          </span>
        </div>
      </header>

      {/* Status */}
      <section
        className={[
          "rounded-2xl border p-4 sm:p-5",
          isAttention
            ? "border-amber-200 bg-amber-50"
            : isAtSea
              ? "border-blue-200 bg-blue-50"
              : "border-slate-200 bg-slate-50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
            {isAttention ? (
              <AlertTriangle
                size={19}
                className="text-amber-600"
              />
            ) : isAtSea ? (
              <Navigation
                size={19}
                className="text-blue-600"
              />
            ) : (
              <ShieldCheck
                size={19}
                className="text-slate-500"
              />
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Vessel status
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {STATUS_TEXT[vessel.status]}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Live vessel information will replace this state when the fleet
              data source is connected.
            </p>
          </div>
        </div>
      </section>

      {/* Vessel context */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Vessel context
          </h2>
        </div>

        <div className="grid sm:grid-cols-2">
          <ContextRow
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            label="Location"
            value="Unavailable"
          />

          <ContextRow
            icon={<Compass size={17} strokeWidth={1.9} />}
            label="Route"
            value="Not assigned"
          />

          <ContextRow
            icon={<Navigation size={17} strokeWidth={1.9} />}
            label="Operation"
            value="Not assigned"
          />

          <ContextRow
            icon={<Waves size={17} strokeWidth={1.9} />}
            label="Marine state"
            value="Unavailable"
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
              Operational dependencies
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Conditions that can become relevant to decisions involving this
              vessel.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <Dependency
            label="Route condition"
            state="Not evaluated"
          />

          <Dependency
            label="Marine conditions"
            state="Not evaluated"
          />

          <Dependency
            label="Hazards"
            state="Not evaluated"
          />

          <Dependency
            label="Operational commitment"
            state="Not assigned"
          />
        </div>
      </section>

      {/* Actions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Vessel actions
        </h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/operator/map")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <MapPinned size={16} />
            View on map
          </button>

          <button
            type="button"
            onClick={() => navigate("/operator/decisions")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <CheckCircle2 size={16} />
            View decisions
          </button>
        </div>
      </section>
    </section>
  );
}

function ContextRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function Dependency({
  label,
  state,
}: {
  label: string;
  state: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <span className="text-xs font-medium text-slate-400">
        {state}
      </span>
    </div>
  );
}

export default VesselDetails;