import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CloudSun,
  Compass,
  Layers3,
  LocateFixed,
  MapPinned,
  Navigation,
  Waves,
  Wind,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import MarineMap from "../../components/marine/MarineMap";
import {
  formatMapLocation,
  persistTripDestination,
  readTripDraft,
  syncTripDraftFromMap,
} from "../../lib/orcaSession";
import { useLiveGpsLocation } from "../../lib/useLiveGpsLocation";
import {
  formatMarineValue,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

type LayerId =
  | "weather"
  | "ocean"
  | "pfz"
  | "hazards"
  | "boundary"
  | "route";

type Layer = {
  id: LayerId;
  label: string;
  icon: typeof Waves;
};

type MapNavigationState = {
  fromTripPlanner?: boolean;
};

const layers: Layer[] = [
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
    id: "pfz",
    label: "PFZ",
    icon: Navigation,
  },
  {
    id: "hazards",
    label: "Hazards",
    icon: Wind,
  },
  {
    id: "boundary",
    label: "Boundary",
    icon: MapPinned,
  },
  {
    id: "route",
    label: "Route",
    icon: Compass,
  },
];

function FishermanMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as MapNavigationState;
  const selectingDestination = Boolean(navState.fromTripPlanner);

  const [activeLayer, setActiveLayer] = useState<LayerId | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [destination, setDestination] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const from = useLiveGpsLocation();
  const { state } = useLatestMarineState();
  const waveLive = marineValueIsLive(state?.wave);
  const windLive = marineValueIsLive(state?.wind);

  useEffect(() => {
    syncTripDraftFromMap();
    setDestination(readTripDraft()?.to ?? null);
  }, [location.key]);

  const persistDestination = useCallback(
    (coords: { lat: number; lon: number }) => {
      setDestination(coords);
      persistTripDestination(coords);
    },
    [],
  );

  const route = useMemo(
    () =>
      from && destination
        ? [
            { lat: from.lat, lng: from.lon },
            { lat: destination.lat, lng: destination.lon },
          ]
        : undefined,
    [destination, from],
  );

  const selectedLayer = layers.find((layer) => layer.id === activeLayer);

  const confirmDestination = () => {
    if (!destination) {
      return;
    }
    persistDestination(destination);
    navigate("/fisherman/trip", { state: { fromMap: true } });
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            Marine
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {selectingDestination ? "Choose fishing area" : "Explore the sea"}
          </h1>

          {selectingDestination && (
            <p className="mt-1 text-sm text-slate-500">
              Tap the map to set your destination. Your current location is the
              trip From point.
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <MapPinned size={19} strokeWidth={1.9} />
        </div>
      </div>

      {/* Map workspace */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative">
          <MarineMap
            route={route}
            destination={
              destination
                ? { lat: destination.lat, lng: destination.lon }
                : null
            }
            selectDestination={selectingDestination}
            tripPlanning={selectingDestination || Boolean(destination)}
            onSelectDestination={(coords) => {
              persistDestination({ lat: coords.lat, lon: coords.lng });
            }}
          />

          {/* Map layer menu */}
          <div className="absolute left-3 top-3 z-[1000]">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowLayers((value) => !value)}
                aria-expanded={showLayers}
                aria-label="Open map layers"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Layers3 size={19} strokeWidth={2} />
              </button>

              {showLayers && (
                <div className="w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      Map layers
                    </p>
                  </div>

                  <div className="p-1.5">
                    {layers.map((layer) => {
                      const Icon = layer.icon;
                      const selected = activeLayer === layer.id;

                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() =>
                            setActiveLayer(selected ? null : layer.id)
                          }
                          className={[
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                            selected
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          ].join(" ")}
                        >
                          <Icon size={16} strokeWidth={1.9} />
                          <span className="flex-1">{layer.label}</span>
                          {selected && (
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map information bar */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">MAP VIEW</p>

            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
              {selectingDestination
                ? destination
                  ? `Fishing area: ${formatMapLocation(destination)}`
                  : "Tap the map to set fishing area"
                : selectedLayer
                  ? `${selectedLayer.label} layer selected`
                  : "Marine area"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
            <LocateFixed size={14} strokeWidth={1.9} />
            <span>{from ? "From set" : "From pending"}</span>
          </div>
        </div>
      </div>

      {/* Marine snapshot */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-950">
            Marine snapshot
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Conditions connected to your current marine area.
          </p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <SnapshotItem
            icon={<Waves size={17} strokeWidth={1.9} />}
            label="Wave"
            value={formatMarineValue(state?.wave)}
            live={waveLive}
          />

          <SnapshotItem
            icon={<Wind size={17} strokeWidth={1.9} />}
            label="Wind"
            value={formatMarineValue(state?.wind)}
            live={windLive}
          />

          <SnapshotItem
            icon={<CloudSun size={17} strokeWidth={1.9} />}
            label="Weather"
            value="Unavailable"
          />
        </div>
      </section>

      {/* Active context */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
            <Navigation size={17} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Trip context
            </h2>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ContextChip
                label="Your location"
                value={formatMapLocation(from)}
                tone="from"
              />
              <ContextChip
                label="Fishing area"
                value={
                  destination
                    ? formatMapLocation(destination)
                    : "Not selected"
                }
                tone="to"
              />
            </div>

            {selectingDestination && (
              <button
                type="button"
                disabled={!destination}
                onClick={confirmDestination}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Use this fishing area
              </button>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

type SnapshotItemProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  live?: boolean;
};

function SnapshotItem({
  icon,
  label,
  value = "Unavailable",
  live = false,
}: SnapshotItemProps) {
  return (
    <div className="min-w-0 px-2 py-4 sm:px-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>

      <p
        className={[
          "mt-1 break-words text-sm font-semibold",
          live ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function ContextChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "from" | "to";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p
        className={[
          "text-[11px] font-semibold uppercase tracking-wide",
          tone === "from" ? "text-blue-600" : "text-teal-700",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default FishermanMap;
