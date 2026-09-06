import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FlaskConical,
  LifeBuoy,
  Ship,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type RoleId =
  | "fisherman"
  | "operator"
  | "authority"
  | "emergency"
  | "researcher"
  | "public";

type Role = {
  id: RoleId;
  name: string;
  description: string;
  icon: typeof Anchor;
};

const roles: Role[] = [
  {
    id: "fisherman",
    name: "Fisherman",
    description: "Plan trips and stay aware of changing marine conditions.",
    icon: Anchor,
  },
  {
    id: "operator",
    name: "Maritime operator",
    description: "Manage vessels, routes and operational decisions.",
    icon: Ship,
  },
  {
    id: "authority",
    name: "Coastal authority",
    description: "Monitor coastal situations, risks and affected activity.",
    icon: Building2,
  },
  {
    id: "emergency",
    name: "Emergency responder",
    description: "Support urgent marine response and changing situations.",
    icon: LifeBuoy,
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Explore marine evidence, observations and decision history.",
    icon: FlaskConical,
  },
  {
    id: "public",
    name: "Public",
    description: "View useful marine information and verified warnings.",
    icon: UserRound,
  },
];

const ROLE_KEY = "orca:selected-role";

function RoleSelection() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] =
    useState<RoleId | null>(null);

  const handleContinue = () => {
    if (!selectedRole) {
      return;
    }

    localStorage.setItem(ROLE_KEY, selectedRole);

    const roleRoutes: Record<RoleId, string> = {
      fisherman: "/fisherman",
      operator: "/operator",
      authority: "/authority",
      emergency: "/emergency",
      researcher: "/researcher",
      public: "/public",
    };

    navigate(roleRoutes[selectedRole]);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Back
          </button>

          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Anchor size={18} strokeWidth={2} />
            </span>

            <span className="text-base font-semibold tracking-tight text-slate-950">
              ORCA
            </span>
          </div>
        </header>

        {/* Intro */}
        <section className="mx-auto mt-10 w-full max-w-2xl text-center sm:mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Choose your experience
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
            How will you use ORCA?
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Select the role that best matches you. ORCA will open the
            experience designed for that role.
          </p>
        </section>

        {/* Roles */}
        <section className="mx-auto mt-8 w-full max-w-4xl sm:mt-10">
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => {
              const Icon = role.icon;
              const selected = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  aria-pressed={selected}
                  className={[
                    "group flex min-h-[108px] w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                    "focus:outline-none focus:ring-4 focus:ring-blue-100",
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {/* Icon */}
                  <span
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition",
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <Icon size={20} strokeWidth={1.9} />
                  </span>

                  {/* Text */}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-950">
                      {role.name}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {role.description}
                    </span>
                  </span>

                  {/* Selection indicator */}
                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                      selected
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 bg-white",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {selected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-white"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Continue */}
        <section className="mx-auto mt-6 w-full max-w-4xl pb-4 sm:mt-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="px-1 text-center sm:text-left">
                <p className="text-xs font-medium text-slate-400">
                  SELECTED ROLE
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedRole
                    ? roles.find(
                        (role) => role.id === selectedRole,
                      )?.name
                    : "Choose a role to continue"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedRole}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
              >
                Continue
                <ArrowRight size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>

        <p className="mt-auto pt-4 text-center text-xs text-slate-400">
          You can change your role later.
        </p>
      </div>
    </main>
  );
}

export default RoleSelection;