import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

function Commitment() {
  const navigate = useNavigate();

  const decision = useMemo(() => readDecision(), []);
  const existingCommitment = useMemo(() => readLocalCommitment(), []);

  const [commitment, setCommitment] = useState(existingCommitment);
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
        const record = {
          id: server.commitment_id,
          status: "active" as const,
          createdAt: server.created_at,
          trip: decision,
        };
        saveLocalCommitment(record);
        setCommitment(record);
        setServerState(server.state);
      } catch (refreshCause) {
        const record = {
          id: created.commitment_id,
          status: "active" as const,
          createdAt: created.created_at,
          trip: decision,
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

  const currentTrip = commitment?.trip ?? decision;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ShieldCheck size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA commitment
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Commitment
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Turn the current decision into a commitment whose conditions can
              be monitored over time.
            </p>
          </div>
        </div>
      </header>

      {!currentTrip ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <ShieldCheck size={22} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No decision available
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create a trip decision first. ORCA needs that decision context
              before a commitment can be created.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fisherman/trip")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 hover:shadow-sm"
            >
              Plan a trip
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Commitment summary */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {commitment ? commitment.id : "Ready to create"}
                </p>

                <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
                  {currentTrip.title}
                </h2>
              </div>

              <span
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  commitment
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700",
                ].join(" ")}
              >
                {commitment ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <ShieldCheck size={14} />
                )}

                {commitment ? (serverState ?? (loading ? "Checking…" : "Unknown")) : "Ready"}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 sm:divide-x">
              <InfoRow
                icon={<Clock3 size={17} strokeWidth={1.9} />}
                label="Schedule"
                value={`${formatDate(currentTrip.date)} · ${currentTrip.departure}–${currentTrip.returnTime}`}
              />

              <InfoRow
                icon={<MapPinned size={17} strokeWidth={1.9} />}
                label="Fishing area"
                value={formatTripRoute(currentTrip)}
              />
            </div>
          </section>

          {/* Dependencies */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Waves size={18} strokeWidth={1.9} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Dependencies
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  These are the conditions that can later affect this
                  commitment.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <DependencyRow
                name="Wave conditions"
                state="Needs live evaluation"
              />

              <DependencyRow
                name="Wind conditions"
                state="Needs live evaluation"
              />

              <DependencyRow
                name="Marine hazards"
                state="Needs live evaluation"
              />

              <DependencyRow
                name="Area and route"
                state="Trip context"
              />
            </div>
          </section>

          {/* Commitment explanation */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-950">
              What happens next
            </h2>

            <div className="mt-4 space-y-3">
              <Step
                number="01"
                title="Monitor"
                text="ORCA watches the conditions connected to the commitment."
              />

              <Step
                number="02"
                title="Detect change"
                text="A relevant condition can trigger an impact evaluation."
              />

              <Step
                number="03"
                title="Repair"
                text="ORCA can propose a limited change instead of rebuilding everything."
              />
            </div>
          </section>

          {loading && (
            <p className="text-sm text-slate-500">Checking commitment…</p>
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
                    Create commitment
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Save this decision context as the commitment ORCA will
                    monitor.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleCreateCommitment();
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 hover:shadow-sm disabled:opacity-60 sm:w-auto"
                >
                  {busy ? "Creating…" : "Create commitment"}
                  <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    {serverState
                      ? "Commitment created"
                      : loading
                        ? "Checking commitment"
                        : "Commitment not confirmed on the server"}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Continue to dependency monitoring.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/monitoring")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                >
                  Open monitoring
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function InfoRow({
  icon,
  label,
  value,
}: InfoRowProps) {
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
  name,
  state,
}: {
  name: string;
  state: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm font-medium text-slate-700">
        {name}
      </span>

      <span className="shrink-0 text-xs font-medium text-slate-400">
        {state}
      </span>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
        {number}
      </span>

      <div>
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );
}

export default Commitment;
