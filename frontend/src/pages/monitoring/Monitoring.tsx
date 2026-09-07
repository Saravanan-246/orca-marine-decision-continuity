import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Waves,
  Wind,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { isNotFoundError, readApiError } from "../../api/client";
import { getCommitment, getLatestMarineState, reevaluateCommitment } from "../../api/orca";
import type {
  DecisionDependency,
  Evidence,
  MarineCommitment,
  MarineState,
  ReevaluateResponse,
} from "../../api/types";
import { ensureMarineStateIngested } from "../../lib/marineLocationIngest";
import {
  getActiveCommitmentId,
  clearLastMonitor,
  clearLocalCommitment,
  marineIngestLocation,
  monitorUiFromCommitment,
  monitorUiFromResult,
  readLastEvidence,
  readLocalCommitment,
  discardStaleMonitor,
  evidenceFromMonitorResult,
  readLastMonitor,
  saveLastEvidence,
  saveLastMonitor,
  simulatedObservation,
  unknownObservation,
} from "../../lib/orcaSession";

type MonitorState = "monitoring" | "changed" | "unavailable";

function isNumericValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function realEvidenceFromLatestMarine(
  state: MarineState,
  dependencies: DecisionDependency[],
): Evidence[] {
  const byParameter: Record<string, MarineState["wave"]> = {
    wave_height: state.wave,
    wind_speed: state.wind,
  };

  const items: Evidence[] = [];

  for (const dependency of dependencies) {
    const marine = byParameter[dependency.parameter];
    if (!marine || marine.data_status !== "REAL") {
      continue;
    }
    if (!isNumericValue(marine.value)) {
      continue;
    }

    items.push({
      evidence_id: `E-${state.state_id}-${dependency.parameter}`,
      parameter: dependency.parameter,
      source: dependency.source,
      value: marine.value,
      unit: marine.unit,
      timestamp: state.timestamp,
      data_status: "REAL",
      temporal_resolution_h: dependency.temporal_resolution_h ?? 3,
    });
  }

  return items;
}

let latestMarineInflight: {
  commitmentId: string;
  promise: Promise<ReevaluateResponse>;
} | null = null;

async function reevaluateWithLatestMarine(
  commitmentId: string,
  dependencies: DecisionDependency[],
): Promise<ReevaluateResponse> {
  if (
    latestMarineInflight &&
    latestMarineInflight.commitmentId === commitmentId
  ) {
    return latestMarineInflight.promise;
  }

  const promise = (async () => {
    const location = marineIngestLocation();
    if (location) {
      await ensureMarineStateIngested(location);
    }
    const latest = await getLatestMarineState();
    const realEvidence = latest
      ? realEvidenceFromLatestMarine(latest, dependencies)
      : [];
    if (realEvidence.length) {
      return reevaluateCommitment(commitmentId, { evidence: realEvidence });
    }
    return reevaluateCommitment(commitmentId, {
      use_latest_marine_state: true,
    });
  })();

  latestMarineInflight = { commitmentId, promise };
  try {
    return await promise;
  } finally {
    if (latestMarineInflight?.promise === promise) {
      latestMarineInflight = null;
    }
  }
}

function evaluationReasons(result: ReevaluateResponse | null): string | null {
  if (!result?.results.length) {
    return null;
  }
  const reasons = result.results
    .map((item) => item.reason)
    .filter((reason) => Boolean(reason && reason.trim()));
  return reasons.length ? reasons.join(" ") : null;
}

function lastEvidenceBlocksAutoRefresh(evidence: Evidence[] | null): boolean {
  if (!evidence?.length) {
    return false;
  }
  return evidence.some(
    (item) =>
      item.data_status === "SIMULATED" || item.data_status === "UNKNOWN",
  );
}

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

function getDependencyIcon(parameter: string) {
  if (parameter.includes("wind")) {
    return Wind;
  }

  if (parameter.includes("hazard")) {
    return AlertTriangle;
  }

  if (parameter.includes("route") || parameter.includes("area")) {
    return MapPinned;
  }

  return Waves;
}

function Monitoring() {
  const navigate = useNavigate();
  const local = readLocalCommitment();
  const commitmentId = getActiveCommitmentId();

  const previousCommitmentId = useRef<string | null>(null);
  const [server, setServer] = useState<MarineCommitment | null>(null);
  const [monitor, setMonitor] = useState<ReevaluateResponse | null>(
    () => readLastMonitor(),
  );
  const [monitorState, setMonitorState] = useState<MonitorState>("monitoring");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(commitmentId));
  const [error, setError] = useState<string | null>(null);

  const applyResult = (result: ReevaluateResponse, evidence?: Evidence[]) => {
    saveLastMonitor(result);
    if (evidence) {
      saveLastEvidence(evidence);
    }
    setMonitor(result);
    setMonitorState(monitorUiFromResult(result));
  };

  useEffect(() => {
    if (!commitmentId) {
      setLoading(false);
      return;
    }

    if (
      previousCommitmentId.current &&
      previousCommitmentId.current !== commitmentId
    ) {
      clearLastMonitor();
      setMonitor(null);
      setMonitorState("monitoring");
    }
    previousCommitmentId.current = commitmentId;

    let cancelled = false;

    void (async () => {
      let loaded: MarineCommitment | null = null;
      try {
        loaded = await getCommitment(commitmentId);
        if (cancelled) return;
        setServer(loaded);
        setError(null);

        const last = discardStaleMonitor(loaded);
        if (last) {
          setMonitor(last);
          setMonitorState(monitorUiFromResult(last));
        } else {
          setMonitor(null);
          setMonitorState(monitorUiFromCommitment(loaded));
        }

        const skipAutoLatest = lastEvidenceBlocksAutoRefresh(
          readLastEvidence(),
        );
        if (skipAutoLatest || loaded.state !== "UNVERIFIABLE") {
          return;
        }

        setBusy(true);
        const result = await reevaluateWithLatestMarine(
          commitmentId,
          loaded.dependencies,
        );
        if (cancelled) return;
        const persisted = evidenceFromMonitorResult(
          result,
          loaded.dependencies,
        );
        applyResult(result, persisted.length ? persisted : undefined);
        const refreshed = await getCommitment(commitmentId);
        if (cancelled) return;
        setServer(refreshed);
      } catch (cause) {
        if (!cancelled) {
          if (loaded) {
            setError(readApiError(cause));
          } else if (isNotFoundError(cause)) {
            setServer(null);
            setMonitor(null);
            clearLocalCommitment();
            clearLastMonitor();
            setError(
              "This commitment is no longer on the server. Create it again.",
            );
          } else {
            setServer(null);
            setMonitor(null);
            setError(readApiError(cause));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [commitmentId]);

  const observationSource = (parameter: string) => {
    const match = server?.dependencies.find(
      (item) => item.parameter === parameter,
    );
    return match?.source || "ORCA-UI";
  };

  const runReevaluate = async (
    body: { evidence?: Evidence[] } | Record<string, unknown>,
    evidence?: Evidence[],
  ) => {
    if (!commitmentId) {
      setError("No commitment id is stored for monitoring.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result =
        "use_latest_marine_state" in body && body.use_latest_marine_state
          ? await reevaluateWithLatestMarine(
              commitmentId,
              server?.dependencies ?? [],
            )
          : await reevaluateCommitment(commitmentId, body);
      const persisted =
        evidence ??
        evidenceFromMonitorResult(result, server?.dependencies ?? []);
      applyResult(result, persisted.length ? persisted : evidence);
      const refreshed = await getCommitment(commitmentId);
      setServer(refreshed);
    } catch (cause) {
      setError(readApiError(cause));
    } finally {
      setBusy(false);
    }
  };

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
            <ShieldCheck size={22} strokeWidth={1.9} />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-950">
            No active commitment
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Monitoring starts after a decision has been turned into an active
            commitment.
          </p>

          <button
            type="button"
            onClick={() => navigate("/fisherman/trip")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Start with a trip
          </button>
        </div>
      </section>
    );
  }

  const isChanged = monitorState === "changed";
  const isUnavailable = monitorState === "unavailable";
  const title =
    server?.decision_summary ?? local?.trip.title ?? "Commitment";
  const schedule = local
    ? `${formatDate(local.trip.date)} · ${local.trip.departure}–${local.trip.returnTime}`
    : server?.segments[0]
      ? `${server.segments[0].start_time} – ${server.segments[server.segments.length - 1]?.end_time}`
      : "Unknown schedule";
  const area = local?.trip.area ?? "From commitment";
  const dependencies: DecisionDependency[] = server?.dependencies ?? [];
  const resultById = new Map(
    (monitor?.results ?? []).map((item) => [item.dependency_id, item]),
  );

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/commitment")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Commitment
        </button>

        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              isChanged
                ? "bg-amber-50 text-amber-600"
                : isUnavailable
                  ? "bg-slate-100 text-slate-500"
                  : "bg-blue-50 text-blue-600",
            ].join(" ")}
          >
            {isChanged ? (
              <AlertTriangle size={21} strokeWidth={1.9} />
            ) : (
              <RefreshCw size={21} strokeWidth={1.9} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Monitoring
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              ORCA watches the conditions connected to your active commitment.
            </p>
          </div>
        </div>
      </header>

      {loading && (
        <p className="text-sm text-slate-500">Loading commitment…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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

            <p className="mt-1 break-all text-xs text-slate-400">
              {commitmentId}
            </p>
          </div>

          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              isChanged
                ? "bg-amber-50 text-amber-700"
                : isUnavailable
                  ? "bg-slate-100 text-slate-600"
                  : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {isChanged ? (
              <AlertTriangle size={14} />
            ) : isUnavailable ? (
              <RefreshCw size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}

            {monitor?.state ?? server?.state ?? (loading ? "Loading" : "Unknown")}
          </span>
        </div>

        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <InfoCell
            icon={<Clock3 size={17} strokeWidth={1.9} />}
            label="Schedule"
            value={schedule}
          />

          <InfoCell
            icon={<MapPinned size={17} strokeWidth={1.9} />}
            label="Area"
            value={area}
          />
        </div>
      </section>

      {/* Monitoring status */}
      <section
        className={[
          "rounded-2xl border p-4 sm:p-5",
          isChanged
            ? "border-amber-200 bg-amber-50"
            : isUnavailable
              ? "border-slate-200 bg-slate-50"
              : "border-emerald-200 bg-emerald-50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white",
              isChanged
                ? "text-amber-600"
                : isUnavailable
                  ? "text-slate-500"
                  : "text-emerald-600",
            ].join(" ")}
          >
            {isChanged ? (
              <AlertTriangle size={19} strokeWidth={1.9} />
            ) : isUnavailable ? (
              <RefreshCw size={19} strokeWidth={1.9} />
            ) : (
              <CheckCircle2 size={19} strokeWidth={1.9} />
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Monitoring status
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {loading
                ? "Loading commitment…"
                : error && !server
                  ? "Monitoring could not be loaded"
                  : isChanged
                    ? "A monitored condition needs review"
                    : isUnavailable
                      ? (monitor?.state ?? server?.state ?? "UNVERIFIABLE")
                      : "No dependency change detected"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {isChanged
                ? "ORCA has a change state recorded for this commitment. The next stage is impact evaluation."
                : isUnavailable
                  ? (evaluationReasons(monitor) ??
                    "The server could not verify this commitment. Use latest marine state when INCOIS evidence is available.")
                  : "The commitment remains in its current state while monitored dependencies are evaluated."}
            </p>
          </div>
        </div>
      </section>

      {/* Dependencies */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Monitored dependencies
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            These conditions are tied to the commitment.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {dependencies.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500 sm:px-6">
              No dependencies returned from the server.
            </p>
          ) : (
            dependencies.map((dependency) => {
              const Icon = getDependencyIcon(dependency.parameter);
              const result = resultById.get(dependency.dependency_id);
              const status = result?.status ?? dependency.status ?? "UNKNOWN";

              return (
                <div
                  key={dependency.dependency_id}
                  className="flex items-center gap-3 px-4 py-4 sm:px-6"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon size={17} strokeWidth={1.9} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {dependency.parameter}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {[
                        result?.data_status,
                        result?.reason ?? "Connected to commitment",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <span
                    className={[
                      "ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                      status === "VIOLATED" || status === "AT_RISK"
                        ? "bg-amber-50 text-amber-700"
                        : status === "UNVERIFIABLE" || status === "UNKNOWN"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-blue-50 text-blue-700",
                    ].join(" ")}
                  >
                    {status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Change path */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          When something changes
        </h2>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <Stage
            label="Monitor"
            active={!isChanged}
          />

          <Stage
            label="Impact"
            active={isChanged}
          />

          <Stage label="Repair" />

          <Stage label="Approval" />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          ORCA should move to impact evaluation only when a relevant monitored
          condition actually changes.
        </p>
      </section>

      {/* Development control */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Evaluation controls
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Use latest marine state converts stored REAL INCOIS values into
          evidence. Simulate change remains a separate caller-supplied
          SIMULATED observation.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !server}
            onClick={() => {
              void runReevaluate({ use_latest_marine_state: true });
            }}
            className="rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Evaluating…" : "Use latest marine state"}
          </button>

          <button
            type="button"
            disabled={busy || !server}
            onClick={() => {
              const stored = readLastEvidence() ?? server?.evidence ?? [];
              if (!stored.length) {
                setError(
                  "No stored evidence to re-evaluate. Use latest marine state or simulate a change first.",
                );
                return;
              }
              void runReevaluate({ evidence: stored }, stored);
            }}
            className={[
              "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-60",
              monitorState === "monitoring"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {busy ? "Evaluating…" : "Normal"}
          </button>

          <button
            type="button"
            disabled={busy || !server}
            onClick={() => {
              const source = observationSource("wave_height");
              const evidence = [
                simulatedObservation("wave_height", 2.3, source),
              ];
              void runReevaluate({ evidence }, evidence);
            }}
            className={[
              "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-60",
              monitorState === "changed"
                ? "bg-amber-500 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Simulate change
          </button>

          <button
            type="button"
            disabled={busy || !server}
            onClick={() => {
              const source = observationSource("wave_height");
              const evidence = [unknownObservation("wave_height", source)];
              void runReevaluate({ evidence }, evidence);
            }}
            className={[
              "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-60",
              monitorState === "unavailable"
                ? "bg-slate-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Source unavailable
          </button>
        </div>
      </section>

      {/* Next action */}
      {isChanged && server && (
        <button
          type="button"
          onClick={() => navigate("/impact")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          Evaluate impact
          <AlertTriangle size={17} strokeWidth={1.9} />
        </button>
      )}
    </section>
  );
}

function InfoCell({
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

function Stage({
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
          : "bg-slate-50 text-slate-400",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export default Monitoring;
