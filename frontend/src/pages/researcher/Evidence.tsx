import {
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { readWorkspaceSnapshot } from "../../lib/roleWorkspace";
import type { Evidence as OrcaEvidence } from "../../api/types";

type EvidenceState =
  | "available"
  | "unavailable"
  | "unknown";

type EvidenceItem = {
  id: string;
  title: string;
  type: string;
  source: string;
  state: EvidenceState;
};

function toEvidenceItem(record: OrcaEvidence): EvidenceItem {
  const status = record.data_status;
  return {
    id: record.evidence_id,
    title: record.parameter,
    type: record.parameter,
    source: record.source,
    state:
      status === "UNKNOWN"
        ? "unknown"
        : status === "REAL" || status === "SIMULATED" || status === "ASSUMED"
          ? "available"
          : "unavailable",
  };
}

function Evidence() {
  const navigate = useNavigate();
  const evidence = readWorkspaceSnapshot().evidence.map(toEvidenceItem);

  const available = evidence.filter(
    (item) => item.state === "available",
  ).length;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/researcher")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Research
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileSearch size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Evidence
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore evidence records and their source state without presenting
              unavailable information as verified.
            </p>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-3 gap-3">
        <Summary
          label="Records"
          value={evidence.length > 0 ? String(evidence.length) : "None"}
        />
        <Summary
          label="Available"
          value={available > 0 ? String(available) : "None"}
        />
        <Summary
          label="Unknown"
          value={
            evidence.some((item) => item.state === "unknown")
              ? "Present"
              : "None"
          }
        />
      </section>

      {/* Evidence records */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Evidence records
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Evidence retains its source context and availability state.
          </p>
        </div>

        {evidence.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FileSearch size={22} strokeWidth={1.9} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No evidence records available
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Evidence will appear here when a connected ORCA source provides
              a record.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {evidence.map((item) => (
              <EvidenceRow
                key={item.id}
                item={item}
              />
            ))}
          </div>
        )}
      </section>

      {/* Evidence types */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Evidence domains
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Research can examine the different evidence sources that influence
            decisions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Domain
            icon={<Waves size={18} strokeWidth={1.9} />}
            label="Ocean"
          />

          <Domain
            icon={<RefreshCw size={18} strokeWidth={1.9} />}
            label="Weather"
          />

          <Domain
            icon={<MapPinned size={18} strokeWidth={1.9} />}
            label="Location"
          />

          <Domain
            icon={<ShieldCheck size={18} strokeWidth={1.9} />}
            label="Hazards"
          />
        </div>
      </section>

      {/* Research rule */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Evidence should remain traceable
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              A research view should make it possible to distinguish actual
              source evidence from unavailable or unknown data.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
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

function EvidenceRow({
  item,
}: {
  item: EvidenceItem;
}) {
  const icon =
    item.type === "Ocean"
      ? Waves
      : item.type === "Weather"
        ? RefreshCw
        : item.type === "Location"
          ? MapPinned
          : ShieldCheck;

  const Icon = icon;

  return (
    <div className="flex items-start gap-4 px-4 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} strokeWidth={1.9} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">
          {item.title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {item.type} · {item.source}
        </p>
      </div>

      <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
        {item.state}
      </span>
    </div>
  );
}

function Domain({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-800">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Source dependent
      </p>
    </div>
  );
}

export default Evidence;