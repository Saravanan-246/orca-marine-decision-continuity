import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { hazardRecords } from "../../lib/roleWorkspace";
import { useLatestMarineState } from "../../lib/useLatestMarineState";

function AuthorityHazards() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const hazards = hazardRecords(state?.hazards);

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
          Coastal hazards
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Hazards are listed only when the marine state record includes them.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Checking marine state…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : hazards.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <AlertTriangle size={22} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">
            No connected hazard data
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ORCA is not generating hazard warnings here.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {hazards.map((hazard) => (
            <article
              key={hazard.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="text-sm font-semibold text-slate-950">
                {hazard.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {hazard.area} · {hazard.source}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AuthorityHazards;
