import { ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

function AuthorityProfile() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          Coastal authority
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Profile
        </h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            A
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">User</h2>
            <p className="mt-1 text-sm text-slate-500">Coastal authority</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => navigate("/role")}
          className="flex w-full items-center justify-between px-4 py-4 text-left"
        >
          <span className="text-sm font-medium text-slate-800">Change role</span>
          <ChevronRight size={17} className="text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-4 text-left"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
            <LogOut size={16} />
            Home
          </span>
          <ShieldCheck size={17} className="text-blue-600" />
        </button>
      </section>
    </section>
  );
}

export default AuthorityProfile;
