import { ArrowRight, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  commitmentSummary,
  monitorStateLabel,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";
import {
  formatMarineValue,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function EmergencyHome() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const { state } = useLatestMarineState();
  const hasEmergency =
    snapshot.monitor?.state === "VIOLATED" ||
    snapshot.monitor?.state === "AT_RISK";

  return (
    <section className="space-y-5 sm:space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          EMERGENCY
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Emergency overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          This workspace shows available marine and decision context. It does
          not create incidents.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          {hasEmergency ? monitorStateLabel(snapshot) : "No active emergency"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {commitmentSummary(snapshot)}. Wave: {formatMarineValue(state?.wave)}.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Nav title="Alerts" to="/emergency/alerts" />
        <Nav title="Map" to="/emergency/map" />
        <Nav title="Incidents" to="/emergency/incidents" />
        <Nav title="Response" to="/emergency/response" />
        <Nav title="Profile" to="/emergency/profile" />
      </section>
    </section>
  );
}

function Nav({ title, to }: { title: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left"
    >
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        <LifeBuoy size={16} className="text-blue-600" />
        {title}
      </span>
      <ArrowRight size={16} className="text-slate-400" />
    </button>
  );
}

export default EmergencyHome;
