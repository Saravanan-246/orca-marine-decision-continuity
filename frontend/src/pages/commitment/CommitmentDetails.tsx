import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isNotFoundError, readApiError } from "../../api/client";
import { getCommitment } from "../../api/orca";
import type { MarineCommitment } from "../../api/types";
import {
  formatTripRoute,
  parseMapLocationValue,
  setActiveCommitmentId,
} from "../../lib/orcaSession";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isNotFound(error: unknown): boolean {
  return isNotFoundError(error);
}

function statusTone(state: string) {
  if (state === "VIOLATED" || state === "AT_RISK") {
    return "bg-amber-50 text-amber-700";
  }
  if (state === "UNVERIFIABLE" || state === "UNKNOWN") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-emerald-50 text-emerald-700";
}

function CommitmentDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [commitment, setCommitment] = useState<MarineCommitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const commitmentId = id?.trim() ?? "";

    if (!commitmentId) {
      setCommitment(null);
      setMissing(true);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMissing(false);
    setCommitment(null);

    void (async () => {
      try {
        const server = await getCommitment(commitmentId);
        if (cancelled) return;
        setCommitment(server);
      } catch (cause) {
        if (cancelled) return;
        setCommitment(null);
        if (isNotFound(cause)) {
          setMissing(true);
          setError(null);
        } else {
          setMissing(false);
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
  }, [id]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/commitment")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <p className="text-sm text-slate-500">Loading commitment…</p>
      </section>
    );
  }

  if (missing || !commitment) {
    return (
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <ShieldCheck size={22} />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-950">
            {error ? "Commitment could not be loaded" : "No active commitment"}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {missing && !error
              ? "This commitment was not found on the ORCA core."
              : "Create a commitment first. Its details will appear here once it exists."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/commitment")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open commitment
          </button>
        </div>
      </section>
    );
  }

  const firstSegment = commitment.segments[0];
  const lastSegment = commitment.segments[commitment.segments.length - 1];
  const schedule =
    firstSegment && lastSegment
      ? `${formatDateTime(firstSegment.start_time)} – ${formatDateTime(lastSegment.end_time)}`
      : "Not provided";
  const scope = (() => {
    const spatial = commitment.spatial_scope;
    if (!spatial || Object.keys(spatial).length === 0) {
      return commitment.decision_type;
    }
    const from = parseMapLocationValue(spatial.from);
    const to = parseMapLocationValue(spatial.to);
    const area =
      typeof spatial.fishing_area === "string" ? spatial.fishing_area : "";
    if (from || to || area) {
      return formatTripRoute({ area, from, to });
    }
    return JSON.stringify(spatial);
  })();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <button
          type="button"
          onClick={() => navigate("/commitment")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Commitment
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Commitment details
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {commitment.decision_summary}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {commitment.commitment_id}
            </p>
          </div>

          <span
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
              statusTone(commitment.state),
            ].join(" ")}
          >
            <CheckCircle2 size={14} />
            {commitment.state}
          </span>
        </div>
      </header>

      {/* Trip */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Trip context
          </h2>
        </div>

        <div className="grid sm:grid-cols-2">
          <DetailItem
            icon={<Clock3 size={17} />}
            label="Schedule"
            value={schedule}
          />

          <DetailItem
            icon={<MapPinned size={17} />}
            label="Fishing area"
            value={scope}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Segments
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {commitment.segments.map((segment) => (
            <Dependency
              key={segment.segment_id}
              name={`${segment.segment_id} · ${segment.label}`}
              status={`${formatDateTime(segment.start_time)} – ${formatDateTime(segment.end_time)}`}
            />
          ))}
        </div>
      </section>

      {/* Dependency model */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Waves size={17} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Monitored dependencies
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Conditions that can influence whether this commitment remains
              valid.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {commitment.dependencies.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-slate-500 sm:px-6">
              No dependencies returned from the server.
            </p>
          ) : (
            commitment.dependencies.map((dependency) => (
              <Dependency
                key={dependency.dependency_id}
                name={dependency.parameter}
                status={dependency.status ?? "UNKNOWN"}
              />
            ))
          )}
        </div>
      </section>

      {/* State lifecycle */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck
            size={18}
            className="text-blue-600"
          />

          <h2 className="text-sm font-semibold text-slate-950">
            Commitment state
          </h2>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <StateItem label="Created" active />

          <StateItem
            label="Monitoring"
            active={
              commitment.state === "VALID" ||
              commitment.state === "AT_RISK" ||
              commitment.state === "UNVERIFIABLE" ||
              commitment.state === "DRAFT"
            }
          />

          <StateItem
            label="Impact"
            active={commitment.state === "VIOLATED"}
          />

          <StateItem
            label="Repair"
            active={commitment.state === "REPAIRED"}
          />
        </div>
      </section>

      {/* Metadata */}
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">
            Created
          </span>

          <span className="text-xs font-medium text-slate-600">
            {formatDateTime(commitment.created_at)}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setActiveCommitmentId(commitment.commitment_id);
          navigate("/monitoring");
        }}
        className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
      >
        Continue to monitoring
      </button>
    </section>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-6 sm:first:border-t-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function Dependency({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm font-medium text-slate-700">
        {name}
      </span>

      <span className="text-xs font-medium text-slate-400">
        {status}
      </span>
    </div>
  );
}

function StateItem({
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

export default CommitmentDetails;
