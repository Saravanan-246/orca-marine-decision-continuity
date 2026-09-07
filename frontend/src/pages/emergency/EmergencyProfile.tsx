import { ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function EmergencyProfile() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          Emergency responder
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Profile
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-950">User</h2>
        <p className="mt-1 text-sm text-slate-500">Emergency responder</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => navigate("/role")}
          className="flex w-full items-center justify-between px-4 py-4"
        >
          <span className="text-sm font-medium">Change role</span>
          <ChevronRight size={17} className="text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-4"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <LogOut size={16} />
            Home
          </span>
        </button>
      </section>
    </section>
  );
}

export default EmergencyProfile;
