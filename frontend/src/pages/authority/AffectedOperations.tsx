import { ArrowLeft, GitCompare, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  isolationSummary,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";

function AffectedOperations() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const isolation = isolationSummary(snapshot);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/authority")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Authority
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Affected operations
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Segments come from the latest ORCA monitoring isolation result.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Commitment
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {snapshot.commitment?.id ?? "No commitment on record"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {snapshot.monitor
            ? `Monitoring state: ${snapshot.monitor.state}`
            : "No monitoring result available"}
        </p>
      </section>

      {!isolation?.hasData ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <GitCompare size={22} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">
            No affected operations available
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Affected and preserved segments appear after a commitment is
            monitored.
          </p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Affected
            </p>
            <p className="mt-2 break-words text-sm font-medium text-amber-950">
              {isolation.affected}
            </p>
          </section>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Preserved
            </p>
            <p className="mt-2 break-words text-sm font-medium text-emerald-950">
              {isolation.preserved}
            </p>
          </section>
        </div>
      )}
    </section>
  );
}

export default AffectedOperations;
