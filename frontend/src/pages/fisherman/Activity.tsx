import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  GitCompare,
  History,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

type ActivityType =
  | "decision"
  | "commitment"
  | "monitoring"
  | "impact"
  | "repair"
  | "approval";

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  status: "available" | "pending";
};

type Trip = {
  title: string;
  date: string;
  departure: string;
  returnTime: string;
  area: string;
};

const DECISION_KEY = "orca:fisherman:current-decision";
const COMMITMENT_KEY = "orca:fisherman:current-commitment";

function readDecision(): Trip | null {
  try {
    const raw = localStorage.getItem(DECISION_KEY);

    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<Trip>;

    if (
      typeof value.title !== "string" ||
      typeof value.date !== "string" ||
      typeof value.departure !== "string" ||
      typeof value.returnTime !== "string" ||
      typeof value.area !== "string"
    ) {
      return null;
    }

    return {
      title: value.title,
      date: value.date,
      departure: value.departure,
      returnTime: value.returnTime,
      area: value.area,
    };
  } catch {
    return null;
  }
}

function readCommitment(): {
  trip: Trip;
  createdAt: string;
} | null {
  try {
    const raw = localStorage.getItem(COMMITMENT_KEY);

    if (!raw) return null;

    const value = JSON.parse(raw) as {
      trip?: Partial<Trip>;
      createdAt?: string;
    };

    if (!value.trip || typeof value.createdAt !== "string") {
      return null;
    }

    const trip = value.trip;

    if (
      typeof trip.title !== "string" ||
      typeof trip.date !== "string" ||
      typeof trip.departure !== "string" ||
      typeof trip.returnTime !== "string" ||
      typeof trip.area !== "string"
    ) {
      return null;
    }

    return {
      createdAt: value.createdAt,
      trip: {
        title: trip.title,
        date: trip.date,
        departure: trip.departure,
        returnTime: trip.returnTime,
        area: trip.area,
      },
    };
  } catch {
    return null;
  }
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "decision":
      return FileCheck2;

    case "commitment":
      return ShieldCheck;

    case "monitoring":
      return Waves;

    case "impact":
      return GitCompare;

    case "repair":
      return History;

    case "approval":
      return CheckCircle2;

    default:
      return Clock3;
  }
}

function FishermanActivity() {
  const navigate = useNavigate();

  const decision = useMemo(() => readDecision(), []);
  const commitment = useMemo(() => readCommitment(), []);

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    if (decision) {
      items.push({
        id: "decision-created",
        type: "decision",
        title: "Decision created",
        description: decision.title,
        time: "Available in current session",
        status: "available",
      });
    }

    if (commitment) {
      items.push({
        id: "commitment-created",
        type: "commitment",
        title: "Commitment created",
        description: commitment.trip.title,
        time: formatTime(commitment.createdAt),
        status: "available",
      });
    }

    if (commitment) {
      items.push({
        id: "monitoring-ready",
        type: "monitoring",
        title: "Monitoring ready",
        description:
          "The commitment is ready for dependency monitoring.",
        time: "Waiting for monitoring",
        status: "pending",
      });
    }

    return items;
  }, [commitment, decision]);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      {/* Header */}
      <header>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <History size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Fisherman
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Activity
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              See what has happened across your ORCA decisions and commitments.
            </p>
          </div>
        </div>
      </header>

      {/* Empty state */}
      {activities.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <History size={22} strokeWidth={1.9} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">
              No activity yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your decision and commitment activity will appear here as you use
              ORCA.
            </p>

            <button
              type="button"
              onClick={() => navigate("/fisherman/trip")}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Plan a trip
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Activity timeline */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-slate-950">
                Recent activity
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your current ORCA session history.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                const pending = activity.status === "pending";

                return (
                  <div
                    key={activity.id}
                    className="flex gap-4 px-4 py-4 sm:px-6"
                  >
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        pending
                          ? "bg-slate-100 text-slate-400"
                          : "bg-blue-50 text-blue-600",
                      ].join(" ")}
                    >
                      <Icon size={18} strokeWidth={1.9} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-900">
                          {activity.title}
                        </p>

                        <span className="text-xs text-slate-400">
                          {activity.time}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ORCA lifecycle */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-950">
              ORCA lifecycle
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <LifecycleStep
                label="Decision"
                active={Boolean(decision)}
              />

              <LifecycleStep
                label="Commitment"
                active={Boolean(commitment)}
              />

              <LifecycleStep
                label="Monitoring"
              />

              <LifecycleStep
                label="Impact"
              />

              <LifecycleStep
                label="Repair"
              />

              <LifecycleStep
                label="Approval"
              />
            </div>
          </section>

          {/* Current state */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              Current state
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-950">
              {commitment
                ? "Your commitment is active"
                : "Your decision is ready"}
            </h2>

            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {commitment
                ? "The next stage is monitoring the conditions connected to the commitment."
                : "Create a commitment when you are ready to move from decision to continuous monitoring."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  commitment
                    ? "/monitoring"
                    : "/commitment",
                )
              }
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {commitment
                ? "Open monitoring"
                : "Open commitment"}
            </button>
          </section>
        </>
      )}
    </section>
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
          : "bg-slate-50 text-slate-400",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export default FishermanActivity;