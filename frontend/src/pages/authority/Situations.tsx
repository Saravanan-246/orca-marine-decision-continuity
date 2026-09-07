import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  monitorStateLabel,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";

function Situations() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();

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
          Situations
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Current ORCA status from stored monitoring and commitment records.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Situation
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          {snapshot.monitor
            ? monitorStateLabel(snapshot)
            : "No active situation"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {snapshot.commitment
            ? `Commitment ${snapshot.commitment.id}`
            : "No commitment is stored in this session."}
        </p>
      </section>
    </section>
  );
}

export default Situations;
