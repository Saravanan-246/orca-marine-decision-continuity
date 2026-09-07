import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Crosshair,
  LocateFixed,
  Navigation,
  RefreshCw,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

import { saveMapLocation } from "../../lib/orcaSession";

type Coordinates = {
  lat: number;
  lng: number;
};

type RoutePoint = Coordinates;

type Boundary = Coordinates[];

type MarineMapProps = {
  route?: RoutePoint[];
  boundary?: Boundary;
  className?: string;
  destination?: Coordinates | null;
  selectDestination?: boolean;
  onSelectDestination?: (coords: Coordinates) => void;
};

const defaultCenter: Coordinates = {
  lat: 13.0827,
  lng: 80.2707,
};

const userIcon = L.divIcon({
  className: "orca-location-marker",
  html: `
    <div
      style="
        position: relative;
        width: 22px;
        height: 22px;
      "
    >
      <div
        style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.16);
          animation: orcaPulse 2s ease-out infinite;
        "
      ></div>

      <div
        style="
          position: absolute;
          left: 4px;
          top: 4px;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #2563eb;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
        "
      ></div>
    </div>

    <style>
      @keyframes orcaPulse {
        0% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        70% {
          transform: scale(1.5);
          opacity: 0;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
    </style>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destinationIcon = L.divIcon({
  className: "orca-destination-marker",
  html: `
    <div style="width:18px;height:18px;border-radius:9999px;background:#0f766e;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.25);"></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickSelect({
  enabled,
  onSelect,
}: {
  enabled?: boolean;
  onSelect?: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled || !onSelect) {
        return;
      }
      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });
  return null;
}

function MapViewport({
  position,
  route,
  boundary,
  destination,
}: {
  position: Coordinates | null;
  route?: RoutePoint[];
  boundary?: Boundary;
  destination?: Coordinates | null;
}) {
  const map = useMap();

  const fitContent = useCallback(() => {
    const points: [number, number][] = [];

    if (position) {
      points.push([position.lat, position.lng]);
    }

    if (destination) {
      points.push([destination.lat, destination.lng]);
    }

    route?.forEach((point) => {
      points.push([point.lat, point.lng]);
    });

    boundary?.forEach((point) => {
      points.push([point.lat, point.lng]);
    });

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.flyTo(points[0], 12, {
        duration: 0.7,
      });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [40, 40],
      maxZoom: 13,
      animate: true,
      duration: 0.7,
    });
  }, [boundary, destination, map, position, route]);

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 12, {
        duration: 0.7,
      });
    }
  }, [map, position]);

  return (
    <MapControls
      position={position}
      onLocate={() => {
        if (position) {
          map.flyTo([position.lat, position.lng], 13, {
            duration: 0.7,
          });
        }
      }}
      onFit={fitContent}
    />
  );
}

function MapControls({
  position,
  onLocate,
  onFit,
}: {
  position: Coordinates | null;
  onLocate: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={onLocate}
        disabled={!position}
        aria-label="Go to current location"
        title="My location"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LocateFixed size={19} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onFit}
        aria-label="Fit map to available data"
        title="Fit map"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
      >
        <Crosshair size={19} strokeWidth={2} />
      </button>
    </div>
  );
}

function MarineMap({
  route,
  boundary,
  className = "",
  destination = null,
  selectDestination = false,
  onSelectDestination,
}: MarineMapProps) {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "loading" | "ready" | "denied" | "error"
  >("loading");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({
          lat: coords.latitude,
          lng: coords.longitude,
        });
        saveMapLocation(coords.latitude, coords.longitude);

        setLocationStatus("ready");
      },
      (error) => {
        setLocationStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "error",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const center = position ?? defaultCenter;

  const routePositions = useMemo<[number, number][] | undefined>(() => {
    if (!route?.length) {
      return undefined;
    }

    return route.map((point) => [point.lat, point.lng]);
  }, [route]);

  const boundaryPositions = useMemo<[number, number][] | undefined>(() => {
    if (!boundary?.length) {
      return undefined;
    }

    return boundary.map((point) => [point.lat, point.lng]);
  }, [boundary]);

  const statusText =
    locationStatus === "ready"
      ? "Current location"
      : locationStatus === "loading"
        ? "Locating you..."
        : locationStatus === "denied"
          ? "Location access is off"
          : "Location unavailable";

  return (
    <div
      className={[
        "relative isolate w-full overflow-hidden rounded-2xl bg-slate-100",
        className,
      ].join(" ")}
    >
      <div className="h-[420px] w-full sm:h-[520px] lg:h-[620px]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={position ? 12 : 7}
          scrollWheelZoom
          zoomControl={false}
          doubleClickZoom
          dragging
          touchZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ZoomControl position="bottomright" />

          <MapViewport
            position={position}
            route={route}
            boundary={boundary}
            destination={destination}
          />

          <MapClickSelect
            enabled={selectDestination}
            onSelect={onSelectDestination}
          />

          {position && (
            <>
              <Marker
                position={[position.lat, position.lng]}
                icon={userIcon}
              />

              <Circle
                center={[position.lat, position.lng]}
                radius={250}
                pathOptions={{
                  color: "#2563eb",
                  weight: 1,
                  opacity: 0.45,
                  fillColor: "#2563eb",
                  fillOpacity: 0.05,
                }}
              />
            </>
          )}

          {destination && (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={destinationIcon}
            />
          )}

          {routePositions && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}

          {boundaryPositions && boundaryPositions.length > 2 && (
            <PolygonLayer positions={boundaryPositions} />
          )}
        </MapContainer>
      </div>

      {/* Top status */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
        <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span
              className={[
                "flex h-7 w-7 items-center justify-center rounded-lg",
                locationStatus === "ready"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              <Navigation size={15} strokeWidth={2} />
            </span>

            <div>
              <p className="text-[11px] font-medium text-slate-400">
                LOCATION
              </p>

              <p className="text-xs font-semibold text-slate-800">
                {statusText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom map status */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000]">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur">
            <p className="text-[11px] font-medium text-slate-400">
              MARINE MAP
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-700">
              {route?.length
                ? "Route available"
                : boundary?.length
                  ? "Marine boundary available"
                  : "Explore surrounding area"}
            </p>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            aria-label="Refresh current location"
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
          >
            <RefreshCw size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PolygonLayer({
  positions,
}: {
  positions: [number, number][];
}) {
  return (
    <CircleMarker
      center={positions[0]}
      radius={1}
      pathOptions={{
        opacity: 0,
        fillOpacity: 0,
      }}
    />
  );
}

export default MarineMap;