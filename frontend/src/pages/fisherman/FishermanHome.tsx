import {
  ArrowRight,
  CloudSun,
  Compass,
  MapPinned,
  Plus,
  Waves,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";
import {
  formatTripRoute,
  readDecision,
  readLocalCommitment,
  tripRouteForMap,
} from "../../lib/orcaSession";
import {
  formatMarineValue,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

type ConditionCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  state?: "available" | "unavailable";
};

function ConditionCard({
  icon,
  label,
  value,
  state = "unavailable",
}: ConditionCardProps) {
  const isAvailable = state === "available";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          isAvailable ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function FishermanHome() {
  const navigate = useNavigate();
  const { state } = useLatestMarineState();
  const waveLive = marineValueIsLive(state?.wave);
  const windLive = marineValueIsLive(state?.wind);
  const trip = readLocalCommitment()?.trip ?? readDecision();
  const route = tripRouteForMap(trip);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Welcome */}
      <section>
        <p className="text-sm font-medium text-blue-600">
          FISHERMAN
        </p>

        <div className="mt-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Your marine workspace
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Plan your trip, check marine conditions and keep active decisions
            under watch.
          </p>
        </div>
      </section>

      {/* Current trip */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Current trip
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Your active trip appears here.
            </p>
          </div>

          <Compass
            size={19}
            strokeWidth={1.9}
            className="text-slate-400"
          />
        </div>

        <div className="px-4 py-5 sm:px-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {trip ? trip.title : "No active trip"}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {trip
                ? formatTripRoute(trip)
                : "Start planning a trip to create a decision that ORCA can keep under continuous watch."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/fisherman/trip")}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
          >
            <Plus size={17} strokeWidth={2} />
            Plan a trip
          </button>
        </div>
      </section>

      {/* Marine conditions */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Marine conditions
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Values appear when a connected source is available.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/fisherman/map")}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-blue-600"
          >
            Marine
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ConditionCard
            icon={<Waves size={19} strokeWidth={1.9} />}
            label="Wave"
            value={formatMarineValue(state?.wave)}
            state={waveLive ? "available" : "unavailable"}
          />

          <ConditionCard
            icon={<Wind size={19} strokeWidth={1.9} />}
            label="Wind"
            value={formatMarineValue(state?.wind)}
            state={windLive ? "available" : "unavailable"}
          />

          <ConditionCard
            icon={<CloudSun size={19} strokeWidth={1.9} />}
            label="Weather"
            value="Unavailable"
          />

          <ConditionCard
            icon={<Compass size={19} strokeWidth={1.9} />}
            label="Route"
            value="Not planned"
          />
        </div>
      </section>

      {/* Marine map */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              Marine map
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Your position and surrounding marine area
            </p>
          </div>

          <MapPinned
            size={19}
            strokeWidth={1.9}
            className="text-blue-600"
          />
        </div>

        <MarineMap route={route} />

        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <p className="text-xs leading-5 text-slate-500">
            Location and marine layers will appear when their sources are
            available.
          </p>

          <button
            type="button"
            onClick={() => navigate("/fisherman/map")}
            className="shrink-0 text-sm font-semibold text-blue-600"
          >
            Open
          </button>
        </div>
      </section>

      {/* Decision */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h3 className="text-base font-semibold text-slate-950">
            Active decision
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Your current decision and its dependencies appear here.
          </p>
        </div>

        <div className="px-4 py-5 sm:px-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              No active decision
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create a decision when you're ready to evaluate a trip.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/fisherman/decisions")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View decisions
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Attention */}
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Waves size={19} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-950">
              Nothing needs your attention
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              When an active decision or commitment is affected, ORCA will
              surface the change here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FishermanHome;