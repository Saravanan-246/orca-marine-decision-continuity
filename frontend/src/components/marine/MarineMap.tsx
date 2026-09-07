import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
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

type LocationStatus =
  | "requesting"
  | "ready"
  | "denied"
  | "unavailable";

type MarineMapProps = {
  route?: RoutePoint[];
  boundary?: Boundary;
  className?: string;
  destination?: Coordinates | null;
  selectDestination?: boolean;
  onSelectDestination?: (coords: Coordinates) => void;
  tripPlanning?: boolean;
};

/** Tiles-only center when GPS is unavailable. Never used as From or ingest. */
const FALLBACK_MAP_CENTER: Coordinates = {
  lat: 8.5,
  lng: 76.9,
};

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 5000,
};

const userIcon = L.divIcon({
  className: "orca-location-marker",
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.16);animation:orcaPulse 2s ease-out infinite;"></div>
      <div style="position:absolute;left:4px;top:4px;width:16px;height:16px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.25);"></div>
    </div>
    <style>
      @keyframes orcaPulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        70% { transform: scale(1.5); opacity: 0; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    </style>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destinationIcon = L.divIcon({
  className: "orca-destination-marker",
  html: `
    <div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgba(15,118,110,0.18);"></div>
      <div style="position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:9999px;background:#0f766e;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(15,23,42,0.25);"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function formatCoord(coords: Coordinates): string {
  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}

function MapClickSelect({
  enabled,
  onSelect,
}: {
  enabled?: boolean;
  onSelect?: (coords: Coordinates) => void;
}) {
  const enabledRef = useRef(enabled);
  const onSelectRef = useRef(onSelect);
  enabledRef.current = enabled;
  onSelectRef.current = onSelect;

  useMapEvents({
    click(event) {
      if (!enabledRef.current || !onSelectRef.current) {
        return;
      }
      onSelectRef.current({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });
  return null;
}

function MapViewport({
  fromPoint,
  destination,
  route,
  boundary,
}: {
  fromPoint: Coordinates | null;
  destination?: Coordinates | null;
  route?: RoutePoint[];
  boundary?: Boundary;
}) {
  const map = useMap();

  const fitContent = useCallback(() => {
    const points: [number, number][] = [];

    if (fromPoint) {
      points.push([fromPoint.lat, fromPoint.lng]);
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
      map.flyTo(points[0], 13, { duration: 0.7 });
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [48, 48],
      maxZoom: 13,
      animate: true,
      duration: 0.7,
    });
  }, [boundary, destination, fromPoint, map, route]);

  useEffect(() => {
    if (fromPoint && destination) {
      fitContent();
      return;
    }

    if (fromPoint) {
      map.flyTo([fromPoint.lat, fromPoint.lng], 13, { duration: 0.7 });
    }
  }, [destination, fitContent, fromPoint, map]);

  return (
    <MapControls
      fromPoint={fromPoint}
      onLocate={() => {
        if (fromPoint) {
          map.flyTo([fromPoint.lat, fromPoint.lng], 14, { duration: 0.7 });
        }
      }}
      onFit={fitContent}
    />
  );
}

function MapControls({
  fromPoint,
  onLocate,
  onFit,
}: {
  fromPoint: Coordinates | null;
  onLocate: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <button
        type="button"
        onClick={onLocate}
        disabled={!fromPoint}
        aria-label="Go to your location"
        title="Your location"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LocateFixed size={19} strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={onFit}
        aria-label="Fit route on map"
        title="Fit route"
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
  tripPlanning = false,
}: MarineMapProps) {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("requesting");
  const [geoSettled, setGeoSettled] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  const applyGpsFix = useCallback((lat: number, lon: number) => {
    setPosition({ lat, lng: lon });
    saveMapLocation(lat, lon);
    setLocationStatus("ready");
    setGeoSettled(true);
  }, []);

  const requestCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      setGeoSettled(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        applyGpsFix(coords.latitude, coords.longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          setGeoSettled(true);
        }
      },
      GEO_OPTIONS,
    );
  }, [applyGpsFix]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      setGeoSettled(true);
      return;
    }

    setLocationStatus("requesting");
    requestCurrentPosition();

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        applyGpsFix(coords.latitude, coords.longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          setGeoSettled(true);
        }
      },
      GEO_OPTIONS,
    );

    const timeoutId = window.setTimeout(() => {
      setLocationStatus((status) => {
        if (status === "requesting") {
          return "unavailable";
        }
        return status;
      });
      setGeoSettled(true);
    }, 14000);

    return () => {
      window.clearTimeout(timeoutId);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [applyGpsFix, requestCurrentPosition]);

  const fromPoint = locationStatus === "ready" ? position : null;
  const mapCenter = fromPoint ?? FALLBACK_MAP_CENTER;
  const mapZoom = fromPoint ? 13 : 6;

  const routePositions = useMemo<[number, number][] | undefined>(() => {
    if (route?.length && route.length > 1) {
      return route.map((point) => [point.lat, point.lng]);
    }

    if (fromPoint && destination) {
      return [
        [fromPoint.lat, fromPoint.lng],
        [destination.lat, destination.lng],
      ];
    }

    return undefined;
  }, [destination, fromPoint, route]);

  const statusText =
    locationStatus === "ready"
      ? "Location found"
      : locationStatus === "requesting"
        ? "Requesting location…"
        : locationStatus === "denied"
          ? "Permission denied"
          : "Location unavailable";

  const routeStatus =
    mapError
      ? "Map tiles failed to load"
      : fromPoint && destination
        ? "Route drawn"
        : selectDestination && !destination
          ? "No destination selected — tap the map"
          : destination
            ? "Fishing area selected"
            : selectDestination
              ? "Tap the map to choose fishing area"
              : "Explore surrounding area";

  return (
    <div
      className={[
        "relative isolate w-full overflow-hidden rounded-2xl bg-slate-100",
        className,
      ].join(" ")}
    >
      <div className="h-[420px] w-full sm:h-[520px] lg:h-[620px]">
        {geoSettled ? (
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
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
              eventHandlers={{
                loading: () => {
                  setMapLoading(true);
                },
                load: () => {
                  setMapLoading(false);
                  setMapError(false);
                },
                tileerror: () => {
                  setMapError(true);
                  setMapLoading(false);
                },
              }}
            />

            <ZoomControl position="bottomright" />

            <MapViewport
              fromPoint={fromPoint}
              destination={destination}
              route={route}
              boundary={boundary}
            />

            <MapClickSelect
              enabled={selectDestination}
              onSelect={onSelectDestination}
            />

            {fromPoint && (
              <>
                <Marker position={[fromPoint.lat, fromPoint.lng]} icon={userIcon}>
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -14]}
                    className="orca-map-label"
                  >
                    Your location
                  </Tooltip>
                </Marker>

                <Circle
                  center={[fromPoint.lat, fromPoint.lng]}
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
                key={`to-${destination.lat.toFixed(6)}-${destination.lng.toFixed(6)}`}
                position={[destination.lat, destination.lng]}
                icon={destinationIcon}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -14]}
                  className="orca-map-label"
                >
                  Fishing area
                </Tooltip>
              </Marker>
            )}

            {routePositions && routePositions.length > 1 && (
              <>
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 5,
                    opacity: 0.92,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: "#0f766e",
                    weight: 2,
                    opacity: 0.55,
                    dashArray: "8 10",
                    lineCap: "round",
                  }}
                />
              </>
            )}
          </MapContainer>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Requesting location…
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Allow location access to center the marine map
            </p>
          </div>
        )}
      </div>

      {geoSettled && mapLoading && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center bg-white/40">
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
            Map loading…
          </p>
        </div>
      )}

      <div
        className={[
          "pointer-events-none absolute z-[1000]",
          tripPlanning
            ? "left-3 top-16 sm:left-[4.75rem] sm:top-3"
            : "left-3 top-3",
        ].join(" ")}
      >
        <div className="rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span
              className={[
                "flex h-7 w-7 items-center justify-center rounded-lg",
                locationStatus === "ready"
                  ? "bg-blue-50 text-blue-600"
                  : locationStatus === "requesting"
                    ? "bg-amber-50 text-amber-600"
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

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur">
            <p className="text-[11px] font-medium text-slate-400">
              {tripPlanning ? "TRIP ROUTE" : "MARINE MAP"}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-700">
              {routeStatus}
            </p>

            <div className="mt-2 grid gap-1.5 text-[11px] leading-4 sm:grid-cols-2">
              <p className="text-slate-600">
                <span className="font-semibold text-blue-700">From</span>
                {" · "}
                {fromPoint ? formatCoord(fromPoint) : "Location unavailable"}
              </p>
              <p className="text-slate-600">
                <span className="font-semibold text-teal-700">To</span>
                {" · "}
                {destination
                  ? formatCoord(destination)
                  : selectDestination
                    ? "Tap map to select"
                    : "Not selected"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestCurrentPosition}
            aria-label="Refresh current location"
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-blue-600"
          >
            <RefreshCw size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarineMap;
