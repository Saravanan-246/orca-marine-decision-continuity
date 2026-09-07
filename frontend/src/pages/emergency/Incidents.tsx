import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Incidents() {
  const navigate = useNavigate();

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
          Incidents
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h2 className="text-sm font-semibold text-slate-900">
          No incidents available
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This session has no incident records from the backend.
        </p>
      </section>
    </section>
  );
}

export default Incidents;
