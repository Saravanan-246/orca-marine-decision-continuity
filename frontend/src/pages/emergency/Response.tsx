import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  monitorStateLabel,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";

function Response() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/emergency")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Emergency
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Response
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Available decision context only. This page does not execute emergency
          actions.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Available context
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          {snapshot.commitment
            ? monitorStateLabel(snapshot)
            : "No response record"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {snapshot.commitment
            ? `Commitment ${snapshot.commitment.id} is stored. Repair and approval remain on the existing ORCA pages.`
            : "There is no stored commitment to respond to."}
        </p>
        {snapshot.commitment && (
          <button
            type="button"
            onClick={() => navigate("/repair")}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open repair
          </button>
        )}
      </section>
    </section>
  );
}

export default Response;
