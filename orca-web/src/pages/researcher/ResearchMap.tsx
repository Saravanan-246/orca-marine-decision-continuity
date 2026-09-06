import {
  ArrowLeft,
  Layers3,
  MapPinned,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";

type ResearchLayer =
  | "observations"
  | "evidence"
  | "hazards"
  | "areas";

const layers: {
  id: ResearchLayer;
  label: string;
  icon: typeof Waves;
}[] = [
  {
    id: "observations",
    label: "Observations",
    icon: Waves,
  },
  {
    id: "evidence",
    label: "Evidence",
    icon: MapPinned,
  },
  {
    id: "hazards",
    label: "Hazards",
    icon: MapPinned,
  },
  {
    id: "areas",
    label: "Research areas",
    icon: Layers3,
  },
];

function ResearchMap() {
  const navigate = useNavigate();

  const [activeLayers, setActiveLayers] =
    useState<ResearchLayer[]>([
      "observations",
    ]);

  const [layersOpen, setLayersOpen] = useState(false);

  const toggleLayer = (id: ResearchLayer) => {
    setActiveLayers((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/researcher")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Research
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPinned size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Researcher
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Research map
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore the spatial context of marine observations and evidence.
            </p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative">
          <MarineMap />

          <div className="absolute left-3 top-3 z-[1000]">
            <button
              type="button"
              onClick={() =>
                setLayersOpen((value) => !value)
              }
              aria-label="Research map layers"
              aria-expanded={layersOpen}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
            >
              <Layers3 size={19} strokeWidth={2} />
            </button>

            {layersOpen && (
              <div className="mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                {layers.map((layer) => {
                  const Icon = layer.icon;
                  const active = activeLayers.includes(
                    layer.id,
                  );

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() =>
                        toggleLayer(layer.id)
                      }
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.9}
                      />

                      <span className="flex-1">
                        {layer.label}
                      </span>

                      {active && (
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          <MapState
            label="Observations"
            value="Source dependent"
          />

          <MapState
            label="Evidence"
            value="Source dependent"
          />

          <MapState
            label="Hazards"
            value="Source dependent"
          />

          <MapState
            label="Layers"
            value={`${activeLayers.length} selected`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Waves
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Spatial research context
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Map layers are a spatial view of connected evidence. They should
              carry the same source and freshness context as the underlying
              records.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function MapState({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-600">
        {value}
      </p>
    </div>
  );
}

export default ResearchMap;