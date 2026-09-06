import {
  AlertTriangle,
  ChevronRight,
  MapPinned,
  ShieldAlert,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useLatestMarineState } from "../../lib/useLatestMarineState";

type Hazard = {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  area: string;
  status: "active" | "watch" | "unavailable";
  source?: string;
};

function severityStyles(severity: Hazard["severity"]) {
  switch (severity) {
    case "high":
      return {
        badge: "bg-red-50 text-red-700",
        icon: "bg-red-50 text-red-600",
      };

    case "medium":
      return {
        badge: "bg-amber-50 text-amber-700",
        icon: "bg-amber-50 text-amber-600",
      };

    case "low":
      return {
        badge: "bg-slate-100 text-slate-600",
        icon: "bg-slate-100 text-slate-500",
      };
  }
}

function mapHazards(
  records: Record<string, unknown>[] | undefined,
  live: boolean,
): Hazard[] {
  if (!live || !records) {
    return [];
  }

  const mapped: Hazard[] = [];
  records.forEach((record, index) => {
    const title = record.title ?? record.type ?? record.name;
    if (typeof title !== "string" || !title.trim()) {
      return;
    }
    const severity = record.severity;
    mapped.push({
      id: String(record.id ?? `hazard-${index}`),
      title,
      severity:
        severity === "high" || severity === "medium" || severity === "low"
          ? severity
          : "low",
      area: typeof record.area === "string" ? record.area : "Unspecified area",
      status: "active",
      source: typeof record.source === "string" ? record.source : undefined,
    });
  });
  return mapped;
}

function Hazards() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const live =
    state?.data_status === "REAL" || state?.data_status === "SIMULATED";
  const hazards = mapHazards(state?.hazards, live);

  const activeHazards = hazards.filter(
    (hazard) => hazard.status === "active",
  );

  const watchHazards = hazards.filter(
    (hazard) => hazard.status === "watch",
  );

  const hasHazards =
    activeHazards.length > 0 || watchHazards.length > 0;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/fisherman/map")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ChevronRight
            size={16}
            className="rotate-180"
            strokeWidth={2}
          />
          Marine map
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Hazards
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review marine hazards relevant to your current area.
            </p>
          </div>
        </div>
      </header>

      {/* Current status */}
      <section
        className={[
          "rounded-2xl border p-4 sm:p-5",
          hasHazards
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              hasHazards
                ? "bg-white text-amber-600"
                : "bg-white text-emerald-600",
            ].join(" ")}
          >
            {hasHazards ? (
              <AlertTriangle size={19} strokeWidth={1.9} />
            ) : (
              <ShieldAlert size={19} strokeWidth={1.9} />
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Current status
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {hasHazards
                ? `${activeHazards.length + watchHazards.length} hazard${
                    activeHazards.length + watchHazards.length === 1
                      ? ""
                      : "s"
                  } detected`
                : "No active hazards available"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {error
                ? error
                : loading
                  ? "Checking the marine state endpoint…"
                  : hasHazards
                    ? "Review the hazard details before relying on the affected marine area."
                    : "No verified hazard records are currently available for this view."}
            </p>
          </div>
        </div>
      </section>

      {/* Hazard list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Relevant hazards
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Hazard information appears only when a connected source provides
            it.
          </p>
        </div>

        {hazards.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <MapPinned size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No verified hazard data
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              This does not mean the sea is hazard-free. It means no verified
              hazard record is currently available to ORCA for this view.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {hazards.map((hazard) => {
              const styles = severityStyles(hazard.severity);

              return (
                <div
                  key={hazard.id}
                  className="flex items-start gap-4 px-4 py-4 sm:px-6"
                >
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      styles.icon,
                    ].join(" ")}
                  >
                    <AlertTriangle
                      size={18}
                      strokeWidth={1.9}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {hazard.title}
                      </h3>

                      <span
                        className={[
                          "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                          styles.badge,
                        ].join(" ")}
                      >
                        {hazard.severity}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {hazard.area}
                    </p>

                    {hazard.source && (
                      <p className="mt-1 text-xs text-slate-400">
                        Source: {hazard.source}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Map connection */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <MapPinned size={17} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-950">
              View hazards on the map
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              When verified hazard geometry is available, ORCA can place it
              directly on the marine map.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fisherman/map")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open marine map
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Decision relevance */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
            <Waves size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Why hazards matter in ORCA
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Hazard information can become part of a trip decision's evidence
              and dependencies when the relevant data is available.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

export default Hazards;