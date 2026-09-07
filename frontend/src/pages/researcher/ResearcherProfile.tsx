import {
  ChevronRight,
  LogOut,
  Microscope,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function ResearcherProfile() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Profile
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage the researcher workspace and account preferences.
            </p>
          </div>
        </div>
      </header>

      {/* Account */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            R
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">
              Researcher
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Account identity and researcher affiliation will appear here when
              authentication is connected.
            </p>
          </div>
        </div>
      </section>

      {/* Role */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ProfileRow
          icon={<Microscope size={17} strokeWidth={1.9} />}
          title="Research workspace"
          description="Marine evidence and decision analysis"
        />

        <ProfileRow
          icon={<Settings2 size={17} strokeWidth={1.9} />}
          title="Research preferences"
          description="Display, observation and workspace preferences"
        />

        <ProfileRow
          icon={<ShieldCheck size={17} strokeWidth={1.9} />}
          title="Privacy"
          description="Review account and research data permissions"
        />
      </section>

      {/* Scope */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Research access
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              The researcher experience is designed to inspect evidence,
              observations and decision history without changing operational
              commitments.
            </p>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <LogOut size={17} strokeWidth={1.9} />
        Sign out
      </button>
    </section>
  );
}

function ProfileRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left last:border-b-0 sm:px-6"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <ChevronRight
        size={17}
        strokeWidth={1.9}
        className="shrink-0 text-slate-400"
      />
    </button>
  );
}

export default ResearcherProfile;