import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Undo2,
  Waves,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { readApiError } from "../../api/client";
import {
  approveRepair,
  getCommitment,
  listRepairs,
  proposeRepair,
  reevaluateCommitment,
  rejectRepair,
} from "../../api/orca";
import type { MarineCommitment, RepairProposal } from "../../api/types";
import { ensureMarineStateIngested } from "../../lib/marineLocationIngest";
import {
  formatSegmentIds,
  getActiveCommitmentId,
  isolationFromCommitment,
  clearLastMonitor,
  marineIngestLocation,
  readLastEvidence,
  readLastMonitor,
  saveLastMonitor,
} from "../../lib/orcaSession";

function selectedOption(proposal: RepairProposal) {
  return (
    proposal.options.find(
      (option) => option.option_id === proposal.selected_option,
    ) ?? proposal.options[0]
  );
}

function Repair() {
  const navigate = useNavigate();
  const commitmentId = getActiveCommitmentId();

  const [proposal, setProposal] = useState<RepairProposal | null>(null);
  const [commitment, setCommitment] = useState<MarineCommitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!commitmentId) {
      setLoading(false);
      setError("No commitment id is stored for repair.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [server, repairs] = await Promise.all([
        getCommitment(commitmentId),
        listRepairs(commitmentId),
      ]);
      setCommitment(server);

      const open = repairs
        .filter((item) => item.status === "PROPOSED")
        .at(-1);

      if (open) {
        setProposal(open);
        return;
      }

      if (server.state !== "VIOLATED") {
        setProposal(repairs.at(-1) ?? null);
        if (!repairs.length) {
          setError(
            `Repair proposal requires a violated commitment (current state: ${server.state}).`,
          );
        }
        return;
      }

      const monitorRaw = readLastMonitor();
      const monitor =
        monitorRaw?.commitment_id === server.commitment_id
          ? monitorRaw
          : null;
      const violatedDeps = server.dependencies.filter(
        (item) => item.status === "VIOLATED",
      );
      const violatedSegments = [
        ...new Set(violatedDeps.flatMap((item) => item.segment_ids)),
      ];
      const derived = isolationFromCommitment(server);
      const affected =
        monitor?.segment_isolation.affected_segment_ids.length
          ? monitor.segment_isolation.affected_segment_ids
          : violatedSegments.length
            ? violatedSegments
            : derived.affected_segment_ids;
      const dependencyId =
        monitor?.segment_isolation.triggering_dependency_ids[0] ??
        violatedDeps[0]?.dependency_id ??
        server.dependencies[0]?.dependency_id;
      const triggering = server.dependencies.find(
        (item) => item.dependency_id === dependencyId,
      );

      if (!dependencyId || affected.length === 0) {
        setError(
          "No affected segments or triggering dependency is available for repair.",
        );
        setProposal(null);
        return;
      }

      const created = await proposeRepair(commitmentId, {
        dependency_id: dependencyId,
        current_value: triggering?.current_value,
        affected_segments: affected,
      });
      setProposal(created);
    } catch (cause) {
      setError(readApiError(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [commitmentId]);

  const handleApprove = async () => {
    if (!proposal) return;
    setBusy(true);
    setError(null);

    try {
      const evidence = readLastEvidence() ?? undefined;
      const updated = await approveRepair(proposal.repair_id, evidence);

      if (updated.status !== "APPROVED") {
        setProposal(updated);
        setError("The server did not confirm approval.");
        return;
      }

      setProposal(updated);

      if (!commitmentId) {
        setError("Repair was confirmed, but no commitment id is stored for refresh.");
        return;
      }

      try {
        clearLastMonitor();
        const applied = await getCommitment(commitmentId);
        setCommitment(applied);
        const location = marineIngestLocation();
        if (!location) {
          setError(
            "Repair was confirmed, but remonitor needs a fishing-area To or GPS From.",
          );
          return;
        }
        await ensureMarineStateIngested(location);
        const remonitor = await reevaluateCommitment(commitmentId, {
          use_latest_marine_state: true,
        });
        saveLastMonitor(remonitor);
        const refreshed = await getCommitment(commitmentId);
        setCommitment(refreshed);
      } catch (refreshCause) {
        setError(
          `Repair was confirmed, but commitment refresh or remonitor failed: ${readApiError(refreshCause)}`,
        );
      }
    } catch (cause) {
      setError(readApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    setBusy(true);
    setError(null);

    try {
      const updated = await rejectRepair(proposal.repair_id);

      if (updated.status !== "REJECTED") {
        setProposal(updated);
        setError("The server did not confirm rejection.");
        return;
      }

      setProposal(updated);

      if (!commitmentId) {
        setError("Repair was rejected, but no commitment id is stored for refresh.");
        return;
      }

      try {
        clearLastMonitor();
        const refreshed = await getCommitment(commitmentId);
        setCommitment(refreshed);
      } catch (refreshCause) {
        setError(
          `Repair was rejected, but commitment refresh failed: ${readApiError(refreshCause)}`,
        );
      }
    } catch (cause) {
      setError(readApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  const option = proposal ? selectedOption(proposal) : undefined;
  const shiftHours = option?.changes.shift_hours;
  const status = proposal?.status ?? null;
  const showViolationBanner =
    commitment?.state === "VIOLATED" &&
    (!proposal || proposal.status === "PROPOSED");

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/impact")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Impact
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Undo2 size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Repair
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Review the smallest useful change to an affected commitment.
            </p>
          </div>
        </div>
      </header>

      {loading && (
        <p className="text-sm text-slate-500">Loading repair proposal…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {showViolationBanner && (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
            <AlertTriangle size={19} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
              Change detected
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              One part of the commitment needs review
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-700">
              A monitored condition has affected part of the planned trip.
              The rest of the commitment can remain unchanged.
            </p>
          </div>
        </div>
      </section>
      )}

      {/* Affected vs preserved */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Impact scope
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            ORCA isolates the affected part instead of rebuilding the entire
            plan.
          </p>
        </div>

        <div className="grid sm:grid-cols-2">
          <ScopeCard
            title="Affected"
            value={formatSegmentIds(proposal?.affected_segments ?? [])}
            description="Requires a repair proposal."
            tone="warning"
            icon={<AlertTriangle size={17} strokeWidth={1.9} />}
          />

          <ScopeCard
            title="Preserved"
            value={formatSegmentIds(proposal?.preserved_segments ?? [])}
            description="No change required."
            tone="success"
            icon={<CheckCircle2 size={17} strokeWidth={1.9} />}
          />
        </div>
      </section>

      {/* Repair proposal */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Undo2 size={17} strokeWidth={1.9} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Proposed repair
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                The proposal changes only the affected part.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Suggested change
            </p>

            <h3 className="mt-1.5 text-lg font-semibold text-slate-950">
              {option
                ? option.repair_type.replaceAll("_", " ")
                : loading
                  ? "Loading…"
                  : "No ranked proposal"}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {option?.reason ?? proposal?.reason ?? "Waiting for a server proposal."}
            </p>
            {proposal?.options?.length ? (
              <ol className="mt-3 space-y-1 break-words text-xs leading-5 text-slate-600">
                {proposal.options.map((item) => (
                  <li key={item.option_id}>
                    {item.option_id === proposal.selected_option
                      ? "Selected: "
                      : "Ranked: "}
                    {item.option_id} · {item.repair_type.replaceAll("_", " ")} ·
                    disruption {item.disruption_score}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <RepairDetail
              icon={<Clock3 size={17} strokeWidth={1.9} />}
              label="Change"
              value={
                typeof shiftHours === "number"
                  ? `${shiftHours} hours`
                  : (option?.repair_type ?? "—")
              }
            />

            <RepairDetail
              icon={<MapPinned size={17} strokeWidth={1.9} />}
              label="Affected"
              value={formatSegmentIds(
                option?.affected_segments ?? proposal?.affected_segments ?? [],
              )}
            />

            <RepairDetail
              icon={<ShieldCheck size={17} strokeWidth={1.9} />}
              label="Preserved"
              value={formatSegmentIds(proposal?.preserved_segments ?? [])}
            />
          </div>
        </div>
      </section>

      {/* Decision */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ShieldCheck size={17} strokeWidth={1.9} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Your approval is required
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              ORCA proposes the repair, but the user remains in control of
              applying the change.
            </p>
          </div>
        </div>

        {status === "PROPOSED" && proposal && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handleApprove();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60 sm:w-auto"
            >
              <CheckCircle2 size={17} strokeWidth={2} />
              {busy ? "Saving…" : "Approve repair"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void handleReject();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              Reject
            </button>
          </div>
        )}

        {status === "APPROVED" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600"
                strokeWidth={2}
              />

              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Repair approved
                </h3>

                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  The server applied the repair. Updated commitment state:{" "}
                  {commitment?.state ?? "unknown"}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/monitoring")}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Return to monitoring
            </button>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">
              Repair rejected
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              The proposed change was not applied. Current commitment state:{" "}
              {commitment?.state ?? "unknown"}.
            </p>

            <button
              type="button"
              onClick={() => navigate("/impact")}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Review impact
            </button>
          </div>
        )}
      </section>

      {/* Lifecycle */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Waves
            size={17}
            className="text-blue-600"
            strokeWidth={1.9}
          />

          <h2 className="text-sm font-semibold text-slate-950">
            ORCA lifecycle
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <LifecycleStep label="Decision" />
          <LifecycleStep label="Commitment" />
          <LifecycleStep label="Monitoring" />
          <LifecycleStep label="Impact" />
          <LifecycleStep label="Repair" active />
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          After approval, the updated commitment returns to monitoring.
        </p>
      </section>
    </section>
  );
}

function ScopeCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  tone: "warning" | "success";
  icon: ReactNode;
}) {
  return (
    <div className="border-t border-slate-100 px-4 py-5 first:border-t-0 sm:border-t-0 sm:px-6">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg",
          tone === "warning"
            ? "bg-amber-50 text-amber-600"
            : "bg-emerald-50 text-emerald-600",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">
        {title}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function RepairDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function LifecycleStep({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl px-3 py-3 text-center text-xs font-medium",
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-400",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export default Repair;
