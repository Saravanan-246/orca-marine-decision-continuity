import {
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Profile() {
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
              Fisherman
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Profile
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage your ORCA account and app preferences.
            </p>
          </div>
        </div>
      </header>

      {/* User */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            U
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950">
              User
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Account details will appear here after authentication is
              connected.
            </p>
          </div>
        </div>
      </section>

      {/* Role */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            ORCA role
          </h2>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium text-slate-800">
              Fisherman
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Your current ORCA experience.
            </p>
          </div>

          <ShieldCheck
            size={18}
            className="text-blue-600"
          />
        </div>
      </section>

      {/* Settings */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ProfileRow
          label="Account"
          description="Account information"
        />

        <ProfileRow
          label="Language"
          description="Choose your preferred language"
        />

        <ProfileRow
          label="Notifications"
          description="Manage important ORCA alerts"
        />

        <ProfileRow
          label="Privacy"
          description="Review location and account permissions"
        />
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
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 text-left last:border-b-0 sm:px-6"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {label}
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

export default Profile;