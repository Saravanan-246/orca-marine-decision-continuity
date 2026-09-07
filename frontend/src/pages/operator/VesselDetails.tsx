import { ArrowLeft, Ship } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function VesselDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/operator/fleet")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Fleet
        </button>

        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Ship size={21} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Vessel
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Vessel details
            </h1>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h2 className="text-sm font-semibold text-slate-900">
          Vessel unavailable
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {id
            ? `No connected fleet record for ${id}.`
            : "No vessel is selected."}
        </p>
      </section>
    </section>
  );
}

export default VesselDetails;
