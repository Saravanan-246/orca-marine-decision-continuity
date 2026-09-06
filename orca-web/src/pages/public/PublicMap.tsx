import {
  ArrowLeft,
  CloudSun,
  Layers3,
  MapPinned,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";

type PublicLayer = "weather" | "ocean" | "warnings";

const layers: {
  id: PublicLayer;
  label: string;
  icon: typeof Waves;
}[] = [
  {
    id: "weather",
    label: "Weather",
    icon: CloudSun,
  },
  {
    id: "ocean",
    label: "Ocean",
    icon: Waves,
  },
  {
    id: "warnings",
    label: "Warnings",
    icon: MapPinned,
  },
];

function PublicMap() {
  const navigate = useNavigate();

  const [activeLayer, setActiveLayer] =
    useState<PublicLayer | null>(null);

  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <section className="space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/public")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Public
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPinned size={21} strokeWidth={1.9} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Public
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Marine map
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Explore public marine information around the selected area.
            </p>
          </div>
        </div>
      </header>

      {/* Map */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative">
          <MarineMap />

          <div className="absolute left-3 top-3 z-[1000]">
            <button
              type="button"
              onClick={() => setLayersOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
              aria-label="Open public map layers"
              aria-expanded={layersOpen}
            >
              <Layers3 size={19} strokeWidth={2} />
            </button>

            {layersOpen && (
              <div className="mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                {layers.map((layer) => {
                  const Icon = layer.icon;
                  const selected = activeLayer === layer.id;

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() =>
                        setActiveLayer(
                          selected ? null : layer.id,
                        )
                      }
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                        selected
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon size={16} strokeWidth={1.9} />
                      <span className="flex-1">
                        {layer.label}
                      </span>

                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3.5 sm:px-5">
          <p className="text-xs font-medium text-slate-400">
            PUBLIC MAP
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {activeLayer
              ? `${layers.find((layer) => layer.id === activeLayer)?.label} selected`
              : "Marine area"}
          </p>
        </div>
      </section>

      {/* Public context */}
      <section className="grid gap-3 sm:grid-cols-3">
        <ContextCard
          icon={<CloudSun size={18} strokeWidth={1.9} />}
          label="Weather"
          value="Unavailable"
        />

        <ContextCard
          icon={<Waves size={18} strokeWidth={1.9} />}
          label="Ocean"
          value="Unavailable"
        />

        <ContextCard
          icon={<MapPinned size={18} strokeWidth={1.9} />}
          label="Warnings"
          value="No data"
        />
      </section>
    </section>
  );
}

function ContextCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-400">
        {value}
      </p>
    </div>
  );
}

export default PublicMap;