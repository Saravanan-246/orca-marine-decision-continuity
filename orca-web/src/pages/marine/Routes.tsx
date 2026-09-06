import {
  ArrowLeft,
  Clock3,
  MapPinned,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Routes() {
  const navigate = useNavigate();

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
            <RouteIcon size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Routes
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review route context when a trip or vessel route is available.
            </p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <MapPinned
            size={18}
            strokeWidth={1.9}
            className="text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Active route
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Route geometry appears here when configured.
            </p>
          </div>
        </div>

        <div className="m-4 flex h-[260px] items-center justify-center rounded-xl bg-slate-100 sm:m-6 sm:h-[340px]">
          <div className="max-w-xs text-center">
            <Navigation
              size={28}
              strokeWidth={1.7}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              No active route
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Create a trip and select a route before ORCA can evaluate
              route-specific dependencies.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Route context
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Route information becomes useful when connected to a decision.
          </p>
        </div>

        <div className="grid sm:grid-cols-2">
          <RouteInfo
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            label="Route"
            value="Not configured"
          />

          <RouteInfo
            icon={<Clock3 size={17} strokeWidth={1.9} />}
            label="Schedule"
            value="Not configured"
          />

          <RouteInfo
            icon={<ShieldCheck size={17} strokeWidth={1.9} />}
            label="Dependencies"
            value="Not configured"
          />

          <RouteInfo
            icon={<Navigation size={17} strokeWidth={1.9} />}
            label="Navigation"
            value="Not active"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          Route context is part of the decision
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          When a route is attached to a decision, ORCA can later evaluate
          changes against the route and identify which part of the commitment
          is affected.
        </p>
      </section>
    </section>
  );
}

function RouteInfo({
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

export default Routes;