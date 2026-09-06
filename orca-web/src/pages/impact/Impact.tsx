import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  GitCompare,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { isNotFoundError, readApiError } from "../../api/client";
import { getCommitment } from "../../api/orca";
import type { MarineCommitment, ReevaluateResponse } from "../../api/types";
import {
  formatSegmentIds,
  getActiveCommitmentId,
  isolationFromCommitment,
  discardStaleMonitor,
  clearLastMonitor,
  clearLocalCommitment,
  readLastMonitor,
  readLocalCommitment,
} from "../../lib/orcaSession";

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function Impact() {
  const navigate = useNavigate();
  const local = readLocalCommitment();
  const commitmentId = getActiveCommitmentId();

  const [server, setServer] = useState<MarineCommitment | null>(null);
  const [monitor, setMonitor] = useState<ReevaluateResponse | null>(
    () => readLastMonitor(),
  );
  const [loading, setLoading] = useState(Boolean(commitmentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!commitmentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const commitment = await getCommitment(commitmentId);
        if (cancelled) return;
        setServer(commitment);
        setMonitor(discardStaleMonitor(commitment));
      } catch (cause) {
        if (!cancelled) {
          setServer(null);
          setMonitor(null);
          if (isNotFoundError(cause)) {
            clearLocalCommitment();
            clearLastMonitor();
            setError(
              "This commitment is no longer on the server. Create it again.",
            );
          } else {
            setError(readApiError(cause));
          }
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
  }, [commitmentId]);

  if (!commitmentId && !local) {
    return (
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Home
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <GitCompare size={22} strokeWidth={1.9} />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-950">
            No commitment to evaluate
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            An impact can only be evaluated after a decision has been turned
            into an active commitment.
          </p>

          <button
            type="button"
            onClick={() => navigate("/commitment")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open commitment
            <ArrowRight size={17} strokeWidth={2} />
          </button>
        </div>
      </section>
    );
  }

  const derived = server ? isolationFromCommitment(server) : null;
  const isolation = monitor?.segment_isolation ?? derived;
  const impact = monitor?.impact_analysis;
  const state = server?.state ?? monitor?.state;
  const hasImpact =
    state === "VIOLATED" ||
    state === "AT_RISK" ||
    (isolation?.affected_segment_ids.length ?? 0) > 0;
  const canRepair = server?.state === "VIOLATED";
  const title =
    server?.decision_summary ?? local?.trip.title ?? "Commitment";
  const schedule = local
    ? `${formatDate(local.trip.date)} · ${local.trip.departure}–${local.trip.returnTime}`
    : "From commitment";
  const area = local?.trip.area ?? "From commitment";
  const conditions = monitor?.results ?? server?.dependencies ?? [];

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/monitoring")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Monitoring
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <GitCompare size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Impact
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              See whether a change in marine conditions has affected your
              commitment.
            </p>
          </div>
        </div>
      </header>

      {loading && (
        <p className="text-sm text-slate-500">Loading impact…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!monitor && !derived && !loading && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No monitoring result is stored yet. Run evaluation on the monitoring
          page first.
        </p>
      )}

      {/* Current commitment */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Commitment
            </p>

            <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
              {title}
            </h2>
          </div>

          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              hasImpact
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {hasImpact ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {state ?? (loading ? "Loading" : "Unknown")}
          </span>
        </div>

        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <ContextItem
            icon={<Clock3 size={17} strokeWidth={1.9} />}
            label="Schedule"
            value={schedule}
          />

          <ContextItem
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            label="Area"
            value={area}
          />
        </div>
      </section>

      {/* Current impact state */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              hasImpact
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600",
            ].join(" ")}
          >
            {hasImpact ? (
              <AlertTriangle size={21} strokeWidth={1.9} />
            ) : (
              <CheckCircle2 size={21} strokeWidth={1.9} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
              Current state
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {loading
                ? "Loading impact…"
                : error && !server
                  ? "Impact could not be loaded"
                  : hasImpact
                    ? (impact?.operational_impact ?? "Impact detected")
                    : "No impact detected"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {hasImpact
                ? `Affected: ${formatSegmentIds(isolation?.affected_segment_ids ?? [])}. Preserved: ${formatSegmentIds(isolation?.unaffected_segment_ids ?? [])}.`
                : "There is no recorded dependency violation for this commitment from the last monitoring result."}
            </p>
          </div>
        </div>
      </section>

      {hasImpact && isolation && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-950">
              Affected vs preserved segments
            </h2>
          </div>
          <div className="grid sm:grid-cols-2">
            <div className="px-4 py-4 sm:px-6">
              <p className="text-xs font-medium text-slate-400">Affected</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatSegmentIds(isolation.affected_segment_ids)}
              </p>
            </div>
            <div className="border-t border-slate-100 px-4 py-4 sm:border-t-0 sm:px-6">
              <p className="text-xs font-medium text-slate-400">Preserved</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatSegmentIds(isolation.unaffected_segment_ids)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* What ORCA checks */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Waves size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Conditions being evaluated
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                A future impact is created only when relevant monitored
                conditions actually change.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {conditions.map((item) => {
            const name =
              "parameter" in item ? String(item.parameter) : item.dependency_id;
            const status =
              "status" in item ? String(item.status) : "UNKNOWN";
            const dataStatus =
              "data_status" in item && item.data_status
                ? String(item.data_status)
                : null;

            return (
              <DependencyRow
                key={"dependency_id" in item ? item.dependency_id : name}
                icon={<Waves size={16} strokeWidth={1.9} />}
                name={name}
                status={dataStatus ? `${status} · ${dataStatus}` : status}
              />
            );
          })}
        </div>
      </section>

      {/* Impact behavior */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              When a change happens
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              ORCA compares the new marine condition against the commitment,
              identifies the affected part, preserves what remains valid and
              sends the result to the repair stage when action is needed.
            </p>
          </div>
        </div>
      </section>

      {/* Next */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          {canRepair
            ? "Repair is available"
            : hasImpact
              ? "Impact recorded"
              : "No repair is required"}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {canRepair
            ? "A ranked repair can be requested for the affected segments."
            : hasImpact
              ? `Repair proposal requires a violated commitment (current state: ${state}).`
              : "Repair becomes available only after ORCA detects a meaningful impact on the active commitment."}
        </p>

        {canRepair ? (
          <button
            type="button"
            onClick={() => navigate("/repair")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open repair
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/monitoring")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Return to monitoring
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        )}
      </section>
    </section>
  );
}

function ContextItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium leading-5 text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function DependencyRow({
  icon,
  name,
  status,
}: {
  icon: ReactNode;
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <span className="text-slate-400">
        {icon}
      </span>

      <span className="text-sm font-medium text-slate-700">
        {name}
      </span>

      <span className="ml-auto text-xs font-medium text-slate-400">
        {status}
      </span>
    </div>
  );
}

export default Impact;
