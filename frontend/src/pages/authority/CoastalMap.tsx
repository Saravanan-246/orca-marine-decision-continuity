import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";
import { locationLabel, readWorkspaceSnapshot } from "../../lib/roleWorkspace";
import { tripRouteForMap } from "../../lib/orcaSession";

function CoastalMap() {
  const navigate = useNavigate();
  const snapshot = readWorkspaceSnapshot();
  const trip =
    snapshot.commitment?.trip ?? snapshot.decision ?? snapshot.draft;
  const route = tripRouteForMap(trip);

  return (
    <section className="space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/authority")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Authority
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Coastal map
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Current location: {locationLabel()}. No invented markers or
          boundaries.
        </p>
      </header>

      <MarineMap route={route} />
    </section>
  );
}

export default CoastalMap;
