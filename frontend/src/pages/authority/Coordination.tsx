import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  commitmentSummary,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";
import { formatTripRoute } from "../../lib/orcaSession";

function Coordination() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const trip =
    snapshot.commitment?.trip ?? snapshot.decision ?? snapshot.draft;

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
          Coordination
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Decision and commitment context already stored in this session.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Decision
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {snapshot.decision?.title || "No decision stored"}
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Commitment
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {commitmentSummary(snapshot)}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {trip ? formatTripRoute(trip) : "No route context"}
        </p>
      </section>
    </section>
  );
}

export default Coordination;
