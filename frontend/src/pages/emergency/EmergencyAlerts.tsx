import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { hazardRecords } from "../../lib/roleWorkspace";
import { useLatestMarineState } from "../../lib/useLatestMarineState";

function EmergencyAlerts() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const hazards = hazardRecords(state?.hazards);

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
          Alerts
        </h1>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Checking sources…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : hazards.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <AlertTriangle size={22} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">
            No active alerts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            No connected hazard or warning records are available.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {hazards.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {item.area} · {item.source}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default EmergencyAlerts;
