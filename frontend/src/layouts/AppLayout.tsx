import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  Waves,
} from "lucide-react";

import BottomNav from "../components/navigation/BottomNav";

type RoleKey =
  | "fisherman"
  | "operator"
  | "authority"
  | "emergency"
  | "researcher"
  | "public"
  | "core"
  | "marine";

type RoleConfig = {
  label: string;
  home: string;
  profile?: string;
  showBottomNav: boolean;
};

const roleConfig: Record<RoleKey, RoleConfig> = {
  fisherman: {
    label: "Fisherman",
    home: "/fisherman",
    profile: "/fisherman/profile",
    showBottomNav: true,
  },

  operator: {
    label: "Maritime operator",
    home: "/operator",
    profile: "/operator/profile",
    showBottomNav: false,
  },

  authority: {
    label: "Coastal authority",
    home: "/authority",
    profile: "/authority/profile",
    showBottomNav: false,
  },

  emergency: {
    label: "Emergency responder",
    home: "/emergency",
    profile: "/emergency/profile",
    showBottomNav: false,
  },

  researcher: {
    label: "Researcher",
    home: "/researcher",
    profile: "/researcher/profile",
    showBottomNav: false,
  },

  public: {
    label: "Public",
    home: "/public",
    profile: "/public/profile",
    showBottomNav: false,
  },

  core: {
    label: "ORCA",
    home: "/",
    showBottomNav: false,
  },

  marine: {
    label: "Marine",
    home: "/marine",
    showBottomNav: false,
  },
};

function getRole(pathname: string): RoleKey {
  if (pathname.startsWith("/fisherman")) {
    return "fisherman";
  }

  if (pathname.startsWith("/operator")) {
    return "operator";
  }

  if (pathname.startsWith("/authority")) {
    return "authority";
  }

  if (pathname.startsWith("/emergency")) {
    return "emergency";
  }

  if (pathname.startsWith("/researcher")) {
    return "researcher";
  }

  if (pathname.startsWith("/public")) {
    return "public";
  }

  if (pathname.startsWith("/marine")) {
    return "marine";
  }

  return "core";
}

function getPageTitle(pathname: string): string {
  if (pathname === "/fisherman") return "Home";
  if (pathname === "/fisherman/map") return "Marine";
  if (pathname === "/fisherman/trip") return "Trip planner";
  if (pathname === "/fisherman/trip/details") return "Trip details";
  if (pathname === "/fisherman/decisions") return "Decisions";
  if (pathname === "/fisherman/commitment") return "Commitment";
  if (pathname === "/fisherman/activity") return "Activity";
  if (pathname === "/fisherman/profile") return "Profile";
  if (pathname === "/fisherman/offline") return "Offline";
  if (pathname === "/fisherman/voice") return "Voice";

  if (pathname === "/operator") return "Operations";
  if (pathname === "/operator/fleet") return "Fleet";
  if (pathname.startsWith("/operator/fleet/")) return "Vessel details";
  if (pathname === "/operator/operations") return "Operations";
  if (pathname === "/operator/map") return "Operations map";
  if (pathname === "/operator/alerts") return "Alerts";
  if (pathname === "/operator/decisions") return "Decisions";
  if (pathname === "/operator/profile") return "Profile";

  if (pathname === "/authority") return "Coastal overview";
  if (pathname === "/authority/operations") return "Affected operations";
  if (pathname === "/authority/hazards") return "Hazards";
  if (pathname === "/authority/map") return "Coastal map";
  if (pathname === "/authority/coordination") return "Coordination";
  if (pathname === "/authority/situations") return "Situations";
  if (pathname === "/authority/profile") return "Profile";

  if (pathname === "/emergency") return "Emergency overview";
  if (pathname === "/emergency/alerts") return "Alerts";
  if (pathname === "/emergency/map") return "Emergency map";
  if (pathname === "/emergency/incidents") return "Incidents";
  if (pathname.startsWith("/emergency/incidents/")) return "Incident details";
  if (pathname === "/emergency/response") return "Response";
  if (pathname === "/emergency/profile") return "Profile";

  if (pathname === "/researcher") return "Research";
  if (pathname === "/researcher/evidence") return "Evidence";
  if (pathname === "/researcher/observations") return "Observations";
  if (pathname === "/researcher/decision-context") {
    return "Decision context";
  }
  if (pathname === "/researcher/history") return "History";
  if (pathname === "/researcher/map") return "Research map";
  if (pathname === "/researcher/profile") return "Profile";

  if (pathname === "/public") return "Marine information";
  if (pathname === "/public/map") return "Marine map";
  if (pathname === "/public/conditions") return "Conditions";
  if (pathname === "/public/warnings") return "Warnings";
  if (pathname === "/public/profile") return "Profile";

  if (pathname === "/marine") return "Marine";
  if (pathname === "/marine/weather") return "Weather";
  if (pathname === "/marine/ocean") return "Ocean";
  if (pathname === "/marine/pfz") return "PFZ";
  if (pathname === "/marine/hazards") return "Hazards";
  if (pathname === "/marine/routes") return "Routes";

  if (pathname === "/decisions") return "Decisions";
  if (pathname === "/decisions/current") return "Decision details";
  if (pathname.startsWith("/decisions/")) return "Decision details";

  if (pathname === "/commitment") return "Commitment";
  if (pathname.startsWith("/commitment/")) return "Commitment details";

  if (pathname === "/monitoring") return "Monitoring";
  if (pathname === "/impact") return "Impact";
  if (pathname === "/repair") return "Repair";

  return "ORCA";
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;
  const role = getRole(pathname);
  const config = roleConfig[role];
  const pageTitle = getPageTitle(pathname);

  const isRoleHome = pathname === config.home;
  const isCorePage =
    pathname === "/marine" ||
    pathname === "/decisions" ||
    pathname === "/commitment" ||
    pathname === "/monitoring" ||
    pathname === "/impact" ||
    pathname === "/repair";

  const showBackButton = !isRoleHome;

  const handleHome = () => {
    navigate(config.home);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(config.home);
  };

  const handleProfile = () => {
    if (config.profile) {
      navigate(config.profile);
      return;
    }

    navigate(config.home);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-white">
        {/* Header */}
        <header className="sticky top-0 z-[2000] shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Navigation control */}
              {showBackButton ? (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <ArrowLeft
                    size={19}
                    strokeWidth={2}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleHome}
                  aria-label="Go to ORCA home"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <Waves
                    size={20}
                    strokeWidth={2}
                  />
                </button>
              )}

              {/* Identity */}
              <button
                type="button"
                onClick={handleHome}
                className="min-w-0 text-left"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isCorePage ? "ORCA" : config.label}
                </p>

                <h1 className="truncate text-[15px] font-semibold text-slate-950">
                  {pageTitle}
                </h1>
              </button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(
                  role === "fisherman"
                    ? "/fisherman/activity"
                    : role === "operator"
                      ? "/operator/alerts"
                      : role === "public"
                        ? "/public/warnings"
                        : role === "authority"
                          ? "/authority/hazards"
                          : role === "emergency"
                            ? "/emergency/alerts"
                            : role === "researcher"
                              ? "/researcher/evidence"
                              : config.home,
                )}
                aria-label="Open alerts or activity"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Bell
                  size={19}
                  strokeWidth={1.9}
                />
              </button>

              <button
                type="button"
                onClick={handleProfile}
                aria-label="Open profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                {role === "operator"
                  ? "O"
                  : role === "authority"
                    ? "A"
                    : role === "emergency"
                      ? "E"
                      : role === "researcher"
                        ? "R"
                        : role === "public"
                          ? "P"
                          : "U"}
              </button>

              {!isRoleHome && role !== "core" && (
                <button
                  type="button"
                  onClick={handleHome}
                  aria-label={`Go to ${config.label} home`}
                  className="hidden h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:flex"
                >
                  Home
                  <ChevronDown
                    size={14}
                    strokeWidth={1.8}
                  />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="min-h-0 flex-1">
          <div
            className={[
              "relative isolate z-0 mx-auto w-full max-w-7xl",
              "px-4 py-5",
              "sm:px-6 sm:py-7",
              "lg:px-8 lg:py-8",
              config.showBottomNav
                ? "pb-[calc(92px+env(safe-area-inset-bottom))] sm:pb-[calc(96px+env(safe-area-inset-bottom))]"
                : "pb-8",
            ].join(" ")}
          >
            <Outlet />
          </div>
        </main>

        {/* Fisherman navigation only */}
        {config.showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}

export default AppLayout;