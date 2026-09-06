import { Navigate, Route, Routes } from "react-router-dom";

import App from "../App";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import RoleSelection from "../pages/role/RoleSelection";

import AppLayout from "../layouts/AppLayout";

/* =========================================================
   FISHERMAN
========================================================= */
import FishermanHome from "../pages/fisherman/FishermanHome";
import FishermanMap from "../pages/fisherman/FishermanMap";
import TripPlanner from "../pages/fisherman/TripPlanner";
import TripDetails from "../pages/fisherman/TripDetails";
import FishermanDecisions from "../pages/fisherman/FishermanDecisions";
import FishermanCommitments from "../pages/fisherman/FishermanCommitments";
import Activity from "../pages/fisherman/Activity";
import Profile from "../pages/fisherman/Profile";
import Offline from "../pages/fisherman/Offline";
import Voice from "../pages/fisherman/Voice";

/* =========================================================
   OPERATOR
========================================================= */
import OperatorHome from "../pages/operator/OperatorHome";
import Fleet from "../pages/operator/Fleet";
import VesselDetails from "../pages/operator/VesselDetails";
import Operations from "../pages/operator/Operations";
import OperatorMap from "../pages/operator/OperatorMap";
import OperatorAlerts from "../pages/operator/OperatorAlerts";
import OperatorDecisions from "../pages/operator/OperatorDecisions";
import OperatorProfile from "../pages/operator/OperatorProfile";

/* =========================================================
   RESEARCHER
========================================================= */
import ResearcherHome from "../pages/researcher/ResearcherHome";
import Evidence from "../pages/researcher/Evidence";
import Observations from "../pages/researcher/Observations";
import DecisionContext from "../pages/researcher/DecisionContext";
import History from "../pages/researcher/History";
import ResearchMap from "../pages/researcher/ResearchMap";
import ResearcherProfile from "../pages/researcher/ResearcherProfile";

/* =========================================================
   PUBLIC
========================================================= */
import PublicHome from "../pages/public/PublicHome";
import PublicMap from "../pages/public/PublicMap";
import PublicConditions from "../pages/public/PublicConditions";
import PublicWarnings from "../pages/public/PublicWarnings";
import PublicProfile from "../pages/public/PublicProfile";

/* =========================================================
   SHARED ORCA LIFECYCLE
========================================================= */
import Decisions from "../pages/decisions/Decisions";
import DecisionDetails from "../pages/decisions/DecisionDetails";

import Commitment from "../pages/commitment/Commitment";
import CommitmentDetails from "../pages/commitment/CommitmentDetails";

import Monitoring from "../pages/monitoring/Monitoring";
import Impact from "../pages/impact/Impact";
import Repair from "../pages/repair/Repair";

/* =========================================================
   MARINE
========================================================= */
import Marine from "../pages/marine/Marine";
import Weather from "../pages/marine/Weather";
import Ocean from "../pages/marine/Ocean";
import PFZ from "../pages/marine/PFZ";
import Hazards from "../pages/marine/Hazards";
import MarineRoutes from "../pages/marine/Routes";

/* =========================================================
   TEMPORARY ROLE PLACEHOLDER
========================================================= */
function RoleComingSoon({
  role,
}: {
  role: string;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <span className="text-lg font-semibold">
            O
          </span>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          ORCA
        </p>

        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {role} experience
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          This stakeholder workspace is part of the ORCA architecture and will
          be connected here as its dedicated experience is completed.
        </p>
      </div>
    </section>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* =====================================================
          PUBLIC / AUTH
      ===================================================== */}
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/role" element={<RoleSelection />} />

      {/* =====================================================
          APPLICATION
      ===================================================== */}
      <Route element={<AppLayout />}>
        {/* ---------------------------------------------------
            FISHERMAN
        --------------------------------------------------- */}
        <Route
          path="/fisherman"
          element={<FishermanHome />}
        />

        <Route
          path="/fisherman/map"
          element={<FishermanMap />}
        />

        <Route
          path="/fisherman/trip"
          element={<TripPlanner />}
        />

        <Route
          path="/fisherman/trip/details"
          element={<TripDetails />}
        />

        <Route
          path="/fisherman/decisions"
          element={<FishermanDecisions />}
        />

        <Route
          path="/fisherman/commitment"
          element={<FishermanCommitments />}
        />

        <Route
          path="/fisherman/activity"
          element={<Activity />}
        />

        <Route
          path="/fisherman/profile"
          element={<Profile />}
        />

        <Route
          path="/fisherman/offline"
          element={<Offline />}
        />

        <Route
          path="/fisherman/voice"
          element={<Voice />}
        />

        {/* ---------------------------------------------------
            OPERATOR
        --------------------------------------------------- */}
        <Route
          path="/operator"
          element={<OperatorHome />}
        />

        <Route
          path="/operator/fleet"
          element={<Fleet />}
        />

        <Route
          path="/operator/fleet/:id"
          element={<VesselDetails />}
        />

        <Route
          path="/operator/operations"
          element={<Operations />}
        />

        <Route
          path="/operator/map"
          element={<OperatorMap />}
        />

        <Route
          path="/operator/alerts"
          element={<OperatorAlerts />}
        />

        <Route
          path="/operator/decisions"
          element={<OperatorDecisions />}
        />

        <Route
          path="/operator/profile"
          element={<OperatorProfile />}
        />

        {/* ---------------------------------------------------
            COASTAL AUTHORITY
        --------------------------------------------------- */}
        <Route
          path="/authority"
          element={<RoleComingSoon role="Coastal authority" />}
        />

        {/* ---------------------------------------------------
            EMERGENCY RESPONDER
        --------------------------------------------------- */}
        <Route
          path="/emergency"
          element={
            <RoleComingSoon role="Emergency responder" />
          }
        />

        {/* ---------------------------------------------------
            RESEARCHER
        --------------------------------------------------- */}
        <Route
          path="/researcher"
          element={<ResearcherHome />}
        />

        <Route
          path="/researcher/evidence"
          element={<Evidence />}
        />

        <Route
          path="/researcher/observations"
          element={<Observations />}
        />

        <Route
          path="/researcher/decision-context"
          element={<DecisionContext />}
        />

        <Route
          path="/researcher/history"
          element={<History />}
        />

        <Route
          path="/researcher/map"
          element={<ResearchMap />}
        />

        <Route
          path="/researcher/profile"
          element={<ResearcherProfile />}
        />

        {/* ---------------------------------------------------
            PUBLIC
        --------------------------------------------------- */}
        <Route
          path="/public"
          element={<PublicHome />}
        />

        <Route
          path="/public/map"
          element={<PublicMap />}
        />

        <Route
          path="/public/conditions"
          element={<PublicConditions />}
        />

        <Route
          path="/public/warnings"
          element={<PublicWarnings />}
        />

        <Route
          path="/public/profile"
          element={<PublicProfile />}
        />

        {/* ---------------------------------------------------
            SHARED DECISION
        --------------------------------------------------- */}
        <Route
          path="/decisions"
          element={<Decisions />}
        />

        <Route
          path="/decisions/current"
          element={<DecisionDetails />}
        />

        <Route
          path="/decisions/:id"
          element={<DecisionDetails />}
        />

        {/* ---------------------------------------------------
            SHARED COMMITMENT
        --------------------------------------------------- */}
        <Route
          path="/commitment"
          element={<Commitment />}
        />

        <Route
          path="/commitment/:id"
          element={<CommitmentDetails />}
        />

        {/* ---------------------------------------------------
            MONITORING → IMPACT → REPAIR
        --------------------------------------------------- */}
        <Route
          path="/monitoring"
          element={<Monitoring />}
        />

        <Route
          path="/impact"
          element={<Impact />}
        />

        <Route
          path="/repair"
          element={<Repair />}
        />

        {/* ---------------------------------------------------
            MARINE
        --------------------------------------------------- */}
        <Route
          path="/marine"
          element={<Marine />}
        />

        <Route
          path="/marine/weather"
          element={<Weather />}
        />

        <Route
          path="/marine/ocean"
          element={<Ocean />}
        />

        <Route
          path="/marine/pfz"
          element={<PFZ />}
        />

        <Route
          path="/marine/hazards"
          element={<Hazards />}
        />

        <Route
          path="/marine/routes"
          element={<MarineRoutes />}
        />
      </Route>

      {/* =====================================================
          FALLBACK
      ===================================================== */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;