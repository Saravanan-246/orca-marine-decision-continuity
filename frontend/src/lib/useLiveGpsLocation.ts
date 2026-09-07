import { useEffect, useState } from "react";

import {
  MAP_LOCATION_EVENT,
  readMapLocation,
  type MapLocation,
} from "./orcaSession";

export function useLiveGpsLocation(): MapLocation | null {
  const [location, setLocation] = useState<MapLocation | null>(null);

  useEffect(() => {
    const sync = () => {
      setLocation(readMapLocation());
    };

    sync();
    window.addEventListener(MAP_LOCATION_EVENT, sync);
    return () => {
      window.removeEventListener(MAP_LOCATION_EVENT, sync);
    };
  }, []);

  return location;
}
