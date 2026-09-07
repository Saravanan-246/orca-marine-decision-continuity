import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function IncidentDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/emergency/incidents")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Incidents
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Incident details
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h2 className="text-sm font-semibold text-slate-900">
          Incident unavailable
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {id
            ? `No backend incident record for ${id}.`
            : "No incident is selected."}
        </p>
      </section>
    </section>
  );
}

export default IncidentDetails;
