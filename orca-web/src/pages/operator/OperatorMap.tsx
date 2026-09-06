import {
  ArrowLeft,
  Layers3,
  MapPinned,
  Navigation,
  Ship,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";

type MapLayer =
  | "vessels"
  | "routes"
  | "hazards"
  | "weather";

const layers: {
  id: MapLayer;
  label: string;
  icon: typeof Ship;
}[] = [
  {
    id: "vessels",
    label: "Vessels",
    icon: Ship,
  },
  {
    id: "routes",
    label: "Routes",
    icon: Navigation,
  },
  {
    id: "hazards",
    label: "Hazards",
    icon: MapPinned,
  },
  {
    id: "weather",
    label: "Weather",
    icon: Layers3,
  },
];

function OperatorMap() {
  const navigate = useNavigate();
  const [activeLayers, setActiveLayers] = useState<MapLayer[]>([
    "vessels",
    "routes",
  ]);
  const [layersOpen, setLayersOpen] = useState(false);

  const toggleLayer = (id: MapLayer) => {
    setActiveLayers((current) =>
      current.includes(id)
        ? current.filter((layer) => layer !== id)
        : [...current, id],
    );
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/operator")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Operations
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPinned size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Operator
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Operations map
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              View operational location context, vessels and routes when
              connected.
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
              onClick={() => setLayersOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
              aria-label="Map layers"
              aria-expanded={layersOpen}
            >
              <Layers3 size={19} strokeWidth={2} />
            </button>

            {layersOpen && (
              <div className="mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                {layers.map((layer) => {
                  const Icon = layer.icon;
                  const active = activeLayers.includes(layer.id);

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => toggleLayer(layer.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                      <span className="flex-1">{layer.label}</span>

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

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-medium text-slate-400">
              OPERATIONAL MAP
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
              {activeLayers.length} layer
              {activeLayers.length === 1 ? "" : "s"} selected
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/operator/fleet")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open fleet
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-950">
          Operational map data
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Vessel positions, routes, weather and hazard overlays will appear
          when their real sources are connected.
        </p>
      </section>
    </section>
  );
}

export default OperatorMap;