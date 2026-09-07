import { ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  commitmentSummary,
  isolationSummary,
  monitorStateLabel,
  readWorkspaceSnapshot,
} from "../../lib/roleWorkspace";
import {
  formatMarineValue,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function AuthorityHome() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const isolation = isolationSummary(snapshot);
  const { state } = useLatestMarineState();
  const waveLive = marineValueIsLive(state?.wave);

  return (
    <section className="space-y-5 sm:space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          COASTAL AUTHORITY
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Coastal overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Review available commitment, monitoring and marine status. Nothing
          here is invented when a source is missing.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Summary
          label="Commitment"
          value={snapshot.commitment?.id ?? "None"}
        />
        <Summary
          label="Monitoring"
          value={monitorStateLabel(snapshot)}
        />
        <Summary
          label="Affected segments"
          value={
            isolation?.hasData
              ? isolation.affected
              : "No affected operations available"
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-950">
          Current operational context
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {commitmentSummary(snapshot)}. Wave: {formatMarineValue(state?.wave)}
          {waveLive ? "" : " (not live)"}.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <NavCard
          title="Affected operations"
          description="Affected versus preserved segments from ORCA monitoring."
          onClick={() => navigate("/authority/operations")}
        />
        <NavCard
          title="Hazards"
          description="Marine-state hazards when a connected source provides them."
          onClick={() => navigate("/authority/hazards")}
        />
        <NavCard
          title="Coastal map"
          description="Available location context on the marine map."
          onClick={() => navigate("/authority/map")}
        />
        <NavCard
          title="Coordination"
          description="Decision and commitment records available in this session."
          onClick={() => navigate("/authority/coordination")}
        />
        <NavCard
          title="Situations"
          description="Current ORCA monitoring and commitment state."
          onClick={() => navigate("/authority/situations")}
        />
        <NavCard
          title="Profile"
          description="Role and navigation."
          onClick={() => navigate("/authority/profile")}
        />
      </section>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function NavCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Building2 size={18} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <ArrowRight size={16} className="shrink-0 text-slate-400" />
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </button>
  );
}

export default AuthorityHome;
