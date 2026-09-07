import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";
import { locationLabel, readWorkspaceSnapshot } from "../../lib/roleWorkspace";
import { tripRouteForMap } from "../../lib/orcaSession";

function EmergencyMap() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const trip =
    snapshot.commitment?.trip ?? snapshot.decision ?? snapshot.draft;

  return (
    <section className="space-y-5">
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
          Emergency map
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Location: {locationLabel()}. No incident markers are added unless a
          source provides them.
        </p>
      </header>
      <MarineMap route={tripRouteForMap(trip)} />
    </section>
  );
}

export default EmergencyMap;
