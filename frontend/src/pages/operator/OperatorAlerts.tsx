import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldAlert,
  Ship,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type AlertSeverity = "critical" | "warning" | "info";

type OperatorAlert = {
  id: string;
  title: string;
  description: string;
  vessel?: string;
  severity: AlertSeverity;
  time: string;
};

const alerts: OperatorAlert[] = [];

const severityStyles: Record<
  AlertSeverity,
  {
    badge: string;
    icon: string;
  }
> = {
  critical: {
    badge: "bg-red-50 text-red-700",
    icon: "bg-red-50 text-red-600",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700",
    icon: "bg-amber-50 text-amber-600",
  },
  info: {
    badge: "bg-blue-50 text-blue-700",
    icon: "bg-blue-50 text-blue-600",
  },
};

function OperatorAlerts() {
  const navigate = useNavigate();

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.severity === "warning",
  ).length;

  const hasAlerts = alerts.length > 0;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
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

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Bell size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Operator
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Alerts
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Review operational conditions that may require attention.
            </p>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-3 gap-3">
        <AlertSummary
          label="Total"
          value={alerts.length}
        />

        <AlertSummary
          label="Critical"
          value={criticalCount}
        />

        <AlertSummary
          label="Warning"
          value={warningCount}
        />
      </section>

      {/* Alert state */}
      {hasAlerts ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-950">
              Active alerts
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Operational alerts from connected services.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => {
              const styles = severityStyles[alert.severity];

              return (
                <button
                  key={alert.id}
                  type="button"
                  className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"
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
                        {alert.title}
                      </h3>

                      <span
                        className={[
                          "rounded-lg px-2 py-1 text-[10px] font-semibold uppercase",
                          styles.badge,
                        ].join(" ")}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {alert.description}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {alert.vessel && (
                        <span>{alert.vessel}</span>
                      )}

                      <span>{alert.time}</span>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    strokeWidth={1.9}
                    className="mt-1 shrink-0 text-slate-400"
                  />
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={22} strokeWidth={1.9} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No active alerts
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              There are no verified operational alerts available for the
              current operator context.
            </p>
          </div>
        </section>
      )}

      {/* Alert sources */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Alert sources
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            These are the operational inputs that can produce an alert when
            connected.
          </p>
        </div>

        <div className="grid sm:grid-cols-2">
          <SourceItem
            icon={<Ship size={17} strokeWidth={1.9} />}
            title="Vessel status"
            description="Operational or vessel-state changes"
          />

          <SourceItem
            icon={<Waves size={17} strokeWidth={1.9} />}
            title="Marine conditions"
            description="Relevant changes in marine conditions"
          />

          <SourceItem
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            title="Route context"
            description="Route or location-related changes"
          />

          <SourceItem
            icon={<ShieldAlert size={17} strokeWidth={1.9} />}
            title="Safety conditions"
            description="Verified hazards affecting operations"
          />
        </div>
      </section>

      {/* Operational behavior */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Clock3
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Alerts are contextual
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              ORCA should connect an alert to the operation, vessel, route or
              decision it affects instead of producing isolated notifications.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function AlertSummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SourceItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default OperatorAlerts;