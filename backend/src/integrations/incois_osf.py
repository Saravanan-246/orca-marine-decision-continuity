"""
INCOIS Ocean State Forecast (OSF) adapter.

Access method:
    Public THREDDS catalog + NetcdfSubset (NCSS) point CSV for the
    operational WAVEWATCH III product ``rsmc_combined_ww3_YYYYMMDD.nc``.

No API key is required. Network failures and missing/NaN grid points
return UNKNOWN evidence instead of fabricated values.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

from src.core.config import get_settings
from src.integrations.base import NormalizedEvidence
from src.models.marine import DataStatus, MarineState, MarineValue


SOURCE = "INCOIS-OSF-WW3"
DATASET_PREFIX = "rsmc_combined_ww3_"
NCSS_GRID_BASE = "/thredds/ncss/grid/"
FILL_ABS = 1.0e30
TEMPORAL_RESOLUTION_H = 3.0
SPATIAL_RESOLUTION_KM = 11.1
USER_AGENT = "ORCA-INCOIS-OSF/1.0"

THREDDS_NS = {
    "c": "http://www.unidata.ucar.edu/namespaces/thredds/InvCatalog/v1.0"
}

# ORCA parameter -> (NCSS variable, unit)
DIRECT_FIELDS: dict[str, tuple[str, str]] = {
    "wave_height": ("HS", "m"),
    "wave_period": ("T02", "s"),
    "peak_wave_period": ("PWP", "s"),
    "mean_wave_direction": ("MWD", "deg"),
    "wind_u": ("UWND", "m/s"),
    "wind_v": ("VWND", "m/s"),
}

NCSS_VARIABLES: tuple[str, ...] = ("HS", "UWND", "VWND", "T02", "MWD")


GetText = Callable[[str, float], str]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def default_get_text(url: str, timeout: float) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def _parse_location(
    location: dict[str, Any] | None,
) -> tuple[float, float] | None:
    if not location:
        return None

    lat = location.get("lat", location.get("latitude"))
    lon = location.get("lon", location.get("longitude"))
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return None

    if not (-90.0 <= lat_f <= 90.0):
        return None
    if lon_f < -180.0 or lon_f > 360.0:
        return None
    if lon_f < 0:
        lon_f += 360.0
    return lat_f, lon_f


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        text = value.strip()
        if text == "" or text.lower() in {"nan", "null", "none"}:
            return True
        try:
            number = float(text)
        except ValueError:
            return True
        return math.isnan(number) or abs(number) >= FILL_ABS
    if isinstance(value, (int, float)):
        return math.isnan(float(value)) or abs(float(value)) >= FILL_ABS
    return True


def _as_float(value: Any) -> float | None:
    if _is_missing(value):
        return None
    return float(value)


def _parse_csv(text: str) -> tuple[list[str], list[dict[str, str]]]:
    reader = csv.reader(io.StringIO(text))
    try:
        header = next(reader)
    except StopIteration:
        return [], []

    columns = [item.strip() for item in header]
    keys = [re.sub(r"\[unit=.*?\]", "", column).strip() for column in columns]
    rows: list[dict[str, str]] = []
    for raw in reader:
        if not raw or all(not cell.strip() for cell in raw):
            continue
        rows.append(
            {
                keys[index]: raw[index].strip() if index < len(raw) else ""
                for index in range(len(keys))
            }
        )
    return keys, rows


def _parse_timestamp(value: str) -> datetime | None:
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def select_forecast_row(
    rows: list[dict[str, str]],
    as_of: datetime | None = None,
) -> dict[str, str] | None:
    timed: list[tuple[datetime, dict[str, str]]] = []
    for row in rows:
        stamp = _parse_timestamp(row.get("time", ""))
        if stamp is None:
            continue
        timed.append((stamp, row))
    if not timed:
        return None

    target = as_of.astimezone(timezone.utc) if as_of else _utc_now()
    timed.sort(key=lambda item: item[0])
    nearest = min(timed, key=lambda item: abs(item[0] - target))
    return nearest[1]


def latest_ww3_dataset(catalog_xml: str) -> str | None:
    root = ET.fromstring(catalog_xml)
    paths: list[str] = []
    for node in root.findall(".//c:dataset", THREDDS_NS):
        path = node.attrib.get("urlPath", "")
        name = node.attrib.get("name", "")
        if DATASET_PREFIX in path or name.startswith(DATASET_PREFIX):
            paths.append(path or f"osf/ww3/{name}")
    if not paths:
        return None
    paths.sort(reverse=True)
    return paths[0]


def _unavailable(
    parameter: str,
    location: dict[str, Any] | None,
) -> NormalizedEvidence:
    return NormalizedEvidence(
        parameter=parameter,
        value=None,
        unit=None,
        source=f"{SOURCE}-UNAVAILABLE",
        timestamp=_utc_now(),
        location=location,
        spatial_resolution_km=SPATIAL_RESOLUTION_KM,
        temporal_resolution_h=TEMPORAL_RESOLUTION_H,
        data_status=DataStatus.UNKNOWN,
    )


class IncoisOsfProvider:
    """
    Live INCOIS OSF WAVEWATCH III provider.

    Implements the existing MarineProvider.fetch contract.
    """

    def __init__(
        self,
        get_text: GetText | None = None,
        base_url: str | None = None,
        catalog_path: str | None = None,
        timeout: float | None = None,
        as_of: datetime | None = None,
    ) -> None:
        settings = get_settings()
        self.source = SOURCE
        self._get_text = get_text or default_get_text
        self._base_url = (base_url or settings.incois_osf_base_url).rstrip("/")
        self._catalog_path = (
            catalog_path or settings.incois_osf_ww3_catalog_path
        )
        self._timeout = (
            settings.incois_osf_timeout_seconds
            if timeout is None
            else timeout
        )
        self._as_of = as_of
        self._cache: dict[str, Any] | None = None

    def fetch(
        self,
        parameter: str,
        location: dict[str, Any] | None = None,
    ) -> NormalizedEvidence:
        parameter = parameter.strip()
        if not parameter:
            raise ValueError("parameter must not be empty")

        snapshot = self._load_snapshot(location)
        if snapshot is None:
            return _unavailable(parameter, location)

        return self._evidence_from_snapshot(parameter, location, snapshot)

    def build_state(
        self,
        location: dict[str, Any] | None,
    ) -> MarineState:
        coords = _parse_location(location)
        snapshot = self._load_snapshot(location)
        issued = _utc_now()

        if snapshot is None or coords is None:
            return MarineState(
                state_id=f"OSF-UNAVAILABLE-{issued.strftime('%Y%m%dT%H%M%SZ')}",
                location=location or {},
                timestamp=issued,
                sources=[f"{SOURCE}-UNAVAILABLE"],
                freshness="unavailable",
                data_status=DataStatus.UNKNOWN,
                last_updated_at=issued,
            )

        wave = self._value("wave_height", snapshot)
        wind = self._wind_speed_value(snapshot)
        valid_at: datetime = snapshot["valid_at"]
        dataset: str = snapshot["dataset"]
        freshness = (
            f"forecast_valid={valid_at.isoformat()};"
            f"dataset={dataset};"
            f"temporal_resolution_h={TEMPORAL_RESOLUTION_H}"
        )
        status = (
            DataStatus.REAL
            if wave.value is not None or wind.value is not None
            else DataStatus.UNKNOWN
        )
        lat, lon = coords
        return MarineState(
            state_id=(
                f"OSF-{valid_at.strftime('%Y%m%dT%H%M%SZ')}-"
                f"{lat:.3f}N-{lon:.3f}E"
            ),
            location={
                "lat": lat,
                "lon": lon,
                "dataset": dataset,
            },
            timestamp=valid_at,
            wind=wind,
            wave=wave,
            sources=[SOURCE],
            freshness=freshness,
            data_status=status,
            last_updated_at=issued,
        )

    def _load_snapshot(
        self,
        location: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        coords = _parse_location(location)
        if coords is None:
            return None

        cache_key = f"{coords[0]:.4f},{coords[1]:.4f}"
        if self._cache and self._cache.get("key") == cache_key:
            return self._cache

        try:
            catalog = self._get_text(
                urljoin(self._base_url + "/", self._catalog_path.lstrip("/")),
                self._timeout,
            )
            dataset = latest_ww3_dataset(catalog)
            if dataset is None:
                return None
            query = urlencode(
                {
                    "var": list(NCSS_VARIABLES),
                    "latitude": f"{coords[0]:.4f}",
                    "longitude": f"{coords[1]:.4f}",
                    "time": "all",
                    "accept": "csv",
                },
                doseq=True,
            )
            ncss_url = (
                f"{self._base_url}{NCSS_GRID_BASE}{dataset}?{query}"
            )
            csv_text = self._get_text(ncss_url, self._timeout)
            _, rows = _parse_csv(csv_text)
            row = select_forecast_row(rows, self._as_of)
            if row is None:
                return None
            valid_at = _parse_timestamp(row.get("time", ""))
            if valid_at is None:
                return None
            snapshot = {
                "key": cache_key,
                "dataset": dataset,
                "row": row,
                "valid_at": valid_at,
                "lat": coords[0],
                "lon": coords[1],
            }
            self._cache = snapshot
            return snapshot
        except (HTTPError, URLError, TimeoutError, OSError, ET.ParseError, ValueError):
            return None

    def _evidence_from_snapshot(
        self,
        parameter: str,
        location: dict[str, Any] | None,
        snapshot: dict[str, Any],
    ) -> NormalizedEvidence:
        if parameter == "wind_speed":
            marine = self._wind_speed_value(snapshot)
            return NormalizedEvidence(
                parameter=parameter,
                value=marine.value,
                unit=marine.unit,
                source=marine.source or SOURCE,
                timestamp=snapshot["valid_at"],
                location={
                    "lat": snapshot["lat"],
                    "lon": snapshot["lon"],
                    "dataset": snapshot["dataset"],
                },
                spatial_resolution_km=SPATIAL_RESOLUTION_KM,
                temporal_resolution_h=TEMPORAL_RESOLUTION_H,
                data_status=marine.data_status,
            )

        mapping = DIRECT_FIELDS.get(parameter)
        if mapping is None:
            return _unavailable(parameter, location)

        variable, unit = mapping
        number = _as_float(snapshot["row"].get(variable))
        if number is None:
            return _unavailable(parameter, location)

        return NormalizedEvidence(
            parameter=parameter,
            value=number,
            unit=unit,
            source=SOURCE,
            timestamp=snapshot["valid_at"],
            location={
                "lat": snapshot["lat"],
                "lon": snapshot["lon"],
                "dataset": snapshot["dataset"],
            },
            spatial_resolution_km=SPATIAL_RESOLUTION_KM,
            temporal_resolution_h=TEMPORAL_RESOLUTION_H,
            data_status=DataStatus.REAL,
        )

    def _value(self, parameter: str, snapshot: dict[str, Any]) -> MarineValue:
        evidence = self._evidence_from_snapshot(parameter, None, snapshot)
        return MarineValue(
            value=evidence.value,
            unit=evidence.unit,
            data_status=evidence.data_status,
            source=evidence.source,
        )

    def _wind_speed_value(self, snapshot: dict[str, Any]) -> MarineValue:
        u_value = _as_float(snapshot["row"].get("UWND"))
        v_value = _as_float(snapshot["row"].get("VWND"))
        if u_value is None or v_value is None:
            return MarineValue(
                value=None,
                unit="m/s",
                data_status=DataStatus.UNKNOWN,
                source=f"{SOURCE}-UNAVAILABLE",
            )
        return MarineValue(
            value=math.hypot(u_value, v_value),
            unit="m/s",
            data_status=DataStatus.REAL,
            source=SOURCE,
        )


def create_incois_osf_provider(
    get_text: GetText | None = None,
) -> IncoisOsfProvider:
    return IncoisOsfProvider(get_text=get_text)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch INCOIS OSF WW3 point data (no credentials).",
    )
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument(
        "--persist",
        action="store_true",
        help="Store the MarineState via marine_service.create_state",
    )
    args = parser.parse_args()
    location = {"lat": args.lat, "lon": args.lon}
    provider = IncoisOsfProvider()
    state = provider.build_state(location)

    if args.persist:
        from src.services.marine_service import create_state

        state = create_state(state)

    print(json.dumps(state.model_dump(mode="json"), indent=2))
    return 0 if state.data_status != DataStatus.UNKNOWN else 2


if __name__ == "__main__":
    raise SystemExit(main())
