import {
  AlertTriangle,
  ArrowRight,
  CloudSun,
  Compass,
  Fish,
  MapPinned,
  Navigation,
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
  overallStatusNote,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

type MarineSectionProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
};

function Marine() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const waveText = formatMarineValue(state?.wave);
  const windText = formatMarineValue(state?.wind);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Waves size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Marine conditions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore the marine information that can support your trip and
              decisions.
            </p>
          </div>
        </div>
      </header>

      {/* Primary map */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned
                size={18}
                strokeWidth={1.9}
                className="text-blue-600"
              />

              <h2 className="text-sm font-semibold text-slate-950">
                Marine map
              </h2>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              View your position and available marine context.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/fisherman/map")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            Open
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Current observations
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Values come from GET /marine/state/latest. Missing fields stay
            unavailable.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ObservationCard
            icon={<Waves size={18} strokeWidth={1.9} />}
            label="Wave"
            value={waveText}
            live={marineValueIsLive(state?.wave)}
          />
          <ObservationCard
            icon={<Wind size={18} strokeWidth={1.9} />}
            label="Wind"
            value={windText}
            live={marineValueIsLive(state?.wind)}
          />
        </div>

        <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <MetaRow label="Status" value={marineRecordStatus(state, loading, error)} />
          <MetaRow label="Source" value={marineSourceLabel(state)} />
          <MetaRow
            label="Observed"
            value={state ? formatObservedTime(state.timestamp) : "Unavailable"}
          />
          <MetaRow label="Freshness" value={marineFreshnessLabel(state)} />
        </div>
      </section>

      {/* Current overview */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Marine overview
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Open a section for the detailed marine information available to
            ORCA.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MarineSection
            icon={<CloudSun size={19} strokeWidth={1.9} />}
            title="Weather"
            description="Weather conditions relevant to your marine area."
            path="/marine/weather"
            onOpen={navigate}
          />

          <MarineSection
            icon={<Waves size={19} strokeWidth={1.9} />}
            title="Ocean"
            description="Ocean conditions and related marine observations."
            path="/marine/ocean"
            onOpen={navigate}
          />

          <MarineSection
            icon={<Fish size={19} strokeWidth={1.9} />}
            title="PFZ"
            description="Potential fishing zone information when available."
            path="/marine/pfz"
            onOpen={navigate}
          />

          <MarineSection
            icon={<AlertTriangle size={19} strokeWidth={1.9} />}
            title="Hazards"
            description="Relevant marine hazards and warnings."
            path="/marine/hazards"
            onOpen={navigate}
          />

          <MarineSection
            icon={<Navigation size={19} strokeWidth={1.9} />}
            title="Routes"
            description="Routes and route-related marine context."
            path="/marine/routes"
            onOpen={navigate}
          />

          <MarineSection
            icon={<Compass size={19} strokeWidth={1.9} />}
            title="Location"
            description="Current location and marine area context."
            path="/fisherman/map"
            onOpen={navigate}
          />
        </div>
      </section>

      {/* Data handling */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Wind
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Data status matters
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {overallStatusNote(state, loading, error)}
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function ObservationCard({
  icon,
  label,
  value,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  live: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="max-w-[70%] text-right text-xs font-medium text-slate-500">
        {value}
      </span>
    </div>
  );
}

function MarineSection({
  icon,
  title,
  description,
  path,
  onOpen,
}: MarineSectionProps & {
  onOpen: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(path)}
      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">
            {title}
          </span>

          <ArrowRight
            size={16}
            strokeWidth={1.9}
            className="shrink-0 text-slate-400 transition group-hover:text-blue-600"
          />
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

export default Marine;