import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  Ship,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type VesselStatus =
  | "available"
  | "at-sea"
  | "attention"
  | "offline";

type Vessel = {
  id: string;
  name: string;
  status: VesselStatus;
  route: string;
};

const vessels: Vessel[] = [];

const statusLabels: Record<VesselStatus, string> = {
  available: "Available",
  "at-sea": "At sea",
  attention: "Attention",
  offline: "Offline",
};

function Fleet() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<VesselStatus | "all">("all");

  const filteredVessels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return vessels.filter((vessel) => {
      const matchesQuery =
        !normalizedQuery ||
        vessel.name.toLowerCase().includes(normalizedQuery) ||
        vessel.route.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" ||
        vessel.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: vessels.length,
      available: vessels.filter(
        (vessel) => vessel.status === "available",
      ).length,
      "at-sea": vessels.filter(
        (vessel) => vessel.status === "at-sea",
      ).length,
      attention: vessels.filter(
        (vessel) => vessel.status === "attention",
      ).length,
      offline: vessels.filter(
        (vessel) => vessel.status === "offline",
      ).length,
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/operator")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Operations
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Ship size={21} strokeWidth={1.9} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                Operator
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Fleet
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Manage vessels and keep their operational context together.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Plus size={17} strokeWidth={2} />
            <span className="hidden sm:inline">Add vessel</span>
          </button>
        </div>
      </header>

      {/* Fleet summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FleetStat
          label="All vessels"
          value={statusCounts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />

        <FleetStat
          label="Available"
          value={statusCounts.available}
          active={statusFilter === "available"}
          onClick={() => setStatusFilter("available")}
        />

        <FleetStat
          label="At sea"
          value={statusCounts["at-sea"]}
          active={statusFilter === "at-sea"}
          onClick={() => setStatusFilter("at-sea")}
        />

        <FleetStat
          label="Attention"
          value={statusCounts.attention}
          active={statusFilter === "attention"}
          onClick={() => setStatusFilter("attention")}
        />

        <FleetStat
          label="Offline"
          value={statusCounts.offline}
          active={statusFilter === "offline"}
          onClick={() => setStatusFilter("offline")}
        />
      </section>

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
              placeholder="Search vessels or routes"
              aria-label="Search vessels"
              className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === "all" ? "attention" : "all",
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <SlidersHorizontal size={16} strokeWidth={1.9} />
            {statusFilter === "all"
              ? "Filter"
              : statusLabels[statusFilter]}
          </button>
        </div>
      </section>

      {/* Fleet list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Vessels
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredVessels.length} vessel
                {filteredVessels.length === 1 ? "" : "s"} shown
              </p>
            </div>

            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="text-xs font-semibold text-blue-600"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {filteredVessels.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Ship size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No vessel data available
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your connected fleet will appear here when vessel information is
              available to the operator account.
            </p>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              Add vessel
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredVessels.map((vessel) => (
              <button
                key={vessel.id}
                type="button"
                onClick={() =>
                  navigate(`/operator/fleet/${vessel.id}`)
                }
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Ship size={19} strokeWidth={1.9} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {vessel.name}
                    </p>

                    <StatusBadge status={vessel.status} />
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {vessel.route}
                  </p>
                </div>

                <ChevronRight
                  size={17}
                  strokeWidth={1.9}
                  className="shrink-0 text-slate-400"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Operational note */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          Fleet context feeds operational decisions
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Once connected, vessel status, route context and marine conditions can
          become part of the operational decisions ORCA monitors.
        </p>
      </section>
    </section>
  );
}

function FleetStat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 text-left transition",
        active
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-medium",
          active ? "text-blue-600" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: VesselStatus;
}) {
  const styles: Record<VesselStatus, string> = {
    available: "bg-emerald-50 text-emerald-700",
    "at-sea": "bg-blue-50 text-blue-700",
    attention: "bg-amber-50 text-amber-700",
    offline: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={[
        "rounded-lg px-2 py-1 text-[10px] font-semibold",
        styles[status],
      ].join(" ")}
    >
      {statusLabels[status]}
    </span>
  );
}

export default Fleet;