import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPinned,
  RefreshCw,
  Search,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ObservationType =
  | "ocean"
  | "weather"
  | "location"
  | "hazard";

type Observation = {
  id: string;
  type: ObservationType;
  title: string;
  area: string;
  observedAt: string;
  source: string;
  state: "available" | "unavailable";
};

const observations: Observation[] = [];

function Observations() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<ObservationType | "all">("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return observations.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.area.toLowerCase().includes(normalized) ||
        item.source.toLowerCase().includes(normalized);

      const matchesFilter =
        filter === "all" || item.type === filter;

      return matchesQuery && matchesFilter;
    });
  }, [filter, query]);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/researcher")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Research
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Waves size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Observations
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review marine observations and their source context.
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              strokeWidth={1.9}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search observations"
              className="w-full rounded-xl border border-slate-200 py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setFilter(
                filter === "all" ? "ocean" : "all",
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            {filter === "all"
              ? "Filter"
              : filter}
            <ChevronDown size={16} />
          </button>
        </div>
      </section>

      {/* Observation records */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Observation records
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {filtered.length} record
            {filtered.length === 1 ? "" : "s"} shown
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Waves size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No observation data available
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Observations will appear here when connected marine sources
              provide records.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <ObservationRow
                key={item.id}
                observation={item}
              />
            ))}
          </div>
        )}
      </section>

      {/* Data principle */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <RefreshCw
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Observation provenance
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Each observation should retain its source and observation time so
              researchers can distinguish current evidence from stale or
              unavailable data.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function ObservationRow({
  observation,
}: {
  observation: Observation;
}) {
  const icon =
    observation.type === "ocean"
      ? Waves
      : observation.type === "weather"
        ? RefreshCw
        : observation.type === "location"
          ? MapPinned
          : CalendarDays;

  const Icon = icon;

  return (
    <div className="flex items-start gap-4 px-4 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} strokeWidth={1.9} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {observation.title}
        </p>

        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:gap-5">
          <span className="inline-flex items-center gap-1.5">
            <MapPinned size={13} />
            {observation.area}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={13} />
            {observation.observedAt}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          Source: {observation.source}
        </p>
      </div>

      <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
        {observation.state}
      </span>
    </div>
  );
}

export default Observations;