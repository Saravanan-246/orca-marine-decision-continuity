from datetime import datetime, timezone
from pathlib import Path

from src.integrations.incois_osf import (
    IncoisOsfProvider,
    latest_ww3_dataset,
    select_forecast_row,
)
from src.integrations.ocean import OceanProvider
from src.models.marine import DataStatus


FIXTURES = Path(__file__).parent / "fixtures" / "incois"
LOCATION = {"lat": 15.0, "lon": 70.0}


def _load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_latest_dataset_prefers_newest_rsmc_combined() -> None:
    path = latest_ww3_dataset(_load("catalog.xml"))
    assert path == "osf/ww3/rsmc_combined_ww3_20260905.nc"


def test_select_nearest_forecast_step() -> None:
    rows = [
        {"time": "2026-09-06T00:00:00Z", "HS": "1.7"},
        {"time": "2026-09-06T03:00:00Z", "HS": "1.6"},
        {"time": "2026-09-06T06:00:00Z", "HS": "1.5"},
    ]
    chosen = select_forecast_row(
        rows,
        as_of=datetime(2026, 9, 6, 4, 0, tzinfo=timezone.utc),
    )
    assert chosen is not None
    assert chosen["HS"] == "1.6"


def _transport(csv_name: str):
    catalog = _load("catalog.xml")
    csv_text = _load(csv_name)

    def get_text(url: str, timeout: float) -> str:
        assert timeout > 0
        if "catalog.xml" in url:
            return catalog
        if "ncss/grid" in url:
            return csv_text
        raise AssertionError(f"unexpected url {url}")

    return get_text


def test_osf_provider_maps_wave_and_wind_from_fixture() -> None:
    provider = IncoisOsfProvider(
        get_text=_transport("ncss_point.csv"),
        as_of=datetime(2026, 9, 6, 3, 10, tzinfo=timezone.utc),
    )
    wave = provider.fetch("wave_height", LOCATION)
    wind = provider.fetch("wind_speed", LOCATION)

    assert wave.data_status is DataStatus.REAL
    assert wave.source == "INCOIS-OSF-WW3"
    assert wave.unit == "m"
    assert abs(float(wave.value) - 1.6687489748001099) < 1e-9
    assert wave.timestamp == datetime(2026, 9, 6, 3, 0, tzinfo=timezone.utc)
    assert wave.temporal_resolution_h == 3.0

    assert wind.data_status is DataStatus.REAL
    assert wind.unit == "m/s"
    assert float(wind.value) > 5.0


def test_osf_nan_grid_point_is_unknown_not_fabricated() -> None:
    provider = IncoisOsfProvider(
        get_text=_transport("ncss_nan.csv"),
        as_of=datetime(2026, 9, 6, 18, 0, tzinfo=timezone.utc),
    )
    wave = provider.fetch("wave_height", LOCATION)
    assert wave.value is None
    assert wave.data_status is DataStatus.UNKNOWN
    assert wave.source.endswith("UNAVAILABLE")


def test_osf_missing_location_is_unknown() -> None:
    provider = IncoisOsfProvider(get_text=_transport("ncss_point.csv"))
    wave = provider.fetch("wave_height", None)
    assert wave.value is None
    assert wave.data_status is DataStatus.UNKNOWN


def test_osf_unsupported_parameter_is_unknown() -> None:
    provider = IncoisOsfProvider(
        get_text=_transport("ncss_point.csv"),
        as_of=datetime(2026, 9, 6, 3, 0, tzinfo=timezone.utc),
    )
    sst = provider.fetch("sea_surface_temperature", LOCATION)
    assert sst.value is None
    assert sst.data_status is DataStatus.UNKNOWN


def test_osf_network_failure_is_unknown() -> None:
    def fail(url: str, timeout: float) -> str:
        raise TimeoutError("offline")

    provider = IncoisOsfProvider(get_text=fail)
    wave = provider.fetch("wave_height", LOCATION)
    assert wave.value is None
    assert wave.data_status is DataStatus.UNKNOWN


def test_build_state_uses_real_status_and_freshness() -> None:
    provider = IncoisOsfProvider(
        get_text=_transport("ncss_point.csv"),
        as_of=datetime(2026, 9, 6, 3, 0, tzinfo=timezone.utc),
    )
    state = provider.build_state(LOCATION)
    assert state.data_status is DataStatus.REAL
    assert state.wave.value is not None
    assert state.wind.value is not None
    assert state.current.value is None
    assert state.current.data_status is DataStatus.UNKNOWN
    assert "INCOIS-OSF-WW3" in state.sources
    assert "forecast_valid=" in (state.freshness or "")
    assert "rsmc_combined_ww3_20260905.nc" in (state.freshness or "")


def test_ocean_provider_can_use_osf_as_live_provider() -> None:
    live = IncoisOsfProvider(
        get_text=_transport("ncss_point.csv"),
        as_of=datetime(2026, 9, 6, 3, 0, tzinfo=timezone.utc),
    )
    ocean = OceanProvider(live_provider=live, source="ORCA-OCEAN")
    wave = ocean.fetch("wave_height", LOCATION)
    assert wave.data_status is DataStatus.REAL
    assert wave.source == "INCOIS-OSF-WW3"


def _clear_marine_states() -> None:
    from src.core.database import db

    collection = db.collection("marine_states")
    if db.memory:
        collection.items.clear()
    else:
        collection.delete_many({})


def test_osf_ingest_route_persists_for_latest(monkeypatch) -> None:
    from uuid import uuid4

    from fastapi.testclient import TestClient

    from src.main import app
    from src.models.marine import MarineState, MarineValue

    stored = MarineState(
        state_id=f"OSF-TEST-{uuid4().hex}",
        location={"lat": 15.0, "lon": 70.0},
        timestamp=datetime(2026, 9, 6, 18, 0, tzinfo=timezone.utc),
        wind=MarineValue(
            value=6.3,
            unit="m/s",
            data_status=DataStatus.REAL,
            source="INCOIS-OSF-WW3",
        ),
        wave=MarineValue(
            value=1.59,
            unit="m",
            data_status=DataStatus.REAL,
            source="INCOIS-OSF-WW3",
        ),
        sources=["INCOIS-OSF-WW3"],
        freshness=(
            "forecast_valid=2026-09-06T18:00:00+00:00;"
            "dataset=osf/ww3/rsmc_combined_ww3_20260905.nc;"
            "temporal_resolution_h=3.0"
        ),
        data_status=DataStatus.REAL,
    )

    monkeypatch.setattr(
        "src.integrations.incois_osf.IncoisOsfProvider.build_state",
        lambda self, location: stored,
    )

    _clear_marine_states()

    client = TestClient(app)
    ingest = client.post("/marine/state/osf", params={"lat": 15, "lon": 70})
    assert ingest.status_code == 200
    assert ingest.json()["wave"]["value"] == 1.59

    latest = client.get("/marine/state/latest")
    assert latest.status_code == 200
    body = latest.json()
    assert body["state_id"] == stored.state_id
    assert body["data_status"] == "REAL"
    assert body["wind"]["source"] == "INCOIS-OSF-WW3"
