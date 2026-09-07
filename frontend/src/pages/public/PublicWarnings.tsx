import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type WarningLevel = "critical" | "warning" | "information";

type PublicWarning = {
  id: string;
  title: string;
  description: string;
  area: string;
  level: WarningLevel;
  issuedAt: string;
};

const warnings: PublicWarning[] = [];

function levelStyles(level: WarningLevel) {
  switch (level) {
    case "critical":
      return {
        box: "border-red-200 bg-red-50",
        icon: "bg-white text-red-600",
        badge: "bg-red-100 text-red-700",
      };

    case "warning":
      return {
        box: "border-amber-200 bg-amber-50",
        icon: "bg-white text-amber-600",
        badge: "bg-amber-100 text-amber-700",
      };

    case "information":
      return {
        box: "border-blue-200 bg-blue-50",
        icon: "bg-white text-blue-600",
        badge: "bg-blue-100 text-blue-700",
      };
  }
}

function PublicWarnings() {
  const navigate = useNavigate();

  const hasWarnings = warnings.length > 0;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/public")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Public
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldAlert size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Public
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Warnings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              View official marine warnings that are relevant to the public.
            </p>
          </div>
        </div>
      </header>

      {/* Current state */}
      <section
        className={[
          "rounded-2xl border p-4 sm:p-5",
          hasWarnings
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              hasWarnings
                ? "bg-white text-amber-600"
                : "bg-white text-emerald-600",
            ].join(" ")}
          >
            {hasWarnings ? (
              <AlertTriangle size={19} strokeWidth={1.9} />
            ) : (
              <CheckCircle2 size={19} strokeWidth={1.9} />
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Current warning status
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {hasWarnings
                ? `${warnings.length} active warning${
                    warnings.length === 1 ? "" : "s"
                  }`
                : "No verified warnings available"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {hasWarnings
                ? "Review the warning details and affected area."
                : "This means ORCA has no verified public warning record to display for the current view."}
            </p>
          </div>
        </div>
      </section>

      {/* Warnings */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Official warnings
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Warning information should retain its source and issue time.
          </p>
        </div>

        {warnings.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <ShieldAlert size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No warning records
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              ORCA is not generating warnings itself. Verified public warnings
              will appear when an authorized source provides them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {warnings.map((warning) => {
              const styles = levelStyles(warning.level);

              return (
                <article
                  key={warning.id}
                  className="p-4 sm:p-6"
                >
                  <div
                    className={[
                      "rounded-2xl border p-4",
                      styles.box,
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          styles.icon,
                        ].join(" ")}
                      >
                        <AlertTriangle
                          size={19}
                          strokeWidth={1.9}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-950">
                            {warning.title}
                          </h3>

                          <span
                            className={[
                              "rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase",
                              styles.badge,
                            ].join(" ")}
                          >
                            {warning.level}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {warning.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPinned size={13} />
                            {warning.area}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={13} />
                            {warning.issuedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Map */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <MapPinned
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              View warning areas
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              When warning geometry is available, ORCA can show the affected
              area on the public marine map.
            </p>

            <button
              type="button"
              onClick={() => navigate("/public/map")}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open public map
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

export default PublicWarnings;