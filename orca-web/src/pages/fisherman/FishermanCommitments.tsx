import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { isNotFoundError, readApiError } from "../../api/client";
import { createCommitment, getCommitment } from "../../api/orca";
import {
  buildCommitmentPayload,
  clearLastMonitor,
  clearLocalCommitment,
  formatTripRoute,
  readDecision,
  readLocalCommitment,
  saveLocalCommitment,
  type LocalCommitment,
  type Trip,
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

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently created";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MyCommitments() {
  const navigate = useNavigate();
  const location = useLocation();

  const tripFromState =
    (location.state as { trip?: Trip } | null)?.trip ?? null;

  const decision = useMemo(
    () => tripFromState ?? readDecision(),
    [tripFromState],
  );

  const existingCommitment = useMemo(
    () => readLocalCommitment(),
    [],
  );

  const [commitment, setCommitment] =
    useState<LocalCommitment | null>(existingCommitment);
  const [serverState, setServerState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(existingCommitment?.id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = existingCommitment?.id;
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const server = await getCommitment(id);
        if (cancelled) return;
        setServerState(server.state);
      } catch (cause) {
        if (cancelled) return;
        if (isNotFoundError(cause)) {
          clearLocalCommitment();
          clearLastMonitor();
          setCommitment(null);
          setServerState(null);
          setError(
            "This commitment is no longer on the server. Create it again.",
          );
        } else {
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
  }, [existingCommitment?.id]);

  const handleCreateCommitment = async () => {
    if (!decision) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createCommitment(
        buildCommitmentPayload(decision),
      );

      try {
        const server = await getCommitment(created.commitment_id);
        const record: LocalCommitment = {
          id: server.commitment_id,
          trip: decision,
          createdAt: server.created_at,
          status: "active",
        };
        saveLocalCommitment(record);
        setCommitment(record);
        setServerState(server.state);
      } catch (refreshCause) {
        const record: LocalCommitment = {
          id: created.commitment_id,
          trip: decision,
          createdAt: created.created_at,
          status: "active",
        };
        saveLocalCommitment(record);
        setCommitment(record);
        setError(
          `Commitment was created, but refresh failed: ${readApiError(refreshCause)}`,
        );
      }
    } catch (cause) {
      setError(readApiError(cause));
    } finally {
      setBusy(false);
    }
  };

  const activeTrip = commitment?.trip ?? decision;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/fisherman/decisions")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Decisions
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Commitment
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              My commitment
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              A commitment turns your decision into something ORCA can keep
              watching as conditions change.
            </p>
          </div>
        </div>
      </header>

      {!activeTrip ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <ShieldCheck size={22} strokeWidth={1.9} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No decision to commit yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create a trip decision first. Once a decision exists, you can
              turn it into a commitment here.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fisherman/decisions")}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
            >
              View decisions
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Trip summary */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Trip
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {activeTrip.title}
                </h2>
              </div>

              {commitment ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} />
                  {serverState ?? (loading ? "Checking…" : "Unknown")}
                </span>
              ) : (
                <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  Ready
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <DetailRow
                icon={<Clock3 size={17} strokeWidth={1.9} />}
                label="Schedule"
                value={`${formatDate(activeTrip.date)} · ${activeTrip.departure}–${activeTrip.returnTime}`}
              />

              <DetailRow
                icon={<MapPinned size={17} strokeWidth={1.9} />}
                label="Fishing area"
                value={formatTripRoute(activeTrip)}
              />
            </div>
          </section>

          {/* Commitment meaning */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-slate-950">
                What this commitment means
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                ORCA keeps the decision context together with the conditions
                that can affect it.
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <CommitmentItem
                  title="Trip is recorded"
                  description="The planned time and area are kept with this commitment."
                />

                <CommitmentItem
                  title="Conditions are watched"
                  description="Relevant marine conditions can be evaluated as they change."
                />

                <CommitmentItem
                  title="Changes have context"
                  description="A future change can be compared against this commitment."
                />

                <CommitmentItem
                  title="You stay in control"
                  description="Any proposed repair can be presented for human approval."
                />
              </div>
            </div>
          </section>

          {/* Dependencies */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Waves size={17} strokeWidth={1.9} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Decision dependencies
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  These become the conditions ORCA can monitor.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <DependencyRow
                label="Wave conditions"
                state="Ready for evaluation"
              />

              <DependencyRow
                label="Wind conditions"
                state="Ready for evaluation"
              />

              <DependencyRow
                label="Marine hazards"
                state="Ready for evaluation"
              />

              <DependencyRow
                label="Trip area and route"
                state="Trip context"
              />
            </div>
          </section>

          {/* Created commitment */}
          {loading && (
            <p className="text-sm text-slate-500">Checking commitment…</p>
          )}

          {commitment && serverState && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600">
                  <CheckCircle2 size={18} strokeWidth={2} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">
                    Commitment created
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    This trip is now represented as a commitment on the ORCA
                    core.
                  </p>

                  <p className="mt-2 text-xs text-emerald-700">
                    Created {formatCreatedAt(commitment.createdAt)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Action */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            {!commitment ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Ready to create the commitment?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    This will keep the trip context ready for dependency
                    monitoring.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleCreateCommitment();
                  }}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60 sm:w-auto"
                >
                  {busy ? "Creating…" : "Create commitment"}
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    {serverState
                      ? "Commitment is active"
                      : loading
                        ? "Checking commitment"
                        : "Commitment not confirmed on the server"}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    The next stage is continuous monitoring of its dependencies.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/monitoring")}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                >
                  Monitoring next
                  <ArrowRight size={17} strokeWidth={2} />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function DetailRow({
  icon,
  label,
  value,
}: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:border-t-0 sm:px-6">
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

type CommitmentItemProps = {
  title: string;
  description: string;
};

function CommitmentItem({
  title,
  description,
}: CommitmentItemProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

type DependencyRowProps = {
  label: string;
  state: string;
};

function DependencyRow({
  label,
  state,
}: DependencyRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <p className="text-sm font-medium text-slate-700">
        {label}
      </p>

      <span className="shrink-0 text-xs font-medium text-slate-400">
        {state}
      </span>
    </div>
  );
}

export default MyCommitments;