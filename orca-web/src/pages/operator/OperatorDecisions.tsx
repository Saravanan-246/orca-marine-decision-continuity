import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  FileText,
  MapPinned,
  Ship,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { readApiError } from "../../api/client";
import { listCommitments } from "../../api/orca";
import type { MarineCommitment } from "../../api/types";

type DecisionStatus =
  | "active"
  | "attention"
  | "monitoring";

type OperatorDecision = {
  id: string;
  title: string;
  vessel: string;
  route: string;
  status: DecisionStatus;
};

function mapStatus(state: string): DecisionStatus {
  if (state === "VIOLATED" || state === "AT_RISK") {
    return "attention";
  }
  if (state === "VALID" || state === "REPAIRED") {
    return "monitoring";
  }
  return "active";
}

function toOperatorDecision(item: MarineCommitment): OperatorDecision {
  return {
    id: item.commitment_id,
    title: item.decision_summary,
    vessel: item.stakeholder_type,
    route: item.decision_type,
    status: mapStatus(item.state),
  };
}

function statusStyles(status: DecisionStatus) {
  switch (status) {
    case "active":
      return "bg-blue-50 text-blue-700";

    case "attention":
      return "bg-amber-50 text-amber-700";

    case "monitoring":
      return "bg-emerald-50 text-emerald-700";
  }
}

function statusLabel(status: DecisionStatus) {
  switch (status) {
    case "active":
      return "Active";

    case "attention":
      return "Needs attention";

    case "monitoring":
      return "Monitoring";
  }
}

function OperatorDecisions() {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<OperatorDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const items = await listCommitments();
        if (!cancelled) {
          setDecisions(items.map(toOperatorDecision));
        }
      } catch (cause) {
        if (!cancelled) {
          setError(readApiError(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const attentionCount = decisions.filter(
    (decision) => decision.status === "attention",
  ).length;

  const monitoringCount = decisions.filter(
    (decision) => decision.status === "monitoring",
  ).length;

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Operator
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Operational decisions
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review decisions connected to vessels, routes and changing
              operational conditions.
            </p>
          </div>
        </div>
      </header>

      {loading && (
        <p className="text-sm text-slate-500">Loading decisions…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Summary */}
      <section className="grid grid-cols-3 gap-3">
        <DecisionSummary
          label="All"
          value={decisions.length}
        />

        <DecisionSummary
          label="Monitoring"
          value={monitoringCount}
        />

        <DecisionSummary
          label="Attention"
          value={attentionCount}
        />
      </section>

      {/* Decisions */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Current decisions
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Operational decisions and their current state.
          </p>
        </div>

        {decisions.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Compass size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No operational decisions
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {loading
                ? "Loading operational commitments from the ORCA core."
                : "Decisions will appear here when commitments exist on the ORCA core."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {decisions.map((decision) => (
              <button
                key={decision.id}
                type="button"
                onClick={() => {
                  localStorage.setItem(
                    "orca:session:commitment-id",
                    decision.id,
                  );
                  navigate("/monitoring");
                }}
                className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={19} strokeWidth={1.9} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {decision.title}
                    </h3>

                    <span
                      className={[
                        "rounded-lg px-2 py-1 text-[10px] font-semibold",
                        statusStyles(decision.status),
                      ].join(" ")}
                    >
                      {statusLabel(decision.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:gap-5">
                    <span className="inline-flex items-center gap-1.5">
                      <Ship size={13} />
                      {decision.vessel}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <MapPinned size={13} />
                      {decision.route}
                    </span>
                  </div>
                </div>

                <ArrowRight
                  size={17}
                  strokeWidth={1.9}
                  className="mt-1 shrink-0 text-slate-400"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Decision evidence */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Decision evidence
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Operational decisions can depend on multiple marine and vessel
                conditions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2">
          <EvidenceItem
            icon={<Ship size={17} strokeWidth={1.9} />}
            title="Vessel"
            description="Operational vessel context"
          />

          <EvidenceItem
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            title="Route"
            description="Current route context"
          />

          <EvidenceItem
            icon={<Waves size={17} strokeWidth={1.9} />}
            title="Marine conditions"
            description="Relevant marine evidence"
          />

          <EvidenceItem
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
            title="Operational impact"
            description="Changes that may affect the decision"
          />
        </div>
      </section>

      {/* ORCA behavior */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Decisions stay connected
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              ORCA can keep an operational decision linked to its vessel,
              route, commitments and monitored dependencies instead of treating
              each alert as an isolated event.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function DecisionSummary({
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

function EvidenceItem({
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

export default OperatorDecisions;